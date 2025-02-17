/* --------------------------------------------------------------------------------
 * Created on Wed Oct 16 2024
 *
 * Copyright (c) 2024 Colorado State University. All rights reserved. (1)
 *
 * Contributors:
 *     Mackenzie Grimes (1)
 *
 * --------------------------------------------------------------------------------
 */
/* eslint-disable no-console */

import { io } from 'socket.io-client';
import { subscribeToTimeout } from './utils';

// ICE servers used to discover another websocket client and negotiate connection
const CONFIGURATION = {
  iceServers: [
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
  ],
};

class MuppetChannel {
  #peerConnection = null;

  #dataChannel = null;

  #socket = null;

  // True if this client created the WebRTC room being used. False if it joined an existing room.
  #isCreator = false;

  // internal mapping of pending request messages (IDs) to their callback when response arrives
  #requests = {};

  // queue of messages stashed if client attempted to send before dataChannel was ready
  #queuedMessages = [];

  /**
   * @type {Object.<string, function[]>}
   * Mapping of message eventClasses to a list of callback functions.
   * Default eventClass ('*') will be invoked on every message.
   */
  #messageListeners = { '*': [] };

  /**
   * Can be any websocket states: ```connecting```, ```open```, ```closing```, or ```closed```
   */
  state = 'closed';

  // readable name, such as "My App"
  #clientName;

  room;

  #serverUrl;

  #serverPath;

  #onStateChange;

  /**
   * Create instance of new MUPPET channel
   *
   * @param {Object} props
   * @param {string} props.clientName the client name to attach to any MUPPET activity, messages, or logs.
   * @param {string} props.room the room name on the WebRTC signaling server where a websocket
   *  connection will attempt to be negotiated with any other waiting clients. Must be non-null.
   * @param {string} props.serverUrl the HTTP endpoint of the WebRTC signaling server to use
   *  to negotiate websocket connections to other MUPPET clients.
   * @param {string} props.serverPath the path to append to the end of serverUrl (e.g. "/socket.io").
   *  Default is "/".
   * @param {(string) => {}} props.onStateChange (optional) callback that will be invoked
   *  with string representation of socket state (e.g. 'ready') anytime connection changes.
   *  Can also use ```MuppetChannel.isOpen()``` to determine state of this connection instead.
   */
  constructor({ clientName, serverUrl, serverPath = '/', room = null, onStateChange = () => {} }) {
    this.#clientName = clientName;
    this.room = room;
    this.#serverUrl = serverUrl;
    this.#serverPath = serverPath;
    this.#onStateChange = onStateChange;
  }

  /**
   * @returns True if WebRTC connection is established with other client and messages can be sent
   */
  isOpen() {
    return this.state === 'open';
  }

  /**
   * Add a message listener mapping a given eventClass to a callback.
   * Callback will be invoked with the message body whenever this MuppetChannel receives
   * a message of the specified eventClass.
   *
   * @param {string} eventClass the event class on which this listener will be invoked
   * @param {function} callback the callback to run. The callback will be passed the
   * room name (string) and the received message body (Object).
   */
  on = (eventClass, callback) => {
    if (!this.#messageListeners[eventClass]) {
      this.#messageListeners[eventClass] = []; // this is first listener for this class, so initialize list
    }
    this.#messageListeners[eventClass].push(callback);
  };

  /**
   * Connect via WebRTC, creating the WebRTC "room" in the server if it doesn't exist, or
   * negotiating websocket connection with any other clients waiting in the room.
   *
   * @returns the websocket, which may be null before connection is completed
   */
  connect = () => {
    const onIceCandidateFunc = (event) => {
      if (event.candidate) {
        this.#socket.emit('candidate', event.candidate, this.room);
      }
    };

    const onReceiveChannelStateChange = () => {
      const newState = this.#dataChannel ? this.#dataChannel.readyState : 'closed';
      this.state = newState;
      this.#onStateChange(newState);

      // if channel just opened, deliver any messages already queued
      if (newState === 'open' && this.#queuedMessages.length > 0) {
        console.debug(
          `[${this.#clientName}] [${this.room}] channel now open, sending`,
          `${this.#queuedMessages.length} queued messages`,
        );
        this.#queuedMessages.forEach((message) => {
          console.debug(
            `[${this.#clientName}] [${this.room}] sending data: ${JSON.stringify(message)}`,
          );
          try {
            this.sendRawData(message);
          } catch (error) {
            console.warn(`[${this.#clientName}] [${this.room}] Failed to send message:`, error);
          }
        });
        console.debug(`[${this.#clientName}] [${this.room}] clearing all queued messages`);
        this.#queuedMessages = []; // clear queue now that messages processed
      }
    };

    const onReceiveMessage = (message) => {
      const evt = JSON.parse(message.data);
      console.debug(`[${this.#clientName}] [${this.room}] got message:`, evt);

      if (evt.requestId && evt.requestId in this.#requests) {
        // this message should be routed as a response message, not a regular event
        console.debug(
          `[${this.#clientName}] [${this.room}] Received messsage with requestId ${evt.requestId}. this.requests:`,
          this.#requests,
        );
        const requestPromise = this.#requests[evt.requestId];
        delete this.#requests[evt.requestId]; // clean up Promise so we are no longer waiting

        // TODO: passes the full JSON message back. Would be cleaner to only pass evt.event, but this would break NWS Connect's forwarding mechanisms
        requestPromise.callback(evt); // send the event to any listener functions waiting on response
        return;
      }

      // this is a normal broadcast event, with no associated request message, so
      // find any listeners attached to this eventClass (or the wildcard * eventClass)
      // and invoke all of their callbacks with this received message
      Object.entries(this.#messageListeners)
        .filter(([eventClass]) => ['*', evt.eventClass].includes(eventClass))
        .forEach(([, callbacks]) => {
          callbacks.forEach((cb) => {
            cb(this, evt);
          });
        });
    };

    const receiveChannelCallback = (event) => {
      this.#dataChannel = event.channel;
      this.#dataChannel.onmessage = onReceiveMessage;
      this.#dataChannel.onopen = onReceiveChannelStateChange;
      this.#dataChannel.onclose = onReceiveChannelStateChange;
    };

    // connect to Signaling Server to negotiate webRTC connection with other client(s)
    console.log(`[${this.#clientName}] Using Signal Server ${this.#serverUrl}${this.#serverPath}`);
    this.#socket = io(this.#serverUrl, { path: this.#serverPath });

    this.#socket.on('connect', () => {
      console.log(
        `[${this.#clientName}] [${this.room}] Connected to Websocket server, socket id: ${this.#socket.id}`,
      );
      this.#socket.emit('join', this.room);
    });

    this.#socket.on('created', () => {
      this.#isCreator = true;
      console.debug(
        `[${this.#clientName}] [${this.room}] [created] Created room, waiting for peer`,
      );
    });

    this.#socket.on('joined', () => {
      console.debug(
        `[${this.#clientName}] [${this.room}] [joined] Now sending ready message to room`,
      );
      this.#socket.emit('ready', this.room);
    });

    this.#socket.on('ready', async () => {
      if (!this.#isCreator) {
        console.debug(
          `[${this.#clientName}] [${this.room}] I am not the creator of room, nothing to do`,
        );
        return;
      }

      this.#peerConnection = new RTCPeerConnection(CONFIGURATION);

      console.debug(
        `[${this.#clientName}] [${this.room}] [ready] created new peerConnection: ${JSON.stringify(this.#peerConnection)}`,
      );
      const channel = this.#peerConnection.createDataChannel('sendDataChannel');
      receiveChannelCallback({ channel });

      this.#peerConnection.onicecandidate = onIceCandidateFunc;

      try {
        // send offer to peer when one arrives on the server
        const offer = await this.#peerConnection.createOffer();
        await this.#peerConnection.setLocalDescription(offer);
        this.#socket.emit('offer', offer, this.room);
      } catch (error) {
        console.error(`[${this.#clientName}] [${this.room}] Unable to create offer:`, error);
      }
    });

    this.#socket.on('candidate', async (candidate) => {
      console.debug(
        `[${this.#clientName}] [${this.room}] [candidate] Received new candidate: ${JSON.stringify(candidate)}`,
      );
      const iceCandidate = new RTCIceCandidate(candidate);
      try {
        console.debug(
          `[${this.#clientName}] [${this.room}] [candidate] Attempting to addIceCandidate to connection: ${JSON.stringify(this.#peerConnection)}`,
        );
        await this.#peerConnection.addIceCandidate(iceCandidate);
      } catch (error) {
        console.log(`[${this.#clientName}] [${this.room}] Failed to add candidate`, error);
      }
    });

    this.#socket.on('offer', async (offer) => {
      console.debug(`[${this.#clientName}] [${this.room}] Received offer for connection`);
      if (this.#isCreator) {
        console.debug(
          `[${this.#clientName}] [${this.room}] I am the creator of room, nothing to do`,
        );
        return;
      }

      // give the iceServer details as the argument
      this.#peerConnection = new RTCPeerConnection(CONFIGURATION);
      console.debug(
        `[${this.#clientName}] [${this.room}] [offer] Created new peerConnection ${JSON.stringify(this.#peerConnection)}`,
      );

      // this receives messages via the data channel
      this.#peerConnection.onicecandidate = onIceCandidateFunc;
      this.#peerConnection.ondatachannel = receiveChannelCallback;

      // fires when we start to get content from the peer we're connecting to
      await this.#peerConnection.setRemoteDescription(offer);

      try {
        // create and send answer back to server
        const answer = await this.#peerConnection.createAnswer();
        await this.#peerConnection.setLocalDescription(answer);
        this.#socket.emit('answer', answer, this.room);
      } catch (error) {
        console.warn(`[${this.#clientName}] [${this.room}] Unable to create answer:`, error);
      }
    });

    this.#socket.on('answer', async (answer) => {
      try {
        // TODO: throws error "Failed to set remote answer sdp: Called in wrong state: stable"
        await this.#peerConnection.setRemoteDescription(answer);
      } catch (error) {
        console.warn(
          `[${this.#clientName}] [${this.room}] Unable to set remote description:`,
          error,
        );
      }
    });

    this.#socket.on('disconnected', () => {
      console.log(`[${this.#clientName}] [${this.room}] [disconnect] Received disconnect`);
      this.close();
    });

    return this.#socket;
  };

  /**
   * Send raw JSON data through this MUPPET channel, if it is open.
   * @param {object} data
   * @returns True if message sent successfully
   */
  sendRawData = (data) => {
    console.debug(
      `[${this.#clientName}] [${this.room}] [sendEvent] Attempting to send to dataChannel:`,
      this.#dataChannel,
    );
    if (!this.isOpen()) {
      console.warn(
        `[${this.#clientName}] [${this.room}] Channel not ready to receive data. Message queued`,
      );

      // de-duplicate queue, so recipient app won't try to process successive state changes when it comes online
      this.#queuedMessages = this.#queuedMessages.filter(
        (it) => !(it.eventClass === data.eventClass && it.destination === it.destination),
      );
      this.#queuedMessages.push(data); // stash this message until channel opens (hopefully)
      return false;
    }

    console.debug(`[${this.#clientName}] [${this.room}] sending data: ${JSON.stringify(data)}`);
    try {
      this.#dataChannel.send(JSON.stringify(data));
    } catch (error) {
      console.warn(`[${this.#clientName}] [${this.room}] Failed to send message:`, error);
      return false;
    }
    return true;
  };

  /**
   * Build a generic message, structured for MUPPET (webRTC) protocol
   *
   * @param {string} eventClass the message event class name
   * @param {object} event the full event/data object
   * @param {string} destination the name of the application that should receive the message
   * @param {string} requestId (optional) the UUID of the original message that this message is responding to.
   * @returns {object} the message, ready to be sent over WebRTC
   */
  buildMuppetMessage = (eventClass, event, destination, requestId = null) => ({
    id: crypto.randomUUID(),
    destination,
    requestId: requestId || undefined,
    eventClass: eventClass.startsWith(`${this.#clientName}.`)
      ? eventClass
      : `${this.#clientName}.${eventClass}`,
    event,
  });

  /**
   * Emit a message via WebRTC, structured for MUPPET protocol
   *
   * @param {string} eventClass the message event class name, e.g. "BUTTON_CLICKED"
   * @param {object} event the full MUPPET event object
   * @param {string} destination (optional) the name of the application that should receive the message. Default is wildcard ("*")
   * @param {string} requestId (optional) the UUID of the original message that this message is responding to.
   * @returns {boolean} True if message sent successfully.
   */
  sendEvent = ({ eventClass, event = {}, destination = '*', requestId = null }) => {
    console.debug(
      `[${this.#clientName}] [${this.room}] Sending MUPPET event ${eventClass} with body`,
      event,
    );
    const data = this.buildMuppetMessage(eventClass, event, destination, requestId);
    return this.sendRawData(data);
  };

  /**
   * Send message via MuppetChannel and await the response message from the receiving client.
   *
   * @param {string} eventClass the message event class name, e.g. "BUTTON_CLICKED"
   * @param {object} event the full MUPPET event object
   * @param {string} destination the name of the application that should receive and respond to this message.
   * @param {number} timeout (optional) maximum time (in ms) to await response from peer client. Default: 5 seconds.
   * @returns {Promise<object | null>} the response object from the receiving client, or null on error.
   */
  sendRequest = async ({ eventClass, event, destination, timeout = 5000 }) => {
    // preserve new Promise.resolve() and Promise.reject() callbacks in class variables
    let requestResolve;
    let requestReject;
    const requestPromise = new Promise((resolve, reject) => {
      requestResolve = resolve;
      requestReject = reject;
    });

    const message = this.buildMuppetMessage(eventClass, event, destination);
    // track this message as expecting a response, saving the resolve() to be invoked by onReceiveMessage
    this.#requests[message.id] = { callback: requestResolve };

    // start a timeout clock; if ```timeout``` seconds have passed without the request Promise
    // resolve being triggered, this timer will invoke the Promise reject instead
    const timeoutPromise = subscribeToTimeout(requestPromise, timeout, () => {
      requestReject('Request timed out');
      console.debug('Timed out, now deleting', message.id, 'from this.requests');
      delete this.#requests[message.id];
    });

    // fire the request message; the response will be routed from onReceiveMessage
    const messageSent = this.sendRawData(message);
    if (!messageSent) {
      requestReject('Failed to send request message');
      delete this.#requests[message.id]; // request failed before it could even be sent
    }

    return Promise.race([requestPromise, timeoutPromise]);
  };

  /**
   * Gracefully terminate the underlying websocket connection with any other MUPPET clients,
   * and unsubscribe from all event listeners.
   */
  close = () => {
    if (this.#dataChannel === null && this.#peerConnection === null) {
      console.warn(`[${this.#clientName}] [${this.room}] No connection to close`);
      return;
    }
    console.debug(`[${this.#clientName}] [${this.room}] Closing data channel`);
    this.#dataChannel?.close();
    this.#dataChannel = null;

    this.#peerConnection?.close();
    this.#peerConnection = null;
  };
}

export default MuppetChannel;

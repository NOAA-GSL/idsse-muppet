import { useEffect, useState } from 'react';

import useMuppetChannel from './useMuppetChannel';
// eslint-disable-next-line no-unused-vars
import WebRtcChannel from '../muppet/WebRtcChannel';

/**
 * @typedef {Object} muppetEvent
 * @property {string} id A UUID identifying this event.
 * @property {string} eventClass A dot-delimited, uppercase SNAKE_CASE string identifying
 *  the sending client, the category of this event defined by the sender (e.g. BUTTON_CLICKED),
 *  and the intended recipient client.
 *
 *  Example: `"SENDER_APP.BUTTON_CLICKED.RECEIVING_APP"`
 *
 * Note that the receiver client may be a wildcard (`*`) if the event was broadcast to all listeners.
 * @property {object} event The payload of the MUPPET event. Entirely up to the sender client to
 *  define this structure, but should be consistent for all events of a given `eventClass`.
 * @property {string | null} requestId (optional) the UUID of the original event, if this
 *  MUPPET event is a response message
 *
 */

/**
 * @callback muppetCallback
 * @param {WebRtcChannel} channel The MUPPET channel object over which the event was received.
 * @param {muppetEvent} event The MUPPET event that was received.
 */

/**
 *
 * @param {string} channelName The name of the MUPPET channel to which to attach these
 *  callbacks. Must exist in the enclosing MuppetProvider wrapping this React app.
 * @param {muppetCallback} fn The callback function to invoke when a MUPPET event of one of
 *  the specified `eventClasses` is received over the MUPPET channel. Callback will receive
 *  the full MUPPET channel object, and the contents of the MUPPET event.
 * @param {string[]} eventClasses list of MUPPET eventClass strings which should match the
 *  `eventClass` of some MUPPET events you expect to receive. Works like React useEffect() deps.
 * @returns
 */
function useMuppetCallback(channelName, fn = () => {}, eventClasses = []) {
  const channel = useMuppetChannel(channelName);
  const [isSubscribed, setIsSubscribed] = useState(false); // flag to track if we wired up listeners yet

  useEffect(() => {
    if (!channel || isSubscribed) {
      return; // nothing to do
    }

    eventClasses.forEach((eventClass) => {
      channel.on(eventClass, fn);
    });
    setIsSubscribed(true);
  }, [channel, isSubscribed]); // TODO: is channel a React state? May not trigger this useEffect
}

export default useMuppetCallback;

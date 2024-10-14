/* eslint-disable no-console */
import { createLock, getDeviceFingerprint, sleep } from './utils';
import WebRtcChannel from './WebRtcChannel';
import { getSessionId, setSessionId } from './session';

// TODO: using vanilla JS variables; is there another way to persist and access these outside of React context?
/**
 * Object mapping WebRTC each room name (e.g. "idsse") to its stored WebRtcChannel connection,
 * if it exists.
 * @type {Object.<string, WebRtcChannel>}
 */
let channelMap = {};

// Lock on global channel JS variables to prevent re-renders of WebRtcProvider
// (due to StrictMode) from interrupting in-flight channel creation
const channelLock = createLock();

/**
 * Getter function to lookup global channel(s) outside of a React context.
 * Wherever posssible, React custom Hook ```useMuppetChannels()``` should be used instead of this.
 *
 * @returns {@type {Object.<string, WebRtcChannel>}} objects of the active WebRtcChannel instances
 */
const getChannels = () => channelMap;

/**
 * Getter function to lookup WebRtcChannel connection, identified by the room name, from
 * the locally created/saved connections (utility when not in a React component tree).
 * Wherever posssible, React custom Hook ```useMuppetChannels()``` should be used instead of this.
 *
 * @param {string} channelName WebRTC room to query for channel name from stored channels in memory
 * @returns {WebRtcChannel | null} the matching WebRtcChannel object, or null if not found/not initialized
 */
const getChannel = (channelName) => channelMap[channelName] || null;

/**
 * Create WebRTC Channels for each peer client and cache as static (global) variables.
 * If another component already initialized these, nothing will be done.
 *
 * @param {Object} props
 * @param {string} props.clientName This web app, the source/originator to declare when creating
 *  any WebRTC connections. This is how other apps will address MUPPET messages directly to this app.
 * @param {string} props.serverUrl The URL/address of the WebRTC signaling server to connect to
 *  so other apps in the suite can find our app and negotiate a direct websocket to us.
 * @param {string} props.serverPath The path argument to append to the WebRTC server URL (defaults to "/")
 * @param {Object.<string, Object.<string, function[]>[]} props.channelListeners Map of
 *   WebRTC channel "rooms" to which to connect, and their map of event listeners
 *  (eventClass names to Array of callback functions)
 */
const createWebRtcChannels = async ({ clientName, serverUrl, serverPath, channelListeners }) => {
  // wait for any previous renders which may have new WebRtcChannels in flight
  while (!channelLock.acquire()) {
    console.debug(
      `[${clientName}] [createWebRtcChannels] Lock on channels not free, sleeping for 5 ms`,
    );
    // eslint-disable-next-line no-await-in-loop
    await sleep(5);
  }

  // first try to get sessionId from URL parameters or sessionStorage.
  // If not present, fallback to unique device fingerprint
  let sessionId = getSessionId(clientName);
  console.debug(
    `[${clientName}] on page: ${window.location.href}, extracted URL query params: ${window.location.search}`,
  );
  if (!sessionId) {
    console.debug(
      `[${clientName}] sessionId null or not found, using unique device fingerprint instead`,
    );
    sessionId = await getDeviceFingerprint();
    console.debug(`[${clientName}] [createWebRtcChannels] got device Id:`, sessionId);
  }
  setSessionId(sessionId); // save sessionId in localStorage

  const latestConnections = await Promise.all(
    Object.entries(channelListeners).map(async ([channelName, listeners]) => {
      const existingChannel = getChannel(channelName);
      if (existingChannel) {
        return { [channelName]: existingChannel }; // channel already exists, return
      }

      console.debug(
        `[${clientName}] [createWebRtcChannels] now connecting to room ${sessionId}:${channelName}`,
      );
      const newChannel = new WebRtcChannel({
        clientName,
        room: `${sessionId}:${channelName}`,
        serverUrl,
        serverPath,
      });

      // wire up event message listeners for eventClasses on this channel
      Object.entries(listeners).forEach(([cls, callbacks]) => {
        callbacks.forEach((cb) => {
          newChannel.on(cls, cb);
        });
      });

      await newChannel.connect();
      return { [channelName]: newChannel }; // return mapping of room name to new Channel
    }),
  );

  // update global Map with any newly created channels (transforming array of
  // room-to-WebRtcChannel objs into a single, flat room-to-WebRtcChannel object)
  channelMap = latestConnections.reduce(
    (acc, mapping) => ({
      ...acc,
      ...Object.fromEntries(Object.entries(mapping)),
    }),
    {},
  );

  channelLock.release();
  return channelMap;
};

export { createWebRtcChannels, getChannel, getChannels };

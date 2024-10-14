import { useContext } from 'react';
import { WebRtcContext } from './WebRtcProvider';
// eslint-disable-next-line no-unused-vars
import WebRtcChannel from './WebRtcChannel';

/**
 * Fetch active channel to subscribe/send MUPPET messages to other apps in this WebRTC room.
 * Channel may be briefly null if connections haven't been attempted yet.
 *
 * @returns {@type {WebRtcChannel | undefined}} an existing ```WebRtcChannel``` instance, fetched by
 * the key in the `channelListeners` key-value pairs passed to the ```WebRtcProvider``` in main.jsx.
 *
 * This channel instance can then be used with methods such as ```WebRtcChannel.sendEvent()``` to send messages
 */
const useMuppetChannel = (channelKey) => {
  const channels = useContext(WebRtcContext);
  return channels[channelKey];
};

export default useMuppetChannel;

import { useContext } from 'react';

import { MuppetContext } from '../muppet/MuppetProvider';
// eslint-disable-next-line no-unused-vars
import WebRtcChannel from '../muppet/WebRtcChannel';

/**
 * Fetch active channel to subscribe/send MUPPET messages to other apps in this WebRTC room.
 * Channel may be briefly undefined if connections haven't been attempted yet.
 *
 * @returns {@type {WebRtcChannel | undefined}} an existing ```WebRtcChannel``` instance, fetched by
 * one of the keys in the `channels` string[] that was provided to the ```WebRtcProvider``` in main.jsx.
 *
 * This channel instance can then be used with methods such as ```WebRtcChannel.sendEvent()``` to send messages
 */
const useMuppetChannel = (channelKey) => {
  const channelMap = useContext(MuppetContext);
  return channelMap[channelKey];
};

export default useMuppetChannel;

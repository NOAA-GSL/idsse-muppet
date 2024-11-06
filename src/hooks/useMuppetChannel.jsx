import { useContext } from 'react';

import { MuppetContext } from '../muppet/MuppetProvider';
// eslint-disable-next-line no-unused-vars
import MuppetChannel from '../MuppetChannel';

/**
 * Fetch active channel to subscribe/send MUPPET messages to other apps in this WebRTC room.
 * Channel may be briefly undefined if connections haven't been attempted yet.
 *
 * @returns {@type {MuppetChannel | undefined}} an existing ```MuppetChannel``` instance, fetched by
 * one of the keys in the `channels` string[] that was provided to the ```MuppetProvider``` in main.jsx.
 *
 * This channel instance can then be used with methods such as ```MuppetChannel.sendEvent()``` to send messages
 */
const useMuppetChannel = (channelKey) => {
  const channelMap = useContext(MuppetContext);
  return channelMap[channelKey];
};

export default useMuppetChannel;
import { useContext } from 'react';

import { MuppetContext } from '../muppet/MuppetProvider';
// eslint-disable-next-line no-unused-vars
import WebRtcChannel from '../muppet/WebRtcChannel';

/**
 * Fetch active channel to subscribe/send MUPPET messages to other apps in the
 * NWS Connect suite over WebRTC. Channel may be null if connections haven't been attempted yet.
 *
 * @returns {@type {Object.<string, WebRtcChannel | null>}} objects of the active ```WebRtcChannel```
 * instances, organized with the key as a WebRTC room name from ```Constants.CHANNEL_NAMES```
 * such as 'idsse'.
 *
 * These channels can then be used with methods such as ```WebRtcChannel.send()``` to send messages
 */
const useMuppetChannels = () => useContext(MuppetContext);

export default useMuppetChannels;

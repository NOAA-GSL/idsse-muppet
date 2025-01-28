/* --------------------------------------------------------------------------------
 * Created on Wed Nov 6 2024
 *
 * Copyright (c) 2024 Colorado State University. All rights reserved. (1)
 *
 * Contributors:
 *     Mackenzie Grimes (1)
 *
 * --------------------------------------------------------------------------------
 */

import { useContext } from 'react';

import { MuppetContext } from '../MuppetProvider';
// eslint-disable-next-line no-unused-vars
import MuppetChannel from '../MuppetChannel';

/**
 * Fetch active channel to subscribe/send MUPPET messages to other apps in your app suite over MUPPET.
 * Channel may be null if connections haven't been attempted yet.
 *
 * @returns {@type {Object.<string, MuppetChannel | null>}} objects of the active ```MuppetChannel```
 * instances, where each object key is the WebRTC/MUPPET room name string passed to in the `channels`
 * property to `MuppetProvider`.
 *
 * These channels can then be used with methods such as ```MuppetChannel.sendEvent()``` to send events
 */
const useMuppetChannels = () => useContext(MuppetContext);

export default useMuppetChannels;

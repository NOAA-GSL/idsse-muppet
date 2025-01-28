/* --------------------------------------------------------------------------------
 * Created on Tues Nov 5 2024
 *
 * Copyright (c) 2024 Colorado State University. All rights reserved. (1)
 *
 * Contributors:
 *     Mackenzie Grimes (1)
 *
 * --------------------------------------------------------------------------------
 */

import { createContext, useEffect, useState } from 'react';

import MuppetChannel from './MuppetChannel';
import { getAndSaveSessionId } from './session';

const MuppetContext = createContext(null);

/**
 *
 * @param {Object} props
 * @param {string} props.clientName This web app, the source/originator to declare when creating
 *  any WebRTC connections. This is how other apps will address MUPPET messages directly to this app.
 * @param {string} props.serverUrl The URL/address of the WebRTC signaling server to connect to
 *  so other apps in the suite can find our app and negotiate a direct websocket to us.
 * @param {string} props.serverPath The path argument to append to the WebRTC server URL (defaults to "/")
 * @param {string[]} props.channels List of MUPPET channel "rooms" to which to connect
 */
function MuppetProvider({
  clientName = '',
  serverUrl = '',
  serverPath = '/',
  channels = [],
  children = null,
}) {
  const [currentChannels, setCurrentChannels] = useState({});
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    // same sessionId will be used for all MUPPET channel rooms/connections
    const fetchSessionId = async () => {
      setSessionId(await getAndSaveSessionId(clientName));
    };
    if (!sessionId) {
      fetchSessionId();
    }
  }, [sessionId, clientName]);

  useEffect(() => {
    if (!sessionId) {
      console.debug(`[${clientName}] [MuppetProvider] sessionId null, not creating channels yet`);
      return () => {}; // nothing to do
    }

    // TODO: not sure if this is needed, never seen it log
    // Object.values(currentChannels).forEach((channel) => {
    //   console.debug(
    //     `[${clientName}] [MuppetProvider] now throwing away pre-existing channel: ${JSON.stringify(channel)}`,
    //   );
    //   if (channel?.isOpen()) {
    //     console.debug(`[${clientName}] [MuppetProvider] closing channel: ${channel.room}}`);
    //     channel.close();
    //   }
    // });

    const channelMap = {};
    channels.forEach((channelName) => {
      // for each channelName, map its room name to a new MuppetChannel and initiate a connection
      try {
        channelMap[channelName] = new MuppetChannel({
          clientName,
          room: `${sessionId}:${channelName}`,
          serverUrl,
          serverPath,
        });
        channelMap[channelName].connect();
      } catch (err) {
        console.error('Failed to connect to MuppetChannel', channelName, err);
        channelMap[channelName] = null;
      }
    });
    setCurrentChannels(channelMap);

    // when this Hook is unmounted (usually re-rendered), terminate all WebRTC channels
    // TODO: haven't seen this actually run in logs, not sure when Provider gets cleaned up
    return () =>
      Object.entries(channelMap).forEach(([channelName, channel]) => {
        console.debug(
          `[${clientName}] [MuppetProvider] [unmount] Attempting to close channel ${channelName}`,
          channel,
        );
        channel?.close();
      });
  }, [channels, clientName, serverPath, serverUrl, sessionId]);

  return <MuppetContext.Provider value={currentChannels}>{children}</MuppetContext.Provider>;
}

export { MuppetContext, MuppetProvider };

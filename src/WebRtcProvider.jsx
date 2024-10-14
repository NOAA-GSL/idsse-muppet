import { createContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { createWebRtcChannels, getChannel, getChannels } from './channels';

const WebRtcContext = createContext(null);

/**
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
 *
 * Example:
 *
 * Define eventListeners, ideally in their own file to stay organized:
 * ```
 * // eventListeners.jsx
 * const eventListeners = {
 *  'MY_APP.MY_EVENT': (channel, evt) => {console.log('Got an event:', evt);}
 * }
 *
 * export default eventListeners;
 * ```
 *
 * Then in your main function, wrap your whole React app in a WebRtcProvider:
 *
 *
 * ```
 * // main.jsx
 * import ReactDOM from 'react-dom/client';
 * import App from './App';
 * import eventListeners from './eventListeners';
 *
 * ReactDOM.createRoot(document.getElementById('root')).render(
 *    <WebRtcProvider
 *        clientName='MY_APP'
 *        serverUrl='http://example.com'
 *        serverPath='/'
 *        channelListeners={{ 'my-channel' : eventListeners }}
 *    >
 *      <App>
 *    </WebRtcProvider>
 * );
 * ```
 */
function WebRtcProvider({ clientName, serverUrl, serverPath, channelListeners, children }) {
  const [currentChannels, setCurrentChannels] = useState(getChannels());

  useEffect(() => {
    const connect = async () => {
      // if any channels do not yet exist in connectionMap, they must be created
      if (Object.keys(channelListeners).some((name) => getChannel(name) === null)) {
        setCurrentChannels(
          await createWebRtcChannels({
            clientName,
            serverUrl,
            serverPath,
            channelListeners,
          }),
        );
      }
    };

    connect();
  }, [clientName, serverUrl, serverPath, channelListeners]);

  WebRtcProvider.propTypes = {
    clientName: PropTypes.string.isRequired,
    serverUrl: PropTypes.string.isRequired,
    serverPath: PropTypes.string,
    channelListeners: PropTypes.shape({
      [PropTypes.string]: PropTypes.shape({
        [PropTypes.string]: PropTypes.arrayOf(PropTypes.func),
      }),
    }).isRequired,
    children: PropTypes.node.isRequired,
  };

  WebRtcProvider.defaultProps = {
    serverPath: '/',
  };

  return <WebRtcContext.Provider value={currentChannels}>{children}</WebRtcContext.Provider>;
}

export { WebRtcContext, WebRtcProvider };

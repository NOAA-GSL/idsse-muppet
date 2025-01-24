import { getDeviceFingerprint } from './utils';

/**
 * Get the shared, unique SESSION_ID, which any app in this browser window can use to connect
 * to the current WebRTC "room" and share MUPPET events with each other.
 *
 * @returns the current SESSION_ID from browser sessionStorage. May be null.
 */
const getSessionFromStorage = () => sessionStorage.getItem('sessionId');

/**
 * Set the shared, unique SESSION_ID which is the WebRTC "room" that other apps in this browser window
 * can connect to and share MUPPET events with each other.
 *
 * @param id the new SESSION_ID to save to browser sessionStorage
 */
const setSessionInStorage = (id) => {
  try {
    sessionStorage.setItem('sessionId', id);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save sessionId to sessionStorage:', error);
    return false;
  }
};

const clearSessionFromStorage = () => {
  sessionStorage.removeItem('sessionId');
};

/**
 * @param {string} clientName The client/app name
 * @returns {string | null} The WebRTC sessionId, either from URL query params,
 * failing back to local sessionStorage variables, or null if both places are empty.
 */
const getSessionId = (clientName) => {
  /* eslint-disable no-console */
  const searchParams = new URLSearchParams(window.location.search);
  const paramSessionId = searchParams.get('sessionId');

  if (paramSessionId) {
    console.debug(`[${clientName}] sessionId found in URL params, updating sessionStorage`);
    setSessionInStorage(paramSessionId);
    return paramSessionId;
  }

  console.debug(
    `[${clientName}] sessionId not found in URL params, falling back to sessionStorage`,
  );
  const storageSessionId = getSessionFromStorage();
  if (storageSessionId && storageSessionId !== 'null') {
    console.debug(`[${clientName}] sessionId found in sessionStorage`);
    return storageSessionId;
  }

  /* eslint-enable no-console */
  return null; // both places were empty
};

/**
 * Get the MUPPET sessionId to be used by this device, from one of the following (attempted in order):
 * 1. URL query params
 * 2. Browser sessionStorage (like localStorage, but purges on window close)
 * 3. Unique device "fingerprint"
 *
 * The resulting sessionId will be persisted in browser sessionStorage before returning.
 *
 * @returns {Promise<string>} sessionId
 */
const getAndSaveSessionId = async (clientName) => {
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
    console.debug(`[${clientName}] got device fingerprint:`, sessionId);
  }
  setSessionInStorage(sessionId); // save sessionId in localStorage, then return to requester
  return sessionId;
};

export {
  getSessionId,
  clearSessionFromStorage as clearSessionId,
  setSessionInStorage as setSessionId,
  getAndSaveSessionId,
};

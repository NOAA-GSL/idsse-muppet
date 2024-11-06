import * as ThumbmarkJS from '@thumbmarkjs/thumbmarkjs';

// utility to simulate attempting a network call. To be deleted
const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Fetch a pseudo-unique identifier for this browser, based on any device specs available to
 * Javascript such as browser version, plugins, audio settings, video hardware, etc. Does not
 * rely on cookies or localStorage to track users across sessions.
 *
 * @returns {Promise<string>} unique "fingerprint"/ID for this browser.
 */
const getDeviceFingerprint = async () => {
  // Don't consider screen resolution or window permissions when generating unique fingerprint.
  // This ensures that a user has the same fingerprint whether
  // - NWS Connect apps are running as embeds/iframes or the parent window, and
  // - user views NWS Connect apps across multiple displays
  ThumbmarkJS.setOption('exclude', ['screen', 'permissions', 'system.cookieEnabled']);
  return ThumbmarkJS.getFingerprint();
};

/**
 * Simple locking mechanism to simulate multiple threads/components accessing a shared variable.
 */
const createLock = () => {
  // TODO: this is no longer needed
  let isLocked = false;
  const release = () => {
    isLocked = false;
  };
  const acquire = () => {
    if (isLocked) {
      return false;
    }
    isLocked = true;
    return true;
  };

  return { isLocked, acquire, release };
};

/**
 *
 * @param {Promise} promise A Promise of unknown state
 * @returns True if Promise has already been resolved or rejected, False if 'pending'
 */
const isPromiseFinished = async (promise) =>
  Promise.race([
    new Promise((done) => {
      setTimeout(() => done(false), 1);
    }),
    promise.then(
      () => true,
      () => true,
    ),
  ]);

/**
 * Watch a currently-pending Promise, and if a given number of milliseconds pass without it
 * resolving or rejecting, "abandon" it and run the given ```callback``` instead to notify.
 *
 * @param {Promise} promise
 * @param {number} milliseconds
 * @param {() => {}} callback
 * @returns
 */
const subscribeToTimeout = (promise, milliseconds, callback) =>
  new Promise(() => {
    setTimeout(async () => {
      const isFinished = await isPromiseFinished(promise);
      if (!isFinished) {
        callback();
      }
    }, milliseconds);
  });

export { sleep, createLock, subscribeToTimeout, getDeviceFingerprint };

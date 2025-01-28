/* --------------------------------------------------------------------------------
 * Created on Fri Jan 24 2025
 *
 * Copyright (c) 2025 Colorado State University. All rights reserved. (1)
 *
 * Contributors:
 *     Mackenzie Grimes (1)
 *
 * --------------------------------------------------------------------------------
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getSessionId, setSessionId, clearSessionId } from './session';

const EXAMPLE_SESSION = 'abcd';
const EXAMPLE_CLIENT = 'TEST_CLIENT';

// build a simulated localStorage system using a regular {}
const sessionStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      if (Object.keys(store).includes(key)) {
        delete store[key];
      }
    },
  };
};

beforeEach(() => {
  vi.mock('sessionStorage', () => vi.fn().mockImplementation(() => sessionStorageMock()));
});

describe('setSessionId', () => {
  it('sets value in localStorage', () => {
    // mock window.location to have no search params
    vi.spyOn(window, 'location', 'get').mockReturnValue({ search: '' });

    let actualSession = getSessionId(EXAMPLE_CLIENT);
    expect(actualSession).toBe(null);

    setSessionId(EXAMPLE_SESSION);

    actualSession = getSessionId(EXAMPLE_CLIENT);
    expect(actualSession).toBe(EXAMPLE_SESSION);
  });
});

describe('clearSessionId', () => {
  it('clears an existing session', () => {
    setSessionId(EXAMPLE_SESSION);
    let actualSession = getSessionId(EXAMPLE_CLIENT);
    expect(actualSession).toBe(EXAMPLE_SESSION);

    clearSessionId();

    actualSession = getSessionId(EXAMPLE_CLIENT);
    expect(actualSession).toBe(null);
  });
});

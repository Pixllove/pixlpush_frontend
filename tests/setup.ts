import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, String(value)),
  removeItem: (key: string) => values.delete(key),
  clear: () => values.clear(),
  key: (index: number) => [...values.keys()][index] ?? null,
};

Object.defineProperty(storage, 'length', {
  configurable: true,
  enumerable: false,
  get: () => values.size,
});

// Some Node/jsdom combinations expose a localStorage placeholder without the
// Storage methods. Replace that placeholder so tests exercise the same API as
// the browser and timezone/auth helpers do not fail before fetch is called.
if (!globalThis.localStorage || typeof globalThis.localStorage.getItem !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
}
if (typeof window !== 'undefined' && (!window.localStorage || typeof window.localStorage.getItem !== 'function')) {
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
}

afterEach(() => cleanup());

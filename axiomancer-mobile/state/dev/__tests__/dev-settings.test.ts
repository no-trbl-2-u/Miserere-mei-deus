/**
 * The dev-settings store (phase BE2b, A4): `playLogging` defaults on,
 * persists under its own key (never the player settings key), survives a
 * restart (a fresh store hydrating from the same storage), and bad bytes
 * give the default.
 */

import { describe, expect, it } from '@jest/globals';

import {
    DEFAULT_DEV_SETTINGS,
    DEV_SETTINGS_STORAGE_KEY,
    createDevSettingsStore,
    sanitizeDevSettings,
} from '@/state/dev/dev-settings';
import { SETTINGS_STORAGE_KEY } from '@/state/settings';

function fakeStorage(seed: Record<string, string> = {}) {
    const bag = new Map(Object.entries(seed));
    return {
        bag,
        getItem: async (k: string) => bag.get(k) ?? null,
        setItem: async (k: string, v: string) => { bag.set(k, v); },
    };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('sanitizeDevSettings', () => {
    it('defaults a missing or malformed field and drops junk', () => {
        expect(sanitizeDevSettings(null)).toEqual(DEFAULT_DEV_SETTINGS);
        expect(sanitizeDevSettings({ playLogging: 'no', extra: 1 })).toEqual(DEFAULT_DEV_SETTINGS);
        expect(sanitizeDevSettings({ playLogging: false })).toEqual({ playLogging: false });
    });
});

describe('createDevSettingsStore', () => {
    it('starts with play logging on', async () => {
        const store = createDevSettingsStore({ storage: fakeStorage() });
        await store.hydrate();
        expect(store.get().playLogging).toBe(true);
    });

    it('persists a flip under its own key, apart from the player settings', async () => {
        const storage = fakeStorage();
        const store = createDevSettingsStore({ storage });
        let notified = 0;
        store.subscribe(() => { notified += 1; });
        store.set({ playLogging: false });
        await flush();
        expect(store.get().playLogging).toBe(false);
        expect(notified).toBe(1);
        expect(DEV_SETTINGS_STORAGE_KEY).not.toBe(SETTINGS_STORAGE_KEY);
        expect([...storage.bag.keys()]).toEqual([DEV_SETTINGS_STORAGE_KEY]);
        expect(JSON.parse(storage.bag.get(DEV_SETTINGS_STORAGE_KEY)!)).toEqual({ playLogging: false });
    });

    it('survives a restart: a fresh store hydrates the flipped value', async () => {
        const storage = fakeStorage();
        createDevSettingsStore({ storage }).set({ playLogging: false });
        await flush();
        const relaunched = createDevSettingsStore({ storage });
        await relaunched.hydrate();
        expect(relaunched.get().playLogging).toBe(false);
    });

    it('a same-value set neither notifies nor writes', async () => {
        const storage = fakeStorage();
        const store = createDevSettingsStore({ storage });
        let notified = 0;
        store.subscribe(() => { notified += 1; });
        store.set({ playLogging: true });
        await flush();
        expect(notified).toBe(0);
        expect(storage.bag.size).toBe(0);
    });

    it('bad bytes in storage give the default and never reject', async () => {
        const store = createDevSettingsStore({ storage: fakeStorage({ [DEV_SETTINGS_STORAGE_KEY]: '{not json' }) });
        await expect(store.hydrate()).resolves.toBeUndefined();
        expect(store.get()).toEqual(DEFAULT_DEV_SETTINGS);
    });
});

/**
 * Hermetic E2E — player settings (`state/settings.ts`) and the seams that
 * read them: reduced motion, text scaling, haptics.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { resolveReducedMotion } from '@/hooks/useReducedMotion';
import {
    DEFAULT_SETTINGS,
    SETTINGS_STORAGE_KEY,
    createSettingsStore,
    sanitizeSettings,
    settingsStore,
} from '@/state/settings';
import { scaleTextStyles } from '@/theme/runtime';

function fakeStorage(seed: Record<string, string> = {}) {
    const bag = new Map(Object.entries(seed));
    return {
        bag,
        getItem: async (k: string) => bag.get(k) ?? null,
        setItem: async (k: string, v: string) => { bag.set(k, v); },
        removeItem: async (k: string) => { bag.delete(k); },
    };
}

afterEach(() => {
    settingsStore.reset();
    jest.restoreAllMocks();
});

describe('sanitizeSettings', () => {
    it('fills every field from the defaults and drops junk', () => {
        expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
        expect(sanitizeSettings({ haptics: 'yes', textScale: 2, musicVolume: 500, extra: 1 })).toEqual({
            ...DEFAULT_SETTINGS, musicVolume: 100,
        });
        expect(sanitizeSettings({ reducedMotion: 'on', textScale: 1.3, sfxVolume: -5 })).toEqual({
            ...DEFAULT_SETTINGS, reducedMotion: 'on', textScale: 1.3, sfxVolume: 0,
        });
    });

    it('ignores a tutorialHints key left in older persisted settings', () => {
        const parsed = sanitizeSettings({ haptics: false, tutorialHints: false });
        expect(parsed).toEqual({ ...DEFAULT_SETTINGS, haptics: false });
        expect(parsed).not.toHaveProperty('tutorialHints');
    });
});

describe('cardText', () => {
    it('defaults to words, and a save written before it existed reads as words', () => {
        expect(DEFAULT_SETTINGS.cardText).toBe('words');
        expect(sanitizeSettings({ musicVolume: 30 }).cardText).toBe('words');
        expect(sanitizeSettings({ cardText: 'pictures' }).cardText).toBe('words');
        expect(sanitizeSettings({ cardText: 'glyphs' }).cardText).toBe('glyphs');
    });

    it('is kept across a restart: written by set, read back by hydrate, and reset returns to words', async () => {
        const storage = fakeStorage();
        const first = createSettingsStore({ storage });
        first.set({ cardText: 'glyphs' });
        const restarted = createSettingsStore({ storage });
        await restarted.hydrate();
        expect(restarted.get().cardText).toBe('glyphs');
        restarted.reset();
        expect(restarted.get().cardText).toBe('words');
    });
});

describe('musicOn', () => {
    it('reads as on in a save written before it existed, and keeps a stored off', () => {
        expect(sanitizeSettings({ musicVolume: 30 }).musicOn).toBe(true);
        expect(sanitizeSettings({ musicOn: false }).musicOn).toBe(false);
        expect(sanitizeSettings({ musicOn: 'no' }).musicOn).toBe(true);
    });

    it('reset turns it back on', () => {
        const store = createSettingsStore({ storage: fakeStorage() });
        store.set({ musicOn: false });
        expect(store.get().musicOn).toBe(false);
        store.reset();
        expect(store.get().musicOn).toBe(true);
    });
});

describe('createSettingsStore', () => {
    it('set merges, notifies and persists; reset returns to the defaults', async () => {
        const storage = fakeStorage();
        const store = createSettingsStore({ storage });
        const listener = jest.fn();
        store.subscribe(listener);

        store.set({ haptics: false, musicVolume: 30 });
        expect(store.get()).toEqual({ ...DEFAULT_SETTINGS, haptics: false, musicVolume: 30 });
        expect(listener).toHaveBeenCalledTimes(1);
        await Promise.resolve();
        expect(JSON.parse(storage.bag.get(SETTINGS_STORAGE_KEY)!)).toEqual(store.get());

        // A no-op patch neither notifies nor rewrites.
        store.set({ haptics: false });
        expect(listener).toHaveBeenCalledTimes(1);

        store.reset();
        expect(store.get()).toEqual(DEFAULT_SETTINGS);
        expect(listener).toHaveBeenCalledTimes(2);
    });

    it('hydrate reads the persisted value and tolerates bad bytes', async () => {
        const good = createSettingsStore({ storage: fakeStorage({ [SETTINGS_STORAGE_KEY]: JSON.stringify({ textScale: 1.15 }) }) });
        await good.hydrate();
        expect(good.get().textScale).toBe(1.15);
        expect(good.isHydrated()).toBe(true);

        const bad = createSettingsStore({ storage: fakeStorage({ [SETTINGS_STORAGE_KEY]: '{nope' }) });
        await bad.hydrate();
        expect(bad.get()).toEqual(DEFAULT_SETTINGS);
        expect(bad.isHydrated()).toBe(true);
    });
});

describe('reduced motion resolution', () => {
    it('system follows the OS; on / off override it', () => {
        expect(resolveReducedMotion(true, 'system')).toBe(true);
        expect(resolveReducedMotion(false, 'system')).toBe(false);
        expect(resolveReducedMotion(false, 'on')).toBe(true);
        expect(resolveReducedMotion(true, 'off')).toBe(false);
    });
});

describe('text scaling', () => {
    it('returns the same object at scale 1 and scales only fontSize / lineHeight otherwise', () => {
        const styles = {
            a: { fontSize: 10, lineHeight: 14, padding: 8, letterSpacing: 2 },
            b: { width: 40 },
        };
        expect(scaleTextStyles(styles, 1)).toBe(styles);
        const scaled = scaleTextStyles(styles, 1.3);
        expect(scaled.a).toEqual({ fontSize: 13, lineHeight: 18.2, padding: 8, letterSpacing: 2 });
        expect(scaled.b).toEqual({ width: 40 });
        expect(styles.a.fontSize).toBe(10);
    });
});

describe('haptics honour the setting', () => {
    it('does not trigger when HAPTICS is off', async () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const feedback = require('react-native-haptic-feedback') as { trigger: jest.Mock };
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Haptics } = require('@/lib/platform/haptics') as typeof import('@/lib/platform/haptics');
        feedback.trigger.mockClear();

        settingsStore.set({ haptics: false });
        await Haptics.impactAsync();
        await Haptics.selectionAsync();
        expect(feedback.trigger).not.toHaveBeenCalled();

        settingsStore.set({ haptics: true });
        await Haptics.selectionAsync();
        expect(feedback.trigger).toHaveBeenCalledTimes(1);
    });
});

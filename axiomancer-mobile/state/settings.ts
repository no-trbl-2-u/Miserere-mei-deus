/**
 * Player settings — the persisted, game-independent preferences a NEW
 * PLAYER can change from SETTINGS.
 *
 * ## What lives here, and what does not
 *
 * - HERE: reduced motion, haptics, text size, card text (words or glyphs),
 *   music and sound-effect volume. A UX preference: it survives a new game, a slot
 *   change and a corrupt save, and it is never part of a `GameState`.
 * - NOT here: the colour THEME. It already has its own live store
 *   (`theme/runtime.tsx`) that every stylesheet subscribes to; the SETTINGS
 *   screen simply renders that store's switcher. Two stores for one
 *   setting would drift.
 * - NOT here: STORY MODE. It is listed on the screen as "coming soon" and
 *   has no value to persist yet.
 *
 * ## Shape
 *
 * A tiny external store (`useSyncExternalStore`-shaped), the same pattern
 * as the theme runtime, so NON-React seams can read it synchronously:
 * `lib/platform/haptics.ts` checks `haptics` before every pulse, and
 * `theme/runtime.tsx` scales every `fontSize` by `textScale`. React code
 * uses `useSetting(key)` / `useSettings()`.
 *
 * The module exports ONE store (`settingsStore`) — a preference has one
 * value per device. `SettingsProvider` exists so a test can mount a screen
 * over its own store instead of the singleton.
 *
 * Functions (lowest → highest abstraction):
 *   sanitizeSettings(raw)          any JSON → a valid PlayerSettings (unknown keys dropped, bad values defaulted)
 *   createSettingsStore(options)   get / set / reset / subscribe / hydrate
 *   settingsStore                  the app-wide instance
 *   useSettings() / useSetting(k)  React subscriptions
 */

import React, { createContext, useContext, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLogger } from '@mechanics';

/** `system` follows the OS accessibility switch; `on` / `off` override it. */
export type ReducedMotionPreference = 'system' | 'on' | 'off';

/** The text-size steps SETTINGS offers. `1` is the designed size. */
export type TextScale = 0.9 | 1 | 1.15 | 1.3;

export const TEXT_SCALES: readonly TextScale[] = Object.freeze([0.9, 1, 1.15, 1.3]) as readonly TextScale[];

/** How a card face prints its keywords: capital words, or an icon each. */
export type CardTextMode = 'words' | 'glyphs';

export const CARD_TEXT_MODES: readonly CardTextMode[] = Object.freeze(['words', 'glyphs']) as readonly CardTextMode[];

export interface PlayerSettings {
    readonly reducedMotion: ReducedMotionPreference;
    readonly haptics: boolean;
    readonly textScale: TextScale;
    /** Words (default) or glyphs for the keywords on every card face. Older saves without it read `words`. */
    readonly cardText: CardTextMode;
    /** The music switch. Off silences the theme; the volume below is kept for when it is switched back on. */
    readonly musicOn: boolean;
    /** 0–100. The background music's volume (`components/BackgroundMusic.tsx`). */
    readonly musicVolume: number;
    /** 0–100. Persisted for the sound-effects build; no sound effect plays yet. */
    readonly sfxVolume: number;
}

export const DEFAULT_SETTINGS: PlayerSettings = Object.freeze({
    reducedMotion: 'system',
    haptics: true,
    textScale: 1,
    cardText: 'words',
    musicOn: true,
    musicVolume: 70,
    sfxVolume: 80,
});

/** `:v1` so a future shape change can migrate rather than stomp. */
export const SETTINGS_STORAGE_KEY = '@axiomancer/settings:v1';

const isReducedMotion = (v: unknown): v is ReducedMotionPreference => v === 'system' || v === 'on' || v === 'off';
const isTextScale = (v: unknown): v is TextScale => typeof v === 'number' && (TEXT_SCALES as readonly number[]).includes(v);
const isCardText = (v: unknown): v is CardTextMode => v === 'words' || v === 'glyphs';
const clampVolume = (v: unknown, fallback: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : fallback;

/**
 * Coerce anything (a parsed JSON blob, a partial patch) into a valid
 * `PlayerSettings`. Every field falls back to its default when absent or
 * malformed; unknown keys are dropped. Pure.
 */
export function sanitizeSettings(raw: unknown): PlayerSettings {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return {
        reducedMotion: isReducedMotion(r.reducedMotion) ? r.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
        haptics: typeof r.haptics === 'boolean' ? r.haptics : DEFAULT_SETTINGS.haptics,
        textScale: isTextScale(r.textScale) ? r.textScale : DEFAULT_SETTINGS.textScale,
        cardText: isCardText(r.cardText) ? r.cardText : DEFAULT_SETTINGS.cardText,
        musicOn: typeof r.musicOn === 'boolean' ? r.musicOn : DEFAULT_SETTINGS.musicOn,
        musicVolume: clampVolume(r.musicVolume, DEFAULT_SETTINGS.musicVolume),
        sfxVolume: clampVolume(r.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    };
}

type StorageLike = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

export interface SettingsStore {
    /** The current settings (stable reference until a change). */
    get(): PlayerSettings;
    /** Merge a patch, notify subscribers, persist (fire-and-forget). */
    set(patch: Partial<PlayerSettings>): void;
    /** Back to `DEFAULT_SETTINGS`, persisted. */
    reset(): void;
    subscribe(listener: () => void): () => void;
    /** Read the persisted value once at boot. Never rejects; bad bytes → defaults. */
    hydrate(): Promise<void>;
    /** True once `hydrate` has resolved (or was never needed). */
    isHydrated(): boolean;
}

export interface SettingsStoreOptions {
    storage?: StorageLike;
    initial?: Partial<PlayerSettings>;
}

export function createSettingsStore(options: SettingsStoreOptions = {}): SettingsStore {
    const storage = options.storage ?? AsyncStorage;
    let current: PlayerSettings = sanitizeSettings({ ...DEFAULT_SETTINGS, ...(options.initial ?? {}) });
    let hydrated = false;
    const listeners = new Set<() => void>();

    const emit = (): void => {
        for (const l of listeners) l();
    };
    const persist = (): void => {
        storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(current)).catch((err: unknown) => {
            getLogger().warn('persistence', 'settings-write-failed', {
                message: err instanceof Error ? err.message : String(err),
            });
        });
    };

    return {
        get: () => current,
        set: (patch) => {
            const next = sanitizeSettings({ ...current, ...patch });
            if (JSON.stringify(next) === JSON.stringify(current)) return;
            current = next;
            emit();
            persist();
        },
        reset: () => {
            current = DEFAULT_SETTINGS;
            emit();
            persist();
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        hydrate: async () => {
            try {
                const raw = await storage.getItem(SETTINGS_STORAGE_KEY);
                if (raw !== null) {
                    current = sanitizeSettings(JSON.parse(raw));
                    emit();
                }
            } catch (err) {
                getLogger().warn('persistence', 'settings-read-failed', {
                    message: err instanceof Error ? err.message : String(err),
                });
            } finally {
                hydrated = true;
            }
        },
        isHydrated: () => hydrated,
    };
}

/** The app-wide settings store. Non-React seams read it synchronously. */
export const settingsStore: SettingsStore = createSettingsStore();

const SettingsContext = createContext<SettingsStore>(settingsStore);

/**
 * Optional override of the store React hooks read. Real launches mount it
 * without props (the singleton); tests pass their own store.
 */
export function SettingsProvider({ children, store }: { children: React.ReactNode; store?: SettingsStore }) {
    return React.createElement(SettingsContext.Provider, { value: store ?? settingsStore }, children);
}

/** The whole settings object; re-renders on any change. */
export function useSettings(): PlayerSettings {
    const store = useContext(SettingsContext);
    return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/** One setting; re-renders only when that key changes. */
export function useSetting<K extends keyof PlayerSettings>(key: K): PlayerSettings[K] {
    const store = useContext(SettingsContext);
    return useSyncExternalStore(store.subscribe, () => store.get()[key], () => store.get()[key]);
}

/** The store itself (for the screen's `set` / `reset`). */
export function useSettingsStore(): SettingsStore {
    return useContext(SettingsContext);
}

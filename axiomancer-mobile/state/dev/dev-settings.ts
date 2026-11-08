/**
 * Dev settings: the persisted switches a dev build offers from the `/dev`
 * menu, kept apart from player settings (`state/settings.ts`), which are
 * what a new player changes from SETTINGS. Nothing here is ever part of a
 * `GameState` or of the player settings blob.
 *
 * - `playLogging`: whether the card and combat play log (phase BE2) may post.
 *   On by default only while T is the only player; before a preview build
 *   reaches anyone else the default flips to off (BE2 brief, DoD).
 *
 * - `forceMercyCheck`: every normal foe asks spare or finish as it falls, so the
 *   prompt can be seen without waiting on the chance. Off by default.
 *
 * - `wildsBlackBand`: the top half of the Wilds' status card sits on a solid
 *   black band (the black runs from the screen's top to the card's vertical
 *   middle; the map shows behind the card's lower half), to quiet the map's
 *   lines (T, 2026-11-06, W-01; halved 2026-11-08). On by default: T
 *   chose the band as what ships. Off, the map runs up under the whole card as
 *   in the kit mixer, so T can compare the two. Not a debugging aid, so a production
 *   build reads the default and never shows the switch.
 *
 * Same tiny external-store shape as `state/settings.ts`, so the poster in
 * `lib/playLog.ts` reads it synchronously and the dev row subscribes with
 * `useDevSetting`.
 *
 * Functions (lowest to highest abstraction):
 *   sanitizeDevSettings(raw)          any JSON to a valid DevSettings
 *   createDevSettingsStore(options)   get / set / subscribe / hydrate
 *   devSettingsStore                  the app-wide instance
 *   useDevSetting(k)                  React subscription to one key
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { getLogger } from '@mechanics';

export interface DevSettings {
    readonly playLogging: boolean;
    readonly forceMercyCheck: boolean;
    readonly wildsBlackBand: boolean;
}

export const DEFAULT_DEV_SETTINGS: DevSettings = Object.freeze({
    playLogging: true,
    forceMercyCheck: false,
    wildsBlackBand: true,
});

/** Its own key, never the player settings key. `:v1` so a shape change can migrate. */
export const DEV_SETTINGS_STORAGE_KEY = '@axiomancer/dev-settings:v1';

/** Coerce anything into a valid `DevSettings`; a missing or malformed field takes its default. Pure. */
export function sanitizeDevSettings(raw: unknown): DevSettings {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return {
        playLogging: typeof r.playLogging === 'boolean' ? r.playLogging : DEFAULT_DEV_SETTINGS.playLogging,
        forceMercyCheck: typeof r.forceMercyCheck === 'boolean' ? r.forceMercyCheck : DEFAULT_DEV_SETTINGS.forceMercyCheck,
        wildsBlackBand: typeof r.wildsBlackBand === 'boolean' ? r.wildsBlackBand : DEFAULT_DEV_SETTINGS.wildsBlackBand,
    };
}

type StorageLike = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

export interface DevSettingsStore {
    get(): DevSettings;
    /** Merge a patch, notify subscribers, persist (fire-and-forget). */
    set(patch: Partial<DevSettings>): void;
    subscribe(listener: () => void): () => void;
    /** Read the persisted value once at boot. Never rejects; bad bytes give the defaults. */
    hydrate(): Promise<void>;
}

export interface DevSettingsStoreOptions {
    storage?: StorageLike;
}

export function createDevSettingsStore(options: DevSettingsStoreOptions = {}): DevSettingsStore {
    const storage = options.storage ?? AsyncStorage;
    let current: DevSettings = DEFAULT_DEV_SETTINGS;
    const listeners = new Set<() => void>();

    const emit = (): void => {
        for (const l of listeners) l();
    };
    const warn = (event: string, err: unknown): void => {
        getLogger().warn('persistence', event, { message: err instanceof Error ? err.message : String(err) });
    };

    return {
        get: () => current,
        set: (patch) => {
            const next = sanitizeDevSettings({ ...current, ...patch });
            if (
                next.playLogging === current.playLogging
                && next.forceMercyCheck === current.forceMercyCheck
                && next.wildsBlackBand === current.wildsBlackBand
            ) return;
            current = next;
            emit();
            storage.setItem(DEV_SETTINGS_STORAGE_KEY, JSON.stringify(current)).catch((err: unknown) => {
                warn('dev-settings-write-failed', err);
            });
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        hydrate: async () => {
            try {
                const raw = await storage.getItem(DEV_SETTINGS_STORAGE_KEY);
                if (raw !== null) {
                    current = sanitizeDevSettings(JSON.parse(raw));
                    emit();
                }
            } catch (err) {
                warn('dev-settings-read-failed', err);
            }
        },
    };
}

/** The app-wide dev settings. Non-React seams read it synchronously. */
export const devSettingsStore: DevSettingsStore = createDevSettingsStore();

/** One dev setting; re-renders when it changes. */
export function useDevSetting<K extends keyof DevSettings>(key: K, store: DevSettingsStore = devSettingsStore): DevSettings[K] {
    return useSyncExternalStore(store.subscribe, () => store.get()[key], () => store.get()[key]);
}

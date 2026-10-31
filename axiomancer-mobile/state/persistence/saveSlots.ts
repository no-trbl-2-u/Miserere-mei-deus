/**
 * Save slots — the pure vocabulary of the three-slot save system.
 *
 * Nothing here touches storage. This module owns the slot ids, the storage
 * keys they map to, the summary a menu row is drawn from, and the one rule
 * CONTINUE needs (which slot was written most recently). The AsyncStorage
 * adapter (`asyncStorageAdapter.ts`) is the only I/O owner; the main-menu
 * actions (`state/menu/store-actions.ts`) compose these functions.
 *
 * Functions (lowest → highest abstraction):
 *   isSaveSlotId(value)             type guard for the three ids
 *   slotStorageKey(id)              the AsyncStorage key one slot lives under
 *   emptySlotSummary(id)            the summary of a slot nothing was written to
 *   summarizeSlot(id, envelope, state)  what a menu row shows for a slot
 *   mostRecentSlot(summaries)       the slot CONTINUE should resume
 *   formatMapName(mapName)          'charcoal-wood' → 'Charcoal Wood'
 *   describeSavedAt(savedAt, now)   'moments ago' / '3 hours ago' / a date
 */

import type { GameState } from '@mechanics';

import type { StoredEnvelope } from './migrations';

/** The three slots a player can write to. */
export type SaveSlotId = 1 | 2 | 3;

/** Every slot id, in display order. */
export const SAVE_SLOT_IDS: readonly SaveSlotId[] = Object.freeze([1, 2, 3]) as readonly SaveSlotId[];

/**
 * Storage namespace for the slot system. `:v2` because the single-slot
 * `@axiomancer/save:v1` key is discarded rather than migrated into slot 1:
 * the adapter deletes `LEGACY_SAVE_KEY` on first preload and never reads it.
 */
export const SAVE_SLOT_KEY_PREFIX = '@axiomancer/save:v2:slot-';

/** Which slot the store last booted from / saved to. Read at preload. */
export const LAST_SLOT_KEY = '@axiomancer/save:v2:last-slot';

/** The single-slot key from before save slots. Deleted on preload, never read. */
export const LEGACY_SAVE_KEY = '@axiomancer/save:v1';

/** True for exactly the three slot ids (rejects `0`, `4`, strings, `NaN`). */
export function isSaveSlotId(value: unknown): value is SaveSlotId {
    return value === 1 || value === 2 || value === 3;
}

/** The AsyncStorage key one slot's envelope is written under. */
export function slotStorageKey(id: SaveSlotId): string {
    return `${SAVE_SLOT_KEY_PREFIX}${id}`;
}

/**
 * What a slot holds, at the resolution a menu row needs.
 *
 * - `empty`      nothing was ever written (or the slot was cleared);
 * - `saved`      a readable save — `savedAt` / `level` / `mapName` are set;
 * - `unreadable` bytes exist but did not parse or migrate. The row shows
 *                it as torn and offers to clear it; it is never loaded.
 */
export interface SaveSlotSummary {
    readonly id: SaveSlotId;
    readonly status: 'empty' | 'saved' | 'unreadable';
    /** Epoch ms of the last write, `null` unless `saved`. */
    readonly savedAt: number | null;
    /** `player.level`, `null` unless `saved`. */
    readonly level: number | null;
    /** `world.currentMap.name` (a map id like `charcoal-wood`), `null` unless `saved`. */
    readonly mapName: string | null;
    /** `GameState.runId`, `null` unless `saved`. */
    readonly runId: string | null;
    /**
     * `player.characterId`, `null` unless `saved`, and `null` for a save made
     * before characters existed (CH1f): such a save is only offered for deletion.
     */
    readonly characterId: string | null;
}

/** Whether a slot holds a save made before characters: readable, but never continued. */
export function isPreCharacterSave(summary: SaveSlotSummary): boolean {
    return summary.status === 'saved' && summary.characterId === null;
}

/** The summary of a slot nothing was written to. */
export function emptySlotSummary(id: SaveSlotId): SaveSlotSummary {
    return { id, status: 'empty', savedAt: null, level: null, mapName: null, runId: null, characterId: null };
}

/** The summary of a slot whose bytes could not be read. */
export function unreadableSlotSummary(id: SaveSlotId): SaveSlotSummary {
    return { id, status: 'unreadable', savedAt: null, level: null, mapName: null, runId: null, characterId: null };
}

/**
 * Build a slot's summary from its stored envelope and the unwrapped state.
 *
 * @param id       the slot.
 * @param envelope the raw envelope (for `savedAt`); `null` when empty.
 * @param state    the unwrapped, migrated state; `null` when empty.
 * @returns an `empty` summary when either input is null, else `saved`.
 *
 * `savedAt` is read from the envelope, not the state — it is a property of
 * the WRITE, not of the game, and older envelopes (written before this field
 * existed) read as `0` so they still sort as "oldest".
 */
export function summarizeSlot(
    id: SaveSlotId,
    envelope: StoredEnvelope | null,
    state: GameState | null,
): SaveSlotSummary {
    if (envelope === null || state === null) return emptySlotSummary(id);
    return {
        id,
        status: 'saved',
        savedAt: typeof envelope.savedAt === 'number' ? envelope.savedAt : 0,
        level: state.player?.level ?? null,
        mapName: state.world?.currentMap?.name ?? null,
        runId: state.runId ?? null,
        characterId: state.player?.characterId ?? null,
    };
}

/**
 * The slot CONTINUE resumes: the `saved` slot with the greatest `savedAt`,
 * a save made before characters never (it is only deleted).
 * Ties resolve to the lowest id (stable, deterministic). `null` when no slot
 * is saved — the menu then hides CONTINUE.
 */
export function mostRecentSlot(summaries: readonly SaveSlotSummary[]): SaveSlotId | null {
    let best: SaveSlotSummary | null = null;
    for (const s of summaries) {
        if (s.status !== 'saved' || isPreCharacterSave(s)) continue;
        if (best === null || (s.savedAt ?? 0) > (best.savedAt ?? 0)) best = s;
    }
    return best?.id ?? null;
}

/** `'charcoal-wood'` → `'Charcoal Wood'`; unknown/empty → `'Unknown Lands'`. */
export function formatMapName(mapName: string | null): string {
    if (!mapName) return 'Unknown Lands';
    return mapName
        .split('-')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * A short relative stamp for a slot row. Pure over `now` so tests pin it.
 *
 * - under a minute → `moments ago`
 * - under an hour  → `N min ago`
 * - under a day    → `N h ago`
 * - under a week   → `N d ago`
 * - otherwise      → the ISO date (`2026-09-23`)
 *
 * `savedAt` of `0`/`null` (an envelope written before stamps existed) reads
 * as `long ago` rather than a 1970 date.
 */
export function describeSavedAt(savedAt: number | null, now: number): string {
    if (!savedAt) return 'long ago';
    const delta = Math.max(0, now - savedAt);
    if (delta < MINUTE) return 'moments ago';
    if (delta < HOUR) return `${Math.floor(delta / MINUTE)} min ago`;
    if (delta < DAY) return `${Math.floor(delta / HOUR)} h ago`;
    if (delta < 7 * DAY) return `${Math.floor(delta / DAY)} d ago`;
    return new Date(savedAt).toISOString().slice(0, 10);
}

/**
 * The slot-aware surface the main menu drives. Implemented by the
 * AsyncStorage adapter for real launches and by `createMemorySlotStore` for
 * tests and fixture boots. Every method is synchronous over an in-memory
 * mirror; I/O happens behind it.
 */
export interface SaveSlotStore {
    /** One summary per slot, in `SAVE_SLOT_IDS` order. Stable reference until a change. */
    listSlots(): readonly SaveSlotSummary[];
    /** The slot `save()` writes to, or `null` before the player picks one. */
    getActiveSlot(): SaveSlotId | null;
    /** Make `id` the slot `save()` writes to (and the one remembered for next launch). */
    selectSlot(id: SaveSlotId): void;
    /** The saved state in `id`, or `null` when empty / unreadable. */
    readSlot(id: SaveSlotId): GameState | null;
    /** Wipe `id`. If it was active, the active slot stays selected but now reads empty. */
    clearSlot(id: SaveSlotId): Promise<void>;
    /** Subscribe to slot changes (writes, selects, clears). Returns unsubscribe. */
    subscribe(listener: () => void): () => void;
    /**
     * Push any pending debounced write to disk. Optional: the in-memory
     * store has nothing to flush. `returnToTitleAction` awaits it so the
     * menu's slot rows reflect the save that was just taken.
     */
    flush?(): Promise<void>;
}

/**
 * Hermetic — the pure save-slot vocabulary (`saveSlots.ts`).
 */

import { describe, expect, it } from '@jest/globals';
import { createNewGameState } from '@mechanics';

import {
    SAVE_SLOT_IDS,
    describeSavedAt,
    formatMapName,
    isSaveSlotId,
    mostRecentSlot,
    slotStorageKey,
    summarizeSlot,
    emptySlotSummary,
} from '../saveSlots';

describe('save slots — ids and keys', () => {
    it('exactly three slots, each with its own namespaced key', () => {
        expect(SAVE_SLOT_IDS).toEqual([1, 2, 3]);
        expect(SAVE_SLOT_IDS.map(slotStorageKey)).toEqual([
            '@axiomancer/save:v2:slot-1',
            '@axiomancer/save:v2:slot-2',
            '@axiomancer/save:v2:slot-3',
        ]);
    });

    it('isSaveSlotId accepts 1|2|3 only', () => {
        expect([0, 1, 2, 3, 4, '1', NaN, null].map(isSaveSlotId)).toEqual([
            false, true, true, true, false, false, false, false,
        ]);
    });
});

describe('summarizeSlot', () => {
    it('an empty slot summarises as empty', () => {
        expect(summarizeSlot(2, null, null)).toEqual(emptySlotSummary(2));
    });

    it('a saved slot reads level, map, run and the envelope stamp', () => {
        const state = createNewGameState({ characterId: 'the-chosen' });
        const s = summarizeSlot(1, { schemaVersion: 3, state, savedAt: 5_000 }, state);
        expect(s.status).toBe('saved');
        expect(s.level).toBe(1);
        expect(s.mapName).toBe('breakwater');
        expect(s.runId).toBe(state.runId);
        expect(s.savedAt).toBe(5_000);
    });

    it('an envelope without a stamp reads as the oldest possible write', () => {
        const state = createNewGameState({ characterId: 'the-chosen' });
        expect(summarizeSlot(1, { schemaVersion: 3, state }, state).savedAt).toBe(0);
    });
});

describe('mostRecentSlot — what CONTINUE resumes', () => {
    const saved = (id: 1 | 2 | 3, savedAt: number) => ({
        ...emptySlotSummary(id), status: 'saved' as const, savedAt, characterId: 'fx-char',
    });

    it('never picks a save made before characters, however recent', () => {
        const legacy = { ...saved(1, 99), characterId: null };
        expect(mostRecentSlot([legacy, saved(2, 5)])).toBe(2);
        expect(mostRecentSlot([legacy])).toBeNull();
    });

    it('is null when nothing is saved', () => {
        expect(mostRecentSlot(SAVE_SLOT_IDS.map(emptySlotSummary))).toBeNull();
    });

    it('picks the greatest stamp; ties go to the lowest id; unreadable never wins', () => {
        expect(mostRecentSlot([saved(1, 10), saved(2, 30), saved(3, 20)])).toBe(2);
        expect(mostRecentSlot([saved(1, 30), saved(2, 30), emptySlotSummary(3)])).toBe(1);
        expect(mostRecentSlot([
            { ...emptySlotSummary(1), status: 'unreadable' }, saved(2, 0), emptySlotSummary(3),
        ])).toBe(2);
    });
});

describe('display helpers', () => {
    it('formatMapName title-cases a map id', () => {
        expect(formatMapName('charcoal-wood')).toBe('Charcoal Wood');
        expect(formatMapName('the-capital')).toBe('The Capital');
        expect(formatMapName(null)).toBe('Unknown Lands');
    });

    it('describeSavedAt is pure over now', () => {
        const now = 1_700_000_000_000;
        expect(describeSavedAt(null, now)).toBe('long ago');
        expect(describeSavedAt(now - 10_000, now)).toBe('moments ago');
        expect(describeSavedAt(now - 5 * 60_000, now)).toBe('5 min ago');
        expect(describeSavedAt(now - 3 * 3_600_000, now)).toBe('3 h ago');
        expect(describeSavedAt(now - 2 * 86_400_000, now)).toBe('2 d ago');
        expect(describeSavedAt(now - 30 * 86_400_000, now)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

/**
 * Hermetic — the main-menu / save-slot presenter (`main-menu.engine.ts`).
 */

import { describe, expect, it } from '@jest/globals';

import { emptySlotSummary, type SaveSlotSummary } from '@/state/persistence/saveSlots';
import {
    MAIN_MENU_COPY,
    SAVE_SLOTS_COPY,
    selectMainMenuViewModel,
    selectSaveSlotRows,
    slotNumeral,
} from '../main-menu.engine';

const NOW = 1_700_000_000_000;
const saved = (id: 1 | 2 | 3, savedAt: number, level = 3, mapName = 'northern-forest'): SaveSlotSummary => ({
    id, status: 'saved', savedAt, level, mapName, runId: `run-${id}`, characterId: 'fx-char',
});
const torn = (id: 1 | 2 | 3): SaveSlotSummary => ({ ...emptySlotSummary(id), status: 'unreadable' });

describe('selectMainMenuViewModel', () => {
    it('with nothing saved: no CONTINUE, LOAD GAME disabled with the empty hint', () => {
        const vm = selectMainMenuViewModel([1, 2, 3].map((i) => emptySlotSummary(i as 1 | 2 | 3)), NOW);
        expect(vm.continue.enabled).toBe(false);
        expect(vm.continue.slot).toBeNull();
        expect(vm.loadGame.enabled).toBe(false);
        expect(vm.loadGame.hint).toBe(MAIN_MENU_COPY.loadGameEmptyHint);
        expect(vm.newGame.hint).toBe(MAIN_MENU_COPY.newGameHint);
    });

    it('CONTINUE names the most recent chronicle', () => {
        const vm = selectMainMenuViewModel([saved(1, NOW - 3_600_000 * 5), saved(2, NOW - 60_000 * 2, 7, 'the-capital'), emptySlotSummary(3)], NOW);
        expect(vm.continue.enabled).toBe(true);
        expect(vm.continue.slot).toBe(2);
        expect(vm.continue.hint).toBe('chronicle II · Level 7 · The Capital · 2 min ago');
        expect(vm.loadGame.enabled).toBe(true);
    });
});

describe('selectSaveSlotRows', () => {
    const summaries = [saved(1, NOW - 1000), emptySlotSummary(2), torn(3)];

    it('NEW mode: saved → OVERWRITE, empty → BEGIN, torn → clear only', () => {
        const rows = selectSaveSlotRows(summaries, 'new', NOW);
        expect(rows.map((r) => r.action)).toEqual(['overwrite', 'start', 'none']);
        expect(rows.map((r) => r.actionLabel)).toEqual([SAVE_SLOTS_COPY.overwriteAction, SAVE_SLOTS_COPY.startAction, '']);
        expect(rows.map((r) => r.clearable)).toEqual([true, false, true]);
        expect(rows[0]?.detail).toBe('Level 3 · Northern Forest');
        expect(rows[0]?.stamp).toBe('saved moments ago');
        expect(rows[1]?.detail).toBe(SAVE_SLOTS_COPY.empty);
        expect(rows[2]?.detail).toBe(SAVE_SLOTS_COPY.unreadable);
        expect(rows.map((r) => r.mostRecent)).toEqual([true, false, false]);
    });

    it('LOAD mode: saved → JOURNEY ON…, empty and torn have no primary verb', () => {
        const rows = selectSaveSlotRows(summaries, 'load', NOW);
        expect(rows.map((r) => r.action)).toEqual(['load', 'none', 'none']);
        expect(rows[0]?.actionLabel).toBe(SAVE_SLOTS_COPY.loadAction);
        // Owner call: the LOAD verbs read JOURNEY ON… and DELETE SAVE.
        expect(SAVE_SLOTS_COPY.loadAction).toBe('JOURNEY ON\u2026');
        expect(SAVE_SLOTS_COPY.clearAction).toBe('DELETE SAVE');
    });

    it.each(['new', 'load'] as const)('a save made before characters reads "Made before characters", delete only (%s)', (mode) => {
        const legacy: SaveSlotSummary = { ...saved(1, NOW - 1000), characterId: null };
        const [row] = selectSaveSlotRows([legacy, emptySlotSummary(2), emptySlotSummary(3)], mode, NOW);
        expect(row?.detail).toBe('Made before characters');
        expect(row?.action).toBe('none');
        expect(row?.actionLabel).toBe('');
        expect(row?.clearable).toBe(true);
        expect(row?.mostRecent).toBe(false);
        const vm = selectMainMenuViewModel([legacy, emptySlotSummary(2), emptySlotSummary(3)], NOW);
        expect(vm.continue.enabled).toBe(false);
        expect(vm.loadGame.enabled).toBe(false);
    });

    it('numerals are roman', () => {
        expect([1, 2, 3].map((i) => slotNumeral(i as 1 | 2 | 3))).toEqual(['I', 'II', 'III']);
        expect(selectSaveSlotRows(summaries, 'new', NOW).map((r) => r.numeral)).toEqual(['I', 'II', 'III']);
    });
});

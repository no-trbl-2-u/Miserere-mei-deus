/**
 * Chapter complete presenter pins (phase CE1a, acceptance A1).
 *
 * Pure function on a plain state slice: every stat is read from it, and a stat
 * the state lacks is absent, never estimated.
 */

import { describe, expect, it } from '@jest/globals';

import { BREAKWATER_CHAPTER_QUESTLINE, createCharacter, getRelicById } from '@mechanics';
import type { Character, GameState } from '@mechanics';

import { selectChapterCompleteSummary, type ChapterCompleteState } from '@/state/presenters/chapter-complete.engine';
import { CHAPTER_COMPLETE_STAT_LABELS } from '@/state/presenters/chapter-complete.copy';

const stepNames = BREAKWATER_CHAPTER_QUESTLINE.steps.map((s) => s.quest.name);

function player(over: Partial<Character> = {}): Character {
    const relic = getRelicById('relic-disarming-plea')!;
    return {
        ...createCharacter({ name: 'Fixture', level: 1, baseStats: { heart: 5, body: 5, mind: 5 } }),
        level: 4,
        health: 120,
        maxHealth: 170,
        currency: 63,
        knownCards: ['a', 'b', 'c', 'd', 'e'],
        equipment: { weapon: null, armor: null, relics: [relic, null, null] },
        ...over,
    } as Character;
}

function world(): ChapterCompleteState['world'] {
    return {
        currentMap: { consumedNodes: ['n1', 'n2', 'n3'] },
        mapStates: { other: { consumedNodes: ['x1', 'x2'] } },
    } as unknown as ChapterCompleteState['world'];
}

function fixture(): ChapterCompleteState {
    return {
        player: player(),
        world: world(),
        codex: { unlockedEntries: [], defeatedEnemies: ['green-jelly', 'larch-stalker', 'crane-hook'] },
        quests: { available: [], active: [], completed: [stepNames[0]!, stepNames[1]!, stepNames[2]!, 'A Side Errand'] },
        flags: [],
    } as unknown as ChapterCompleteState;
}

const byId = (state: ChapterCompleteState) =>
    Object.fromEntries(selectChapterCompleteSummary(state).map((r) => [r.id, r]));

describe('selectChapterCompleteSummary', () => {
    it('lists the stats in order, each with its label', () => {
        const rows = selectChapterCompleteSummary(fixture());
        expect(rows.map((r) => r.id)).toEqual([
            'level', 'vitae', 'nodes', 'fights', 'quests', 'shillings', 'deck', 'relics',
        ]);
        for (const r of rows) expect(r.label).toBe(CHAPTER_COMPLETE_STAT_LABELS[r.id]);
    });

    it('reads every stat from the state', () => {
        const rows = byId(fixture());
        expect(rows.level!.value).toBe('4');
        expect(rows.vitae!.value).toBe('120 / 170');
        expect(rows.nodes!.value).toBe('5');
        expect(rows.fights!.value).toBe('3');
        expect(rows.quests!.value).toBe('3 / 4');
        expect(rows.shillings!.value).toBe('63');
        expect(rows.deck!.value).toBe('5');
        expect(rows.relics!.value).toBe('1');
    });

    it('counts only the Breakwater questline steps, not side quests', () => {
        const s = fixture();
        s.quests = { available: [], active: [], completed: ['A Side Errand'] };
        expect(byId(s).quests!.value).toBe('0 / 4');
    });

    it('leaves off a stat the state lacks', () => {
        const s = fixture();
        delete (s as Partial<ChapterCompleteState>).world;
        delete (s as Partial<ChapterCompleteState>).quests;
        s.codex = { unlockedEntries: [] } as unknown as GameState['codex'];
        const ids = selectChapterCompleteSummary(s).map((r) => r.id);
        expect(ids).toEqual(['level', 'vitae', 'shillings', 'deck', 'relics']);
    });

    it('adds no deaths or foes-spared row: the state keeps no such count', () => {
        const ids = selectChapterCompleteSummary(fixture()).map((r) => r.id);
        expect(ids).not.toContain('deaths');
        expect(ids).not.toContain('spared');
    });

    it('gives nothing for a state with no player', () => {
        expect(selectChapterCompleteSummary({ ...fixture(), player: undefined } as unknown as ChapterCompleteState)).toEqual([]);
    });
});

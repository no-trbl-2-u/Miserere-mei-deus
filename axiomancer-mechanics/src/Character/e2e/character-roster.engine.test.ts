/**
 * The character roster's content rules (CH1 A1): the real roster passes
 * `characterProblems`, and each broken rule is caught on a fixture
 * definition against fixture lanes and fixture relics.
 */

import { describe, it, expect } from 'vitest';
import {
    CHARACTER_ROSTER,
    CHARACTER_GREY_DECK,
    FRESH_RUN_STAT_BUDGET,
    characterDeck,
    characterProblems,
    getCharacterDefinition,
    type CharacterDefinition,
    type CharacterProblemCode,
} from '../roster';
import { cardLibrary } from '../../Cards/cards.library';
import { GREY_LANE, type CardLane } from '../../Cards/card.lanes';
import type { Equipment } from '../../Items/types';
import { relicLibrary } from '../../Items/relic.library';
import { createNewGameState } from '../../Game/game.reducer';

/** Real non-grey Attack/Skill cards, so the type rule passes on the fixture. */
const playable = cardLibrary
    .filter(c => (c.cardType === 'attack' || c.cardType === 'skill') && !GREY_LANE.cardIds.includes(c.id))
    .map(c => c.id);
const spellId = cardLibrary.find(c => c.cardType === 'spell' && !GREY_LANE.cardIds.includes(c.id))?.id ?? 'grey-word';
const curseId = cardLibrary.find(c => c.cardType === 'curse')?.id;

const [cardA, cardB, cardC, cardD] = playable as [string, string, string, string];

const lane = (id: string, cardIds: string[]): CardLane => ({ id, name: id, cardIds, testDeck: cardIds });

const LANES: readonly CardLane[] = [
    GREY_LANE,
    lane('lane-a', [cardA, spellId, ...(curseId ? [curseId] : [])]),
    lane('lane-b', [cardB]),
    lane('lane-c', [cardC, cardD]),
];

/** A fixture relic: a real library relic re-keyed, with or without a lane. */
const relic = (id: string, laneId?: string): Equipment => {
    const { laneId: _drop, grantsSignature: _sig, ...base } = relicLibrary[0]!;
    return { ...base, id, name: id, statModifiers: [], ...(laneId ? { laneId } : {}) };
};

const RELICS: readonly Equipment[] = [relic('relic-c', 'lane-c'), relic('relic-none')];

const SOUND: CharacterDefinition = {
    id: 'fixture-sound',
    name: 'Fixture',
    portraitKey: 'p1',
    startingRelicId: 'relic-c',
    baseStats: { heart: 5, body: 7, mind: 3 },
    startingLaneIds: ['lane-a', 'lane-b'],
    startingCardIds: [cardC, cardA, cardB],
    playstyle: 'Hits hard.',
};

const codes = (def: CharacterDefinition) => characterProblems(def, LANES, RELICS).map(p => p.code);

describe('character roster (CH1 A1)', () => {
    it('the fixture library has the cards the fixture needs', () => {
        expect(playable.length).toBeGreaterThanOrEqual(4);
    });

    it('the real roster passes every rule', () => {
        for (const def of CHARACTER_ROSTER) {
            expect(characterProblems(def), def.id).toEqual([]);
        }
    });

    it('the real roster ids are unique and resolve', () => {
        const ids = CHARACTER_ROSTER.map(d => d.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) expect(getCharacterDefinition(id)?.id).toBe(id);
        expect(getCharacterDefinition('no-such-character')).toBeUndefined();
    });

    it('the stat budget is the fresh run\'s stat total', () => {
        const { heart, body, mind } = createNewGameState().player.baseStats;
        expect(FRESH_RUN_STAT_BUDGET).toBe(heart + body + mind);
        expect(FRESH_RUN_STAT_BUDGET).toBe(15);
    });

    it('the character deck is Blow 3, Ward 2, Word 2 plus the three lane cards', () => {
        expect(CHARACTER_GREY_DECK.filter(id => id === 'grey-strike')).toHaveLength(3);
        expect(CHARACTER_GREY_DECK.filter(id => id === 'grey-ward')).toHaveLength(2);
        expect(CHARACTER_GREY_DECK.filter(id => id === 'grey-word')).toHaveLength(2);
        expect(characterDeck(SOUND)).toEqual([...CHARACTER_GREY_DECK, cardC, cardA, cardB]);
        expect(characterDeck(SOUND)).toHaveLength(10);
    });

    it('a sound fixture has no problem', () => {
        expect(codes(SOUND)).toEqual([]);
    });

    const broken: [string, Partial<CharacterDefinition>, CharacterProblemCode][] = [
        ['relic not in the library', { startingRelicId: 'relic-missing' }, 'relic-unknown'],
        ['relic with no lane', { startingRelicId: 'relic-none' }, 'relic-no-lane'],
        ['a starting lane is grey', { startingLaneIds: ['grey', 'lane-b'], startingCardIds: ['grey-strike', cardB, cardC] }, 'lane-grey'],
        ['a starting lane is not registered', { startingLaneIds: ['lane-z', 'lane-b'] }, 'lane-unregistered'],
        ['a starting lane is the relic\'s lane', { startingLaneIds: ['lane-c', 'lane-b'], startingCardIds: [cardD, cardB, cardC] }, 'lane-is-relic-lane'],
        ['the two starting lanes are equal', { startingLaneIds: ['lane-b', 'lane-b'] }, 'lanes-equal'],
        ['stats do not total the budget', { baseStats: { heart: 5, body: 7, mind: 5 } }, 'stats-budget'],
        ['a card is not in the library', { startingCardIds: ['no-such-card', cardA, cardB] }, 'card-unknown'],
        ['a card is a Spell', { startingCardIds: [cardC, spellId, cardB] }, 'card-forbidden-type'],
        ['two cards from one lane', { startingCardIds: [cardC, cardD, cardB] }, 'cards-not-one-per-lane'],
    ];

    it.each(broken)('%s is caught', (_label, patch, code) => {
        expect(codes({ ...SOUND, ...patch })).toContain(code);
    });

    it('a Curse as a starting card is caught', () => {
        if (!curseId) return;
        expect(codes({ ...SOUND, startingCardIds: [cardC, curseId, cardB] })).toContain('card-forbidden-type');
    });

    it('each broken rule is caught alone where it can be', () => {
        expect(codes({ ...SOUND, baseStats: { heart: 1, body: 1, mind: 1 } })).toEqual(['stats-budget']);
        expect(codes({ ...SOUND, startingRelicId: 'relic-missing' })).toEqual(['relic-unknown', 'cards-not-one-per-lane']);
    });

    it('checks against the real registry and library by default', () => {
        // The fixture's lanes are not registered, and its relic is not in the real library.
        const problems = characterProblems(SOUND).map(p => p.code);
        expect(problems).toContain('relic-unknown');
        expect(problems).toContain('lane-unregistered');
    });
});

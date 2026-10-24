/**
 * The weather on the board — the presenter half (Phase EL1b, acceptance A4).
 *
 * Pins, against the REAL engine with test cards in the sandbox registry (the
 * Elementalist trial set itself lands in EL1c, so no trial id is named):
 *   · each element's number shows on the foe as a chip (INFERNO, BLIZZARD,
 *     STORM, and FROZEN while it is up), your INFERNO on you, and every chip
 *     carries its keyword's popup gloss;
 *   · the chips follow the weather as it moves (stacking, drift);
 *   · the log narrates each weather change, BLIZZARD softening a hit, and a
 *     card's DRAW (never the turn's refill draw);
 *   · card faces print INFERNO, BLIZZARD, STORM and DRAW as tokens with a
 *     silhouette, and the glossary resolves all five new keywords.
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import {
    clearSandboxCards, playCombatCard, registerSandboxCards, rollEncounterDice,
    type Card, type CombatEncounterState, type CombatEvent,
} from '@mechanics';
import type { ProgramCtx } from '@mechanics/Cards/card-program.types';

import { buildCombatViewModel, selectCombatLogHistory, selectCombatLogLines, weatherChips } from '../combat-encounter.engine';
import { programFreeCell, programHeadline } from '../card-program.engine';
import { glyphShapeFor } from '@/components/combat/glyphShapes';
import { keywordGloss, keywordsInText } from '@/state/combat/keywords';
import { realFightFixture, startRealFight } from '@/test-utils/realFight';

function card(id: string, run: (c: ProgramCtx) => void): Card {
    return {
        id, name: id, color: 'any', description: 'A weather board test card.',
        tier: 1, rank: 1, cardType: 'skill', targetType: 'enemy',
        program: { free: { text: 'TEST.', run }, paid: { text: 'TEST.', run } },
    };
}

const CARDS: Card[] = [
    card('wb-inferno', (c) => c.inferno(4)),
    card('wb-blizzard', (c) => c.blizzard(3)),
    card('wb-storm', (c) => c.storm(2)),
    card('wb-draw', (c) => c.draw(2)),
];

beforeAll(() => registerSandboxCards(CARDS));
afterAll(() => clearSandboxCards());

const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };

function encounter(hand: string[]): CombatEncounterState {
    const deck = [...hand, 'grey-strike', 'grey-ward', 'grey-word', 'grey-strike', 'grey-ward'];
    const { combat } = startRealFight(
        realFightFixture({ level: 1, baseStats: { heart: 5, body: 5, mind: 5 } }),
        { deck, seed: 5 },
    );
    const s = rollEncounterDice(combat).state;
    return {
        ...s,
        enemy: { ...s.enemy, health: 400, maxHealth: 400 },
        hand: hand.map((cardId, i) => ({ uid: `h${i}`, cardId })),
        player: { ...s.player, health: 100 },
        dice: [{ ...WILD }],
    };
}

const free = (s: CombatEncounterState, uid: string): CombatEncounterState =>
    playCombatCard(s, { uid }, false).state;

const byId = (chips: { effectId: string; intensity: number }[]): Record<string, number> =>
    Object.fromEntries(chips.map((c) => [c.effectId, c.intensity]));

describe('the weather on the board', () => {
    it('a clear sky shows no weather chips', () => {
        const vm = buildCombatViewModel(encounter(['wb-inferno']));
        expect(vm.enemy.effects.filter((c) => c.effectId.startsWith('weather-'))).toEqual([]);
        expect(vm.player.effects.filter((c) => c.effectId.startsWith('weather-'))).toEqual([]);
    });

    it("shows each element's number on the foe, your INFERNO on you, each with its popup", () => {
        let s = encounter(['wb-inferno', 'wb-blizzard', 'wb-storm']);
        s = free(s, 'h0');
        s = free(s, 'h1');
        s = free(s, 'h2');
        const vm = buildCombatViewModel(s);
        expect(byId(vm.enemy.effects)).toMatchObject({
            'weather-foe-inferno': 4, 'weather-blizzard': 3, 'weather-storm': 2,
        });
        // Your INFERNO is half the both-sides INFERNO, rounded down.
        expect(byId(vm.player.effects)).toMatchObject({ 'weather-your-inferno': 2 });
        // FROZEN is not up until the BLIZZARD meets an attack.
        expect(byId(vm.enemy.effects)['weather-frozen']).toBeUndefined();
        for (const chip of [...vm.enemy.effects, ...vm.player.effects].filter((c) => c.effectId.startsWith('weather-'))) {
            expect(chip.gloss).toBeTruthy();
            // The weather lasts the whole combat: no turn tag.
            expect(chip.duration).toBe(0);
        }
    });

    it('the chips follow the weather: stacking adds, FROZEN shows while it is up', () => {
        let s = encounter(['wb-inferno', 'wb-inferno']);
        s = free(s, 'h0');
        s = free(s, 'h1');
        expect(byId(weatherChips(s, 'enemy'))['weather-foe-inferno']).toBe(8);
        expect(byId(weatherChips(s, 'player'))['weather-your-inferno']).toBe(4);
        const program = s.program!;
        const frozen = { ...s, program: { ...program, el: { ...program.el, frozen: true } } };
        expect(byId(weatherChips(frozen, 'enemy'))['weather-frozen']).toBe(1);
        // A drifted-out INFERNO leaves no chip behind.
        const gone = { ...s, program: { ...program, el: { ...program.el, infShared: 0 } } };
        expect(weatherChips(gone, 'enemy')).toEqual([]);
        expect(weatherChips(gone, 'player')).toEqual([]);
    });
});

describe('the weather in the log', () => {
    const line = (e: CombatEvent) => selectCombatLogLines([e])[0];

    it('narrates each element arriving, rising, falling and going, and FROZEN up and down', () => {
        expect(line({ kind: 'weather-changed', element: 'blizzard', from: 0, to: 3 }))
            .toMatchObject({ side: 'enemy', text: "The foe's BLIZZARD 3.", float: 'BLIZZARD 3' });
        expect(line({ kind: 'weather-changed', element: 'storm', from: 2, to: 3 }))
            .toMatchObject({ text: "The foe's STORM rises to 3.", float: 'STORM +1' });
        // The round's drift is log-only.
        expect(line({ kind: 'weather-changed', element: 'foe-inferno', from: 4, to: 3 }))
            .toMatchObject({ text: "The foe's INFERNO falls to 3.", float: null });
        expect(line({ kind: 'weather-changed', element: 'blizzard', from: 1, to: 0 }))
            .toMatchObject({ text: "The foe's BLIZZARD is gone.", float: null });
        // Your INFERNO is yours: your side of the log, never a float over the foe.
        expect(line({ kind: 'weather-changed', element: 'your-inferno', from: 0, to: 2 }))
            .toMatchObject({ side: 'player', text: 'Your INFERNO 2.', float: null });
        expect(line({ kind: 'weather-changed', element: 'frozen', from: 0, to: 1 }))
            .toMatchObject({ text: 'The foe is FROZEN: the next DEAL it takes is doubled.', float: '✻ FROZEN' });
        expect(line({ kind: 'weather-changed', element: 'frozen', from: 1, to: 0 }))
            .toMatchObject({ text: 'FROZEN ends.', float: null });
        expect(line({ kind: 'blizzard-softened', amount: 3 }))
            .toMatchObject({ side: 'player', text: 'BLIZZARD takes 3 off its attack.' });
    });

    it("the history carries a played card's weather and its DRAW, not the turn's refill", () => {
        let s = encounter(['wb-storm', 'wb-draw']);
        const before = selectCombatLogHistory(s).map((l) => l.text);
        expect(before.some((t) => /You DRAW/.test(t))).toBe(false);
        s = free(s, 'h0');
        s = free(s, 'h1');
        const texts = selectCombatLogHistory(s).map((l) => l.text);
        expect(texts).toContain("The foe's STORM 2.");
        expect(texts).toContain('You DRAW 2 cards.');
    });
});

describe('the weather on card faces and in the glossary', () => {
    it('glosses INFERNO, BLIZZARD, FROZEN, STORM and DRAW, and finds them in printed text', () => {
        for (const kw of ['Inferno', 'Blizzard', 'Frozen', 'Storm', 'Draw']) expect(keywordGloss(kw)).toBeTruthy();
        expect(keywordsInText('DEAL 4, INFERNO 2; if the foe is FROZEN, the INFERNO is doubled too.'))
            .toEqual(['Inferno', 'Frozen']);
        expect(keywordsInText('BLIZZARD 2, DRAW 1. STORM 1.')).toEqual(['Blizzard', 'Draw', 'Storm']);
    });

    it('headlines and FREE cells print the weather tokens, each with a silhouette', () => {
        expect(programHeadline('BLIZZARD 3, DRAW 1')).toEqual({ keyword: 'BLIZZARD', value: '3' });
        expect(programHeadline('INFERNO 1, BLIZZARD 1, STORM 1')).toEqual({ keyword: 'INFERNO', value: '1' });
        expect(programHeadline('DRAW 2')).toEqual({ keyword: 'DRAW', value: '2' });
        expect(programHeadline("GUARD equal to the foe's BLIZZARD")).toEqual({ keyword: 'GUARD', value: 'X' });
        expect(programHeadline('Remove your INFERNO')).toEqual({ keyword: 'INFERNO', value: '' });
        expect(programFreeCell('DEAL 3, INFERNO 2')).toEqual({ keyword: 'INFERNO', value: '2' });
        expect(programFreeCell('STORM 2, DRAW 1')).toEqual({ keyword: 'STORM', value: '2' });
        for (const kw of ['INFERNO', 'BLIZZARD', 'STORM', 'DRAW']) expect(glyphShapeFor(kw)).not.toBeNull();
    });
});

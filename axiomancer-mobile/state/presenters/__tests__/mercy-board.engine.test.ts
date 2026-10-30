/**
 * MERCY on the board — the presenter half (Phase MF1c, acceptance A6 and A7).
 *
 * Pins, against the REAL engine with test cards in the sandbox registry (the
 * Merciful trial set itself lands in MF1d, so no trial id is named):
 *   · the foe wears a MERCY chip carrying its total and the turns left, which
 *     follows the engine as MERCY stacks, and a YIELDING chip while it holds,
 *     each with its keyword's popup gloss;
 *   · the log narrates a RADIANCE hit, each MERCY add and tick, and the
 *     burst (the hit named, not a raw pseudo card id);
 *   · card faces print RADIANCE and MERCY as tokens with the sun and the dove.
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import {
    clearSandboxCards, playCombatCard, registerSandboxCards, rollEncounterDice,
    type Card, type CombatEncounterState, type CombatEvent,
} from '@mechanics';
import type { ProgramCtx } from '@mechanics/Cards/card-program.types';

import {
    buildCombatViewModel, effectChipA11y, selectCombatLogHistory, selectCombatLogLines,
} from '../combat-encounter.engine';
import { programFreeCell, programHeadline } from '../card-program.engine';
import { glyphShapeFor } from '@/components/combat/glyphShapes';
import { keywordGloss, keywordsInText } from '@/state/combat/keywords';
import { realFightFixture, startRealFight } from '@/test-utils/realFight';

function card(id: string, run: (c: ProgramCtx) => void): Card {
    return {
        id, name: id, color: 'any', description: 'A mercy board test card.',
        tier: 1, rank: 1, cardType: 'skill', targetType: 'enemy',
        program: { free: { text: 'TEST.', run }, paid: { text: 'TEST.', run } },
    };
}

const CARDS: Card[] = [
    card('mb-mercy', (c) => c.mercy(5, { exact: true })),
    card('mb-radiance', (c) => c.radiance(4)),
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
        enemy: { ...s.enemy, health: 100, maxHealth: 400 },
        hand: hand.map((cardId, i) => ({ uid: `h${i}`, cardId })),
        player: { ...s.player, health: 60, maxHealth: 100 },
        dice: [{ ...WILD }],
    };
}

const free = (s: CombatEncounterState, uid: string): CombatEncounterState =>
    playCombatCard(s, { uid }, false).state;

const mercyChip = (s: CombatEncounterState) =>
    buildCombatViewModel(s).enemy.effects.find((c) => c.effectId === 'program-mercy');

describe('MERCY on the foe', () => {
    it('shows no MERCY or YIELDING chip before any MERCY', () => {
        const vm = buildCombatViewModel(encounter(['mb-mercy']));
        expect(vm.enemy.effects.some((c) => c.effectId === 'program-mercy' || c.effectId === 'program-yielding')).toBe(false);
    });

    it('shows its total and turns left, and follows both as MERCY stacks', () => {
        let s = encounter(['mb-mercy', 'mb-mercy']);
        s = free(s, 'h0');
        let chip = mercyChip(s);
        expect(chip).toMatchObject({ intensity: 5, duration: 3 });
        expect(chip?.glyph.label).toBe('Mercy');
        expect(chip?.gloss).toBe(keywordGloss('Mercy'));
        // A second MERCY adds to the total and leaves the clock where it is.
        s = free(s, 'h1');
        chip = mercyChip(s);
        expect(chip).toMatchObject({ intensity: 10, duration: 3 });
        expect(effectChipA11y(chip!)).toBe('Mercy, intensity 10, bursts in 3 turns');
    });

    it('reads the clock singular at one turn left, and shows YIELDING while it holds', () => {
        let s = encounter(['mb-mercy']);
        s = free(s, 'h0');
        const program = s.program!;
        const held = {
            ...s, program: { ...program, mercy: { ...program.mercy!, clock: 1, yielding: true } },
        };
        const vm = buildCombatViewModel(held);
        const mercy = vm.enemy.effects.find((c) => c.effectId === 'program-mercy');
        const yielding = vm.enemy.effects.find((c) => c.effectId === 'program-yielding');
        expect(effectChipA11y(mercy!)).toBe('Mercy, intensity 5, bursts in 1 turn');
        expect(yielding?.gloss).toBe(keywordGloss('Yielding'));
        expect(effectChipA11y(yielding!)).toBe('Yielding, intensity 1, while it holds');
        // Gone with the clock: no chip for a cleared total.
        const burst = { ...s, program: { ...program, mercy: { total: 0, clock: 0, yielding: false } } };
        expect(buildCombatViewModel(burst).enemy.effects.some((c) => c.effectId.startsWith('program-mercy'))).toBe(false);
    });
});

describe('MERCY and RADIANCE in the log', () => {
    const line = (e: CombatEvent) => selectCombatLogLines([e])[0];

    it('narrates RADIANCE, each MERCY add and tick, and the burst', () => {
        expect(line({ kind: 'radiance-struck', cardId: 'x', healed: 4, amount: 4 }))
            .toMatchObject({ side: 'player', text: 'RADIANCE heals you 4 and hits for 4.' });
        expect(line({ kind: 'radiance-struck', cardId: 'x', healed: 0, amount: 0 }))
            .toMatchObject({ text: 'RADIANCE finds nothing to heal.' });
        expect(line({ kind: 'mercy-added', cardId: 'x', healed: 3, amount: 5, total: 5, turnsLeft: 3 }))
            .toMatchObject({
                side: 'enemy',
                text: "MERCY +5, healing the foe 3. The foe's MERCY is 5; it bursts in 3 turns.",
                float: 'MERCY +5',
            });
        expect(line({ kind: 'mercy-added', cardId: 'x', healed: 0, amount: 5, total: 5, turnsLeft: 3 }).text)
            .toBe("MERCY +5. The foe's MERCY is 5; it bursts in 3 turns.");
        expect(line({ kind: 'mercy-ticked', total: 10, turnsLeft: 1 }))
            .toMatchObject({ text: "The foe's MERCY is 10; it bursts in 1 turn." });
        expect(line({ kind: 'mercy-burst', total: 10, amount: 20, onClock: true }))
            .toMatchObject({ side: 'enemy', text: "The foe's MERCY 10 bursts for 20.", float: 'MERCY BURST −20' });
    });

    it('never says MERCY triggers', () => {
        const events: CombatEvent[] = [
            { kind: 'mercy-added', cardId: 'x', healed: 1, amount: 2, total: 2, turnsLeft: 3 },
            { kind: 'mercy-ticked', total: 2, turnsLeft: 2 },
            { kind: 'mercy-burst', total: 2, amount: 4, onClock: true },
        ];
        for (const l of selectCombatLogLines(events)) expect(l.text).not.toMatch(/trigger/i);
    });

    it('the history names the burst hit, and carries a played RADIANCE and MERCY', () => {
        let s = encounter(['mb-radiance', 'mb-mercy']);
        s = free(s, 'h0');
        s = free(s, 'h1');
        const texts = selectCombatLogHistory(s).map((l) => l.text);
        expect(texts.some((t) => /^RADIANCE heals you 4 and hits for 4\.$/.test(t))).toBe(true);
        expect(texts.some((t) => /^MERCY \+5/.test(t))).toBe(true);
        // A burst's damage carries the pseudo card id `mercy`; the log gives it a name.
        const hist = selectCombatLogHistory(
            { ...s, log: [{ kind: 'damage-dealt', cardId: 'mercy', amount: 20, target: 'enemy' } as CombatEvent] } as CombatEncounterState,
        ).map((l) => l.text);
        expect(hist).toEqual(['You deal 20 (Mercy burst).']);
    });
});

describe('MERCY on card faces and in the glossary', () => {
    it('glosses RADIANCE, MERCY and YIELDING, and finds them in printed text', () => {
        for (const kw of ['Radiance', 'Mercy', 'Yielding']) expect(keywordGloss(kw)).toBeTruthy();
        expect(keywordsInText('RADIANCE 4. MERCY 5.')).toEqual(['Radiance', 'Mercy']);
        expect(keywordGloss('Mercy')).toMatch(/bursts/);
        expect(keywordGloss('Mercy')).not.toMatch(/trigger/i);
    });

    it('headlines and FREE cells print the tokens, each with a sun or a dove', () => {
        expect(programHeadline('RADIANCE 4')).toEqual({ keyword: 'RADIANCE', value: '4' });
        expect(programHeadline('MERCY 8, then the foe\'s MERCY bursts now')).toEqual({ keyword: 'MERCY', value: '8' });
        expect(programHeadline("The foe's MERCY bursts now")).toEqual({ keyword: 'MERCY', value: '' });
        expect(programFreeCell('RADIANCE 3')).toEqual({ keyword: 'RADIANCE', value: '3' });
        expect(programFreeCell('MERCY 5, DRAW 1')).toEqual({ keyword: 'MERCY', value: '5' });
        expect(programFreeCell('MERCY equal to half all you healed this turn')).toEqual({ keyword: 'MERCY', value: 'X' });
        expect(glyphShapeFor('RADIANCE')).not.toBeNull();
        expect(glyphShapeFor('MERCY')).not.toBeNull();
        expect(glyphShapeFor('RADIANCE')).not.toEqual(glyphShapeFor('MERCY'));
    });
});

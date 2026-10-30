/**
 * The sea cave's second elite on the board (phase EN1j, A15): the Cave Choir
 * stands at `bw-c1` with its stand-in portrait and two unnamed DANGERs, its
 * VERSE count stands on its side as a live chip (never on the telegraph), its
 * Antiphon telegraphs UNKNOWN with no number, and Toll for the Drowned's two
 * lifted dice read on one UNDERTOW chip.
 */

import { describe, expect, it } from '@jest/globals';
import { rollEncounterDice, type CombatEncounterState, type StateFixture } from '@mechanics';

import { buildCombatViewModel, effectChipA11y } from '../combat-encounter.engine';
import { GLYPH_COLORS } from '@/components/combat/statusGlyphs';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';

const DECK = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike', 'grey-ward'];
const NO_WORDS = { ward: 0, brine: 0, leechTurns: 0, leechPotency: 0 };

/** The live fight at the sea cave, as the app stages it. */
function cave(): CombatEncounterState {
    const ref: StateFixture = {
        ...REAL_FIGHT_FIXTURE,
        id: 'en1j-bw-c1',
        seed: 'fixture-en1j-bw-c1',
        world: { ...REAL_FIGHT_FIXTURE.world!, node: 'bw-c1' },
        player: { level: 1, baseStats: { heart: 5, body: 5, mind: 5 } },
    };
    const { combat } = startRealFight(ref, { deck: DECK, seed: 3 });
    return rollEncounterDice(combat).state;
}

/** The fight with the choir about to play `move` in `phase` (0 = the opening loop). */
function at(s: CombatEncounterState, move: string, phase: number): CombatEncounterState {
    const i = s.threatPhases.findIndex((p) => p.enemyMove?.name === move && p.enemyMove.phase === phase);
    expect(i).toBeGreaterThanOrEqual(0);
    return { ...s, currentPhaseIndex: i };
}

describe('the sea cave stages the Cave Choir', () => {
    it('with its stand-in portrait and its two DANGERs listed, unnamed while unbeaten', () => {
        const vm = buildCombatViewModel(cave());
        expect(vm.enemy.name).toBe('The Cave Choir');
        expect(vm.enemy.artKey).toBe('cave-choir');
        expect(vm.enemy.dangers?.map((d) => d.name)).toEqual([null, null]);
    });
});

describe('VERSE stands on the choir\'s side, a live count', () => {
    it('shows only once a verse is sung, with its count, caption and gloss', () => {
        const s = cave();
        expect(buildCombatViewModel(s).enemy.effects.some((e) => e.effectId === 'enemy-counter-verse')).toBe(false);
        const sung = buildCombatViewModel({ ...s, enemyRiders: { verse: 3 } });
        const chip = sung.enemy.effects.find((e) => e.effectId === 'enemy-counter-verse')!;
        expect(chip).toMatchObject({ intensity: 3, glyph: { label: 'Verse', color: GLYPH_COLORS.dot } });
        expect(chip.caption).toMatch(/Crescendo and the Amen/);
        expect(chip.gloss).toMatch(/Hymn adds one/);
        expect(sung.player.effects.some((e) => e.effectId === 'enemy-counter-verse')).toBe(false);
    });

    it('its a11y line says the Amen spends it, not that it lasts the fight', () => {
        const chip = buildCombatViewModel({ ...cave(), enemyRiders: { verse: 2 } }).enemy.effects
            .find((e) => e.effectId === 'enemy-counter-verse')!;
        const line = effectChipA11y(chip);
        expect(line).toContain('until the Amen spends it');
        expect(line).not.toMatch(/lasts the fight|foe's next turn/);
    });

    it('a Crescendo telegraphs ATTACK with no number, however many verses are sung', () => {
        const s = { ...at(cave(), 'Crescendo', 1), enemyRiders: { verse: 6 } };
        const intent = buildCombatViewModel(s).enemy.intent;
        expect([intent.type, intent.moveName]).toEqual(['attack', 'Crescendo']);
        expect(`${intent.label} ${intent.description} ${intent.moveName}`).not.toMatch(/\d/);
        expect(intent.damage).toBe(0);
    });
});

describe('the Antiphon telegraphs UNKNOWN', () => {
    it.each([0, 9])('with no number, whatever you dealt last turn (%i)', (dealt) => {
        const s = { ...at(cave(), 'Antiphon', 2), directDamageDealt: dealt, enemyRiders: { verse: 2 } };
        const intent = buildCombatViewModel(s).enemy.intent;
        expect([intent.type, intent.moveName]).toEqual(['unknown', 'Antiphon']);
        expect(`${intent.label} ${intent.description} ${intent.moveName}`).not.toMatch(/\d/);
        expect(intent.damage).toBe(0);
    });
});

describe('Toll for the Drowned\'s two lifted dice', () => {
    it('read on one UNDERTOW chip that names both dice and says when they come back', () => {
        const s = { ...cave(), enemyWords: { ...NO_WORDS, undertow: 'heart' as const, undertowAlso: 'mind' as const } };
        const chips = buildCombatViewModel(s).player.effects.filter((e) => e.effectId === 'enemy-word-undertow');
        expect(chips).toHaveLength(1);
        expect(chips[0]!.intensity).toBe(2);
        expect(chips[0]!.caption).toBe('Heart and Mind dice lifted from your next roll');
        expect(effectChipA11y(chips[0]!)).toContain('until your next roll');
    });
});

/**
 * The keep causeway's two elites on the board (phase EN1l, A18 and A19):
 * `bw-w5` stages the Toll-Keeper or the Tide-Gate with its stand-in portrait.
 * The Toll-Keeper's TOLL and distrained cards stand on its side as live
 * chips, and its pane carries "Pay the toll (n)", which the engine refuses
 * loudly at the SACRIFICE floor. The Tide-Gate's TIDE stands on its side from
 * the first turn, 0 included, with its low-tide VULNERABLE. Neither number
 * reaches the telegraph.
 */

import { describe, expect, it } from '@jest/globals';
import {
    payTheToll, rollEncounterDice, type CombatEncounterState, type StateFixture,
} from '@mechanics';

import { buildCombatViewModel, effectChipA11y, TOLL_COPY } from '../combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';

const DECK = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike', 'grey-ward'];

/** The live fight at the keep causeway with `foeId` drawn: tries seeds until the map's pool roll draws it. */
function fightAt(foeId: 'enemy-toll-keeper' | 'enemy-tide-gate'): CombatEncounterState {
    for (let i = 0; i < 40; i++) {
        const ref: StateFixture = {
            ...REAL_FIGHT_FIXTURE,
            id: `en1l-bw-w5-${i}`,
            seed: `fixture-en1l-bw-w5-${i}`,
            world: { ...REAL_FIGHT_FIXTURE.world!, node: 'bw-w5' },
            player: { level: 1, baseStats: { heart: 5, body: 5, mind: 5 } },
        };
        const { combat } = startRealFight(ref, { deck: DECK, seed: 3 });
        if (combat.enemy.id === foeId) return rollEncounterDice(combat).state;
    }
    throw new Error(`bw-w5 never drew ${foeId}`);
}

const chipOf = (s: CombatEncounterState, id: string) =>
    buildCombatViewModel(s).enemy.effects.find((e) => e.effectId === id);

describe('the keep causeway stages the Toll-Keeper', () => {
    it('with its stand-in portrait and its two DANGERs listed, unnamed while unbeaten', () => {
        const vm = buildCombatViewModel(fightAt('enemy-toll-keeper'));
        expect(vm.enemy.name).toBe('The Toll-Keeper');
        expect(vm.enemy.artKey).toBe('toll-keeper');
        expect(vm.enemy.dangers?.map((d) => d.name)).toEqual([null, null]);
    });

    it('shows TOLL only once one is owed, with its gloss and a11y saying how it clears', () => {
        const s = fightAt('enemy-toll-keeper');
        expect(chipOf(s, 'enemy-counter-toll-owed')).toBeUndefined();
        const chip = chipOf({ ...s, enemyRiders: { tollOwed: 3 } }, 'enemy-counter-toll-owed')!;
        expect(chip).toMatchObject({ intensity: 3, glyph: { label: 'Toll' } });
        expect(chip.gloss).toMatch(/SACRIFICE equal to the toll/);
        expect(effectChipA11y(chip)).toContain('until you pay the toll');
    });

    it('shows the distrained cards on its side', () => {
        const s = { ...fightAt('enemy-toll-keeper'), enemyRiders: { tollOwed: 1, distrained: [{ uid: 'x1', cardId: 'grey-strike' }] } };
        const chip = chipOf(s, 'enemy-counter-distrained')!;
        expect(chip.intensity).toBe(1);
        expect(effectChipA11y(chip)).toContain('until you pay the toll');
        expect(buildCombatViewModel(s).player.effects.some((e) => e.effectId === 'enemy-counter-distrained')).toBe(false);
    });

    it('a Levy telegraphs ATTACK with no number, however much TOLL is owed', () => {
        const base = fightAt('enemy-toll-keeper');
        const i = base.threatPhases.findIndex((p) => p.enemyMove?.name === 'Levy');
        const intent = buildCombatViewModel({ ...base, currentPhaseIndex: i, enemyRiders: { tollOwed: 5 } }).enemy.intent;
        expect([intent.type, intent.moveName]).toEqual(['attack', 'Levy']);
        expect(`${intent.label} ${intent.description} ${intent.moveName}`).not.toMatch(/\d/);
    });
});

describe('Pay the toll (n)', () => {
    it('reads the TOLL owed and pays it as a SACRIFICE', () => {
        const s = { ...fightAt('enemy-toll-keeper'), enemyRiders: { tollOwed: 2 } };
        const toll = buildCombatViewModel(s).enemy.toll!;
        expect(toll).toMatchObject({ owed: 2, cost: 2, label: TOLL_COPY.label(2), block: null, shortfall: null });
        expect(toll.label).toBe('Pay the toll (2)');
        expect(toll.a11y).toMatch(/SACRIFICE 2 VITAE/);
        const paid = payTheToll(s).state;
        expect(paid.player.health).toBe(s.player.health - 2);
        expect(buildCombatViewModel(paid).enemy.toll!.owed).toBe(0);
    });

    it('is refused loudly when VITAE is not above the TOLL: the reason and the floor both read', () => {
        const base = fightAt('enemy-toll-keeper');
        const s = { ...base, player: { ...base.player, health: 4 }, enemyRiders: { tollOwed: 4 } };
        const toll = buildCombatViewModel(s).enemy.toll!;
        expect(toll.block).toMatch(/below 1 VITAE/);
        expect(toll.shortfall).toEqual({ cost: 4, vitae: 4 });
        expect(toll.a11y).toMatch(/Refused/);
        expect(payTheToll(s).events[0]).toMatchObject({ kind: 'effect-fizzled' });
    });

    it('is absent on any other foe', () => {
        expect(buildCombatViewModel(fightAt('enemy-tide-gate')).enemy.toll).toBeUndefined();
    });
});

describe('the keep causeway stages the Tide-Gate', () => {
    it('with its stand-in portrait', () => {
        const vm = buildCombatViewModel(fightAt('enemy-tide-gate'));
        expect(vm.enemy.name).toBe('The Tide-Gate');
        expect(vm.enemy.artKey).toBe('tide-gate');
    });

    it('shows TIDE 0 from the first turn, at low tide, with the VULNERABLE it leaves', () => {
        const s = fightAt('enemy-tide-gate');
        const chip = chipOf(s, 'enemy-counter-tide')!;
        expect(chip).toMatchObject({ intensity: 0, glyph: { label: 'Tide' }, caption: 'low tide: VULNERABLE 25%' });
        expect(effectChipA11y(chip)).toContain('rises each foe turn');
        expect(buildCombatViewModel(s).enemy.effects.some((e) => e.effectId === 'debuff_vulnerable')).toBe(true);
        expect(chipOf({ ...s, enemyRiders: { tide: 4 } }, 'enemy-counter-tide')!.caption).toBe('4 of 5');
    });
});

/**
 * The pre-fight commit gate must show the player's VITAE.
 *
 * The reveal prices the fight in the foe's numbers — its '120 / 120' and five
 * phases of damage aimed at the player — so the screen also prints
 * `vm.player.hp / vm.player.maxHp` beside the foe's, so this pins that the
 * view model carries the player pool the gate reads, separately from the
 * enemy's.
 */

import { describe, expect, it } from '@jest/globals';

import { rollEncounterDice } from '@mechanics';
import { buildCombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';

function encounterVm(health: number, maxHealth: number) {
    const { combat } = startRealFight(REAL_FIGHT_FIXTURE, {
        player: { level: 5, baseStats: { heart: 8, body: 8, mind: 8 }, health, maxHealth },
        seed: 16,
    });
    const s = rollEncounterDice(combat).state;
    return buildCombatViewModel(s);
}

describe('FE-025: the reveal has the player numbers it prints', () => {
    it('carries the player VITAE pool, not just the enemy one', () => {
        const vm = encounterVm(160, 160);
        expect(vm.player.hp).toBe(160);
        expect(vm.player.maxHp).toBe(160);
        expect(vm.enemy.maxHp).toBeGreaterThan(0);
    });

    it('tracks a hurt pilgrim rather than echoing the maximum', () => {
        const vm = encounterVm(37, 160);
        expect(vm.player.hp).toBe(37);
        expect(vm.player.maxHp).toBe(160);
        expect(vm.player.hp).not.toBe(vm.player.maxHp);
    });
});

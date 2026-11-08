/**
 * Legibility sweep — presenter coverage for the
 * mobile-side surfaces: discard-pile names, the projected-lethality readout
 * and the wall-math intent projection. The grey office is the fixture.
 */

import { describe, it, expect } from '@jest/globals';
import { rollEncounterDice } from '@mechanics';
import type { CombatEncounterState } from '@mechanics';

import { buildCombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { realFightFixture, startRealFight } from '@/test-utils/realFight';

// Any playable deck works — the grey office is the whole library.
const DECK = ['grey-strike', 'grey-ward', 'grey-word'];

function openState(): CombatEncounterState {
    const { combat } = startRealFight(realFightFixture({ level: 3, baseStats: { heart: 8, body: 8, mind: 8 }, knownCards: DECK }), { deck: DECK, seed: 7 });
    return rollEncounterDice(combat).state;
}

// The status kill-path foresight. The engine selector (`projectCombatOutcome`)
// has hermetic coverage in mechanics; this pins that the mobile presenter
// forwards it onto the enemy pane VM.
describe('Phase 2 — projected-lethality readout (spec 30)', () => {
    it('reads zero/hidden when the foe carries no DoT', () => {
        const vm = buildCombatViewModel(openState());
        expect(vm.enemy.pendingDot).toBe(0);
        expect(vm.enemy.roundsToKill).toBeNull();
        expect(vm.enemy.isLethalInFlight).toBe(false);
    });

    it('surfaces a pending tally for a DoT that will not finish the foe', () => {
        let s = openState();
        s = {
            ...s,
            enemy: {
                ...s.enemy, health: 300, maxHealth: 300,
                effects: [{ effectId: 'debuff_bleed', intensity: 1, remainingDuration: 2, appliedAt: 1, tier: 2 }],
            },
        };
        const vm = buildCombatViewModel(s);
        expect(vm.enemy.pendingDot).toBe(3);
        expect(vm.enemy.roundsToKill).toBeNull();
        expect(vm.enemy.isLethalInFlight).toBe(false);
    });

    it('flags isLethalInFlight + a rounds-to-kill countdown when stacked DoT alone clears remaining HP', () => {
        // Same fixture as mechanics' projected-lethality e2e suite (i3 d5
        // bleed vs 15 HP — decay-aware ticks 9, 6, 3; 2 expected ticks/round
        // clears 15 HP on round 1).
        let s = openState();
        s = {
            ...s,
            enemy: {
                ...s.enemy, health: 15, maxHealth: 15,
                effects: [{ effectId: 'debuff_bleed', intensity: 3, remainingDuration: 5, appliedAt: 1, tier: 2 }],
            },
        };
        const vm = buildCombatViewModel(s);
        expect(vm.enemy.pendingDot).toBe(18);
        expect(vm.enemy.roundsToKill).toBe(1);
        expect(vm.enemy.isLethalInFlight).toBe(true);
    });
});

describe('CombatViewModel.discardCards — discard-pile names (phase 28)', () => {
    it('resolves discard-pile ids to display names', () => {
        let s = openState();
        s = { ...s, discard: ['grey-strike', 'grey-word'] };
        const vm = buildCombatViewModel(s);
        expect(vm.discardCards).toEqual([
            { id: 'grey-strike', name: 'A Plain Blow' },
            { id: 'grey-word', name: 'A Plain Word' },
        ]);
    });
});

describe('CombatIntentVM.wallMath — the telegraph readout (phase 28)', () => {
    it('is present with sane defaults on a fresh encounter', () => {
        const vm = buildCombatViewModel(openState());
        expect(vm.enemy.intent.wallMath).toBeDefined();
        expect(typeof vm.enemy.intent.wallMath.willDeny).toBe('boolean');
        expect(vm.enemy.intent.wallMath.netDamage).toBeLessThanOrEqual(vm.enemy.intent.wallMath.projectedDamage);
    });
});

// T, 2026-11-08: the PHASE/ROUND/TURN line left the fight (the count was
// wrong for how phases work); the view-model no longer builds it.
describe('CombatViewModel — no HUD clock line', () => {
    it('carries no metaLine', () => {
        const vm = buildCombatViewModel(openState());
        expect('metaLine' in vm).toBe(false);
    });
});

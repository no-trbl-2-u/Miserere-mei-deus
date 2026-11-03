/**
 * Hermetic e2e: the Spare ending through `createGameStore`, from a fight that
 * actually fell to the store and the save it writes.
 *
 * Pins (A5, and the footgun `spare-table-unreached`): a spared foe pays no XP,
 * `spareWage` and one table roll that reaches the player and the save; it counts
 * as a won fight for quests, the defeat ledger and the node; and it grants the
 * foe's story flag and journal entry, which a plain victory does not.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { GreenJelly, FloatEye } from '../../Enemy/enemy.library';
import { chooseMercyCheck, rollMercyCheck, fightWage, spareWage } from '../../Combat/combat.mercy-check';
import { runHazardCombatAutoEncounter } from '../../test-utils/combat-autoplay';
import type { SpareReward } from '../../Combat/combat.spare-reward';
import { setSeed } from '../../Utils/rng';
import { createGameStore } from '../store';
import { nullAdapter } from '../persistence/null.adapter';
import type { PersistenceAdapter } from '../persistence/types';
import type { GameState } from '../types';

/** An adapter that keeps the last thing saved. */
function recordingAdapter(): PersistenceAdapter & { saved: () => GameState | null } {
    let last: GameState | null = null;
    return {
        ...nullAdapter,
        save(state: GameState) { last = state; },
        saved: () => last,
    };
}

/** Everything a reward's effect could have changed on the player. */
function looksPaid(before: GameState['player'], after: GameState['player'], reward: SpareReward, wage: number): void {
    switch (reward.kind) {
        case 'shillings':
            expect(after.currency).toBe(before.currency + wage + reward.amount);
            return;
        case 'consumable':
        case 'gear':
        case 'relic':
            expect(after.inventory.some(i => i.id === reward.item.id)).toBe(true);
            return;
        case 'upgrade':
        case 'transform':
            expect([...after.knownCards, ...(after.combatRewardCards ?? [])]).toContain(reward.toCardId);
            return;
    }
}

beforeEach(() => { setSeed(144); });

describe('the Spare ending', () => {
    it('pays no XP, the spare wage and one table roll that reaches the player', () => {
        for (let seed = 1; seed <= 40; seed++) {
            setSeed(seed);
            const store = createGameStore(nullAdapter);
            store.getState().startCombat(GreenJelly);
            const before = store.getState().player;
            const report = store.getState().endCombat('victory', undefined, { spared: true });

            expect(report.outcome).toBe('victory');
            expect(report.spared).toBe(true);
            expect(report.xpGained).toBe(0);
            expect(report.shillings).toBe(spareWage(GreenJelly.level));
            expect(report.spareReward).toBeDefined();
            const after = store.getState().player;
            expect(after.experience).toBe(before.experience);
            looksPaid(before, after, report.spareReward!, spareWage(GreenJelly.level));
        }
    });

    it('sizes the shillings result on the fight\'s own wage, not a level-1 wage', () => {
        // Seeded draws until the table lands on shillings; the amount is the
        // normal wage of this foe.
        let seen = 0;
        for (let seed = 1; seed <= 60; seed++) {
            setSeed(seed);
            const store = createGameStore(nullAdapter);
            store.getState().startCombat(GreenJelly);
            const reward = store.getState().endCombat('victory', undefined, { spared: true }).spareReward!;
            if (reward.kind === 'shillings') {
                seen++;
                expect(reward.amount).toBe(fightWage(GreenJelly.level));
            }
        }
        expect(seen).toBeGreaterThan(0);
    });

    it('reaches the save', () => {
        const adapter = recordingAdapter();
        const store = createGameStore(adapter);
        store.getState().startCombat(GreenJelly);
        const before = store.getState().player;
        const report = store.getState().endCombat('victory', undefined, { spared: true });
        const saved = adapter.saved()!;
        expect(saved.player.currency).toBe(store.getState().player.currency);
        looksPaid(before, saved.player, report.spareReward!, spareWage(GreenJelly.level));
    });

    it('grants the story flag and journal entry, once', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(GreenJelly);
        const first = store.getState().endCombat('victory', undefined, { spared: true });
        const flag = GreenJelly.spareStory!.flagSet!;

        expect(first.outcome).toBe('victory');
        expect(store.getState().flags).toContain(flag);
        expect(store.getState().codex.unlockedEntries).toContain(GreenJelly.journalEntry!.id);
        expect(first.journalEntryUnlocked).toEqual({
            id: GreenJelly.journalEntry!.id, title: GreenJelly.journalEntry!.title,
        });

        store.getState().startCombat(GreenJelly);
        const second = store.getState().endCombat('victory', undefined, { spared: true });
        expect(second.journalEntryUnlocked).toBeUndefined();
        expect(store.getState().flags.filter(f => f === flag)).toHaveLength(1);
    });

    it('marks the defeat ledger', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(GreenJelly);
        store.getState().endCombat('victory', undefined, { spared: true });
        expect(store.getState().codex.defeatedEnemies).toContain('green-jelly');
    });

    it('a plain victory, and a finish, still grant no flag and no journal entry', () => {
        for (const options of [undefined, { spared: false }]) {
            const store = createGameStore(nullAdapter);
            store.getState().startCombat(GreenJelly);
            const report = store.getState().endCombat('victory', undefined, options);
            expect(report.spared).toBeUndefined();
            expect(report.spareReward).toBeUndefined();
            expect(report.xpGained).toBe(GreenJelly.xpReward ?? 0);
            expect(report.shillings).toBe(fightWage(GreenJelly.level));
            expect(store.getState().flags).not.toContain(GreenJelly.spareStory!.flagSet!);
            expect(store.getState().codex.unlockedEntries).not.toContain(GreenJelly.journalEntry!.id);
        }
    });

    it('`spared` on any other outcome pays nothing of a Spare', () => {
        for (const outcome of ['defeat', 'flee'] as const) {
            const store = createGameStore(nullAdapter);
            store.getState().startCombat(FloatEye);
            const report = store.getState().endCombat(outcome, undefined, { spared: true });
            expect(report.spared).toBeUndefined();
            expect(report.spareReward).toBeUndefined();
        }
    });

    it('the reducer alone defaults a spared END_COMBAT to no XP and the spare wage', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(GreenJelly);
        const before = store.getState().player;
        store.getState().dispatch({ type: 'END_COMBAT', payload: { outcome: 'victory', spared: true } });
        const after = store.getState().player;
        expect(after.experience).toBe(before.experience);
        expect(after.currency).toBe(before.currency + spareWage(GreenJelly.level));
    });
});

describe('a fight that falls, end to end', () => {
    /** A fight the engine played until the foe, left with 1 VITAE, fell. */
    function fallen() {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(GreenJelly);
        const foe = { ...GreenJelly, health: 1, maxHealth: 1 };
        const player = { ...store.getState().player, knownCards: ['grey-strike', 'grey-strike', 'grey-strike'] };
        const { state: fight } = runHazardCombatAutoEncounter(player, foe, { seed: 7 });
        return { store, fight };
    }

    it('a hit, spared, pays the Spare ending through the store', () => {
        const { store, fight } = fallen();
        expect(fight.finalOutcome).toBe('victory');
        const answered = chooseMercyCheck(rollMercyCheck(fight, () => 0), 'spare');
        expect(answered.mercyCheck).toBe('spared');
        const report = store.getState().endCombat(answered.finalOutcome as 'victory', undefined, {
            spared: answered.mercyCheck === 'spared',
        });
        expect(report.xpGained).toBe(0);
        expect(report.shillings).toBe(spareWage(GreenJelly.level));
        expect(report.spareReward).toBeDefined();
    });

    it('a miss pays as a finish', () => {
        const { store, fight } = fallen();
        const rolled = rollMercyCheck(fight, () => 1);
        expect(rolled.mercyCheck).toBe('none');
        const report = store.getState().endCombat('victory');
        expect(report.xpGained).toBe(GreenJelly.xpReward ?? 0);
        expect(report.shillings).toBe(fightWage(GreenJelly.level));
        expect(report.spareReward).toBeUndefined();
    });
});

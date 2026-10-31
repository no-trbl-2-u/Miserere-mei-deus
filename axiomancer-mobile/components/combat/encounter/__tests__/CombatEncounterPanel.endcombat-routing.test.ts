/**
 * `applyHazardOutcome` routes rewards through the engine's real `endCombat`
 * reducer rather than hand-rolling XP/loot/quest-advancement itself. These
 * tests stage `state.currentEncounter` through a real fight (the
 * Breakwater's bw-w2, entered by `beginHazardEncounter`), or via
 * `startCombat` for an authored foe the mercy path needs, then assert `endCombat`'s full grant lands
 * live: quest kill-objective advancement + completion reward, and — on a
 * merciful win — the authored `friendshipReward` payload (flags, codex
 * unlock, faction deltas).
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
    createCharacter, initializeCombatEncounter, type CombatEncounterState, type CombatOutcome,
    ENEMY_REGISTRY, FIXTURE_QUEST, emptyQuestLog, startQuest, type Enemy,
} from '@mechanics';

import { applyHazardOutcome } from '@/components/combat/encounter/CombatEncounterPanel';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';

afterEach(() => {
    jest.restoreAllMocks();
});

/** The real bw-w2 fight, its final state dealt from the Gleaner's Due. */
function realFight() {
    return startRealFight(REAL_FIGHT_FIXTURE, {
        player: { level: 3, baseStats: { heart: 8, body: 8, mind: 8 } },
        deck: ['the-gleaners-due'],
        seed: 7,
    });
}

function openEncounter(enemy: Enemy): CombatEncounterState {
    const player = createCharacter({ name: 'Reaper', level: 3, baseStats: { heart: 8, body: 8, mind: 8 } });
    return initializeCombatEncounter(player, enemy, ['the-gleaners-due'], 7);
}

describe('applyHazardOutcome: routes through endCombat (phase 54)', () => {
    it('victory grants endCombat-derived XP and clears the staged encounter', () => {
        const { store, enemy, combat: finalState } = realFight();
        expect(store.getState().currentEncounter).not.toBeUndefined();

        const before = store.getState().player!.experience;

        applyHazardOutcome(store, 'victory' as CombatOutcome, finalState, enemy);

        expect(store.getState().currentEncounter).toBeUndefined();
        expect(store.getState().player!.experience).toBe(before + (enemy.xpReward ?? 0));
    });

    it('defeat routes through endCombat too (no XP, encounter still clears)', () => {
        const { store, enemy, combat: finalState } = realFight();

        const before = store.getState().player!.experience;

        applyHazardOutcome(store, 'defeat' as CombatOutcome, finalState, enemy);

        expect(store.getState().currentEncounter).toBeUndefined();
        expect(store.getState().player!.experience).toBe(before);
    });

    it('a merciful win maps to the reducer\'s friendship outcome and activates authored friendshipReward content', () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        // Green Jelly: friendshipReward carries items, xpBonus, flagSet
        // and journalEntry — real authored content, not a test
        // fixture, reached from live hazard combat.
        const greenJelly = ENEMY_REGISTRY['green-jelly'];
        store.getState().startCombat(greenJelly);
        const finalState = openEncounter(greenJelly);

        const xpBefore = store.getState().player!.experience;
        applyHazardOutcome(store, 'mercy' as CombatOutcome, finalState, greenJelly);

        const state = store.getState();
        expect(state.currentEncounter).toBeUndefined();
        expect(state.flags).toContain(greenJelly.friendshipReward!.flagSet);
        expect(state.codex.unlockedEntries).toContain(greenJelly.journalEntry!.id);
        // A befriend pays no XP: shillings or a potion.
        expect(state.player!.experience).toBe(xpBefore);
    });

    it('befriending a kill-objective target completes its quest and grants the quest reward', () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        const boss = ENEMY_REGISTRY['green-jelly'];
        // The fixture quest (no quest is authored), its objective
        // re-aimed at a live foe (objectives match on the enemy's display name).
        const authored = FIXTURE_QUEST;
        const startingQuest = {
            ...authored,
            objectives: [{ ...authored.objectives[0], type: 'kill' as const, target: boss.name, requiredCount: 1, currentCount: 0 }],
        };
        const reward = authored.reward as { kind?: string; amount?: number } | undefined;
        if (reward?.kind !== 'currency' || typeof reward.amount !== 'number') {
            throw new Error('the fixture quest no longer pays currency');
        }
        store.setState({ quests: startQuest(emptyQuestLog(), startingQuest) });
        store.getState().startCombat(boss);
        const finalState = openEncounter(boss);
        const currencyBefore = store.getState().player!.currency;

        // The merciful win must advance kill objectives too.
        applyHazardOutcome(store, 'mercy' as CombatOutcome, finalState, boss);

        const state = store.getState();
        expect(state.quests.completed).toContain(FIXTURE_QUEST.name);
        expect(state.player!.currency).toBe(currencyBefore + reward.amount);
        expect(state.flags).toContain(boss.friendshipReward!.flagSet);
    });
});

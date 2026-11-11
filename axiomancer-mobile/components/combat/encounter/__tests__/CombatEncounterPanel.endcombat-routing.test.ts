/**
 * `applyHazardOutcome` routes rewards through the engine's real `endCombat`
 * reducer rather than hand-rolling XP/loot/quest-advancement itself. These
 * tests stage `state.currentEncounter` through a real fight (the
 * Breakwater's bw-w2, entered by `beginHazardEncounter`), or via
 * `startCombat` for an authored foe a Spare needs, then assert `endCombat`'s full grant lands
 * live: quest kill-objective advancement + completion reward, and — for a
 * spared foe — its story flag and codex unlock.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
    createCharacter, experienceForLevel, initializeCombatEncounter, type CombatEncounterState, type CombatOutcome,
    ENEMY_REGISTRY, FIXTURE_QUEST, emptyQuestLog, fightWage, spareWage, startQuest, type Enemy,
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

describe('applyHazardOutcome: the mercy check', () => {
    it('a spared fight pays no XP and the spare wage, closes the draft and reaches the save', () => {
        const { store, enemy, combat } = realFight();
        const before = store.getState().player!;
        const paid = applyHazardOutcome(store, 'victory' as CombatOutcome, { ...combat, mercyCheck: 'spared' }, enemy).shillings;

        const after = store.getState();
        expect(paid).toBe(spareWage(enemy.level));
        expect(after.player!.experience).toBe(before.experience);
        expect(after.currentEncounter).toBeUndefined();
        expect(after.codex.defeatedEnemies).toContain('quay-crab');
        expect(after.combatReward).toMatchObject({ offers: [], claimed: true });
        expect(after.combatReward?.spare?.reward).toBeDefined();
    });

    it('a finished fight pays as any win, and leaves the draft open', () => {
        const { store, enemy, combat } = realFight();
        const before = store.getState().player!;
        const paid = applyHazardOutcome(store, 'victory' as CombatOutcome, { ...combat, mercyCheck: 'finished' }, enemy).shillings;

        expect(paid).toBe(fightWage(enemy.level));
        expect(store.getState().player!.experience).toBe(before.experience + (enemy.xpReward ?? 0));
        expect(store.getState().combatReward?.claimed).toBe(false);
        expect(store.getState().combatReward?.spare ?? null).toBeNull();
    });
});

describe('applyHazardOutcome: routes through endCombat (phase 54)', () => {
    it('victory grants endCombat-derived XP and clears the staged encounter', () => {
        const { store, enemy, combat: finalState } = realFight();
        expect(store.getState().currentEncounter).not.toBeUndefined();

        const before = store.getState().player!.experience;

        applyHazardOutcome(store, 'victory' as CombatOutcome, finalState, enemy);

        expect(store.getState().currentEncounter).toBeUndefined();
        expect(store.getState().player!.experience).toBe(before + (enemy.xpReward ?? 0));
    });

    it('victory returns the wage it paid, the number the summary prints', () => {
        const { store, enemy, combat: finalState } = realFight();
        const before = store.getState().player!.currency;

        const paid = applyHazardOutcome(store, 'victory' as CombatOutcome, finalState, enemy).shillings;

        expect(paid).toBe(3 * enemy.level);
        expect(store.getState().player!.currency).toBe(before + paid);
    });

    it('victory reports what it paid: XP gained, the experience and level before and after, the XP owed (FE1a)', () => {
        const { store, enemy, combat: finalState } = realFight();
        const before = store.getState().player!;

        const paid = applyHazardOutcome(store, 'victory' as CombatOutcome, finalState, enemy);

        const after = store.getState().player!;
        expect(paid.xpGained).toBe(after.experience - before.experience);
        expect(paid.xpGained).toBe(enemy.xpReward ?? 0);
        expect(paid).toMatchObject({
            experienceBefore: before.experience, experienceAfter: after.experience,
            levelBefore: before.level, levelAfter: after.level,
            xpToNext: experienceForLevel(after.level + 1) - after.experience,
        });
    });

    it('a level crossed shows in the record, after the level-ups', () => {
        const { store, enemy, combat: finalState } = realFight();
        // One XP short of the next level: the foe's XP crosses it.
        store.setState((s) => ({ player: { ...s.player!, experience: s.player!.experienceToNextLevel - 1 } }));
        const levelBefore = store.getState().player!.level;

        const paid = applyHazardOutcome(store, 'victory' as CombatOutcome, finalState, enemy);

        expect(paid.levelBefore).toBe(levelBefore);
        expect(paid.levelAfter).toBe(store.getState().player!.level);
        expect(paid.levelAfter).toBeGreaterThan(levelBefore);
    });

    it('defeat returns no wage', () => {
        const { store, enemy, combat: finalState } = realFight();
        expect(applyHazardOutcome(store, 'defeat' as CombatOutcome, finalState, enemy).shillings).toBe(0);
    });

    it('defeat routes through endCombat too (no XP, encounter still clears)', () => {
        const { store, enemy, combat: finalState } = realFight();

        const before = store.getState().player!.experience;

        applyHazardOutcome(store, 'defeat' as CombatOutcome, finalState, enemy);

        expect(store.getState().currentEncounter).toBeUndefined();
        expect(store.getState().player!.experience).toBe(before);
    });

    it('a foe spared at the check grants its authored story flag and journal entry, and no XP', () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        // Green Jelly: real authored content, not a test fixture.
        const greenJelly = ENEMY_REGISTRY['green-jelly'];
        store.getState().startCombat(greenJelly);
        const finalState = { ...openEncounter(greenJelly), mercyCheck: 'spared' as const };

        const xpBefore = store.getState().player!.experience;
        applyHazardOutcome(store, 'victory' as CombatOutcome, finalState, greenJelly);

        const state = store.getState();
        expect(state.currentEncounter).toBeUndefined();
        expect(state.flags).toContain(greenJelly.spareStory!.flagSet);
        expect(state.codex.unlockedEntries).toContain(greenJelly.journalEntry!.id);
        expect(state.player!.experience).toBe(xpBefore);
    });

    it('sparing a kill-objective target completes its quest and grants the quest reward', () => {
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
        const finalState = { ...openEncounter(boss), mercyCheck: 'spared' as const };
        const currencyBefore = store.getState().player!.currency;

        // A Spare must advance kill objectives too.
        applyHazardOutcome(store, 'victory' as CombatOutcome, finalState, boss);

        const state = store.getState();
        expect(state.quests.completed).toContain(FIXTURE_QUEST.name);
        expect(state.player!.currency).toBeGreaterThanOrEqual(currencyBefore + reward.amount + spareWage(boss.level));
        expect(state.flags).toContain(boss.spareStory!.flagSet);
    });
});

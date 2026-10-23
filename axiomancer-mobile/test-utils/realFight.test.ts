/**
 * CT1a: `startRealFight` reaches its fight through game state. The foe is
 * the encounter node's own (HP-scaled the way the live gate scales it) and
 * the deck is the save's, so no combat test needs a hand-built enemy.
 */

import { describe, expect, it } from '@jest/globals';
import { buildCombatDeck, selectIsInCombat } from '@mechanics';

import { ENCOUNTER_ENEMY_HP_MULTIPLIER, withScaledEnemyHp } from '@/state/actions';

import { arriveAtRealFight, REAL_BOSS_FIGHT_FIXTURE, REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';

describe('startRealFight', () => {
    it('arrives in the encounter node\'s combat prelude before the fight is entered', () => {
        const arrival = arriveAtRealFight();
        const state = arrival.store.getState();
        expect(state.event?.pending?.event.kind).toBe('encounter');
        expect(state.currentEncounter).toBeUndefined();
        expect(arrival.nodeEnemy.id).toBe(startRealFight().nodeEnemy.id);
    });

    it('stages the encounter node\'s foe on the store, scaled as the live gate scales it', () => {
        const fight = startRealFight();
        const state = fight.store.getState();
        expect(state.world.currentMap.currentNode).toBe('bw-2');
        expect(selectIsInCombat(state)).toBe(true);
        expect(state.event?.pending ?? null).toBeNull();
        expect(state.currentEncounter?.enemies[0]).toEqual(fight.enemy);
        expect(fight.enemy).toEqual(withScaledEnemyHp(fight.nodeEnemy, ENCOUNTER_ENEMY_HP_MULTIPLIER));
        expect(fight.combat.enemy.id).toBe(fight.nodeEnemy.id);
        expect(fight.combat.enemy.maxHealth).toBe(fight.enemy.maxHealth);
    });

    it('deals from the save\'s own deck when no deck is passed', () => {
        const fight = startRealFight();
        const state = fight.store.getState();
        const flags = (state as unknown as { flags?: string[] }).flags;
        const saveDeck = new Set(buildCombatDeck(state.player, flags));
        const dealt = [...fight.combat.hand.map((h) => h.cardId), ...fight.combat.drawPile];
        expect(dealt.length).toBeGreaterThan(0);
        for (const id of dealt) expect(saveDeck.has(id)).toBe(true);
    });

    it('is deterministic for one fixture and seed', () => {
        const a = startRealFight(REAL_FIGHT_FIXTURE, { seed: 11 });
        const b = startRealFight(REAL_FIGHT_FIXTURE, { seed: 11 });
        expect(b.enemy).toEqual(a.enemy);
        expect(b.combat.hand.map((h) => h.cardId)).toEqual(a.combat.hand.map((h) => h.cardId));
    });

    it('the boss fixture stages the door boss', () => {
        const fight = startRealFight(REAL_BOSS_FIGHT_FIXTURE);
        expect(fight.store.getState().world.currentMap.currentNode).toBe('bw-17');
        expect(fight.enemy.difficulty).toBe('boss');
        expect(fight.enemy.id).not.toBe(startRealFight().enemy.id);
    });

    it('throws when the fixture does not arrive at an encounter', () => {
        expect(() => startRealFight('apprentice-bw-rest')).toThrow(/did not arrive at an encounter/);
    });
});

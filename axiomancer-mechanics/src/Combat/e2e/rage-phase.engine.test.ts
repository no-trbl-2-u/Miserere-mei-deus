/**
 * Hermetic E2E — enemy rage-mode threat phase.
 *
 * A generated (unauthored) enemy's threat sequence now carries a 4th,
 * locked "rage" phase — harder-hitting AND self-healing — that the fight
 * only reaches once it survives past `RAGE_UNLOCK_ROUND`. This is a
 * discrete, qualitative escalation layered on top of THE CLOCK's continuous
 * numeric damage ramp; authored (hand-tuned) sequences are untouched.
 *
 * Pure math + direct state construction only; no disk / network / TTY.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../../Enemy/types';
import { FloatEye, GreenJelly } from '../../Enemy/enemy.library';
import { ENEMY_DECKS, deckCardIds } from '../combat.enemy-decks';
import { deepClone } from '../../Utils';
import {
    initializeCombatEncounter, processBetweenPhases, resolveThreatPhase,
} from '../combat.engine';
import {
    generateDefaultThreatSequence, getThreatSequence,
    RAGE_UNLOCK_ROUND,
} from '../combat.threat';
import type { CombatThreatPhase } from '../combat.encounter.types';

function makePlayer(): Character {
    const p = deepClone(Player);
    p.knownCards = [];
    p.baseStats = { heart: 8, body: 8, mind: 8 };
    p.health = 200;
    p.maxHealth = 200;
    return p;
}

/** A generated-sequence enemy — id deliberately absent from AUTHORED_THREAT_SEQUENCES. */
function makeEnemy(hp: number, stance: 'heart' | 'body' | 'mind' = 'body'): Enemy {
    // The Float-Eye's body, without its HP phases (a phases foe skips the generator).
    const e: Enemy = { ...deepClone(FloatEye), phases: undefined };
    e.id = 'enemy-rage-test-dummy';
    e.health = hp;
    e.maxHealth = hp;
    e.effects = [];
    e.baseStats = {
        heart: stance === 'heart' ? 6 : 2,
        body: stance === 'body' ? 6 : 2,
        mind: stance === 'mind' ? 6 : 2,
    };
    return e;
}

describe('Phase 3 — generateDefaultThreatSequence appends a locked rage phase', () => {
    it('the 4th phase is the true final phase, locked at RAGE_UNLOCK_ROUND', () => {
        const seq = generateDefaultThreatSequence(makeEnemy(500));
        expect(seq).toHaveLength(4);
        expect(seq.slice(0, 3).every(p => p.isFinalPhase === false)).toBe(true);
        expect(seq[3].isFinalPhase).toBe(true);
        expect(seq[3].unlockAfterRound).toBe(RAGE_UNLOCK_ROUND);
        expect(seq.slice(0, 3).every(p => p.unlockAfterRound === undefined)).toBe(true);
    });

    it('the rage phase carries both damage and a self-heal (the combo telegraph)', () => {
        const seq = generateDefaultThreatSequence(makeEnemy(500));
        const rage = seq[3];
        expect(rage.threatAction.effects.some(e => (e.damage ?? 0) > 0)).toBe(true);
        expect(rage.threatAction.effects.some(e => (e.enemyHeal ?? 0) > 0)).toBe(true);
        expect(rage.intentType).toBe('combo');
    });

    it('an authored enemy (the Green Jelly) is untouched — no phase is rage-gated', () => {
        // Its deck's later cards carry their derived tier gates (round-keyed
        // deck tiers; its tier 3 opens on round 6, the rage round by
        // coincidence); nothing is appended.
        const seq = getThreatSequence(GreenJelly);
        expect(seq).toHaveLength(deckCardIds(ENEMY_DECKS['enemy-green-jelly']!).length);
        expect(seq.some(p => p.threatAction.description.includes('loses patience'))).toBe(false);
    });

    it('a foe with HP phases (the Float-Eye) gets no generated or rage phase', () => {
        const seq = getThreatSequence(FloatEye);
        expect(seq.every(p => p.enemyMove !== undefined)).toBe(true);
        expect(seq.every(p => p.unlockAfterRound === undefined)).toBe(true);
    });
});

describe('Phase 3 — processBetweenPhases holds the pointer until the round unlocks', () => {
    it('stays at the last pre-rage phase one round before the threshold', () => {
        const base = initializeCombatEncounter(makePlayer(), makeEnemy(1000), undefined, 3);
        const state = { ...base, currentPhaseIndex: 2, round: RAGE_UNLOCK_ROUND - 2 };
        const result = processBetweenPhases(state);
        expect(result.state.currentPhaseIndex).toBe(2);
    });

    it('advances into the rage phase exactly at the threshold round', () => {
        const base = initializeCombatEncounter(makePlayer(), makeEnemy(1000), undefined, 3);
        const state = { ...base, currentPhaseIndex: 2, round: RAGE_UNLOCK_ROUND - 1 };
        const result = processBetweenPhases(state);
        expect(result.state.currentPhaseIndex).toBe(3);
    });

    it('loops at the rage phase once reached (array-length cap, same as any final phase)', () => {
        const base = initializeCombatEncounter(makePlayer(), makeEnemy(1000), undefined, 3);
        const state = { ...base, currentPhaseIndex: 3, round: RAGE_UNLOCK_ROUND + 5 };
        const result = processBetweenPhases(state);
        expect(result.state.currentPhaseIndex).toBe(3);
    });

    it('resolveThreatPhase fires both the damage and the self-heal when pinned at the rage phase', () => {
        const base = initializeCombatEncounter(makePlayer(), makeEnemy(1000), undefined, 3);
        // Damaged below max so the self-heal has room to actually land.
        const damagedEnemy = { ...base.enemy, health: base.enemy.maxHealth - 200 };
        const state = { ...base, enemy: damagedEnemy, currentPhaseIndex: 3, round: RAGE_UNLOCK_ROUND };
        const result = resolveThreatPhase(state);
        expect(result.state.player.health).toBeLessThan(state.player.health);
        expect(result.state.enemy.health).toBeGreaterThan(state.enemy.health);
    });
});

describe('Phase 3 — an explicit enemy.threatSequence override threads unlockAfterRound through', () => {
    it('a gated phase in an explicit override keeps its unlockAfterRound (future authored rage content)', () => {
        const enemy = makeEnemy(500) as Enemy & { threatSequence?: CombatThreatPhase[] };
        enemy.threatSequence = [
            { index: 1, threatAction: { description: 'opens with a jab', effects: [{ damage: 5 }] }, isFinalPhase: false },
            { index: 2, threatAction: { description: 'turns feral', effects: [{ damage: 20 }] }, isFinalPhase: true, unlockAfterRound: 4 },
        ];
        const seq = getThreatSequence(enemy);
        expect(seq[0].unlockAfterRound).toBeUndefined();
        expect(seq[1].unlockAfterRound).toBe(4);
    });
});

/**
 * Hazard puzzle outcome — the formula cases on both routes and an engine claim of a failed and a cleared puzzle through the
 * reducer, the item grant and the scar flag.
 */

import { describe, expect, it } from 'vitest';

import { rollCacheReward } from '../../../../Items/cache-reward';
import { claimHazardPuzzleOutcome, HAZARD_SCAR_FLAG_PREFIX } from '../../../../Game/hazard-puzzle.claim';
import { createNewGameState, gameReducer } from '../../../../Game/game.reducer';
import type { GameState } from '../../../../Game/types';
import { HAZARD_TUNING } from '../../hazard.tuning';
import { hazardPuzzleOutcome, type HazardPuzzleOutcome } from '../hazard-puzzle.outcome';
import { confirmHazardPuzzle, createHazardPuzzleSession, playHazardPuzzleMoves } from '../hazard-puzzle.session';
import { HAZARD_PUZZLE_FAILURE, HAZARD_PUZZLE_REWARDS } from '../hazard-puzzle.tuning';
import type { HazardPuzzleMove } from '../hazard-puzzle.types';
import { DRAW_ONLY_LAYOUT } from './hazard-puzzle.layouts.mock';

function outcome(route: 'safe' | 'risk', p: number, playerLevel = 1): HazardPuzzleOutcome {
    return hazardPuzzleOutcome({ route, result: { p }, playerLevel, region: 'lantern-deep', seed: 7 });
}

describe('tuning', () => {
    it('holds the brief numbers and reuses the live purses and scar', () => {
        expect(HAZARD_PUZZLE_REWARDS.xpPerLevel).toBe(10);
        expect(HAZARD_PUZZLE_REWARDS.completionXpBonus).toBe(0.5);
        expect(HAZARD_PUZZLE_REWARDS.consumableTier).toBe('modest');
        expect(HAZARD_PUZZLE_REWARDS.purse).toEqual({ safe: 12, risk: 32 });
        expect(HAZARD_PUZZLE_REWARDS.purse.safe).toBe(HAZARD_TUNING.rewards.shillings);
        expect(HAZARD_PUZZLE_REWARDS.purse.risk).toBe(HAZARD_TUNING.rewards.riskShillings);
        expect(HAZARD_PUZZLE_FAILURE.maxVitaeLoss).toEqual({ safe: 6, risk: 12 });
        expect(HAZARD_PUZZLE_FAILURE.scarBelow).toBe(0.5);
        expect(HAZARD_PUZZLE_FAILURE.scar).toBe(HAZARD_TUNING.rewards.maxhpScar);
    });
});

describe('hazardPuzzleOutcome (A11)', () => {
    // [p, VITAE lost, scar, purse, completed]; loss = round(max × (1 − p)).
    const SAFE: Array<[number, number, number, number, boolean]> = [
        [0, 6, 5, 0, false], // round(6 × 1)
        [0.49, 3, 5, 0, false], // round(3.06)
        [0.5, 3, 0, 0, false], // round(3); no scar at half
        [0.99, 0, 0, 0, false], // round(0.06)
        [1, 0, 0, 12, true],
    ];
    const RISK: Array<[number, number, number, number, boolean]> = [
        [0, 12, 5, 0, false],
        [0.49, 6, 5, 0, false], // round(6.12)
        [0.5, 6, 0, 0, false],
        [0.99, 0, 0, 0, false], // round(0.12)
        [1, 0, 0, 32, true],
    ];

    for (const [route, rows] of [['safe', SAFE], ['risk', RISK]] as const) {
        for (const [p, loss, scar, purse, completed] of rows) {
            it(`${route} p = ${p}: loses ${loss} VITAE, scar ${scar}, purse ${purse}`, () => {
                const o = outcome(route, p);
                expect(o.vitaeLoss).toBe(loss);
                expect(o.scar).toBe(scar);
                expect(o.shillings).toBe(purse);
                expect(o.completed).toBe(completed);
                expect(o.xp).toBe(completed ? 15 : 10);
            });
        }
    }

    it('rounds an exact half up even when value / goal leaves float noise', () => {
        // 12 × (1 − 23/24) is 0.5, but in floats 0.49999999999999956.
        expect(outcome('risk', 23 / 24).vitaeLoss).toBe(1);
        // 6 × (1 − 5/12) is 3.5, but in floats 3.4999999999999996.
        expect(outcome('safe', 5 / 12).vitaeLoss).toBe(4);
    });

    it('XP is 10 per level, +50% on a full completion', () => {
        expect(outcome('safe', 0.3, 4).xp).toBe(40);
        expect(outcome('risk', 1, 4).xp).toBe(60);
        expect(outcome('safe', 1, 3).xp).toBe(45);
    });

    it('always pays one modest consumable roll and no material, short or not', () => {
        const roll = rollCacheReward({ playerLevel: 1, seed: 7, tier: 'modest' });
        for (const p of [0, 0.5, 1]) {
            const o = outcome('safe', p);
            expect(o.items).toEqual(roll);
            expect(o.items.some((i) => i.category === 'material')).toBe(false);
        }
    });

    it('is pure: the same context gives the same outcome', () => {
        expect(outcome('risk', 0.3)).toEqual(outcome('risk', 0.3));
    });

    it('clamps p into [0, 1]', () => {
        expect(outcome('safe', 1.4).p).toBe(1);
        expect(outcome('safe', -0.2)).toMatchObject({ p: 0, vitaeLoss: 6, scar: 5 });
    });
});

describe('claimHazardPuzzleOutcome (A12)', () => {
    // DRAW_ONLY_LAYOUT: footing applied unpowered draws grip; footing + grip clears.
    const SOLUTION: HazardPuzzleMove[] = [
        { type: 'stage', uid: 'c1' },
        { type: 'apply', uid: 'c1' },
        { type: 'stage', uid: 'c2' },
    ];

    function fresh(): GameState {
        return createNewGameState();
    }

    function stock(state: GameState, id: string): number {
        return state.player.inventory.filter((i) => i.id === id).reduce((n, i) => n + ('quantity' in i ? i.quantity : 1), 0);
    }

    it('a cleared risk puzzle pays XP, the consumables and the purse, and costs nothing', () => {
        const session = confirmHazardPuzzle(playHazardPuzzleMoves(createHazardPuzzleSession(DRAW_ONLY_LAYOUT, 'risk'), SOLUTION));
        expect(session.result?.cleared).toBe(true);
        const before = fresh();
        const o = hazardPuzzleOutcome({
            route: 'risk',
            result: session.result!,
            playerLevel: before.player.level,
            region: 'breakwater',
            seed: 3,
        });
        const { state, vitaeLost, scarApplied, lethal } = claimHazardPuzzleOutcome(before, o);

        expect(state.player.experience).toBe(before.player.experience + 15);
        expect(state.player.currency).toBe(before.player.currency + 32);
        for (const item of o.items) {
            expect(stock(state, item.id), item.id).toBe(o.items.filter((i) => i.id === item.id).length);
        }
        expect(o.items.some((i) => i.category === 'material')).toBe(false);
        expect(state.player.health).toBe(before.player.health);
        expect(state.player.maxHealth).toBe(before.player.maxHealth);
        expect(state.flags).toEqual(before.flags);
        expect({ vitaeLost, scarApplied, lethal }).toEqual({ vitaeLost: 0, scarApplied: 0, lethal: false });
    });

    it('a failed safe puzzle still pays XP and loot, loses VITAE and banks a scar a rest can read', () => {
        const session = confirmHazardPuzzle(createHazardPuzzleSession(DRAW_ONLY_LAYOUT, 'safe'));
        expect(session.result).toMatchObject({ p: 0, cleared: false });
        const before = fresh();
        const o = hazardPuzzleOutcome({
            route: 'safe',
            result: session.result!,
            playerLevel: before.player.level,
            region: 'breakwater',
            seed: 3,
        });
        const { state, vitaeLost, scarApplied, lethal } = claimHazardPuzzleOutcome(before, o);

        expect(state.player.experience).toBe(before.player.experience + 10);
        expect(state.player.currency).toBe(before.player.currency);
        expect(state.player.inventory.length).toBeGreaterThan(before.player.inventory.length);
        expect(state.player.maxHealth).toBe(before.player.maxHealth - 5);
        expect(state.player.health).toBe(Math.min(before.player.health - 6, before.player.maxHealth - 5));
        expect(state.flags).toEqual([...before.flags, `${HAZARD_SCAR_FLAG_PREFIX}5`]);
        expect({ vitaeLost, scarApplied, lethal }).toEqual({ vitaeLost: 6, scarApplied: 5, lethal: false });
    });

    it('the XP goes through the reducer, so the level-up fires on it', () => {
        const before = fresh();
        const nearLevel: GameState = {
            ...before,
            player: { ...before.player, experience: before.player.experienceToNextLevel - 5 },
        };
        const o = hazardPuzzleOutcome({ route: 'safe', result: { p: 1 }, playerLevel: 1, region: 'breakwater', seed: 1 });
        const { state } = claimHazardPuzzleOutcome(nearLevel, o);
        expect(state.player.experience).toBeGreaterThanOrEqual(state.player.experienceToNextLevel);
        expect(gameReducer(state, { type: 'LEVEL_UP' }).player.level).toBe(2);
    });

    it('never drops VITAE below 1 or max VITAE below 5, and reports a lethal loss', () => {
        const before = fresh();
        const frail: GameState = { ...before, player: { ...before.player, health: 4, maxHealth: 7 } };
        const o = hazardPuzzleOutcome({ route: 'risk', result: { p: 0 }, playerLevel: 1, region: 'breakwater', seed: 1 });
        const { state, vitaeLost, scarApplied, lethal } = claimHazardPuzzleOutcome(frail, o);
        expect(state.player.health).toBe(1);
        expect(state.player.maxHealth).toBe(5);
        expect({ vitaeLost, scarApplied, lethal }).toEqual({ vitaeLost: 3, scarApplied: 2, lethal: true });
        expect(state.flags).toContain(`${HAZARD_SCAR_FLAG_PREFIX}2`);
    });
});

describe('GRANT_XP', () => {
    it('adds whole, non-negative XP and nothing else', () => {
        const s = createNewGameState();
        expect(gameReducer(s, { type: 'GRANT_XP', payload: { amount: 12.7 } }).player.experience).toBe(s.player.experience + 12);
        expect(gameReducer(s, { type: 'GRANT_XP', payload: { amount: -4 } })).toBe(s);
        expect(gameReducer(s, { type: 'GRANT_XP', payload: { amount: 0 } })).toBe(s);
    });
});

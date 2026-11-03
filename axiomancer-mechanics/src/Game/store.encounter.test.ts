/**
 * Store integration for encounter rewards.
 *
 * Verifies the Encounter ↔ store contract:
 *   - startCombat accepts Enemy | Encounter (back-compat).
 *   - endCombat grants XP and shillings only on victory.
 *   - Defeat / flee outcomes don't leak grants.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createGameStore } from './store';
import { nullAdapter } from './persistence/null.adapter';
import { Player } from '../Character/characters.mock';
import { FloatEye, DeathBeholder } from '../Enemy/enemy.library';
import { Encounter } from '../World/types';

afterEach(() => vi.restoreAllMocks());

describe('store.startCombat — accepts Enemy or Encounter', () => {
    it('back-compat: bare Enemy stages an encounter', () => {
        const store = createGameStore(nullAdapter, { player: Player });
        store.getState().startCombat(FloatEye);
        const encounter = store.getState().currentEncounter!;
        expect(encounter.enemies[0]!.id).toBe(FloatEye.id);
    });

    it('Encounter: stages the first enemy of the list', () => {
        const enc: Encounter = { enemies: [DeathBeholder], origin: 'test:bw-w1' };
        const store = createGameStore(nullAdapter, { player: Player });
        store.getState().startCombat(enc);
        expect(store.getState().currentEncounter!.enemies[0]!.id).toBe(DeathBeholder.id);
    });

    it('throws for an empty encounter', () => {
        const store = createGameStore(nullAdapter, { player: Player });
        expect(() => store.getState().startCombat({ enemies: [] })).toThrow(/no enemies/);
    });
});

describe('store.endCombat — grants XP + shillings on victory', () => {
    it('victory grants xpReward and the wage, and no loot', () => {
        const store = createGameStore(nullAdapter, { player: Player });
        store.getState().startCombat(FloatEye);

        // Combat resolution lives outside the store; report the victory outcome.
        const report = store.getState().endCombat('victory');
        expect(report.outcome).toBe('victory');
        expect(report.xpGained).toBe(FloatEye.xpReward);
        expect(report.shillings).toBe(3 * FloatEye.level);
        expect(report.loot).toEqual([]);

        const player = store.getState().player;
        expect(player.experience).toBe(Player.experience + FloatEye.xpReward!);
        expect(player.currency).toBe(Player.currency + 3 * FloatEye.level);
        expect(player.inventory).toEqual(Player.inventory);
    });

    it('defeat grants nothing', () => {
        const store = createGameStore(nullAdapter, { player: Player });
        store.getState().startCombat(FloatEye);

        const report = store.getState().endCombat('defeat');
        expect(report.outcome).toBe('defeat');
        expect(report.xpGained).toBe(0);
        expect(report.loot).toEqual([]);
    });

    it('flee (combat ended without KO) grants nothing', () => {
        const store = createGameStore(nullAdapter, { player: Player });
        store.getState().startCombat(FloatEye);

        // Walking away from a live encounter resolves as flee.
        const report = store.getState().endCombat('flee');
        expect(report.outcome).toBe('flee');
        expect(report.xpGained).toBe(0);
        expect(report.shillings).toBe(0);
    });
});

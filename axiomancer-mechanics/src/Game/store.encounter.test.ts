/**
 * Store integration for encounter rewards.
 *
 * Verifies the Encounter ↔ store contract:
 *   - startCombat accepts Enemy | Encounter (back-compat).
 *   - endCombat grants XP + loot only on victory.
 *   - Loot drops merge into existing inventory stacks.
 *   - Defeat / flee outcomes don't leak loot.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createGameStore } from './store';
import { nullAdapter } from './persistence/null.adapter';
import { Player } from '../Character/characters.mock';
import { FloatEye, DeathBeholder } from '../Enemy/enemy.library';
import { Encounter } from '../World/types';
import { Item } from '../Items/types';
import { mockSequentialRng } from '../test-utils/rng';

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

describe('store.endCombat — grants XP + loot on victory', () => {
    it('victory grants xpReward and adds rolled loot to inventory', () => {
        // Fix the RNG so the loot table always lands on a non-null bucket.
        // FloatEye's table: [none(70), minor-healing-potion(25), healing-potion(5)].
        // A roll of 0.8 lands in the second (minor-healing-potion) bucket.
        mockSequentialRng(0.8);

        const store = createGameStore(nullAdapter, { player: Player });
        store.getState().startCombat(FloatEye);

        // Combat resolution lives outside the store; report the victory outcome.
        const report = store.getState().endCombat('victory');
        expect(report.outcome).toBe('victory');
        expect(report.xpGained).toBe(FloatEye.xpReward);
        expect(report.loot.length).toBeGreaterThan(0);

        // Player got the XP and the item.
        const player = store.getState().player;
        expect(player.experience).toBe(Player.experience + FloatEye.xpReward!);
        const got = player.inventory.find(i => i.id === 'minor-healing-potion');
        expect(got).toBeDefined();
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
    });

    it('victory loot stacks into an existing inventory entry', () => {
        mockSequentialRng(0.8);

        const seededInventory: Item[] = [
            { id: 'minor-healing-potion', name: 'Minor Healing Potion',
              description: 'x', category: 'consumable', quantity: 2,
              healAmount: 10 },
        ];
        const store = createGameStore(nullAdapter, {
            player: { ...Player, inventory: seededInventory },
        });

        store.getState().startCombat(FloatEye);
        store.getState().endCombat('victory');

        const stack = store.getState().player.inventory.find(i => i.id === 'minor-healing-potion');
        expect(stack && 'quantity' in stack ? stack.quantity : 0).toBe(3);
        // No duplicate entry.
        expect(
            store.getState().player.inventory.filter(i => i.id === 'minor-healing-potion'),
        ).toHaveLength(1);
    });
});

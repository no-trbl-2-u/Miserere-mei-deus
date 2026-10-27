/**
 * Hermetic e2e — ActiveEffect.sourceId attribution.
 *
 * Pins the convention that every applied effect carries a sourceId
 * pointing back to the agent that caused it: player.id on the card
 * path, actor.id on the proc path (Character | Enemy), never from
 * equipment (equipment applies no effects), and undefined for
 * environmental hazards.
 *
 * The unit-level coverage of `applyEffect`'s sourceId plumbing lives
 * in `src/Effects/e2e/effects.engine.test.ts`. This file drives the
 * field through the public surfaces a consumer actually touches.
 */

import { afterEach, describe, it, expect, vi } from 'vitest';
import { mockSequentialRng } from '../../test-utils/rng';
import { createCharacter } from '../../Character';
import { createEnemy } from '../../Enemy';
import type { CombatState } from '../../Combat/types';
import { executeCard } from '../../Cards/card.engine';
import type { Card } from '../../Cards/types';
const combatState = (player: CombatState['player'], enemy: CombatState['enemy']): CombatState => ({
    round: 1, player, enemy,
});

afterEach(() => vi.restoreAllMocks());

const lookup = (card: Card) => (id: string): Card | undefined =>
    id === card.id ? card : undefined;

const debuffCard: Card = {
    id: 'sk_doubt',
    name: 'Sow Doubt',
    color: 'mind',
    description: 'Plants a seed of doubt.',
    tier: 1,
    rank: 1,
    cardType: 'spell',
    targetType: 'enemy',
    combatEffects: [{ effectId: 'debuff_poison', appliedTo: 'opponent' }],
};

const buffCard: Card = {
    id: 'sk_resolve',
    name: 'Self-Resolve',
    color: 'heart',
    description: 'A heartening certainty.',
    tier: 1,
    rank: 1,
    cardType: 'spell',
    targetType: 'self',
    combatEffects: [{ effectId: 'debuff_mark', appliedTo: 'self' }],
};

function fixturePlayer() {
    return createCharacter({
        id: 'char-player-shopper',
        name: 'P',
        level: 1,
        baseStats: { heart: 4, body: 6, mind: 4 },
        knownCards: [debuffCard.id, buffCard.id],
    });
}

function fixtureEnemy() {
    return createEnemy({
        id: 'enemy-rat-7',
        name: 'Rat',
        description: 'd',
        level: 1,
        baseStats: { heart: 3, body: 3, mind: 3 },
        mapName: 'breakwater',
        logic: 'random',
    });
}

describe('Phase 38 — player card applies debuff onto enemy', () => {
    it('enemy effect carries sourceId === player.id', () => {
        mockSequentialRng(0.05);
        const player = fixturePlayer();
        const enemy = fixtureEnemy();
        const base = combatState(player, enemy);
        const state = base;

        const { state: next } = executeCard(state, debuffCard.id, lookup(debuffCard));

        const applied = next.enemy.effects.find(e => e.effectId === 'debuff_poison');
        expect(applied).toBeDefined();
        expect(applied!.sourceId).toBe('char-player-shopper');
    });
});

describe('Phase 38 — player card applies buff onto self', () => {
    it('player effect carries sourceId === player.id', () => {
        mockSequentialRng(0.5);
        const player = fixturePlayer();
        const enemy = fixtureEnemy();
        const base = combatState(player, enemy);
        const state = base;

        const { state: next } = executeCard(state, buffCard.id, lookup(buffCard));

        const applied = next.player.effects.find(e => e.effectId === 'debuff_mark');
        expect(applied).toBeDefined();
        expect(applied!.sourceId).toBe('char-player-shopper');
    });
});

describe('Phase 38 — sourceId round-trips through JSON serialization (save/load)', () => {
    it('preserves the field unchanged across JSON.stringify → JSON.parse', () => {
        mockSequentialRng(0.05);
        const player = fixturePlayer();
        const enemy = fixtureEnemy();
        const base = combatState(player, enemy);
        const state = base;
        const { state: applied } = executeCard(state, debuffCard.id, lookup(debuffCard));

        const serialized = JSON.stringify(applied);
        const restored = JSON.parse(serialized);

        const before = applied.enemy.effects.find((e: { effectId: string }) => e.effectId === 'debuff_poison');
        const after = restored.enemy.effects.find((e: { effectId: string }) => e.effectId === 'debuff_poison');
        expect(before).toBeDefined();
        expect(after).toBeDefined();
        expect(after.sourceId).toBe(before!.sourceId);
        expect(after.sourceId).toBe('char-player-shopper');
    });
});

describe('Phase 20 — equipment applies no effect, so equipment never sources an ActiveEffect', () => {
    it('equipping an item with passiveEffects adds no ActiveEffect (no sourceId leak from equipment)', async () => {
        const { equipItem } = await import('../../Character/equipment.reducer');
        const player = fixturePlayer();
        const passiveEquipment = {
            id: 'eq_regen_band',
            name: 'Regen Band',
            description: 'Ticks heal each round.',
            category: 'equipment' as const,
            slot: 'relic' as const,
            tier: 1,
            rarity: 'common' as const,
            requiredLevel: 1,
            passiveEffects: ['debuff_mark'],
        };

        const equipped = equipItem(player, passiveEquipment);
        // Equipment is stat-only; no effect (and thus no sourceId) is added.
        expect(equipped.effects.some(e => e.sourceId === 'eq_regen_band')).toBe(false);
        expect(equipped.effects.some(e => e.effectId === 'debuff_mark')).toBe(false);
    });
});

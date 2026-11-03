/**
 * The Spare table: what a spared foe pays, rolled and applied.
 *
 * Pins: each result lands near its weight; each result reaches the player
 * through the reducer; a transform never yields a grey starter, a Curse or an
 * upgraded copy; a result with nothing to give pays the extra shillings.
 */

import { describe, it, expect } from 'vitest';

import { rollSpareReward, transformResultPool, type SpareReward, type SpareResultKind } from './combat.spare-reward';
import { MERCY_TUNING, fightWage, spareWage } from './combat.mercy-check';
import { createNewGameState, gameReducer } from '../Game/game.reducer';
import { getCardById } from '../Cards/cards.library';
import { GREY_LANE } from '../Cards/card.lanes';
import { equipmentLibrary, EQUIPMENT_LANE } from '../Items/equipment.library';
import { relicLibrary } from '../Items/relic.library';
import type { Character } from '../Character/types';

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

/** An rng that returns `values` in order, then 0. */
function scripted(...values: number[]): () => number {
    let i = 0;
    return () => values[i++] ?? 0;
}

function chosen(): { state: ReturnType<typeof createNewGameState>; player: Character } {
    const state = createNewGameState({ characterId: 'the-chosen' });
    return { state, player: state.player };
}

/** Draws that land on each table result (weights 30/30/15/10/10/5). */
const DRAW: Record<SpareResultKind, number> = {
    shillings: 0.1, consumable: 0.4, upgrade: 0.7, transform: 0.8, gear: 0.9, relic: 0.97,
};

describe('the Spare wage', () => {
    it('is 1.5 x the normal wage, rounded up', () => {
        expect(fightWage(5)).toBe(15);
        expect(spareWage(5)).toBe(23);
        expect(spareWage(1)).toBe(5);
    });
});

describe('the weights', () => {
    it('sum to 100 and every result lands near its weight over many seeds', () => {
        const weights = MERCY_TUNING.spareTable;
        expect(Object.values(weights).reduce((a, b) => a + b, 0)).toBe(100);
        const { player } = chosen();
        const rolls = 20000;
        const rng = seededRng(7);
        const counts: Record<string, number> = {};
        for (let i = 0; i < rolls; i++) {
            const { kind } = rollSpareReward(player, rng, 15);
            counts[kind] = (counts[kind] ?? 0) + 1;
        }
        for (const [kind, weight] of Object.entries(weights)) {
            expect(Math.abs(((counts[kind] ?? 0) / rolls) * 100 - weight)).toBeLessThan(1.5);
        }
    });
});

describe('each result reaches the player through the reducer', () => {
    function apply(kind: SpareResultKind, rngTail: number[] = [0]) {
        const { state, player } = chosen();
        const reward = rollSpareReward(player, scripted(DRAW[kind], ...rngTail), 15);
        const next = gameReducer(state, { type: 'APPLY_SPARE_REWARD', payload: { reward } }).player;
        return { reward, before: player, after: next };
    }

    it('shillings pay a further 1 x the normal wage', () => {
        const { reward, before, after } = apply('shillings');
        expect(reward).toEqual({ kind: 'shillings', amount: 15 });
        expect(after.currency).toBe(before.currency + 15);
    });

    it('the consumable is a minor healing potion in the satchel', () => {
        const { reward, before, after } = apply('consumable');
        expect(reward.kind).toBe('consumable');
        const held = (c: Character) => c.inventory.find(i => i.id === 'minor-healing-potion');
        expect((held(after) as { quantity: number }).quantity).toBe(((held(before) as { quantity: number } | undefined)?.quantity ?? 0) + 1);
    });

    it('an upgrade swaps one owned copy for its next upgrade', () => {
        const { reward, before, after } = apply('upgrade');
        if (reward.kind !== 'upgrade') throw new Error(`expected an upgrade, got ${reward.kind}`);
        expect(reward.toCardId).toBe(`${reward.fromCardId}+`);
        const count = (c: Character, id: string) => [...c.knownCards, ...(c.combatRewardCards ?? [])].filter(x => x === id).length;
        expect(count(after, reward.fromCardId)).toBe(count(before, reward.fromCardId) - 1);
        expect(count(after, reward.toCardId)).toBe(count(before, reward.toCardId) + 1);
    });

    it('a transform replaces one owned copy and the deck keeps its size', () => {
        const { reward, before, after } = apply('transform');
        if (reward.kind !== 'transform') throw new Error(`expected a transform, got ${reward.kind}`);
        const all = (c: Character) => [...c.knownCards, ...(c.combatRewardCards ?? [])];
        expect(all(after)).toHaveLength(all(before).length);
        expect(all(after)).toContain(reward.toCardId);
    });

    it('a gear piece joins the satchel and is a lane piece the player did not carry', () => {
        const { reward, before, after } = apply('gear');
        if (reward.kind !== 'gear') throw new Error(`expected gear, got ${reward.kind}`);
        expect(EQUIPMENT_LANE[reward.item.id]).toBeDefined();
        expect(before.inventory.some(i => i.id === reward.item.id)).toBe(false);
        expect(after.inventory.some(i => i.id === reward.item.id)).toBe(true);
    });

    it('a relic joins the satchel and was not carried', () => {
        const { reward, before, after } = apply('relic');
        if (reward.kind !== 'relic') throw new Error(`expected a relic, got ${reward.kind}`);
        const wornIds = (before.equipment.relics ?? []).map(r => r?.id);
        expect(wornIds).not.toContain(reward.item.id);
        expect(after.inventory.some(i => i.id === reward.item.id)).toBe(true);
    });
});

describe('a transform', () => {
    it('never yields a grey starter, a Curse or an upgraded copy, over many seeds', () => {
        const { player } = chosen();
        const rng = seededRng(11);
        const greyStarters = new Set(GREY_LANE.testDeck);
        let seen = 0;
        for (let i = 0; i < 3000; i++) {
            const reward = rollSpareReward(player, scripted(DRAW.transform, rng(), rng()), 15);
            if (reward.kind !== 'transform') continue;
            seen += 1;
            expect(greyStarters.has(reward.toCardId)).toBe(false);
            expect(getCardById(reward.toCardId)?.cardType).not.toBe('curse');
            expect(reward.toCardId.endsWith('+')).toBe(false);
            expect(reward.toCardId).not.toBe(reward.fromCardId);
        }
        expect(seen).toBe(3000);
    });

    it('can replace a grey starter, and can land in a lane the player does not draw on', () => {
        const { player } = chosen();
        const replaced = rollSpareReward(player, scripted(DRAW.transform, 0, 0), 15) as Extract<SpareReward, { kind: 'transform' }>;
        expect(GREY_LANE.testDeck).toContain(replaced.fromCardId);
        const pool = transformResultPool();
        expect(pool.length).toBeGreaterThan(0);
        const last = rollSpareReward(player, scripted(DRAW.transform, 0, 0.9999), 15) as Extract<SpareReward, { kind: 'transform' }>;
        expect(last.toCardId).toBe(pool[pool.length - 1]);
    });
});

describe('a result with nothing to give pays the extra shillings', () => {
    it('gear when every lane piece is carried', () => {
        const { player } = chosen();
        const all = equipmentLibrary.filter(p => EQUIPMENT_LANE[p.id] !== undefined);
        const full: Character = { ...player, inventory: [...player.inventory, ...all] };
        expect(rollSpareReward(full, scripted(DRAW.gear, 0), 15)).toEqual({ kind: 'shillings', amount: 15 });
    });

    it('a relic when every relic is carried', () => {
        const { player } = chosen();
        const full: Character = { ...player, inventory: [...player.inventory, ...relicLibrary] };
        expect(rollSpareReward(full, scripted(DRAW.relic, 0), 15)).toEqual({ kind: 'shillings', amount: 15 });
    });

    it('an upgrade when no owned card can take one', () => {
        const { player } = chosen();
        const bare: Character = { ...player, knownCards: [], combatRewardCards: [] };
        expect(rollSpareReward(bare, scripted(DRAW.upgrade, 0), 15)).toEqual({ kind: 'shillings', amount: 15 });
    });
});

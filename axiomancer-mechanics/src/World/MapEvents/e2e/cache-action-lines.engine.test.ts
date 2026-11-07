/**
 * Hermetic e2e — every cache node carries its two action lines.
 *
 * A cache says what you DO for each choice, never what you get. Each line is
 * the node's own data, so this sweeps every registered `loot-cache` pool entry
 * — the Act 1 maps and the Labyrinth's rolled rooms — and fails any cache with
 * a missing or blank line. A cache T has not written yet carries the
 * `[content]` placeholder on both choices, the only legal stand-in; inventing
 * flavour is not.
 *
 * Hermetic = self-contained + deterministic + isolated. The pools self-register
 * on import, so the two side-effect imports below are the whole fixture.
 */

import { describe, it, expect } from 'vitest';

import { listRegisteredMapEventPools } from '../resolve-map-event';
import { CACHE_ACTION_PLACEHOLDER } from '../types';
import type { LootCachePayload } from '../types';
// Imported for side effect — registers the Act 1 and Labyrinth pools.
import '../content';
import '../../Labyrinth/labyrinth.pools';

/** Every `loot-cache` payload any registered pool can roll, with the pool it came from. */
function everyCachePayload(): ReadonlyArray<{ poolId: string; payload: LootCachePayload }> {
    const out: { poolId: string; payload: LootCachePayload }[] = [];
    for (const pool of listRegisteredMapEventPools()) {
        for (const entry of pool.entries) {
            if (entry.payload.kind === 'loot-cache') out.push({ poolId: pool.id, payload: entry.payload });
        }
    }
    return out;
}

describe('every cache node carries two action lines', () => {
    it('the sweep finds the authored caches, so a green run is not an empty one', () => {
        const found = everyCachePayload();
        expect(found.length).toBeGreaterThanOrEqual(9);
        // The Act 1 caches, by the pool id `lootCachePool`/`currencyLootPool` give them.
        const poolIds = found.map(f => f.poolId);
        for (const nodeId of ['bw-h8', 'bw-d2', 'bw-m3', 'cw-2', 'cw-6', 'cw-13', 'bc-5', 'bc-16', 'ld-6']) {
            expect(poolIds).toContain(`${nodeId}.loot-cache`);
        }
    });

    it('no cache has a missing or blank line on either choice', () => {
        const bad = everyCachePayload()
            .filter(({ payload }) => {
                const a = payload.actions;
                return !a || typeof a.card !== 'string' || a.card.trim() === ''
                    || typeof a.item !== 'string' || a.item.trim() === '';
            })
            .map(f => f.poolId);
        expect(bad).toEqual([]);
    });

    it('a cache T has not written yet shows the [content] placeholder, never invented flavour', () => {
        const unwritten = everyCachePayload()
            .filter(({ payload }) => payload.actions?.card === CACHE_ACTION_PLACEHOLDER);
        for (const { payload } of unwritten) {
            expect(payload.actions?.item).toBe(CACHE_ACTION_PLACEHOLDER);
        }
    });

    it("the cave cache carries T's two lines, the card choice first", () => {
        const cave = everyCachePayload().find(f => f.poolId === 'cw-6.loot-cache')!;
        expect(cave.payload.actions).toEqual({
            card: 'Read the runes inside the cave',
            item: 'Plunder the corpses left by the previous patrons',
        });
    });

    it('a cache line never names a reward: no shillings, card or item words', () => {
        const REWARD_WORDS = /\b(shilling|shillings|card|potion|relic|loot|reward)\b/i;
        for (const { poolId, payload } of everyCachePayload()) {
            for (const line of [payload.actions!.card, payload.actions!.item]) {
                if (line === CACHE_ACTION_PLACEHOLDER) continue;
                expect(REWARD_WORDS.test(line), `${poolId}: "${line}" names a reward`).toBe(false);
            }
        }
    });
});

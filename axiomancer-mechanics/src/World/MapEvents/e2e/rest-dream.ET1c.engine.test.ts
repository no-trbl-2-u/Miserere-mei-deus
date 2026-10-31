/**
 * Hermetic e2e — the Breakwater rests each carry one dream line (Phase ET1c, A8).
 */

import { describe, it, expect } from 'vitest';
import { BREAKWATER_CHAPTER_POOLS, BREAKWATER_REST_DREAMS, campRestPool } from '../content';
import { resolveRest } from '../handlers';
import { createNewGameState } from '../../../Game/game.reducer';

describe('ET1c: a dream line per Breakwater rest', () => {
    const restPools = BREAKWATER_CHAPTER_POOLS.filter(p => p.pool.entries.some(e => e.kind === 'rest'));

    it('finds the three rests (W4, H5, L3) and a non-empty dream on each', () => {
        expect(restPools.map(p => p.nodeId).sort()).toEqual(['bw-h5', 'bw-l3', 'bw-w4']);
        for (const { nodeId, pool } of restPools) {
            const payload = pool.entries[0]!.payload;
            expect(payload.kind).toBe('rest');
            const dream = payload.kind === 'rest' ? payload.dream : undefined;
            expect(dream, nodeId).toBe(BREAKWATER_REST_DREAMS[nodeId]);
            expect(dream && dream.length > 0, nodeId).toBe(true);
        }
    });

    it('the resolved rest event carries the dream; a rest without one carries none', () => {
        const state = createNewGameState();
        const withDream = resolveRest(state, { kind: 'rest', dream: 'A fox.' });
        expect(withDream.event).toMatchObject({ kind: 'rest', dream: 'A fox.' });
        const without = resolveRest(state, { kind: 'rest' });
        expect((without.event as { dream?: string }).dream).toBeUndefined();
        const pool = campRestPool('x', 'd');
        expect(pool.entries[0]!.payload).not.toHaveProperty('dream');
    });
});

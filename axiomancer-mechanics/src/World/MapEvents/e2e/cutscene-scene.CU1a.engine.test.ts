/**
 * CU1a (A1) - a cutscene names its picture by a `scene` id.
 *
 * The five cutscenes the ballot drew carry their ids (lines and effects
 * unchanged); the resolved event passes the id through; a cutscene without one
 * resolves exactly as before.
 */

import { describe, expect, it } from 'vitest';

import { listRegisteredMapEventPools } from '../resolve-map-event';
import { resolveCutscene } from '../handlers';
import '../content';
import { createStartingWorld } from '../../index';
import { createNewGameState } from '../../../Game/game.reducer';
import type { GameState } from '../../../Game/types';
import type { CutscenePayload } from '../types';

function freshState(): GameState {
    return { ...createNewGameState(), world: createStartingWorld() };
}

function cutscenePayload(poolId: string): CutscenePayload {
    const pool = listRegisteredMapEventPools().find((p) => p.id === poolId);
    if (!pool) throw new Error(`no pool ${poolId}`);
    const entry = pool.entries.find((e) => e.payload.kind === 'cutscene');
    if (!entry) throw new Error(`pool ${poolId} has no cutscene entry`);
    return entry.payload as CutscenePayload;
}

const FIVE: ReadonlyArray<readonly [string, string]> = [
    ['bw-w1', 'windmill-headland'],
    ['bw-l2', 'clifftop-chapel'],
    ['bw-d5', 'old-watchtower'],
    ['bw-p3', 'high-pass'],
    ['cw-1.cutscene', 'charcoal-wood-arrival'],
];

describe('cutscene scene ids (CU1a)', () => {
    it.each(FIVE)('%s carries the scene id %s on its payload and its resolved event', (key, scene) => {
        const payload = cutscenePayload(key.includes('.') ? key : `${key}.cutscene`);
        expect(payload.scene).toBe(scene);
        const { event } = resolveCutscene(freshState(), payload);
        expect(event).toMatchObject({ kind: 'cutscene', scene });
    });

    it('keeps the windmill lines and its quest step effect', () => {
        const payload = cutscenePayload('bw-w1.cutscene');
        expect(payload.lines).toHaveLength(2);
        expect(payload.effect?.giveQuestStep?.step).toBe(1);
    });

    it('a cutscene without a scene resolves as today: no scene key on the event', () => {
        const state = freshState();
        const { state: after, event } = resolveCutscene(state, { kind: 'cutscene', lines: ['One.'] });
        expect(event).toEqual({ kind: 'cutscene', lines: ['One.'] });
        expect('scene' in event).toBe(false);
        expect(after).toBe(state);
    });
});

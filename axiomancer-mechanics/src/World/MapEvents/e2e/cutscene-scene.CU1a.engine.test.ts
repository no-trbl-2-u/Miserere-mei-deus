/**
 * CU1a (A1) - a cutscene names its picture by a `scene` id.
 *
 * The Breakwater's four scenes the ballot drew sit in their nodes' slots and
 * carry their ids (lines and effects unchanged); the resolved event passes the
 * id through; a cutscene without one resolves exactly as before.
 */

import { describe, expect, it } from 'vitest';

import { getNodeScene } from '../resolve-map-event';
import { resolveCutscene } from '../handlers';
import '../content';
import { createStartingWorld } from '../../index';
import { createNewGameState } from '../../../Game/game.reducer';
import type { GameState } from '../../../Game/types';

function freshState(): GameState {
    return { ...createNewGameState(), world: createStartingWorld() };
}

const FOUR: ReadonlyArray<readonly [string, string]> = [
    ['bw-w1', 'windmill-headland'],
    ['bw-l2', 'clifftop-chapel'],
    ['bw-d5', 'old-watchtower'],
    ['bw-p3', 'high-pass'],
];

describe('cutscene scene ids (CU1a)', () => {
    it.each(FOUR)('%s carries the scene id %s in its slot and on its resolved event', (nodeId, scene) => {
        const payload = getNodeScene('coastal-continent', 'breakwater', nodeId)?.before;
        if (!payload) throw new Error(`${nodeId} has no scene`);
        expect(payload.scene).toBe(scene);
        const { event } = resolveCutscene(freshState(), payload);
        expect(event).toMatchObject({ kind: 'cutscene', scene });
    });

    it('cw-1 carries the scene id charcoal-wood-arrival in its slot and on its resolved event', () => {
        const payload = getNodeScene('coastal-continent', 'charcoal-wood', 'cw-1')?.before;
        if (!payload) throw new Error('cw-1 has no scene');
        expect(payload.scene).toBe('charcoal-wood-arrival');
        const { event } = resolveCutscene(freshState(), payload);
        expect(event).toMatchObject({ kind: 'cutscene', scene: 'charcoal-wood-arrival' });
    });

    it('keeps the windmill lines and its quest step effect', () => {
        const payload = getNodeScene('coastal-continent', 'breakwater', 'bw-w1')!.before;
        expect(payload.lines).toHaveLength(4);
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

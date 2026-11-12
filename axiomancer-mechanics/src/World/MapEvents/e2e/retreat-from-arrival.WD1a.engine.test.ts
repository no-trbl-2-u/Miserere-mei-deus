/**
 * Phase WD1a: a flee sends the player back to the node they
 * came from, the fight node stays unspent, and the way past it stays shut.
 *
 * The map is the Breakwater's first three roads: bw-w1 (the start) -> bw-w2
 * (a fight) -> bw-w3 and bw-w4 beyond it.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    _clearMapEventPoolRegistry,
    answerUnsettledArrival,
    registerMapEventPool,
    resolveMapEvent,
    retreatFromArrival,
    setNodeEventPoolOverride,
} from '../resolve-map-event';
import { moveToNode } from '../../world.reducer';
import { createNewGameState } from '../../../Game/game.reducer';
import { mockSequentialRng, restoreOriginalRng } from '../../../test-utils/rng';
import type { GameState } from '../../../Game/types';

const C = 'coastal-continent';
const M = 'breakwater';

beforeEach(() => {
    mockSequentialRng(0.5);
    _clearMapEventPoolRegistry();
    registerMapEventPool({ id: 'wd1a.fight', entries: [{ kind: 'encounter', weight: 1, payload: { kind: 'encounter', enemySlug: 'float-eye' } }] });
    setNodeEventPoolOverride(C, M, 'bw-w2', 'wd1a.fight');
});

afterEach(() => {
    vi.restoreAllMocks();
    restoreOriginalRng();
    _clearMapEventPoolRegistry();
});

const map = (s: GameState) => s.world.currentMap;
const move = (s: GameState, nodeId: string): GameState => ({ ...s, world: moveToNode(s.world, nodeId) });

/** Start node resolved, then standing on bw-w2 with its fight offered and owed. */
function atTheFight(): GameState {
    const started = resolveMapEvent(createNewGameState({ startMap: 'breakwater' })).state;
    const owed = move(started, 'bw-w2');
    const fight = resolveMapEvent(owed);
    expect(fight.event.kind).toBe('encounter');
    expect(map(fight.state).currentNode).toBe('bw-w2');
    return fight.state;
}

describe('retreatFromArrival', () => {
    it('puts the player back on the node they came from, the fight unspent and answered', () => {
        const back = retreatFromArrival(atTheFight());
        expect(map(back).currentNode).toBe('bw-w1');
        expect(map(back).pendingArrival ?? null).toBeNull();
        expect(map(back).consumedNodes ?? []).not.toContain('bw-w2');
        expect(map(back).completedNodes).not.toContain('bw-w2');
    });

    it('keeps the way past the fight shut: bw-w3 cannot be reached from where they stand', () => {
        const back = retreatFromArrival(atTheFight());
        expect(() => move(back, 'bw-w3')).toThrow(/not joined by a road/);
        expect(map(back).currentNode).toBe('bw-w1');
    });

    it('walking back onto the fight node is a fresh arrival and a fresh fight', () => {
        const again = move(retreatFromArrival(atTheFight()), 'bw-w2');
        expect(map(again).currentNode).toBe('bw-w2');
        expect(map(again).pendingArrival).toBe('bw-w2');
        expect(resolveMapEvent(again).event.kind).toBe('encounter');
    });

    it('is idempotent: a second call changes nothing', () => {
        const once = retreatFromArrival(atTheFight());
        expect(retreatFromArrival(once)).toEqual(once);
    });

    it('with no node behind the player, it only answers the arrival (the old rule)', () => {
        const fresh = createNewGameState({ startMap: 'breakwater' });
        expect(retreatFromArrival(fresh)).toEqual(answerUnsettledArrival(fresh));
        expect(map(retreatFromArrival(fresh)).currentNode).toBe(map(fresh).currentNode);
    });
});

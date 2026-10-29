/**
 * A save written under the frontier rule loads with its move lists rewritten
 * by the road rule (phase WR1a, A5 of the WR1 brief).
 *
 * The lists are derived, so the load path recomputes them from where the
 * player stands (`syncWorldMoveLists` in `unwrap`), with no save version step.
 */

import { describe, expect, it } from '@jest/globals';
import { createNewGameState, legalMovesFrom, moveToNode, type GameState } from '@mechanics';

import { CURRENT_SCHEMA_VERSION, unwrap } from '../migrations';

function frontierEraSave(): GameState {
    const fresh = createNewGameState({ startMap: 'breakwater' });
    return {
        ...fresh,
        world: {
            ...fresh.world,
            currentMap: {
                ...fresh.world.currentMap,
                currentNode: 'bw-9',
                completedNodes: ['bw-4', 'bw-5'],
                consumedNodes: ['bw-1', 'bw-4', 'bw-5'],
                // The whole explored edge, as the frontier kept it.
                availableNodes: ['bw-19', 'bw-4', 'bw-5', 'bw-7', 'bw-9', 'bw-13'],
                lockedNodes: ['bw-17', 'bw-18'],
            },
        },
    };
}

describe('loading a frontier-era save', () => {
    it('rewrites the move lists from where the player stands, and plays on', () => {
        const loaded = unwrap({ schemaVersion: CURRENT_SCHEMA_VERSION, state: frontierEraSave() } as never);
        const map = loaded.world.currentMap;
        expect(map.availableNodes).toEqual(legalMovesFrom(map));
        expect(map.availableNodes).toEqual(['bw-4', 'bw-13']);
        expect(map.lockedNodes).toContain('bw-19');
        expect(moveToNode(loaded.world, 'bw-13').currentMap.currentNode).toBe('bw-13');
    });

    it('leaves a save that already agrees untouched', () => {
        const fresh = createNewGameState({ startMap: 'breakwater' });
        const loaded = unwrap({ schemaVersion: CURRENT_SCHEMA_VERSION, state: fresh } as never);
        expect(loaded.world).toBe(fresh.world);
    });
});

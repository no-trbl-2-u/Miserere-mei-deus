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
                // On the camp, the first fight behind it won.
                currentNode: 'bw-w4',
                completedNodes: ['bw-w2', 'bw-w4'],
                consumedNodes: ['bw-w1', 'bw-w2', 'bw-w4'],
                // The whole explored edge, as the frontier kept it.
                availableNodes: ['bw-w3', 'bw-m1', 'bw-w2', 'bw-w4', 'bw-w5'],
                lockedNodes: ['bw-k2', 'bw-b2'],
            },
        },
    };
}

describe('loading a frontier-era save', () => {
    it('rewrites the move lists from where the player stands, and plays on', () => {
        const loaded = unwrap({ schemaVersion: CURRENT_SCHEMA_VERSION, state: frontierEraSave() } as never);
        const map = loaded.world.currentMap;
        expect(map.availableNodes).toEqual(legalMovesFrom(map));
        // A road back to the fight and a road on to the causeway elite;
        // the fight's other roads are not a road from the camp.
        expect([...map.availableNodes].sort()).toEqual(['bw-w2', 'bw-w5']);
        expect(map.lockedNodes).toContain('bw-w3');
        expect(moveToNode(loaded.world, 'bw-w5').currentMap.currentNode).toBe('bw-w5');
    });

    it('leaves a save that already agrees untouched', () => {
        const fresh = createNewGameState({ startMap: 'breakwater' });
        const loaded = unwrap({ schemaVersion: CURRENT_SCHEMA_VERSION, state: fresh } as never);
        expect(loaded.world).toBe(fresh.world);
    });
});

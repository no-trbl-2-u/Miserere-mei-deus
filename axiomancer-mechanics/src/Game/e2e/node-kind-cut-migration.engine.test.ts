/**
 * Hermetic engine test — the v39 → v40 hop: three map-event kinds cut (phase
 * NK1a, A6).
 *
 * A v39 save can stand on a gathering node with its arrival still owed. The
 * node carries no pool at v40, so the hop clears the owed arrival, on the
 * current map and on any departed map the save keeps; the player loads, still
 * on the node, and the node resolves to nothing. A gathered material in the
 * pack still loads.
 */

import { describe, expect, it } from 'vitest';

import { migrate } from '../game.migrate';
import { createNewGameState, GAME_STATE_VERSION } from '../game.reducer';
import { resolveMapEvent } from '../../World/MapEvents/resolve-map-event';
import { createMapState, getMapDefinition } from '../../World/map.registry';
import '../../World/MapEvents/content';

const DRIFTWOOD = { id: 'driftwood', name: 'Driftwood', description: 'Salt-bleached and brittle, but burns clean.', category: 'material', quantity: 1 };

/** A v39 save standing on bw-4 (the Breakwater's storm wrack) with the arrival owed. */
function v39SaveOnBw4(): Record<string, unknown> {
    const fresh = createNewGameState();
    const charcoal = createMapState(getMapDefinition('coastal-continent', 'charcoal-wood'));
    return {
        ...fresh,
        version: 39,
        player: { ...fresh.player, inventory: [...fresh.player.inventory, DRIFTWOOD] },
        world: {
            ...fresh.world,
            currentMap: { ...fresh.world.currentMap, currentNode: 'bw-4', pendingArrival: 'bw-4' },
            mapStates: { 'charcoal-wood': { ...charcoal, currentNode: 'cw-8', pendingArrival: 'cw-8' } },
        },
    } as unknown as Record<string, unknown>;
}

describe('migrate v39 → v40 — the cut node kinds', () => {
    it('lands at the current version', () => {
        expect(GAME_STATE_VERSION).toBe(40);
        expect(migrate(v39SaveOnBw4(), 39).version).toBe(40);
    });

    it('clears an arrival owed on a former gathering node, on the current map and a kept one', () => {
        const migrated = migrate(v39SaveOnBw4(), 39);
        expect(migrated.world.currentMap.currentNode).toBe('bw-4');
        expect(migrated.world.currentMap.pendingArrival).toBeNull();
        expect(migrated.world.mapStates?.['charcoal-wood']?.pendingArrival).toBeNull();
    });

    it('keeps an arrival owed on any other node', () => {
        const raw = v39SaveOnBw4();
        const world = raw.world as { currentMap: Record<string, unknown> };
        world.currentMap = { ...world.currentMap, currentNode: 'bw-2', pendingArrival: 'bw-2' };
        expect(migrate(raw, 39).world.currentMap.pendingArrival).toBe('bw-2');
    });

    it('loads and plays on: bw-4 resolves to nothing, and the material still loads', () => {
        const migrated = migrate(v39SaveOnBw4(), 39);
        expect(migrated.player.inventory.some(i => i.id === 'driftwood')).toBe(true);
        const { state, event } = resolveMapEvent(migrated, () => 0.5);
        expect(event).toEqual({ kind: 'none' });
        expect(state.world.currentMap.consumedNodes).toContain('bw-4');
    });
});

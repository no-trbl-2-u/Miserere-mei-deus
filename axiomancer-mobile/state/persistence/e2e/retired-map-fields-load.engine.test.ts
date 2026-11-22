// guard-test: the load-time strip already ships on main (#1689); this pins that the mobile unwrap path keeps calling it.
/**
 * Hermetic e2e: a save written while `MapState.hazardOutcomes` existed loads
 * through the mobile `unwrap` path with the field gone from the current map
 * and from every kept map (`dropRetiredMapFields`, AUDIT "TRIM T2a" closed
 * 2026-11-22). Removing that call from the load chain turns this red.
 */

import { createNewGameState } from '@mechanics';
import { unwrap, wrap } from '../migrations';

describe('a save carrying the retired hazardOutcomes field', () => {
    it('loads through unwrap with the field stripped from every map', () => {
        const fresh = createNewGameState();
        const legacy = JSON.parse(JSON.stringify(fresh)) as Record<string, any>;
        legacy.world.currentMap.hazardOutcomes = { 'bw-h1': { outcome: 'failed' } };
        const kept = Object.keys(legacy.world.mapStates ?? {});
        legacy.world.mapStates = legacy.world.mapStates ?? {};
        const keyName = kept[0] ?? 'legacy-map';
        legacy.world.mapStates[keyName] = { ...(legacy.world.mapStates[keyName] ?? legacy.world.currentMap), hazardOutcomes: { x: 1 } };

        const loaded = unwrap(wrap(legacy as never)) as unknown as Record<string, any>;

        expect('hazardOutcomes' in loaded.world.currentMap).toBe(false);
        for (const map of Object.values(loaded.world.mapStates ?? {}) as Record<string, unknown>[]) {
            expect('hazardOutcomes' in map).toBe(false);
        }
    });
});

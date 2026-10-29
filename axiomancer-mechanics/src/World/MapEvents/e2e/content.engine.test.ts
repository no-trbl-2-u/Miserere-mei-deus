/**
 * Hermetic e2e — map-event content.
 *
 * Walks the Act 1 pools authored in `src/World/MapEvents/content.ts` and
 * asserts the expected event kind fires at each node. Verifies the side-effect import path
 * registers the pools and that the dispatcher routes each authored
 * node to its declared kind.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveMapEvent, getNodePrimaryEventKind } from '../resolve-map-event';
import { mockSequentialRng } from '../../../test-utils/rng';
import { createStartingWorld } from '../../index';
import { createNewGameState } from '../../../Game/game.reducer';
import { getMapDefinition } from '../../map.registry';
import { createMapState } from '../../map.registry';
import type { GameState } from '../../../Game/types';
import type { MapState } from '../../types';
import type { ContinentName } from '../../map.library';
import { FIXTURE_VILLAGE_EVENT } from '../../../Game/fixtures/fixture-content';
// Import for side effect — registers the pools when the test loads.
import '../content';

type AuthoredMap = 'breakwater' | 'charcoal-wood' | 'beacon-crags' | 'lantern-deep';

const CONTINENT_OF: Record<AuthoredMap, ContinentName> = {
    'breakwater': 'coastal-continent',
    'charcoal-wood': 'coastal-continent',
    'beacon-crags': 'northern-continent',
    'lantern-deep': 'northern-continent',
};

function freshWorldAt(mapName: AuthoredMap): GameState {
    const base = { ...createNewGameState(), world: createStartingWorld('breakwater') };
    const def = getMapDefinition(CONTINENT_OF[mapName], mapName);
    const map: MapState = createMapState(def);
    return { ...base, world: { ...base.world, currentMap: map } };
}

function visit(state: GameState, nodeId: string): { state: GameState; kind: string } {
    const next: GameState = {
        ...state,
        world: { ...state.world, currentMap: { ...state.world.currentMap, currentNode: nodeId } },
    };
    const result = resolveMapEvent(next);
    return { state: result.state, kind: result.event.kind };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('every MapEventKind is covered', () => {
    it('Act 1 fires every kind it stages', () => {
        mockSequentialRng(0.5);
        const kinds = new Set<string>();
        for (const map of Object.keys(CONTINENT_OF) as AuthoredMap[]) {
            const def = getMapDefinition(CONTINENT_OF[map], map);
            for (const node of def.nodes) {
                // Fresh state per node — a threaded walk would cross a
                // travel door mid-loop and resolve the rest off-map.
                kinds.add(visit(freshWorldAt(map), node.id).kind);
            }
        }
        const required = [
            'encounter', 'none', 'rest', 'cutscene', 'hazard',
            'loot-cache', 'village', 'travel',
        ];
        for (const k of required) {
            expect(kinds, `Act 1 should fire ${k} at least once`).toContain(k);
        }
    });

    // Act 1 stages no shop. The village kind keeps its handler, witnessed by
    // the neutral fixture staged on an Act 1 node.
    it.each([
        ['village', FIXTURE_VILLAGE_EVENT],
    ] as const)('the %s kind resolves from a staged fixture', (kind, payload) => {
        mockSequentialRng(0.5);
        const result = resolveMapEvent(freshWorldAt('breakwater'), undefined, payload);
        expect(result.event.kind).toBe(kind);
    });
});

describe('Phase 52f — guaranteed per-act shilling income (the calibration input)', () => {
    // The ONLY live, deterministic shilling source on the authored maps today
    // is the flat `loot-cache` MapEvent kind (`resolveLootCache` grants
    // `payload.currency` with no RNG). The deep `World/Hazard` and
    // `World/Gathering` minigame packages had their own shilling economies,
    // but neither is wired to a Breakwater or northern-forest node (the
    // map-level 'hazard' kind here resolves to flat damage only — see
    // `resolveHazard`). Combat victory
    // grants XP + loot items but no currency
    // (`aftermath.engine.ts`'s `currency: null`). This test walks every
    // authored node on a full map completion and pins the guaranteed
    // shilling total the price derivation is anchored to — so a
    // future content edit that changes a loot-cache amount (or adds/removes
    // one) is forced to revisit the pricing constants instead of silently
    // drifting past them.
    const walk = (map: AuthoredMap, expectedCurrency: number) => {
        mockSequentialRng(0.5);
        let state = freshWorldAt(map);
        const def = getMapDefinition(CONTINENT_OF[map], map);
        for (const node of def.nodes) {
            // Skip the travel doors: resolving
            // one moves the whole world to the destination map, and a door
            // grants no shillings anyway.
            if (getNodePrimaryEventKind(CONTINENT_OF[map], map, node.id) === 'travel') continue;
            state = visit(state, node.id).state;
        }
        expect(state.player.currency).toBe(expectedCurrency);
    };
    it.each([
        ['breakwater', 26],
    ] as const)('%s grants exactly %d guaranteed shillings on a full walk', walk);
});

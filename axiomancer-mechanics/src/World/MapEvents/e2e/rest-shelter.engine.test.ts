/**
 * Hermetic e2e — the inn is a first-class thing.
 *
 * `RestPayload.shelter` says whether a rest is an inn or a camp; an inn
 * words its night as a bed. Every rest, inn or camp, mends hazard-scarred
 * max-VITAE.
 *
 * This suite is the regression pin: EVERY authored rest pool in the game
 * is enumerated from the live registry and its shelter asserted by name.
 * The rebuilt Breakwater's rests are three camps, so no authored rest is an
 * inn today; the inn stays a first-class shelter, covered by a registered
 * inn pool. If someone authors an inn (or forgets the marker on a new
 * node), this fails until the pin is updated.
 *
 * Hermetic: registry-only reads plus one seeded `resolveMapEvent`; no
 * disk, network, or TTY. RNG stubbed via `src/test-utils/rng.ts`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
    _clearMapEventPoolRegistry,
    getNodeEventPool,
    registerMapEventPool,
    setNodeEventPoolOverride,
    resolveMapEvent,
} from '../resolve-map-event';
import { registerMapEventContent } from '../content';
import {
    registerAporiaEventPools,
    _resetAporiaEventPoolRegistration,
} from '../../Labyrinth/labyrinth.pools';
import { MAP_REGISTRY } from '../../map.registry';
import { resolveRest } from '../handlers';
import {
    DEFAULT_REST_SHELTER,
    REST_PASSIVE_HEAL_FRACTION,
    isInnShelter,
    restShelterOf,
} from '../rest-shelter';
import type { ContinentName, MapName } from '../../map.library';
import type { MapEventPool, RestPayload, RestShelter } from '../types';
import { createNewGameState } from '../../../Game/game.reducer';
import type { GameState } from '../../../Game/types';
import { mockSequentialRng } from '../../../test-utils/rng';

/** `<continent>:<map>:<node>` → the shelter each rest entry authors. */
type ShelterCensus = Record<string, RestShelter[]>;

function censusOfAuthoredRestPools(): ShelterCensus {
    const census: ShelterCensus = {};
    for (const continent of Object.keys(MAP_REGISTRY) as ContinentName[]) {
        for (const mapName of Object.keys(MAP_REGISTRY[continent]) as MapName[]) {
            const def = MAP_REGISTRY[continent][mapName];
            if (!def) continue;
            for (const node of def.nodes) {
                const pool = getNodeEventPool(continent, mapName, node.id);
                if (!pool) continue;
                const shelters = pool.entries
                    .filter(e => e.payload.kind === 'rest')
                    .map(e => restShelterOf(e.payload as RestPayload));
                if (shelters.length > 0) census[`${continent}:${mapName}:${node.id}`] = shelters;
            }
        }
    }
    return census;
}

/** Every rest payload authored anywhere in the live registry. */
function authoredRestPayloads(): RestPayload[] {
    const seen = new Set<MapEventPool>();
    const out: RestPayload[] = [];
    for (const continent of Object.keys(MAP_REGISTRY) as ContinentName[]) {
        for (const mapName of Object.keys(MAP_REGISTRY[continent]) as MapName[]) {
            const def = MAP_REGISTRY[continent][mapName];
            if (!def) continue;
            for (const node of def.nodes) {
                const pool = getNodeEventPool(continent, mapName, node.id);
                if (!pool || seen.has(pool)) continue;
                seen.add(pool);
                for (const entry of pool.entries) {
                    if (entry.payload.kind === 'rest') out.push(entry.payload);
                }
            }
        }
    }
    return out;
}

beforeEach(() => {
    _clearMapEventPoolRegistry();
    registerMapEventContent();
    _resetAporiaEventPoolRegistration();
    registerAporiaEventPools();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('Phase 52b — RestPayload.shelter is authored, never inferred', () => {
    it("defaults to 'camp' when a node forgets to say", () => {
        expect(DEFAULT_REST_SHELTER).toBe('camp');
        expect(restShelterOf({ kind: 'rest' })).toBe('camp');
        expect(restShelterOf({ kind: 'rest', description: 'silent' })).toBe('camp');
    });

    it('only an inn passes the inn test', () => {
        expect(isInnShelter('inn')).toBe(true);
        expect(isInnShelter('camp')).toBe(false);
    });

    it('no authored rest payload carries a heal number any more (healFraction is retired)', () => {
        const payloads = authoredRestPayloads();
        expect(payloads.length).toBeGreaterThan(0);
        for (const p of payloads) {
            expect(Object.keys(p)).not.toContain('healFraction');
        }
    });
});

describe('Phase 52b — the shelter classification of every authored rest pool', () => {
    it('pins the Breakwater rests as its three camps', () => {
        const census = censusOfAuthoredRestPools();
        const breakwater = Object.entries(census)
            .filter(([key]) => key.startsWith('coastal-continent:breakwater:'))
            .sort(([a], [b]) => a.localeCompare(b));
        expect(breakwater).toEqual([
            ['coastal-continent:breakwater:bw-h5', ['camp']],
            ['coastal-continent:breakwater:bw-l3', ['camp']],
            ['coastal-continent:breakwater:bw-w4', ['camp']],
        ]);
    });

    it('pins both labyrinth rest entries as camps', () => {
        const census = censusOfAuthoredRestPools();
        // The act default pool ("a corner the house forgot to make
        // uncomfortable") and the waystone override are both camps — the
        // house is not an innkeeper.
        const labyrinthShelters = Object.entries(census)
            .filter(([key]) => key.startsWith('labyrinth-continent:'))
            .flatMap(([, shelters]) => shelters);
        expect(labyrinthShelters.length).toBeGreaterThan(0);
        expect(new Set(labyrinthShelters)).toEqual(new Set<RestShelter>(['camp']));
    });

    it('no authored rest in the game is an inn: the rebuilt Breakwater rests in camps', () => {
        // The old Breakwater's customs house and harbour inn went with its
        // rebuild; every authored rest is a camp.
        const census = censusOfAuthoredRestPools();
        expect(Object.keys(census).length).toBeGreaterThan(0);
        const innKeys = Object.entries(census)
            .filter(([, shelters]) => shelters.includes('inn'))
            .map(([key]) => key)
            .sort();
        expect(innKeys).toEqual([]);
    });
});

describe('Phase 52b — the resolved rest event carries the shelter', () => {
    function stateAtNode(nodeId: string): GameState {
        const base = createNewGameState();
        return {
            ...base,
            player: { ...base.player, health: 1 },
            world: {
                ...base.world,
                currentMap: {
                    ...base.world.currentMap,
                    continent: 'coastal-continent',
                    name: 'breakwater',
                    currentNode: nodeId,
                },
            },
        } as GameState;
    }

    it('a camp node resolves with shelter camp', () => {
        mockSequentialRng(0.5);
        const result = resolveMapEvent(stateAtNode('bw-w4'));
        expect(result.event.kind).toBe('rest');
        if (result.event.kind === 'rest') {
            expect(result.event.shelter).toBe('camp');
        }
    });

    it('a pool marked inn resolves with shelter inn', () => {
        mockSequentialRng(0.5);
        const pool: MapEventPool = {
            id: 'phase52b-inn-rest',
            entries: [{ kind: 'rest', weight: 1, payload: { kind: 'rest', shelter: 'inn' } }],
        };
        registerMapEventPool(pool);
        setNodeEventPoolOverride('coastal-continent', 'breakwater', 'bw-w4', pool.id);

        const result = resolveMapEvent(stateAtNode('bw-w4'));
        expect(result.event.kind).toBe('rest');
        if (result.event.kind === 'rest') {
            expect(result.event.shelter).toBe('inn');
        }
    });

    it('a pool that omits the marker resolves with shelter camp', () => {
        mockSequentialRng(0.5);
        const pool: MapEventPool = {
            id: 'phase52b-unmarked-rest',
            entries: [{ kind: 'rest', weight: 1, payload: { kind: 'rest' } }],
        };
        registerMapEventPool(pool);
        setNodeEventPoolOverride('coastal-continent', 'breakwater', 'bw-w4', pool.id);

        const result = resolveMapEvent(stateAtNode('bw-w4'));
        expect(result.event.kind).toBe('rest');
        if (result.event.kind === 'rest') {
            expect(result.event.shelter).toBe('camp');
        }
    });

    it('the passive heal runs at the carried-forward shipped default for both shelters', () => {
        // The passive heal is the same full heal for both shelters.
        expect(REST_PASSIVE_HEAL_FRACTION).toBe(1.0);

        const base = createNewGameState();
        const damaged = { ...base, player: { ...base.player, health: 1 } } as GameState;
        const max = damaged.player.maxHealth;

        const camp = resolveRest(damaged, { kind: 'rest', shelter: 'camp' });
        const inn = resolveRest(damaged, { kind: 'rest', shelter: 'inn' });

        expect(camp.event).toEqual({ kind: 'rest', healed: max - 1, shelter: 'camp' });
        expect(inn.event).toEqual({ kind: 'rest', healed: max - 1, shelter: 'inn' });
        expect(camp.state.player.health).toBe(max);
        expect(inn.state.player.health).toBe(max);
    });
});

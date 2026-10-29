/**
 * MapEvents 'travel' kind (2026-08-28 — inter-map travel) — hermetic e2e
 * at the highest public entry point.
 *
 * The doors under test are authored in `content.ts`:
 *   bw-b2 (the Breakwater's far bank, past the river bridge) → coastal / charcoal-wood
 *   cw-20 (the Charcoal Wood's stair cave) → northern / beacon-crags
 *
 * The design call, decided: the world is a PLACE the player moves around
 * in. Departing a map preserves its runtime `MapState` under
 * `WorldState.mapStates` and marks it in `completedMaps` — never a reset.
 * Doors are one-way but repeatable: the dispatcher does not consume a
 * travel node, so re-resolving it offers the trip again. Resolving a door
 * OFFERS the trip (phase NK1d); `takeTravel` is the yes that crosses.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveMapEvent, takeTravel, createStartingWorld, getMapDefinition } from '../../index';
import { createNewGameState, GAME_STATE_VERSION } from '../../../Game/game.reducer';
import { migrate } from '../../../Game/game.migrate';
import { mockSequentialRng } from '../../../test-utils/rng';
import type { GameState } from '../../../Game/types';
import type { MapState } from '../../types';
// Import for side effect — registers the pools when the test loads.
import '../content';

afterEach(() => vi.restoreAllMocks());

/** Resolves the door underfoot (the offer) and takes it (the yes). */
function cross(state: GameState): ReturnType<typeof resolveMapEvent> {
    const offered = resolveMapEvent(state);
    return { state: takeTravel(offered.state), event: offered.event };
}

/** Seat the player on `nodeId` of the CURRENT map, unconsumed. */
function seatAt(state: GameState, nodeId: string): GameState {
    return {
        ...state,
        world: {
            ...state.world,
            currentMap: { ...state.world.currentMap, currentNode: nodeId },
        },
    };
}

/** A fresh game standing on the Breakwater's far bank, past the river bridge (bw-b2). */
function atRiverBridge(): GameState {
    mockSequentialRng(0.5);
    return seatAt({ ...createNewGameState(), world: createStartingWorld('breakwater') }, 'bw-b2');
}

/** A fresh game started on the Charcoal Wood, seated on its stair cave (cw-20). */
function atStairCave(): GameState {
    mockSequentialRng(0.5);
    return seatAt({ ...createNewGameState(), world: createStartingWorld('charcoal-wood') }, 'cw-20');
}

describe("the bw-b2 door — Breakwater → Charcoal Wood (same continent)", () => {
    it('offers the Charcoal Wood, and crosses the world there on the yes', () => {
        const offer = resolveMapEvent(atRiverBridge());
        expect(offer.state.world.currentMap.name).toBe('breakwater');
        const result = cross(atRiverBridge());

        expect(result.event.kind).toBe('travel');
        if (result.event.kind === 'travel') {
            expect(result.event.destination).toEqual({ map: 'charcoal-wood', continent: 'coastal-continent' });
            expect(result.event.prompt).toBeTruthy();
            expect(result.event.open).toBe(true);
        }

        const world = result.state.world;
        expect(world.currentMap.name).toBe('charcoal-wood');
        expect(world.currentMap.currentNode).toBe('cw-1');
        expect(world.currentContinent.name).toBe('coastal-continent');
    });

    it('marks the departed Breakwater completed and unlocks the wood — catalogue in sync', () => {
        const { state } = cross(atRiverBridge());

        expect(state.world.currentContinent.completedMaps).toContain('breakwater');
        expect(state.world.currentContinent.availableMaps).toContain('charcoal-wood');
        expect(state.world.currentContinent.lockedMaps).not.toContain('charcoal-wood');

        // The catalogue entry and currentContinent must agree.
        const catalogued = state.world.world.find(c => c.name === 'coastal-continent')!;
        expect(catalogued).toEqual(state.world.currentContinent);
    });

    it('preserves the departed MapState — the Breakwater is a place, not a checklist', () => {
        const offered = resolveMapEvent(atRiverBridge()).state;
        const departed = offered.world.currentMap;
        const state = takeTravel(offered);

        const preserved = state.world.mapStates?.['breakwater'];
        expect(preserved).toBeDefined();
        expect(preserved).toEqual(departed);
        // The door itself was never consumed — repeatable by design.
        expect(preserved!.consumedNodes).not.toContain('bw-b2');
    });

    it('is repeatable — standing on the preserved door, it offers and crosses again', () => {
        const first = cross(atRiverBridge());
        const preserved = first.state.world.mapStates!['breakwater'] as MapState;

        // Put the player back on the preserved Breakwater (as a future
        // return-door would) and resolve the door node again.
        const back: GameState = {
            ...first.state,
            world: {
                ...first.state.world,
                currentMap: preserved,
                mapStates: { ...first.state.world.mapStates, 'breakwater': undefined },
            },
        };
        const second = cross(back);
        expect(second.event.kind).toBe('travel');
        expect(second.state.world.currentMap.name).toBe('charcoal-wood');
    });
});

describe('the cw-20 door — wood → crags (cross-continent)', () => {
    it('switches continent, unlocks the crags, and lands on their start node', () => {
        const { state, event } = cross(atStairCave());

        expect(event.kind).toBe('travel');
        expect(state.world.currentContinent.name).toBe('northern-continent');
        expect(state.world.currentMap.name).toBe('beacon-crags');
        expect(state.world.currentMap.currentNode).toBe(getMapDefinition('northern-continent', 'beacon-crags').startingNode.id);
        expect(state.world.currentContinent.availableMaps).toContain('beacon-crags');
        expect(state.world.currentContinent.lockedMaps).not.toContain('beacon-crags');
    });

    it('keeps both continents honest in the catalogue after the crossing', () => {
        const { state } = cross(atStairCave());

        const coastal = state.world.world.find(c => c.name === 'coastal-continent')!;
        expect(coastal.completedMaps).toContain('charcoal-wood');
        const northern = state.world.world.find(c => c.name === 'northern-continent')!;
        expect(northern).toEqual(state.world.currentContinent);

        // The departed wood rides along, preserved.
        expect(state.world.mapStates?.['charcoal-wood']?.currentNode).toBe('cw-20');
    });

    it('the whole arc survives a save → migrate roundtrip at the current version', () => {
        const { state } = cross(atStairCave());

        const raw = JSON.parse(JSON.stringify(state));
        const loaded = migrate(raw, raw.version, GAME_STATE_VERSION);

        expect(loaded.version).toBe(GAME_STATE_VERSION);
        expect(loaded.world.currentContinent.name).toBe('northern-continent');
        expect(loaded.world.currentMap.name).toBe('beacon-crags');
        expect(loaded.world.mapStates?.['charcoal-wood']).toBeDefined();
        expect(loaded.world.world.map(c => c.name)).toEqual(
            ['coastal-continent', 'northern-continent'],
        );
    });
});

/**
 * Travel: "move to X?" (phase NK1d) — hermetic e2e at the public entry points.
 *
 * A travel node OFFERS its trip when resolved and moves no one; `takeTravel`
 * is the player's yes. The trip leads to another map (the three Act 1 doors)
 * or to a node of the same map (a passage). The passage pair under test is
 * the fixture map's `mouth` and `face` (`travel-passage.fixture.ts`), the
 * shape of the rebuilt Breakwater's sea cave: each names the other, and the
 * pair works both ways on every entry.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import {
    resolveMapEvent, takeTravel, travelPayloadAt, createStartingWorld, moveToNode,
    actsOnRevisit, legalMovesFrom, MAP_REGISTRY, getNodeEventPool, getMapDefinition,
} from '../../../index';
import { createNewGameState } from '../../../Game/game.reducer';
import type { GameState } from '../../../Game/types';
import type { ResolvedEvent } from '../types';
import {
    registerTravelPassageFixture, PASSAGE_MAP, PASSAGE_POOLS,
} from '../../../Game/fixtures/travel-passage.fixture';

beforeAll(registerTravelPassageFixture);

const fixed = () => 0.5;

function freshPassageGame(): GameState {
    return { ...createNewGameState(), world: createStartingWorld(PASSAGE_MAP) };
}

/** Walks one road and answers the arrival, as a player does. */
function walk(state: GameState, nodeId: string): { state: GameState; event: ResolvedEvent } {
    const moved: GameState = { ...state, world: moveToNode(state.world, nodeId) };
    return resolveMapEvent(moved, fixed);
}

/** Resolves the node underfoot again (the tap on the node the player stands on). */
function tapHere(state: GameState): { state: GameState; event: ResolvedEvent } {
    return resolveMapEvent(state, fixed);
}

/** A game standing on the cave mouth, its offer answered. */
function atMouth(): { state: GameState; event: ResolvedEvent } {
    const trail = walk(freshPassageGame(), 'trail');
    return walk(trail.state, 'mouth');
}

describe('A12 — the travel payload names a map or a node of the same map', () => {
    it('a passage names a node; a door names a map and a continent', () => {
        expect(PASSAGE_POOLS.mouth).toEqual(expect.objectContaining({
            kind: 'travel', destination: { node: 'face' }, prompt: expect.any(String),
        }));
        const door = getNodeEventPool('coastal-continent', 'breakwater', 'bw-18')?.entries[0]?.payload;
        expect(door).toEqual(expect.objectContaining({
            kind: 'travel',
            destination: { map: 'charcoal-wood', continent: 'coastal-continent' },
            prompt: expect.any(String),
        }));
    });

    it('resolving a travel node offers the trip and moves no one', () => {
        const { state, event } = atMouth();
        expect(event).toEqual(expect.objectContaining({
            kind: 'travel', nodeId: 'mouth', destination: { node: 'face' }, open: true,
            prompt: PASSAGE_POOLS.mouth!.kind === 'travel' ? PASSAGE_POOLS.mouth!.prompt : '',
        }));
        expect(state.world.currentMap.currentNode).toBe('mouth');
        expect(state.world.currentMap.pendingArrival ?? null).toBeNull();
        // A door is never consumed: it offers again on every entry.
        expect(state.world.currentMap.consumedNodes).not.toContain('mouth');
    });

    it('an offer carries no art or opensAfter key the payload did not author', () => {
        const offer = atMouth().event;
        expect(Object.keys(offer).sort()).toEqual(['destination', 'kind', 'nodeId', 'open', 'prompt']);
    });

    it('an authored art slug rides the offer', () => {
        const there = takeTravel(atMouth().state);
        expect(tapHere(there).event).toEqual(expect.objectContaining({ kind: 'travel', art: 'cutscene' }));
    });

    it('walks the pair there and back again, and again', () => {
        let state = atMouth().state;
        for (let lap = 0; lap < 3; lap++) {
            state = takeTravel(state);
            expect(state.world.currentMap.currentNode).toBe('face');
            const back = tapHere(state);
            expect(back.event).toEqual(expect.objectContaining({ kind: 'travel', destination: { node: 'mouth' }, open: true }));
            state = takeTravel(back.state);
            expect(state.world.currentMap.currentNode).toBe('mouth');
            const there = tapHere(state);
            expect(there.event).toEqual(expect.objectContaining({ kind: 'travel', destination: { node: 'face' } }));
            state = there.state;
        }
        expect(state.world.currentMap.name).toBe(PASSAGE_MAP);
    });
});

describe('A13 — arriving through a passage', () => {
    it('stands the player on the far node, visited, owing nothing, its roads open', () => {
        const before = atMouth().state;
        const after = takeTravel(before);
        const map = after.world.currentMap;
        expect(map.currentNode).toBe('face');
        expect(map.completedNodes).toContain('face');
        expect(map.pendingArrival ?? null).toBeNull();
        expect(map.arrivedFrom).toBe('mouth');
        expect(map.discoveredNodes).toContain('ledge');
        expect(legalMovesFrom(map)).toEqual(['ledge']);
        expect(map.availableNodes).toEqual(['ledge']);
    });

    it('fires nothing on the far node: VITAE, purse and quests are untouched', () => {
        const before = atMouth().state;
        const after = takeTravel(before);
        expect(after.player).toBe(before.player);
        expect(after.quests).toBe(before.quests);
        expect(after.world.currentMap.consumedNodes).toEqual(before.world.currentMap.consumedNodes);
    });

    it('tapping the far node offers the passage back, though it is spent', () => {
        const after = takeTravel(atMouth().state);
        expect(actsOnRevisit(after, 'face')).toBe(true);
        expect(tapHere(after).event).toEqual(expect.objectContaining({ kind: 'travel', nodeId: 'face' }));
    });

    it('walking on from the far node and back to it offers the passage again', () => {
        const atFace = takeTravel(atMouth().state);
        const ledge = walk(atFace, 'ledge');
        expect(ledge.event.kind).toBe('hazard');
        const back = walk(ledge.state, 'face');
        expect(back.event).toEqual(expect.objectContaining({ kind: 'travel', destination: { node: 'mouth' } }));
        expect(takeTravel(back.state).world.currentMap.currentNode).toBe('mouth');
    });

    it('saying no is nothing at all: the player stays on the node and owes nothing', () => {
        const { state } = atMouth();
        // No `takeTravel`: the offer was declined.
        expect(state.world.currentMap.currentNode).toBe('mouth');
        expect(state.world.currentMap.pendingArrival ?? null).toBeNull();
        expect(legalMovesFrom(state.world.currentMap)).toEqual(['trail']);
    });

    it('takeTravel off a travel node moves no one', () => {
        const trail = walk(freshPassageGame(), 'trail').state;
        expect(travelPayloadAt(trail)).toBeUndefined();
        expect(takeTravel(trail)).toBe(trail);
    });
});

describe('A14 — a travel node shut until a node is spent (opensAfter)', () => {
    it('says the way is shut and moves no one while trail is unspent', () => {
        const ward = walk(freshPassageGame(), 'ward');
        expect(ward.event).toEqual(expect.objectContaining({ kind: 'travel', open: false, opensAfter: 'trail' }));
        expect(takeTravel(ward.state)).toBe(ward.state);
    });

    it('opens once trail is spent', () => {
        let state = walk(freshPassageGame(), 'trail').state;
        state = walk(state, 'start').state;
        const ward = walk(state, 'ward');
        expect(ward.event).toEqual(expect.objectContaining({ kind: 'travel', open: true }));
        expect(takeTravel(ward.state).world.currentMap.currentNode).toBe('face');
    });
});

describe('the inter-map doors offer, then cross on the yes', () => {
    it('bw-18 offers the Charcoal Wood and crosses only when taken', () => {
        const seated: GameState = {
            ...createNewGameState(),
            world: { ...createStartingWorld('breakwater') },
        };
        const onDoor: GameState = {
            ...seated,
            world: { ...seated.world, currentMap: { ...seated.world.currentMap, currentNode: 'bw-18' } },
        };
        const offered = tapHere(onDoor);
        expect(offered.event).toEqual(expect.objectContaining({
            kind: 'travel', open: true, destination: { map: 'charcoal-wood', continent: 'coastal-continent' },
        }));
        expect(offered.state.world.currentMap.name).toBe('breakwater');
        const crossed = takeTravel(offered.state);
        expect(crossed.world.currentMap.name).toBe('charcoal-wood');
        expect(crossed.world.mapStates?.['breakwater']?.currentNode).toBe('bw-18');
    });

    it('crossing back to a departed map restores it live and drops its filed copy', () => {
        const onDoor: GameState = {
            ...createNewGameState(),
            world: { ...createStartingWorld('breakwater') },
        };
        const seated: GameState = {
            ...onDoor,
            world: { ...onDoor.world, currentMap: { ...onDoor.world.currentMap, currentNode: 'bw-18' } },
        };
        const inWood = takeTravel(tapHere(seated).state);
        const back = takeTravel(inWood, {
            kind: 'travel', destination: { map: 'breakwater', continent: 'coastal-continent' }, prompt: '[content]',
        });
        expect(back.world.currentMap.name).toBe('breakwater');
        expect(back.world.currentMap.currentNode).toBe('bw-18');
        expect(Object.keys(back.world.mapStates ?? {})).toEqual(['charcoal-wood']);
    });
});

describe('authoring guard: every travel node leads somewhere real', () => {
    it('a map destination is registered; a node destination is a travel node of the same map', () => {
        const problems: string[] = [];
        for (const [continent, maps] of Object.entries(MAP_REGISTRY)) {
            for (const [mapName, def] of Object.entries(maps)) {
                if (!def) continue;
                for (const node of def.nodes) {
                    const payload = getNodeEventPool(continent, mapName, node.id)?.entries
                        .find(e => e.payload.kind === 'travel')?.payload;
                    if (payload?.kind !== 'travel') continue;
                    const where = `${mapName}/${node.id}`;
                    const destination = payload.destination;
                    if ('map' in destination) {
                        try {
                            getMapDefinition(destination.continent, destination.map);
                        } catch {
                            problems.push(`${where}: leads to unregistered map ${destination.map}`);
                        }
                        continue;
                    }
                    if (!def.nodes.some(n => n.id === destination.node)) {
                        problems.push(`${where}: leads to ${destination.node}, not on the map`);
                        continue;
                    }
                    const far = getNodeEventPool(continent, mapName, destination.node)?.entries
                        .find(e => e.payload.kind === 'travel')?.payload;
                    if (far?.kind !== 'travel') {
                        problems.push(`${where}: its far end ${destination.node} is not a travel node`);
                        continue;
                    }
                    if (payload.opensAfter && !def.nodes.some(n => n.id === payload.opensAfter)) {
                        problems.push(`${where}: opensAfter ${payload.opensAfter} is not on the map`);
                    }
                }
            }
        }
        expect(problems).toEqual([]);
    });
});

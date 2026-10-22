/**
 * The Labyrinth (THE APORIA, W-01) — hermetic engine e2e.
 *
 * Two layers:
 *  1. Content invariants over the authored act graphs — the same
 *     properties `plan/labyrinth/tools/validate-maze.mjs` proves over
 *     the design markdown, re-proven here over the shipped TS content
 *     so the two can never silently diverge.
 *  2. Engine behavior — traversal, secret doors, gates + the Ledger of
 *     Assertions, the debt economy, waystones/ejection, the naming
 *     fork, and the world-reducer integration (labyrinth traversal
 *     mode, one-shot events).
 *
 * Deterministic throughout; the only RNG (the event-pool roll) is
 * injected.
 */

import { describe, it, expect } from 'vitest';

import type { NodeId } from '../../types';
import type { LabyrinthActDef } from '../types';
import { ACT1 } from '../content/act1.content';
import { ACT2 } from '../content/act2.content';
import { ACT3 } from '../content/act3.content';
import { APORIA_ACTS, buildLabyrinthMapDefinition } from '../maps';
import {
    createLabyrinthProgress, visibleDoors, canTraverse, inspectPoi,
    submitGateAnswer, preConfirmedWords, buyHint, hintPrice,
    debtPoints, borrowedPremiseStacks, settleDebt,
    activateWaystone, lastWaystone, namingForkOpen, recordBossOutcome,
    edgeKey, BORROWED_PREMISE_CAP,
    recordWalk, walkedEdgesOf, isSophistTrueName,
} from '../labyrinth.engine';
import { resolvePoiTrap } from '../labyrinth.pools';
import { createMapState, getMapDefinition } from '../../map.registry';
import { moveToNode, teleportToNode, unblockMapRoute, IllegalMoveError } from '../../world.reducer';
import { resolveMapEvent } from '../../MapEvents/resolve-map-event';
import { createNewGameState } from '../../../Game/game.reducer';
import type { GameState } from '../../../Game/types';
import type { WorldState } from '../../types';

// ─── Graph helpers (test-local BFS over authored doors) ──────────────────────

/** Adjacency including secrets and gates (both are eventually walkable);
 *  eject rooms get a virtual edge to the act entry (worst-case return). */
function fullAdjacency(act: LabyrinthActDef): Map<NodeId, NodeId[]> {
    const adj = new Map<NodeId, NodeId[]>();
    for (const room of act.rooms) {
        const edges = room.doors.map(d => d.to);
        if (room.eject) edges.push(act.entry);
        adj.set(room.nodeId, edges);
    }
    return adj;
}

function bfsDistances(adj: Map<NodeId, NodeId[]>, from: NodeId): Map<NodeId, number> {
    const dist = new Map<NodeId, number>([[from, 0]]);
    const queue: NodeId[] = [from];
    while (queue.length > 0) {
        const cur = queue.shift() as NodeId;
        for (const next of adj.get(cur) ?? []) {
            if (!dist.has(next)) {
                dist.set(next, (dist.get(cur) as number) + 1);
                queue.push(next);
            }
        }
    }
    return dist;
}

function countShortestPaths(adj: Map<NodeId, NodeId[]>, from: NodeId, to: NodeId): number {
    const dist = bfsDistances(adj, from);
    if (!dist.has(to)) return 0;
    const order = [...dist.entries()].sort((a, b) => a[1] - b[1]).map(([n]) => n);
    const ways = new Map<NodeId, number>([[from, 1]]);
    for (const node of order) {
        for (const next of adj.get(node) ?? []) {
            if (dist.get(next) === (dist.get(node) as number) + 1) {
                ways.set(next, (ways.get(next) ?? 0) + (ways.get(node) ?? 0));
            }
        }
    }
    return ways.get(to) ?? 0;
}

const EXPECTATIONS: Record<LabyrinthActDef['id'], {
    rooms: number; realms: { path: number; loop: number; trap: number };
    honest: number; counterfeit: number; shortest: number;
    secret: [NodeId, NodeId];
}> = {
    act1: { rooms: 15, realms: { path: 9, loop: 4, trap: 2 }, honest: 4, counterfeit: 4, shortest: 7, secret: ['ap1-4', 'ap1-5'] },
    act2: { rooms: 16, realms: { path: 9, loop: 5, trap: 2 }, honest: 4, counterfeit: 5, shortest: 7, secret: ['ap2-4', 'ap2-6'] },
    act3: { rooms: 16, realms: { path: 9, loop: 4, trap: 3 }, honest: 5, counterfeit: 4, shortest: 7, secret: ['ap3-5', 'ap3-7'] },
};

describe.each(APORIA_ACTS.map(a => [a.id, a] as const))('content invariants — %s', (id, act) => {
    const expected = EXPECTATIONS[id];

    it('has the authored room count, realm split, and fragment counts', () => {
        expect(act.rooms).toHaveLength(expected.rooms);
        const realms = { path: 0, loop: 0, trap: 0 };
        let honest = 0;
        let counterfeit = 0;
        for (const room of act.rooms) {
            realms[room.realm] += 1;
            for (const poi of room.pois) {
                if (poi.fragment?.kind === 'honest') honest += 1;
                if (poi.fragment?.kind === 'counterfeit') counterfeit += 1;
            }
        }
        expect(realms).toEqual(expected.realms);
        expect(honest).toBe(expected.honest);
        expect(counterfeit).toBe(expected.counterfeit);
    });

    it('display numbers are unique and door targets are authored rooms', () => {
        const displays = new Set(act.rooms.map(r => r.display));
        expect(displays.size).toBe(act.rooms.length);
        const ids = new Set(act.rooms.map(r => r.nodeId));
        for (const room of act.rooms) {
            for (const door of room.doors) {
                expect(ids.has(door.to), `${room.nodeId} -> ${door.to}`).toBe(true);
            }
        }
    });

    it('the intended shortest path is exactly 7 moves and unique', () => {
        const adj = fullAdjacency(act);
        const dist = bfsDistances(adj, act.entry);
        expect(dist.get(act.bossRoom)).toBe(expected.shortest);
        expect(countShortestPaths(adj, act.entry, act.bossRoom)).toBe(1);
    });

    it('the secret edge is a mandatory cut on the way to the boss', () => {
        const adj = fullAdjacency(act);
        const [a, b] = expected.secret;
        adj.set(a, (adj.get(a) ?? []).filter(n => n !== b));
        adj.set(b, (adj.get(b) ?? []).filter(n => n !== a));
        expect(bfsDistances(adj, act.entry).has(act.bossRoom)).toBe(false);
    });

    it('every room can reach the boss (traps escapable; eject returns)', () => {
        const adj = fullAdjacency(act);
        for (const room of act.rooms) {
            if (room.nodeId === act.bossRoom) continue;
            expect(
                bfsDistances(adj, room.nodeId).has(act.bossRoom),
                `${room.nodeId} is a dead end`,
            ).toBe(true);
        }
    });

    it('a secret-door POI exists and reveals the secret edge', () => {
        const [from, to] = expected.secret;
        const room = act.rooms.find(r => r.nodeId === from);
        const poi = room?.pois.find(p => p.revealsSecretDoorTo === to);
        expect(poi, `no reveal POI in ${from}`).toBeTruthy();
    });
});

describe('act III specifics', () => {
    it('display parity holds: path odd, loop/trap even; no room 62', () => {
        for (const room of ACT3.rooms) {
            const parity = Number(room.display) % 2;
            expect(parity, `${room.nodeId} (${room.display}, ${room.realm})`)
                .toBe(room.realm === 'path' ? 1 : 0);
        }
        expect(ACT3.rooms.some(r => r.display === '62')).toBe(false);
    });

    it('has three waystones and one eject room', () => {
        expect(ACT3.rooms.filter(r => r.waystone).map(r => r.nodeId))
            .toEqual(['ap3-1', 'ap3-4', 'ap3-6']);
        expect(ACT3.rooms.filter(r => r.eject).map(r => r.nodeId))
            .toEqual(['ap3-16']);
    });

    it('the Foundation gate answer is the full thirteen-word passphrase', () => {
        const gate = ACT3.gates[0];
        expect(gate.answer.join(' ')).toBe('THE ONE YOU WALK IT RESTS ON NOTHING IT IS WALKED NOT WON');
        expect(gate.preConfirmedByGates).toEqual(['ap1-6', 'ap2-7']);
    });
});

// ─── Engine behavior ──────────────────────────────────────────────────────────

describe('secret doors', () => {
    it('are invisible until the reveal POI is inspected, then two-way', () => {
        let progress = createLabyrinthProgress();
        expect(visibleDoors(ACT1, progress, 'ap1-4').map(d => d.to)).not.toContain('ap1-5');
        expect(canTraverse(ACT1, progress, 'ap1-4', 'ap1-5')).toBe(false);

        const result = inspectPoi(ACT1, progress, 'ap1-4', 'relief-of-a-stair');
        progress = result.progress;
        expect(result.revealedDoorTo).toBe('ap1-5');
        expect(canTraverse(ACT1, progress, 'ap1-4', 'ap1-5')).toBe(true);
        expect(canTraverse(ACT1, progress, 'ap1-5', 'ap1-4')).toBe(true);
    });
});

describe('fragments', () => {
    it('are picked up once; re-inspection repeats the remark only', () => {
        let progress = createLabyrinthProgress();
        const room = ACT1.rooms.find(r => r.nodeId === 'ap1-2');
        const poi = room?.pois.find(p => p.fragment)?.id as string;

        const first = inspectPoi(ACT1, progress, 'ap1-2', poi);
        progress = first.progress;
        expect(first.fragment?.word).toBe('THE');
        expect(progress.pocket).toHaveLength(1);

        const second = inspectPoi(ACT1, progress, 'ap1-2', poi);
        expect(second.fragment).toBeUndefined();
        expect(second.progress.pocket).toHaveLength(1);
    });
});

function pocketWith(words: readonly string[], kind: 'honest' | 'counterfeit' = 'honest') {
    return words.map(word => ({ word, kind, sourceNodeId: 'ap1-1' as NodeId }));
}

describe('gates and the Ledger of Assertions', () => {
    it('refuses wrong answers, ledgers each refusal, and never consumes fragments', () => {
        let progress = { ...createLabyrinthProgress(), pocket: pocketWith(['THE', 'ONE', 'YOU', 'WALK', 'KEY']) };

        const wrong = submitGateAnswer(ACT1, progress, 'ap1-6', ['THE', 'ONE', 'YOU', 'KEY']);
        progress = wrong.progress;
        expect(wrong.ok).toBe(false);
        expect(progress.assertionDebt).toBe(1);
        expect(progress.pocket).toHaveLength(5);

        // Words the player never found are refused too (still an assertion).
        const unheld = submitGateAnswer(ACT1, progress, 'ap1-6', ['THE', 'ONE', 'YOU', 'CROWN']);
        progress = unheld.progress;
        expect(unheld.ok).toBe(false);
        expect(progress.assertionDebt).toBe(2);

        const right = submitGateAnswer(ACT1, progress, 'ap1-6', ['THE', 'ONE', 'YOU', 'WALK']);
        progress = right.progress;
        expect(right.ok).toBe(true);
        expect(progress.openGates).toContain(edgeKey('ap1-6', 'ap1-8'));
        expect(progress.pocket).toHaveLength(5);
        expect(progress.assertionDebt).toBe(2);

        // Re-answering an open gate is a friendly no-op.
        const again = submitGateAnswer(ACT1, progress, 'ap1-6', ['THE', 'ONE', 'YOU', 'WALK']);
        expect(again.ok).toBe(true);
        expect(again.progress.assertionDebt).toBe(2);
    });

    it('the Foundation pre-confirms the eight words proven at the act gates', () => {
        let progress = { ...createLabyrinthProgress(), pocket: pocketWith(['THE', 'ONE', 'YOU', 'WALK', 'IT', 'RESTS', 'ON', 'NOTHING', 'IS', 'WALKED', 'NOT', 'WON']) };
        progress = submitGateAnswer(ACT1, progress, 'ap1-6', ['THE', 'ONE', 'YOU', 'WALK']).progress;
        progress = submitGateAnswer(ACT2, progress, 'ap2-7', ['IT', 'RESTS', 'ON', 'NOTHING']).progress;

        const gate = ACT3.gates[0];
        expect(preConfirmedWords(APORIA_ACTS, progress, gate))
            .toEqual(['THE', 'ONE', 'YOU', 'WALK', 'IT', 'RESTS', 'ON', 'NOTHING']);

        const full = submitGateAnswer(ACT3, progress, 'ap3-7', gate.answer);
        expect(full.ok).toBe(true);
    });
});

describe('the debt economy', () => {
    it('accumulates hint + assertion points, caps Borrowed Premise at three, and settles', () => {
        let progress = createLabyrinthProgress();
        expect(borrowedPremiseStacks(progress)).toBe(0);

        progress = buyHint(ACT1, progress, 'ap1-1', 1).progress; // 1 point
        expect(debtPoints(progress)).toBe(1);
        expect(borrowedPremiseStacks(progress)).toBe(1);

        progress = buyHint(ACT1, progress, 'ap1-1', 3).progress; // +4
        progress = buyHint(ACT1, progress, 'ap1-1', 2).progress; // +2 -> 7
        expect(borrowedPremiseStacks(progress)).toBe(2);

        progress = { ...progress, assertionDebt: 20 }; // way past the top threshold
        expect(borrowedPremiseStacks(progress)).toBe(BORROWED_PREMISE_CAP);

        progress = settleDebt(progress, 26);
        expect(debtPoints(progress)).toBe(1);
        expect(borrowedPremiseStacks(progress)).toBe(1);
    });

    it('hint prices rise with reuse of a tier', () => {
        let progress = createLabyrinthProgress();
        const first = hintPrice(progress, 3);
        progress = buyHint(ACT1, progress, 'ap1-1', 3).progress;
        expect(hintPrice(progress, 3)).toBeGreaterThan(first);
    });

    it('tier-2 hints name the room truthfully (secret room case)', () => {
        const progress = createLabyrinthProgress();
        const { line } = buyHint(ACT1, progress, 'ap1-4', 2);
        expect(line.toLowerCase()).toContain('one more way out');
    });
});

describe('waystones and ejection', () => {
    it('tracks the last activated waystone; entry is the fallback', () => {
        let progress = createLabyrinthProgress();
        expect(lastWaystone(ACT3, progress)).toBe('ap3-1');
        progress = activateWaystone(progress, 'ap3-1');
        progress = activateWaystone(progress, 'ap3-4');
        expect(lastWaystone(ACT3, progress)).toBe('ap3-4');
        // Idempotent.
        expect(activateWaystone(progress, 'ap3-4')).toBe(progress);
    });
});

describe('the naming fork (ADR-0007 routing)', () => {
    it('closes only when BOTH act bosses were exploited', () => {
        let progress = createLabyrinthProgress();
        expect(namingForkOpen(progress)).toBe(true);
        progress = recordBossOutcome(progress, 'act1', 'exploited');
        expect(namingForkOpen(progress)).toBe(true);
        progress = recordBossOutcome(progress, 'act2', 'spared');
        expect(namingForkOpen(progress)).toBe(true);
        progress = recordBossOutcome(progress, 'act2', 'exploited');
        expect(namingForkOpen(progress)).toBe(false);
    });
});

// ─── World-reducer integration ────────────────────────────────────────────────

function aporiaWorld(): WorldState {
    const def = getMapDefinition('labyrinth-continent', 'aporia-colonnade');
    return {
        world: [],
        currentContinent: {
            name: 'labyrinth-continent',
            description: 'THE APORIA',
            availableMaps: ['aporia-colonnade'],
            lockedMaps: ['aporia-archive', 'aporia-proof'],
            completedMaps: [],
        },
        currentMap: createMapState(def),
    };
}

describe('labyrinth traversal mode (world reducer)', () => {
    it('seeds secret + gate blocks from the map definition', () => {
        const def = buildLabyrinthMapDefinition(ACT1);
        const state = createMapState(def);
        const reasons = state.blockedRoutes.map(r => r.reason).sort();
        expect(reasons).toContain('secret door');
        expect(reasons).toContain('gate of assent');
    });

    it('permits re-entry into consumed rooms, forbids non-adjacent moves, and honors blocks', () => {
        let world = aporiaWorld();
        // The secret door is blocked at creation.
        world = { ...world, currentMap: { ...world.currentMap, currentNode: 'ap1-4' } };
        expect(() => moveToNode(world, 'ap1-5')).toThrow(IllegalMoveError);

        // Unblock (the POI reveal path) and walk through, then back.
        world = { ...world, currentMap: unblockMapRoute(world.currentMap, 'ap1-4', 'ap1-5') };
        world = moveToNode(world, 'ap1-5');
        expect(world.currentMap.currentNode).toBe('ap1-5');
        world = {
            ...world,
            currentMap: { ...world.currentMap, consumedNodes: ['ap1-4', 'ap1-5'] },
        };
        world = moveToNode(world, 'ap1-4'); // re-entry into a consumed room
        expect(world.currentMap.currentNode).toBe('ap1-4');

        // Non-adjacent stays illegal even in labyrinth mode.
        expect(() => moveToNode(world, 'ap1-15')).toThrow(IllegalMoveError);
    });

    it('teleportToNode works on labyrinth maps and refuses gauntlet maps', () => {
        let world = aporiaWorld();
        world = teleportToNode(world, 'ap1-6');
        expect(world.currentMap.currentNode).toBe('ap1-6');

        const gauntlet = getMapDefinition('coastal-continent', 'breakwater');
        const gauntletWorld: WorldState = {
            ...world,
            currentMap: createMapState(gauntlet),
        };
        expect(() => teleportToNode(gauntletWorld, 'bw-3')).toThrow(IllegalMoveError);
    });
});

describe('one-shot events on labyrinth maps (solved space is solved)', () => {
    it('rolls the pool on first arrival and returns none on re-entry', () => {
        const base = createNewGameState();
        let state: GameState = { ...base, world: aporiaWorld() };

        // Entrance override is a narration (authored, not rolled).
        const first = resolveMapEvent(state, () => 0.0);
        expect(first.event.kind).toBe('narration');
        state = first.state;
        expect(state.world.currentMap.consumedNodes).toContain('ap1-1');

        const again = resolveMapEvent(state, () => 0.0);
        expect(again.event.kind).toBe('none');
    });

    it('boss rooms resolve the authored boss encounter', () => {
        const base = createNewGameState();
        let state: GameState = { ...base, world: aporiaWorld() };
        state = {
            ...state,
            world: {
                ...state.world,
                currentMap: { ...state.world.currentMap, currentNode: 'ap1-15' },
            },
        };
        const result = resolveMapEvent(state, () => 0.0);
        expect(result.event.kind).toBe('encounter');
        if (result.event.kind === 'encounter') {
            expect(result.event.isBoss).toBe(true);
            expect(result.event.encounter.enemies[0]?.name).toBe('The Death Beholder');
        }
    });
});

describe('baited clues (POI traps)', () => {
    it('never share a POI with a fragment or secret, avoid set-piece rooms, and skew to combat', () => {
        let encounters = 0;
        let hazards = 0;
        for (const act of APORIA_ACTS) {
            let actTraps = 0;
            for (const room of act.rooms) {
                for (const poi of room.pois) {
                    if (!poi.trap) continue;
                    actTraps += 1;
                    // A trap is a cost, never a toll on progress.
                    expect(poi.fragment, `${room.nodeId}:${poi.id}`).toBeUndefined();
                    expect(poi.revealsSecretDoorTo, `${room.nodeId}:${poi.id}`).toBeUndefined();
                    // Set-piece rooms (entry, gate, quest, boss) keep their
                    // authored drama; their clues are safe to read.
                    expect([act.entry, act.questRoom, act.bossRoom]).not.toContain(room.nodeId);
                    expect(act.gates.some(g => g.roomId === room.nodeId)).toBe(false);
                    if (poi.trap === 'encounter') encounters += 1;
                    else hazards += 1;
                }
            }
            expect(actTraps).toBeGreaterThan(0);
        }
        expect(encounters).toBeGreaterThan(hazards);
    });

    it('spring once: first inspection carries the trap kind, re-inspection does not', () => {
        const first = inspectPoi(ACT1, createLabyrinthProgress(), 'ap1-9', 'fountain');
        expect(first.trap).toBe('encounter');
        const again = inspectPoi(ACT1, first.progress, 'ap1-9', 'fountain');
        expect(again.trap).toBeUndefined();
        expect(again.remark).toBe(first.remark);
    });

    it('resolvePoiTrap: an encounter trap yields a live enemy; a hazard trap bites with act damage', () => {
        const base = createNewGameState();
        const state: GameState = { ...base, world: aporiaWorld() };

        const fight = resolvePoiTrap(state, ACT1, 'encounter', () => 0.0);
        expect(fight.event.kind).toBe('encounter');
        if (fight.event.kind === 'encounter') {
            expect(fight.event.encounter.enemies.length).toBeGreaterThan(0);
            expect(fight.event.isBoss).toBe(false);
        }

        const bite = resolvePoiTrap(state, ACT1, 'hazard', () => 0.0);
        expect(bite.event.kind).toBe('hazard');
        if (bite.event.kind === 'hazard') {
            // Act I hazard tuning (labyrinth.pools.ts ACT_POOL_TUNING).
            expect(bite.event.damage).toBe(6);
            expect(bite.state.player.health).toBe(state.player.health - 6);
        }
    });
});

describe('walk history (fog-of-war source)', () => {
    it('records each directed edge once, in order, tolerant of legacy saves', () => {
        let p = createLabyrinthProgress();
        p = recordWalk(p, 'ap1-1', 'ap1-2');
        p = recordWalk(p, 'ap1-2', 'ap1-1');
        p = recordWalk(p, 'ap1-1', 'ap1-2');
        expect(p.walkedEdges).toEqual(['ap1-1->ap1-2', 'ap1-2->ap1-1']);

        // Saves written before the field existed read as empty and heal on
        // the first recorded walk.
        const legacy = createLabyrinthProgress();
        delete (legacy as { walkedEdges?: string[] }).walkedEdges;
        expect(walkedEdgesOf(legacy)).toEqual([]);
        expect(recordWalk(legacy, 'ap1-1', 'ap1-3').walkedEdges).toEqual(['ap1-1->ap1-3']);
    });
});

describe('the naming rite', () => {
    it('accepts the true name loosely typed and rejects furniture', () => {
        expect(isSophistTrueName(' protas ')).toBe(true);
        expect(isSophistTrueName('PROTAS')).toBe(true);
        expect(isSophistTrueName('SOPHIST')).toBe(false);
        expect(isSophistTrueName('')).toBe(false);
    });
});

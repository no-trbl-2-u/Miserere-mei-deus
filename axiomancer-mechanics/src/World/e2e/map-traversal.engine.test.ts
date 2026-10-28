/**
 * Map traversal invariants (2026-08-08 first-map audit).
 *
 * The gauntlet doctrine — completed nodes lock behind you, no back-travel —
 * makes map topology load-bearing for whether a run can finish at all. The
 * audit that produced this file found the then-first map (the Fishing
 * Village, purged in R3b) stranding players on eight different nodes, the
 * shortest strand four nodes deep. A stranded run is silent: the player is
 * alive, the map is unfinished, and the exploration screen has no glowing
 * node left to tap.
 *
 * These tests are the structural guard. `auditMapTraversal` walks EVERY legal
 * single-life route through a map definition; the invariant is that a route
 * only ever runs out of moves on an authored terminal node.
 */

import { describe, expect, it } from 'vitest';

import { MAP_REGISTRY } from '../map.registry';
import { auditMapTraversal } from '../world.reducer';
import type { MapDefinition } from '../types';
import type { MapTraversalAudit } from '../world.reducer';

/** Every registered gauntlet map, flattened. Labyrinth maps are exempt. */
const GAUNTLET_MAPS: MapDefinition[] = Object.values(MAP_REGISTRY)
    .flatMap(maps => Object.values(maps))
    .filter((def): def is MapDefinition => def !== undefined && def.traversal !== 'labyrinth');

/**
 * The terminal nodes a map authors outside its last column, less the ones a
 * questline allows: on a map that holds a questline (`holdRoadsUntilSettled`)
 * a POCKET (a node joined only to held nodes) and a node whose only road on
 * is a lateral rib are dead ends by design. Empty is the invariant.
 */
function strayTerminals(def: MapDefinition, audit: MapTraversalAudit): string[] {
    const held = new Set(def.holdRoadsUntilSettled ?? []);
    const nodeOf = (id: string) => def.nodes.find(n => n.id === id);
    const neighbours = (id: string): string[] => [
        ...(nodeOf(id)?.connectedNodes ?? []),
        ...def.nodes.filter(n => n.connectedNodes.includes(id)).map(n => n.id),
    ];
    const isPocket = (id: string): boolean => {
        const around = neighbours(id);
        return around.length > 0 && around.every(n => held.has(n)) && !held.has(id);
    };
    const column = (id: string) => nodeOf(id)!.location[0];
    const ribsOn = (id: string): boolean => (nodeOf(id)?.connectedNodes ?? []).some(n => column(n) === column(id));
    const maxX = Math.max(...def.nodes.map(n => n.location[0]));
    return audit.terminalNodes.filter(id => {
        if (column(id) === maxX) return false;
        return !(held.size > 0 && (isPocket(id) || ribsOn(id)));
    });
}

describe('the terminal-column rule\'s questline exception (a staged map)', () => {
    // s ── m ── p       p: a pocket behind the held marker m (column 2)
    // s ── a ── r ─ b   r: a dead end whose only road on is a rib to b (column 2)
    //           b ── e  e: the exit, alone in the last column
    const node = (id: string, location: [number, number], connectedNodes: string[]) => ({ id, location, connectedNodes });
    const staged = (holdRoadsUntilSettled?: string[]): MapDefinition => ({
        name: 'staged-pockets' as never,
        continent: 'coastal-continent',
        description: '',
        startingNode: node('s', [0, 0], ['m', 'a']),
        nodes: [
            node('s', [0, 0], ['m', 'a']),
            node('m', [1, 1], ['p']), node('a', [1, 0], ['r', 'b']),
            node('p', [2, 2], []), node('r', [2, 1], ['b']), node('b', [2, 0], ['e']),
            node('e', [3, 0], []),
        ],
        ...(holdRoadsUntilSettled ? { holdRoadsUntilSettled } : {}),
        npcs: [], enemies: [], uniqueEvents: [], quests: [],
        images: { mapImage: { alt: '', src: '' }, combatImage: { alt: '', src: '' } },
    } as MapDefinition);

    it('names the pocket and the rib-only dead end on a map that holds no questline', () => {
        const def = staged();
        expect(strayTerminals(def, auditMapTraversal(def)).sort()).toEqual(['p', 'r']);
    });

    it('allows both once the map holds its marker', () => {
        const def = staged(['m']);
        expect(strayTerminals(def, auditMapTraversal(def))).toEqual([]);
    });

    it('still names a dead end that is neither a pocket nor rib-only', () => {
        const base = staged(['m']);
        const def = { ...base, nodes: [...base.nodes.filter(n => n.id !== 'a'), node('a', [1, 0], ['r', 'b', 'x']), node('x', [2, 3], [])] };
        expect(strayTerminals(def, auditMapTraversal(def))).toEqual(['x']);
    });
});

describe('gauntlet map traversal invariants', () => {
    it('registers the four Act 1 maps as gauntlets', () => {
        expect(GAUNTLET_MAPS.map(d => d.name).sort()).toEqual([
            'beacon-crags', 'breakwater', 'charcoal-wood', 'lantern-deep',
        ]);
    });

    for (const def of GAUNTLET_MAPS) {
        describe(def.name, () => {
            const audit = auditMapTraversal(def);
            // A map that holds a questline (`holdRoadsUntilSettled`) puts its
            // fights and hazards in POCKETS: nodes joined only to held nodes
            // (their step's marker), dead ends by design. A pocket, and a node
            // whose only road on is a lateral rib, are the terminals allowed
            // outside the last column. The two column-shape
            // rules a pocket and its marker cannot meet (a lane chain, and a
            // choice in every column) skip such a map: its questline's
            // routing test (`breakwater-questline.engine.test.ts`) walks the
            // real frontier with the questline played instead. The strand,
            // reachability, edge and coordinate rules still hold.
            const holdsAQuestline = (def.holdRoadsUntilSettled?.length ?? 0) > 0;

            it('never strands a run on a non-terminal node', () => {
                // A strand is a soft-lock. The message names the exact route so
                // a failure is actionable without re-running the audit by hand.
                const detail = audit.strands
                    .slice(0, 5)
                    .map(s => `  ${s.route.join(' -> ')}  (stuck at ${s.nodeId})`)
                    .join('\n');
                expect(
                    audit.strands.length,
                    `${def.name}: ${audit.strands.length} route(s) dead-end on a non-terminal node:\n${detail}`,
                ).toBe(0);
            });

            it('can reach every authored node from the start', () => {
                expect(audit.unreachableNodes).toEqual([]);
            });

            it('authors its terminal nodes in one final column (a questline\'s pockets excepted)', () => {
                // The end of the map is where the map says it ends: every
                // terminal node shares the highest x-coordinate on the grid.
                expect(strayTerminals(def, audit)).toEqual([]);
                expect(audit.terminalNodes.length).toBeGreaterThan(0);
            });

            it('runs every edge one column forward, or sideways between neighbouring lanes (D1)', () => {
                // THE LAYER LAW, 2026-09-21. The column law — every edge runs
                // from column x to x+1 — is what made strands structurally
                // impossible under the old gauntlet walk, and it still governs
                // the FORWARD SKELETON that both route audits measure. D1's
                // lateral lane ribs are the one permitted exception: an edge
                // may also run sideways WITHIN a column, between two lanes that
                // are neighbours in that column's y-order. A rib never skips or
                // reverses a column, so it cannot let a route miss a gate, and
                // it cannot re-open the soft-lock class this audit closed.
                const columnOf = new Map(def.nodes.map(n => [n.id, n.location[0]]));
                const rowOf = new Map(def.nodes.map(n => [n.id, n.location[1]]));
                // Per column, the lanes in y-order — a rib is legal only
                // between entries that are adjacent in this list.
                const lanes = new Map<number, number[]>();
                for (const node of def.nodes) {
                    const col = node.location[0];
                    lanes.set(col, [...(lanes.get(col) ?? []), node.location[1]].sort((a, b) => b - a));
                }
                for (const node of def.nodes) {
                    const here = columnOf.get(node.id)!;
                    for (const next of node.connectedNodes) {
                        const there = columnOf.get(next);
                        expect(there, `${node.id} -> ${next}: unknown node`).toBeDefined();
                        if (there === here + 1) continue;
                        expect(
                            there,
                            `${node.id} -> ${next} must run one column forward or stay in column ${here}`,
                        ).toBe(here);
                        const order = lanes.get(here)!;
                        const gap = Math.abs(order.indexOf(rowOf.get(node.id)!) - order.indexOf(rowOf.get(next)!));
                        expect(
                            gap,
                            `${node.id} -> ${next} is a lateral rib across ${gap} lanes; ribs join NEIGHBOURING lanes only`,
                        ).toBe(1);
                    }
                }
            });

            it('keeps the terminal column free of lateral ribs', () => {
                // A rib in the last column would give a terminal node an
                // outgoing edge, and `connectedNodes: []` is how several
                // per-map tests (and mobile's map legend) recognise the
                // authored end of a map.
                const maxX = Math.max(...def.nodes.map(n => n.location[0]));
                for (const node of def.nodes.filter(n => n.location[0] === maxX)) {
                    expect(node.connectedNodes, `${node.id} is in the terminal column`).toEqual([]);
                }
            });

            it.skipIf(holdsAQuestline)('gives every multi-node column a walkable lane chain (D1)', () => {
                // The ribs are what turn a column of parallel rungs into a
                // place the player can move along. Every non-terminal column
                // with more than one node must be connected sideways end to
                // end, or one of its lanes is only reachable through the
                // column before it — exactly the fragility a blocked route
                // turns into orphaned content.
                const maxX = Math.max(...def.nodes.map(n => n.location[0]));
                const byColumn = new Map<number, string[]>();
                for (const node of def.nodes) {
                    byColumn.set(node.location[0], [...(byColumn.get(node.location[0]) ?? []), node.id]);
                }
                const edgesOf = (id: string): readonly string[] =>
                    def.nodes.find(n => n.id === id)?.connectedNodes ?? [];
                for (const [col, members] of byColumn) {
                    if (col === maxX || members.length < 2) continue;
                    const inColumn = new Set<string>(members);
                    const seen = new Set<string>([members[0]]);
                    const queue = [members[0]];
                    while (queue.length > 0) {
                        const cur = queue.shift()!;
                        const touching = [
                            ...edgesOf(cur).filter(id => inColumn.has(id)),
                            ...members.filter(id => edgesOf(id).includes(cur)),
                        ];
                        for (const id of touching) {
                            if (seen.has(id)) continue;
                            seen.add(id);
                            queue.push(id);
                        }
                    }
                    expect(seen.size, `${def.name} column ${col} is not laterally connected`).toBe(members.length);
                }
            });

            it('gives every node a distinct grid coordinate', () => {
                // Two nodes on one coordinate render stacked on the map canvas.
                const seen = new Map<string, string>();
                for (const node of def.nodes) {
                    const key = node.location.join(',');
                    expect(seen.get(key), `${node.id} shares [${key}] with ${seen.get(key)}`).toBeUndefined();
                    seen.set(key, node.id);
                }
            });

            it.skipIf(holdsAQuestline)('offers a real choice at every branch (no single-file corridors)', () => {
                // A column of one is a deliberate chokepoint (the start, a
                // boss, a door) — a map made only of them is not a map. The
                // tolerance is 3: an Act 1 map opens on its arrival and ends
                // on its door fight and its door, each alone in its column.
                const widths = new Map<number, number>();
                for (const node of def.nodes) {
                    widths.set(node.location[0], (widths.get(node.location[0]) ?? 0) + 1);
                }
                const branching = [...widths.values()].filter(w => w > 1).length;
                const singletonTolerance = 3;
                expect(branching).toBeGreaterThanOrEqual(widths.size - singletonTolerance);
            });
        });
    }
});

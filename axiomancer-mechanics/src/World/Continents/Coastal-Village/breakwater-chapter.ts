/**
 * The Breakwater rebuilt to T's Chapter 1 vision (phase BW1a): 44 nodes on
 * the coast plate, 42 roads and one same-map travel pair.
 *
 * BUILT BESIDE THE LIVE MAP. This definition is registered only by the tests
 * that call `registerBreakwaterChapter()` (`MapEvents/breakwater-chapter.content.ts`);
 * the shipped registry still holds `breakwater.ts`. Phase BW1b swaps it live.
 *
 * Node ids are T's board codes in lower case (`bw-w1` .. `bw-p3`, plus the
 * cave face `bw-c0`). The node list, kinds and plate positions are the table
 * in `braindump/2026-10-28-breakwater-chapter-1-map.md` ("The node list");
 * T's vision is `plan/revamp/breakwater-vision.md`.
 *
 * The roads form a tree rooted at the windmill. Each road is authored once,
 * on the node nearer the windmill (`connectedNodes` points away from the
 * start), and is walked both ways. That direction matters for the holds: a
 * held node keeps its OWN `connectedNodes` shut, so the wreck (`bw-h4`) and
 * the three elites (`bw-c1`, `bw-l4`, `bw-w5`) hold the road on to their far
 * side until crossed or beaten, and the road they were reached by stays
 * open.
 *
 * The sea cave mouth (`bw-h6`) and the cave face (`bw-c0`) are a passage, not
 * a road: each is a travel node naming the other (`destination: { node }`),
 * so the cove (`bw-c0`, `bw-c1`, `bw-c2`) is reached only through it.
 *
 * Two quest gates (`gatesPast` of the chain's steps 3 and 4,
 * `breakwater-chapter.questline.ts`) are seeded shut here: the keep gate to
 * the sea keep, and the river bridge to the far bank.
 *
 * `location` is [depth from the windmill, lane within that depth] (the
 * passage counts as one step); the mobile layout places each node on its
 * plate mark, so these are abstract.
 */

import type { MapDefinition, MapNode } from '../../types';

/** The two quest gates: each road leaves the quest node that holds it. */
export const BREAKWATER_CHAPTER_GATES = {
    /** The keep gate to the sea keep: opens when the key is turned in (step 3). */
    pastKeep:   { from: 'bw-k1', to: 'bw-k2' },
    /** The river bridge to the far bank: opens when the boss quest is turned in (step 4). */
    pastBridge: { from: 'bw-b1', to: 'bw-b2' },
} as const;

/** The nodes that hold their far road until crossed or beaten: the wreck and the three elites. */
export const BREAKWATER_CHAPTER_HELD = ['bw-h4', 'bw-c1', 'bw-l4', 'bw-w5'] as const;

const NODES: MapNode[] = [
    // ── The windmill and the west ──────────────────────────────────────
    { id: 'bw-w1', location: [0, 0],  connectedNodes: ['bw-w2'] },
    { id: 'bw-w2', location: [1, 0],  connectedNodes: ['bw-w3', 'bw-w4', 'bw-m1'] },
    { id: 'bw-w3', location: [2, 0],  connectedNodes: ['bw-h1'] },
    { id: 'bw-w4', location: [2, 1],  connectedNodes: ['bw-w5'] },
    { id: 'bw-w5', location: [3, 1],  connectedNodes: ['bw-k1'] },
    // ── The keep ───────────────────────────────────────────────────────
    { id: 'bw-k1', location: [4, 1],  connectedNodes: ['bw-k2'] },
    { id: 'bw-k2', location: [5, 1],  connectedNodes: [] },
    // ── The harbour ────────────────────────────────────────────────────
    { id: 'bw-h1', location: [3, 0],  connectedNodes: ['bw-h2', 'bw-t1'] },
    { id: 'bw-h2', location: [4, 0],  connectedNodes: ['bw-h3'] },
    { id: 'bw-h3', location: [5, 0],  connectedNodes: ['bw-h4'] },
    { id: 'bw-h4', location: [6, 0],  connectedNodes: ['bw-h5'] },
    { id: 'bw-h5', location: [7, 0],  connectedNodes: ['bw-h6', 'bw-h7'] },
    { id: 'bw-h6', location: [8, 0],  connectedNodes: [] },
    { id: 'bw-h7', location: [8, 1],  connectedNodes: ['bw-h8'] },
    { id: 'bw-h8', location: [9, 1],  connectedNodes: [] },
    // ── The cove, through the sea cave ─────────────────────────────────
    { id: 'bw-c0', location: [9, 0],  connectedNodes: ['bw-c1'] },
    { id: 'bw-c1', location: [10, 0], connectedNodes: ['bw-c2'] },
    { id: 'bw-c2', location: [11, 0], connectedNodes: [] },
    // ── The town ───────────────────────────────────────────────────────
    { id: 'bw-t1', location: [4, 2],  connectedNodes: ['bw-t2'] },
    { id: 'bw-t2', location: [5, 2],  connectedNodes: ['bw-b1', 'bw-t3'] },
    { id: 'bw-t3', location: [6, 2],  connectedNodes: ['bw-t4', 'bw-t5'] },
    { id: 'bw-t4', location: [7, 2],  connectedNodes: [] },
    { id: 'bw-t5', location: [7, 3],  connectedNodes: ['bw-t6'] },
    { id: 'bw-t6', location: [8, 2],  connectedNodes: ['bw-l1'] },
    // ── The bridge ─────────────────────────────────────────────────────
    { id: 'bw-b1', location: [6, 1],  connectedNodes: ['bw-b2'] },
    { id: 'bw-b2', location: [7, 1],  connectedNodes: [] },
    // ── The lighthouse cliffs ──────────────────────────────────────────
    { id: 'bw-l1', location: [9, 2],  connectedNodes: ['bw-l2', 'bw-l3', 'bw-d1'] },
    { id: 'bw-l2', location: [10, 1], connectedNodes: [] },
    { id: 'bw-l3', location: [10, 2], connectedNodes: ['bw-l4'] },
    { id: 'bw-l4', location: [11, 1], connectedNodes: ['bw-l5'] },
    { id: 'bw-l5', location: [12, 0], connectedNodes: [] },
    // ── The hamlet and the watchtower ──────────────────────────────────
    { id: 'bw-d1', location: [10, 3], connectedNodes: ['bw-d2', 'bw-d3'] },
    { id: 'bw-d2', location: [11, 2], connectedNodes: [] },
    { id: 'bw-d3', location: [11, 3], connectedNodes: ['bw-d4'] },
    { id: 'bw-d4', location: [12, 1], connectedNodes: ['bw-d5'] },
    { id: 'bw-d5', location: [13, 0], connectedNodes: [] },
    // ── The manor road ─────────────────────────────────────────────────
    { id: 'bw-m1', location: [2, 2],  connectedNodes: ['bw-m2', 'bw-p1'] },
    { id: 'bw-m2', location: [3, 2],  connectedNodes: ['bw-m3', 'bw-m4'] },
    { id: 'bw-m3', location: [4, 3],  connectedNodes: [] },
    { id: 'bw-m4', location: [4, 4],  connectedNodes: ['bw-m5'] },
    { id: 'bw-m5', location: [5, 3],  connectedNodes: [] },
    // ── The pass ───────────────────────────────────────────────────────
    { id: 'bw-p1', location: [3, 3],  connectedNodes: ['bw-p2'] },
    { id: 'bw-p2', location: [4, 5],  connectedNodes: ['bw-p3'] },
    { id: 'bw-p3', location: [5, 4],  connectedNodes: [] },
];

/** The keep gate's reason (`[content]` until T's lines, BW1e). */
export const KEEP_GATE_REASON = '[content] The keep gate is barred. It wants a key.';

/** The river bridge's reason (`[content]` until T's lines, BW1e). */
export const BRIDGE_GATE_REASON = '[content] The bridge will not take you while the keep stands.';

const breakwaterChapter: MapDefinition = {
    name: 'breakwater',
    continent: 'coastal-continent',
    description: 'A walled harbour on a storm coast. Every pier charges for the calm. The wreck under the lighthouse did not pay.',
    startingNode: NODES[0]!,
    nodes: NODES,
    initialBlockedRoutes: [
        { ...BREAKWATER_CHAPTER_GATES.pastKeep, reason: KEEP_GATE_REASON },
        { ...BREAKWATER_CHAPTER_GATES.pastBridge, reason: BRIDGE_GATE_REASON },
    ],
    holdRoadsUntilSettled: [...BREAKWATER_CHAPTER_HELD],
    npcs: [],
    enemies: [],
    uniqueEvents: [],
    quests: [],
    images: {
        mapImage: { alt: '', src: '' },
        combatImage: { alt: '', src: '' },
    },
};

export { breakwaterChapter };

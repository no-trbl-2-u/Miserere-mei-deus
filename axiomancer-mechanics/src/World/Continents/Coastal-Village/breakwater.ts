/**
 * The Breakwater — Act 1, map 1.
 *
 * The first of the four Act 1 maps built from T's plates
 * (`axiomancer-mobile/assets/images/maps/act1-coast.webp`). A new game
 * starts here; the river bridge is the door on to the Charcoal Wood.
 *
 * One node per landmark on the plate (`act1-landmarks.json`), plus the four
 * quest markers of the Breakwater's questline (bw-19..bw-22, `quest.library.ts`),
 * each with its own mark beside its anchor. The engine graph is abstract
 * (columns and lanes); the mobile layout places each node on its mark.
 *
 * The map holds the questline by routing alone. Every fight and hazard sits
 * in a POCKET joined only to its step's marker, and the open fan between them
 * holds the waypoint, cache, rest and Anvil nodes only:
 *
 *   bw-19 (off the windmill)       Gallows Hill, the Sea Cave        (hazards)
 *   bw-20 (off the customs house)  Crane Quay, the Walled Manor,
 *                                  the Lighthouse                    (fights)
 *   bw-21 (off the south pier)     the North Pier (the elite),
 *                                  the Sea Fort                      (fights)
 *   bw-22 (on the chapel road)     the watchtower, then the bridge   (the boss)
 *
 * The four markers and the watchtower hold their roads until spent
 * (`holdRoadsUntilSettled`): a pocket opens only when its step is accepted,
 * and the bridge only when the boss falls. The roads into bw-20, bw-21 and
 * bw-22 start blocked (the quest-node locks) and open when the step before
 * fills (`opensOnReady`). Each pocket holds its goal plus one spare.
 *
 *   c0  the windmill                                         (start)
 *   c1  marker 1 · foothill pass · smugglers' cove
 *   c2  gallows · sea cave · south pier · customs house
 *   c3  marker 3 · shipwreck · harbour town · marker 2
 *   c4  sea fort · north pier · chapel · hamlet · crane quay ·
 *       walled manor · lighthouse
 *   c5  marker 4
 *   c6  the watchtower                                       (the last fight)
 *   c7  the river bridge                                     (the door, terminal)
 *
 * Events use the shared Act 1 pool builders: see `MapEvents/content.ts`.
 */

import { MapDefinition } from '../../types';

const breakwater: MapDefinition = {
    name: 'breakwater',
    continent: 'coastal-continent',
    description: 'A walled harbour on a storm coast. Every pier charges for the calm. The wreck under the lighthouse did not pay.',
    startingNode: {
        id: 'bw-1',
        location: [0, 0],
        connectedNodes: ['bw-19', 'bw-4', 'bw-5'],
    },
    nodes: [
        // ── c0 — the windmill ────────────────────────────────────────
        { id: 'bw-1',  location: [0, 0],  connectedNodes: ['bw-19', 'bw-4', 'bw-5'] },
        // ── c1 — marker 1 · foothill pass · smugglers' cove ──────────
        { id: 'bw-19', location: [1, 1],  connectedNodes: ['bw-3', 'bw-12'] },
        { id: 'bw-4',  location: [1, 0],  connectedNodes: ['bw-7', 'bw-9', 'bw-5'] },
        { id: 'bw-5',  location: [1, -1], connectedNodes: ['bw-7'] },
        // ── c2 — the hazard pocket · south pier · customs house ──────
        { id: 'bw-3',  location: [2, 3],  connectedNodes: [] },
        { id: 'bw-12', location: [2, 2],  connectedNodes: [] },
        { id: 'bw-7',  location: [2, 0],  connectedNodes: ['bw-11', 'bw-21'] },
        { id: 'bw-9',  location: [2, -1], connectedNodes: ['bw-13', 'bw-20'] },
        // ── c3 — marker 3 · shipwreck · harbour town · marker 2 ──────
        { id: 'bw-21', location: [3, 2],  connectedNodes: ['bw-8', 'bw-6'] },
        { id: 'bw-11', location: [3, 1],  connectedNodes: ['bw-13'] },
        { id: 'bw-13', location: [3, 0],  connectedNodes: ['bw-15', 'bw-16'] },
        { id: 'bw-20', location: [3, -1], connectedNodes: ['bw-2', 'bw-10', 'bw-14'] },
        // ── c4 — the elite pocket · chapel · hamlet · the fight pocket ──
        { id: 'bw-6',  location: [4, 4],  connectedNodes: [] },
        { id: 'bw-8',  location: [4, 3],  connectedNodes: [] },
        { id: 'bw-15', location: [4, 1],  connectedNodes: ['bw-22', 'bw-16'] },
        { id: 'bw-16', location: [4, 0],  connectedNodes: ['bw-22'] },
        { id: 'bw-2',  location: [4, -1], connectedNodes: [] },
        { id: 'bw-10', location: [4, -2], connectedNodes: [] },
        { id: 'bw-14', location: [4, -3], connectedNodes: [] },
        // ── c5 — marker 4, on the road to the watchtower ─────────────
        { id: 'bw-22', location: [5, 0],  connectedNodes: ['bw-17'] },
        // ── c6 — the watchtower ──────────────────────────────────────
        { id: 'bw-17', location: [6, 0],  connectedNodes: ['bw-18'] },
        // ── c7 — the river bridge. Terminal column: the door. ────────
        { id: 'bw-18', location: [7, 0],  connectedNodes: [] },
    ],
    // The quest-node locks: each road into markers 2-4 is shut until the step
    // before it is met (the steps' `opensOnReady`). `[content]` reasons.
    initialBlockedRoutes: [
        { from: 'bw-9',  to: 'bw-20', reason: '[content] Not yet. Finish what the last marker asked.' },
        { from: 'bw-7',  to: 'bw-21', reason: '[content] Not yet. Finish what the last marker asked.' },
        { from: 'bw-15', to: 'bw-22', reason: '[content] Not yet. Finish what the last marker asked.' },
        { from: 'bw-16', to: 'bw-22', reason: '[content] Not yet. Finish what the last marker asked.' },
    ],
    // The markers open their pockets only once their step is accepted, and
    // the watchtower opens the bridge only once the boss falls.
    holdRoadsUntilSettled: ['bw-19', 'bw-20', 'bw-21', 'bw-22', 'bw-17'],
    npcs: [],
    enemies: [],
    uniqueEvents: [],
    quests: [],
    images: {
        mapImage: { alt: '', src: '' },
        combatImage: { alt: '', src: '' },
    },
};

export { breakwater };

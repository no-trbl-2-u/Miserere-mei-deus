/**
 * The Beacon Crags — Act 1, map 3.
 *
 * The third Act 1 map, built on T's mountain plate
 * (`axiomancer-mobile/assets/images/maps/act1-mountains.webp`). The first
 * Act 1 map under `northern-continent`: the Charcoal Wood's stair cave
 * crosses into it with a plain `travel` event. The glacier shrine is the door
 * down into the Lantern Deep.
 *
 * One node per landmark on the plate (`act1-landmarks.json`), and no
 * others. The engine graph is abstract (columns and lanes); the mobile layout
 * places each node on its landmark. The stair comes up on the crag road at the
 * top of the plate, so the columns are bands down the mountain in three lanes
 * (west, middle, east), and the map closes on the glacier shrine in the
 * south-west:
 *
 *   c0  the top pass                                    (arrival)
 *   c1  summit beacon · hanging lake · shepherds' village
 *   c2  crag castle · cliff monastery · mine entrance
 *   c3  ruined chapel · rope bridge · toll gate
 *   c4  mountain inn · arch bridge · gorge falls · quarry · tunnel bridge
 *   c5  the stone gate                                  (the door fight)
 *   c6  the glacier shrine                              (the door, terminal)
 *
 * The door fight holds a column of its own and is the glacier shrine's only
 * way in, so no route reaches the exit past the Death Beholder.
 *
 * Lanes run west to east in every band, so every lateral rib joins two
 * landmarks that are neighbours on the plate. Events use the shipped builders
 * and the caverns' roster and iron: see `MapEvents/content.ts`.
 */

import { MapDefinition } from '../../types';

const beaconCrags: MapDefinition = {
    name: 'beacon-crags',
    continent: 'northern-continent',
    description: 'A fire on the summit tells the valley who is coming. The rope bridge charges for the crossing, and again for the fall.',
    startingNode: {
        id: 'bc-1',
        location: [0, 0],
        connectedNodes: ['bc-2', 'bc-3', 'bc-4'],
    },
    nodes: [
        // ── c0 — the top pass ───────────────────────────────────────────
        { id: 'bc-1',  location: [0, 0],  connectedNodes: ['bc-2', 'bc-3', 'bc-4'] },
        // ── c1 — summit beacon · hanging lake · shepherds' village ──────
        { id: 'bc-2',  location: [1, -1], connectedNodes: ['bc-5', 'bc-3'] },
        { id: 'bc-3',  location: [1, 0],  connectedNodes: ['bc-5', 'bc-6', 'bc-2', 'bc-4'] },
        { id: 'bc-4',  location: [1, 1],  connectedNodes: ['bc-6', 'bc-7', 'bc-3'] },
        // ── c2 — crag castle · cliff monastery · mine entrance ──────────
        { id: 'bc-5',  location: [2, -1], connectedNodes: ['bc-8', 'bc-9', 'bc-6'] },
        { id: 'bc-6',  location: [2, 0],  connectedNodes: ['bc-9', 'bc-10', 'bc-5', 'bc-7'] },
        { id: 'bc-7',  location: [2, 1],  connectedNodes: ['bc-10', 'bc-6'] },
        // ── c3 — ruined chapel · rope bridge · toll gate ────────────────
        { id: 'bc-8',  location: [3, -1], connectedNodes: ['bc-11', 'bc-14', 'bc-9'] },
        { id: 'bc-9',  location: [3, 0],  connectedNodes: ['bc-11', 'bc-12', 'bc-8', 'bc-10'] },
        { id: 'bc-10', location: [3, 1],  connectedNodes: ['bc-12', 'bc-13', 'bc-16', 'bc-9'] },
        // ── c4 — arch bridge · gorge falls · quarry ─────────────────────
        { id: 'bc-11', location: [4, -1], connectedNodes: ['bc-15', 'bc-14', 'bc-12'] },
        { id: 'bc-12', location: [4, 0],  connectedNodes: ['bc-15', 'bc-11', 'bc-13'] },
        { id: 'bc-13', location: [4, 1],  connectedNodes: ['bc-15', 'bc-16', 'bc-12'] },
        // ── c4 (the mountain inn and tunnel bridge flank it) · c5 — the stone gate ──
        { id: 'bc-14', location: [4, -2], connectedNodes: ['bc-15', 'bc-11'] },
        { id: 'bc-15', location: [5, 0],  connectedNodes: ['bc-17'] },
        { id: 'bc-16', location: [4, 2],  connectedNodes: ['bc-15', 'bc-13'] },
        // ── c6 — the glacier shrine. Terminal column: the door. ────────
        { id: 'bc-17', location: [6, 0],  connectedNodes: [] },
    ],
    npcs: [],
    enemies: [],
    uniqueEvents: [],
    quests: [],
    images: {
        mapImage: { alt: '', src: '' },
        combatImage: { alt: '', src: '' },
    },
};

export { beaconCrags };

/**
 * The Lantern Deep — Act 1, map 4.
 *
 * The last Act 1 map, built on T's underworld plate
 * (`axiomancer-mobile/assets/images/maps/act1-underworld.webp`). Under
 * `northern-continent`: the Beacon Crags' glacier shrine is a stair down into
 * the ice, and it comes out here at the surface stair. The deep stair is
 * sealed, like the vault door.
 *
 * One node per landmark on the plate (`act1-landmarks.json`), and no
 * others. The engine graph is abstract (columns and lanes); the mobile layout
 * places each node on its landmark. The stair comes down through the ceiling
 * at the top of the plate, so the columns are bands down through the deep,
 * lanes running west to east, and the map closes on the deep stair in the
 * south-east:
 *
 *   c0  the surface stair                                     (arrival)
 *   c1  ferry landing · drowned temple · north aqueduct · cathedral
 *   c2  west tunnel · crystal grotto · central aqueduct · sleeping giant
 *   c3  market grotto · mushroom forest · ossuary
 *   c4  fortress gate · forge · vault door · east stairs
 *   c5  ruined city                                           (the door fight)
 *   c6  the deep stair                                        (the door, terminal)
 *
 * The door fight holds a column of its own and is the deep stair's only way
 * in, so no route reaches the exit past the Death Beholder.
 *
 * Lanes run west to east in every band, so every lateral rib joins two
 * landmarks that are neighbours on the plate. The vault door is the
 * Labyrinth's door. Events use the shipped builders and the
 * caverns' roster and iron: see `MapEvents/content.ts`.
 */

import { MapDefinition } from '../../types';
import { LANTERN_IRON_QUEST } from '../../quest.library';

const lanternDeep: MapDefinition = {
    name: 'lantern-deep',
    continent: 'northern-continent',
    description: 'Every light below the stair was carried down and paid for. Past the drowned temple, the lanterns stop.',
    startingNode: {
        id: 'ld-1',
        location: [0, 0],
        connectedNodes: ['ld-2', 'ld-3', 'ld-4', 'ld-5'],
    },
    nodes: [
        // ── c0 — the surface stair ──────────────────────────────────────
        { id: 'ld-1',  location: [0, 0],  connectedNodes: ['ld-2', 'ld-3', 'ld-4', 'ld-5'] },
        // ── c1 — ferry landing · drowned temple · north aqueduct · cathedral ──
        { id: 'ld-2',  location: [1, -1], connectedNodes: ['ld-6', 'ld-7', 'ld-3'] },
        { id: 'ld-3',  location: [1, 0],  connectedNodes: ['ld-7', 'ld-8', 'ld-2', 'ld-4'] },
        { id: 'ld-4',  location: [1, 1],  connectedNodes: ['ld-8', 'ld-9', 'ld-3', 'ld-5'] },
        { id: 'ld-5',  location: [1, 2],  connectedNodes: ['ld-9', 'ld-4'] },
        // ── c2 — west tunnel · crystal grotto · central aqueduct · sleeping giant ──
        { id: 'ld-6',  location: [2, -2], connectedNodes: ['ld-10', 'ld-7'] },
        { id: 'ld-7',  location: [2, -1], connectedNodes: ['ld-10', 'ld-11', 'ld-6', 'ld-8'] },
        { id: 'ld-8',  location: [2, 0],  connectedNodes: ['ld-11', 'ld-7', 'ld-9'] },
        { id: 'ld-9',  location: [2, 1],  connectedNodes: ['ld-11', 'ld-12', 'ld-8'] },
        // ── c3 — market grotto · mushroom forest · ossuary ──────────────
        { id: 'ld-10', location: [3, -1], connectedNodes: ['ld-13', 'ld-14', 'ld-11'] },
        { id: 'ld-11', location: [3, 0],  connectedNodes: ['ld-14', 'ld-15', 'ld-10', 'ld-12'] },
        { id: 'ld-12', location: [3, 1],  connectedNodes: ['ld-15', 'ld-17', 'ld-11'] },
        // ── c4 — fortress gate · forge · vault door ─────────────────────
        { id: 'ld-13', location: [4, -1], connectedNodes: ['ld-16', 'ld-14'] },
        { id: 'ld-14', location: [4, 0],  connectedNodes: ['ld-16', 'ld-13', 'ld-15'] },
        { id: 'ld-15', location: [4, 1],  connectedNodes: ['ld-16', 'ld-17', 'ld-14'] },
        // ── c4's east stairs · c5 — the ruined city, the door fight ─────
        { id: 'ld-16', location: [5, 0],  connectedNodes: ['ld-18'] },
        { id: 'ld-17', location: [4, 2],  connectedNodes: ['ld-16', 'ld-15'] },
        // ── c6 — the deep stair. Terminal column: the door. ────────────
        { id: 'ld-18', location: [6, 0],  connectedNodes: [] },
    ],
    npcs: [],
    enemies: [],
    uniqueEvents: [],
    // Given at the north aqueduct (ld-4): `World/quest.library.ts`.
    quests: [LANTERN_IRON_QUEST],
    images: {
        mapImage: { alt: '', src: '' },
        combatImage: { alt: '', src: '' },
    },
};

export { lanternDeep };

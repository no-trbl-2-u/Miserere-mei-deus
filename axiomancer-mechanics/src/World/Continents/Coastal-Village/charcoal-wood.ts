/**
 * The Charcoal Wood — Act 1, map 2.
 *
 * The second Act 1 map, built on T's forest plate
 * (`axiomancer-mobile/assets/images/maps/act1-forest.webp`). The Breakwater's
 * river bridge leads here; the stair cave is the door on to the Beacon
 * Crags.
 *
 * One node per landmark on the plate (`act1-landmarks.json`), and no
 * others. The engine graph is abstract (columns and lanes); the mobile layout
 * places each node on its landmark. The player comes in over the river bridge
 * on the plate's west edge, so the columns are rings spreading east and north
 * from there, and the map closes on the carved stair in the southern
 * cliff:
 *
 *   c0  the river bridge                                (arrival)
 *   c1  ruined tower · ruined shrine · watermill · gibbet · west cave
 *   c2  stone circle · great tree · hunting lodge · footbridge
 *   c3  stilt cottage · root graveyard · hermit's hut · charcoal clearing
 *   c4  woodcutters' camp · rock chapel · well · east cave
 *   c5  the wayside cross                               (the door fight)
 *   c6  the stair cave                                  (the door, terminal)
 *
 * The door fight holds a column of its own and is the stair cave's only way
 * in, so no route reaches the exit past the Death Beholder.
 *
 * Lanes run in plate order around each ring, so every lateral rib joins
 * two landmarks that are neighbours on the plate. Events use the shipped
 * builders and the northern forest's roster and materials: see
 * `MapEvents/content.ts`.
 */

import { MapDefinition } from '../../types';

const charcoalWood: MapDefinition = {
    name: 'charcoal-wood',
    continent: 'coastal-continent',
    description: 'Burners work the clearings and sell the smoke by the sack. Three caves open in the south cliff; nobody sells the way back.',
    startingNode: {
        id: 'cw-1',
        location: [0, 0],
        connectedNodes: ['cw-2', 'cw-3', 'cw-4', 'cw-5', 'cw-6'],
    },
    nodes: [
        // ── c0 — the river bridge ───────────────────────────────────────
        { id: 'cw-1',  location: [0, 0],  connectedNodes: ['cw-2', 'cw-3', 'cw-4', 'cw-5', 'cw-6'] },
        // ── c1 — ruined tower · ruined shrine · watermill · gibbet · west cave ──
        { id: 'cw-2',  location: [1, 2],  connectedNodes: ['cw-7', 'cw-8', 'cw-3'] },
        { id: 'cw-3',  location: [1, 1],  connectedNodes: ['cw-7', 'cw-8', 'cw-2', 'cw-4'] },
        { id: 'cw-4',  location: [1, 0],  connectedNodes: ['cw-8', 'cw-9', 'cw-3', 'cw-5'] },
        { id: 'cw-5',  location: [1, -1], connectedNodes: ['cw-9', 'cw-10', 'cw-4', 'cw-6'] },
        { id: 'cw-6',  location: [1, -2], connectedNodes: ['cw-10', 'cw-5'] },
        // ── c2 — stone circle · great tree · hunting lodge · footbridge ──
        { id: 'cw-7',  location: [2, 2],  connectedNodes: ['cw-11', 'cw-12', 'cw-8'] },
        { id: 'cw-8',  location: [2, 1],  connectedNodes: ['cw-12', 'cw-13', 'cw-7', 'cw-9'] },
        { id: 'cw-9',  location: [2, 0],  connectedNodes: ['cw-13', 'cw-14', 'cw-8', 'cw-10'] },
        { id: 'cw-10', location: [2, -1], connectedNodes: ['cw-14', 'cw-9'] },
        // ── c3 — stilt cottage · root graveyard · hermit's hut · charcoal clearing ──
        { id: 'cw-11', location: [3, 2],  connectedNodes: ['cw-16', 'cw-18', 'cw-12'] },
        { id: 'cw-12', location: [3, 1],  connectedNodes: ['cw-16', 'cw-18', 'cw-19', 'cw-11', 'cw-13'] },
        { id: 'cw-13', location: [3, 0],  connectedNodes: ['cw-15', 'cw-16', 'cw-12', 'cw-14'] },
        { id: 'cw-14', location: [3, -1], connectedNodes: ['cw-15', 'cw-16', 'cw-13'] },
        // ── c4 — woodcutters' camp · rock chapel · well · east cave ─────
        { id: 'cw-15', location: [4, 2],  connectedNodes: ['cw-17', 'cw-16'] },
        { id: 'cw-16', location: [4, 1],  connectedNodes: ['cw-17', 'cw-15', 'cw-18'] },
        { id: 'cw-17', location: [5, 0],  connectedNodes: ['cw-20'] }, // c5 — the wayside cross, the door fight
        { id: 'cw-18', location: [4, -1], connectedNodes: ['cw-17', 'cw-19'] },
        { id: 'cw-19', location: [4, -2], connectedNodes: ['cw-17', 'cw-18'] },
        // ── c6 — the stair cave. Terminal column: the door. ────────────
        { id: 'cw-20', location: [6, 0],  connectedNodes: [] },
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

export { charcoalWood };

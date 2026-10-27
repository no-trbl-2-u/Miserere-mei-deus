/**
 * The Breakwater — Act 1, map 1.
 *
 * The first of the four Act 1 maps built from T's plates
 * (`axiomancer-mobile/assets/images/maps/act1-coast.webp`). A new game
 * starts here; the river bridge is the door on to the Charcoal Wood.
 *
 * One node per landmark on the plate (`act1-landmarks.json`), and no
 * others. The engine graph is abstract (columns and lanes); the mobile layout
 * places each node on its landmark. The columns are rings spreading out from
 * the windmill near the plate's centre, so on the plate the map opens in every
 * direction before it closes on the east bank:
 *
 *   c0  the windmill                                   (start)
 *   c1  crane quay · gallows · foothill pass · smugglers' cove
 *   c2  sea fort · south pier · north pier · customs house · walled manor
 *   c3  shipwreck · sea cave · harbour town
 *   c4  lighthouse · clifftop chapel · fishing hamlet
 *   c5  the watchtower                                 (the last fight)
 *   c6  the river bridge                               (the door, terminal)
 *
 * Lanes run in plate order around each ring, so every lateral rib joins
 * two landmarks that are neighbours on the plate. Events use the shared
 * Act 1 pool builders: see `MapEvents/content.ts`.
 */

import { MapDefinition } from '../../types';
import { WATCHTOWER_LAMP_QUEST } from '../../quest.library';

const breakwater: MapDefinition = {
    name: 'breakwater',
    continent: 'coastal-continent',
    description: 'A walled harbour on a storm coast. Every pier charges for the calm. The wreck under the lighthouse did not pay.',
    startingNode: {
        id: 'bw-1',
        location: [0, 0],
        connectedNodes: ['bw-2', 'bw-3', 'bw-4', 'bw-5'],
    },
    nodes: [
        // ── c0 — the windmill ────────────────────────────────────────
        { id: 'bw-1',  location: [0, 0],  connectedNodes: ['bw-2', 'bw-3', 'bw-4', 'bw-5'] },
        // ── c1 — crane quay · gallows · foothill pass · smugglers' cove ──
        { id: 'bw-2',  location: [1, 2],  connectedNodes: ['bw-7', 'bw-8', 'bw-9', 'bw-3'] },
        { id: 'bw-3',  location: [1, 1],  connectedNodes: ['bw-9', 'bw-10', 'bw-2', 'bw-4'] },
        { id: 'bw-4',  location: [1, 0],  connectedNodes: ['bw-10', 'bw-3', 'bw-5'] },
        { id: 'bw-5',  location: [1, -1], connectedNodes: ['bw-6', 'bw-7', 'bw-4'] },
        // ── c2 — sea fort · south pier · north pier · customs house · manor ──
        { id: 'bw-6',  location: [2, 2],  connectedNodes: ['bw-11', 'bw-7'] },
        { id: 'bw-7',  location: [2, 1],  connectedNodes: ['bw-11', 'bw-12', 'bw-6', 'bw-8'] },
        { id: 'bw-8',  location: [2, 0],  connectedNodes: ['bw-12', 'bw-11', 'bw-7', 'bw-9'] },
        { id: 'bw-9',  location: [2, -1], connectedNodes: ['bw-13', 'bw-12', 'bw-8', 'bw-10'] },
        { id: 'bw-10', location: [2, -2], connectedNodes: ['bw-13', 'bw-9'] },
        // ── c3 — shipwreck · sea cave · harbour town ─────────────────
        { id: 'bw-11', location: [3, 1],  connectedNodes: ['bw-14', 'bw-12'] },
        { id: 'bw-12', location: [3, 0],  connectedNodes: ['bw-14', 'bw-15', 'bw-11', 'bw-13'] },
        { id: 'bw-13', location: [3, -1], connectedNodes: ['bw-15', 'bw-16', 'bw-12'] },
        // ── c4 — lighthouse · clifftop chapel · fishing hamlet ───────
        { id: 'bw-14', location: [4, 1],  connectedNodes: ['bw-17', 'bw-15'] },
        { id: 'bw-15', location: [4, 0],  connectedNodes: ['bw-17', 'bw-14', 'bw-16'] },
        { id: 'bw-16', location: [4, -1], connectedNodes: ['bw-17', 'bw-15'] },
        // ── c5 — the watchtower ──────────────────────────────────────
        { id: 'bw-17', location: [5, 0],  connectedNodes: ['bw-18'] },
        // ── c6 — the river bridge. Terminal column: the door. ────────
        { id: 'bw-18', location: [6, 0],  connectedNodes: [] },
    ],
    npcs: [],
    enemies: [],
    uniqueEvents: [],
    // Given at the sea cave (bw-12): `World/quest.library.ts`.
    quests: [WATCHTOWER_LAMP_QUEST],
    images: {
        mapImage: { alt: '', src: '' },
        combatImage: { alt: '', src: '' },
    },
};

export { breakwater };

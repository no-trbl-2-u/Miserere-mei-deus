import { ACT1_PLATES } from '@/assets/images/maps';
import landmarks from '@/assets/images/maps/act1-landmarks.json';
import type { MapLayout, MapSheet } from './types';

/**
 * The Breakwater — Act 1, map 1. Drawn ON its plate:
 * the coast plate is the map, and every node sits on one of the
 * plate's landmarks, read from `act1-landmarks.json`.
 *
 * The sheet is the plate's own square, 1000 units a side, rendered 2.4x into a
 * 2400px canvas: the plate's native size, so it is shown 1:1 at full zoom, and
 * even at the camera's 0.6 zoom floor it spans 1440px — wider than a desktop
 * chart, not only a phone's. A smaller scale lets a desktop opening fit show
 * the plate's edge and black beyond it. The plate
 * reads near full strength and the procedural chart texture is off: invented
 * contour hills over drawn terrain would contradict it.
 *
 * The engine graph (`Continents/Coastal-Village/breakwater-chapter.ts`) is T's
 * Chapter 1 map: 44 nodes branching out from the windmill to the sea keep in
 * the west, the cove through the sea cave, the lighthouse in the north and the
 * river bridge in the east. Each node sits on its own coast mark, the board's
 * plate position (`braindump/2026-10-28-breakwater-chapter-1-map.md`).
 * Positions only; kind + edges come from the engine (`@mechanics`).
 */

/** The Act 1 sheet: the plate's square at 1000 units, rendered 2.4x (the plate's native 2400px). */
export const ACT1_SHEET_SIZE = { width: 1000, height: 1000, scale: 2.4 } as const;

const sheet: MapSheet = {
    ...ACT1_SHEET_SIZE,
    backdrop: ACT1_PLATES.coast,
    plateOpacity: 0.85,
    chartTexture: false,
};

/** Node id → the mark it sits on. Every coast mark appears exactly once. */
export const BREAKWATER_LANDMARKS: Readonly<Record<string, string>> = {
    'bw-w1': 'windmill',
    'bw-w2': 'gallows-crossroads',
    'bw-w3': 'field-road',
    'bw-w4': 'west-cliff-road',
    'bw-w5': 'keep-causeway',
    'bw-k1': 'keep-gate',
    'bw-k2': 'sea-keep',
    'bw-h1': 'quay-end',
    'bw-h2': 'crane-quay',
    'bw-h3': 'harbour-light-pier',
    'bw-h4': 'the-wreck',
    'bw-h5': 'moored-ship',
    'bw-h6': 'sea-cave-mouth',
    'bw-h7': 'long-pier',
    'bw-h8': 'pier-end',
    'bw-c0': 'cave-face',
    'bw-c1': 'sea-cave',
    'bw-c2': 'fishermens-camp',
    'bw-t1': 'harbour-steps',
    'bw-t2': 'bridge-approach',
    'bw-t3': 'town-gate',
    'bw-t4': 'harbour-town',
    'bw-t5': 'back-lanes',
    'bw-t6': 'upper-town',
    'bw-b1': 'river-bridge',
    'bw-b2': 'far-bank',
    'bw-l1': 'cliff-crossroads',
    'bw-l2': 'clifftop-chapel',
    'bw-l3': 'cliff-road',
    'bw-l4': 'lighthouse-path',
    'bw-l5': 'lighthouse',
    'bw-d1': 'fishing-hamlet',
    'bw-d2': 'boat-sheds',
    'bw-d3': 'hamlet-rise',
    'bw-d4': 'tower-switchbacks',
    'bw-d5': 'old-watchtower',
    'bw-m1': 'south-fork',
    'bw-m2': 'river-meadow',
    'bw-m3': 'riverbank',
    'bw-m4': 'manor-road',
    'bw-m5': 'walled-manor',
    'bw-p1': 'foothills',
    'bw-p2': 'mountain-path',
    'bw-p3': 'high-pass',
};

/** Where a landmark sits on the sheet: its plate fraction times the sheet size. */
function at(nodeId: string): { x: number; y: number } {
    const id = BREAKWATER_LANDMARKS[nodeId];
    const mark = landmarks['act1-coast'].find((l) => l.id === id);
    if (!mark) throw new Error(`breakwater layout: ${nodeId} names unknown landmark '${id}'`);
    return {
        x: Math.round(mark.x * ACT1_SHEET_SIZE.width),
        y: Math.round(mark.y * ACT1_SHEET_SIZE.height),
    };
}

export const breakwaterLayout: MapLayout = {
    mapId: 'breakwater',
    continent: 'CONTINENT · COASTAL',
    region: 'The Breakwater',
    // Ordinal only — no node/path count. Act 1, map 1 of 4.
    regionProgress: 'Map i of iv',
    sheet,
    nodes: [
        // ── the windmill and the west ──
        { id: 'bw-w1', ...at('bw-w1'), label: 'The Windmill', description: 'Sails lashed down. The sea is loud below.' },
        { id: 'bw-w2', ...at('bw-w2'), label: 'The Gallows Crossroads', description: '[content] Gallows crossroads.' },
        { id: 'bw-w3', ...at('bw-w3'), label: 'The Field Road', description: '[content] Field road.' },
        { id: 'bw-w4', ...at('bw-w4'), label: 'The West Cliff Road', description: '[content] West cliff road.' },
        { id: 'bw-w5', ...at('bw-w5'), label: 'The Keep Causeway', description: '[content] Keep causeway.' },
        // ── the keep ──
        { id: 'bw-k1', ...at('bw-k1'), label: 'The Keep Gate', description: '[content] Keep gate.' },
        { id: 'bw-k2', ...at('bw-k2'), label: 'The Sea Keep', description: '[content] Sea keep.' },
        // ── the harbour ──
        { id: 'bw-h1', ...at('bw-h1'), label: 'The Quay End', description: '[content] Quay end.' },
        { id: 'bw-h2', ...at('bw-h2'), label: 'The Crane Quay', description: 'Cargo cranes over black mud. Something under it moves.' },
        { id: 'bw-h3', ...at('bw-h3'), label: 'The Harbour Light Pier', description: '[content] Harbour light pier.' },
        { id: 'bw-h4', ...at('bw-h4'), label: 'The Wreck', description: 'Kelp has taken her. Mind the hull.' },
        { id: 'bw-h5', ...at('bw-h5'), label: 'The Moored Ship', description: '[content] Moored ship.' },
        { id: 'bw-h6', ...at('bw-h6'), label: 'The Sea Cave Mouth', description: '[content] Sea cave mouth.' },
        { id: 'bw-h7', ...at('bw-h7'), label: 'The Long Pier', description: '[content] Long pier.' },
        { id: 'bw-h8', ...at('bw-h8'), label: 'The Pier End', description: '[content] Pier end.' },
        // ── the cove, through the sea cave ──
        { id: 'bw-c0', ...at('bw-c0'), label: 'The Cave Face', description: '[content] Cave face.' },
        { id: 'bw-c1', ...at('bw-c1'), label: 'The Sea Cave', description: 'The tide comes in faster than you leave.' },
        { id: 'bw-c2', ...at('bw-c2'), label: 'The Fishermen’s Camp', description: '[content] Fishermen’s camp.' },
        // ── the town ──
        { id: 'bw-t1', ...at('bw-t1'), label: 'The Harbour Steps', description: '[content] Harbour steps.' },
        { id: 'bw-t2', ...at('bw-t2'), label: 'The Bridge Approach', description: '[content] Bridge approach.' },
        { id: 'bw-t3', ...at('bw-t3'), label: 'The Town Gate', description: '[content] Town gate.' },
        { id: 'bw-t4', ...at('bw-t4'), label: 'The Harbour Town', description: 'Warm, loud, and paid for in advance.' },
        { id: 'bw-t5', ...at('bw-t5'), label: 'The Back Lanes', description: '[content] Back lanes.' },
        { id: 'bw-t6', ...at('bw-t6'), label: 'The Upper Town', description: '[content] Upper town.' },
        // ── the bridge ──
        { id: 'bw-b1', ...at('bw-b1'), label: 'The River Bridge', description: 'A toll-house with no keeper. Across it, a wood full of smoke.' },
        { id: 'bw-b2', ...at('bw-b2'), label: 'The Far Bank', description: '[content] Far bank.' },
        // ── the lighthouse cliffs ──
        { id: 'bw-l1', ...at('bw-l1'), label: 'The Cliff Crossroads', description: '[content] Cliff crossroads.' },
        { id: 'bw-l2', ...at('bw-l2'), label: 'The Clifftop Chapel', description: 'An empty chapel over the sea.' },
        { id: 'bw-l3', ...at('bw-l3'), label: 'The Cliff Road', description: '[content] Cliff road.' },
        { id: 'bw-l4', ...at('bw-l4'), label: 'The Lighthouse Path', description: '[content] Lighthouse path.' },
        { id: 'bw-l5', ...at('bw-l5'), label: 'The Lighthouse', description: 'The light still turns. Mind the stair.' },
        // ── the hamlet and the watchtower ──
        { id: 'bw-d1', ...at('bw-d1'), label: 'The Fishing Hamlet', description: 'Fish dry on the racks. Nobody is watching them.' },
        { id: 'bw-d2', ...at('bw-d2'), label: 'The Boat Sheds', description: '[content] Boat sheds.' },
        { id: 'bw-d3', ...at('bw-d3'), label: 'The Hamlet Rise', description: '[content] Hamlet rise.' },
        { id: 'bw-d4', ...at('bw-d4'), label: 'The Tower Switchbacks', description: '[content] Tower switchbacks.' },
        { id: 'bw-d5', ...at('bw-d5'), label: 'The Old Watchtower', description: '[content] Old watchtower.' },
        // ── the manor road ──
        { id: 'bw-m1', ...at('bw-m1'), label: 'The South Fork', description: '[content] South fork.' },
        { id: 'bw-m2', ...at('bw-m2'), label: 'The River Meadow', description: '[content] River meadow.' },
        { id: 'bw-m3', ...at('bw-m3'), label: 'The Riverbank', description: '[content] Riverbank.' },
        { id: 'bw-m4', ...at('bw-m4'), label: 'The Manor Road', description: '[content] Manor road.' },
        { id: 'bw-m5', ...at('bw-m5'), label: 'The Walled Manor', description: 'A bell rings in the yard. Nobody is at service.' },
        // ── the pass ──
        { id: 'bw-p1', ...at('bw-p1'), label: 'The Foothills', description: '[content] Foothills.' },
        { id: 'bw-p2', ...at('bw-p2'), label: 'The Mountain Path', description: '[content] Mountain path.' },
        { id: 'bw-p3', ...at('bw-p3'), label: 'The High Pass', description: '[content] High pass.' },
    ],
};

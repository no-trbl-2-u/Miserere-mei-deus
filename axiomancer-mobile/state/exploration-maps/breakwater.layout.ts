import { ACT1_PLATES } from '@/assets/images/maps';
import { ACT1_FADED_PLATES } from '@/assets/images/map-fog';
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
 * Chapter 1 map: 43 nodes branching out from the windmill to the sea keep in
 * the west, the cove through the sea cave, the lighthouse in the north and the
 * river bridge in the east. Each node sits on its own coast mark, the board's
 * plate position (`plan/116-bw1-breakwater-rebuild.md`).
 * Positions only; kind + edges come from the engine (`@mechanics`).
 */

/** The Act 1 sheet: the plate's square at 1000 units, rendered 2.4x (the plate's native 2400px). */
export const ACT1_SHEET_SIZE = { width: 1000, height: 1000, scale: 2.4 } as const;

const sheet: MapSheet = {
    ...ACT1_SHEET_SIZE,
    backdrop: ACT1_PLATES.coast,
    fadedBackdrop: ACT1_FADED_PLATES.coast,
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
    'bw-p3': 'mountain-path',
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
    // Map blurbs M-01 to M-33: one random candidate (a or b) per slot from the open
    // ballot `plan/ballots/narrator-chapter1-5.ballot.html`, put in the game on T's
    // word (2026-11-23) while the ballot stays open; T's verdicts replace them.
    nodes: [
        // ── the windmill and the west ──
        { id: 'bw-w1', ...at('bw-w1'), label: 'The Windmill', description: 'Sails lashed down. The sea is loud below.' },
        { id: 'bw-w2', ...at('bw-w2'), label: 'The Gallows Crossroads', description: 'No one remembers the law it served. The last rope rotted through on its own.' },
        { id: 'bw-w3', ...at('bw-w3'), label: 'The Field Road', description: 'The barley rotted in the ear this wet year. Nobody has come to cut it.' },
        { id: 'bw-w4', ...at('bw-w4'), label: 'The West Cliff Road', description: 'A ledge out of the wind. The gulls below have picked the last sleeper clean.' },
        { id: 'bw-w5', ...at('bw-w5'), label: 'The Keep Causeway', description: 'Under water twice a day. Some who crossed on the turn are on it still.' },
        // ── the keep ──
        { id: 'bw-k1', ...at('bw-k1'), label: 'The Keep Gate', description: 'The gate keeps its hours by the book. The book forgets those within.' },
        { id: 'bw-k2', ...at('bw-k2'), label: 'The Sea Keep', description: 'The harbour\'s lamp on a bare floor. Thirty years of it wore him thin.' },
        // ── the harbour ──
        { id: 'bw-h1', ...at('bw-h1'), label: 'The Quay End', description: 'Men coil line in the dark by feel. Two of them lost fingers to the winter.' },
        { id: 'bw-h2', ...at('bw-h2'), label: 'The Crane Quay', description: 'Cargo cranes over black mud. Something under it moves.' },
        { id: 'bw-h3', ...at('bw-h3'), label: 'The Harbour Light Pier', description: 'Each house that voted took its share. They drink to the sale each year.' },
        { id: 'bw-h4', ...at('bw-h4'), label: 'The Wreck', description: 'Kelp has taken her. Mind the hull.' },
        { id: 'bw-h5', ...at('bw-h5'), label: 'The Moored Ship', description: 'In the tally, a boy\'s name with his boots beside it, and the house that took them.' },
        { id: 'bw-h6', ...at('bw-h6'), label: 'The Sea Cave Mouth', description: 'The sea runs into the cliff, and does not always bring back what it took.' },
        { id: 'bw-h7', ...at('bw-h7'), label: 'The Long Pier', description: 'The pier keeps one rule, cargo first. The town comes out to watch.' },
        { id: 'bw-h8', ...at('bw-h8'), label: 'The Pier End', description: 'What the pier lets go washes up here. Mothers look, and do not stay.' },
        // ── the cove, through the sea cave ──
        { id: 'bw-c0', ...at('bw-c0'), label: 'The Cave Face', description: 'Still water under the cliff. Its fishermen went down with their pots.' },
        { id: 'bw-c1', ...at('bw-c1'), label: 'The Sea Cave', description: 'The tide comes in faster than you leave.' },
        { id: 'bw-c2', ...at('bw-c2'), label: 'The Fishermen’s Camp', description: 'The camp tallies its drowned on a board. Each winter it runs short.' },
        // ── the town ──
        { id: 'bw-t1', ...at('bw-t1'), label: 'The Harbour Steps', description: 'Steps worn hollow by the town going down to see what the sea has brought.' },
        { id: 'bw-t2', ...at('bw-t2'), label: 'The Bridge Approach', description: 'The bridge is shut with a chain. Those who waited for it sleep under it.' },
        { id: 'bw-t3', ...at('bw-t3'), label: 'The Town Gate', description: 'The gate stands open. A year of poor wrecks left nothing to keep out.' },
        { id: 'bw-t4', ...at('bw-t4'), label: 'The Harbour Town', description: 'Warm, loud, and paid for in advance.' },
        { id: 'bw-t5', ...at('bw-t5'), label: 'The Back Lanes', description: 'Lanes behind the shutters. The hungry here are polite about it.' },
        { id: 'bw-t6', ...at('bw-t6'), label: 'The Upper Town', description: 'Good houses, every window turned to the keep. None looks at the sea.' },
        // ── the bridge ──
        { id: 'bw-b1', ...at('bw-b1'), label: 'The River Bridge', description: 'A toll-house with no keeper. Across it, a wood full of smoke.' },
        { id: 'bw-b2', ...at('bw-b2'), label: 'The Far Bank', description: 'The lighthouse is still dark. You did all this, and nothing changed.' },
        // ── the lighthouse cliffs ──
        { id: 'bw-l1', ...at('bw-l1'), label: 'The Cliff Crossroads', description: 'Three ways over the cliff. The wind takes the same one every time.' },
        { id: 'bw-l2', ...at('bw-l2'), label: 'The Clifftop Chapel', description: 'An empty chapel over the sea.' },
        { id: 'bw-l3', ...at('bw-l3'), label: 'The Cliff Road', description: 'The dark tower ahead. Men have rested here for the cold and not got up.' },
        { id: 'bw-l4', ...at('bw-l4'), label: 'The Lighthouse Path', description: 'The path to a tower whose lamp was sold. Someone walks it with a lantern.' },
        { id: 'bw-l5', ...at('bw-l5'), label: 'The Lighthouse', description: 'The light still turns. Mind the stair.' },
        // ── the hamlet and the watchtower ──
        { id: 'bw-d1', ...at('bw-d1'), label: 'The Fishing Hamlet', description: 'Fish dry on the racks. Nobody is watching them.' },
        { id: 'bw-d2', ...at('bw-d2'), label: 'The Boat Sheds', description: 'Boats turned keel up for winter. Some wait on men the sea has kept.' },
        { id: 'bw-d3', ...at('bw-d3'), label: 'The Hamlet Rise', description: 'A rise above the hamlet. From here the women watch for boats a season late.' },
        { id: 'bw-d4', ...at('bw-d4'), label: 'The Tower Switchbacks', description: 'The path doubles back up to the tower. Rain has taken the edge in places.' },
        { id: 'bw-d5', ...at('bw-d5'), label: 'The Old Watchtower', description: 'The tower watched for a relief that never came. Its log ends in weather.' },
        // ── the manor road ──
        { id: 'bw-m1', ...at('bw-m1'), label: 'The South Fork', description: 'The road splits for the river and the manor. Both were here before the town.' },
        { id: 'bw-m2', ...at('bw-m2'), label: 'The River Meadow', description: 'Each spring the river floods here and takes the lambs that cannot climb.' },
        { id: 'bw-m3', ...at('bw-m3'), label: 'The Riverbank', description: 'The river gives up what it carried here. Sometimes a man from upstream.' },
        { id: 'bw-m4', ...at('bw-m4'), label: 'The Manor Road', description: 'A walled road to lit windows. A candle costs a week of bread.' },
        { id: 'bw-m5', ...at('bw-m5'), label: 'The Walled Manor', description: 'A bell rings in the yard. Nobody is at service.' },
        // ── the pass ──
        { id: 'bw-p1', ...at('bw-p1'), label: 'The Foothills', description: 'The foothills climb to the pass. The men at the top keep fee and boots.' },
        { id: 'bw-p3', ...at('bw-p3'), label: 'The High Pass', description: 'Those who tried to leave the coast were turned back here for want of the toll.' },
    ],
};

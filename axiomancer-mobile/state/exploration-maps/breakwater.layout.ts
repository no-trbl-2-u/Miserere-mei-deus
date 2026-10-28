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
 * The engine graph (`Continents/Coastal-Village/breakwater.ts`) runs in rings
 * out from the windmill near the plate's centre, so the map opens in every
 * direction before closing on the river bridge in the east. Positions only;
 * kind + edges come from the engine (`@mechanics`).
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
    'bw-1':  'windmill',
    'bw-2':  'crane-quay',
    'bw-3':  'gallows',
    'bw-4':  'foothill-pass',
    'bw-5':  'smugglers-cove',
    'bw-6':  'sea-fort',
    'bw-7':  'south-pier',
    'bw-8':  'north-pier',
    'bw-9':  'customs-house',
    'bw-10': 'walled-manor',
    'bw-11': 'shipwreck',
    'bw-12': 'sea-cave',
    'bw-13': 'harbour-town',
    'bw-14': 'lighthouse',
    'bw-15': 'clifftop-chapel',
    'bw-16': 'fishing-hamlet',
    'bw-17': 'watchtower',
    'bw-18': 'river-bridge',
    // The questline's four quest markers (QL1d), each on its own mark beside
    // its anchor; T reviews the spots at the Nov 3 map review.
    'bw-19': 'quest-windmill',
    'bw-20': 'quest-customs-house',
    'bw-21': 'quest-south-pier',
    'bw-22': 'quest-chapel-road',
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
        // ── c0 — the windmill: where a new game starts ──
        { id: 'bw-1',  ...at('bw-1'),  label: 'The Windmill', description: 'Sails lashed down. The sea is loud below.' },
        // ── c1 ──
        { id: 'bw-2',  ...at('bw-2'),  label: 'The Crane Quay', description: 'Cargo cranes over black mud. Something under it moves.' },
        { id: 'bw-3',  ...at('bw-3'),  label: 'Gallows Hill', description: 'Built to be seen from the water. The shale is loose.' },
        { id: 'bw-4',  ...at('bw-4'),  label: 'The Foothill Pass', description: 'The coast road climbs away inland. Wrack piles at its foot.' },
        { id: 'bw-5',  ...at('bw-5'),  label: 'Smugglers’ Cove', description: 'Boats beached under the cliff. Their owners are elsewhere.' },
        // ── c2 ──
        { id: 'bw-6',  ...at('bw-6'),  label: 'The Sea Fort', description: 'A ruin on a tidal island. Something keeps its wall.' },
        { id: 'bw-7',  ...at('bw-7'),  label: 'The South Pier', description: 'Ships at their moorings. Shillings in the pilings.' },
        { id: 'bw-8',  ...at('bw-8'),  label: 'The North Pier', description: 'A beacon at the end. A voice on a mooring post.' },
        { id: 'bw-9',  ...at('bw-9'),  label: 'The Customs House', description: 'Rooms by the night. The clerk takes shillings, not names.' },
        { id: 'bw-10', ...at('bw-10'), label: 'The Walled Manor', description: 'A bell rings in the yard. Nobody is at service.' },
        // ── c3 ──
        { id: 'bw-11', ...at('bw-11'), label: 'The Wreck', description: 'Kelp has taken her. Cut what you can carry.' },
        { id: 'bw-12', ...at('bw-12'), label: 'The Sea Cave', description: 'The tide comes in faster than you leave.' },
        { id: 'bw-13', ...at('bw-13'), label: 'The Harbour Town', description: 'Warm, loud, and paid for in advance.' },
        // ── c4 ──
        { id: 'bw-14', ...at('bw-14'), label: 'The Lighthouse', description: 'The light still turns. Mind the stair.' },
        { id: 'bw-15', ...at('bw-15'), label: 'The Clifftop Chapel', description: 'An empty chapel over the sea. The poor box is not.' },
        { id: 'bw-16', ...at('bw-16'), label: 'The Fishing Hamlet', description: 'Fish dry on the racks. Nobody is watching them.' },
        // ── c5 — the last fight ──
        { id: 'bw-17', ...at('bw-17'), label: 'The Watchtower', description: 'The lamp is lit. Its keeper watches the road.' },
        // ── c6 — the door ──
        { id: 'bw-18', ...at('bw-18'), label: 'The River Bridge', description: 'A toll-house with no keeper. Across it, a wood full of smoke.' },
        // ── the questline's four quest markers (placeholder copy, T's on Nov 10) ──
        { id: 'bw-19', ...at('bw-19'), label: '[content] The Windmill Marker', description: '[content] Someone has left word here.' },
        { id: 'bw-20', ...at('bw-20'), label: '[content] The Customs Marker', description: '[content] The word goes on.' },
        { id: 'bw-21', ...at('bw-21'), label: '[content] The Pier Marker', description: '[content] The word goes on.' },
        { id: 'bw-22', ...at('bw-22'), label: '[content] The Chapel Road Marker', description: '[content] The watchtower is close.' },
    ],
};

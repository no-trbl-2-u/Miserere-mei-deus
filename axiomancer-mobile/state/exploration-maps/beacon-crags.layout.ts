import { ACT1_PLATES } from '@/assets/images/maps';
import { ACT1_FADED_PLATES } from '@/assets/images/map-fog';
import landmarks from '@/assets/images/maps/act1-landmarks.json';
import { ACT1_SHEET_SIZE } from './breakwater.layout';
import type { MapLayout, MapSheet } from './types';

/**
 * The Beacon Crags — Act 1, map 3. Drawn on the mountain plate
 * the way the Charcoal Wood is drawn on the forest: every node sits on one
 * of the plate's landmarks, read from `act1-landmarks.json`, on the shared
 * Act 1 sheet (`ACT1_SHEET_SIZE`, see `breakwater.layout.ts` for the sizing).
 *
 * The engine graph (`Continents/Northern-Continent/beacon-crags.ts`) comes up
 * the stair on to the crag road at the top of the plate and runs down the
 * mountain in three lanes, closing on the glacier shrine in the south-west,
 * whose stair goes down into the Lantern Deep.
 * Positions only; kind + edges come from the engine (`@mechanics`).
 */

const sheet: MapSheet = {
    ...ACT1_SHEET_SIZE,
    backdrop: ACT1_PLATES.mountains,
    fadedBackdrop: ACT1_FADED_PLATES.mountains,
    plateOpacity: 0.85,
    chartTexture: false,
};

/** Node id → the landmark it sits on. Every mountain landmark appears exactly once. */
export const BEACON_CRAGS_LANDMARKS: Readonly<Record<string, string>> = {
    'bc-1':  'top-pass',
    'bc-2':  'summit-beacon',
    'bc-3':  'hanging-lake',
    'bc-4':  'shepherds-village',
    'bc-5':  'crag-castle',
    'bc-6':  'cliff-monastery',
    'bc-7':  'mine-entrance',
    'bc-8':  'ruined-chapel',
    'bc-9':  'rope-bridge',
    'bc-10': 'toll-gate',
    'bc-11': 'arch-bridge',
    'bc-12': 'gorge-falls',
    'bc-13': 'quarry',
    'bc-14': 'mountain-inn',
    'bc-15': 'stone-gate',
    'bc-16': 'tunnel-bridge',
    'bc-17': 'glacier-shrine',
};

/** Where a landmark sits on the sheet: its plate fraction times the sheet size. */
function at(nodeId: string): { x: number; y: number } {
    const id = BEACON_CRAGS_LANDMARKS[nodeId];
    const mark = landmarks['act1-mountains'].find((l) => l.id === id);
    if (!mark) throw new Error(`beacon-crags layout: ${nodeId} names unknown landmark '${id}'`);
    return {
        x: Math.round(mark.x * ACT1_SHEET_SIZE.width),
        y: Math.round(mark.y * ACT1_SHEET_SIZE.height),
    };
}

export const beaconCragsLayout: MapLayout = {
    mapId: 'beacon-crags',
    continent: 'CONTINENT · NORTHERN',
    region: 'The Beacon Crags',
    // Ordinal only — no node/path count. Act 1, map 3 of 4.
    regionProgress: 'Map iii of iv',
    sheet,
    nodes: [
        // ── c0 — the top pass: arrival up the Charcoal Wood's stair ──
        { id: 'bc-1',  ...at('bc-1'),  label: 'The Top Pass', description: '[content] The Top Pass.' },
        // ── c1 ──
        { id: 'bc-2',  ...at('bc-2'),  label: 'The Summit Beacon', description: '[content] The Summit Beacon.' },
        { id: 'bc-3',  ...at('bc-3'),  label: 'The Hanging Lake', description: '[content] The Hanging Lake.' },
        { id: 'bc-4',  ...at('bc-4'),  label: 'The Shepherds’ Village', description: '[content] The Shepherds’ Village.' },
        // ── c2 ──
        { id: 'bc-5',  ...at('bc-5'),  label: 'The Crag Castle', description: '[content] The Crag Castle.' },
        { id: 'bc-6',  ...at('bc-6'),  label: 'The Cliff Monastery', description: '[content] The Cliff Monastery.' },
        { id: 'bc-7',  ...at('bc-7'),  label: 'The Mine Entrance', description: '[content] The Mine Entrance.' },
        // ── c3 ──
        { id: 'bc-8',  ...at('bc-8'),  label: 'The Ruined Chapel', description: '[content] The Ruined Chapel.' },
        { id: 'bc-9',  ...at('bc-9'),  label: 'The Rope Bridge', description: '[content] The Rope Bridge.' },
        { id: 'bc-10', ...at('bc-10'), label: 'The Toll Gate', description: '[content] The Toll Gate.' },
        // ── c4 ──
        { id: 'bc-11', ...at('bc-11'), label: 'The Arch Bridge', description: '[content] The Arch Bridge.' },
        { id: 'bc-12', ...at('bc-12'), label: 'The Gorge Falls', description: '[content] The Gorge Falls.' },
        { id: 'bc-13', ...at('bc-13'), label: 'The Quarry', description: '[content] The Quarry.' },
        // ── c5 ──
        { id: 'bc-14', ...at('bc-14'), label: 'The Mountain Inn', description: '[content] The Mountain Inn.' },
        { id: 'bc-15', ...at('bc-15'), label: 'The Stone Gate', description: '[content] The Stone Gate.' },
        { id: 'bc-16', ...at('bc-16'), label: 'The Tunnel Bridge', description: '[content] The Tunnel Bridge.' },
        // ── c6 — the door ──
        { id: 'bc-17', ...at('bc-17'), label: 'The Glacier Shrine', description: '[content] The Glacier Shrine.' },
    ],
};

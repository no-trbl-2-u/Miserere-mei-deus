import { ACT1_PLATES } from '@/assets/images/maps';
import { ACT1_FADED_PLATES } from '@/assets/images/map-fog';
import landmarks from '@/assets/images/maps/act1-landmarks.json';
import { ACT1_SHEET_SIZE } from './breakwater.layout';
import type { MapLayout, MapSheet } from './types';

/**
 * The Lantern Deep — Act 1, map 4. Drawn on the underworld
 * plate the way the Beacon Crags are drawn on the mountains: every node
 * sits on one of the plate's landmarks, read from `act1-landmarks.json`,
 * on the shared Act 1 sheet (`ACT1_SHEET_SIZE`, see `breakwater.layout.ts` for
 * the sizing).
 *
 * The underworld is the densest of the four plates, so this is the one sheet
 * that haloes its node marks (`nodeHalo`): a dark pool under each mark.
 *
 * The engine graph (`Continents/Northern-Continent/lantern-deep.ts`) comes down
 * the surface stair at the top of the plate and runs down through the deep in
 * bands west to east, closing on the deep stair in the south-east.
 * Positions only; kind + edges come from the engine (`@mechanics`).
 */

const sheet: MapSheet = {
    ...ACT1_SHEET_SIZE,
    backdrop: ACT1_PLATES.underworld,
    fadedBackdrop: ACT1_FADED_PLATES.underworld,
    plateOpacity: 0.85,
    chartTexture: false,
    nodeHalo: true,
};

/** Node id → the landmark it sits on. Every underworld landmark appears exactly once. */
export const LANTERN_DEEP_LANDMARKS: Readonly<Record<string, string>> = {
    'ld-1':  'surface-stair',
    'ld-2':  'ferry-landing',
    'ld-3':  'drowned-temple',
    'ld-4':  'north-aqueduct',
    'ld-5':  'cathedral',
    'ld-6':  'west-tunnel',
    'ld-7':  'crystal-grotto',
    'ld-8':  'central-aqueduct',
    'ld-9':  'sleeping-giant',
    'ld-10': 'market-grotto',
    'ld-11': 'mushroom-forest',
    'ld-12': 'ossuary',
    'ld-13': 'fortress-gate',
    'ld-14': 'forge',
    'ld-15': 'vault-door',
    'ld-16': 'ruined-city',
    'ld-17': 'east-stairs',
    'ld-18': 'deep-stair',
};

/** Where a landmark sits on the sheet: its plate fraction times the sheet size. */
function at(nodeId: string): { x: number; y: number } {
    const id = LANTERN_DEEP_LANDMARKS[nodeId];
    const mark = landmarks['act1-underworld'].find((l) => l.id === id);
    if (!mark) throw new Error(`lantern-deep layout: ${nodeId} names unknown landmark '${id}'`);
    return {
        x: Math.round(mark.x * ACT1_SHEET_SIZE.width),
        y: Math.round(mark.y * ACT1_SHEET_SIZE.height),
    };
}

export const lanternDeepLayout: MapLayout = {
    mapId: 'lantern-deep',
    continent: 'CONTINENT · NORTHERN',
    region: 'The Lantern Deep',
    // Ordinal only — no node/path count. Act 1, map 4 of 4.
    regionProgress: 'Map iv of iv',
    sheet,
    nodes: [
        // ── c0 — the surface stair: arrival down from the glacier shrine ──
        { id: 'ld-1',  ...at('ld-1'),  label: 'The Surface Stair', description: 'The stair comes down through the cavern roof. The daylight stops at the last step.' },
        // ── c1 ──
        { id: 'ld-2',  ...at('ld-2'),  label: 'The Ferry Landing', description: 'A lantern on a post and a ferryman under it. He charges for the oil.' },
        { id: 'ld-3',  ...at('ld-3'),  label: 'The Drowned Temple', description: 'The dome stands out of the lake. Something waits in the nave.' },
        { id: 'ld-4',  ...at('ld-4'),  label: 'The North Aqueduct', description: 'The arches leak. The walkway is slick.' },
        { id: 'ld-5',  ...at('ld-5'),  label: 'The Cathedral', description: 'Carved into the rock. Something has hatched in the font.' },
        // ── c2 ──
        { id: 'ld-6',  ...at('ld-6'),  label: 'The West Tunnel', description: 'The torches are still lit. Whoever lit them dropped a purse.' },
        { id: 'ld-7',  ...at('ld-7'),  label: 'The Crystal Grotto', description: 'Pale crystal, worth nothing. The iron in it is worth something.' },
        { id: 'ld-8',  ...at('ld-8'),  label: 'The Central Aqueduct', description: 'A long bridge over the chasm. Something knocks on the stones.' },
        { id: 'ld-9',  ...at('ld-9'),  label: 'The Sleeping Giant', description: 'It sleeps on a stone dais. The dais is narrow.' },
        // ── c3 ──
        { id: 'ld-10', ...at('ld-10'), label: 'The Market Grotto', description: 'Tents and traders. Lamp oil by the drop.' },
        { id: 'ld-11', ...at('ld-11'), label: 'The Mushroom Forest', description: 'Stalks taller than houses. Something watches between them.' },
        { id: 'ld-12', ...at('ld-12'), label: 'The Ossuary', description: 'A giant’s bones among standing stones. Something tends them.' },
        // ── c4 ──
        { id: 'ld-13', ...at('ld-13'), label: 'The Fortress Gate', description: 'A portcullis, and something hanging in it.' },
        { id: 'ld-14', ...at('ld-14'), label: 'The Forge', description: 'A forge by the lava channel. The slag is full of ore.' },
        { id: 'ld-15', ...at('ld-15'), label: 'The Vault Door', description: 'A round door in the rock.' },
        // ── c5 ──
        { id: 'ld-16', ...at('ld-16'), label: 'The Ruined City', description: 'A city standing in water. Something reads in the square.' },
        { id: 'ld-17', ...at('ld-17'), label: 'The East Stairs', description: 'Arched stairways going down. A dry landing, and a lantern that is out.' },
        // ── c6 — the door ──
        { id: 'ld-18', ...at('ld-18'), label: 'The Deep Stair', description: 'The stair goes down past the last lantern.' },
    ],
};

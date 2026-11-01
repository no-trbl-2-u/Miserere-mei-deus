import { ACT1_PLATES } from '@/assets/images/maps';
import { ACT1_FADED_PLATES } from '@/assets/images/map-fog';
import landmarks from '@/assets/images/maps/act1-landmarks.json';
import { ACT1_SHEET_SIZE } from './breakwater.layout';
import type { MapLayout, MapSheet } from './types';

/**
 * The Charcoal Wood — Act 1, map 2. Drawn on the forest plate
 * the way the Breakwater is drawn on the coast: every node sits on one of
 * the plate's landmarks, read from `act1-landmarks.json`, on the shared
 * Act 1 sheet (`ACT1_SHEET_SIZE`, see `breakwater.layout.ts` for the sizing).
 *
 * The engine graph (`Continents/Coastal-Village/charcoal-wood.ts`) enters over
 * the river bridge on the plate's west edge and runs in rings east and north
 * from there, closing on the carved stair in the southern cliff. Positions
 * only; kind + edges come from the engine (`@mechanics`).
 */

const sheet: MapSheet = {
    ...ACT1_SHEET_SIZE,
    backdrop: ACT1_PLATES.forest,
    fadedBackdrop: ACT1_FADED_PLATES.forest,
    plateOpacity: 0.85,
    chartTexture: false,
};

/** Node id → the landmark it sits on. Every forest landmark appears exactly once. */
export const CHARCOAL_WOOD_LANDMARKS: Readonly<Record<string, string>> = {
    'cw-1':  'river-bridge',
    'cw-2':  'ruined-tower',
    'cw-3':  'ruined-shrine',
    'cw-4':  'watermill',
    'cw-5':  'gibbet',
    'cw-6':  'west-cave',
    'cw-7':  'stone-circle',
    'cw-8':  'great-tree',
    'cw-9':  'hunting-lodge',
    'cw-10': 'footbridge',
    'cw-11': 'stilt-cottage',
    'cw-12': 'root-graveyard',
    'cw-13': 'hermit-hut',
    'cw-14': 'charcoal-clearing',
    'cw-15': 'woodcutters-camp',
    'cw-16': 'rock-chapel',
    'cw-17': 'wayside-cross',
    'cw-18': 'well',
    'cw-19': 'east-cave',
    'cw-20': 'stair-cave',
};

/** Where a landmark sits on the sheet: its plate fraction times the sheet size. */
function at(nodeId: string): { x: number; y: number } {
    const id = CHARCOAL_WOOD_LANDMARKS[nodeId];
    const mark = landmarks['act1-forest'].find((l) => l.id === id);
    if (!mark) throw new Error(`charcoal-wood layout: ${nodeId} names unknown landmark '${id}'`);
    return {
        x: Math.round(mark.x * ACT1_SHEET_SIZE.width),
        y: Math.round(mark.y * ACT1_SHEET_SIZE.height),
    };
}

export const charcoalWoodLayout: MapLayout = {
    mapId: 'charcoal-wood',
    continent: 'CONTINENT · COASTAL',
    region: 'The Charcoal Wood',
    // Ordinal only — no node/path count. Act 1, map 2 of 4.
    regionProgress: 'Map ii of iv',
    sheet,
    nodes: [
        // ── c0 — the river bridge: arrival from the Breakwater ──
        { id: 'cw-1',  ...at('cw-1'),  label: 'The River Bridge', description: 'The bridge ends in pine. The smoke does not lift.' },
        // ── c1 ──
        { id: 'cw-2',  ...at('cw-2'),  label: 'The Ruined Tower', description: 'The stair fell in. Something was left under it.' },
        { id: 'cw-3',  ...at('cw-3'),  label: 'The Ruined Shrine', description: 'A robed saint over a rotten floor. The crypt is below.' },
        { id: 'cw-4',  ...at('cw-4'),  label: 'The Watermill', description: 'Bramble has taken the millrace. The berries are free.' },
        { id: 'cw-5',  ...at('cw-5'),  label: 'The Gibbet', description: 'An iron cage at the fork. Something under it begs.' },
        { id: 'cw-6',  ...at('cw-6'),  label: 'The West Cave', description: 'A cave mouth in the cliff. Someone paid the dark here.' },
        // ── c2 ──
        { id: 'cw-7',  ...at('cw-7'),  label: 'The Stone Circle', description: 'Standing stones around a slab. Something lies on it.' },
        { id: 'cw-8',  ...at('cw-8'),  label: 'The Great Tree', description: 'Moonbells in its shadow. Nobody has priced them yet.' },
        { id: 'cw-9',  ...at('cw-9'),  label: 'The Hunting Lodge', description: 'Shut for the season. The porch is dry.' },
        { id: 'cw-10', ...at('cw-10'), label: 'The Footbridge', description: 'Planks over a fast stream. Something weeps under them.' },
        // ── c3 ──
        { id: 'cw-11', ...at('cw-11'), label: 'The Stilt Cottage', description: 'Empty, over the bog. One boardwalk in, one out.' },
        { id: 'cw-12', ...at('cw-12'), label: 'The Root Graveyard', description: 'Graves among the roots. Not dug deep enough.' },
        { id: 'cw-13', ...at('cw-13'), label: 'The Hermit’s Hut', description: 'The chimney still smokes. The hermit is gone.' },
        { id: 'cw-14', ...at('cw-14'), label: 'The Charcoal Clearing', description: 'Burners at the mounds. They count logs, not branches.' },
        // ── c4 ──
        { id: 'cw-15', ...at('cw-15'), label: 'The Woodcutters’ Camp', description: 'Stacked logs and someone else’s fire.' },
        { id: 'cw-16', ...at('cw-16'), label: 'The Rock Chapel', description: 'A door cut into the crag. The tithe is collected here.' },
        { id: 'cw-17', ...at('cw-17'), label: 'The Wayside Cross', description: 'A cross at the fork. A knight in rust keeps it.' },
        { id: 'cw-18', ...at('cw-18'), label: 'The Well', description: 'A covered well. The cover is rotten.' },
        { id: 'cw-19', ...at('cw-19'), label: 'The East Cave', description: 'Something knocks in the cave mouth. Twice, so far.' },
        // ── c5 — the door ──
        { id: 'cw-20', ...at('cw-20'), label: 'The Stair Cave', description: 'A stair cut into the cliff. It comes up on a mountain road.' },
    ],
};

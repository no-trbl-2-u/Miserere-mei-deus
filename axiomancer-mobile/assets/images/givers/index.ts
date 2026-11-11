/**
 * Quest giver figures (stand-in art).
 *
 * One table keyed by giver id supplies every quest giver's figure, so swapping
 * a figure is a one-line change here (plus its file and provenance entry). The
 * four ids are the ones `QUEST_NODES` (mechanics `World/MapEvents/content.ts`)
 * names as each node's `giver.portrait`. Nothing here resolves a path into
 * `Potential Assets/`: the images were copied out and recorded in
 * `provenance.json`.
 */

export type GiverId = 'fishermen-elder' | 'lighthouse-keeper' | 'gate-warden' | 'bridge-keeper';

export interface GiverFigureEntry {
    id: GiverId;
    /** Image source for `<Image source={...}>` (a Metro asset id). */
    source: number;
}

export const GIVER_IDS: readonly GiverId[] = ['fishermen-elder', 'lighthouse-keeper', 'gate-warden', 'bridge-keeper'];

export const GIVER_FIGURES: Record<GiverId, GiverFigureEntry> = {
    'fishermen-elder': { id: 'fishermen-elder', source: require('./fishermen-elder.webp') },
    'lighthouse-keeper': { id: 'lighthouse-keeper', source: require('./lighthouse-keeper.webp') },
    'gate-warden': { id: 'gate-warden', source: require('./gate-warden.webp') },
    'bridge-keeper': { id: 'bridge-keeper', source: require('./bridge-keeper.webp') },
};

/** True when `id` names a giver in the table. */
export function isGiverId(id: string): id is GiverId {
    return Object.prototype.hasOwnProperty.call(GIVER_FIGURES, id);
}

/** The figure source for a giver id; the elder's stands in for an unknown id. */
export function giverFigure(id: string): number {
    return GIVER_FIGURES[isGiverId(id) ? id : 'fishermen-elder'].source;
}

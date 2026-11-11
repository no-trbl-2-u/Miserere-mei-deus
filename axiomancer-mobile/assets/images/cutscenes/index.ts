/**
 * Cutscene pictures and the narrator (CU1a, spec 172).
 *
 * A cutscene's content names a `scene` id and nothing else; this module is the
 * one place the app maps that id to a picture and holds the one narrator
 * figure who tells every cutscene. T swaps an image here: a file, a line, and
 * its provenance entry. Nothing here resolves into `Potential Assets/`.
 *
 * The scene pictures are stand-ins: the dim combat arenas the ballot used, until
 * T's own landscapes arrive (172.3). The narrator is a copy of the Hermit
 * cut-out.
 */

/** A scene's picture and the chapter's name drawn at the top left. */
export interface CutsceneScene {
    id: string;
    /** Image source for `<Image source={...}>` (a Metro asset id). */
    source: number;
    /** The chapter's name in small capitals (null: none drawn). */
    chapter: string | null;
}

const BREAKWATER = 'THE BREAKWATER';
const CHARCOAL_WOOD = 'THE CHARCOAL WOOD';

export const CUTSCENE_SCENES: Readonly<Record<string, CutsceneScene>> = {
    'windmill-headland': {
        id: 'windmill-headland', chapter: BREAKWATER,
        source: require('../combat/arena-breakwater-kuste-bei-mondschein.webp'),
    },
    'clifftop-chapel': {
        id: 'clifftop-chapel', chapter: BREAKWATER,
        source: require('../combat/arena-breakwater-mondscheinnacht-ruegen.webp'),
    },
    'old-watchtower': {
        id: 'old-watchtower', chapter: BREAKWATER,
        source: require('../combat/arena-breakwater-northern-sea.webp'),
    },
    'high-pass': {
        id: 'high-pass', chapter: BREAKWATER,
        source: require('../combat/arena-beacon-crags-riesengebirge.webp'),
    },
    'charcoal-wood-arrival': {
        id: 'charcoal-wood-arrival', chapter: CHARCOAL_WOOD,
        source: require('../combat/arena-charcoal-wood-eldena.webp'),
    },
};

/** The picture a cutscene with no (or an unknown) scene id draws: today's engraving. */
export const CUTSCENE_FALLBACK: CutsceneScene = {
    id: 'fallback', chapter: null,
    source: require('../maps/charon-crossing.webp'),
};

/** The one narrator, a full-figure cut-out standing over the panel (stand-in until 172.3). */
export const CUTSCENE_NARRATOR: number = require('./narrator-standin.webp');

/** The scene for an id; the fallback for an absent or unknown one. */
export function cutsceneScene(id: string | undefined | null): CutsceneScene {
    return (id ? CUTSCENE_SCENES[id] : undefined) ?? CUTSCENE_FALLBACK;
}

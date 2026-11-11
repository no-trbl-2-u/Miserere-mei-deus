/**
 * Cutscene pictures and the narrator.
 *
 * A cutscene's content names a `scene` id and nothing else; this module is the
 * one place the app maps that id to a picture and holds the one narrator
 * figure who tells every cutscene. T swaps an image here: a file, a line, and
 * its provenance entry. Nothing here resolves into `Potential Assets/`.
 *
 * Everything here is a TEMP stand-in (T, 2026-11-11), each with a provenance
 * entry, until T's own art arrives: the five scenes are public-domain
 * paintings (Ruisdael, Schinkel, Constable, Friedrich, Ruisdael) acquired
 * through scripts/acquire-art.mjs, and the narrator is the TOR Friar cut-out.
 * T will still replace them: a file, a line, and its provenance entry.
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
        source: require('./scene-windmill-headland.webp'),
    },
    'clifftop-chapel': {
        id: 'clifftop-chapel', chapter: BREAKWATER,
        source: require('./scene-clifftop-chapel.webp'),
    },
    'old-watchtower': {
        id: 'old-watchtower', chapter: BREAKWATER,
        source: require('./scene-old-watchtower.webp'),
    },
    'high-pass': {
        id: 'high-pass', chapter: BREAKWATER,
        source: require('./scene-high-pass.webp'),
    },
    'charcoal-wood-arrival': {
        id: 'charcoal-wood-arrival', chapter: CHARCOAL_WOOD,
        source: require('./scene-charcoal-wood-arrival.webp'),
    },
};

/** The picture a cutscene with no (or an unknown) scene id draws: today's engraving. */
export const CUTSCENE_FALLBACK: CutsceneScene = {
    id: 'fallback', chapter: null,
    source: require('../maps/charon-crossing.webp'),
};

/** The one narrator, a full-figure cut-out standing over the panel (temp stand-in: the TOR Friar). */
export const CUTSCENE_NARRATOR: number = require('./narrator.webp');

/** The scene for an id; the fallback for an absent or unknown one. */
export function cutsceneScene(id: string | undefined | null): CutsceneScene {
    return (id ? CUTSCENE_SCENES[id] : undefined) ?? CUTSCENE_FALLBACK;
}

/**
 * Enemy FRAME SETS — the animated sibling of `ENEMY_ART_BY_KEY`.
 *
 * A frame set is an ordered list of per-cell images plus a manifest that says
 * how to read them: the grid the cells came from, the anchor kind, the named
 * clips (idle / struck / attacking), and whether the cells have already been
 * graded. The registry is keyed on the same `portraitAsset` key the static
 * registry uses, so one enemy either has frames or does not.
 *
 * `ENEMY_FRAME_SETS` SHIPPED EMPTY, and that was deliberate (phase AN1a, A2):
 * the engine and the art install are separate phases so that the engine's
 * review is not hostage to an art review. Phase AN1e installed the first set,
 * the float-eye's; phase AN4b the second, the Act 1 boss's; phase AN3b the
 * third, the Act 1 elite's and the first that stands. Phase AN5a installed
 * the fourth, the Gallows Crow's, the first cut from an image-model sheet
 * (cleaned by the art department's `clean-ai-sheet.py` before the split);
 * AN5b-AN5e install Chapter 1's other thirteen stand-ins the same way. Every
 * enemy not yet in the registry still renders exactly the single image it
 * rendered before — absence from here is the static path, not a missing
 * feature.
 *
 * WHAT A SET IS MADE OF
 * ---------------------
 * Per-cell WebP, one file per frame, emitted into this directory under
 * `anim/<key>/`. NOT the sheet file: the masters live in `art-department/`, and
 * nothing in the repository may resolve a path into that tree. The split
 * runs there and writes here.
 *
 * ANCHOR KIND (A6) — there is no single universal anchor.
 *   · `foot-line` — a creature that STANDS. The default. Measured on the
 *     reference sheet: the foot line held to 23px of a 443px cell (5.2%) while
 *     the bounding-box centre wandered 49.5px (11.2%) as the weapon swung.
 *     Anchoring on the bbox would make that creature bob; the feet do not.
 *   · `centre` — a creature that FLOATS, where no foot line exists and the
 *     hover IS the idle clip. An anchor tracking the body would cancel the very
 *     motion the clip is for.
 * A manifest naming neither fails validation, exactly as a cell-count mismatch
 * does. A single universal rule would have shipped an engine that breaks on the
 * first enemy it was pointed at.
 *
 * GRADE ONCE (A6b). The ingest `RECIPE` (`scripts/ingest-art.mjs`) carries
 * `grayscale: true` alongside the size and quality terms. Run on a colour enemy
 * it flattens the read of the frame. A set DERIVED from an already-ingested
 * painting therefore arrives with its source's grade baked in and ingests with
 * `--no-grade`; only newly generated cells take the full recipe. `graded` on
 * the manifest records which happened, so nobody has to guess later.
 *
 * BUNDLE COST (A11, measured on the cells that actually shipped). The
 * float-eye's 8x3 sheet split and ingested at the recipe's q44: 24 cells,
 * 156452 B (152.8 KB) in total, mean 6519 B, max 9352 B (`float-eye-20.webp`,
 * the attack flare), min 3786 B — against 23624 B for the static
 * `float-eye.webp`. 6.6x, +132.8 KB, for one enemy. (The brief's estimate was
 * 149.5 KB / mean 6378 / max 9020, measured with a different encoder build;
 * the numbers here are the files in the tree, which is what a ceiling has to
 * be set against.) The death-beholder (AN4b) is a far busier painting and
 * held the same ceiling by cutting at 176px rather than 256: 24 cells,
 * 197658 B, max 11068 B, against 56286 B static. The green jelly (AN3b) is
 * back at 256px: 24 cells, 179610 B, max 7920 B, against 12572 B static.
 * The gallows crow (AN5a) overshot at 256px (max 16760 B: an image-model
 * drawing is busier than a rig's pose) and was cut at 176px like the
 * beholder: 24 cells, 177768 B, max 9548 B, against 45124 B static.
 * `FRAME_CELL_MAX_BYTES` below is that ceiling, and
 * `scripts/frame-cells.test.mjs` is what enforces it against the bytes on
 * disk — a constant nothing weighs is a wish.
 */

import type { ImageSourcePropType } from 'react-native';

import { DEATH_BEHOLDER_CELLS } from './anim/death-beholder';
import { FLOAT_EYE_CELLS } from './anim/float-eye';
import { GALLOWS_CROW_CELLS } from './anim/gallows-crow';
import { GREEN_JELLY_CELLS } from './anim/green-jelly';

/** How a cell is registered against the frame beneath it. */
export type FrameAnchorKind = 'foot-line' | 'centre';

export interface FrameAnchor {
    kind: FrameAnchorKind;
    /** Anchor point in cell pixels, where the splitter recorded one. */
    x?: number;
    y?: number;
    /** Why this kind, for the next reader. */
    why?: string;
}

/** One named run of cells within the sheet — `idle`, `struck`, `attacking`. */
export interface FrameClip {
    /** Row of the source grid this clip occupies. */
    row: number;
    /** How many cells of that row belong to the clip. */
    frames: number;
    /** Intended playback rate. */
    fps: number;
    /** A looping clip repeats forever; a one-shot stops on its last frame. */
    loop: boolean;
    /** Index WITHIN THE CLIP of the frame to hold when nothing is playing. */
    rest: number;
}

export interface FrameSetManifest {
    /** Edge of one square cell, in source pixels. */
    frame: number;
    columns: number;
    rows: number;
    anchor: FrameAnchor;
    clips: Readonly<Record<string, FrameClip>>;
    /** A6b: true when these cells have already been through the ingest grade. */
    graded: boolean;
    /** Where the cells came from, for provenance. */
    source?: string;
    generator?: string;
}

export interface EnemyFrameSet {
    manifest: FrameSetManifest;
    /** Row-major, left to right, top to bottom — `columns * rows` of them. */
    frames: readonly ImageSourcePropType[];
}

/**
 * A6b/A11 ceiling: no single shipped cell may exceed this. The measured max on
 * the reference set was 9020 B; the headroom is deliberate but finite.
 */
export const FRAME_CELL_MAX_BYTES = 12000;

/** The clip every set must name, and the one a resting enemy holds. */
export const RESTING_CLIP = 'idle';

/**
 * THE THREE STATES (phase AN1c). A set names all three or it is not a set:
 * `idle` is the resting loop, `struck` plays when the enemy takes damage, and
 * `attacking` plays on the enemy's own beat. Naming only two was the AN1a/AN1b
 * shape, when nothing selected a third; now that the engine selects between
 * them, a set missing one has a state it cannot show, and an enemy that cannot
 * show being hit is worse than an enemy that never animates at all.
 *
 * The vocabulary is not ours to choose: the float-eye master's sidecar already
 * names its rows `idle` / `struck` / `attacking`, and AN1e installs it.
 */
export const REQUIRED_CLIPS = [RESTING_CLIP, 'struck', 'attacking'] as const;

/**
 * Which of the three loop, as a contract rather than a convention: the resting
 * clip repeats forever, and the two reactions are one-shots that hand the enemy
 * back to rest. A `struck` clip declaring `loop: true` would leave an enemy
 * flinching for the remainder of the fight, and it would do it silently.
 */
export const CLIP_LOOPS: Readonly<Record<string, boolean>> = {
    [RESTING_CLIP]: true,
    struck: false,
    attacking: false,
};

/**
 * THE FLOAT-EYE (phase AN1e) — the first installed set, and the one that makes
 * the four phases before it visible.
 *
 * The numbers are not chosen here. They are transcribed from
 * `float-eye.sheet.json`, the sidecar the rig wrote beside the master it drew,
 * so the manifest the app plays and the manifest the sheet was cut to are the
 * same table. `anchor.kind` is `centre` rather than the standing default
 * because the eye floats: it has no foot line, and its hover IS the idle clip,
 * so an anchor tracking the body would cancel the motion the clip exists for.
 *
 * `graded: true` says the pixels carry the ingest grade — applied ONCE, to the
 * painting these cells descend from, back in 2026-07. The split ingested with
 * `--no-grade` for exactly that reason; see this directory's
 * `anim/float-eye/provenance.json`.
 */
const FLOAT_EYE_FRAME_SET: EnemyFrameSet = {
    manifest: {
        frame: 256,
        columns: 8,
        rows: 3,
        anchor: {
            kind: 'centre',
            x: 128,
            y: 128,
            why: 'floating enemy; no foot line exists, and the hover is the idle clip',
        },
        clips: {
            idle: { row: 0, frames: 8, fps: 12, loop: true, rest: 0 },
            struck: { row: 1, frames: 8, fps: 16, loop: false, rest: 7 },
            attacking: { row: 2, frames: 8, fps: 14, loop: false, rest: 0 },
        },
        graded: true,
        // This points at the provenance record rather than naming the masters
        // tree, and `generator` is left unset for the same reason: app code
        // may not name that tree even in a string literal, because a string
        // literal is how a path gets resolved, and the sealed-tree guard in
        // the root suite fails the build for it. The full lineage lives in
        // `anim/float-eye/provenance.json` — the master, the rig that drew
        // it, the splitter that cut it, the ungraded ingest, the cost.
        source: 'see anim/float-eye/provenance.json',
    },
    frames: FLOAT_EYE_CELLS,
};

/**
 * THE DEATH BEHOLDER (phase AN4b) — the Act 1 boss.
 *
 * Transcribed from `death-beholder.sheet.json`, as the float-eye's is from its
 * own sidecar. `centre`, because it floats like the float-eye does. 176px
 * cells, because at 256 this painting's cells overshoot the per-cell ceiling.
 *
 * Its `attacking` row is a SCALE change, not a deformation: it draws in and
 * darkens to 0.80, then swells to 1.14 on the very next frame. The rig's own
 * suite pins that jump against the master's pixels, so it cannot be eased.
 *
 * `graded: false`, unlike the float-eye: the portrait these cells come from
 * was ingested ungraded in AN4a (it is a colour boss), so neither the
 * painting nor its frames carry the grade, and the two match on screen.
 */
const DEATH_BEHOLDER_FRAME_SET: EnemyFrameSet = {
    manifest: {
        frame: 176,
        columns: 8,
        rows: 3,
        anchor: {
            kind: 'centre',
            x: 88,
            y: 88,
            why: 'floating enemy; no foot line exists, and the hover is the idle clip',
        },
        clips: {
            idle: { row: 0, frames: 8, fps: 10, loop: true, rest: 0 },
            struck: { row: 1, frames: 8, fps: 16, loop: false, rest: 7 },
            attacking: { row: 2, frames: 8, fps: 12, loop: false, rest: 0 },
        },
        graded: false,
        source: 'see anim/death-beholder/provenance.json',
    },
    frames: DEATH_BEHOLDER_CELLS,
};

/**
 * THE GREEN JELLY (phase AN3b) — the Act 1 elite, and the first set on a
 * `foot-line` anchor.
 *
 * Transcribed from `green-jelly.sheet.json`. Unlike the two floaters, a jelly
 * SITS on a surface, and its squash and stretch happen about its base: the rig
 * poses every frame about a pivot on the foot line, so a squash spreads it
 * along the floor and a stretch grows it upward. The anchor is that pivot in
 * cell pixels. Anchored on the centre it would lift off the floor whenever it
 * squashed.
 *
 * `graded: false`, as the beholder's: the portrait was ingested ungraded in
 * AN3a (a colour elite), so the frames match it on screen.
 */
const GREEN_JELLY_FRAME_SET: EnemyFrameSet = {
    manifest: {
        frame: 256,
        columns: 8,
        rows: 3,
        anchor: {
            kind: 'foot-line',
            x: 132,
            y: 219.2,
            why: 'rests on a surface; squash and stretch are about its base',
        },
        clips: {
            idle: { row: 0, frames: 8, fps: 10, loop: true, rest: 0 },
            struck: { row: 1, frames: 8, fps: 16, loop: false, rest: 7 },
            attacking: { row: 2, frames: 8, fps: 12, loop: false, rest: 0 },
        },
        graded: false,
        source: 'see anim/green-jelly/provenance.json',
    },
    frames: GREEN_JELLY_CELLS,
};

/**
 * THE GALLOWS CROW (phase AN5a) — Chapter 1's first normal, and the first set
 * cut from an image-model sheet rather than posed by a rig.
 *
 * Transcribed from `gallows-crow.sheet.json`, the sidecar the cleanup tool
 * wrote. Every number in it was MEASURED by that tool, not chosen: the anchor
 * kind came from the idle row (its foot line moves 6px, 2.3% of the cell, so
 * the crow stands on its perch), the point is the median foot line and body
 * centre after one sheet-wide fit. 176px cells, because at 256 the busiest
 * cells overshoot the per-cell ceiling. The clip table is the jelly's and the
 * beholder's (the AN5 brief: not re-tuned per enemy).
 *
 * `graded: false`: the stand-in portrait it was drawn from was ingested in
 * colour, and the sheet carries the portrait's own saturation.
 *
 * A7: the set is bound to the portrait it was drawn from. Its provenance
 * records that portrait's SHA-256, and the root suite fails when the
 * portrait changes, so a swapped stand-in retires this set rather than
 * animating a drawing of the old one.
 */
const GALLOWS_CROW_FRAME_SET: EnemyFrameSet = {
    manifest: {
        frame: 176,
        columns: 8,
        rows: 3,
        anchor: {
            kind: 'foot-line',
            x: 77.1,
            y: 167.8,
            why: 'stands on its perch: the idle foot line moves 6px (2.3% of the cell, within 6%), measured by the cleanup tool',
        },
        clips: {
            idle: { row: 0, frames: 8, fps: 10, loop: true, rest: 0 },
            struck: { row: 1, frames: 8, fps: 16, loop: false, rest: 7 },
            attacking: { row: 2, frames: 8, fps: 12, loop: false, rest: 0 },
        },
        graded: false,
        source: 'see anim/gallows-crow/provenance.json',
    },
    frames: GALLOWS_CROW_CELLS,
};

/**
 * THE REGISTRY. An enemy absent from here resolves through
 * `getEncounterEnemyArt` exactly as it always has. AN1a shipped this empty on
 * purpose so the engine's review was not hostage to an art review; AN1e put
 * the float-eye in it, and that is the row where the chain stops being
 * invisible. AN4b added the boss, AN3b the elite, AN5a the Gallows Crow.
 */
export const ENEMY_FRAME_SETS: Readonly<Record<string, EnemyFrameSet>> = {
    'death-beholder': DEATH_BEHOLDER_FRAME_SET,
    'float-eye': FLOAT_EYE_FRAME_SET,
    'gallows-crow': GALLOWS_CROW_FRAME_SET,
    'green-jelly': GREEN_JELLY_FRAME_SET,
};

/** The frame set for a `portraitAsset` key, or null when the enemy is static. */
export function getEnemyFrameSet(artKey: string | null | undefined): EnemyFrameSet | null {
    if (!artKey) return null;
    return ENEMY_FRAME_SETS[artKey] ?? null;
}

/** True when this key animates. False for every key while the registry is empty. */
export function hasEnemyFrames(artKey: string | null | undefined): boolean {
    return getEnemyFrameSet(artKey) !== null;
}

const ANCHOR_KINDS: readonly string[] = ['foot-line', 'centre'];

/**
 * A5/A6: every way a frame set can be wrong, named. Returns the problems found;
 * an empty array is a valid set. A truncated animation is a FAILURE, not a
 * shrug — a set that fails here must never be rendered at all.
 */
export function validateFrameSet(key: string, set: EnemyFrameSet): string[] {
    const problems: string[] = [];
    const m = set.manifest;

    // A6 — the anchor kind is declared, and is one of the two measured kinds.
    if (!m.anchor || !ANCHOR_KINDS.includes(m.anchor.kind)) {
        problems.push(
            `${key}: manifest declares no anchor kind (expected one of ${ANCHOR_KINDS.join(', ')})`,
        );
    }

    // A6b — grading is recorded, not inferred.
    if (typeof m.graded !== 'boolean') {
        problems.push(`${key}: manifest does not record whether the cells have been graded`);
    }

    // A5 — the cell count agrees with the grid.
    if (!Number.isInteger(m.columns) || m.columns <= 0 || !Number.isInteger(m.rows) || m.rows <= 0) {
        problems.push(`${key}: manifest grid is not a positive integer columns x rows`);
    } else {
        const expected = m.columns * m.rows;
        if (set.frames.length !== expected) {
            problems.push(
                `${key}: ${set.frames.length} frame file(s) for a ${m.columns}x${m.rows} manifest (${expected} cells)`,
            );
        }
    }

    const clipNames = Object.keys(m.clips ?? {});
    if (clipNames.length === 0) {
        problems.push(`${key}: manifest names no clips`);
    } else {
        // AN1c — all three states, every time. Reported one name at a time so
        // a half-built manifest says which state is missing rather than that
        // something is.
        for (const required of REQUIRED_CLIPS) {
            if (!clipNames.includes(required)) {
                problems.push(
                    `${key}: manifest has no '${required}' clip (a set names ${REQUIRED_CLIPS.join(', ')})`,
                );
            }
        }
    }

    for (const name of clipNames) {
        const clip = m.clips[name];
        if (!Number.isInteger(clip.frames) || clip.frames <= 0) {
            problems.push(`${key}.${name}: clip declares ${clip.frames} frames`);
            continue;
        }
        if (!Number.isInteger(clip.row) || clip.row < 0 || clip.row >= m.rows) {
            problems.push(`${key}.${name}: row ${clip.row} is outside a ${m.rows}-row sheet`);
        }
        if (clip.frames > m.columns) {
            problems.push(`${key}.${name}: ${clip.frames} frames in a ${m.columns}-column row`);
        }
        // A5 — the resting index must name a frame that exists.
        if (!Number.isInteger(clip.rest) || clip.rest < 0 || clip.rest >= clip.frames) {
            problems.push(
                `${key}.${name}: resting index ${clip.rest} is out of range for ${clip.frames} frames`,
            );
        }
        if (!(clip.fps > 0)) {
            problems.push(`${key}.${name}: fps must be positive, got ${clip.fps}`);
        }
        // AN1c — looping is a property of the state, not of the sheet that
        // happened to be drawn. Rest loops; the two reactions do not.
        const expectedLoop = CLIP_LOOPS[name];
        if (expectedLoop !== undefined && clip.loop !== expectedLoop) {
            problems.push(
                `${key}.${name}: must ${expectedLoop ? 'loop' : 'be a one-shot'}, got loop ${clip.loop}`,
            );
        }
    }

    return problems;
}

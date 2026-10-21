/**
 * Enemy FRAME SETS — the animated sibling of `ENEMY_ART_BY_KEY`.
 *
 * A frame set is an ordered list of per-cell images plus a manifest that says
 * how to read them: the grid the cells came from, the anchor kind, the named
 * clips (idle / struck / attacking), and whether the cells have already been
 * graded. The registry is keyed on the same `portraitAsset` key the static
 * registry uses, so one enemy either has frames or does not.
 *
 * `ENEMY_FRAME_SETS` SHIPS EMPTY, and that is deliberate (phase AN1a, A2). The
 * engine and the art install are separate phases so that the engine's review is
 * not hostage to an art review; while the registry is empty every enemy renders
 * exactly the single image it rendered before. `AN1e` installs the first set.
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
 * BUNDLE COST (A11, measured). The reference 8x3 sheet split at the recipe's
 * q44: 24 cells, 149.5 KB in total, mean 6378 B, max 9020 B per cell — against
 * 23624 B for the static `float-eye.webp`. 6.5x, +126 KB, for one enemy.
 * `FRAME_CELL_MAX_BYTES` below is the ceiling that keeps a regenerated set from
 * quietly tripling that.
 */

import type { ImageSourcePropType } from 'react-native';

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
 * THE REGISTRY. Empty by design (A2) — see the header. An enemy absent from
 * here resolves through `getEncounterEnemyArt` exactly as it always has.
 */
export const ENEMY_FRAME_SETS: Readonly<Record<string, EnemyFrameSet>> = {};

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

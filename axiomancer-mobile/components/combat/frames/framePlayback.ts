/**
 * The pure arithmetic behind a frame clip. No React, no Reanimated — so the
 * question "which cell is on screen at t?" has one answer that a test can ask
 * directly, and the component below it is only wiring.
 */
import type { ImageSourcePropType } from 'react-native';

import type { FrameClip, FrameSetManifest } from '@/assets/images/enemies/frames';

/** Milliseconds one cell is held. */
export function framePeriodMs(clip: FrameClip): number {
    return 1000 / clip.fps;
}

/** How long one full pass of the clip takes. */
export function clipDurationMs(clip: FrameClip): number {
    return clip.frames * framePeriodMs(clip);
}

/**
 * The clip-relative frame showing `elapsedMs` after the clip started.
 * A looping clip wraps forever; a one-shot HOLDS its last frame rather than
 * snapping back or going blank — a partial loop is a failure, so the end of a
 * one-shot is a frame, not an absence.
 */
export function frameIndexAt(clip: FrameClip, elapsedMs: number): number {
    if (clip.frames <= 1) return 0;
    const raw = Math.floor(Math.max(0, elapsedMs) / framePeriodMs(clip));
    if (clip.loop) return raw % clip.frames;
    return Math.min(raw, clip.frames - 1);
}

/** True once a one-shot has run out. A looping clip is never finished. */
export function clipFinishedAt(clip: FrameClip, elapsedMs: number): boolean {
    if (clip.loop) return false;
    return elapsedMs >= clipDurationMs(clip);
}

/**
 * Reanimated drives one monotonic progress value from 0 to `clip.frames`; this
 * turns that into the cell to show. Kept separate from `frameIndexAt` because
 * the animation carries progress, not wall-clock time.
 */
export function frameIndexFromProgress(clip: FrameClip, progress: number): number {
    if (clip.frames <= 1) return 0;
    const raw = Math.floor(Math.max(0, progress));
    if (clip.loop) return raw % clip.frames;
    return Math.min(raw, clip.frames - 1);
}

/**
 * Where a set's cells sit in their box. `foot-line` pins the bottom edge so a
 * standing figure never lifts off its own feet; `centre` keeps the cell centred,
 * because for a floater the hover IS the clip. One answer, because the foe's
 * backing cell sits in the same box and must land on exactly the same pixels.
 */
export function cellContentPosition(manifest: FrameSetManifest): 'bottom center' | 'center' {
    return manifest.anchor.kind === 'foot-line' ? 'bottom center' : 'center';
}

/** The absolute cell in a row-major sheet for clip-relative frame `i`. */
export function sheetIndexFor(manifest: FrameSetManifest, clip: FrameClip, i: number): number {
    return clip.row * manifest.columns + Math.max(0, Math.min(clip.frames - 1, i));
}

/**
 * The backing drawn under sheet cell `cell` (146.8): backing `i` is cut from
 * cell `i` alone, so it is only ever drawn under that cell. A backing list that
 * does not match the set cell for cell answers null for every cell: a backing
 * under the wrong frame is a dark shape where the foe is not, which is the very
 * blob 146.8 removed, so no backing beats a misregistered one.
 */
export function backingForCell(
    backings: readonly ImageSourcePropType[] | null | undefined,
    cellCount: number,
    cell: number,
): ImageSourcePropType | null {
    if (!backings || backings.length !== cellCount) return null;
    return backings[cell] ?? null;
}

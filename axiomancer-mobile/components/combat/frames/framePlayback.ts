/**
 * The pure arithmetic behind a frame clip. No React, no Reanimated — so the
 * question "which cell is on screen at t?" has one answer that a test can ask
 * directly, and the component below it is only wiring.
 */
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

/** The absolute cell in a row-major sheet for clip-relative frame `i`. */
export function sheetIndexFor(manifest: FrameSetManifest, clip: FrameClip, i: number): number {
    return clip.row * manifest.columns + Math.max(0, Math.min(clip.frames - 1, i));
}

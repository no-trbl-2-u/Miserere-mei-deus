/**
 * The clip arithmetic, where "does it advance?" has an answer that does not
 * depend on a renderer or a running animation driver.
 */
import {
    clipDurationMs, clipFinishedAt, frameIndexAt, frameIndexFromProgress, framePeriodMs, sheetIndexFor,
} from '../framePlayback';
import type { FrameClip, FrameSetManifest } from '@/assets/images/enemies/frames';

const idle: FrameClip = { row: 0, frames: 8, fps: 12, loop: true, rest: 0 };
const struck: FrameClip = { row: 1, frames: 8, fps: 16, loop: false, rest: 7 };

describe('timing', () => {
    it('holds each cell for 1/fps', () => {
        expect(framePeriodMs(idle)).toBeCloseTo(83.333, 2);
        expect(clipDurationMs(idle)).toBeCloseTo(666.667, 2);
    });
});

describe('frameIndexAt', () => {
    it('advances one cell per period', () => {
        expect(frameIndexAt(idle, 0)).toBe(0);
        expect(frameIndexAt(idle, 83)).toBe(0);
        expect(frameIndexAt(idle, 84)).toBe(1);
        expect(frameIndexAt(idle, 84 * 2)).toBe(2);
    });

    it('wraps a looping clip forever', () => {
        expect(frameIndexAt(idle, clipDurationMs(idle))).toBe(0);
        expect(frameIndexAt(idle, clipDurationMs(idle) * 3 + 10)).toBe(0);
        expect(frameIndexAt(idle, clipDurationMs(idle) + 90)).toBe(1);
    });

    it('holds the last cell of a one-shot rather than wrapping or blanking', () => {
        expect(frameIndexAt(struck, clipDurationMs(struck))).toBe(7);
        expect(frameIndexAt(struck, clipDurationMs(struck) * 10)).toBe(7);
    });

    it('never goes negative on a clock that went backwards', () => {
        expect(frameIndexAt(idle, -500)).toBe(0);
    });

    it('a single-cell clip is always cell zero', () => {
        expect(frameIndexAt({ ...idle, frames: 1 }, 99999)).toBe(0);
    });
});

describe('clipFinishedAt', () => {
    it('a loop is never finished', () => {
        expect(clipFinishedAt(idle, 1e6)).toBe(false);
    });

    it('a one-shot finishes at its duration', () => {
        expect(clipFinishedAt(struck, clipDurationMs(struck) - 1)).toBe(false);
        expect(clipFinishedAt(struck, clipDurationMs(struck))).toBe(true);
    });
});

describe('frameIndexFromProgress', () => {
    it('reads the driven value the same way the clock does', () => {
        expect(frameIndexFromProgress(idle, 0)).toBe(0);
        expect(frameIndexFromProgress(idle, 3.9)).toBe(3);
        expect(frameIndexFromProgress(idle, 8)).toBe(0);
        expect(frameIndexFromProgress(struck, 8)).toBe(7);
        expect(frameIndexFromProgress(struck, 99)).toBe(7);
    });
});

describe('sheetIndexFor', () => {
    const manifest = {
        frame: 256, columns: 8, rows: 3, anchor: { kind: 'centre' }, graded: true,
        clips: { idle, struck },
    } as unknown as FrameSetManifest;

    it('maps a clip-relative frame into the row-major sheet', () => {
        expect(sheetIndexFor(manifest, idle, 0)).toBe(0);
        expect(sheetIndexFor(manifest, idle, 7)).toBe(7);
        expect(sheetIndexFor(manifest, struck, 0)).toBe(8);
        expect(sheetIndexFor(manifest, struck, 7)).toBe(15);
    });

    it('clamps rather than reaching into the next clip\'s row', () => {
        expect(sheetIndexFor(manifest, struck, 99)).toBe(15);
        expect(sheetIndexFor(manifest, struck, -4)).toBe(8);
    });
});

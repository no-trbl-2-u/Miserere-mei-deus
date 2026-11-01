/**
 * The small face's PAID line: how it is split into the two typefaces it is
 * printed in, and how many rows it takes at a size, so the face can size it
 * (10 px, three rows at most) without measuring text at render time
 * (`adjustsFontSizeToFit` is ignored by react-native-web).
 *
 * The line is the card's own wording (`paidFaceLine`, `docs/card-voice.md`):
 * keywords in capitals, numbers, and a few lowercase logic words. Keywords
 * and numbers print in the condensed capital face, the logic words in the
 * serif, so a reader tells `DEAL` from `or` at a glance. In glyph mode
 * (`Settings > Card text`) each keyword that has a glyph becomes a glyph run
 * and nothing else changes. Pure.
 */

import type { CardTextMode } from '../settings';
import { glyphKeywordFor, type GlyphKeyword } from './keyword-glyph.engine';

/** The PAID line's size on a small face. */
export const PAID_LINE_SIZE = 10;
/** The floor a line too long for {@link PAID_LINE_ROWS} shrinks to. */
export const PAID_LINE_FLOOR = 8;
/** The most rows the line may take on a small face. */
export const PAID_LINE_ROWS = 3;
/** The row pitch per px of font size. */
export const PAID_LINE_LEADING = 1.2;
/** Letter spacing of the capital run, in px (it is not scaled with the size). */
export const PAID_CAPS_SPACING = 0.4;

/** Bebas Neue advance per px of size, measured, with a little slack. */
const CAPS_EM = 0.4;
/** The serif's lowercase advance per px of size, measured, with a little slack. */
const SERIF_EM = 0.41;
/** A space, per px of size. */
const SPACE_EM = 0.24;
/** A glyph's edge per px of text size: one row of the line: 12px at 10px. */
export const GLYPH_EM = 1.2;
/** Air on each side of an inline glyph, in px. */
export const GLYPH_GAP = 1;

/** One typeface run of a line. */
export interface PaidRun {
    text: string;
    /** True for a keyword, number or `X` (condensed capitals). */
    caps: boolean;
    /** Set in glyph mode on a keyword that has a glyph: draw it instead of `text`. */
    glyph?: GlyphKeyword;
}

const CAPS_RUN = /([A-Z]{2,}|[+−]?\d+[%×]?|\bX\b)/;

/**
 * A line split into capital runs (keywords, numbers, `X`) and serif runs
 * (everything else, spaces and punctuation included).
 *
 * @example paidLineRuns('DEAL 6 or 14') // DEAL, ' ', 6, ' or ', 14
 */
export function paidLineRuns(line: string, mode: CardTextMode = 'words'): PaidRun[] {
    const runs: PaidRun[] = [];
    // `split` with one capture group alternates serif, caps, serif, caps, ...
    line.split(CAPS_RUN).forEach((text, i) => {
        if (text === '') return;
        const caps = i % 2 === 1;
        const glyph = caps && mode === 'glyphs' ? glyphKeywordFor(text) : null;
        runs.push(glyph ? { text, caps, glyph } : { text, caps });
    });
    return runs;
}

/**
 * A line as its space-separated words, each a list of runs. Glyph mode lays
 * these out as wrapping tokens (a glyph is a view, which a `<Text>` cannot
 * hold); the gap between tokens is {@link paidLineGap}.
 */
export function paidLineWords(line: string, mode: CardTextMode = 'words'): PaidRun[][] {
    return line.split(' ').filter(Boolean).map((word) => paidLineRuns(word, mode));
}

/** The gap between two words of a line, in px at `size`. */
export function paidLineGap(size: number): number {
    return SPACE_EM * size;
}

function wordWidth(word: string, size: number, mode: CardTextMode): number {
    let w = 0;
    for (const run of paidLineRuns(word, mode)) {
        if (run.glyph) {
            w += GLYPH_EM * size + 2 * GLYPH_GAP;
            continue;
        }
        const n = [...run.text].length;
        w += run.caps ? n * (CAPS_EM * size + PAID_CAPS_SPACING) : n * SERIF_EM * size;
    }
    return w;
}

/**
 * How many rows `line` takes at `size` in `room` px, wrapping at spaces. A
 * word wider than the room counts the rows it would break across.
 */
export function paidLineRows(line: string, size: number, room: number, mode: CardTextMode = 'words'): number {
    const space = SPACE_EM * size;
    let rows = 1;
    let used = 0;
    for (const word of line.split(' ').filter(Boolean)) {
        const w = wordWidth(word, size, mode);
        if (used > 0 && used + space + w > room) {
            rows += 1;
            used = 0;
        }
        if (w > room) {
            rows += Math.ceil(w / room) - 1;
            used = w % room;
        } else {
            used += (used > 0 ? space : 0) + w;
        }
    }
    return rows;
}

/** The text room of a small face: its width less the border (1.5 each side) and
 *  the ledger padding (5 each side). */
export function paidLineRoom(width: number): number {
    return width - 3 - 10;
}

/**
 * The size a small face prints `line` at: {@link PAID_LINE_SIZE} when it fits
 * {@link PAID_LINE_ROWS} rows, else the largest whole size down to
 * {@link PAID_LINE_FLOOR} that does (the floor when none does; the third row
 * then ends in an ellipsis and the large face prints the whole line).
 */
export function paidLineFit({ width, line, mode = 'words' }: { width: number; line: string; mode?: CardTextMode }): { size: number; rows: number } {
    const room = paidLineRoom(width);
    for (let size = PAID_LINE_SIZE; size >= PAID_LINE_FLOOR; size -= 1) {
        const rows = paidLineRows(line, size, room, mode);
        if (rows <= PAID_LINE_ROWS) return { size, rows };
    }
    return { size: PAID_LINE_FLOOR, rows: paidLineRows(line, PAID_LINE_FLOOR, room, mode) };
}

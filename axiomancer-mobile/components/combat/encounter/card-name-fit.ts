/**
 * Fitting a card name onto ONE line.
 *
 * A card name draws on one line on every face, and a name too long for its column
 * steps its font down until it fits. The size is computed here from the face's
 * name column and the Fondamento advance widths, so web and native agree (the
 * platform text-fit props round differently and do not exist on every renderer).
 *
 * Inputs: the name, the column's width in points, the face's nominal size and floor.
 * Output: the largest size, in half-point steps from the nominal down to the floor,
 * at which the whole name fits the column; the floor when none does.
 */

/**
 * Advance widths of Fondamento_400Regular for ASCII 32..126, in thousandths of an
 * em (read off the font file's `hmtx` through its `cmap`).
 */
const ADVANCE_PER_MILLE: readonly number[] = [
    244, 267, 341, 524, 521, 947, 1060, 195, 458, 464, 488, 503, 236, 576, 230, 453, 721, 368, 535, 538,
    664, 542, 629, 479, 590, 626, 270, 272, 444, 597, 447, 509, 742, 685, 603, 679, 758, 553, 528, 799,
    813, 358, 347, 796, 547, 1082, 891, 857, 598, 861, 700, 565, 609, 842, 718, 1058, 805, 614, 609, 347,
    462, 350, 325, 487, 241, 454, 549, 462, 573, 427, 364, 474, 543, 282, 265, 521, 270, 764, 558, 538,
    553, 575, 432, 407, 333, 571, 522, 748, 532, 556, 444, 425, 259, 425, 530,
];

/** What a character outside the table is taken to measure, per mille of an em. */
const UNKNOWN_ADVANCE = 650;

/** Headroom kept on the column so a renderer's rounding never wraps the last letter. */
const FIT_MARGIN = 0.97;

/** The step the font moves down in, in points. */
const FIT_STEP = 0.5;

/** How wide `name` draws at `size` points. */
export function cardNameWidth(name: string, size: number): number {
    let mille = 0;
    for (const ch of name) {
        const code = ch.codePointAt(0) ?? 0;
        mille += code >= 32 && code <= 126 ? ADVANCE_PER_MILLE[code - 32]! : UNKNOWN_ADVANCE;
    }
    return (mille / 1000) * size;
}

/** The largest size in `[floor, nominal]` at which `name` fits one `column` wide. */
export function fitCardNameSize(name: string, column: number, nominal: number, floor: number): number {
    const room = column * FIT_MARGIN;
    for (let size = nominal; size > floor; size -= FIT_STEP) {
        if (cardNameWidth(name, size) <= room) return size;
    }
    return floor;
}

/**
 * Cutscene paging (NV1o): a ledger panel longer than the page limit is shown as
 * two or more pages, so the panel never grows tall enough to push the Keeper
 * figure off the top of a small phone. Pure: no store, no React.
 *
 * A "sentence end" is a period followed by a space. A line over the limit is
 * split at the sentence end nearest its middle, and each half is split again
 * while it is still over the limit. A line with no sentence end that makes an
 * allowed split (two non-empty halves) stays whole. Joining a line's pages with
 * one space gives the line back exactly; no word is added, dropped or changed.
 */

/** The most characters one page holds. */
export const CUTSCENE_PAGE_LIMIT = 240;

/** Split `line` once at the sentence end nearest its middle; `null` when it has none. */
function splitOnce(line: string): [string, string] | null {
    const middle = line.length / 2;
    let best = -1;
    let bestGap = Infinity;
    for (let i = line.indexOf('. '); i !== -1; i = line.indexOf('. ', i + 1)) {
        // The first page keeps the period, the second starts after the one space.
        const head = line.slice(0, i + 1);
        const tail = line.slice(i + 2);
        if (head.trim() === '' || tail.trim() === '') continue;
        const gap = Math.abs(head.length - middle);
        if (gap < bestGap) {
            best = i;
            bestGap = gap;
        }
    }
    if (best === -1) return null;
    return [line.slice(0, best + 1), line.slice(best + 2)];
}

/** One line as pages: whole when it fits, else split at sentence ends until each page fits. */
export function paginateLine(line: string, limit: number = CUTSCENE_PAGE_LIMIT): string[] {
    if (line.length <= limit) return [line];
    const halves = splitOnce(line);
    if (!halves) return [line];
    return [...paginateLine(halves[0], limit), ...paginateLine(halves[1], limit)];
}

/** A scene's `lines` as pages, in order. */
export function paginateLines(lines: readonly string[], limit: number = CUTSCENE_PAGE_LIMIT): string[] {
    return lines.flatMap((line) => paginateLine(line, limit));
}

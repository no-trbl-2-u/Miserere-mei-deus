/**
 * Lowercase-Roman numeral helper.
 *
 * Consolidates 5 pre-existing implementations (3 array-lookup
 * variants in `combat.engine.ts`, `combat.codex.engine.ts`,
 * `event.engine.ts`; 2 algorithmic variants in
 * `encounter-seal.engine.ts` and a since-removed defeat panel).
 *
 * Lowercase Roman per the design bundle's numeral rule for
 * chronicle counts (level pages, round counters, etc.). Uppercase
 * Roman is intentionally not exposed — no caller in the codebase
 * uses uppercase Roman.
 *
 * The proper subtractive algorithm produces correct numerals for
 * any positive finite n. Replaces the pre-consolidation
 * `n < ROMAN.length ? ROMAN[n] : String(n)` fallback (which
 * surfaced `"11"`, `"12"`, … as arabic for n ≥ 11) with the
 * mathematically-correct `"xi"`, `"xii"`, … — a non-breaking
 * semantic improvement; the prior `String(n)` fallback was a
 * "we ran out of array slots" capitulation rather than a
 * deliberate design choice.
 */

const ROMAN_LOWER: ReadonlyArray<readonly [string, number]> = [
    ['m', 1000], ['cm', 900], ['d', 500], ['cd', 400],
    ['c', 100], ['xc', 90], ['l', 50], ['xl', 40],
    ['x', 10], ['ix', 9], ['v', 5], ['iv', 4],
    ['i', 1],
];

/**
 * Convert `n` to a lowercase Roman numeral.
 *
 * @param n         The number to convert.
 * @param fallback  Returned when `n` is not a positive finite
 *                  integer. Defaults to `'i'` for compatibility
 *                  with the array-lookup callers
 *                  (`combat.engine.ts::toRoman` etc.); a caller
 *                  may pass `'·'` (middle-dot) as a "no round yet"
 *                  sentinel.
 */
export function toRomanLower(n: number, fallback: string = 'i'): string {
    if (!Number.isFinite(n) || n <= 0) return fallback;
    let out = '';
    let remaining = Math.floor(n);
    for (const [s, v] of ROMAN_LOWER) {
        while (remaining >= v) {
            out += s;
            remaining -= v;
        }
    }
    return out;
}

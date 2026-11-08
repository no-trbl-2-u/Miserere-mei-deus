/**
 * `fitSizeToRoom` and `longestWord`. The widths here were read off a rendered
 * web export (Chromium, UncialAntiqua_400Regular at 18 points, 0.6 letter spacing),
 * not estimated from a font table: see `components/__tests__/FitText.test.tsx`.
 */

import { fitSizeToRoom, longestWord } from '../text-fit';

describe('fitSizeToRoom', () => {
    it('keeps the nominal size when the text already fits', () => {
        expect(fitSizeToRoom(107.9, 9, 140, 18, 11, 0.6)).toBe(18);
    });

    it('keeps the nominal size before anything is measured', () => {
        expect(fitSizeToRoom(0, 9, 140, 18, 11, 0.6)).toBe(18);
        expect(fitSizeToRoom(120, 9, 0, 18, 11, 0.6)).toBe(18);
    });

    it('steps down in half points so the text fits, never above the nominal', () => {
        // "Smokehouse Gutter" measured 214.7 wide at 18 points; room 140 holds it at 11 (about 135).
        const size = fitSizeToRoom(214.7, 17, 140, 18, 11, 0.6);
        expect(size).toBe(11);
        expect(size * 2).toBe(Math.round(size * 2));
        // The glyphs shrink with the size, the letter spacing does not.
        const glyphs18 = 214.7 - 17 * 0.6;
        expect((glyphs18 * size) / 18 + 17 * 0.6).toBeLessThanOrEqual(140);
    });

    it('stops at the floor rather than shrinking without end', () => {
        expect(fitSizeToRoom(214.7, 17, 60, 18, 11, 0.6)).toBe(11);
    });
});

describe('longestWord', () => {
    it('returns the longest run between spaces', () => {
        expect(longestWord("Suppliant's Ring")).toBe("Suppliant's");
        expect(longestWord('The Chosen')).toBe('Chosen');
        expect(longestWord('Float-Eye')).toBe('Float-Eye');
        expect(longestWord('')).toBe('');
    });
});

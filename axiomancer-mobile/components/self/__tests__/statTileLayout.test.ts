import { describe, expect, it } from '@jest/globals';

import { STAT_TILE_COUNT, STAT_TILE_GAP, statTileLayout } from '@/components/self/statTileLayout';

describe('statTileLayout', () => {
    for (const screenWidth of [360, 390]) {
        it(`fits three plaques in a ${screenWidth} wide screen with room for the label`, () => {
            const rowWidth = screenWidth - 24;
            const t = statTileLayout(rowWidth);
            expect(t.width * STAT_TILE_COUNT + STAT_TILE_GAP * (STAT_TILE_COUNT - 1)).toBeLessThanOrEqual(rowWidth);
            // HEART at 13pt with 1pt tracking is about 55pt wide: the content box must hold it.
            expect(t.width - 2 * t.padSide).toBeGreaterThanOrEqual(46);
            // The art shrinks with the plaque, never grows past its drawn scale.
            expect(t.scale).toBeLessThanOrEqual(0.6);
            expect(t.padTop).toBeGreaterThan(0);
            expect(t.padBottom).toBeGreaterThan(0);
        });
    }

    it('keeps the plaques narrower than the row on a wide screen', () => {
        const t = statTileLayout(600);
        expect(t.width * 3 + 8).toBeLessThanOrEqual(600);
        expect(t.scale).toBeLessThanOrEqual(0.6);
    });
});

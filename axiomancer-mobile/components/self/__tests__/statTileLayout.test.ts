import { describe, expect, it } from '@jest/globals';

import {
    LABEL_MIN_SIZE,
    STAT_TILE_COUNT,
    STAT_TILE_GAP,
    VALUE_GLYPHS,
    labelWidth,
    statTileLayout,
} from '@/components/self/statTileLayout';

const SCREEN_WIDTHS = [320, 360, 375, 390, 430];
// Glyph counts of the three labels; widths are bounded at 0.75 em per capital
// (the sans face's widest capitals run about 0.72 em), tracking 0.
const LABELS: Record<string, number> = { HEART: 5, BODY: 4, MIND: 4 };

describe('statTileLayout', () => {
    for (const screenWidth of SCREEN_WIDTHS) {
        describe(`${screenWidth} wide`, () => {
            const rowWidth = screenWidth - 24;
            const t = statTileLayout(rowWidth);

            it('fits three plaques and their gaps in the row', () => {
                expect(t.width * STAT_TILE_COUNT + STAT_TILE_GAP * (STAT_TILE_COUNT - 1)).toBeLessThanOrEqual(rowWidth);
                expect(t.scale).toBeLessThanOrEqual(0.6);
            });

            it('holds every label on one line inside the frame', () => {
                expect(t.contentWidth).toBe(t.width - 2 * t.padSide);
                expect(t.labelSize).toBeGreaterThanOrEqual(LABEL_MIN_SIZE);
                for (const [label, glyphs] of Object.entries(LABELS)) {
                    expect({ label, fits: labelWidth(glyphs, t.labelSize) <= t.contentWidth }).toEqual({ label, fits: true });
                }
            });

            it('holds a two digit value whole', () => {
                expect(labelWidth(VALUE_GLYPHS, t.valueSize)).toBeLessThanOrEqual(t.contentWidth);
                expect(t.valueSize).toBeGreaterThanOrEqual(24);
            });
        });
    }

    it('keeps the full label size where there is room', () => {
        expect(statTileLayout(600).labelSize).toBe(13);
    });
});

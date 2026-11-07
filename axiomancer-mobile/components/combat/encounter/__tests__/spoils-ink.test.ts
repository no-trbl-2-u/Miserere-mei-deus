/**
 * The Spoils' inks on parchment hold the readability floor: every ink the
 * fight summary and the card offer draw on vellum measures at least 4.5:1
 * against the darkest parchment tone, including the disabled button's faded
 * text, and none of them is a gold or amber.
 */

import { describe, expect, it } from '@jest/globals';

import { HUE } from '@/theme/hue';
import {
    DISABLED_OPACITY,
    OUTCOME_INK,
    OFFER_TILE_CHROME,
    PARCHMENT_DARKEST,
    VELLUM_OFFER_W,
    VELLUM_PANEL_PAD,
    SPOILS_INK,
    blend,
    contrastRatio,
} from '@/components/combat/encounter/spoils-ink';

const FLOOR = 4.5;

describe('Spoils inks on vellum', () => {
    it.each(Object.entries(SPOILS_INK))('%s ink measures 4.5:1 on the darkest parchment', (_name, ink) => {
        expect(contrastRatio(ink, PARCHMENT_DARKEST)).toBeGreaterThanOrEqual(FLOOR);
    });

    it.each(Object.entries(OUTCOME_INK))('the %s outcome ink measures 4.5:1', (_outcome, ink) => {
        expect(contrastRatio(ink, PARCHMENT_DARKEST)).toBeGreaterThanOrEqual(FLOOR);
    });

    it('a disabled button (inked in the body ink) keeps its text readable', () => {
        for (const ink of [SPOILS_INK.body]) {
            const faded = blend(ink, PARCHMENT_DARKEST, DISABLED_OPACITY);
            expect(contrastRatio(faded, PARCHMENT_DARKEST)).toBeGreaterThanOrEqual(FLOOR);
        }
    });

    it('no ink is the gold or amber of the dark panel', () => {
        const banned = [HUE.payoffGold, HUE.goldAccent, HUE.statDownAmber, HUE.hexAmber, HUE.markGold].map((c) => c.toLowerCase());
        for (const ink of [...Object.values(SPOILS_INK), ...Object.values(OUTCOME_INK)]) expect(banned).not.toContain(ink.toLowerCase());
    });

    it('the green Victory is darker than the dark panel green, which fails on parchment', () => {
        expect(contrastRatio(HUE.boonGreen, PARCHMENT_DARKEST)).toBeLessThan(FLOOR);
        expect(contrastRatio(SPOILS_INK.victory, PARCHMENT_DARKEST)).toBeGreaterThanOrEqual(FLOOR);
    });

    it('three vellum offer tiles fit inside the ornament band at 360pt', () => {
        const SCREEN = 360;
        const BACKDROP_PAD = 2 * 2;
        const SIDE_BAND = 42;
        const tiles = 3 * (VELLUM_OFFER_W + OFFER_TILE_CHROME);
        expect(VELLUM_PANEL_PAD).toBeGreaterThanOrEqual(SIDE_BAND - 2);
        expect(tiles).toBeLessThanOrEqual(SCREEN - BACKDROP_PAD - 2 * VELLUM_PANEL_PAD);
    });
});

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
    PARCHMENT_DARKEST,
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
        const banned = [HUE.payoffGold].map((c) => c.toLowerCase());
        for (const ink of Object.values(SPOILS_INK)) expect(banned).not.toContain(ink.toLowerCase());
    });

    it('the green Victory is darker than the dark panel green, which fails on parchment', () => {
        expect(contrastRatio(HUE.boonGreen, PARCHMENT_DARKEST)).toBeLessThan(FLOOR);
        expect(contrastRatio(SPOILS_INK.victory, PARCHMENT_DARKEST)).toBeGreaterThanOrEqual(FLOOR);
    });
});

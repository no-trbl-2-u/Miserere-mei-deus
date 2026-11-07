/**
 * The Wilds' ink (spec 152.2, A2): every colour text wears on a vellum piece
 * measures at least 4.5:1 on the darkest parchment tone those pieces carry,
 * and none of them is gold or amber.
 */

import { describe, expect, it } from '@jest/globals';

import { AXM } from '@/theme/axm';
import { VELLUM_INK, INK_SOFT, VELLUM_OXBLOOD, PARCHMENT_SHADOW, overlay } from '@/components/exploration/wildsInk';

const channel = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string): number => {
    const n = parseInt(hex.slice(1), 16);
    return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};

/** WCAG contrast ratio of two `#rrggbb` colours. */
function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

describe('the Wilds ink', () => {
    it.each([
        ['VELLUM_INK', VELLUM_INK],
        ['INK_SOFT', INK_SOFT],
        ['VELLUM_OXBLOOD', VELLUM_OXBLOOD],
    ])('%s measures at least 4.5:1 on the darkest parchment', (_name, colour) => {
        expect(contrast(colour, PARCHMENT_SHADOW)).toBeGreaterThanOrEqual(4.5);
    });

    it('oxblood is a red, not the dark-brown body ink (T, 2026-11-06)', () => {
        const n = parseInt(VELLUM_OXBLOOD.slice(1), 16);
        const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        expect(r).toBeGreaterThan(g * 3);
        expect(r).toBeGreaterThan(b * 3);
        expect(VELLUM_OXBLOOD).not.toBe(VELLUM_INK);
    });

    it('wears none of the palette gold (sulfur)', () => {
        for (const gold of [AXM.sulfur]) {
            expect([VELLUM_INK, INK_SOFT, VELLUM_OXBLOOD]).not.toContain(gold);
        }
    });
});

describe('overlay', () => {
    it('adds to today\'s style per key and keeps keys it does not name', () => {
        const base = { name: { fontSize: 16, color: '#fff' }, other: { margin: 1 } };
        const out = overlay(base, { name: { color: '#000' } });
        expect(out.name).toEqual([{ fontSize: 16, color: '#fff' }, { color: '#000' }]);
        expect(out.other).toBe(base.other);
    });
});

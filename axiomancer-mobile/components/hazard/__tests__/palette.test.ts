/**
 * Hazard-minigame palette.
 *
 * Isolates components/hazard/palette.ts's own contract — it is consumed
 * by seven hazard components (HazardCard, HazardBoard, HazardDie,
 * HazardOverlays, RewardsOverlay, RouteSelect) yet
 * carried no test of any kind. Colour is never the only channel here:
 * every die face pairs its colour with a distinct glyph shape, so the
 * map's completeness and per-kind glyph distinctness is a real
 * colour-blind-play contract, not cosmetic. Pins:
 *   - DIE covers every hazard die kind with a complete colorway, every
 *     colour token is valid hex, every label is uppercase, and every
 *     glyph is in the documented union and distinct per kind.
 *   - RARITY_UI / TYPE_ACCENT / TYPE_INK carry their expected keys with
 *     valid hex accents and uppercase rarity labels.
 *   - the card-stock ink constants are valid hex.
 *   - routeAccent derives `safe` from the live palette's rust and keeps
 *     `risk` pinned to the fixed HZ.acid, so it tracks the active theme.
 */

import { describe, expect, it } from '@jest/globals';

import { paletteFor, DEFAULT_THEME_ID, THEME_ORDER } from '@/theme/palette';

import {
    CARD_EDGE,
    CARD_INK,
    CARD_INK2,
    CARD_PAPER,
    DIE,
    HZ,
    RARITY_UI,
    routeAccent,
    TYPE_ACCENT,
    TYPE_INK,
    type DieColorway,
} from '../palette';

const HEX = /^#[0-9a-fA-F]{6}$/;

const DIE_KINDS = ['red', 'blue', 'purple', 'gold', 'hex'] as const;
const VALID_GLYPHS: DieColorway['glyph'][] = ['blade', 'eye', 'crescent', 'sun', 'cross'];

describe('hazard palette — DIE colorway map', () => {
    it('covers every hazard die kind exactly once', () => {
        expect(Object.keys(DIE).sort()).toEqual([...DIE_KINDS].sort());
    });

    it.each(DIE_KINDS)('gives %s a complete colorway with valid hex tokens', (kind) => {
        const cw = DIE[kind];
        expect(cw).toBeDefined();
        for (const token of [cw.c, cw.dark, cw.lite, cw.bg] as const) {
            expect(token).toMatch(HEX);
        }
        expect(cw.label).toBe(cw.label.toUpperCase());
        expect(cw.label.length).toBeGreaterThan(0);
        expect(VALID_GLYPHS).toContain(cw.glyph);
    });

    it('pairs every die kind with a distinct glyph (the non-colour channel)', () => {
        const glyphs = DIE_KINDS.map((k) => DIE[k].glyph);
        expect(new Set(glyphs).size).toBe(glyphs.length);
    });

    it('pairs every die kind with a distinct base colour', () => {
        const colours = DIE_KINDS.map((k) => DIE[k].c);
        expect(new Set(colours).size).toBe(colours.length);
    });
});

describe('hazard palette — rarity / type accents', () => {
    it('RARITY_UI covers common/uncommon/rare with uppercase labels and valid hex', () => {
        expect(Object.keys(RARITY_UI).sort()).toEqual(['common', 'rare', 'uncommon']);
        for (const r of ['common', 'uncommon', 'rare'] as const) {
            const ui = RARITY_UI[r];
            expect(ui.c).toMatch(HEX);
            expect(ui.label).toBe(ui.label.toUpperCase());
        }
    });

    it('TYPE_ACCENT carries force/escape/passage as valid hex', () => {
        expect(Object.keys(TYPE_ACCENT).sort()).toEqual(['escape', 'force', 'passage']);
        for (const v of Object.values(TYPE_ACCENT)) {
            expect(v).toMatch(HEX);
        }
    });

    it('TYPE_INK carries force/escape as valid hex', () => {
        expect(Object.keys(TYPE_INK).sort()).toEqual(['escape', 'force']);
        for (const v of Object.values(TYPE_INK)) {
            expect(v).toMatch(HEX);
        }
    });
});

describe('hazard palette — card-stock constants', () => {
    it('exposes valid hex ink/paper/edge constants', () => {
        for (const token of [CARD_PAPER, CARD_INK, CARD_INK2, CARD_EDGE]) {
            expect(token).toMatch(HEX);
        }
    });
});

describe('hazard palette — routeAccent', () => {
    it('derives the SAFE accent from the live palette rust and pins RISK to HZ.acid', () => {
        const AXM = paletteFor(DEFAULT_THEME_ID);
        const accent = routeAccent(AXM);
        expect(accent.safe).toBe(AXM.rust);
        expect(accent.risk).toBe(HZ.acid);
    });

    it('tracks the active theme — every registered theme derives SAFE from its own rust', () => {
        for (const id of THEME_ORDER) {
            const AXM = paletteFor(id);
            const accent = routeAccent(AXM);
            expect(accent.safe).toBe(AXM.rust);
            expect(accent.risk).toBe(HZ.acid);
        }
    });

    it('yields a different SAFE accent when two themes have different rust', () => {
        const a = paletteFor(DEFAULT_THEME_ID);
        const other = paletteFor(THEME_ORDER.find((id) => id !== DEFAULT_THEME_ID)!);
        if (other.rust !== a.rust) {
            expect(routeAccent(a).safe).not.toBe(routeAccent(other).safe);
        }
        expect(routeAccent(a).risk).toBe(routeAccent(other).risk);
    });
});

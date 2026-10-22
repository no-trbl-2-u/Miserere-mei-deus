/**
 * Hazard minigame palette — extends the canonical AXM tokens with the
 * minigame's four-colour card/dice identities and board hues.
 *
 * Colour is never the only channel: every die face pairs its colour
 * with a distinct glyph shape (blade / eye / crescent / sun / cross).
 */

import type { Palette } from '@/theme/palette';
import type { HazardDieKind } from '@mechanics';
import { HUE } from '@/theme/axm';

export const HZ = {
    acid: HUE.hzAcid,
    acidDim: HUE.hzAcidDim,
    purple: HUE.hzPurple,
    purpleDeep: HUE.hzPurpleDeep,
    gold: HUE.payoffGold,
    goldDim: HUE.hzGoldDim,
    steel: HUE.blockBlue,
    stone: HUE.hzStone,
    stoneHi: HUE.hzStoneHi,
} as const;

export interface DieColorway {
    c: string;
    dark: string;
    lite: string;
    bg: string;
    label: string;
    glyph: 'blade' | 'eye' | 'crescent' | 'sun' | 'cross';
}

export const DIE: Record<HazardDieKind, DieColorway> = {
    red: { c: HUE.hzRed, dark: HUE.hzRedDark, lite: HUE.hzRedLite, bg: HUE.hzRedBg, label: 'RED', glyph: 'blade' },
    blue: { c: HUE.hzBlue, dark: HUE.hzBlueDark, lite: HUE.hzBlueLite, bg: HUE.hzBlueBg, label: 'BLUE', glyph: 'eye' },
    purple: { c: HUE.hzPurple, dark: HUE.hzPurpleDark, lite: HUE.hzPurpleLite, bg: HUE.hzPurpleDeep, label: 'PURPLE', glyph: 'crescent' },
    gold: { c: HUE.payoffGold, dark: HUE.hzGoldDim, lite: HUE.hzGoldLite, bg: HUE.hzGoldBg, label: 'YELLOW', glyph: 'sun' },
    hex: { c: HUE.hzHex, dark: HUE.hzHexDark, lite: HUE.hzHexLite, bg: HUE.hzHexDark, label: 'HEX', glyph: 'cross' },
};

/** Progress-type accents (FORCE rust-red fist / ESCAPE steel-blue runner). */
export const TYPE_ACCENT = {
    force: HUE.hzRed,
    escape: HUE.hzBlue,
    passage: HUE.hzPassage,
} as const;

/** Darker inks so type numbers read on parchment card stock. */
export const TYPE_INK = { force: HUE.hzForceInk, escape: HUE.hzEscapeInk } as const;

/**
 * A cost, kept apart from both gain inks so a minus never reads as a gain:
 * a dark ochre that holds its contrast on parchment card stock, and the
 * combat "stat down" amber for a meter in debt on the dark board.
 */
export const COST_INK = HUE.hzGoldDim;
export const DEBT_ACCENT = HUE.statDownAmber;

export const CARD_PAPER = HUE.hzCardPaper;
export const CARD_INK = HUE.hzCardInk;
export const CARD_INK2 = HUE.hzCardInk2;
export const CARD_EDGE = HUE.hzCardEdge;

export const RARITY_UI = {
    common: { c: HUE.stoneGrey, label: 'COMMON' },
    uncommon: { c: HUE.hzBlue, label: 'UNCOMMON' },
    rare: { c: HZ.gold, label: 'RARE' },
} as const;

/**
 * Route-type accents (SAFE rust / RISK acid-green). The SAFE accent
 * tracks the active theme's `rust`, so this is a function of the live
 * palette — call it with `usePalette()` inside a component.
 */
export const routeAccent = (AXM: Palette) =>
    ({ safe: AXM.rust, risk: HZ.acid }) as const;

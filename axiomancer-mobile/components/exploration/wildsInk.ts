/**
 * The Wilds' ink: the colours text wears on a vellum piece.
 *
 * Gold and amber read poorly on parchment, so the Wilds' vellum places swap
 * the dark panels' light-on-dark colours for iron-gall brown (body) and
 * oxblood (what was gold or amber). Every text colour measures at least 4.5:1
 * on `PARCHMENT_SHADOW`, the darkest tone found in the vellum pieces' writing
 * area (the 5th-percentile pixel of the central 40% of `quest-row`), so a word
 * on a shaded patch of paper still passes. The check is
 * `__tests__/wildsInk.test.ts`. The values live in `HUE` (`theme/hue.ts`).
 *
 * The oxblood is a shade deeper than the 7a1f14 first named: that value
 * measures 4.35:1 on the darkest patch, under the 4.5:1 bar.
 */

import { HUE } from '@/theme/hue';

// The shared vellum ink is defined in KitBackdrop.tsx.
export { VELLUM_INK, VELLUM_OXBLOOD } from '@/components/experience/KitBackdrop';

/** Secondary body text (a blurb, an objective): a lighter brown that still clears 4.5:1. */
export const INK_SOFT = HUE.vellumInkSoft;

/** The vitae fill, a clear red that reads against the paper. */
export const VITAE_RED = HUE.vellumVitaeRed;

/** The darkest parchment tone behind writing on the Wilds' vellum pieces. */
export const PARCHMENT_SHADOW = HUE.vellumShadow;

/**
 * Lay a vellum style sheet over today's, key by key: a key in `over` becomes
 * `[base, over]` so it adds to today's style rather than replacing it (an
 * inked `name` keeps its face and size and changes its colour). A key only in
 * `base` is kept as it is.
 */
export function overlay<T extends Record<string, unknown>>(base: T, over: Record<string, unknown>): T {
    const out: Record<string, unknown> = { ...base };
    for (const key of Object.keys(over)) out[key] = key in base ? [base[key], over[key]] : over[key];
    return out as T;
}

/** The solid black band behind the Wilds' top (the dev-toggled variant). */
export const BAND_BLACK = HUE.black;

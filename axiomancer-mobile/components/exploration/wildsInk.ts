/**
 * The Wilds' ink: the colours text wears on a vellum piece (spec 152.2, A2/A3).
 *
 * Gold and amber read poorly on parchment, so the Wilds' vellum places swap
 * today's light-on-dark colours for iron-gall brown (body) and oxblood (the
 * accents that were gold or amber). T, 2026-11-06: oxblood red, not the
 * dark-brown body ink. Every colour here measures at least 4.5:1 on
 * `PARCHMENT_SHADOW`, the darkest tone found in the converted vellum pieces'
 * writing area (the 5th-percentile pixel of the central 40% of `quest-row`,
 * the darkest of the five pieces the Wilds draws), so a word sitting on a
 * shaded patch of the paper still passes. The check is
 * `__tests__/wildsInk.test.ts`.
 *
 * VELLUM_OXBLOOD is a shade deeper than the spec's "about #7a1f14": that value
 * measures 4.35:1 on the darkest patch, under the 4.5:1 bar.
 */

// VELLUM_INK and VELLUM_OXBLOOD are the shared vellum ink, defined in
// KitBackdrop.tsx (sibling 152.5 exports the same two names from there).
export { VELLUM_INK, VELLUM_OXBLOOD } from '@/components/experience/KitBackdrop';

/** Secondary body text (a blurb, an objective): a lighter brown that still clears 4.5:1. */
export const INK_SOFT = '#4a3624';

/** The vitae fill, a clear red that reads against the paper. */
export const VITAE_RED = '#8a2418';

/** The darkest parchment tone behind writing on the Wilds' vellum pieces. */
export const PARCHMENT_SHADOW = '#c0a47d';

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
export const BAND_BLACK = '#000000';

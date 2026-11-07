/**
 * The Spoils' inks on vellum: the fight summary and the card offer, when
 * their places wear the parchment kit.
 *
 * Gold and amber never sit on parchment. Body text is the iron-gall brown,
 * every accent that is gold or amber on the dark panel is oxblood, and the
 * outcome colours (green Victory, purple Mercy) are darkened to a readable
 * ink. Each ink is measured against the darkest parchment tone by
 * `__tests__/spoils-ink.test.ts`, which holds the 4.5:1 floor.
 *
 * Pure constants and one pure function; no store, no rendering.
 */

import { HUE } from '@/theme/hue';

/** Every ink the Spoils draws on parchment. */
export const SPOILS_INK = {
    body: HUE.vellumInk,
    soft: HUE.vellumInkSoft,
    accent: HUE.vellumOxblood,
    victory: HUE.vellumVictory,
    mercy: HUE.vellumMercy,
} as const;

/** The headline, best-card line and CONTINUE ink for each outcome. */
export const OUTCOME_INK: Readonly<Record<string, string>> = {
    victory: SPOILS_INK.victory,
    mercy: SPOILS_INK.mercy,
    defeat: SPOILS_INK.accent,
    retreat: SPOILS_INK.soft,
};

/** How faint a disabled vellum button is drawn (its text blends with the page). */
export const DISABLED_OPACITY = 0.8;

/** The darkest tone of the parchment art, which every ink is measured on. */
export const PARCHMENT_DARKEST = HUE.vellumShadow;

const channel = (hex: string, at: 1 | 3 | 5): number => {
    const v = parseInt(hex.slice(at, at + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string): number =>
    0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);

/** WCAG contrast ratio of two `#rrggbb` colours. */
export function contrastRatio(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

/** `fg` drawn at `opacity` over `bg`, as a `#rrggbb` colour. */
export function blend(fg: string, bg: string, opacity: number): string {
    const mix = (at: 1 | 3 | 5) => {
        const f = parseInt(fg.slice(at, at + 2), 16);
        const b = parseInt(bg.slice(at, at + 2), 16);
        return Math.round(f * opacity + b * (1 - opacity)).toString(16).padStart(2, '0');
    };
    return `#${mix(1)}${mix(3)}${mix(5)}`;
}

/**
 * Vellum offer-tile geometry. The panel art is 741x437 drawn at 0.3, so 42pt
 * of side ornament per side; the panel pads 40pt. Three tiles (face + 3pt
 * padding + 2pt border per side) must fit what is left at the narrowest phone
 * (360pt, less the backdrop's 2pt padding per side).
 */
export const VELLUM_PANEL_PAD = 40;
export const VELLUM_OFFER_W = 80;
export const VELLUM_OFFER_H = 118;
/** The offer tile's frame: border and padding per side, shared with `CombatRewardsOverlay`'s `offerFrame`. */
export const OFFER_FRAME_BORDER = 2;
export const OFFER_FRAME_PAD = 3;
export const OFFER_TILE_CHROME = 2 * (OFFER_FRAME_BORDER + OFFER_FRAME_PAD);

/**
 * `KeywordGlyph`: the icon a keyword wears on a card face in glyph mode (and
 * beside its word on the open card).
 *
 * `KEYWORD_GLYPH_COMPONENT` is the one place that says which component draws
 * which keyword; to swap a glyph for another drawing (a generated image), point
 * its entry at a different component. The colour is the keyword's category
 * (`GLYPH_CATEGORY`), unless the caller passes one.
 */

import React from 'react';

import { GLYPH_CATEGORY, glyphLabel, type GlyphCategory, type GlyphKeyword } from '@/state/presenters/keyword-glyph.engine';
import { HUE } from '@/theme/axm';

import * as G from './glyphs';

export type { GlyphProps } from './glyphs';

export const KEYWORD_GLYPH_COMPONENT: Readonly<Record<GlyphKeyword, (p: G.GlyphProps) => React.JSX.Element>> = Object.freeze({
    DEAL: G.DealGlyph,
    GUARD: G.GuardGlyph,
    HEAL: G.HealGlyph,
    SACRIFICE: G.SacrificeGlyph,
    WAIVE: G.WaiveGlyph,
    EXILE: G.ExileGlyph,
    TETHER: G.TetherGlyph,
    LEECH: G.LeechGlyph,
    VULNERABLE: G.VulnerableGlyph,
    INFERNO: G.InfernoGlyph,
    BLIZZARD: G.BlizzardGlyph,
    STORM: G.StormGlyph,
    FROZEN: G.FrozenGlyph,
    DRAW: G.DrawGlyph,
    THORNS: G.ThornsGlyph,
    REFLECT: G.ReflectGlyph,
    RETRIEVE: G.RetrieveGlyph,
    DISCARD: G.DiscardGlyph,
    RADIANCE: G.RadianceGlyph,
    MERCY: G.MercyGlyph,
    YIELDING: G.YieldingGlyph,
});

/** The colour each category draws in. */
export const GLYPH_CATEGORY_COLOR: Readonly<Record<GlyphCategory, string>> = Object.freeze({
    damage: HUE.glyphDamage,
    defence: HUE.glyphDefence,
    blood: HUE.glyphBlood,
    life: HUE.boonGreen,
    hex: HUE.glyphHex,
    gold: HUE.glyphGold,
    fire: HUE.glyphFire,
    ice: HUE.glyphIce,
    storm: HUE.goldAccent,
    bone: HUE.glyphBone,
    ember: HUE.glyphEmber,
});

/** The colour a keyword's glyph draws in. */
export function glyphColor(keyword: GlyphKeyword): string {
    return GLYPH_CATEGORY_COLOR[GLYPH_CATEGORY[keyword]];
}

export interface KeywordGlyphProps {
    keyword: GlyphKeyword;
    /** Edge in px. */
    size: number;
    /** Overrides the category colour (the armed-card tint). */
    color?: string;
}

export function KeywordGlyph({ keyword, size, color }: KeywordGlyphProps) {
    const Glyph = KEYWORD_GLYPH_COMPONENT[keyword];
    return <Glyph size={size} color={color ?? glyphColor(keyword)} label={glyphLabel(keyword)} />;
}

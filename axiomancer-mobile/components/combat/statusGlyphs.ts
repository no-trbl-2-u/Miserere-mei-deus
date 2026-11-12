/**
 * Status-effect glyphs.
 *
 * Presentation-only mapping from an engine `Effect` to a visible glyph + colour
 * so the player can SEE every status effect on the combat board — status
 * effects are an authored tool and must stay legible (VISION.md §Combat
 * vision). The engine owns the effect content; this module
 * owns the visual mapping (ADR-0001/0003).
 *
 * Each effect resolves to:
 *   - a distinctive unicode glyph (a curated per-effect symbol where it matters,
 *     falling back to a category glyph),
 *   - a category colour (DoT = flame/red, control = chain/purple, stat-down =
 *     arrow-down/orange, buffs = arrow-up/green, …),
 *   - a coarse `kind` the UI can group by.
 *
 * Pure (its one import is `theme/hue`, itself import-free, by relative path
 * so the mechanics catalog export can load it) so it is trivially
 * unit-testable and usable anywhere.
 */

import { HUE } from '../../theme/hue';

export type StatusGlyphKind =
    | 'dot' | 'control' | 'statdown' | 'statup' | 'mark';

/** Minimal shape this module reads from an engine Effect (structural typing). */
export interface EffectLike {
    id: string;
    name?: string;
    type?: 'buff' | 'debuff';
    category?: string;
    payload?: {
        damageOverTime?: unknown;
        actionRestriction?: unknown;
        statModifiers?: { value: number }[];
    };
}

export interface StatusGlyph {
    glyph: string;
    color: string;
    kind: StatusGlyphKind;
    /** Accessible label (effect name or a humanised id). */
    label: string;
}

/** Category colours. Aligned to the colour palette where it
 *  reads naturally; tuned for dark-board contrast. */
export const GLYPH_COLORS: Record<StatusGlyphKind, string> = {
    dot: HUE.damageRed,        // flame red — erosion
    control: HUE.tickPurple,    // chain purple
    statdown: HUE.statDownAmber,   // arrow-down amber
    statup: HUE.boonGreen,     // arrow-up green
    mark: HUE.markGold,       // tracking gold
};

/**
 * Curated per-effect glyphs for the named, recognisable effects (so a poison
 * reads differently from a bleed reads differently from a burn). Anything not
 * listed falls back to its category glyph via `kindGlyph`.
 */
const EFFECT_GLYPHS: Record<string, string> = {
    // Only ids the effects library defines.
    // ── DoT ──
    debuff_poison: '☠',
    debuff_bleed: '🩸',
    debuff_creeping_doom: '🕸',
    // ── Control ──
    debuff_petrify: '🗿',
    // ── Stat-down / marks ──
    debuff_mark: '◉',
    debuff_quarter: '☙',
    // Word's affliction: the foe's guard is open.
    debuff_vulnerable: '▼',
    // A foe's SHOCK: every hit on the bearer lands harder.
    debuff_shock: '↯',
};

/** Category fallback glyphs. */
const KIND_GLYPHS: Record<StatusGlyphKind, string> = {
    dot: '🔥',
    control: '⛓',
    statdown: '▼',
    statup: '▲',
    mark: '◎',
};

/** Classifies an effect into a coarse glyph kind from its payload. */
export function classifyGlyphKind(effect: EffectLike): StatusGlyphKind {
    const p = effect.payload ?? {};
    if (p.damageOverTime) return 'dot';
    if (p.actionRestriction || effect.category === 'control') return 'control';
    if (effect.id?.endsWith('_mark')) return 'mark';
    const isDebuff = effect.type === 'debuff';
    const hasNegStat = (p.statModifiers ?? []).some(m => m.value < 0);
    if (isDebuff || hasNegStat) return 'statdown';
    return 'statup';
}

/** Humanises an effect id when no name is supplied. */
function humanise(id: string): string {
    return id.replace(/^(buff|debuff|tier\d)_/i, '').replace(/_/g, ' ');
}

/** Resolves the full glyph view-model for an effect. */
export function effectGlyph(effect: EffectLike): StatusGlyph {
    const kind = classifyGlyphKind(effect);
    const glyph = EFFECT_GLYPHS[effect.id] ?? KIND_GLYPHS[kind];
    return {
        glyph,
        color: GLYPH_COLORS[kind],
        kind,
        label: effect.name ?? humanise(effect.id),
    };
}

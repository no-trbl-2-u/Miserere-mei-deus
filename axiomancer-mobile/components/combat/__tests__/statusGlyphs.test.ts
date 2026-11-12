/**
 * Unit — status-effect glyph mapping.
 *
 * Every effect must resolve to a visible glyph + a category colour + a coarse
 * kind so the player can SEE it. Distinctive named effects get distinctive
 * glyphs; everything else falls back to its category glyph.
 */

import { describe, expect, it } from '@jest/globals';
import { effectGlyph, classifyGlyphKind, GLYPH_COLORS } from '../statusGlyphs';

describe('statusGlyphs — classification', () => {
    it('classifies a DoT effect as dot', () => {
        expect(classifyGlyphKind({ id: 'debuff_poison', type: 'debuff', category: 'damage', payload: { damageOverTime: { damagePerRound: 4 } } })).toBe('dot');
    });
    it('classifies a control effect as control', () => {
        expect(classifyGlyphKind({ id: 'debuff_stun', type: 'debuff', category: 'control', payload: { actionRestriction: { skipTurn: true } } })).toBe('control');
    });
    it('classifies a stat debuff as statdown', () => {
        expect(classifyGlyphKind({ id: 'debuff_defense_down', type: 'debuff', category: 'defense', payload: { statModifiers: [{ value: -3 }] } })).toBe('statdown');
    });
    it('classifies a buff as statup', () => {
        expect(classifyGlyphKind({ id: 'buff_x', type: 'buff', category: 'stat', payload: { statModifiers: [{ value: 2 }] } })).toBe('statup');
    });
});

describe('statusGlyphs — resolution', () => {
    it('gives distinctive glyphs to named effects', () => {
        expect(effectGlyph({ id: 'debuff_poison', type: 'debuff', payload: { damageOverTime: {} } }).glyph).toBe('☠');
        expect(effectGlyph({ id: 'debuff_bleed', type: 'debuff', payload: { damageOverTime: {} } }).glyph).toBe('🩸');
        expect(effectGlyph({ id: 'debuff_creeping_doom', type: 'debuff', payload: { damageOverTime: {} } }).glyph).toBe('🕸');
        expect(effectGlyph({ id: 'debuff_petrify', type: 'debuff', category: 'control', payload: { actionRestriction: { skipTurn: true } } }).glyph).toBe('🗿');
    });

    it('curates the core keyword afflictions (card-wording audit 2026-07-12; keyword audit 2026-09-27)', () => {
        // Mark/Quarter/Vulnerable ARE the keyword system — no generic category icons.
        expect(effectGlyph({ id: 'debuff_mark', type: 'debuff' }).glyph).toBe('◉');
        expect(effectGlyph({ id: 'debuff_quarter', type: 'debuff' }).glyph).toBe('☙');
        // Word's VULNERABLE is curated, not left to the category ▼
        // fallback (the same arrow, on purpose).
        expect(effectGlyph({ id: 'debuff_vulnerable', type: 'debuff' }).glyph).toBe('▼');
    });

    it('curates only ids the effects library defines (keyword audit 2026-09-27)', () => {
        // Rows for undefined ids render nothing and hide drift; such ids
        // fall back like any unknown id.
        for (const id of ['debuff_backfire', 'debuff_kindling_ember', 'debuff_nettle_sting', 'buff_thorns', 'debuff_burn', 'debuff_stun']) {
            const g = effectGlyph({ id, type: 'debuff', category: 'control', payload: { actionRestriction: { skipTurn: true } } });
            expect(g.glyph).toBe('⛓');
        }
    });

    it('falls back to a category glyph for unnamed effects, with a colour and label', () => {
        const g = effectGlyph({ id: 'debuff_unknown_thing', type: 'debuff', category: 'control', payload: { actionRestriction: { skipTurn: true } } });
        expect(g.glyph).toBe('⛓');               // control fallback
        expect(g.color).toBe(GLYPH_COLORS.control);
        expect(g.kind).toBe('control');
        expect(g.label).toBe('unknown thing');    // humanised id
    });

    it('every glyph kind has a colour', () => {
        for (const kind of Object.keys(GLYPH_COLORS)) {
            expect(typeof (GLYPH_COLORS as Record<string, string>)[kind]).toBe('string');
        }
    });
});

/**
 * CombatCardFace in glyph mode (Settings > Card text). Only the keywords change
 * form: each printed keyword becomes its glyph on the small face, everything
 * else on the line stays as it prints, and a screen reader still hears the
 * words. The open card shows the glyph beside the word in both modes.
 */

import React from 'react';
import { Text } from 'react-native';
import Svg from 'react-native-svg';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { rollEncounterDice } from '@mechanics';
import { CombatCardFace, HAND_CARD_H, HAND_CARD_W } from '@/components/combat/encounter/CombatBoard';
import { glyphKeywordFor } from '@/state/presenters/keyword-glyph.engine';
import { buildCombatViewModel, type CombatCardVM } from '@/state/presenters/combat-encounter.engine';
import { type CardTextMode, createSettingsStore } from '@/state/settings';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

const GREY = ['grey-strike', 'grey-ward', 'grey-word'];
const NO_STORAGE = { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined };

function handCard(cardId: string): CombatCardVM {
    const { combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: GREY, baseStats: { heart: 8, body: 8, mind: 8 } }, seed: 16 });
    const card = buildCombatViewModel(rollEncounterDice(combat).state).hand.find((c) => c.cardId === cardId);
    if (!card) throw new Error(`${cardId} not in the opening hand`);
    return card;
}

function renderFace(card: CombatCardVM, mode: CardTextMode, large = false, largeW = 300) {
    const settings = createSettingsStore({ storage: NO_STORAGE, initial: { cardText: mode } });
    const [w, h] = large ? [largeW, Math.round(largeW * 1.43)] : [HAND_CARD_W, HAND_CARD_H];
    return render(withAllProviders(<CombatCardFace card={card} width={w} height={h} large={large} />, { settings }).tree);
}

type Node = { type: unknown; props: Record<string, unknown>; children: unknown[] };
const nodes = (n: unknown, out: Node[] = []): Node[] => {
    if (n && typeof n === 'object' && 'type' in n) { out.push(n as Node); for (const c of (n as Node).children ?? []) nodes(c, out); }
    return out;
};
const textOf = (n: unknown): string => (typeof n === 'string' ? n : n && typeof n === 'object' && 'children' in n ? ((n as Node).children ?? []).map(textOf).join('') : '');

/** The words a small face's PAID line prints (one token each, glyph-only tokens empty), and how many glyph views sit in it. */
function lineParts(): { text: string; glyphs: number } {
    const line = screen.getByTestId('combat-card-face-paid-line');
    void line;
    const json = screen.toJSON() as unknown;
    const root = nodes(Array.isArray(json) ? { type: 'root', props: {}, children: json } : json).find((n) => n.props?.testID === 'combat-card-face-paid-line')!;
    const text = (root.children as unknown[]).map(textOf).filter(Boolean).join(' ');
    return { text, glyphs: screen.queryAllByTestId('combat-card-face-glyph').length };
}

describe('the small face', () => {
    it('words mode draws no glyph', () => {
        renderFace(handCard('grey-strike'), 'words');
        expect(lineParts().glyphs).toBe(0);
        expect(screen.getByTestId('combat-card-face-paid-line').props.accessibilityLabel).toBe(handCard('grey-strike').face.paidLine);
    });

    it.each(GREY)('glyph mode swaps the keywords of %s for glyphs and leaves the rest of the line alone', (id) => {
        const card = handCard(id);
        renderFace(card, 'glyphs');
        const { text, glyphs } = lineParts();
        const words = card.face.paidLine.match(/\b[A-Z]{2,}\b/g) ?? [];
        const keywords = words.filter((w) => glyphKeywordFor(w));
        expect(keywords.length).toBeGreaterThan(0);
        expect(glyphs).toBe(keywords.length);
        for (const w of keywords) expect(screen.getAllByLabelText(w).length).toBeGreaterThan(0);
        // what is left is the printed line with each keyword taken out
        expect(text).toBe(card.face.paidLine.replace(/\b[A-Z]{2,}\b/g, (w) => (glyphKeywordFor(w) ? '' : w)).split(' ').filter(Boolean).join(' '));
        // a screen reader still hears the words
        expect(screen.getByTestId('combat-card-face-paid-line').props.accessibilityLabel).toBe(card.face.paidLine);
    });
});

describe('the open card', () => {
    // The grey Strike's headline keyword is unset in this fixture; give it one so the ledger has a word to sit by.
    const withKeyword = (keyword: string | null): CombatCardVM => {
        const card = handCard('grey-strike');
        return { ...card, face: { ...card.face, keyword } };
    };

    it.each(['words', 'glyphs'] as const)('shows the glyph beside the word in %s mode', (mode) => {
        renderFace(withKeyword('Deal'), mode, true);
        expect(screen.getByLabelText('DEAL')).toBeTruthy();
        expect(screen.getByTestId('combat-card-face-keyword').props.children).toContain('DEAL');
    });

    it('finds the word in the value when the headline is the whole line (Deal 9)', () => {
        const card = withKeyword(null);
        expect(card.face.heroText).toMatch(/^Deal /);
        renderFace(card, 'words', true);
        expect(screen.getByLabelText('DEAL')).toBeTruthy();
    });

    it('draws no glyph for a headline word that has none', () => {
        renderFace(withKeyword('Bleed'), 'glyphs', true);
        expect(screen.queryByLabelText('BLEED')).toBeNull();
        expect(screen.getByTestId('combat-card-face-keyword')).toBeTruthy();
    });
});

describe('a glyph is never a child of a Text (a native Text cannot host a view)', () => {
    const glyphsInText = () => screen.UNSAFE_getAllByType(Text).flatMap((t) => t.findAllByType(Svg));

    it.each(GREY)('the small face in glyph mode (%s)', (id) => {
        renderFace(handCard(id), 'glyphs');
        expect(screen.UNSAFE_getAllByType(Svg).length).toBeGreaterThan(0);
        expect(glyphsInText()).toHaveLength(0);
    });

    it.each([208, 259, 264, 300])('the open card at %ipx, in both modes', (w) => {
        for (const mode of ['words', 'glyphs'] as const) {
            const card = handCard('grey-strike');
            const { unmount } = renderFace({ ...card, face: { ...card.face, keyword: 'Deal' } }, mode, true, w);
            expect(screen.getByLabelText('DEAL')).toBeTruthy();
            expect(glyphsInText()).toHaveLength(0);
            unmount();
        }
    });
});

/**
 * CombatCardFace in glyph mode (Settings > Card text). Only the keywords change
 * form: each printed keyword becomes its glyph on the small face, everything
 * else on the line stays as it prints, and a screen reader still hears the
 * words. The open card shows the glyph beside the word in both modes.
 */

import React from 'react';
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

function renderFace(card: CombatCardVM, mode: CardTextMode, large = false) {
    const settings = createSettingsStore({ storage: NO_STORAGE, initial: { cardText: mode } });
    const [w, h] = large ? [300, 440] : [HAND_CARD_W, HAND_CARD_H];
    return render(withAllProviders(<CombatCardFace card={card} width={w} height={h} large={large} />, { settings }).tree);
}

/** The text runs of a small face's PAID line, and how many glyph views sit between them. */
function lineParts(): { text: string; glyphs: number } {
    const line = screen.getByTestId('combat-card-face-paid-line');
    let text = '';
    for (const k of React.Children.toArray(line.props.children as React.ReactNode) as React.ReactElement<{ children?: unknown }>[]) {
        if (typeof k.props.children === 'string') text += k.props.children;
    }
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
        expect(text).toBe(card.face.paidLine.replace(/\b[A-Z]{2,}\b/g, (w) => (glyphKeywordFor(w) ? '' : w)));
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

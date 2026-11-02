/**
 * CombatCardFace in glyph mode (Settings > Card text). Only the keywords change
 * form: each printed keyword becomes its glyph, everything else on the line
 * stays as it prints, and a screen reader still hears the words. The open card
 * prints the same line as the hand, in the chosen mode: all words or all
 * glyphs, never both (T, 2026-11-01).
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Svg from 'react-native-svg';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { cardLibrary, rollEncounterDice } from '@mechanics';
import { CombatCardFace, HAND_CARD_H, HAND_CARD_W } from '@/components/combat/encounter/CombatBoard';
import { KeywordGlyph } from '@/components/keyword-glyphs';
import { glyphKeywordFor } from '@/state/presenters/keyword-glyph.engine';
import { buildCombatViewModel, type CombatCardVM } from '@/state/presenters/combat-encounter.engine';
import { largePaidLineSize, paidLineLead, paidLineRoom, paidLineRows, PAID_LINE_LEADING } from '@/state/presenters/paid-line.engine';
import { type CardTextMode, createSettingsStore } from '@/state/settings';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';
import { AXM, FONTS, HUE } from '@/theme/axm';

const GREY = ['grey-strike', 'grey-ward', 'grey-word'];
const NO_STORAGE = { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined };
const OPEN_WIDTHS = [208, 259, 264, 300];

function handCard(cardId: string): CombatCardVM {
    const { combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: GREY, baseStats: { heart: 8, body: 8, mind: 8 } }, seed: 16 });
    const card = buildCombatViewModel(rollEncounterDice(combat).state).hand.find((c) => c.cardId === cardId);
    if (!card) throw new Error(`${cardId} not in the opening hand`);
    return card;
}

/** A named library card as the hand would show it, at these stats. */
function namedCard(name: string, stat = 8): CombatCardVM {
    const id = cardLibrary.find((c) => c.name === name)?.id;
    if (!id) throw new Error(`no card named ${name}`);
    const { combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: GREY, baseStats: { heart: stat, body: stat, mind: stat } }, seed: 16 });
    return buildCombatViewModel({ ...rollEncounterDice(combat).state, hand: [{ uid: 'n0', cardId: id }] }).hand[0];
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
const flat = (n: { props: { style?: unknown } }) => (StyleSheet.flatten(n.props.style as never) ?? {}) as Record<string, unknown>;
const jsonNode = (testID: string): Node => {
    const json = screen.toJSON() as unknown;
    return nodes(Array.isArray(json) ? { type: 'root', props: {}, children: json } : json).find((n) => n.props?.testID === testID)!;
};

/** The words a small face's PAID line prints (one token each, glyph-only tokens empty), and how many glyph views sit in it. */
function lineParts(): { text: string; glyphs: number } {
    const root = jsonNode('combat-card-face-paid-line');
    const text = (root.children as unknown[]).map(textOf).filter(Boolean).join(' ');
    return { text, glyphs: screen.queryAllByTestId('combat-card-face-glyph').length };
}

/** The ink and typeface of each piece of text the PAID line prints. */
function lineInks(): { color: unknown; fontFamily: unknown }[] {
    return screen.getByTestId('combat-card-face-paid-line')
        .findAll((n: { type: unknown; props: { style?: unknown } }) => typeof n.type === 'string' && n.props.style != null && flat(n).color != null)
        .map((n: { props: { style?: unknown } }) => ({ color: flat(n).color, fontFamily: flat(n).fontFamily }));
}

/** The PAID line as text, with nothing between its runs. */
const printedLine = () => textOf(jsonNode('combat-card-face-paid-line'));

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

    describe('an armed card in glyph mode takes no grey', () => {
        const renderArmed = (accent: string) => {
            const settings = createSettingsStore({ storage: NO_STORAGE, initial: { cardText: 'glyphs' } });
            return render(withAllProviders(<CombatCardFace card={namedCard('Shatter the Frost')} width={HAND_CARD_W} height={HAND_CARD_H} accent={accent} />, { settings }).tree);
        };

        it.each([AXM.bone, HUE.stoneGrey])('the words are parchment and the glyphs their own colour under %s', (accent) => {
            renderArmed(accent);
            expect(new Set(lineInks().map((i) => i.color))).toEqual(new Set([AXM.parchment]));
            for (const g of screen.UNSAFE_getAllByType(KeywordGlyph)) expect(g.props.color).toBeUndefined();
        });

        it('a legible accent colours both', () => {
            renderArmed(HUE.white);
            expect(new Set(lineInks().map((i) => i.color))).toEqual(new Set([HUE.white]));
            for (const g of screen.UNSAFE_getAllByType(KeywordGlyph)) expect(g.props.color).toBe(HUE.white);
        });
    });
});

describe('the open card prints the same line as the hand', () => {
    it.each(OPEN_WIDTHS)('Draw the Fever at %ipx prints the whole line, every step of it', (w) => {
        const card = namedCard('Draw the Fever');
        expect(card.face.paidLine).toMatch(/^DEAL \d+, LEECH 2$/);
        renderFace(card, 'words', true, w);
        expect(printedLine()).toBe(card.face.paidLine);
        expect(screen.getByTestId('combat-card-face-paid-line').props.accessibilityLabel).toBe(card.face.paidLine);
    });

    it('a long line wraps whole on the narrowest open card, in both modes', () => {
        const card = namedCard('Shatter the Frost');
        for (const mode of ['words', 'glyphs'] as const) {
            const { unmount } = renderFace(card, mode, true, 208);
            const line = screen.getByTestId('combat-card-face-paid-line');
            expect(line.props.numberOfLines).toBeUndefined();
            expect(flat(line).maxHeight).toBeUndefined();
            unmount();
        }
    });

    it('prints a plain DEAL in capitals and parchment, even when a stat lowered the number', () => {
        const card = namedCard('Draw the Fever', 2);
        expect(card.face.statScaled).toBe('down');
        expect(card.face.keyword).toBeNull();
        renderFace(card, 'words', true, 208);
        const inks = lineInks();
        expect(inks.length).toBeGreaterThan(0);
        expect(new Set(inks.map((i) => i.color))).toEqual(new Set([AXM.parchment]));
        expect(inks.map((i) => i.fontFamily)).not.toContain(FONTS.mono);
        expect(inks[0].fontFamily).toBe(FONTS.sans);
    });

    it('every library line wraps inside the narrowest open card, in both modes, with art to spare', () => {
        const w = 208;
        const size = largePaidLineSize(w);
        const room = paidLineRoom(w, paidLineLead(20)) - 2;
        // the 305-tall preview less its 52 name band and 100 of art, less the ledger's padding
        const maxRows = Math.floor((305 - 52 - 100 - 12) / Math.round(size * PAID_LINE_LEADING));
        const { combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: GREY, baseStats: { heart: 8, body: 8, mind: 8 } }, seed: 16 });
        const base = rollEncounterDice(combat).state;
        const over: string[] = [];
        let seen = 0;
        for (const c of cardLibrary.filter((x) => x.program)) {
            const line = buildCombatViewModel({ ...base, hand: [{ uid: 'v0', cardId: c.id }] }).hand[0]?.face.paidLine;
            if (!line) continue;
            seen += 1;
            for (const mode of ['words', 'glyphs'] as const) {
                if (paidLineRows(line, size, room, mode) > maxRows) over.push(`${c.name} (${mode})`);
            }
        }
        expect(seen).toBeGreaterThan(50);
        expect(over).toEqual([]);
    });

    describe.each(['Draw the Fever', 'Siphon', 'Shatter the Frost'])('%s', (name) => {
        it('words mode prints words only: no keyword glyph, no stat-family icon', () => {
            const card = namedCard(name);
            renderFace(card, 'words', true);
            expect(screen.UNSAFE_queryAllByType(KeywordGlyph)).toHaveLength(0);
            expect(printedLine()).toBe(card.face.paidLine);
        });

        it('glyph mode prints glyphs only: no keyword word, no stat-family icon', () => {
            const card = namedCard(name);
            renderFace(card, 'glyphs', true);
            const keywords = (card.face.paidLine.match(/\b[A-Z]{2,}\b/g) ?? []).filter((w) => glyphKeywordFor(w));
            expect(keywords.length).toBeGreaterThan(0);
            expect(screen.UNSAFE_getAllByType(KeywordGlyph)).toHaveLength(keywords.length);
            const rest = card.face.paidLine.replace(/\b[A-Z]{2,}\b/g, (w) => (glyphKeywordFor(w) ? '' : w)).replace(/ /g, '');
            expect(printedLine()).toBe(rest);
            // a screen reader still hears the words
            expect(screen.getByTestId('combat-card-face-paid-line').props.accessibilityLabel).toBe(card.face.paidLine);
        });
    });
});

describe('a glyph is never a child of a Text (a native Text cannot host a view)', () => {
    const glyphsInText = () => screen.UNSAFE_getAllByType(Text).flatMap((t) => t.findAllByType(Svg));

    it.each(GREY)('the small face in glyph mode (%s)', (id) => {
        renderFace(handCard(id), 'glyphs');
        expect(screen.UNSAFE_getAllByType(Svg).length).toBeGreaterThan(0);
        expect(glyphsInText()).toHaveLength(0);
    });

    it.each(OPEN_WIDTHS)('the open card at %ipx, in glyph mode', (w) => {
        renderFace(namedCard('Draw the Fever'), 'glyphs', true, w);
        expect(screen.getAllByLabelText('DEAL').length).toBeGreaterThan(0);
        expect(screen.getAllByLabelText('LEECH').length).toBeGreaterThan(0);
        expect(glyphsInText()).toHaveLength(0);
    });
});

/**
 * CombatCardFace — the PAID line and the free corner pill (one card face).
 *
 * The ledger is ONE row: the stance die cube, then `[family glyph] KEYWORD
 * value` as a single line. The FREE line left the ledger for the pill on the
 * card's top-left corner, so nothing shares the row with the PAID text and the
 * ledger never stacks: every card's PAID line sits at the same height. A line
 * too long for 12pt shrinks to fit (react-native-web ignores
 * `adjustsFontSizeToFit`, so the size is computed) rather than wrapping.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, within } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { rollEncounterDice } from '@mechanics';
import {
    CombatCardFace, HAND_CARD_H, HAND_CARD_W, PAID_LINE_FLOOR, PAID_LINE_SIZE, paidLedgerFit,
} from '@/components/combat/encounter/CombatBoard';
import { buildCombatViewModel, type CombatCardVM } from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';
import { HUE } from '@/theme/axm';

const GREY = ['grey-strike', 'grey-ward', 'grey-word'];

function hand(): CombatCardVM[] {
    // Heart 8 scales the word to a "+24%" FREE and a "+60%" PAID.
    const { combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: GREY, baseStats: { heart: 8, body: 8, mind: 8 } }, seed: 16 });
    let s = combat;
    s = rollEncounterDice(s).state;
    return buildCombatViewModel(s).hand;
}

function handCard(cardId: string): CombatCardVM {
    const card = hand().find((c) => c.cardId === cardId);
    if (!card) throw new Error(`${cardId} not in the opening hand`);
    return card;
}

const flat = (node: { props: { style?: unknown } }) =>
    (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;

const renderFace = (card: CombatCardVM, width = HAND_CARD_W, height = HAND_CARD_H, large = false) =>
    render(withAllProviders(<CombatCardFace card={card} width={width} height={height} large={large} />).tree);

describe('the PAID line is die : PAID on one row', () => {
    it('has no FREE cell and no rule in the ledger', () => {
        for (const id of GREY) {
            const { unmount } = renderFace(handCard(id));
            const ledger = screen.getByTestId('combat-card-face-ledger');
            // The ledger holds the cube and the one line, nothing else.
            expect(ledger.props.children.filter(Boolean)).toHaveLength(2);
            expect(screen.queryByTestId('combat-card-face-ledger-stacked')).toBeNull();
            unmount();
        }
    });

    it('prints keyword and value inside ONE single-line text, at one size', () => {
        let sawKeyword = false;
        for (const id of GREY) {
            const card = handCard(id);
            const { unmount } = renderFace(card);
            const line = screen.getByTestId('combat-card-face-paid-line');
            expect(line.props.numberOfLines).toBe(1);
            // Both halves sit inside the one line, never in sibling rows.
            const val = within(line).getByTestId('combat-card-face-value');
            const size = flat(val).fontSize as number;
            expect(size).toBeLessThanOrEqual(PAID_LINE_SIZE);
            expect(size).toBeGreaterThanOrEqual(PAID_LINE_FLOOR);
            const kw = within(line).queryByTestId('combat-card-face-keyword');
            if (kw) {
                sawKeyword = true;
                expect(flat(kw).fontSize).toBe(size);
            }
            unmount();
        }
        // A Plain Word carries a keyword, so the one-size check is not vacuous.
        expect(sawKeyword).toBe(true);
    });

    it('a PAID headline with no keyword prints its value alone, at the full 12pt', () => {
        const strike = handCard('grey-strike');
        expect(strike.face.keyword).toBeFalsy();
        renderFace(strike);
        expect(screen.queryByTestId('combat-card-face-keyword')).toBeNull();
        const val = screen.getByTestId('combat-card-face-value');
        expect(String(val.props.children)).toMatch(/\d/);
        expect(flat(val).fontSize).toBe(PAID_LINE_SIZE);
    });

    it('never stacks on the narrow faces either (reward offer 100, staged 92)', () => {
        for (const width of [92, 100]) {
            for (const id of GREY) {
                const { unmount } = renderFace(handCard(id), width, Math.round(width * 1.47));
                expect(screen.getByTestId('combat-card-face-ledger')).toBeTruthy();
                expect(screen.queryByTestId('combat-card-face-ledger-stacked')).toBeNull();
                unmount();
            }
        }
    });
});

describe('paidLedgerFit', () => {
    it('keeps a short line at full size', () => {
        expect(paidLedgerFit({ width: 120, keyword: '⚡ DEAL', value: '12' })).toEqual({ size: PAID_LINE_SIZE });
    });

    it('a value with no keyword fits alone', () => {
        expect(paidLedgerFit({ width: 120, keyword: '', value: 'Deal 38' })).toEqual({ size: PAID_LINE_SIZE });
    });

    it('shrinks a long line to fit, floored', () => {
        const fit = paidLedgerFit({ width: 120, keyword: '♥ VULNERABLE', value: '+60%' });
        expect(fit.size).toBeLessThan(PAID_LINE_SIZE);
        expect(fit.size).toBeGreaterThanOrEqual(PAID_LINE_FLOOR);
        const freak = paidLedgerFit({ width: 92, keyword: '♥ VULNERABLE', value: '+160% · 2 turns' });
        expect(freak.size).toBe(PAID_LINE_FLOOR);
    });

    it('does not depend on the FREE line — the same PAID line renders the same with or without one', () => {
        // The old fit reserved room for a FREE cell, so A Plain Word's long
        // PAID line sized differently beside its "+24%" FREE value. The pill
        // moved off the ledger: strip the FREE line and the PAID line, its
        // size and the ledger must not move.
        const word = handCard('grey-word');
        expect(word.face.freeGlyph).toBeTruthy();
        const bare: CombatCardVM = {
            ...word,
            face: { ...word.face, freeGlyph: '', freeGlyphKey: null, freeValue: null, freeHeroText: '' },
        };
        const read = (card: CombatCardVM) => {
            const { unmount } = renderFace(card);
            const out = {
                pill: screen.queryByTestId('combat-card-face-free-corner') !== null,
                ledger: flat(screen.getByTestId('combat-card-face-ledger')),
                size: flat(screen.getByTestId('combat-card-face-value')).fontSize,
                keywordSize: flat(screen.getByTestId('combat-card-face-keyword')).fontSize,
            };
            unmount();
            return out;
        };
        const withFree = read(word);
        const without = read(bare);
        expect(withFree.pill).toBe(true);
        expect(without.pill).toBe(false);
        // Non-vacuity: this PAID line is long enough to shrink below 12pt.
        expect(withFree.size as number).toBeLessThan(PAID_LINE_SIZE);
        expect(without.size).toBe(withFree.size);
        expect(without.keywordSize).toBe(withFree.keywordSize);
        expect(without.ledger).toEqual(withFree.ledger);
    });
});

describe('the FREE corner pill', () => {
    it('is present iff the card has a FREE line, in the card colour, with its value', () => {
        const cards = hand();
        expect(cards.some((c) => c.face.freeGlyph)).toBe(true);
        for (const card of cards) {
            const { unmount } = renderFace(card);
            const pill = screen.queryByTestId('combat-card-face-free-corner');
            if (!card.face.freeGlyph) {
                expect(pill).toBeNull();
                unmount();
                continue;
            }
            expect(pill).toBeTruthy();
            const want = card.face.inert ? undefined : card.face.stanceColor;
            if (want) expect(flat(pill!).borderColor).toBe(want);
            const glyph = screen.getByTestId('combat-card-face-free-glyph');
            // An SVG glyph is filled through its path; a text rune is coloured.
            const ink = glyph.props.color ?? flat(glyph).color
                ?? (glyph.props.children as { props?: { fill?: string } })?.props?.fill;
            if (ink !== undefined && want) expect(ink).toBe(want);
            const value = screen.queryByTestId('combat-card-face-free-value');
            if (value) expect(String(value.props.children).length).toBeGreaterThan(0);
            unmount();
        }
    });

    it('takes the armed accent over the stance colour', () => {
        const card = hand().find((c) => c.face.freeGlyph)!;
        const accent = HUE.white;
        const { unmount } = render(withAllProviders(
            <CombatCardFace card={card} width={HAND_CARD_W} height={HAND_CARD_H} accent={accent} />,
        ).tree);
        expect(flat(screen.getByTestId('combat-card-face-free-corner')).borderColor).toBe(accent);
        unmount();
    });

    it('pads the name band only when the pill is present', () => {
        for (const card of hand()) {
            const { unmount } = renderFace(card);
            const band = flat(screen.getByTestId('combat-card-face-band'));
            if (card.face.freeGlyph) expect(band.paddingTop).toBeGreaterThan(0);
            else expect(band.paddingTop ?? 0).toBe(0);
            unmount();
        }
    });

    it('is drawn outside the clipping frame, on the large face too', () => {
        const card = hand().find((c) => c.face.freeGlyph)!;
        const { unmount } = renderFace(card, 208, 305, true);
        const pill = screen.getByTestId('combat-card-face-free-corner');
        expect(flat(pill).position).toBe('absolute');
        expect(flat(pill).top as number).toBeLessThan(0);
        // The band (inside the frame) is not an ancestor of the pill.
        const band = screen.getByTestId('combat-card-face-band');
        let p = pill.parent;
        while (p) { expect(p).not.toBe(band); p = p.parent; }
        unmount();
    });
});

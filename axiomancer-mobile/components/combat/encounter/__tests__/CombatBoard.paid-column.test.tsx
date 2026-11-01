/**
 * CombatCardFace: the PAID line on the small face and the free corner pill
 * (one card face).
 *
 * The small face prints the card's whole PAID line (`paidLine`, the card voice)
 * at 10pt over at most three rows, with the stance die cube on the ledger's
 * corner. The FREE line lives in the pill on the card's top-left corner; a
 * Global wears a GLOBAL plate there instead and never prints a duration on the
 * small face (the large face states it).
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { cardLibrary, rollEncounterDice } from '@mechanics';
import {
    CombatCardFace, HAND_CARD_H, HAND_CARD_W,
} from '@/components/combat/encounter/CombatBoard';
import { PAID_LINE_FLOOR, PAID_LINE_ROWS, PAID_LINE_SIZE } from '@/state/presenters/paid-line.engine';
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

/** The text a face's PAID line prints: its runs joined. */
const printed = (line: { props: { children?: unknown } }): string => {
    const kids = React.Children.toArray(line.props.children as React.ReactNode) as React.ReactElement<{ children?: string }>[];
    return kids.map((k) => k.props.children ?? '').join('');
};

describe('the small face prints the whole PAID line', () => {
    it('holds the die cube and the line, at 10pt in at most three rows', () => {
        for (const id of GREY) {
            const card = handCard(id);
            const { unmount } = renderFace(card);
            expect(screen.getByTestId('combat-card-face-cube')).toBeTruthy();
            const line = screen.getByTestId('combat-card-face-paid-line');
            expect(line.props.numberOfLines).toBe(PAID_LINE_ROWS);
            expect(printed(line)).toBe(card.face.paidLine);
            for (const run of React.Children.toArray(line.props.children as React.ReactNode) as React.ReactElement<{ style: unknown }>[]) {
                expect(flat({ props: { style: run.props.style } }).fontSize).toBe(PAID_LINE_SIZE);
            }
            unmount();
        }
    });

    it('has no keyword/value pair on the small face, and every card prints its own line', () => {
        const ids = cardLibrary.filter((c) => c.program).map((c) => c.id);
        const { combat } = startRealFight(REAL_FIGHT_FIXTURE, {
            player: { knownCards: ids.slice(0, 1), baseStats: { heart: 8, body: 8, mind: 8 } }, seed: 16,
        });
        const base = rollEncounterDice(combat).state;
        let seen = 0;
        for (const id of ids) {
            const vm = buildCombatViewModel({ ...base, hand: [{ uid: 'v0', cardId: id }] }).hand[0];
            if (!vm) continue;
            seen += 1;
            const { unmount } = renderFace(vm);
            expect(screen.queryByTestId('combat-card-face-keyword')).toBeNull();
            expect(screen.queryByTestId('combat-card-face-value')).toBeNull();
            const line = screen.getByTestId('combat-card-face-paid-line');
            expect(printed(line)).toBe(vm.face.paidLine);
            expect(vm.face.paidLine.length).toBeGreaterThan(0);
            const size = flat({ props: { style: (React.Children.toArray(line.props.children as React.ReactNode)[0] as React.ReactElement<{ style: unknown }>).props.style } }).fontSize as number;
            expect(size).toBeGreaterThanOrEqual(PAID_LINE_FLOOR);
            expect(size).toBeLessThanOrEqual(PAID_LINE_SIZE);
            unmount();
        }
        expect(seen).toBeGreaterThan(50);
    });

    it('keeps the ledger one height on every card, and the narrow faces too', () => {
        const heights = new Set<unknown>();
        for (const width of [HAND_CARD_W, 100, 92]) {
            for (const id of GREY) {
                const { unmount } = renderFace(handCard(id), width, Math.round(width * 1.47));
                heights.add(flat(screen.getByTestId('combat-card-face-ledger')).height);
                unmount();
            }
        }
        expect(heights.size).toBe(1);
    });

    it('does not depend on the FREE line: the same PAID line renders the same with or without one', () => {
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
                text: printed(screen.getByTestId('combat-card-face-paid-line')),
            };
            unmount();
            return out;
        };
        const withFree = read(word);
        const without = read(bare);
        expect(withFree.pill).toBe(true);
        expect(without.pill).toBe(false);
        expect(without.text).toBe(withFree.text);
        expect(without.ledger).toEqual(withFree.ledger);
    });

    it('prints the voice at neutral and at raised stats (the grey cards)', () => {
        // Heart, body and mind are 8 in this hand: the scaled copy has no authored summary.
        expect(handCard('grey-strike').face.paidLine).toBe('DEAL 8');
        expect(handCard('grey-ward').face.paidLine).toBe('GUARD 8');
        expect(handCard('grey-word').face.paidLine).toBe('VULNERABLE 40% for 2 turns');
    });
});

describe('a Global wears GLOBAL, not FREE', () => {
    const GLOBAL_IDS = cardLibrary.filter((c) => c.program?.global).map((c) => c.id);
    const globalVM = (id: string): CombatCardVM => {
        const { combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: GREY }, seed: 16 });
        const base = rollEncounterDice(combat).state;
        return buildCombatViewModel({ ...base, hand: [{ uid: 'g0', cardId: id }] }).hand[0];
    };

    it('the small face shows the plate, no FREE pill, and no duration', () => {
        expect(GLOBAL_IDS.length).toBeGreaterThan(10);
        for (const id of GLOBAL_IDS) {
            const vm = globalVM(id);
            const { unmount } = renderFace(vm);
            expect(screen.getByTestId('combat-card-face-global-text').props.children).toBe('GLOBAL');
            expect(screen.queryByTestId('combat-card-face-free-corner')).toBeNull();
            expect(screen.queryByTestId('combat-card-face-duration')).toBeNull();
            expect(printed(screen.getByTestId('combat-card-face-paid-line'))).not.toMatch(/rest of combat|in play|\bturns\b/i);
            unmount();
        }
    });

    it('the plate pads the name band like the pill does', () => {
        const { unmount } = renderFace(globalVM(GLOBAL_IDS[0]));
        expect(flat(screen.getByTestId('combat-card-face-band')).paddingTop).toBeGreaterThan(0);
        unmount();
    });

    it('the large face states the duration, the small face never does', () => {
        const vm = globalVM(GLOBAL_IDS[0]);
        const large = renderFace(vm, 208, 305, true);
        expect(screen.getByTestId('combat-card-face-duration').props.children).toBe('3 turns played FREE, the whole combat PAID');
        expect(screen.getByTestId('combat-card-face-global-plate')).toBeTruthy();
        large.unmount();
    });

    it('a plain card never wears the plate or states a duration', () => {
        const { unmount } = renderFace(handCard('grey-strike'), 208, 305, true);
        expect(screen.queryByTestId('combat-card-face-global-plate')).toBeNull();
        expect(screen.queryByTestId('combat-card-face-duration')).toBeNull();
        unmount();
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

/**
 * The card face's name band (159.2): a narrow face (under NARROW_FACE_W) wears the
 * narrow name, band and spacer styles; the hand card and the large face do not. Every
 * band is a fixed height that holds ONE name line, so the art is the same height on
 * every card of a size.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, renderHook, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { rollEncounterDice } from '@mechanics';
import {
    ART_FADE_H,
    CARD_FACE_BLACK,
    CombatCardFace,
    HAND_CARD_H,
    HAND_CARD_W,
    NARROW_FACE_W,
    PLATE_NAME,
    PLATE_NAME_FLOOR,
    PLATE_NAME_PAD_V,
    nameBandHeight,
    nameColumnWidth,
    plateNameSize,
    useCombatBoardStyles,
} from '@/components/combat/encounter/CombatBoard';
import { cardNameWidth } from '@/components/combat/encounter/card-name-fit';
import { HUE } from '@/theme/axm';
import { buildCombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

function cards() {
    const { combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: ['grey-strike', 'grey-ward', 'grey-word'], baseStats: { heart: 8, body: 8, mind: 8 } }, seed: 16 });
    return buildCombatViewModel(rollEncounterDice(combat).state).hand;
}

const flat = (testID: string) =>
    (StyleSheet.flatten(screen.getByTestId(testID).props.style as never) ?? {}) as Record<string, unknown>;

function sheet() {
    const { result } = renderHook(() => useCombatBoardStyles());
    return result.current as unknown as Record<string, Record<string, unknown>>;
}

function face(w: number, h: number, large = false, index = 0) {
    render(withAllProviders(<CombatCardFace card={cards()[index]!} width={w} height={h} large={large} />).tree);
}

describe('CombatCardFace name band: the narrow path', () => {
    it('below NARROW_FACE_W the narrow name, band and spacer styles apply', () => {
        const s = sheet();
        face(80, 118);
        expect(flat('combat-card-face-name').fontSize).toBe(s.plateNameNarrow!.fontSize);
        expect(flat('combat-card-face-band').paddingHorizontal).toBe(s.plateBandNarrow!.paddingHorizontal);
        expect(flat('combat-card-face-band').gap).toBe(0);
        expect(flat('combat-card-face-rarity-a11y').width).toBe(0);
    });

    it('at the hand width the narrow styles do not apply', () => {
        const s = sheet();
        expect(HAND_CARD_W).toBeGreaterThanOrEqual(NARROW_FACE_W);
        face(HAND_CARD_W, HAND_CARD_H);
        expect(flat('combat-card-face-name').fontSize).toBe(s.plateName!.fontSize);
        expect(flat('combat-card-face-name').fontSize).not.toBe(s.plateNameNarrow!.fontSize);
        expect(flat('combat-card-face-band').paddingHorizontal).toBe(s.plateBand!.paddingHorizontal);
        expect(flat('combat-card-face-rarity-a11y').width).toBe(s.plateRaritySpacer!.width);
    });

    it('the large face does not wear them either, even if it were narrow', () => {
        const s = sheet();
        face(100, 150, true);
        // Its size is fit to the 100 pt column, below the large nominal; its line height is the large one.
        expect(flat('combat-card-face-name').lineHeight).toBe(s.plateNameLarge!.lineHeight);
        expect(flat('combat-card-face-name').fontSize).toBeLessThanOrEqual(s.plateNameLarge!.fontSize as number);
        expect(flat('combat-card-face-name').fontSize).not.toBe(s.plateNameNarrow!.fontSize);
        expect(flat('combat-card-face-band').paddingHorizontal).toBe(s.plateBand!.paddingHorizontal);
        expect(flat('combat-card-face-rarity-a11y').width).toBe(s.plateRaritySpacer!.width);
    });
});

describe('CombatCardFace name band: a fixed height', () => {
    const sizes: [string, number, number, boolean][] = [
        ['narrow', 80, 118, false],
        ['hand', HAND_CARD_W, HAND_CARD_H, false],
        ['large', 208, 305, true],
    ];
    it.each(sizes)('the %s band is the same height on every card of one pill state', (_n, w, h, large) => {
        const narrow = !large && w < NARROW_FACE_W;
        const hand = cards();
        expect(hand.length).toBeGreaterThan(1);
        const seen = new Set<boolean>();
        for (let i = 0; i < hand.length; i++) {
            const f = hand[i]!.face;
            const hasPill = !!f.freeGlyph || !!f.isGlobal;
            seen.add(hasPill);
            const { unmount } = render(withAllProviders(<CombatCardFace card={hand[i]!} width={w} height={h} large={large} />).tree);
            const band = flat('combat-card-face-band');
            expect(band.height).toBe(nameBandHeight(large, narrow, hasPill));
            expect(band.minHeight).toBeUndefined();
            unmount();
        }
        expect(seen.size).toBeGreaterThan(0);
    });

    it('holds one name line and the name padding, from the plateName constants', () => {
        const s = sheet();
        expect(s.plateName!.lineHeight).toBe(PLATE_NAME.normal.lineHeight);
        expect(s.plateName!.paddingVertical).toBe(PLATE_NAME_PAD_V);
        expect(s.plateNameLarge!.lineHeight).toBe(PLATE_NAME.large.lineHeight);
        expect(s.plateNameNarrow!.lineHeight).toBe(PLATE_NAME.narrow.lineHeight);
        for (const [large, narrow, key] of [[false, false, 'normal'], [false, true, 'narrow'], [true, false, 'large']] as const) {
            expect(nameBandHeight(large, narrow)).toBe(PLATE_NAME[key].lineHeight + 2 * PLATE_NAME_PAD_V);
        }
    });

    it('reserves the pill room only when the face shows a pill', () => {
        for (const [large, narrow] of [[false, false], [false, true], [true, false]] as const) {
            expect(nameBandHeight(large, narrow, true)).toBeGreaterThan(nameBandHeight(large, narrow, false));
        }
    });

    it('a Spoils tile (80 x 118) without a pill leaves its art at least 45pt, and a pilled one less', () => {
        const base = cards()[0]!;
        const bare = { ...base, face: { ...base.face, freeGlyph: '', isGlobal: false } };
        const pilled = { ...base, face: { ...base.face, freeGlyph: '◆', isGlobal: false } };
        const artOf = (card: typeof base) => {
            const { unmount } = render(withAllProviders(<CombatCardFace card={card} width={80} height={118} />).tree);
            const art = 118 - 2 * 1.5 - (flat('combat-card-face-band').height as number) - (flat('combat-card-face-ledger').height as number);
            unmount();
            return art;
        };
        expect(artOf(bare)).toBeGreaterThanOrEqual(45);
        expect(artOf(pilled)).toBeLessThan(artOf(bare));
    });
});

describe('CombatCardFace name band: one line, shrunk to fit', () => {
    const LONGEST = ['Stir the Thundersnow', 'Call Back a Kindness', 'Call Lightning Twice'];
    const named = (name: string) => ({ ...cards()[0]!, name });
    const faces: [string, number, number, boolean][] = [
        ['narrow', 80, 118, false],
        ['hand', HAND_CARD_W, HAND_CARD_H, false],
        ['large', 208, 305, true],
    ];

    it.each(faces)('the %s face draws the longest names on one line that fits the column', (_n, w, h, large) => {
        const narrow = !large && w < NARROW_FACE_W;
        const key = large ? 'large' : narrow ? 'narrow' : 'normal';
        for (const name of LONGEST) {
            const card = named(name);
            const { unmount } = render(withAllProviders(<CombatCardFace card={card} width={w} height={h} large={large} />).tree);
            const node = screen.getByTestId('combat-card-face-name');
            expect(node.props.numberOfLines).toBe(1);
            expect(node.props.adjustsFontSizeToFit).toBeUndefined();
            const size = flat('combat-card-face-name').fontSize as number;
            expect(size).toBeLessThanOrEqual(PLATE_NAME[key].fontSize);
            expect(size).toBeGreaterThanOrEqual(PLATE_NAME_FLOOR[key]);
            const rarity = large ? (screen.getByTestId('combat-card-face-rarity').props.children as string) : '';
            expect(cardNameWidth(name, size)).toBeLessThanOrEqual(nameColumnWidth(w, large, narrow, rarity));
            unmount();
        }
    });

    it('a short name keeps the nominal size on every face', () => {
        for (const [, w, h, large] of faces) {
            const narrow = !large && w < NARROW_FACE_W;
            const key = large ? 'large' : narrow ? 'narrow' : 'normal';
            const { unmount } = render(withAllProviders(<CombatCardFace card={named('Blow')} width={w} height={h} large={large} />).tree);
            expect(flat('combat-card-face-name').fontSize).toBe(PLATE_NAME[key].fontSize);
            unmount();
        }
    });

    it('the longest name steps down on the 95 pt hand column and the 71 pt narrow column', () => {
        expect(nameColumnWidth(HAND_CARD_W, false, false)).toBe(95);
        expect(nameColumnWidth(80, false, true)).toBe(71);
        expect(plateNameSize('Stir the Thundersnow', HAND_CARD_W, false, false)).toBeLessThan(PLATE_NAME.normal.fontSize);
        expect(plateNameSize('Stir the Thundersnow', HAND_CARD_W, false, false)).toBeGreaterThanOrEqual(PLATE_NAME_FLOOR.normal);
        expect(plateNameSize('Stir the Thundersnow', 80, false, true)).toBeLessThan(PLATE_NAME.narrow.fontSize);
    });
});

describe('CombatCardFace: one black, and the art fades into it', () => {
    it.each([
        ['narrow', 80, 118, false],
        ['hand', HAND_CARD_W, HAND_CARD_H, false],
        ['large', 208, 305, true],
    ] as [string, number, number, boolean][])('the %s face shares one black across frame, band and ledger', (_n, w, h, large) => {
        const s = sheet();
        face(w, h, large);
        expect(flat('combat-card-face-band').backgroundColor).toBe(CARD_FACE_BLACK);
        expect(flat('combat-card-face-ledger').backgroundColor).toBe(CARD_FACE_BLACK);
        expect(CARD_FACE_BLACK).toBe(HUE.black);
        expect(s.faceCard!.backgroundColor).toBe(CARD_FACE_BLACK);
        expect(s.faceOuter!.backgroundColor).toBe(CARD_FACE_BLACK);
        for (const edge of ['top', 'bottom']) {
            const fade = screen.getByTestId(`combat-card-face-art-fade-${edge}`);
            expect(fade.props.pointerEvents).toBe('none');
            expect((StyleSheet.flatten(fade.props.style) as { height: number }).height).toBe(ART_FADE_H);
        }
    });
});

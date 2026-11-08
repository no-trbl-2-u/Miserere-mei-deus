/**
 * The card face's name band (159.2): a narrow face (under NARROW_FACE_W) wears the
 * narrow name, band and spacer styles; the hand card and the large face do not. Every
 * band is a fixed height that holds two name lines, so the art is the same height on
 * every card of a size.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, renderHook, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { rollEncounterDice } from '@mechanics';
import {
    CombatCardFace,
    HAND_CARD_H,
    HAND_CARD_W,
    NARROW_FACE_W,
    nameBandHeight,
    useCombatBoardStyles,
} from '@/components/combat/encounter/CombatBoard';
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
        expect(flat('combat-card-face-name').fontSize).toBe(s.plateNameLarge!.fontSize);
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
    it.each(sizes)('the %s band is the same height on every card', (_n, w, h, large) => {
        const expected = nameBandHeight(large, !large && w < NARROW_FACE_W);
        const hand = cards();
        expect(hand.length).toBeGreaterThan(1);
        for (let i = 0; i < hand.length; i++) {
            const { unmount } = render(withAllProviders(<CombatCardFace card={hand[i]!} width={w} height={h} large={large} />).tree);
            const band = flat('combat-card-face-band');
            expect(band.height).toBe(expected);
            expect(band.minHeight).toBeUndefined();
            unmount();
        }
    });

    it('holds two name lines plus the pill room', () => {
        expect(nameBandHeight(false, false)).toBe(12 + 2 * 15 + 4);
        expect(nameBandHeight(false, true)).toBe(12 + 2 * 12 + 4);
        expect(nameBandHeight(true, false)).toBe(16 + 2 * 24 + 4);
    });
});

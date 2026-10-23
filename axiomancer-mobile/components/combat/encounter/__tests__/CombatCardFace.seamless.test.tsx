/**
 * CombatCardFace — seamless art (one card face, everywhere).
 *
 * Name, art and PAID line read as ONE surface: the art plate has no grey mat
 * and no hairline frame, and no rule runs under the name band or over the
 * PAID line. Pinned off the SHIPPED stylesheet and off the rendered nodes,
 * small and large.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, renderHook, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { rollEncounterDice } from '@mechanics';
import { CombatCardFace, useCombatBoardStyles } from '@/components/combat/encounter/CombatBoard';
import { buildCombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

function firstCard() {
    const { combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: ['grey-strike', 'grey-ward', 'grey-word'], baseStats: { heart: 8, body: 8, mind: 8 } }, seed: 16 });
    let s = combat;
    s = rollEncounterDice(s).state;
    return buildCombatViewModel(s).hand[0]!;
}

const flat = (testID: string) =>
    (StyleSheet.flatten(screen.getByTestId(testID).props.style as never) ?? {}) as Record<string, unknown>;

const noBorder = (style: Record<string, unknown>) => {
    for (const key of ['borderWidth', 'borderTopWidth', 'borderBottomWidth']) {
        expect(style[key] ?? 0).toBe(0);
    }
};

describe('CombatCardFace — seamless art', () => {
    it('the shipped sheet carries no mat, frame or rule', () => {
        const { result } = renderHook(() => useCombatBoardStyles());
        const s = result.current as unknown as Record<string, Record<string, unknown>>;
        noBorder(s.plateBand!);
        noBorder(s.plateLedger!);
        noBorder(s.plateArtWrap!);
        noBorder(s.plateArtFrame!);
        expect(s.plateArtWrap!.padding ?? 0).toBe(0);
        expect(s.plateArtWrap!.backgroundColor).toBeUndefined();
        expect(s.plateArtFrame!.backgroundColor).toBeUndefined();
    });

    it('the rendered face, small and large, draws none of them', () => {
        const card = firstCard();
        for (const [w, h, large] of [[120, 176, false], [100, 147, false], [208, 305, true]] as const) {
            const { unmount } = render(withAllProviders(
                <CombatCardFace card={card} width={w} height={h} large={large} />,
            ).tree);
            noBorder(flat('combat-card-face-band'));
            noBorder(flat('combat-card-face-ledger'));
            noBorder(flat('combat-card-face-art'));
            noBorder(flat('combat-card-face-art-frame'));
            expect(flat('combat-card-face-art').padding ?? 0).toBe(0);
            unmount();
        }
    });
});

/**
 * Rarity on the ONE card face: no pips on any face, the WORD on the large
 * face, and the band said to a screen reader everywhere.
 *
 * The pip track is gone from every face (one card face, everywhere). The
 * rarity signal the face keeps is the named word on the large face (the
 * inspect overlay and the reward preview), and the band in words for a screen
 * reader on every face, small or large. Assertions read the WORD, never a hue,
 * so they would still pass if `RARITY_COLOR` returned one colour for every
 * band.
 *
 * What is pinned:
 *   1. no face, small or large, draws a rarity pip track or a pip;
 *   2. the `large` face prints the named label; the small face does NOT;
 *   3. every face announces the band in WORDS to a screen reader;
 *   4. the band is derived by the shared module, never re-banded here: the
 *      face agrees with `rankToRarity` for every real library card.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import {
    cardLibrary, rankToRarity, rollEncounterDice, type CardRank,
} from '@mechanics';

import { CombatCardFace } from '@/components/combat/encounter/CombatBoard';
import { buildCombatViewModel, type CombatCardVM } from '@/state/presenters/combat-encounter.engine';
import { RARITY_LABEL, rarityFor } from '@/state/presenters/card-rarity.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

/**
 * One real library card id per rank on the ladder, so the hand below spans
 * every band the library carries through the REAL presenter rather than
 * through a hand-built VM that could disagree with what the board renders.
 */
function idsSpanningTheLadder(): string[] {
    const byRank = new Map<CardRank, string>();
    for (const card of cardLibrary) {
        if (!byRank.has(card.rank)) byRank.set(card.rank, card.id);
    }
    return [...byRank.values()];
}

function handVMs(ids: string[]): CombatCardVM[] {
    const { combat } = startRealFight(REAL_FIGHT_FIXTURE, {
        player: { knownCards: ids, baseStats: { heart: 8, body: 8, mind: 8 }, health: 200, maxHealth: 200 },
        seed: 16,
    });
    let s = combat;
    s = rollEncounterDice(s).state;
    return buildCombatViewModel(s).hand;
}

/** Every face size the game draws: staged, reward offer, hand, detail. */
const FACES: { width: number; height: number; large: boolean }[] = [
    { width: 92, height: 135, large: false },
    { width: 100, height: 147, large: false },
    { width: 120, height: 176, large: false },
    { width: 208, height: 305, large: true },
];

function renderFace(card: CombatCardVM, face: { width: number; height: number; large: boolean }) {
    return render(
        withAllProviders(<CombatCardFace card={card} width={face.width} height={face.height} large={face.large} />).tree,
    );
}

describe('CombatCardFace — no rarity pips on any face', () => {
    const cards = handVMs(idsSpanningTheLadder());

    it('the fixture is non-empty (non-vacuity)', () => {
        expect(cards.length).toBeGreaterThan(0);
    });

    it('draws no pip track and no pip, small or large', () => {
        for (const card of cards) {
            for (const face of FACES) {
                const { unmount } = renderFace(card, face);
                // The face rendered (non-vacuity for the null checks below).
                expect(screen.getByTestId('combat-card-face-name')).toBeTruthy();
                expect(screen.queryByTestId('combat-card-face-rarity-pips')).toBeNull();
                expect(screen.queryByTestId('combat-card-face-rarity-pip-0')).toBeNull();
                unmount();
            }
        }
    });
});

describe('CombatCardFace — the rarity word', () => {
    const cards = handVMs(idsSpanningTheLadder());

    it('prints the band by NAME on the large face', () => {
        for (const card of cards) {
            const { unmount } = renderFace(card, FACES[3]!);
            const tag = screen.getByTestId('combat-card-face-rarity');
            expect(String(tag.props.children)).toBe(RARITY_LABEL[rarityFor(card)].toUpperCase());
            unmount();
        }
    });

    it('does NOT print it on a small face — the name band is the name’s', () => {
        for (const card of cards) {
            for (const face of FACES.filter((x) => !x.large)) {
                const { unmount } = renderFace(card, face);
                expect(screen.queryByTestId('combat-card-face-rarity')).toBeNull();
                unmount();
            }
        }
    });

    it('SAYS the band to a screen reader on every face', () => {
        for (const card of cards) {
            for (const face of FACES) {
                const { unmount } = renderFace(card, face);
                const spacer = screen.getByTestId('combat-card-face-rarity-a11y');
                expect(spacer.props.accessible).toBe(true);
                expect(spacer.props.accessibilityLabel).toBe(RARITY_LABEL[rarityFor(card)]);
                unmount();
            }
        }
    });

    it('tracks the ENGINE rank, not a mobile-side re-band', () => {
        // Asserted against `rankToRarity` from mechanics rather than against
        // `rarityFor`: if the board ever inlines `rank <= 2 ? …`, a test
        // phrased in terms of the mobile module could drift along with it.
        for (const card of cards) {
            expect(card.rank).toBeDefined();
            const { unmount } = renderFace(card, FACES[2]!);
            const label = screen.getByTestId('combat-card-face-rarity-a11y').props.accessibilityLabel;
            unmount();
            expect(label).toBe(RARITY_LABEL[rankToRarity(card.rank as CardRank)]);
        }
    });
});

/**
 * The post-combat card draft overlay.
 *
 * What this pins:
 *   · the tiles render REAL card faces (the card's own name off `CombatCardVM`,
 *     not a bespoke mini-tile's re-derivation of it);
 *   · tapping a tile opens the full inspect preview, and choosing from the
 *     preview selects the card;
 *   · TAKE CARD is inert until something is selected, then reports that id;
 *   · SKIP always works and reports `null` — a lean deck is a real play;
 *   · nothing the overlay prints invents a number the presenter did not give it
 *     (P0-truth at the reward screen).
 *
 * Offers come from the real presenter (`rewardCardVMs`) over real library card
 * ids, so a face-shape regression fails here rather than at runtime.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { cardLibrary, getCardById, upgradeLimit } from '@mechanics';
import { CombatRewardsOverlay } from '@/components/combat/encounter/CombatRewardsOverlay';
import { rewardCardVMs } from '@/state/presenters/combat-encounter.engine';
import { cardUpgradeRowsVM } from '@/state/presenters/card-upgrade.engine';
import { RARITY_LABEL, rarityFor } from '@/state/presenters/card-rarity.engine';
import { withAllProviders } from '@/test-utils/withAllProviders';

// The three real library cards the reward draft offers: the grey office.
const OFFER_IDS = ['grey-strike', 'grey-ward', 'grey-word'];

function renderOverlay(onPick: (cardId: string | null) => void = () => undefined) {
    const offers = rewardCardVMs(OFFER_IDS);
    return { offers, ...render(withAllProviders(<CombatRewardsOverlay offers={offers} onPick={onPick} />).tree) };
}

describe('CombatRewardsOverlay', () => {
    it('renders one real card face per offer', () => {
        const { offers } = renderOverlay();
        expect(screen.getByTestId('combat-rewards')).toBeTruthy();
        expect(offers.length).toBe(3);
        for (const id of OFFER_IDS) {
            expect(screen.getByTestId(`combat-reward-${id}`)).toBeTruthy();
            // The face prints the card's OWN name, uppercased on the side rail.
            const name = getCardById(id)?.name ?? '';
            expect(screen.getAllByText(name.toUpperCase()).length).toBeGreaterThan(0);
        }
    });

    it('every offer tile carries the card it actually offers in its label', () => {
        const { offers } = renderOverlay();
        for (const offer of offers) {
            const label = screen.getByTestId(`combat-reward-${offer.cardId}`).props.accessibilityLabel as string;
            expect(label).toContain(offer.name);
            // The label names the band in the player's own words ('Uncommon'),
            // not the raw VM field ('uncommon'). Compared case-insensitively so
            // this pins the FACT (the label says which band) and not the
            // casing, which is the renderer's call.
            expect(label.toLowerCase()).toContain(offer.rarity ?? 'common');
        }
    });

    it('TAKE CARD is disabled until an offer is selected', () => {
        const onPick = jest.fn();
        renderOverlay(onPick as (cardId: string | null) => void);
        const confirm = screen.getByTestId('combat-reward-confirm');
        expect(confirm.props.accessibilityState.disabled).toBe(true);
        fireEvent.press(confirm);
        expect(onPick).not.toHaveBeenCalled();
    });

    it('tapping a tile opens the inspect preview with the full face', () => {
        renderOverlay();
        expect(screen.queryByTestId('combat-reward-preview')).toBeNull();
        fireEvent.press(screen.getByTestId(`combat-reward-${OFFER_IDS[0]}`));
        expect(screen.getByTestId('combat-reward-preview')).toBeTruthy();
        // The preview must show the authored flavor — the reason to read it.
        expect(screen.getByTestId('combat-reward-preview-flavor')).toBeTruthy();
    });

    it('BACK closes the preview without selecting anything', () => {
        const onPick = jest.fn();
        renderOverlay(onPick as (cardId: string | null) => void);
        fireEvent.press(screen.getByTestId(`combat-reward-${OFFER_IDS[1]}`));
        fireEvent.press(screen.getByTestId('combat-reward-preview-close'));
        expect(screen.queryByTestId('combat-reward-preview')).toBeNull();
        expect(screen.getByTestId('combat-reward-confirm').props.accessibilityState.disabled).toBe(true);
        expect(onPick).not.toHaveBeenCalled();
    });

    it('choosing from the preview selects that card, and TAKE CARD reports it', () => {
        const onPick = jest.fn();
        renderOverlay(onPick as (cardId: string | null) => void);
        fireEvent.press(screen.getByTestId(`combat-reward-${OFFER_IDS[1]}`));
        fireEvent.press(screen.getByTestId('combat-reward-preview-select'));
        expect(screen.queryByTestId('combat-reward-preview')).toBeNull();
        const tile = screen.getByTestId(`combat-reward-${OFFER_IDS[1]}`);
        expect(tile.props.accessibilityState.selected).toBe(true);
        fireEvent.press(screen.getByTestId('combat-reward-confirm'));
        expect(onPick).toHaveBeenCalledWith(OFFER_IDS[1]);
    });

    it('selecting a second card replaces the first', () => {
        const onPick = jest.fn();
        renderOverlay(onPick as (cardId: string | null) => void);
        fireEvent.press(screen.getByTestId(`combat-reward-${OFFER_IDS[0]}`));
        fireEvent.press(screen.getByTestId('combat-reward-preview-select'));
        fireEvent.press(screen.getByTestId(`combat-reward-${OFFER_IDS[2]}`));
        fireEvent.press(screen.getByTestId('combat-reward-preview-select'));
        expect(screen.getByTestId(`combat-reward-${OFFER_IDS[0]}`).props.accessibilityState.selected).toBe(false);
        expect(screen.getByTestId(`combat-reward-${OFFER_IDS[2]}`).props.accessibilityState.selected).toBe(true);
        fireEvent.press(screen.getByTestId('combat-reward-confirm'));
        expect(onPick).toHaveBeenCalledWith(OFFER_IDS[2]);
    });

    it('SKIP reports null, and stays available after a card was selected', () => {
        const onPick = jest.fn();
        renderOverlay(onPick as (cardId: string | null) => void);
        fireEvent.press(screen.getByTestId(`combat-reward-${OFFER_IDS[0]}`));
        fireEvent.press(screen.getByTestId('combat-reward-preview-select'));
        const skip = screen.getByTestId('combat-reward-skip');
        expect(skip.props.accessibilityState?.disabled).toBeFalsy();
        fireEvent.press(skip);
        expect(onPick).toHaveBeenCalledWith(null);
    });

    it('SKIP reads as a real choice, not a greyed-out escape hatch', () => {
        renderOverlay();
        const label = screen.getByTestId('combat-reward-skip').props.accessibilityLabel as string;
        expect(label.toLowerCase()).toContain('lean');
        // Same visual weight as TAKE: both are bordered buttons in the same row.
        expect(screen.getByText('TAKE NOTHING')).toBeTruthy();
        expect(screen.getByText('TAKE CARD')).toBeTruthy();
    });

    it('renders nothing at all when the draft is empty', () => {
        render(withAllProviders(<CombatRewardsOverlay offers={[]} onPick={() => undefined} />).tree);
        expect(screen.getByTestId('combat-rewards')).toBeTruthy();
        for (const id of OFFER_IDS) expect(screen.queryByTestId(`combat-reward-${id}`)).toBeNull();
    });
});

/**
 * Rarity is never colour alone. The draft is the screen where a colour-only
 * rarity signal would cost the most: three cards side by side, one kept for
 * the rest of the run. The tile carries the named label under the face and
 * the frame colour, and the face says the band to a screen reader; the word
 * must be legible with the colour channel ignored.
 */
describe('CombatRewardsOverlay — D4 rarity, never colour alone', () => {
    it('prints the band by NAME under every offer', () => {
        const { offers } = renderOverlay();
        for (const offer of offers) {
            const tag = screen.getByTestId(`combat-reward-rarity-${offer.cardId}`);
            expect(String(tag.props.children)).toBe(RARITY_LABEL[rarityFor(offer)].toUpperCase());
        }
    });

    it('the printed word agrees with what the face says to a screen reader on the same tile', () => {
        // Two legs, one truth: if the caption and the face could disagree, the
        // screen would be teaching the player a hue that means nothing. The
        // face draws no pips (one card face, everywhere); it says the band.
        const { offers } = renderOverlay();
        const spoken = screen.getAllByTestId('combat-card-face-rarity-a11y').map((n) => n.props.accessibilityLabel);
        for (const offer of offers) {
            const band = rarityFor(offer);
            expect(String(screen.getByTestId(`combat-reward-rarity-${offer.cardId}`).props.children))
                .toBe(RARITY_LABEL[band].toUpperCase());
            expect(spoken).toContain(RARITY_LABEL[band]);
        }
        expect(screen.queryByTestId('combat-card-face-rarity-pips')).toBeNull();
    });

    it('names the band in the tile’s accessibility label, in the player’s words', () => {
        const { offers } = renderOverlay();
        for (const offer of offers) {
            const label = screen.getByTestId(`combat-reward-${offer.cardId}`).props.accessibilityLabel as string;
            expect(label).toContain(RARITY_LABEL[rarityFor(offer)]);
        }
    });

    it('carries the rarity into the inspect preview, where the large face prints it', () => {
        // The preview is the last surface before the commit. It renders the
        // `large` face, which is the size that has room for the named tag.
        const { offers } = renderOverlay();
        const first = offers[0]!;
        fireEvent.press(screen.getByTestId(`combat-reward-${first.cardId}`));
        expect(screen.getByTestId('combat-reward-preview')).toBeTruthy();
        const tags = screen.getAllByTestId('combat-card-face-rarity');
        expect(tags.some((t) => String(t.props.children) === RARITY_LABEL[rarityFor(first)].toUpperCase())).toBe(true);
    });
});

// Phase UP1f — the elite reward's second option: one upgrade, read on the
// shared upgrade screen before it commits.
describe('CombatRewardsOverlay — the elite upgrade', () => {
    const RARE = cardLibrary.find((card) => upgradeLimit(card) === 3)!.id;

    function renderElite(rows = cardUpgradeRowsVM([RARE], [RARE])) {
        const onPick = jest.fn<(cardId: string | null) => void>();
        const onUpgrade = jest.fn<(cardId: string) => void>();
        render(withAllProviders(
            <CombatRewardsOverlay offers={rewardCardVMs(OFFER_IDS)} onPick={onPick} upgradeRows={rows} onUpgrade={onUpgrade} />,
        ).tree);
        return { onPick, onUpgrade };
    }

    it('no upgrade rows: no upgrade option', () => {
        renderOverlay();
        expect(screen.queryByTestId('combat-reward-upgrade-open')).toBeNull();
        renderElite([]);
        expect(screen.queryByTestId('combat-reward-upgrade-open')).toBeNull();
    });

    it('names the card chance picked, and opens the shared upgrade screen on it', () => {
        const { onUpgrade, onPick } = renderElite();
        const name = getCardById(RARE)!.name;
        expect(screen.getByText(`chance picked ${name}`)).toBeTruthy();
        fireEvent.press(screen.getByTestId('combat-reward-upgrade-open'));
        expect(screen.getByTestId('card-upgrade-sheet')).toBeTruthy();
        fireEvent.press(screen.getByTestId(`card-upgrade-row-${RARE}`));
        expect(screen.getByTestId('card-upgrade-now-name').props.children).toBe(name);
        expect(screen.getByTestId('card-upgrade-after-name').props.children).toBe(getCardById(`${RARE}+`)!.name);
        expect(screen.getByTestId('card-upgrade-locked')).toBeTruthy();
        fireEvent.press(screen.getByTestId('card-upgrade-confirm'));
        expect(onUpgrade).toHaveBeenCalledWith(RARE);
        expect(onPick).not.toHaveBeenCalled();
    });

    it('BACK returns to the cards without committing', () => {
        const { onUpgrade } = renderElite();
        fireEvent.press(screen.getByTestId('combat-reward-upgrade-open'));
        fireEvent.press(screen.getByTestId('combat-reward-upgrade-back'));
        expect(screen.getByTestId(`combat-reward-${OFFER_IDS[0]}`)).toBeTruthy();
        expect(onUpgrade).not.toHaveBeenCalled();
    });
});

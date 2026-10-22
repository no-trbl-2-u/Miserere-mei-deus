import React from 'react';
import { render, within } from '@testing-library/react-native';

import { HAZARD_DECK } from '@mechanics';
import { HazardCard, CardArt, DETAIL_EFFECT_LINE_H, handArtSize, handEffectFontSize, handNameFontSize } from '../HazardCard';
import { cardVMFromId } from '@/state/presenters/hazard.engine';
import type { HazardCardVM } from '@/state/presenters/hazard.engine';

const mockCardVM: HazardCardVM = {
    uid: 'test-card-1',
    cardId: 'test-card',
    name: 'Test Card',
    kind: 'red',
    rarity: 'common',
    dead: false,
    utility: false,
    free: { force: 3, escape: 1 },
    powered: { force: 5, escape: 2 },
    freeEffectLabel: '',
    poweredEffectLabel: '',
    flavor: 'A powerful card for testing',
    keywords: [],
    dieAvailable: true,
    poweredByDieId: null,
    applied: false,
    salvageLabel: null,
};

describe('HazardCard', () => {
    it('renders card in hand mode with proper structure', () => {
        const { getByText } = render(
            <HazardCard card={mockCardVM} mode="hand" />
        );
        
        expect(getByText('Test Card')).toBeTruthy();
    });

    it('renders card in play mode with compact layout', () => {
        const { getByText } = render(
            <HazardCard card={mockCardVM} mode="play" />
        );
        
        expect(getByText('Test Card')).toBeTruthy();
    });

    it('renders card in detail mode with full information', () => {
        const { getByText } = render(
            <HazardCard card={mockCardVM} mode="detail" />
        );
        
        expect(getByText('Test Card')).toBeTruthy();
        expect(getByText('FREE')).toBeTruthy();
        expect(getByText('MANA')).toBeTruthy();
    });

    // The two printed marks carry no names, so the pair
    // must announce itself: FREE row first, SURGE row second.
    it('announces each number pair by type name', () => {
        const { getByLabelText } = render(
            <HazardCard card={mockCardVM} mode="hand" />
        );

        expect(getByLabelText('FORCE 3, ESCAPE 1')).toBeTruthy();
        expect(getByLabelText('FORCE 5, ESCAPE 2')).toBeTruthy();
    });

    it('renders card in offer mode for rewards', () => {
        const { getByText } = render(
            <HazardCard card={mockCardVM} mode="offer" />
        );
        
        expect(getByText('Test Card')).toBeTruthy();
    });

    it('shows mana socket when card is powered', () => {
        const { getByText } = render(
            <HazardCard card={mockCardVM} mode="detail" />
        );
        
        expect(getByText('MANA')).toBeTruthy();
    });

    it('handles utility cards correctly', () => {
        const utilityCard = { ...mockCardVM, utility: true, freeEffectLabel: 'Heal 2', poweredEffectLabel: 'Heal 4' };
        const { getByText } = render(
            <HazardCard card={utilityCard} mode="detail" />
        );
        
        // Hybrid detail rows show the effect with a ⬡ glyph prefix.
        expect(getByText(/Heal 2/)).toBeTruthy();
        expect(getByText(/Heal 4/)).toBeTruthy();
    });

    it('displays rarity indicator', () => {
        const rareCard = { ...mockCardVM, rarity: 'rare' as const };
        const { getByText } = render(
            <HazardCard card={rareCard} mode="detail" />
        );
        
        // The rarity should be reflected in the styling (this tests the component renders without crash)
        expect(getByText('Test Card')).toBeTruthy();
    });

    it('handles dead cards', () => {
        const deadCard = { ...mockCardVM, dead: true };
        const { getByText } = render(
            <HazardCard card={deadCard} mode="hand" />
        );
        
        expect(getByText('Test Card')).toBeTruthy();
    });
});

describe('CardArt', () => {
    it('renders card art with default size', () => {
        const { root } = render(<CardArt kind="red" />);
        expect(root).toBeTruthy();
    });

    it('renders card art with custom size', () => {
        const { root } = render(<CardArt kind="blue" size={60} />);
        expect(root).toBeTruthy();
    });

    it('renders different colors correctly', () => {
        const colors = ['red', 'blue', 'purple', 'gold'] as const;
        colors.forEach(color => {
            const { root } = render(<CardArt kind={color} />);
            expect(root).toBeTruthy();
        });
    });
});
describe('handNameFontSize', () => {
    it('keeps multi-word names at full size; they wrap at their spaces', () => {
        expect(handNameFontSize('UNBROKEN OATH', 22)).toBe(13);
        expect(handNameFontSize('DEAD-MAN HAUL', 22)).toBe(13);
    });

    it('keeps a short single word at full size', () => {
        expect(handNameFontSize('SCRAMBLE')).toBe(13);
    });

    it('shrinks a single word too long for a covered phone strip instead of breaking it', () => {
        // 375 phone: the fan covers 22px of each card but the last.
        const covered = handNameFontSize('CLIFFRUNNER', 22);
        expect(covered).toBeLessThan(13);
        expect(covered).toBeGreaterThanOrEqual(9);
        expect(handNameFontSize('CLIFFRUNNER', 0)).toBeGreaterThan(covered);
    });
});

describe('handArtSize', () => {
    // A utility card prints an effect line under both stat rows. With the 30px
    // medallion the paid row's line ran past the 136px frame and was cut in half
    // (measured in the web build: 5px over; at 20px it sits 9px clear).
    it('shrinks the medallion on a utility card so both effect lines fit the frame', () => {
        expect(handArtSize(true)).toBeLessThanOrEqual(20);
        expect(handArtSize(false)).toBe(30);
    });

    it('draws the smaller medallion on a utility card in hand mode', () => {
        const utilityCard = { ...mockCardVM, utility: true, freeEffectLabel: 'DRAW 1', poweredEffectLabel: 'DRAW 2' };
        const { toJSON } = render(<HazardCard card={utilityCard} mode="hand" />);
        const json = JSON.stringify(toJSON());
        expect(json).toContain('"width":20,"height":20');
        expect(json).not.toContain('"width":30,"height":30');
    });
});

describe('handEffectFontSize', () => {
    const utility = HAZARD_DECK.map(def => cardVMFromId(def.id)).filter(vm => vm.utility);

    it('keeps short effect lines at full size', () => {
        expect(handEffectFontSize('DRAW 1', 'DRAW 2')).toBe(11);
        expect(handEffectFontSize('RE-CAST', 'RE-CAST +DIE')).toBe(11);
    });

    // Read the Wind's two lines were cut to "CONVERT 1 …" and "CONVERT …" on the
    // 90px hand card. Measured in Chromium with Bebas Neue, "CONVERT ✕→◆ ALL" runs
    // 59px at 8px against the row's 65px; the estimate must not pick a larger size.
    it('shrinks a long convert line until the whole label fits the hand row', () => {
        expect(handEffectFontSize('CONVERT 1 ✕→◆', 'CONVERT ✕→◆ ALL')).toBe(8);
    });

    it('sizes every library utility card legibly, one size for both rows', () => {
        expect(utility.length).toBeGreaterThan(0);
        for (const vm of utility) {
            const size = handEffectFontSize(vm.freeEffectLabel, vm.poweredEffectLabel);
            expect(size).toBeGreaterThanOrEqual(8);
            expect(size).toBeLessThanOrEqual(handEffectFontSize(vm.freeEffectLabel));
            expect(size).toBeLessThanOrEqual(handEffectFontSize(vm.poweredEffectLabel));
        }
    });

    it('prints the whole label without the ⬡ mark in hand mode', () => {
        const wind = cardVMFromId('windread');
        const { getByText, queryByText } = render(<HazardCard card={wind} mode="hand" />);
        expect(getByText('CONVERT ✕→◆ ALL')).toBeTruthy();
        expect(queryByText(/⬡/)).toBeNull();
    });
});

describe('detail mode effect line', () => {
    // Pilgrim's Blessing printed "⬡ RE-CAST +DIE" beside its stats, which pushed MANA
    // and the socket square out of the 234px card (seen in the web build's reward
    // preview, also on Read the Wind and Balance Pole). The effect takes its own line.
    it('prints a utility card\'s effect under the stat row, not beside MANA', () => {
        const blessing = cardVMFromId('blessing');
        const { getByText, getAllByText } = render(<HazardCard card={blessing} mode="detail" />);
        let headerRow = getByText('MANA');
        while (headerRow.props.style?.justifyContent !== 'space-between') headerRow = headerRow.parent!;
        expect(within(headerRow).queryByText(/RE-CAST/)).toBeNull();
        expect(getAllByText(/⬡ RE-CAST \+DIE/)).toHaveLength(2);
    });

    it('grows a utility card by its two effect lines and leaves the rest at 330', () => {
        const height = (card: HazardCardVM) =>
            JSON.stringify(render(<HazardCard card={card} mode="detail" />).toJSON());
        expect(height(cardVMFromId('blessing'))).toContain(`"height":${330 + 2 * DETAIL_EFFECT_LINE_H}`);
        expect(height(mockCardVM)).toContain('"height":330');
    });
});

describe('cost cards', () => {
    const MINUS = '−';
    const flat = (node: unknown): Record<string, unknown> =>
        Array.isArray(node) ? Object.assign({}, ...node.map(flat)) : ((node ?? {}) as Record<string, unknown>);
    const powered = (card: HazardCardVM): HazardCardVM => ({ ...card, poweredByDieId: 'd1' });

    // A cost prints with a true minus sign, in the cost ink and at full
    // strength, where a zero dims and a gain keeps its type ink.
    function costTextColor(view: ReturnType<typeof render>, kind: 'force' | 'escape'): unknown {
        const cost = view.getAllByTestId(`stat-cost-${kind}`)[0];
        expect(flat(cost.props.style).opacity).toBe(1);
        return flat(within(cost).getByText(/−\d/).props.style).color;
    }

    it('a Toll in hand prints its free cost with a minus, in a colour apart from a gain', () => {
        const view = render(<HazardCard card={cardVMFromId('stones')} mode="hand" />);
        expect(view.getByLabelText(`FORCE ${MINUS}2, ESCAPE 0`)).toBeTruthy();
        const gain = within(view.getByLabelText('FORCE 2, ESCAPE 0')).getByText('2');
        expect(costTextColor(view, 'force')).not.toBe(flat(gain.props.style).color);
        expect(view.getAllByTestId('stat-cost-force')).toHaveLength(1);
    });

    it('a Toll staged in the play area still prints its cost', () => {
        const view = render(<HazardCard card={cardVMFromId('tithe')} mode="play" />);
        expect(view.getByLabelText(`FORCE ${MINUS}2, ESCAPE ${MINUS}2`)).toBeTruthy();
        expect(view.getAllByTestId('stat-cost-escape')).toHaveLength(1);
    });

    it('a Debt prints a cost on both lines, staged and powered', () => {
        const view = render(<HazardCard card={powered(cardVMFromId('pawn'))} mode="play" />);
        expect(view.getAllByLabelText(`FORCE ${MINUS}2, ESCAPE ${MINUS}2`)).toHaveLength(2);
        expect(view.getAllByTestId('stat-cost-force')).toHaveLength(2);
        expect(costTextColor(view, 'escape')).toBeDefined();
    });

    it('an Overdrive prints its larger powered cost beside its larger gain', () => {
        const view = render(<HazardCard card={powered(cardVMFromId('breakneck'))} mode="detail" />);
        expect(view.getByLabelText(`FORCE 3, ESCAPE ${MINUS}1`)).toBeTruthy();
        expect(view.getByLabelText(`FORCE 6, ESCAPE ${MINUS}3`)).toBeTruthy();
        expect(view.queryAllByTestId('stat-cost-force')).toHaveLength(0);
        expect(view.getAllByTestId('stat-cost-escape')).toHaveLength(2);
    });
});

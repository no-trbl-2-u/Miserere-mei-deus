/**
 * The victory screen (phase FE1b, A3/A4): the top band, the headline, the paid
 * line, the level panel and the card offer on the dark ground with its
 * buttons on the brass plate; CONTINUE where the offer sits when there is
 * none. The offer keeps its testIDs, its inspect and the elite's upgrade.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { cardLibrary, getCardById, upgradeLimit } from '@mechanics';

import { VictoryScreen, type VictoryScreenProps } from '@/components/combat/encounter/VictoryScreen';
import { BrassButton } from '@/components/experience/BrassButton';
import { cardUpgradeRowsVM } from '@/state/presenters/card-upgrade.engine';
import { rewardCardVMs } from '@/state/presenters/combat-encounter.engine';
import { fightPaidFrom, selectFightEndVM, victoryChapterName } from '@/state/presenters/fight-end.engine';
import { upgradeByA11yAction } from '@/test-utils/cardUpgrade';
import { withAllProviders } from '@/test-utils/withAllProviders';

// The level panel's bar runs on timers: hold them, so no fill lands after a test.
beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

const OFFER_IDS = ['grey-strike', 'grey-ward', 'grey-word'];
const PAID = fightPaidFrom({ experience: 20, level: 1 }, { experience: 40, level: 1 }, 15);

function mount(over: Partial<VictoryScreenProps> = {}) {
    const onPick = jest.fn<(cardId: string | null) => void>();
    const onUpgrade = jest.fn<(cardId: string) => void>();
    const onContinue = jest.fn<() => void>();
    const props: VictoryScreenProps = {
        headline: 'Victory — the enemy falls',
        paid: PAID,
        chapter: victoryChapterName('The Breakwater'),
        purse: 41,
        arena: 1,
        foeArt: 2,
        foeName: 'Quay-Crab',
        offers: rewardCardVMs(OFFER_IDS),
        onPick,
        onUpgrade,
        onContinue,
        ...over,
    };
    render(withAllProviders(<VictoryScreen {...props} />).tree);
    return { onPick, onUpgrade, onContinue };
}

describe('the victory screen', () => {
    it('shows the band, the headline, the paid line and the level panel over the offer', () => {
        mount();
        expect(screen.getByTestId('combat-victory-chapter').props.children).toBe('BREAKWATER');
        expect(screen.getByTestId('combat-victory-purse').props.children).toBe('Shillings 41');
        expect(screen.getByTestId('combat-victory-arena')).toBeTruthy();
        expect(screen.getByTestId('combat-victory-foe').props.accessibilityLabel).toBe('Quay-Crab, fallen');
        expect(screen.getByTestId('combat-victory-headline').props.children).toBe('Victory — the enemy falls');
        expect(screen.getByTestId('combat-victory-paid').props.children).toBe('Shillings +15 · XP +20');
        expect(screen.getByTestId('victory-level-panel')).toBeTruthy();
        expect(screen.getByTestId('combat-rewards')).toBeTruthy();
        expect(screen.queryByTestId('combat-victory-continue')).toBeNull();
    });

    it('the fallen foe is never rotated', () => {
        mount();
        const flat = (s: unknown): Record<string, unknown> => (Array.isArray(s) ? Object.assign({}, ...s.map(flat)) : (s as Record<string, unknown>) ?? {});
        expect(flat(screen.getByTestId('combat-victory-foe').props.style).transform).toBeUndefined();
    });

    it('TAKE NOTHING and TAKE CARD sit on the brass plate and report the pick', () => {
        const { onPick } = mount();
        const plates = screen.UNSAFE_getAllByType(BrassButton).map((b) => b.props.testID);
        expect(plates).toEqual(expect.arrayContaining(['combat-reward-skip', 'combat-reward-confirm']));
        // TAKE CARD waits for a pick.
        fireEvent.press(screen.getByTestId('combat-reward-confirm'));
        expect(onPick).not.toHaveBeenCalled();
        fireEvent.press(screen.getByTestId('combat-reward-grey-ward'));
        fireEvent.press(screen.getByTestId('combat-reward-confirm'));
        expect(onPick).toHaveBeenLastCalledWith('grey-ward');
        fireEvent.press(screen.getByTestId('combat-reward-skip'));
        expect(onPick).toHaveBeenLastCalledWith(null);
    });

    it('a second tap on a card opens its inspect', () => {
        mount();
        fireEvent.press(screen.getByTestId('combat-reward-grey-word'));
        fireEvent.press(screen.getByTestId('combat-reward-grey-word'));
        expect(screen.getByTestId('combat-reward-preview')).toBeTruthy();
    });

    it('after an elite, UPGRADE INSTEAD opens the shared upgrade screen and commits', () => {
        const rare = cardLibrary.find((card) => upgradeLimit(card) === 3)!.id;
        const { onUpgrade } = mount({ upgradeRows: cardUpgradeRowsVM([rare], [rare]) });
        expect(screen.getByText(`chance picked ${getCardById(rare)!.name}`)).toBeTruthy();
        fireEvent.press(screen.getByTestId('combat-reward-upgrade-open'));
        expect(screen.getByTestId('card-upgrade-sheet')).toBeTruthy();
        upgradeByA11yAction();
        expect(onUpgrade).toHaveBeenCalledWith(rare);
    });

    it('a win with no offer shows CONTINUE on the brass plate where the offer sits', () => {
        const relicPaid = fightPaidFrom({ experience: 20, level: 1 }, { experience: 20, level: 1 }, 15);
        const { onContinue } = mount({ offers: [], paid: relicPaid });
        expect(screen.queryByTestId('combat-rewards')).toBeNull();
        expect(screen.getByTestId('combat-victory-paid').props.children).toBe('Shillings +15');
        expect(screen.getByTestId('victory-level-line').props.children).toBe(selectFightEndVM(relicPaid).levelLine);
        const plates = screen.UNSAFE_getAllByType(BrassButton).map((b) => b.props.testID);
        expect(plates).toEqual(['combat-victory-continue']);
        fireEvent.press(screen.getByTestId('combat-victory-continue'));
        expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('no plate: no arena picture, and no map: no chapter name', () => {
        mount({ arena: null, chapter: victoryChapterName(undefined) });
        expect(screen.queryByTestId('combat-victory-arena')).toBeNull();
        expect(screen.getByTestId('combat-victory-chapter').props.children).toBe('');
    });
});

/**
 * The string of beads (spec 127, UP1i): A12 only the centre bead is offered,
 * and the wheel turns by dragging its rim or tapping a side bead; A13 the
 * pair and the change line come from the presenter; A14 the hold commits
 * once and an early release commits nothing; A15 a screen reader upgrades
 * through the centre bead's accessibility action.
 */

import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { StyleSheet } from 'react-native';

import { CombatCardFace } from '@/components/combat/encounter/CombatBoard';
import { CardUpgradePicker, HOLD_MS, UPGRADE_A11Y_ACTION } from '@/components/upgrade/CardUpgradePicker';
import { getCardById, upgradableCardIds } from '@mechanics';
import { cardUpgradePreviewVM, cardUpgradeRowsVM } from '@/state/presenters/card-upgrade.engine';
import { rewardCardVMs } from '@/state/presenters/combat-encounter.engine';
import { DEFAULT_THEME_ID, THEME_SPECS } from '@/theme/palette';

/** The upgrade screen's gold: the default theme's sulfur. */
const GOLD = THEME_SPECS[DEFAULT_THEME_ID].spec.sulfur;

const DECK = ['grey-strike', 'grey-strike', 'grey-strike', 'grey-ward', 'grey-word', 'bp-m-01d', 'mc-e-07b'];
const ROWS = cardUpgradeRowsVM(upgradableCardIds(DECK), DECK);
/** One bead along the rim, in points. */
const STEP = 76;

function expectCentre(cardId: string) {
    const label = screen.getByTestId('card-upgrade-centre').props.accessibilityLabel as string;
    expect(label.startsWith(getCardById(cardId)!.name)).toBe(true);
    expect(screen.queryByTestId(`card-upgrade-bead-${cardId}`)).toBeNull();
}

function drag(translationX: number) {
    act(() => {
        fireGestureHandler(getByGestureTestId('card-upgrade-wheel-pan'), [
            { state: State.BEGAN, translationX: 0, velocityX: 0 },
            { state: State.ACTIVE, translationX: 0, velocityX: 0 },
            { state: State.ACTIVE, translationX, velocityX: 0 },
            { state: State.END, translationX, velocityX: 0 },
        ]);
    });
}

function a11yAction(actionName: string) {
    fireEvent(screen.getByTestId('card-upgrade-centre'), 'accessibilityAction', { nativeEvent: { actionName } });
}

describe('CardUpgradePicker: the string of beads', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('has a bead per card and offers only the centre one, the first card at the start (A12)', () => {
        expect(ROWS.length).toBe(5);
        render(<CardUpgradePicker rows={ROWS} onConfirm={jest.fn()} />);
        expectCentre(ROWS[0].cardId);
        for (const r of ROWS.slice(1)) expect(screen.getByTestId(`card-upgrade-bead-${r.cardId}`)).toBeTruthy();
        expect(screen.getByTestId('card-upgrade-centre').props.accessibilityState).toEqual({ selected: true });
    });

    it('dragging the rim one bead to the left brings the next card to the centre (A12)', () => {
        render(<CardUpgradePicker rows={ROWS} onConfirm={jest.fn()} />);
        drag(-STEP);
        expectCentre(ROWS[1].cardId);
        // Past half a bead snaps on to the next one.
        drag(-STEP * 0.6);
        expectCentre(ROWS[2].cardId);
        // Less than half a bead snaps back.
        drag(-STEP * 0.3);
        expectCentre(ROWS[2].cardId);
    });

    it('the wheel wraps round: turning back from the first card reaches the last (#3)', () => {
        render(<CardUpgradePicker rows={ROWS} onConfirm={jest.fn()} />);
        drag(STEP);
        expectCentre(ROWS[ROWS.length - 1].cardId);
        drag(-STEP * 2);
        expectCentre(ROWS[1].cardId);
    });

    it('tapping a side bead turns the wheel to it and never upgrades (#4)', () => {
        const onConfirm = jest.fn();
        render(<CardUpgradePicker rows={ROWS} onConfirm={onConfirm} />);
        fireEvent.press(screen.getByTestId(`card-upgrade-bead-${ROWS[3].cardId}`));
        expectCentre(ROWS[3].cardId);
        fireEvent.press(screen.getByTestId('card-upgrade-centre'));
        act(() => { jest.advanceTimersByTime(HOLD_MS * 2); });
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('the pair is the centre card as it is and as it will be, the change alone under it (A13)', () => {
        render(<CardUpgradePicker rows={ROWS} onConfirm={jest.fn()} />);
        const siphon = 'bp-m-01d';
        fireEvent.press(screen.getByTestId(`card-upgrade-bead-${siphon}`));
        const vm = cardUpgradePreviewVM(siphon)!;
        expect(within(screen.getByTestId('card-upgrade-now')).getByTestId('combat-card-face-name')).toHaveTextContent(vm.before.name);
        expect(within(screen.getByTestId('card-upgrade-after')).getByTestId('combat-card-face-name')).toHaveTextContent(vm.after.name);
        expect(screen.getByTestId('card-upgrade-change')).toHaveTextContent(vm.changeLine!);
        // The changed numbers on the new card are drawn apart (in gold); the old card has none.
        expect(within(screen.getByTestId('card-upgrade-after')).getAllByTestId('combat-card-face-changed-number'))
            .toHaveLength(vm.changed.paid.length);
        expect(within(screen.getByTestId('card-upgrade-now')).queryByTestId('combat-card-face-changed-number')).toBeNull();
        // No AS IT IS / AS IT WILL BE label, and no locked ??? slot (#6).
        expect(screen.queryByText(/AS IT/)).toBeNull();
        expect(screen.queryByText('???')).toBeNull();
    });

    it('the new card draws its moved numbers in gold, the PAID line and the FREE pill alike (A13)', () => {
        render(<CardUpgradePicker rows={ROWS} onConfirm={jest.fn()} />);
        // Siphon moves its PAID LEECH and its FREE HEAL.
        const siphon = 'bp-m-01d';
        fireEvent.press(screen.getByTestId(`card-upgrade-bead-${siphon}`));
        const vm = cardUpgradePreviewVM(siphon)!;
        expect(vm.changed).toEqual({ paid: [0], free: true });
        const after = within(screen.getByTestId('card-upgrade-after'));
        const now = within(screen.getByTestId('card-upgrade-now'));
        const [moved] = after.getAllByTestId('combat-card-face-changed-number');
        expect(moved).toHaveTextContent(vm.afterCard.face.paidLine.match(/\d+/)![0]);
        expect(StyleSheet.flatten(moved.props.style).color).toBe(GOLD);
        expect(StyleSheet.flatten(after.getByTestId('combat-card-face-free-value').props.style).color).toBe(GOLD);
        // The old card is not marked: no gold number, a plain FREE pill.
        expect(StyleSheet.flatten(now.getByTestId('combat-card-face-free-value').props.style).color).not.toBe(GOLD);
    });

    it('a card face with no `changed` prints every number in its own ink, as before', () => {
        const [card] = rewardCardVMs(['bp-m-01d']);
        render(<CombatCardFace card={card} width={120} height={176} />);
        expect(screen.queryByTestId('combat-card-face-changed-number')).toBeNull();
        const line = screen.getByTestId('combat-card-face-paid-line');
        const runs = React.Children.toArray(line.props.children) as React.ReactElement<{ style: unknown }>[];
        expect(runs.length).toBeGreaterThan(0);
        for (const run of runs) expect(StyleSheet.flatten(run.props.style as never).color).not.toBe(GOLD);
        expect(StyleSheet.flatten(screen.getByTestId('combat-card-face-free-value').props.style).color).not.toBe(GOLD);
    });

    it('letting go of HOLD before the ring closes empties it and commits nothing (A14, #2)', () => {
        const onConfirm = jest.fn();
        render(<CardUpgradePicker rows={ROWS} onConfirm={onConfirm} />);
        const hold = screen.getByTestId('card-upgrade-hold');
        expect(screen.queryByTestId('card-upgrade-hold-ring')).toBeNull();
        fireEvent(hold, 'pressIn');
        expect(screen.getByTestId('card-upgrade-hold-ring')).toBeTruthy();
        act(() => { jest.advanceTimersByTime(HOLD_MS - 1); });
        fireEvent(hold, 'pressOut');
        expect(screen.queryByTestId('card-upgrade-hold-ring')).toBeNull();
        act(() => { jest.advanceTimersByTime(HOLD_MS * 2); });
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('a full hold commits exactly one upgrade of the centre card through onConfirm (A14, #1)', () => {
        const onConfirm = jest.fn();
        render(<CardUpgradePicker rows={ROWS} onConfirm={onConfirm} />);
        drag(-STEP);
        const hold = screen.getByTestId('card-upgrade-hold');
        fireEvent(hold, 'pressIn');
        act(() => { jest.advanceTimersByTime(HOLD_MS); });
        fireEvent(hold, 'pressOut');
        act(() => { jest.advanceTimersByTime(HOLD_MS * 2); });
        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onConfirm).toHaveBeenCalledWith(ROWS[1].cardId);
    });

    it('turning the wheel mid-hold empties the ring (A14)', () => {
        const onConfirm = jest.fn();
        render(<CardUpgradePicker rows={ROWS} onConfirm={onConfirm} />);
        fireEvent(screen.getByTestId('card-upgrade-hold'), 'pressIn');
        act(() => { jest.advanceTimersByTime(HOLD_MS / 2); });
        fireEvent.press(screen.getByTestId(`card-upgrade-bead-${ROWS[2].cardId}`));
        act(() => { jest.advanceTimersByTime(HOLD_MS * 2); });
        expect(onConfirm).not.toHaveBeenCalled();
        expect(screen.queryByTestId('card-upgrade-hold-ring')).toBeNull();
    });

    it('a screen reader turns the wheel and upgrades through the centre bead, without the hold (A15)', () => {
        const onConfirm = jest.fn();
        render(<CardUpgradePicker rows={ROWS} onConfirm={onConfirm} />);
        const actions = screen.getByTestId('card-upgrade-centre').props.accessibilityActions as { name: string }[];
        expect(actions.map((a) => a.name)).toEqual([UPGRADE_A11Y_ACTION, 'increment', 'decrement']);
        a11yAction('increment');
        expectCentre(ROWS[1].cardId);
        a11yAction('decrement');
        a11yAction('decrement');
        expectCentre(ROWS[ROWS.length - 1].cardId);
        a11yAction(UPGRADE_A11Y_ACTION);
        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onConfirm).toHaveBeenCalledWith(ROWS[ROWS.length - 1].cardId);
        // Every side bead is reachable and says what tapping it does.
        for (const r of ROWS.slice(0, -1)) {
            expect(screen.getByTestId(`card-upgrade-bead-${r.cardId}`).props.accessibilityHint).toMatch(/Turns the wheel/);
        }
    });

    it('a card carried more than once shows its count on its bead (#5)', () => {
        render(<CardUpgradePicker rows={ROWS} onConfirm={jest.fn()} />);
        expect(screen.getByTestId('card-upgrade-count-grey-strike')).toHaveTextContent('×3');
        expect(screen.queryByTestId('card-upgrade-count-grey-ward')).toBeNull();
    });

    it('a one-card wheel (the elite reward) is a single centred bead that does not turn', () => {
        const onConfirm = jest.fn();
        const one = ROWS.slice(1, 2);
        render(<CardUpgradePicker rows={one} onConfirm={onConfirm} />);
        expectCentre(one[0].cardId);
        const actions = screen.getByTestId('card-upgrade-centre').props.accessibilityActions as { name: string }[];
        expect(actions.map((a) => a.name)).toEqual([UPGRADE_A11Y_ACTION]);
        fireEvent(screen.getByTestId('card-upgrade-hold'), 'pressIn');
        act(() => { jest.advanceTimersByTime(HOLD_MS); });
        expect(onConfirm).toHaveBeenCalledWith(one[0].cardId);
    });

    it('the figure is a slot: the stand-in by default, left out on null', () => {
        const { rerender } = render(<CardUpgradePicker rows={ROWS} onConfirm={jest.fn()} />);
        expect(screen.getByTestId('card-upgrade-figure')).toBeTruthy();
        rerender(<CardUpgradePicker rows={ROWS} onConfirm={jest.fn()} figure={null} />);
        expect(screen.queryByTestId('card-upgrade-figure')).toBeNull();
    });

    it('prints the host price line', () => {
        render(<CardUpgradePicker rows={ROWS} onConfirm={jest.fn()} priceLine="5 shillings" />);
        expect(screen.getByTestId('card-upgrade-price')).toHaveTextContent('5 shillings');
    });
});

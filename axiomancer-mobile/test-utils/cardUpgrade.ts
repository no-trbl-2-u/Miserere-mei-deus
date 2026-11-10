/**
 * Drives the shared card-upgrade screen, the string of beads (spec 127,
 * UP1i), the way a player does: bring a card to the centre bead (tap its
 * side bead; a centred card stays), then hold HOLD until the ring closes,
 * or upgrade through the centre bead's accessibility action as a screen
 * reader does. The hold needs jest's fake timers.
 */

import { jest } from '@jest/globals';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { HOLD_MS, UPGRADE_A11Y_ACTION } from '@/components/upgrade/CardUpgradePicker';

type Queries = Pick<typeof screen, 'getByTestId' | 'queryByTestId'>;

/** The card on the centre bead: its accessibility label leads with the card's name. */
export function centreBeadLabel(r: Queries = screen): string {
    return String(r.getByTestId('card-upgrade-centre').props.accessibilityLabel);
}

/** True when the wheel carries `cardId`, on a side bead or the centre one (`name` is its card name). */
export function isOnWheel(cardId: string, name: string, r: Queries = screen): boolean {
    return r.queryByTestId(`card-upgrade-bead-${cardId}`) !== null || centreBeadLabel(r).startsWith(name);
}

/** Turns the wheel so `cardId` sits on the centre bead (a tap on its side bead). */
export function bringToCentre(cardId: string, r: Queries = screen): void {
    const bead = r.queryByTestId(`card-upgrade-bead-${cardId}`);
    if (bead !== null) fireEvent.press(bead);
}

/** Holds HOLD until the ring closes, then lets go: one upgrade of the centre card. */
export function holdToUpgrade(r: Queries = screen): void {
    const hold = r.getByTestId('card-upgrade-hold');
    fireEvent(hold, 'pressIn');
    act(() => { jest.advanceTimersByTime(HOLD_MS); });
    fireEvent(hold, 'pressOut');
}

/** The screen reader's way: the centre bead's `upgrade` accessibility action. */
export function upgradeByA11yAction(r: Queries = screen): void {
    fireEvent(r.getByTestId('card-upgrade-centre'), 'accessibilityAction', { nativeEvent: { actionName: UPGRADE_A11Y_ACTION } });
}

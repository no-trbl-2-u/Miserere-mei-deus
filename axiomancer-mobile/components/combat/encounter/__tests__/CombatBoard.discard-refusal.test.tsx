/**
 * CombatBoard — an unpayable PAID discard is refused loudly (Phase DF1c, A6).
 *
 * A PAID line that discards more cards than the player holds besides it
 * cannot be played (the engine's `programLineDiscardShortfall`, carried on
 * the card VM as `play.paidDiscard`). A die is never dropped on such a card,
 * but a card armed while it could pay can stop paying when other plays thin
 * the hand. Then:
 *   · APPLY plays nothing: the card shakes, the phone buzzes (an Error
 *     notification) and the reason names the shortfall;
 *   · End turn with that play staged does the same, and the turn does not end
 *     (no staged card is applied either);
 *   · with the die taken off (or no such play staged), End turn ends the turn.
 *
 * The cases inject `play` on a grey hand card, as the SACRIFICE floor suite
 * does; the presenter suite pins the engine read itself.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { rollEncounterDice } from '@mechanics';
import { CombatBoard, unpayableDiscardStaged, type DragController } from '@/components/combat/encounter/CombatBoard';
import { buildCombatViewModel, PROGRAM_COPY, type CombatCardVM, type CombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { Haptics } from '@/lib/platform/haptics';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';
import { tapCombatDie } from '@/test-utils/tapCombatDie';
import * as Juice from '@/lib/juice';

jest.mock('@/lib/juice', () => {
    const actual = jest.requireActual('@/lib/juice') as typeof Juice;
    return { ...actual, useJuiceShake: jest.fn(actual.useJuiceShake) };
});

const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike'];
const WHY = 'not enough other cards in hand to discard';
const PAYABLE = {
    freeBlock: null, paidBlock: null, freeShortfall: null, paidShortfall: null, paidDiscard: null,
    unscrappable: false, xRange: null,
};
const UNPAYABLE = { ...PAYABLE, paidBlock: WHY, paidDiscard: { discard: 2, held: 1 } };

const noopDrag = (): DragController =>
    ({ begin: () => undefined, end: () => undefined, active: null, x: { value: 0 }, y: { value: 0 } } as unknown as DragController);

afterEach(() => { jest.clearAllMocks(); jest.restoreAllMocks(); });

/** The first hand card staged; armed with the opening die while payable, then the hand thins. */
async function armedThenThinned() {
    const { store, combat } = startRealFight(REAL_FIGHT_FIXTURE, {
        player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 200, maxHealth: 200 },
        seed: 16,
    });
    const vm0 = buildCombatViewModel(rollEncounterDice(combat).state);
    const withPlay = (play: typeof PAYABLE | typeof UNPAYABLE): CombatViewModel => {
        const card: CombatCardVM = { ...vm0.hand[0], play };
        return { ...vm0, hand: [card, ...vm0.hand.slice(1)] };
    };
    const cbs = {
        onApply: jest.fn(), onStage: jest.fn(), onUnstage: jest.fn(), onDiscard: jest.fn(),
        onSignature: jest.fn(), onEndPhase: jest.fn(), onInspect: jest.fn(),
    };
    const uid = vm0.hand[0].uid;
    const tree = (vm: CombatViewModel) =>
        withAllProviders(<CombatBoard vm={vm} drag={noopDrag()} stagedUids={[uid]} {...cbs} />, { store }).tree;
    const view = render(tree(withPlay(PAYABLE)));
    const die = vm0.dice.find((d) => d.draggable && !d.spent)!;
    await tapCombatDie(die.id);
    view.rerender(tree(withPlay(UNPAYABLE)));
    return { uid, cbs, name: vm0.hand[0].name, view, tree, withPlay };
}

const shakeKeys = () => (Juice.useJuiceShake as jest.Mock).mock.calls.map(([key]) => key as number);

describe('CombatBoard — an unpayable PAID discard', () => {
    it('APPLY plays nothing: the card shakes, the phone buzzes, the reason names the shortfall', async () => {
        const buzz = jest.spyOn(Haptics, 'notificationAsync');
        const { uid, cbs, name } = await armedThenThinned();
        expect(screen.getByTestId(`combat-apply-${uid}`).props.accessibilityLabel).toBe(`Cannot apply: ${WHY}`);
        const before = Math.max(0, ...shakeKeys());
        fireEvent.press(screen.getByTestId(`combat-apply-${uid}`));
        expect(cbs.onApply).not.toHaveBeenCalled();
        expect(buzz).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
        expect(Math.max(...shakeKeys())).toBeGreaterThan(before);
        expect(screen.getByTestId('combat-drop-reject')).toHaveTextContent(`✕ ${PROGRAM_COPY.discardShort(name, 2, 1)}`);
    });

    it('End turn with that play staged is held: it shakes and buzzes, nothing is applied, the turn does not end', async () => {
        const buzz = jest.spyOn(Haptics, 'notificationAsync');
        const { cbs, name } = await armedThenThinned();
        const before = Math.max(0, ...shakeKeys());
        await act(async () => { fireEvent.press(screen.getByTestId('combat-end-phase')); });
        expect(cbs.onEndPhase).not.toHaveBeenCalled();
        expect(cbs.onApply).not.toHaveBeenCalled();
        expect(buzz).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
        expect(Math.max(...shakeKeys())).toBeGreaterThan(before);
        expect(screen.getByTestId('combat-drop-reject')).toHaveTextContent(`✕ ${PROGRAM_COPY.endHeld(name, 2, 1)}`);
    });

    it('a payable staged play still ends the turn, applied first', async () => {
        const { cbs, view, tree, withPlay } = await armedThenThinned();
        view.rerender(tree(withPlay(PAYABLE)));
        await act(async () => { fireEvent.press(screen.getByTestId('combat-end-phase')); });
        expect(cbs.onApply).toHaveBeenCalledTimes(1);
        expect(cbs.onEndPhase).toHaveBeenCalledTimes(1);
    });
});

describe('unpayableDiscardStaged — which staged play holds End turn', () => {
    const card = (uid: string, play: typeof PAYABLE | typeof UNPAYABLE | undefined) =>
        ({ uid, name: `Card ${uid}`, play } as unknown as CombatCardVM);

    it('only a staged card holding a die on an unpayable PAID discard', () => {
        const hand = [card('a', PAYABLE), card('b', UNPAYABLE), card('c', undefined)];
        expect(unpayableDiscardStaged(['a', 'b'], hand, () => true)).toEqual({ uid: 'b', name: 'Card b', discard: 2, held: 1 });
        // No die on it: it plays FREE, which never discards.
        expect(unpayableDiscardStaged(['a', 'b'], hand, (uid) => uid !== 'b')).toBeNull();
        // Not staged.
        expect(unpayableDiscardStaged(['a', 'c'], hand, () => true)).toBeNull();
    });
});

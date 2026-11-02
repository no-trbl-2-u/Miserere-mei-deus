/**
 * CombatBoard — a card with no die to wait for plays when it lands (phase CP1a).
 *
 * A dropped card used to stage and wait for APPLY or END TURN, so a card that
 * no die in the tray could power still sat on the enemy until END TURN played
 * the whole pile at once. Now the drop decides (`resolveCardDrop`):
 *   · neither line playable           → refused, as before;
 *   · some unspent die could power it → stages, as before (a die another
 *     staged card holds still counts);
 *   · no die could, free line open    → plays FREE on landing, through the same
 *     `onApply(uid, null, false)` APPLY uses with no die, and is never staged.
 *
 * The pure helper is pinned row by row; the rendered cases drive a real
 * `CombatEncounterPanel` on a real `CombatEncounterState` through the board's
 * own `resolveDrop` (the drag controller's resolver), with node measurement
 * stubbed because jest cannot lay anything out.
 */

import React from 'react';
import { View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { CombatEncounterPanel } from '@/components/combat/encounter/CombatEncounterPanel';
import { resolveCardDrop, type CombatBoardProps, type DragController } from '@/components/combat/encounter/CombatBoard';
import type { CombatCardVM } from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';
import { tapCombatDie } from '@/test-utils/tapCombatDie';

// ── The pure decision: every row of the spec's table ─────────────────────────

const OPEN = { freeBlock: null, paidBlock: null };
const WHY = 'only at half VITAE or less';
const die = (color: string, extra: { spent?: boolean; face?: 'special' | 'mana' | 'miss'; isX?: boolean } = {}) =>
    ({ color, spent: false, ...extra });

describe('resolveCardDrop — the drop table', () => {
    it('no die in the tray at all: the card plays', () => {
        expect(resolveCardDrop({ stance: 'body', play: OPEN }, [])).toBe('play');
    });

    it('only spent dice: the card plays', () => {
        expect(resolveCardDrop({ stance: 'body', play: OPEN }, [die('body', { spent: true }), die('wild', { spent: true })])).toBe('play');
    });

    it('only off-colour dice: the card plays', () => {
        expect(resolveCardDrop({ stance: 'body', play: OPEN }, [die('mind'), die('heart')])).toBe('play');
    });

    it('an X die and a MISS face power nothing: the card plays', () => {
        expect(resolveCardDrop({ stance: 'body', play: OPEN }, [die('x', { isX: true }), die('body', { face: 'miss' })])).toBe('play');
    });

    it('a matching unspent die: the card stages and waits', () => {
        expect(resolveCardDrop({ stance: 'body', play: OPEN }, [die('mind'), die('body')])).toBe('stage');
    });

    it('a WILD die powers any colour: the card stages', () => {
        expect(resolveCardDrop({ stance: 'mind', play: OPEN }, [die('wild')])).toBe('stage');
    });

    it('a grey card takes every unspent die, so any one makes it wait', () => {
        for (const color of ['heart', 'body', 'mind', 'wild']) {
            expect(resolveCardDrop({ stance: 'any', play: OPEN }, [die(color)])).toBe('stage');
        }
        expect(resolveCardDrop({ stance: 'any', play: OPEN }, [die('body', { spent: true })])).toBe('play');
    });

    it('a die another staged card holds still counts (the tray keeps it unspent; the helper never sees who holds it)', () => {
        expect(resolveCardDrop({ stance: 'body', play: OPEN }, [die('body')])).toBe('stage');
    });

    it('a matching die but the PAID line blocked: the die could not go on it, so the card plays (T call 1)', () => {
        expect(resolveCardDrop({ stance: 'body', play: { freeBlock: null, paidBlock: WHY } }, [die('body'), die('wild')])).toBe('play');
    });

    it('no die, free line blocked, paid line open: stages as before, never plays', () => {
        expect(resolveCardDrop({ stance: 'body', play: { freeBlock: 'needs a die', paidBlock: null } }, [])).toBe('stage');
        expect(resolveCardDrop({ stance: 'body', play: { freeBlock: 'needs a die', paidBlock: null } }, [die('mind')])).toBe('stage');
    });

    it('a die and the free line blocked: stages (the die can go on the paid line)', () => {
        expect(resolveCardDrop({ stance: 'body', play: { freeBlock: 'needs a die', paidBlock: null } }, [die('body')])).toBe('stage');
    });

    it('both lines blocked: refused, with or without a die', () => {
        const play = { freeBlock: 'a', paidBlock: 'b' };
        expect(resolveCardDrop({ stance: 'body', play }, [])).toBe('refuse');
        expect(resolveCardDrop({ stance: 'body', play }, [die('body')])).toBe('refuse');
    });

    it('a card with no play read (a plain card) follows the dice alone', () => {
        expect(resolveCardDrop({ stance: 'any' }, [])).toBe('play');
        expect(resolveCardDrop({ stance: 'any' }, [die('heart')])).toBe('stage');
    });
});

// ── A real board on a real encounter ─────────────────────────────────────────

const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike', 'grey-ward'];
type Resolver = (payload: unknown, x: number, y: number) => Promise<void>;

beforeEach(() => {
    jest.useFakeTimers();
    // Jest lays nothing out: answer node.measure with fixed rects. The play
    // area is the big box, the scrap bin a small one far from it.
    jest.spyOn(View.prototype as unknown as { measure: (cb: (...a: number[]) => void) => void }, 'measure')
        .mockImplementation(function (this: { props?: { testID?: string } }, cb) {
            if (this.props?.testID === 'combat-trash') cb(0, 0, 40, 40, 900, 900);
            else cb(0, 0, 400, 400, 0, 0);
        });
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

function mountLiveBoard() {
    const { store, enemy } = startRealFight(REAL_FIGHT_FIXTURE, {
        player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 160, maxHealth: 160 },
    });
    const bootstrapPlayer = store.getState().player;
    const { tree } = withAllProviders(
        <CombatEncounterPanel enemy={enemy} bootstrapPlayer={bootstrapPlayer} deck={CARDS} seed={7} onExit={() => undefined} />,
        { store },
    );
    render(tree);
    act(() => { fireEvent.press(screen.getByTestId('combat-enter')); });
    act(() => { jest.advanceTimersByTime(5000); });
}

function board(): CombatBoardProps {
    return screen.UNSAFE_root.findAll(
        (n: { props: unknown }) => !!(n.props as Partial<CombatBoardProps>).drag && !!(n.props as Partial<CombatBoardProps>).stagedUids,
    )[0].props as CombatBoardProps;
}

/** Drop a hand card inside the play area, as the gesture's `end` does. */
async function dropOnBoard(card: CombatCardVM) {
    const resolver = (board().drag as DragController & { resolveDrop?: Resolver }).resolveDrop!;
    await act(async () => { await resolver({ type: 'card', from: 'hand', uid: card.uid, card }, 100, 100); });
}

/** Spend every die that can still power a card (the seed rolls MISS faces on the rest), leaving the tray dead. */
function spendTray(): number {
    const dice = board().vm.dice.filter((d) => !d.spent && d.face !== 'miss');
    for (const d of dice) {
        const card = board().vm.hand[0];
        act(() => { board().onApply(card.uid, d.id, true); });
    }
    return dice.length;
}

describe('CombatBoard — dropping a card on a live encounter', () => {
    it('the tray is live and every grey card has a die to wait for: it stages', async () => {
        mountLiveBoard();
        const card = board().vm.hand[0];
        expect(board().vm.dice.some((d) => !d.spent)).toBe(true);
        await dropOnBoard(card);
        expect(board().stagedUids).toEqual([card.uid]);
        expect(board().vm.hand.some((c) => c.uid === card.uid)).toBe(true);
    });

    it('a die another staged card holds still counts: the second card stages and waits', async () => {
        mountLiveBoard();
        const [first, second] = board().vm.hand;
        await dropOnBoard(first);
        const wild = board().vm.dice.find((d) => d.color === 'wild' && !d.spent)!;
        jest.useRealTimers(); // runOnJS hands the tap over on a microtask the fake clock would hold
        await tapCombatDie(wild.id);
        expect(screen.getByTestId('combat-staged-die')).toBeTruthy();
        await dropOnBoard(second);
        expect(board().stagedUids).toEqual([first.uid, second.uid]);
    });

    it('no unspent die left: the drop plays FREE at once and leaves nothing staged, with the events APPLY gives', async () => {
        // Run A: the drop.
        mountLiveBoard();
        spendTray();
        expect(board().vm.dice.some((d) => !d.spent && d.face !== 'miss')).toBe(false);
        const card = board().vm.hand[0];
        await dropOnBoard(card);
        expect(board().stagedUids).toEqual([]);
        expect(board().vm.hand.some((c) => c.uid === card.uid)).toBe(false);
        const dropped = { vm: JSON.stringify(board().vm), fx: JSON.stringify((board().fx?.events ?? [])) };

        // Run B: the same state, played the way APPLY plays a card with no die.
        screen.unmount();
        mountLiveBoard();
        spendTray();
        const same = board().vm.hand[0];
        expect(same.cardId).toBe(card.cardId);
        act(() => { board().onApply(same.uid, null, false); });
        expect({ vm: JSON.stringify(board().vm), fx: JSON.stringify((board().fx?.events ?? [])) }).toEqual(dropped);
        expect((board().fx?.events ?? []).length).toBeGreaterThan(0);
    });

    it('a turn of only dieless drops: END TURN finds nothing staged and ends the turn', async () => {
        mountLiveBoard();
        spendTray();
        const turn = board().vm.turnLabel;
        let guard = 0;
        while (board().vm.hand.length > 0 && guard++ < 10) await dropOnBoard(board().vm.hand[0]);
        expect(board().vm.hand).toHaveLength(0);
        expect(board().stagedUids).toEqual([]);
        await act(async () => { fireEvent.press(screen.getByTestId('combat-end-phase')); });
        act(() => { jest.advanceTimersByTime(5000); });
        expect(board().stagedUids).toEqual([]);
        expect(board().vm.turnLabel).not.toBe(turn);
    });
});

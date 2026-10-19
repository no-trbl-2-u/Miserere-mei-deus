/**
 * Hermetic component tests — the HAZARD PUZZLES flow on the live hazard
 * surface (A15, A18, A19, A20, A21, A23): the list, the live route select
 * before the clock, the live board with every engine move reached through
 * its own callbacks, the clock expiry confirming the board as it stands, a
 * manual CONFIRM, the outcome reaching the player, and no tap-button view.
 * HP3a (A1, A2, A4): the opening roll lands on the layout's faces and holds
 * the clock, a DRAW's cards enter the hand in reserve order, nothing reads
 * an RNG, and the board's results equal the engine's replay of its moves.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, within } from '@testing-library/react-native';
import React from 'react';

import { HazardBoard } from '@/components/hazard/HazardBoard';
import { HazardDie } from '@/components/hazard/HazardDie';
import { DICE_ROLL_OVERLAY_MS } from '@/components/hazard/HazardOverlays';
import { HazardPuzzleDemo } from '@/components/hazard/puzzle/HazardPuzzleDemo';
import { HAZARD_PUZZLE_TICK_MS } from '@/components/hazard/puzzle/useHazardPuzzleClock';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { withAllProviders } from '@/test-utils/withAllProviders';
import {
    activeHazardPuzzleUnlocks,
    confirmHazardPuzzle,
    createHazardPuzzleSession,
    getHazardPuzzleLayout,
    playHazardPuzzleMoves,
    type BaseStats,
    type HazardPuzzleMove,
} from '@mechanics';

// The live board's gestures, as its own test mocks them: a chainable
// builder (every configurator returns the gesture) and a pass-through
// detector. Moves are driven through the board's callbacks instead.
jest.mock('react-native-gesture-handler', () => {
    const chainable = () => {
        const gesture: Record<string, unknown> = {};
        for (const method of ['minDistance', 'maxDistance', 'enabled', 'onStart', 'onUpdate', 'onEnd', 'onFinalize']) {
            gesture[method] = () => gesture;
        }
        return gesture;
    };
    return {
        Gesture: { Pan: chainable, Tap: chainable, Exclusive: (...gestures: unknown[]) => gestures[0] },
        GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    };
});

beforeEach(() => {
    jest.useFakeTimers();
    globalThis.__AXM_HAZARD_SEED__ = 11;
});

afterEach(() => {
    jest.useRealTimers();
    delete (globalThis as { __AXM_HAZARD_SEED__?: number }).__AXM_HAZARD_SEED__;
});

/** Plays the opening roll out, so the board is live and the clock runs. */
function settleRoll() {
    act(() => {
        jest.advanceTimersByTime(DICE_ROLL_OVERLAY_MS);
    });
}

/** Opens a demo on a route; `settle: false` leaves the opening roll playing. */
function openDemo(id: string, route: 'safe' | 'risk', stats: BaseStats, settle: boolean) {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    store.setState({ player: { ...store.getState().player, baseStats: stats } } as never);
    const { tree } = withAllProviders(<HazardPuzzleDemo />, { store });
    const screen = render(tree);
    fireEvent.press(screen.getByTestId(`hazard-puzzle-pick-${id}`));
    expect(screen.getByTestId('hazard-route-select')).toBeTruthy();
    fireEvent.press(screen.getByTestId(`hazard-route-${route}`));
    if (settle) settleRoll();
    return { screen, store };
}

/** Opens the hard demo on the risk route; `settle: false` leaves the opening roll playing. */
function openHardRisk(stats: BaseStats = { heart: 1, body: 1, mind: 1 }, settle = true) {
    return openDemo('demo-undercroft-hard', 'risk', stats, settle);
}

/** The dice faces the opening roll shows, in order. */
function rolledFaces(screen: ReturnType<typeof render>): string[] {
    // `HazardDie` is memoised; the rendered node is the wrapped function.
    const inner = (HazardDie as unknown as { type: React.ComponentType<unknown> }).type;
    return within(screen.getByTestId('hazard-dice-roll'))
        .UNSAFE_getAllByType(inner)
        .map((d) => (d.props as { kind: string }).kind);
}

/** The live board's props as the puzzle mounted them (its VM and callbacks). */
function boardProps(screen: ReturnType<typeof render>) {
    // `HazardBoard` is memoised; the rendered node is the wrapped function.
    const inner = (HazardBoard as unknown as { type: React.ComponentType<unknown> }).type;
    return screen.UNSAFE_getByType(inner).props as React.ComponentProps<typeof HazardBoard>;
}

describe('HazardPuzzleDemo', () => {
    it('lists the three demos', () => {
        const { tree } = withAllProviders(<HazardPuzzleDemo />);
        const screen = render(tree);
        expect(screen.getByTestId('hazard-puzzle-list')).toBeTruthy();
        expect(screen.getByTestId('hazard-puzzle-pick-demo-cliff-easy')).toBeTruthy();
        expect(screen.getByTestId('hazard-puzzle-pick-demo-ashfall-medium')).toBeTruthy();
        expect(screen.getByTestId('hazard-puzzle-pick-demo-undercroft-hard')).toBeTruthy();
    });

    it('picks the route on the live RouteSelect, and the clock does not run until then', () => {
        const { tree } = withAllProviders(<HazardPuzzleDemo />);
        const screen = render(tree);
        fireEvent.press(screen.getByTestId('hazard-puzzle-pick-demo-undercroft-hard'));
        expect(screen.getByTestId('hazard-route-select')).toBeTruthy();
        expect(screen.getByTestId('hazard-route-safe')).toBeTruthy();
        expect(screen.getByText('HARD · 60 S')).toBeTruthy();
        expect(screen.queryByTestId('hazard-puzzle-clock')).toBeNull();
        act(() => {
            jest.advanceTimersByTime(120 * HAZARD_PUZZLE_TICK_MS);
        });
        expect(screen.getByTestId('hazard-route-select')).toBeTruthy();
        expect(screen.queryByTestId('hazard-puzzle-outcome')).toBeNull();
        fireEvent.press(screen.getByTestId('hazard-puzzle-back'));
        expect(screen.getByTestId('hazard-puzzle-list')).toBeTruthy();
    });

    it('starts the live board with the hard risk clock, hand and reserve', () => {
        const { screen } = openHardRisk();
        expect(screen.getByTestId('hazard-board')).toBeTruthy();
        expect(screen.getByTestId('hazard-puzzle-clock').props.children).toBe('1:00');
        expect(screen.getByTestId('hazard-puzzle-reserve').props.children).toBe('2 CARDS IN RESERVE');
        expect(screen.getByTestId('hazard-puzzle-unlocks').props.children).toBe('Your stats unlock nothing here.');
        expect(screen.getAllByTestId(/^hazard-hand-c\d+$/)).toHaveLength(3);
        expect(screen.getAllByTestId(/^hazard-die-d\d+$/)).toHaveLength(3);
    });

    it('a Mind of 3 unlocks a second SCRAMBLE into the hand, and the strip names it', () => {
        const { screen } = openHardRisk({ heart: 1, body: 1, mind: 3 });
        expect(screen.getByTestId('hazard-puzzle-unlocks').props.children).toBe(
            'Your stats unlock: SCRAMBLE joins the hand (MIND 3).',
        );
        expect(screen.getAllByTestId(/^hazard-hand-c\d+$/)).toHaveLength(4);
    });

    it('reaches every engine move through the live board (A20)', () => {
        const { screen } = openHardRisk();
        // stage: a hand card into the play area.
        act(() => boardProps(screen).onStage('c1'));
        expect(screen.getByTestId('hazard-staged-c1')).toBeTruthy();
        expect(screen.queryByTestId('hazard-hand-c1')).toBeNull();
        // unstage: a staged card back to the hand.
        act(() => boardProps(screen).onUnstage('c1'));
        expect(screen.getByTestId('hazard-hand-c1')).toBeTruthy();
        // power: the purple die onto the purple card.
        act(() => boardProps(screen).onStage('c1'));
        act(() => boardProps(screen).onPower('c1', 'd4'));
        expect(boardProps(screen).vm.play[0].poweredByDieId).toBe('d4');
        // apply: SURE FOOTING is a DRAW card, so the reserve feeds the hand.
        act(() => boardProps(screen).onApply('c1'));
        expect(screen.getByTestId('hazard-applied-c1')).toBeTruthy();
        expect(boardProps(screen).vm.hand.map((c) => c.cardId)).toContain('grip');
        expect(screen.getByTestId('hazard-puzzle-reserve').props.children).not.toBe('2 CARDS IN RESERVE');
        // no bin: the board gets no discard handler and draws no bin.
        expect(boardProps(screen).onDiscard).toBeUndefined();
        expect(screen.queryByTestId('hazard-trash')).toBeNull();
        // inspect: a hand card opens the live card detail.
        act(() => boardProps(screen).onInspect(boardProps(screen).vm.hand[0]));
        expect(screen.getByTestId('hazard-card-detail')).toBeTruthy();
        fireEvent.press(screen.getByTestId('hazard-card-detail'));
        expect(screen.queryByTestId('hazard-card-detail')).toBeNull();
        // confirm: the board's CONFIRM resolves the round.
        fireEvent.press(screen.getByTestId('hazard-play-button'));
        expect(screen.getByTestId('hazard-puzzle-outcome')).toBeTruthy();
    });

    it('has no tap-button view: the resolve reads CONFIRM and no PLAY, BIN, POWER or RETURN button remains (A23)', () => {
        const { screen } = openHardRisk();
        expect(screen.getByText('CONFIRM')).toBeTruthy();
        for (const word of ['PLAY', 'BIN', 'RETURN', 'APPLY']) expect(screen.queryByText(word)).toBeNull();
        expect(screen.queryByText(/^POWER/)).toBeNull();
        expect(screen.queryAllByTestId(/^hazard-puzzle-(hand|staged|power|apply|return|bin|stage|confirm)/)).toHaveLength(0);
        // Staging shows only the live board's own per-card APPLY.
        act(() => boardProps(screen).onStage('c1'));
        expect(screen.getAllByText('APPLY')).toHaveLength(1);
        expect(screen.getByTestId('hazard-apply-c1')).toBeTruthy();
    });

    it('when the clock runs out, confirms the board as it stands and pays the outcome', () => {
        const { screen, store } = openHardRisk();
        const before = store.getState().player;
        act(() => boardProps(screen).onStage('c1'));
        act(() => {
            jest.advanceTimersByTime(59 * HAZARD_PUZZLE_TICK_MS);
        });
        expect(screen.queryByTestId('hazard-puzzle-outcome')).toBeNull();
        expect(screen.getByTestId('hazard-puzzle-clock').props.children).toBe('0:01');
        act(() => {
            jest.advanceTimersByTime(HAZARD_PUZZLE_TICK_MS);
        });
        expect(screen.getByTestId('hazard-puzzle-outcome-headline').props.children).toBe('TIME RAN OUT');
        const after = store.getState().player;
        expect(after.experience).toBeGreaterThan(before.experience);
        expect(after.health).toBeLessThan(before.health);
        // The board is locked: no more clock and no second claim.
        act(() => {
            jest.advanceTimersByTime(30 * HAZARD_PUZZLE_TICK_MS);
        });
        expect(store.getState().player.experience).toBe(after.experience);
    });

    it('after a timed-out board and CLAIM, the next board still times out', () => {
        const { screen, store } = openHardRisk();
        act(() => {
            jest.advanceTimersByTime(60 * HAZARD_PUZZLE_TICK_MS);
        });
        expect(screen.getByTestId('hazard-puzzle-outcome-headline').props.children).toBe('TIME RAN OUT');
        fireEvent.press(screen.getByTestId('hazard-puzzle-done'));
        fireEvent.press(screen.getByTestId('hazard-puzzle-pick-demo-undercroft-hard'));
        fireEvent.press(screen.getByTestId('hazard-route-risk'));
        expect(screen.getByTestId('hazard-dice-roll')).toBeTruthy();
        settleRoll();
        expect(screen.getByTestId('hazard-puzzle-clock').props.children).toBe('1:00');
        const xp = store.getState().player.experience;
        act(() => {
            jest.advanceTimersByTime(60 * HAZARD_PUZZLE_TICK_MS);
        });
        expect(screen.getByTestId('hazard-puzzle-outcome-headline').props.children).toBe('TIME RAN OUT');
        expect(store.getState().player.experience).toBeGreaterThan(xp);
    });

    it('a manual CONFIRM resolves at once, without waiting for the clock', () => {
        const { screen } = openHardRisk();
        fireEvent.press(screen.getByTestId('hazard-play-button'));
        expect(screen.getByTestId('hazard-puzzle-outcome-headline').props.children).toBe('FELL SHORT');
        fireEvent.press(screen.getByTestId('hazard-puzzle-done'));
        expect(screen.getByTestId('hazard-puzzle-list')).toBeTruthy();
    });

    it('plays the live roll onto the layout\'s dice faces, and the clock waits for it (HP3a A1)', () => {
        const { screen } = openHardRisk({ heart: 1, body: 1, mind: 1 }, false);
        const roll = screen.getByTestId('hazard-dice-roll');
        expect(roll).toBeTruthy();
        expect(within(roll).getByText('RISK ROUTE')).toBeTruthy();
        // The overlay rolls the layout's own faces, in layout order, and the board under it holds the same dice.
        const layout = getHazardPuzzleLayout('demo-undercroft-hard');
        expect(rolledFaces(screen)).toEqual([...layout.dice]);
        expect(boardProps(screen).vm.dice.map((d) => d.kind)).toEqual([...layout.dice]);
        expect(screen.getAllByTestId(/^hazard-die-d\d+$/)).toHaveLength(layout.dice.length);
        // The clock holds while the roll plays.
        act(() => {
            jest.advanceTimersByTime(DICE_ROLL_OVERLAY_MS - 1);
        });
        expect(screen.getByTestId('hazard-dice-roll')).toBeTruthy();
        expect(screen.getByTestId('hazard-puzzle-clock').props.children).toBe('1:00');
        // The roll settles; only then does the clock start counting.
        act(() => {
            jest.advanceTimersByTime(1);
        });
        expect(screen.queryByTestId('hazard-dice-roll')).toBeNull();
        expect(screen.getByTestId('hazard-puzzle-clock').props.children).toBe('1:00');
        act(() => {
            jest.advanceTimersByTime(HAZARD_PUZZLE_TICK_MS);
        });
        expect(screen.getByTestId('hazard-puzzle-clock').props.children).toBe('0:59');
    });

    it('the roll lands on the faces the stat unlocks add (HP3a A1)', () => {
        // The easy demo's Mind of 3 adds a die.
        const stats = { heart: 1, body: 1, mind: 3 };
        const { screen } = openDemo('demo-cliff-easy', 'safe', stats, false);
        const layout = getHazardPuzzleLayout('demo-cliff-easy');
        const session = createHazardPuzzleSession(layout, 'safe', activeHazardPuzzleUnlocks(layout, stats));
        expect(session.board.dice.length).toBe(layout.dice.length + 1);
        expect(rolledFaces(screen)).toEqual(session.board.dice.map((d) => d.kind));
    });

    it('a DRAW brings the reserve into the hand in reserve order, with the live hand entry, reading no RNG (HP3a A2)', () => {
        const random = jest.spyOn(Math, 'random');
        const { screen } = openHardRisk();
        const before = boardProps(screen).vm.hand.map((c) => c.uid);
        act(() => boardProps(screen).onStage('c1'));
        act(() => boardProps(screen).onPower('c1', 'd4'));
        act(() => boardProps(screen).onApply('c1'));
        const hand = boardProps(screen).vm.hand;
        const drawn = hand.filter((c) => !before.includes(c.uid));
        expect(drawn.length).toBeGreaterThan(0);
        // The reserve's own order: the layout's reserve list, from the top.
        const reserve = getHazardPuzzleLayout('demo-undercroft-hard').reserve;
        expect(drawn.map((c) => c.cardId)).toEqual(reserve.slice(0, drawn.length));
        // Each drawn card mounts with the live board's hand-entry animation.
        for (const card of drawn) {
            expect(screen.getByTestId(`hazard-hand-${card.uid}`).props.entering).toBeDefined();
        }
        expect(random).not.toHaveBeenCalled();
        random.mockRestore();
    });

    it('the board\'s result equals the engine\'s replay of the same moves (HP3a A4)', () => {
        const { screen } = openHardRisk();
        const moves: HazardPuzzleMove[] = [
            { type: 'stage', uid: 'c1' },
            { type: 'power', uid: 'c1', dieId: 'd4' },
            { type: 'apply', uid: 'c1' },
            { type: 'stage', uid: 'c2' },
        ];
        for (const m of moves) {
            act(() => {
                const p = boardProps(screen);
                if (m.type === 'stage') p.onStage(m.uid);
                else if (m.type === 'power') p.onPower(m.uid, m.dieId);
                else if (m.type === 'apply') p.onApply(m.uid);
                else p.onUnstage(m.uid);
            });
        }
        const layout = getHazardPuzzleLayout('demo-undercroft-hard');
        const replay = playHazardPuzzleMoves(createHazardPuzzleSession(layout, 'risk', []), moves);
        const vm = boardProps(screen).vm;
        expect(vm.hand.map((c) => c.uid)).toEqual(replay.board.hand.map((e) => e.uid));
        expect(vm.play.map((c) => c.uid)).toEqual(replay.board.play.map((e) => e.uid));
        expect(vm.dice.map((d) => d.id)).toEqual(replay.board.dice.map((d) => d.id));
        fireEvent.press(screen.getByTestId('hazard-play-button'));
        const result = confirmHazardPuzzle(replay).result;
        expect(result).not.toBeNull();
        expect(screen.getByTestId('hazard-puzzle-outcome-headline').props.children).toBe(
            result!.cleared ? 'CLEARED' : 'FELL SHORT',
        );
    });

    it('opens straight on a demo and route from the deep link, and auto-confirm shows the outcome', () => {
        const { tree } = withAllProviders(
            <HazardPuzzleDemo initialId="demo-cliff-easy" initialRoute="safe" autoConfirm />,
        );
        const screen = render(tree);
        expect(screen.getByTestId('hazard-board')).toBeTruthy();
        expect(screen.getByTestId('hazard-puzzle-outcome')).toBeTruthy();
    });
});

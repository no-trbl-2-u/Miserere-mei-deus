/**
 * CombatBoard — card names in the hand fan.
 *
 * At 375x812 a five-card hand overlaps: every card but the last is covered by
 * its right-hand neighbour. One card face, everywhere: a name keeps ONE line
 * and is never capped to the visible sliver; a covered card's name runs on
 * under its neighbour, and a tap reads the card whole. (This reverses the
 * earlier "wrap inside the sliver" cap, by T's call, 2026-10-13.)
 *
 * What this suite pins:
 *   1. `NAME_BAND_LEFT_CHROME` equals the four styles it claims to sum, read
 *      off the SHIPPED stylesheet (`useCombatBoardStyles`) — not re-typed here.
 *   2. Every hand card's name is one line with no width cap.
 *   3. Non-hand faces (staged, reward offer, detail overlay) are one line and
 *      uncapped too.
 *   4. The fan carries no tap hint, so nothing sits in the strip the
 *      FREE corner pills overhang; the dock keeps room for that overhang
 *      above the cards; the staged hint fits its one line.
 *   5. Tapping a hand card reaches `onInspect`.
 *   6. At 375 a five-card fan shows the start of every covered card's name
 *      (the full-width band, BT2b A6).
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render, renderHook, screen } from '@testing-library/react-native';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { initializeCombatEncounter, rollEncounterDice } from '@mechanics';
import {
    CombatBoard, CombatCardFace, handFanLayout,
    NAME_BAND_LEFT_CHROME, useCombatBoardStyles,
    HAND_CARD_H, HAND_CARD_W, HAND_FAN_PAD_BOTTOM, HAND_PILL_OVERHANG,
    type DragController,
} from '@/components/combat/encounter/CombatBoard';
import { buildCombatViewModel, type CombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { createMockEncounterEnemy } from '@/state/mocks/combat.mock';
import { withAllProviders } from '@/test-utils/withAllProviders';

/** A four-card hand off the grey office (the whole card library). The name
 *  cap is fan geometry, not name length. */
const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike'];
/** The phone viewport the fan is measured at. */
const PHONE = { width: 375, height: 812, scale: 3, fontScale: 1 };
const INSETS = { top: 47, bottom: 34, left: 0, right: 0 };

// Same pin as the sibling suites: `useWindowDimensions` is read off the module
// object at call time, so overriding the export pins the board to the phone.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RN = require('react-native') as Record<string, unknown>;
const realUseWindowDimensions = RN.useWindowDimensions;
beforeAll(() => {
    Object.defineProperty(RN, 'useWindowDimensions', { configurable: true, value: () => PHONE });
});
afterAll(() => {
    Object.defineProperty(RN, 'useWindowDimensions', { configurable: true, value: realUseWindowDimensions });
});

const noopDrag = (): DragController =>
    ({ begin: () => undefined, end: () => undefined, active: null, x: { value: 0 }, y: { value: 0 } } as unknown as DragController);

const boardCallbacks = () => ({
    onApply: jest.fn(), onStage: jest.fn(), onUnstage: jest.fn(), onDiscard: jest.fn(),
    onSignature: jest.fn(), onEndPhase: jest.fn(), onInspect: jest.fn(),
});

function freshVM(): { store: ReturnType<typeof withAllProviders>['store']; vm: CombatViewModel } {
    const { store } = withAllProviders(<></>);
    const base = store.getState().player;
    const player = { ...base, knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 129, maxHealth: 200 };
    let s = initializeCombatEncounter(player, createMockEncounterEnemy(), undefined, 16);
    s = rollEncounterDice(s).state;
    return { store, vm: buildCombatViewModel(s) };
}

type Rendered = { vm: CombatViewModel; cbs: ReturnType<typeof boardCallbacks> };

/** Render the board with whatever `stagedUids` the caller derives from the hand. */
function renderBoardWith(stage: (vm: CombatViewModel) => string[], cbs = boardCallbacks()): Rendered {
    const { store, vm } = freshVM();
    const { tree } = withAllProviders(
        <SafeAreaInsetsContext.Provider value={INSETS}>
            <CombatBoard vm={vm} drag={noopDrag()} stagedUids={stage(vm)} {...cbs} />
        </SafeAreaInsetsContext.Provider>,
        { store },
    );
    render(tree);
    return { vm, cbs };
}

/** The fan as the player first meets it: nothing staged, every name occluded. */
const renderBoard = (cbs = boardCallbacks()): Rendered => renderBoardWith(() => [], cbs);
/** One card lifted out of the fan and un-died — the staged hint's own branch. */
const renderBoardStaged = (cbs = boardCallbacks()): Rendered =>
    renderBoardWith((vm) => [vm.hand[0]!.uid], cbs);

/** Flatten a node's style down to a plain record. */
const flatten = (style: unknown) => StyleSheet.flatten(style as never) as Record<string, number | string>;

// ── 1. The derived constant ─────────────────────────────────────────────────

describe('NAME_BAND_LEFT_CHROME is derived, not guessed', () => {
    it('equals the four SHIPPED styles it claims to sum', () => {
        // Read off the stylesheet the board actually renders with, never
        // re-typed here: a literal re-sum is a tautology (17.5 === 1.5+6+5+5
        // holds whatever the styles do), and that is exactly how this
        // constant could drift while the gate stayed green.
        const { result } = renderHook(() => useCombatBoardStyles());
        const s = result.current;
        const parts = [
            s.faceCard.borderWidth,          // card face's own left edge
            s.plateBand.paddingHorizontal,   // the band's left half
            s.plateRaritySpacer.width,       // the 5pt rarity spacer
            s.plateBand.gap,                 // spacer -> text
        ];
        // A renamed or dropped key must fail loudly here rather than turn the
        // sum into NaN and take the assertion below down with an unreadable
        // message.
        for (const part of parts) expect(typeof part).toBe('number');
        expect(NAME_BAND_LEFT_CHROME).toBe(parts.reduce((a, b) => (a as number) + (b as number), 0));
    });
});

// ── 2. The rendered fan ─────────────────────────────────────────────────────

describe('the hand fan prints every name on one uncapped line', () => {
    it('the fixture fan overlaps at the phone width (non-vacuity)', () => {
        const { vm } = renderBoard();
        expect(handFanLayout(PHONE.width, vm.hand.length).overlap).toBeGreaterThan(0);
    });

    it('a five-card fan at 375 shows the start of every covered name (A6)', () => {
        // A covered card shows `step` points; its name band's chrome eats the
        // first NAME_BAND_LEFT_CHROME of them. What is left must hold the
        // start of a name: about three of the band's 13pt gothic capitals.
        const { step } = handFanLayout(PHONE.width, 5);
        expect(step - NAME_BAND_LEFT_CHROME).toBeGreaterThanOrEqual(30);
    });

    it('a five-card fan at 375 keeps the outer card’s FREE pill on screen', () => {
        // The fan's left edge, less how far the outer card's top-left corner
        // swings out under its tilt (rotate tilt * 3deg about the card's
        // centre, tilt -2 at five cards), less the pill's 6pt overhang.
        const { band, step } = handFanLayout(PHONE.width, 5);
        const fanW = HAND_CARD_W + 4 * step;
        const left = (PHONE.width - band) / 2 + (band - fanW) / 2;
        const theta = (6 * Math.PI) / 180;
        const swing = (HAND_CARD_H / 2) * Math.sin(theta) - (HAND_CARD_W / 2) * (1 - Math.cos(theta));
        expect(left - swing - 6).toBeGreaterThanOrEqual(0);
    });

    it('every hand card, covered or not, keeps one line and no width cap', () => {
        const { vm } = renderBoard();
        const names = screen.getAllByTestId('combat-card-face-name');
        expect(names.length).toBe(vm.hand.length);
        for (const n of names) {
            expect(n.props.numberOfLines).toBe(1);
            expect(flatten(n.props.style).maxWidth).toBeUndefined();
            expect(textOf(n).length).toBeGreaterThan(0);
        }
    });
});

// ── 3. The other face sizes ─────────────────────────────────────────────────

describe('CombatCardFace prints one uncapped name line on every face', () => {
    it('staged, reward offer and detail faces alike', () => {
        const { vm } = freshVM();
        const card = vm.hand[0]!;
        for (const [w, h, large] of [[92, 135, false], [100, 150, false], [208, 305, true]] as const) {
            const { unmount } = render(withAllProviders(
                <CombatCardFace card={card} width={w} height={h} large={large} />,
            ).tree);
            const name = screen.getByTestId('combat-card-face-name');
            expect(name.props.numberOfLines).toBe(1);
            expect(flatten(name.props.style).maxWidth).toBeUndefined();
            unmount();
        }
    });
});

// ── 6. The escape hatch ─────────────────────────────────────────────────────

/** The text a `<Text>` node actually renders, flattened out of its children. */
const textOf = (node: { props: { children?: unknown } }): string => {
    const walk = (c: unknown): string =>
        Array.isArray(c) ? c.map(walk).join('')
            : typeof c === 'string' || typeof c === 'number' ? String(c)
                : '';
    return walk(node.props.children);
};

/**
 * One `numberOfLines={1}` line of `stageHint` copy, in characters.
 *
 * The dock is the full 375pt viewport; `stageHint` is 12pt serif italic,
 * whose average uppercase-and-lowercase advance measured at 375x812 is
 * ~5.6pt, so a line holds ~63 glyphs before React
 * Native silently drops its TAIL (`ellipsizeMode` defaults to 'tail'). 56
 * is that with a margin for the wider glyphs. This is a legibility floor,
 * not a copy freeze — any rewrite that fits stays green.
 */
const ONE_LINE_BUDGET = 56;

describe('tap-to-read — the fan carries no hint, and a tap still reads the card', () => {
    it('renders no tap hint over the fan (BT2b A8)', () => {
        const { vm } = renderBoard();
        // Non-vacuity: a covered card exists, which is when the old hint showed.
        expect(vm.hand.length).toBeGreaterThan(1);
        expect(screen.queryByTestId('combat-tap-hint')).toBeNull();
        expect(screen.queryByText(/tap .*card.* to read/i)).toBeNull();
    });

    it('the hand dock keeps the FREE pill overhang above the card tops, inside its clip', () => {
        // The pill straddles each card's top edge; the dock clips. The room
        // above the cards is the dock less the card and the fan's bottom pad,
        // and it must hold the pill's whole overhang, read off the SHIPPED
        // sheet. Nothing else is drawn in that strip.
        const { result } = renderHook(() => useCombatBoardStyles());
        const sheet = result.current;
        const overhang = -(sheet.freePill.top as number);
        expect(overhang).toBeGreaterThan(0);
        expect(HAND_PILL_OVERHANG).toBeGreaterThanOrEqual(overhang);
        expect(sheet.dock.overflow).toBe('hidden');
        expect(sheet.fan.paddingBottom).toBe(HAND_FAN_PAD_BOTTOM);
        const roomAbove = (sheet.dock.height as number) - HAND_FAN_PAD_BOTTOM - HAND_CARD_H;
        expect(roomAbove).toBeGreaterThanOrEqual(overhang);
    });

    it('the staged hint fits the one line it is given', () => {
        renderBoardStaged();
        const node = screen.getByTestId('combat-stage-hint');
        expect(node.props.numberOfLines).toBe(1);
        expect(textOf(node).length).toBeLessThanOrEqual(ONE_LINE_BUDGET);
    });

    it('tapping a hand card reaches onInspect', async () => {
        // The hatch the two hints advertise. It is a gesture, not an onPress,
        // so `fireEvent.press` never reaches it — driving the real
        // `Gesture.Exclusive(pan, tap)` through its registered test id is the
        // only way to assert the player's tap actually opens the card.
        const { vm, cbs } = renderBoard();
        const card = vm.hand[0]!;
        fireGestureHandler(getByGestureTestId(`combat-card-tap-hand-${card.uid}`), [
            { state: State.BEGAN }, { state: State.ACTIVE }, { state: State.END },
        ]);
        // `runOnJS` hands the call to the JS thread via `queueMicrotask`
        // (react-native-worklets), so it lands after a flush, not inline.
        await act(async () => { await Promise.resolve(); });
        expect(cbs.onInspect).toHaveBeenCalledTimes(1);
        expect((cbs.onInspect.mock.calls[0] as [{ uid: string }])[0].uid).toBe(card.uid);
    });

    it('every hand card still announces the tap hatch to a screen reader', () => {
        const { vm } = renderBoard();
        const first = vm.hand[0]!;
        const node = screen.getByTestId(`combat-hand-${first.uid}`);
        expect(String(node.props.accessibilityHint)).toMatch(/tap to read/i);
    });
});

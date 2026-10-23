/**
 * CombatBoard — hand-fan and momentum-readout geometry at the phone and
 * desktop viewports.
 *
 *  - No corner chrome sits beside the hand (the avatar and END live in the
 *    footer dock), so the fan always lays out in the full board band and
 *    a five-card phone hand keeps a name-wide peek, never the 28pt sliver.
 *  - The rendered fan lands where the reference board-band layout puts it,
 *    inside the viewport.
 *  - The ⓘ tap mark sits on the readout's dark backing plate (bare, it reads
 *    ~1.5:1 on bright arena floor art), and a mirrored gutter keeps the
 *    'no momentum' readout centred.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { rollEncounterDice } from '@mechanics';
import {
    CombatBoard, handFanLayout,
    HAND_CARD_W, HAND_FAN_MIN_STEP, HAND_FAN_BOARD_EDGE, HAND_FAN_GAP,
    CHIP_INFO_MARK_W, CHIP_INFO_MARK_GAP,
    type DragController,
} from '@/components/combat/encounter/CombatBoard';
import { buildCombatViewModel, type CombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

// A four-card hand off the grey office (the whole card library).
const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike'];
/** The capture's primary viewport — the one the fan collapsed at. */
const PHONE = { width: 375, height: 812, scale: 3, fontScale: 1 };
/** The capture's second viewport — a fix for one must not cost the other. */
const DESKTOP_W = 1280;
const INSETS = { top: 47, bottom: 34, left: 0, right: 0 };

// Same pin as CombatBoard.S1-board: `useWindowDimensions` is read off the
// module object at call time, so overriding the export pins the board to the
// phone viewport without mocking all of react-native.
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
    const { store, combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 129, maxHealth: 200 }, seed: 16 });
    let s = combat;
    s = rollEncounterDice(s).state;
    return { store, vm: buildCombatViewModel(s) };
}

function renderBoard(shape: (vm: CombatViewModel) => CombatViewModel = (v) => v): CombatViewModel {
    const { store, vm: base } = freshVM();
    const vm = shape(base);
    const { tree } = withAllProviders(
        <SafeAreaInsetsContext.Provider value={INSETS}>
            <CombatBoard vm={vm} drag={noopDrag()} stagedUids={[]} {...boardCallbacks()} />
        </SafeAreaInsetsContext.Provider>,
        { store },
    );
    render(tree);
    return vm;
}

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, number | string>;

/** The fan's total laid-out width for `n` cards at the given step. */
const fanWidth = (n: number, step: number) => (n < 1 ? 0 : HAND_CARD_W + step * (n - 1));

/**
 * Where the fan's cards actually land, given the fan box's own paddings.
 *
 * Inputs: viewport width, card count, and the box's left/right padding (the
 * fan is `justifyContent: 'center'`, so content wider than the box overflows
 * it symmetrically). Output: the step, the leading edge, the LAST card's
 * leading edge, and the fan's trailing edge — board coordinates.
 */
function fanEdges(screenW: number, n: number, padLeft: number, padRight: number): {
    step: number; left: number; lastLeft: number; right: number;
} {
    const { step } = handFanLayout(screenW, n);
    const left = padLeft + (screenW - padLeft - padRight - fanWidth(n, step)) / 2;
    return { step, left, lastLeft: left + step * (n - 1), right: left + fanWidth(n, step) };
}

/**
 * The reference fan — the edge-to-edge layout: the board band at
 * HAND_FAN_BOARD_EDGE insets, corner medallions floating above its ends.
 *
 * Inputs: viewport width and card count. Output: the same edges as `fanEdges`.
 * The live fan must be no worse than this on either edge.
 */
function referenceFanEdges(screenW: number, n: number): { step: number; left: number; lastLeft: number; right: number } {
    const band = screenW - HAND_FAN_BOARD_EDGE * 2;
    const step = n > 1
        ? Math.min(HAND_CARD_W - 16, Math.max(HAND_FAN_MIN_STEP, (band - HAND_CARD_W) / (n - 1)))
        : HAND_CARD_W;
    const left = HAND_FAN_BOARD_EDGE + (band - fanWidth(n, step)) / 2;
    return { step, left, lastLeft: left + step * (n - 1), right: left + fanWidth(n, step) };
}

/// ── The fan reads at the phone viewport ────────────────────────

describe('C11-R — the hand lays out across the full board band (D92)', () => {
    it('a five-card hand at 375 keeps a name-wide peek, not the sliver floor', () => {
        const { band, step } = handFanLayout(PHONE.width, 5);
        // No corner chrome sits beside the hand any more, so the fan always
        // takes the board band.
        expect(band).toBe(PHONE.width - HAND_FAN_BOARD_EDGE * 2);
        expect(step).toBeCloseTo(referenceFanEdges(PHONE.width, 5).step, 5);
        // At the floor a card shows two letters of its name, no art, and is a
        // 28pt drag target.
        expect(step).toBeGreaterThan(HAND_FAN_MIN_STEP * 1.5);
    });

    it('every hand size at 375 shows more than the sliver until the hand is enormous', () => {
        for (const n of [2, 3, 4, 5, 6, 7]) {
            expect(handFanLayout(PHONE.width, n).step).toBeGreaterThan(HAND_FAN_MIN_STEP);
        }
        // The floor still guards a hand no band can seat.
        expect(handFanLayout(PHONE.width, 12).step).toBe(HAND_FAN_MIN_STEP);
        for (const n of [1, 2, 5, 9, 12, 20]) {
            expect(handFanLayout(PHONE.width, n).step).toBeGreaterThanOrEqual(HAND_FAN_MIN_STEP);
        }
    });

    it('every hand size takes the same full band, phone and desktop alike', () => {
        for (const n of [1, 2, 3, 5, 8]) {
            expect(handFanLayout(PHONE.width, n).band).toBe(PHONE.width - HAND_FAN_BOARD_EDGE * 2);
            expect(handFanLayout(DESKTOP_W, n).band).toBe(DESKTOP_W - HAND_FAN_BOARD_EDGE * 2);
        }
    });

    it('a desktop hand sits side by side, so no card hides its paid column under a neighbour', () => {
        for (const n of [2, 3, 4, 5, 6]) {
            const { step, overlap } = handFanLayout(DESKTOP_W, n);
            expect(overlap).toBeLessThanOrEqual(0);
            expect(step).toBe(HAND_CARD_W + HAND_FAN_GAP);
        }
        // A phone has no such room: the five-card hand still overlaps.
        expect(handFanLayout(PHONE.width, 5).overlap).toBeGreaterThan(0);
    });
});

// ── The fan stays on the board ─────────────────────────────────────

describe('C11-R2 — the rendered fan lands inside the viewport', () => {
    it('lays the fan out as the reference board-band layout does, and on-board', () => {
        const vm = renderBoard();
        const n = vm.hand.length;
        expect(n).toBeGreaterThan(1);
        const fan = flat('combat-hand');
        expect(fan.paddingHorizontal).toBe(HAND_FAN_BOARD_EDGE);
        const laid = fanEdges(PHONE.width, n, HAND_FAN_BOARD_EDGE, HAND_FAN_BOARD_EDGE);
        const ref = referenceFanEdges(PHONE.width, n);
        expect(laid.left).toBeCloseTo(ref.left, 5);
        expect(laid.right).toBeLessThanOrEqual(PHONE.width);
        expect(laid.left).toBeGreaterThanOrEqual(0);
    });
});

// ── The tap mark is legible, the readout keeps its centre ───────────

describe('C19-R — the momentum tap mark carries its own backing plate', () => {
    /** Force the chip's empty state — the one the desktop capture shows. */
    const emptyChain = (vm: CombatViewModel): CombatViewModel => ({
        ...vm,
        momentumV2: { ...vm.momentumV2, color: null, length: 0, chain: [], next: null, broke: false, surged: false },
    });

    it('plates the mark exactly as the readout beside it is plated', () => {
        renderBoard(emptyChain);
        const mark = flat('combat-momentum-info-mark');
        const readout = flat('combat-momentum-empty');
        // Bare, the glyph sits on the arena floor art at ~1.5:1 and vanishes.
        expect(mark.backgroundColor).toBe(readout.backgroundColor);
        expect(mark.borderColor).toBe(readout.borderColor);
        expect(mark.borderWidth).toBe(readout.borderWidth);
        expect(Number(mark.borderWidth)).toBeGreaterThan(0);
    });

    it('mirrors the mark on the row’s leading edge so the readout stays centred', () => {
        renderBoard(emptyChain);
        const mark = flat('combat-momentum-info-mark');
        const gutter = flat('combat-momentum-info-gutter');
        expect(mark.width).toBe(CHIP_INFO_MARK_W);
        expect(mark.marginLeft).toBe(CHIP_INFO_MARK_GAP);
        // The gutter carries the mark's whole footprint, so the row's centre
        // line is still the readout's centre line.
        expect(gutter.width).toBe(Number(mark.width) + Number(mark.marginLeft));
    });

    it('still marks the chip as the tappable half of the pair', () => {
        renderBoard(emptyChain);
        expect(screen.getByTestId('combat-momentum-v2').props.accessibilityRole).toBe('button');
        expect(screen.getByTestId('combat-momentum-info-mark')).toBeTruthy();
    });
});

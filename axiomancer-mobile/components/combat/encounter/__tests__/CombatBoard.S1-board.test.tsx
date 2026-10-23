/**
 * CombatBoard — board chrome at the phone viewport.
 *
 *  - The hand fan lays out across the full board band (`handFanLayout`):
 *    the avatar and END live in the footer dock, not in the corners.
 *  - The board fits the viewport: the END consequence line is anchored inward
 *    (anchored LEFT of the button, its 140pt box would end off-screen) and the
 *    board clips at its own edge.
 *  - `MomentumChainChip` is tappable and carries a ⓘ mark.
 *  - `compactFree` prints a whole value, never a chopped slice such as '×4 '
 *    out of '×4 · 3t'.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { rollEncounterDice } from '@mechanics';
import {
    CombatBoard, compactFree, handFanLayout,
    HAND_CARD_W, HAND_FAN_BOARD_EDGE, HAND_FAN_MIN_STEP,
    type DragController,
} from '@/components/combat/encounter/CombatBoard';
import { buildCombatViewModel, type CombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

// A four-card hand off the grey office (the whole card library).
const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike'];
const PHONE = { width: 390, height: 844, scale: 3, fontScale: 1 };
const INSETS = { top: 47, bottom: 34, left: 0, right: 0 };

// Same pin as CombatBoard.playtest-2026-09-04: `useWindowDimensions` is read
// off the module object at call time, so overriding the export pins the board
// to the phone viewport without mocking all of react-native.
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

/** A DEAD TRAY (live dice, none of which can power any card in hand) is what
 *  makes END print its consequence line — the piece of board chrome most
 *  likely to reach past the screen's right edge. Every die reads HEART, every
 *  card BODY: no colour-law pairing exists. */
const withDeadTray = (vm: CombatViewModel): CombatViewModel => ({
    ...vm,
    dice: vm.dice.map((d) => ({ ...d, color: 'heart', face: 'mana' as const, spent: false, isX: false, draggable: true })),
    hand: vm.hand.map((c) => ({ ...c, stance: 'body' })),
});

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, unknown>;

/** The fan's total laid-out width for `n` cards at the given step. */
const fanWidth = (n: number, step: number) => (n < 1 ? 0 : HAND_CARD_W + step * (n - 1));

// ── The fan takes the full board band ──────────────────────────────

describe('S1-board-C11 — the hand fan lays out across the full board width (D92)', () => {
    it('insets the fan by the board edge only, the same on both sides', () => {
        renderBoard();
        const fan = flat('combat-hand');
        expect(fan.paddingHorizontal).toBe(HAND_FAN_BOARD_EDGE);
        expect(fan.paddingLeft).toBeUndefined();
        expect(fan.paddingRight).toBeUndefined();
    });

    it('a hand that fits the band stays inside it', () => {
        for (const n of [1, 2, 3, 4, 5, 6]) {
            const { band, step } = handFanLayout(PHONE.width, n);
            expect(band).toBe(PHONE.width - HAND_FAN_BOARD_EDGE * 2);
            expect(fanWidth(n, step)).toBeLessThanOrEqual(band + 1e-9);
        }
    });

    it('never tightens a card below the readable sliver, and never on a single card', () => {
        expect(handFanLayout(PHONE.width, 12).step).toBe(HAND_FAN_MIN_STEP);
        expect(handFanLayout(PHONE.width, 1).step).toBe(HAND_CARD_W);
        expect(handFanLayout(PHONE.width, 1).overlap).toBe(0);
        // A viewport narrower than one card still yields a usable band.
        expect(handFanLayout(100, 3).band).toBe(HAND_CARD_W);
    });
});

// ── The board fits the phone ───────────────────────────────────────────

describe('S1-board-C12 — nothing on the board runs past the viewport', () => {
    it('the board clips at its own edge', () => {
        renderBoard();
        expect(flat('combat-board').overflow).toBe('hidden');
    });

    it('the END consequence line is anchored inward, not off the right edge', () => {
        renderBoard(withDeadTray);
        expect(screen.getByTestId('combat-end-consequence')).toBeTruthy();
        const wrap = flat('combat-end-consequence-wrap');
        // Anchored to the END button's right edge: the box runs INTO the board.
        expect(wrap.right).toBe(0);
        expect(wrap.left).toBeUndefined();
        // Its own footprint (the dock's right inset 10 + width) still lands on-screen.
        expect(10 + (wrap.width as number)).toBeLessThanOrEqual(PHONE.width);
    });
});

// ── The tappable chip is the one that looks tappable ───────────────────

describe('S1-board-C19 — the momentum chip looks tappable', () => {
    it('the momentum chip is a button and carries a visible tap mark', () => {
        renderBoard();
        const chip = screen.getByTestId('combat-momentum-v2');
        expect(chip.props.accessibilityRole).toBe('button');
        expect(screen.getByTestId('combat-momentum-info-mark')).toBeTruthy();
    });
});

// ── A value cell shows a whole value ───────────────────────────────────

describe('S1-board-C32 — compactFree never prints a chopped fragment', () => {
    it('compacts the presenter’s applyEffect rail to its intensity', () => {
        expect(compactFree('×4 · 3t')).toBe('×4');
        expect(compactFree('×4 · 3t +')).toBe('×4');
        expect(compactFree('×1')).toBe('×1');
        expect(compactFree('mark ×1 (enemy)')).toBe('×1');
    });

    it('keeps the reads it already had', () => {
        expect(compactFree('i1 d1')).toBe('+1');
        expect(compactFree('3 rounds')).toBe('3r');
        expect(compactFree('2')).toBe('+2');
        expect(compactFree('+2 int')).toBe('+2');
        expect(compactFree(null)).toBe('');
    });

    it('keeps the unit on a percent intensity (A Plain Word’s VULNERABLE)', () => {
        expect(compactFree('+24%')).toBe('+24%');
        expect(compactFree('+24% · 1t')).toBe('+24%');
    });

    it('prints nothing rather than half a word', () => {
        expect(compactFree('mercy')).toBe('');
        expect(compactFree('timed')).toBe('');
        expect(compactFree('all DoTs')).toBe('all');
        // Every output is a whole thing: a derived value, or a whole word of
        // the input — never a slice through one, never a trailing space.
        for (const v of ['×4 · 3t', 'mercy', 'timed', 'spare a foe', 'all DoTs', '3 rounds']) {
            const out = compactFree(v);
            const derived = /^(?:[×+]\d+%?|\d+r)$/.test(out);
            const wholeWord = v.trim().split(/\s+/).includes(out);
            expect(out === '' || derived || wholeWord).toBe(true);
            expect(out).toBe(out.trim());
        }
    });
});

/**
 * CombatBoard — the footer dock (BT2b A3–A5).
 *
 * The bottom rail is the dock, left to right: the 48pt player avatar (tap
 * opens the pilgrim modal), the VITAE column (value / max with the piles at
 * its right, an 8pt fill bar, the phase ledger under the bar) and a wide END
 * button. No corner medallion floats over the hand any more: the avatar and
 * END both sit inside the dock. The VITAE bar turns blood below 25%.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { rollEncounterDice } from '@mechanics';
import { CombatBoard, type DragController } from '@/components/combat/encounter/CombatBoard';
import {
    DOCK_GAP, DOCK_PAD_H, DOCK_PAD_V, DOCK_VITAE_MAX_WIDTH, END_BTN_W, END_BTN_H, VITAE_BAR_H, VITAE_LOW_RATIO, dockMinHeight, vitaeBarFill,
} from '@/components/combat/encounter/CombatFooterDock';
import { PLAYER_AVATAR_SIZE } from '@/components/combat/encounter/CombatCombatantPane';
import { buildCombatViewModel, ledgerA11y, type CombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { currentPalette } from '@/theme/runtime';
import { withAllProviders } from '@/test-utils/withAllProviders';

const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike'];
const PHONE = { width: 375, height: 812, scale: 3, fontScale: 1 };
const INSETS = { top: 47, bottom: 34, left: 0, right: 0 };
const FIVE_PHASES: CombatViewModel['ledger'] = ['clear', 'pending', 'pending', 'pending', 'pending'];

// Same pin as the sibling suites: `useWindowDimensions` is read off the module
// object at call time, so overriding the export pins the viewport.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RN = require('react-native') as Record<string, unknown>;
const realUseWindowDimensions = RN.useWindowDimensions;
afterEach(() => {
    Object.defineProperty(RN, 'useWindowDimensions', { configurable: true, value: realUseWindowDimensions });
});

const noopDrag = (): DragController =>
    ({ begin: () => undefined, end: () => undefined, active: null, x: { value: 0 }, y: { value: 0 } } as unknown as DragController);

function renderBoard(opts: { shape?: (vm: CombatViewModel) => CombatViewModel; resolving?: boolean } = {}) {
    Object.defineProperty(RN, 'useWindowDimensions', { configurable: true, value: () => PHONE });
    const { store, combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: CARDS }, seed: 16 });
    let s = combat;
    s = rollEncounterDice(s).state;
    const base = { ...buildCombatViewModel(s), ledger: FIVE_PHASES };
    const vm = opts.shape ? opts.shape(base) : base;
    const cbs = { onEndPhase: jest.fn(), onPlayerInspect: jest.fn() };
    const { tree } = withAllProviders(
        <SafeAreaInsetsContext.Provider value={INSETS}>
            <CombatBoard
                vm={vm} drag={noopDrag()} stagedUids={[]} resolving={opts.resolving}
                onApply={jest.fn()} onStage={jest.fn()} onUnstage={jest.fn()} onDiscard={jest.fn()}
                onSignature={jest.fn()} onInspect={jest.fn()} {...cbs}
            />
        </SafeAreaInsetsContext.Provider>,
        { store },
    );
    render(tree);
    return { vm, cbs };
}

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, unknown>;

/** Every testID in the rendered tree, in document (left-to-right) order. */
function testIdOrder(): string[] {
    const ids: string[] = [];
    const walk = (node: unknown): void => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(walk); return; }
        const n = node as { props?: { testID?: string }; children?: unknown };
        if (n.props?.testID) ids.push(n.props.testID);
        walk(n.children);
    };
    walk(screen.toJSON());
    return ids;
}

const withHp = (hp: number, maxHp = 100) => (vm: CombatViewModel): CombatViewModel => ({
    ...vm, player: { ...vm.player, hp, maxHp, hpPct: hp / maxHp },
});

describe('A3 — no corner medallions over the hand', () => {
    it('the avatar and END both live inside the dock', () => {
        renderBoard();
        const dock = within(screen.getByTestId('combat-rail'));
        expect(dock.getByTestId('combat-player-medallion')).toBeTruthy();
        expect(dock.getByTestId('combat-end-phase')).toBeTruthy();
        // One of each on the board: nothing left in a corner.
        expect(screen.getAllByTestId('combat-player-medallion')).toHaveLength(1);
        expect(screen.getAllByTestId('combat-end-phase')).toHaveLength(1);
    });
});

describe('A4 — the footer dock', () => {
    it('reads avatar, VITAE column, END, left to right', () => {
        renderBoard();
        const ids = testIdOrder();
        const at = (id: string) => ids.indexOf(id);
        expect(at('combat-player-medallion')).toBeGreaterThan(at('combat-rail'));
        expect(at('combat-rail-vitae-col')).toBeGreaterThan(at('combat-player-medallion'));
        expect(at('combat-end-phase')).toBeGreaterThan(at('combat-rail-vitae-col'));
    });

    it('stacks the VITAE line, the fill bar and the phase ledger, in that order', () => {
        renderBoard();
        const ids = testIdOrder();
        const at = (id: string) => ids.indexOf(id);
        expect(at('combat-rail-vitae')).toBeLessThan(at('combat-rail-vitae-bar'));
        expect(at('combat-rail-vitae-bar')).toBeLessThan(at('combat-ledger'));
        const col = within(screen.getByTestId('combat-rail-vitae-col'));
        expect(col.getByTestId('combat-ledger')).toBeTruthy();
        // The ledger reads as one row of five marks.
        expect(flat('combat-ledger').flexDirection).toBe('row');
        expect(flat('combat-ledger').flexWrap).toBeUndefined();
        // The piles sit on the VITAE line, at its right.
        expect(col.getByLabelText(/^Deck \d+ cards, discard \d+$/)).toBeTruthy();
    });

    it('speaks the phase ledger as one line, run by run (CRITIQUE pass 85)', () => {
        renderBoard({ shape: (vm) => ({ ...vm, ledger: ['clear', 'overwhelmed', 'pending', 'pending', 'pending'] }) });
        const ledger = screen.getByTestId('combat-ledger');
        expect(ledger.props.accessible).toBe(true);
        expect(ledger.props.accessibilityLabel).toBe('Phases: 1 cleared, 2 overwhelmed, 3 to 5 ahead');
        // A pair joins with "and"; a lone phase stands alone; none is said so.
        expect(ledgerA11y(['clear', 'clear', 'overwhelmed', 'clear', 'pending'])).toBe('Phases: 1 and 2 cleared, 3 overwhelmed, 4 cleared, 5 ahead');
        expect(ledgerA11y([])).toBe('Phases: none');
    });

    it('caps the VITAE column on a wide window, never on a phone (CRITIQUE pass 85)', () => {
        renderBoard();
        const col = flat('combat-rail-vitae-col');
        // The column still fills what the avatar and END leave...
        expect(col.flex).toBe(1);
        // ...up to the cap, so at 1280 wide the bar no longer runs ~1075px and
        // the piles stay beside the VITAE figure.
        expect(col.maxWidth).toBe(DOCK_VITAE_MAX_WIDTH);
        // On phones (375 and a 430 large phone) the column is narrower than the
        // cap, so the phone dock is unchanged.
        const phoneColumn = (width: number) =>
            width - DOCK_PAD_H * 2 - DOCK_GAP * 2 - PLAYER_AVATAR_SIZE - END_BTN_W;
        expect(phoneColumn(PHONE.width)).toBeLessThan(DOCK_VITAE_MAX_WIDTH);
        expect(phoneColumn(430)).toBeLessThan(DOCK_VITAE_MAX_WIDTH);
        // END takes the room the capped column leaves, so it stays at the
        // dock's right edge on a wide window (CRITIQUE pass 87).
        expect(flat('combat-end-wrap').marginLeft).toBe('auto');
    });

    it('the avatar is a 48pt round button that opens the pilgrim modal', () => {
        const { cbs } = renderBoard();
        expect(PLAYER_AVATAR_SIZE).toBe(48);
        const avatar = screen.getByTestId('combat-player-medallion');
        const style = flat('combat-player-medallion');
        expect(style.width).toBe(PLAYER_AVATAR_SIZE);
        expect(style.height).toBe(PLAYER_AVATAR_SIZE);
        expect(avatar.props.accessibilityRole).toBe('button');
        fireEvent.press(avatar);
        expect(cbs.onPlayerInspect).toHaveBeenCalledTimes(1);
    });

    it('END is a wide thumb button that still ends the phase', () => {
        const { cbs } = renderBoard();
        const end = flat('combat-end-phase');
        expect(end.width).toBe(END_BTN_W);
        expect(end.height).toBe(END_BTN_H);
        expect(END_BTN_W).toBeGreaterThan(END_BTN_H * 2 - 1);
        expect(within(screen.getByTestId('combat-end-phase')).getByText('END')).toBeTruthy();
        expect(within(screen.getByTestId('combat-end-phase')).getByText('⧗')).toBeTruthy();
        fireEvent.press(screen.getByTestId('combat-end-phase'));
        expect(cbs.onEndPhase).toHaveBeenCalledTimes(1);
    });

    it('END dims and refuses while a phase resolves', () => {
        const { cbs } = renderBoard({ resolving: true });
        const end = screen.getByTestId('combat-end-phase');
        expect(end.props.accessibilityState).toEqual({ disabled: true });
        expect(flat('combat-end-phase').opacity).toBe(0.4);
        fireEvent.press(end);
        expect(cbs.onEndPhase).not.toHaveBeenCalled();
    });

    it('respects the bottom safe-area inset and grows rather than clips', () => {
        renderBoard();
        const dock = flat('combat-rail');
        expect(dock.paddingBottom).toBe(INSETS.bottom + DOCK_PAD_V);
        expect(dock.minHeight).toBe(dockMinHeight(INSETS.bottom));
        expect(dock.height).toBeUndefined();
    });
});

describe('A5 — the VITAE bar', () => {
    it('vitaeBarFill: width is hp / max, low strictly below a quarter', () => {
        expect(VITAE_LOW_RATIO).toBe(0.25);
        expect(vitaeBarFill(0, 100)).toEqual({ pct: 0, low: true });
        expect(vitaeBarFill(24, 100)).toEqual({ pct: 24, low: true });
        expect(vitaeBarFill(25, 100)).toEqual({ pct: 25, low: false });
        expect(vitaeBarFill(100, 100)).toEqual({ pct: 100, low: false });
        // Clamped, and safe against a zero maximum.
        expect(vitaeBarFill(130, 100).pct).toBe(100);
        expect(vitaeBarFill(5, 0).pct).toBe(100);
    });

    it.each<[number, string, 'blood' | 'heal']>([
        [0, '0%', 'blood'],
        [24, '24%', 'blood'],
        [25, '25%', 'heal'],
        [100, '100%', 'heal'],
    ])('at %i%% VITAE the fill is %s wide and %s', (hp, width, tone) => {
        renderBoard({ shape: withHp(hp) });
        const fill = flat('combat-rail-vitae-fill');
        expect(fill.width).toBe(width);
        expect(fill.backgroundColor).toBe(currentPalette()[tone]);
    });

    it('is an 8pt bar announced as VITAE', () => {
        const { vm } = renderBoard();
        expect(VITAE_BAR_H).toBe(8);
        expect(flat('combat-rail-vitae-bar').height).toBe(VITAE_BAR_H);
        expect(screen.getByTestId('combat-rail-vitae-bar').props.accessibilityLabel)
            .toBe(`VITAE ${vm.player.hp} of ${vm.player.maxHp}`);
    });
});

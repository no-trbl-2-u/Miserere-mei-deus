/**
 * CombatBoard — layout at 390x844 (iPhone-class portrait).
 *
 *  1. `adjustsFontSizeToFit` is a no-op on react-native-web, so the
 *     reward-draft mini face (100x147) does not depend on font-fit: under
 *     `NARROW_FACE_W` the ledger STACKS (keyword over value, full width) and
 *     every text line wraps to two lines with an explicit lineHeight, so the
 *     NAME and paid line read in full rather than as stubs ("C.. +.").
 *  2. The player VITAE readout stays on screen: the footer dock grows
 *     (minHeight = row + padding + bottom inset, paddingBottom = inset +
 *     padding) rather than sitting at a fixed height, and the readout never
 *     wraps.
 *  3. No `opacity` on a layout-animated node: FadeIn drives `opacity` on the
 *     animated hand-card wrapper, so the in-flight dim lives on a plain inner
 *     View (sharing the node makes Reanimated warn `[opacity] may be
 *     overwritten by a layout animation`).
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { rollEncounterDice } from '@mechanics';
import {
    CombatBoard, CombatCardFace, NARROW_FACE_W, type DragController,
} from '@/components/combat/encounter/CombatBoard';
import { DOCK_PAD_V, dockMinHeight } from '@/components/combat/encounter/CombatFooterDock';
import { buildCombatViewModel, type CombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

// A four-card hand off the grey office (the whole card library).
const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike'];
const PHONE = { width: 390, height: 844, scale: 3, fontScale: 1 };
const INSETS = { top: 47, bottom: 34, left: 0, right: 0 };

// `useWindowDimensions` is read off the react-native module object at call
// time (named import -> property access), so overriding the export pins the
// board to the 390x844 viewport without mocking the whole module.
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

function renderBoard() {
    const { store, vm } = freshVM();
    const { tree } = withAllProviders(
        <SafeAreaInsetsContext.Provider value={INSETS}>
            <CombatBoard vm={vm} drag={noopDrag()} stagedUids={[]} {...boardCallbacks()} />
        </SafeAreaInsetsContext.Provider>,
        { store },
    );
    render(tree);
    return vm;
}

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, unknown>;

// ── 2. The VITAE readout stays on screen ─────────────────────────────

describe('CombatBoard rail — player VITAE is fully visible at 390x844', () => {
    it('the rail grows with the bottom inset instead of clipping to a fixed line', () => {
        renderBoard();
        const rail = flat('combat-rail');
        expect(rail.minHeight).toBe(dockMinHeight(INSETS.bottom));
        expect(rail.paddingBottom).toBe(INSETS.bottom + DOCK_PAD_V);
        // No fixed height: the row may take a second line when the ledger wraps.
        expect(rail.height).toBeUndefined();
    });

    it('the VITAE readout never wraps and speaks the canon word', () => {
        const vm = renderBoard();
        // The readout is out of the accessibility tree, so the default
        // query (which skips hidden elements) no longer finds it.
        expect(screen.queryByTestId('combat-rail-vitae')).toBeNull();
        const hp = screen.getByTestId('combat-rail-vitae', { includeHiddenElements: true });
        expect(hp.props.numberOfLines).toBe(1);
        // The readout is hidden from the reader; the progressbar under it
        // speaks VITAE once, naming the value and the maximum after the
        // canon word.
        expect(hp.props.accessibilityLabel).toBeUndefined();
        expect(hp.props.accessibilityElementsHidden).toBe(true);
        expect(hp.props.importantForAccessibility).toBe('no-hide-descendants');
        expect(screen.getByTestId('combat-rail-vitae-bar').props.accessibilityLabel)
            .toBe(`VITAE ${vm.player.hp} of ${vm.player.maxHp}`);
        const style = StyleSheet.flatten(hp.props.style) as Record<string, unknown>;
        // A flex-shrinking Text would wrap "♥ 129" onto two lines.
        expect(style.flexShrink).toBe(0);
        expect(typeof style.lineHeight).toBe('number');
    });
});

// ── 3. No `opacity` on a layout-animated node ───────────────────────

describe('CombatBoard hand fan — the in-flight dim is not on the FadeIn node', () => {
    it('no hand card wrapper carries an opacity style', () => {
        const vm = renderBoard();
        expect(vm.hand.length).toBeGreaterThan(0);
        for (const card of vm.hand) {
            const style = flat(`combat-hand-${card.uid}`);
            expect(style).not.toHaveProperty('opacity');
        }
    });
});

// ── 1. The narrow face reads in full ────────────────────────────────

describe('CombatCardFace — the reward-draft mini face (100x147) is readable', () => {
    const { vm } = freshVM();
    const cards = vm.hand;
    const withPaid = cards.find((c) => c.face.keyword && (c.face.heroText || '').trim());

    it('the fixture carries a paid line to lay out', () => {
        expect(withPaid).toBeDefined();
        expect(NARROW_FACE_W).toBeGreaterThan(100);
        expect(NARROW_FACE_W).toBeLessThanOrEqual(120);
    });

    it('under NARROW_FACE_W the ledger still prints the whole PAID line, sized not font-fit', () => {
        render(withAllProviders(<CombatCardFace card={withPaid!} width={100} height={147} />).tree);
        expect(screen.getByTestId('combat-card-face-ledger')).toBeTruthy();
        expect(screen.queryByTestId('combat-card-face-ledger-stacked')).toBeNull();
        expect(screen.getByTestId('combat-card-face-paid-line').props.numberOfLines).toBe(3);
        expect(screen.getByTestId('combat-card-face-paid-line').props.accessibilityLabel).toBe(withPaid!.face.paidLine);
        expect(screen.getByTestId('combat-card-face-name').props.numberOfLines).toBe(1);
        for (const id of ['combat-card-face-name', 'combat-card-face-paid-line']) {
            const t = screen.getByTestId(id);
            expect(t.props.adjustsFontSizeToFit).toBeUndefined();
        }
        const name = StyleSheet.flatten(screen.getByTestId('combat-card-face-name').props.style) as Record<string, unknown>;
        expect(typeof name.lineHeight).toBe('number');
        // Full text present, not a stub.
        expect(screen.getByTestId('combat-card-face-name').props.children).toBe(withPaid!.name.toUpperCase());
    });

    it('at the hand width (120) the ledger is the same single row', () => {
        const strike = cards.find((c) => c.cardId === 'grey-strike');
        expect(strike).toBeDefined();
        render(withAllProviders(<CombatCardFace card={strike!} width={120} height={176} />).tree);
        expect(screen.getByTestId('combat-card-face-ledger')).toBeTruthy();
        expect(screen.queryByTestId('combat-card-face-ledger-stacked')).toBeNull();
    });
});

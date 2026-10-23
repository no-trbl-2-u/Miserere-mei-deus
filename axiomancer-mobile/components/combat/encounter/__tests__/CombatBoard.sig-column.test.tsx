/**
 * CombatBoard — the top-left column (BT2b A1 and A7).
 *
 *  A1. The foe's intent badge and status chips sit left-aligned under its
 *      name; the chips wrap left to right.
 *  A7. The conviction chip and signature runes start just under that intent
 *      block (the HUD's measured bottom plus `SIG_HUD_GAP`), still clamped so
 *      the last rune clears the dice tray by `SIG_TRAY_CLEARANCE`. Five runes
 *      fit at 375x812; on a shorter screen the clamp wins. The chip's
 *      CONVICTION caption is legible (9px or more) and scales with the
 *      system text size.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { rollEncounterDice } from '@mechanics';
import {
    CombatBoard, signatureColumnHeight, signatureColumnTop, useCombatBoardStyles,
    HAND_CARD_H, HAND_FAN_PAD_BOTTOM, HAND_PILL_OVERHANG,
    SIG_CONVICTION_CHIP_H, SIG_COLUMN_GAP, SIG_HUD_GAP, SIG_RUNE_SIZE, SIG_TRAY_CLEARANCE,
    type DragController,
} from '@/components/combat/encounter/CombatBoard';
import { dockMinHeight } from '@/components/combat/encounter/CombatFooterDock';
import {
    buildCombatViewModel, type CombatEffectChipVM, type CombatViewModel,
} from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike'];
const PHONE = { width: 375, height: 812, scale: 3, fontScale: 1 };

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

function renderBoard(shape: (vm: CombatViewModel) => CombatViewModel = (v) => v): CombatViewModel {
    const { store, combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: CARDS }, seed: 16 });
    let s = combat;
    s = rollEncounterDice(s).state;
    const vm = shape(buildCombatViewModel(s));
    const { tree } = withAllProviders(
        <CombatBoard
            vm={vm} drag={noopDrag()} stagedUids={[]}
            onApply={jest.fn()} onStage={jest.fn()} onUnstage={jest.fn()} onDiscard={jest.fn()}
            onSignature={jest.fn()} onEndPhase={jest.fn()} onInspect={jest.fn()}
        />,
        { store },
    );
    render(tree);
    return vm;
}

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, unknown>;

const chip = (effectId: string): CombatEffectChipVM => ({
    effectId, intensity: 2, duration: 3, gloss: null,
    glyph: { glyph: '*', color: 'rgb(200,60,60)', label: effectId.toUpperCase() } as CombatEffectChipVM['glyph'],
});

// ── A1 ──────────────────────────────────────────────────────────────────────

describe('A1 — the foe\'s intent reads top-left', () => {
    it('the under-bar block and the intent column align left', () => {
        renderBoard();
        expect(flat('combat-hud-under-bar').justifyContent).toBe('flex-start');
        expect(flat('combat-hud-intent').alignItems).toBe('flex-start');
    });

    it('the foe\'s status chips wrap left to right', () => {
        renderBoard((vm) => ({ ...vm, enemy: { ...vm.enemy, effects: [chip('a'), chip('b'), chip('c')] } }));
        const row = flat('combat-enemy-effects');
        expect(row.justifyContent).toBe('flex-start');
        expect(row.flexDirection).toBe('row');
        expect(row.flexWrap).toBe('wrap');
    });
});

// ── A7 ──────────────────────────────────────────────────────────────────────

/** The HUD's bottom edge at 375x812 with no safe-area inset, measured in the
 *  BT2b web build (`combat-hud`: name row, VITAE bar, intent block). */
const HUD_BOTTOM_812 = 143;
/** The dice row's own height (`diceRow.minHeight`). */
const TRAY_H = 74;
/** The tray's top edge at a given screen height: the screen less the footer
 *  dock (its minimum plus the 1pt top rule), the hand dock and the tray. At
 *  812 this is the 453 the web build measures. */
const trayTopAt = (screenH: number) =>
    screenH - (dockMinHeight(0) + 1) - (HAND_CARD_H + HAND_FAN_PAD_BOTTOM + HAND_PILL_OVERHANG) - TRAY_H;

describe('A7 — the signature column starts under the intent block', () => {
    it('the column height constants match the shipped stylesheet', () => {
        const { result } = renderHook(() => useCombatBoardStyles());
        const s = result.current;
        expect(s.sigRune.width).toBe(SIG_RUNE_SIZE);
        expect(s.sigRune.height).toBe(SIG_RUNE_SIZE);
        expect(s.sigColumn.gap).toBe(SIG_COLUMN_GAP);
        expect(s.diceRow.minHeight).toBe(TRAY_H);
        // The chip: border, padding, value line, caption margin and line.
        const chipH = 2 * (s.convictionChip.borderWidth as number) + 2 * (s.convictionChip.paddingVertical as number)
            + (s.convictionText.lineHeight as number) + (s.convictionCaption.marginTop as number) + (s.convictionCaption.lineHeight as number);
        expect(SIG_CONVICTION_CHIP_H).toBe(chipH);
        expect(signatureColumnHeight(5)).toBe(SIG_CONVICTION_CHIP_H + 5 * (SIG_RUNE_SIZE + SIG_COLUMN_GAP));
    });

    it('the CONVICTION caption is at least 9px and follows the system text size', () => {
        const { result } = renderHook(() => useCombatBoardStyles());
        expect(result.current.convictionCaption.fontSize as number).toBeGreaterThanOrEqual(9);
        renderBoard();
        const caption = screen.getByText('CONVICTION');
        expect(caption.props.allowFontScaling).not.toBe(false);
    });

    it('is undefined until the HUD, the tray and the column have all measured', () => {
        expect(signatureColumnTop(0, 453, 100)).toBeUndefined();
        expect(signatureColumnTop(143, 0, 100)).toBeUndefined();
        expect(signatureColumnTop(143, 453, 0)).toBeUndefined();
    });

    it('five runes fit between the intent block and the tray at 375x812', () => {
        const trayTop = trayTopAt(812);
        expect(trayTop).toBe(453);
        const h = signatureColumnHeight(5);
        const top = signatureColumnTop(HUD_BOTTOM_812, trayTop, h)!;
        // Anchored under the intent block, not clamped.
        expect(top).toBe(HUD_BOTTOM_812 + SIG_HUD_GAP);
        // And the last rune still clears the tray.
        expect(top + h).toBeLessThanOrEqual(trayTop - SIG_TRAY_CLEARANCE);
    });

    it('on a shorter screen the tray clamp wins and the column rises', () => {
        const trayTop = trayTopAt(667);
        const h = signatureColumnHeight(5);
        const top = signatureColumnTop(HUD_BOTTOM_812, trayTop, h)!;
        expect(top).toBeLessThan(HUD_BOTTOM_812 + SIG_HUD_GAP);
        expect(top + h).toBe(trayTop - SIG_TRAY_CLEARANCE);
        // Never above the board's top.
        expect(signatureColumnTop(HUD_BOTTOM_812, 120, h)).toBe(0);
    });

    it('the board anchors the column off the measured HUD', () => {
        renderBoard();
        act(() => {
            fireEvent(screen.getByTestId('combat-hud'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 375, height: 143 } } });
            fireEvent(screen.getByTestId('combat-tray-layer'), 'layout', { nativeEvent: { layout: { x: 0, y: 453, width: 375, height: 74 } } });
            fireEvent(screen.getByTestId('combat-signature-bar'), 'layout', { nativeEvent: { layout: { x: 6, y: 0, width: 44, height: 100 } } });
        });
        expect(flat('combat-signature-bar').top).toBe(143 + SIG_HUD_GAP);
    });
});

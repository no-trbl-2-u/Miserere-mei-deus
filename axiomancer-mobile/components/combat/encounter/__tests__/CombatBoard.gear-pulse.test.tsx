/**
 * CombatBoard — the worn gear shows itself (when it is mounted).
 *
 * The board does not mount the chips for now (T, 2026-11-01: SHOW_COMBAT_GEAR is
 * false); the pulse tests below drive `CombatGear` and `useGearFired` directly,
 * so restoring the mount is the flag and the first test. A worn piece whose
 * effect can fire has a glyph chip by the signature column. Each `equipment-fired` event in a transition lands on its piece's
 * chip (the chip's label counts the firings and its glyph pulses), and the
 * combat log reads the same event as a line.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { armorLibrary, GREY_ARMOR_ID, GREY_WEAPON_ID, weaponLibrary, type CombatEvent } from '@mechanics';
import { CombatGear, useGearFired } from '@/components/combat/encounter/CombatGear';
import {
    CombatBoard, SHOW_COMBAT_GEAR, type CombatBoardProps, type DragController,
} from '@/components/combat/encounter/CombatBoard';
import {
    buildCombatViewModel, selectCombatLogHistory, selectCombatLogLines,
} from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

/** The grey pair every new run wears, set on the fixture's player. */
const GREY_PAIR = {
    weapon: weaponLibrary.find((w) => w.id === GREY_WEAPON_ID)!,
    armor: armorLibrary.find((a) => a.id === GREY_ARMOR_ID)!,
    relics: [],
};
const INSETS = { top: 47, bottom: 34, left: 0, right: 0 };
const noopDrag = (): DragController =>
    ({ begin: () => undefined, end: () => undefined, active: null, x: { value: 0 }, y: { value: 0 } } as unknown as DragController);

function fired(itemId: string, itemName: string, slot: 'weapon' | 'armor', payoff: 'deal-bonus' | 'guard', amount: number): CombatEvent {
    return {
        kind: 'equipment-fired', itemId, itemName, slot,
        trigger: slot === 'weapon' ? 'first-card-deal' : 'first-guard', payoff, amount,
    };
}

function boardWith(fx?: CombatBoardProps['fx']) {
    const { combat, store } = startRealFight(REAL_FIGHT_FIXTURE, { seed: 16, player: { equipment: GREY_PAIR } });
    const vm = buildCombatViewModel(combat);
    const props: CombatBoardProps = {
        vm, drag: noopDrag(), stagedUids: [], fx,
        onApply: jest.fn(), onStage: jest.fn(), onUnstage: jest.fn(), onDiscard: jest.fn(),
        onSignature: jest.fn(), onEndPhase: jest.fn(), onInspect: jest.fn(),
    };
    const board = (p: CombatBoardProps) => withAllProviders(
        <SafeAreaInsetsContext.Provider value={INSETS}><CombatBoard {...p} /></SafeAreaInsetsContext.Provider>,
        { store },
    ).tree;
    // The chips alone, fed the same fx the board would feed them.
    const Chips = ({ fx: f }: { fx?: CombatBoardProps['fx'] }) => <CombatGear gear={vm.gear} fired={useGearFired(f)} />;
    const ui = (p: CombatBoardProps) => withAllProviders(<Chips fx={p.fx} />, { store }).tree;
    return { vm, props, ui, board, combat };
}

describe('the worn gear chips', () => {
    it('the board hides the chips for now, while vm.gear still carries the pair', () => {
        const { vm, props, board } = boardWith();
        expect(SHOW_COMBAT_GEAR).toBe(false);
        expect(vm.gear).toHaveLength(2);
        render(board(props));
        expect(screen.queryByTestId(`combat-gear-${GREY_WEAPON_ID}`)).toBeNull();
        expect(screen.queryByTestId(`combat-gear-${GREY_ARMOR_ID}`)).toBeNull();
    });

    it('the grey pair worn gives one chip each, unfired, with its effect in the label', () => {
        const { vm, props, ui } = boardWith();
        expect(vm.gear.map((g) => g.itemId)).toEqual([GREY_WEAPON_ID, GREY_ARMOR_ID]);
        render(ui(props));
        const weapon = screen.getByTestId(`combat-gear-${GREY_WEAPON_ID}`);
        expect(weapon.props.accessibilityLabel).toBe('Opening Blade: First DEAL +2 · Special: +2 Conviction. Fired 0 times this fight.');
        expect(screen.getByTestId(`combat-gear-${GREY_ARMOR_ID}`).props.accessibilityLabel)
            .toContain('Fired 0 times');
    });

    it('an equipment-fired event lands on its own piece and no other', () => {
        const { props, ui } = boardWith();
        const first = render(ui({ ...props, fx: { seq: 1, events: [] } }));
        first.rerender(ui({
            ...props,
            fx: { seq: 2, events: [fired(GREY_WEAPON_ID, 'Opening Blade', 'weapon', 'deal-bonus', 2)] },
        }));
        expect(screen.getByTestId(`combat-gear-${GREY_WEAPON_ID}`).props.accessibilityLabel).toContain('Fired 1 time this fight');
        expect(screen.getByTestId(`combat-gear-${GREY_ARMOR_ID}`).props.accessibilityLabel).toContain('Fired 0 times');

        first.rerender(ui({
            ...props,
            fx: { seq: 3, events: [
                fired(GREY_WEAPON_ID, 'Opening Blade', 'weapon', 'deal-bonus', 2),
                fired(GREY_ARMOR_ID, 'Bracing Coat', 'armor', 'guard', 2),
            ] },
        }));
        expect(screen.getByTestId(`combat-gear-${GREY_WEAPON_ID}`).props.accessibilityLabel).toContain('Fired 2 times');
        expect(screen.getByTestId(`combat-gear-${GREY_ARMOR_ID}`).props.accessibilityLabel).toContain('Fired 1 time this fight');
    });

    it('the same transition rendered twice counts once', () => {
        const { props, ui } = boardWith();
        const fx = { seq: 5, events: [fired(GREY_WEAPON_ID, 'Opening Blade', 'weapon', 'deal-bonus', 2)] };
        const r = render(ui({ ...props, fx }));
        r.rerender(ui({ ...props, fx: { ...fx } }));
        expect(screen.getByTestId(`combat-gear-${GREY_WEAPON_ID}`).props.accessibilityLabel).toContain('Fired 1 time this fight');
    });
});

describe('the log reads equipment-fired', () => {
    const event = fired(GREY_WEAPON_ID, 'Opening Blade', 'weapon', 'deal-bonus', 2);

    it('selectCombatLogLines gives a player-side line and no float', () => {
        const [line] = selectCombatLogLines([event]);
        expect(line).toMatchObject({ kind: 'equipment-fired', side: 'player', text: 'Opening Blade: +2 DEAL.', float: null });
    });

    it('the persistent history carries the line', () => {
        const { combat } = boardWith();
        const history = selectCombatLogHistory({ ...combat, log: [event] });
        expect(history.map((h) => h.text)).toEqual(['Opening Blade: +2 DEAL.']);
    });
});

describe('the tray says what a special does', () => {
    it('the grey pair worn: the weapon payload; no weapon: it only powers its card', () => {
        const { combat } = boardWith();
        expect(buildCombatViewModel(combat).specialGloss)
            .toBe("Your weapon's special: +2 Conviction when it powers a card.");
        const bare = buildCombatViewModel({ ...combat, equipmentDice: undefined });
        expect(bare.specialGloss).toBe('No weapon special worn: this face only powers its card.');
        expect(bare.gear.length).toBe(2);
    });
});

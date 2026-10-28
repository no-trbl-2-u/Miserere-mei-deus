/**
 * CombatBoard — the glossary a sighted player can reach (phase GL1).
 *
 * Starts from a real fight and touches each word the playtest found only in
 * aria-labels: the Conviction chip, a BOON, MANA, MISS, BANKED and GHOST die,
 * the X die, the piles, the phase ledger and the globals row's IN PLAY label.
 * The board hands a touch to `onGloss`; the panel renders it in the shared
 * plaque. A tap on a die still powers the staged card, a drag still drags, and
 * nothing opens over a live drag or a resolving phase.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { rollEncounterDice, SPECIAL_CONVICTION_DEFAULT } from '@mechanics';
import {
    CombatBoard, dieGlossTerms, type CombatBoardProps, type DragController,
} from '@/components/combat/encounter/CombatBoard';
import { CombatEncounterPanel } from '@/components/combat/encounter/CombatEncounterPanel';
import { buildCombatViewModel, type CombatDieVM, type CombatGlobalVM, type CombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { BOARD_GLOSSARY, MOMENTUM_GLOSS } from '@/state/combat/keywords';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { tapCombatDie } from '@/test-utils/tapCombatDie';
import { withAllProviders } from '@/test-utils/withAllProviders';
import { FONTS } from '@/theme/axm';

const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike', 'grey-ward'];
const INSETS = { top: 47, bottom: 34, left: 0, right: 0 };

const noopDrag = (active: unknown = null): DragController =>
    ({ begin: () => undefined, end: () => undefined, active, x: { value: 0 }, y: { value: 0 } } as unknown as DragController);

/** Fire the board's real long-press on a die (the jest stand-in for holding it). */
async function holdDie(dieId: string): Promise<void> {
    fireGestureHandler(getByGestureTestId(`combat-die-hold-${dieId}`), [
        { state: State.BEGAN }, { state: State.ACTIVE }, { state: State.END },
    ]);
    await act(async () => { await Promise.resolve(); });
}

/** A real fight's view model with a tray of one die per gloss target. */
function trayVm(): { vm: CombatViewModel; dice: Record<string, CombatDieVM> } {
    const { combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: CARDS }, seed: 16 });
    const base = buildCombatViewModel(rollEncounterDice(combat).state);
    const proto = base.dice[0];
    const mk = (id: string, over: Partial<CombatDieVM>): CombatDieVM => ({
        ...proto, id, spent: false, isX: false, draggable: true,
        reserve: undefined, pips: undefined, floating: undefined, cracked: undefined, ...over,
    });
    const dice = {
        boon: mk('g-boon', { face: 'special', color: 'heart' }),
        mana: mk('g-mana', { face: 'mana', color: 'body' }),
        wild: mk('g-wild', { face: 'mana', color: 'wild' }),
        miss: mk('g-miss', { face: 'miss', color: 'mind', draggable: false }),
        banked: mk('g-banked', { face: 'mana', color: 'heart', reserve: true, pips: 2 }),
        ghost: mk('g-ghost', { face: undefined, color: 'wild', floating: true }),
        xdie: mk('g-x', { color: 'x', isX: true, draggable: false }),
    };
    const globals: CombatGlobalVM[] = [{
        uid: 'g1', cardId: 'grey-word', name: 'Global One', turnsLabel: '⏳2', stanceColor: '#888', card: null, a11y: 'Global One',
    }];
    return { vm: { ...base, dice: Object.values(dice), globals }, dice };
}

function renderBoard(opts: { drag?: DragController; resolving?: boolean; stage?: number } = {}) {
    const { vm, dice } = trayVm();
    const { store } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: CARDS }, seed: 16 });
    const onGloss = jest.fn();
    const props: CombatBoardProps = {
        vm, drag: opts.drag ?? noopDrag(), stagedUids: opts.stage === undefined ? [] : [vm.hand[opts.stage].uid], resolving: opts.resolving,
        onApply: jest.fn(), onStage: jest.fn(), onUnstage: jest.fn(), onDiscard: jest.fn(),
        onSignature: jest.fn(), onEndPhase: jest.fn(), onInspect: jest.fn(), onGloss,
    };
    const { tree } = withAllProviders(
        <SafeAreaInsetsContext.Provider value={INSETS}><CombatBoard {...props} /></SafeAreaInsetsContext.Provider>,
        { store },
    );
    render(tree);
    return { vm, dice, onGloss };
}

describe('A3 — the Conviction chip', () => {
    it('opens CONVICTION with the live count; its label is unchanged and it is a button with a hint', () => {
        const { vm, onGloss } = renderBoard();
        const chip = screen.getByTestId('combat-conviction');
        expect(chip.props.accessibilityLabel).toBe(`${vm.conviction} conviction`);
        expect(chip.props.accessibilityRole).toBe('button');
        expect(chip.props.accessibilityHint).toMatch(/Conviction/);
        fireEvent.press(chip);
        expect(onGloss).toHaveBeenCalledWith(['conviction'], { conviction: vm.conviction });
    });

    it('prints the count in the open-zero face, so 0 never reads as 8 (critique pass 104)', () => {
        const { vm } = renderBoard();
        const count = screen.getByText(`◆ ${vm.conviction}`);
        expect(StyleSheet.flatten(count.props.style).fontFamily).toBe(FONTS.sans);
    });
});

describe('A4 — long-press a die to read it', () => {
    it('BOON opens its face with the gear payload', async () => {
        const { dice, onGloss } = renderBoard();
        await holdDie(dice.boon.id);
        const [ids, live] = onGloss.mock.calls[0] as [string[], { boon: number }];
        expect(ids).toEqual(['boon']);
        expect(live.boon).toBeGreaterThanOrEqual(SPECIAL_CONVICTION_DEFAULT);
    });

    it('MANA, MISS (not draggable), BANKED with its pips and GHOST each open their gloss', async () => {
        const { dice, onGloss } = renderBoard();
        await holdDie(dice.mana.id);
        expect(onGloss.mock.calls.at(-1)?.[0]).toEqual(['mana']);
        await holdDie(dice.miss.id);
        expect(onGloss.mock.calls.at(-1)?.[0]).toEqual(['miss']);
        await holdDie(dice.banked.id);
        expect(onGloss.mock.calls.at(-1)?.[0]).toEqual(['mana', 'banked']);
        expect((onGloss.mock.calls.at(-1)?.[1] as { pips: number }).pips).toBe(2);
        await holdDie(dice.ghost.id);
        expect(onGloss.mock.calls.at(-1)?.[0]).toEqual(['ghost']);
    });

    it('a tap on a die still powers the staged card and opens no gloss', async () => {
        // One card staged: the tap routes the die to it through the drop gate, as before.
        const { vm, dice, onGloss } = renderBoard({ stage: 0 });
        expect(screen.queryAllByTestId('combat-staged-die')).toHaveLength(0);
        await tapCombatDie(dice.wild.id);
        expect(screen.getAllByTestId('combat-staged-die')).toHaveLength(1);
        expect(onGloss).not.toHaveBeenCalled();
        expect(vm.hand.length).toBeGreaterThan(0);
    });

    it('a tap on the struck X die opens the X-die gloss', () => {
        const { dice, onGloss } = renderBoard();
        fireEvent.press(screen.getByTestId(`combat-die-x-${dice.xdie.id}`));
        expect(onGloss.mock.calls[0][0]).toEqual(['xdie', 'xvaries']);
    });

    it('maps a die to its terms: face, then BANKED, then GHOST', () => {
        expect(dieGlossTerms({ isX: false, face: 'special' })).toEqual(['boon']);
        expect(dieGlossTerms({ isX: false, face: 'mana', reserve: true })).toEqual(['mana', 'banked']);
        expect(dieGlossTerms({ isX: false, face: 'mana', floating: true })).toEqual(['mana', 'ghost']);
        expect(dieGlossTerms({ isX: false, face: 'miss', cracked: true })).toEqual(['miss']);
        expect(dieGlossTerms({ isX: false, floating: true })).toEqual(['ghost']);
        expect(dieGlossTerms({ isX: true })).toEqual(['xdie', 'xvaries']);
    });
});

describe('A5 — the footer dock', () => {
    it('the piles open DECK & DISCARD with the live counts', () => {
        const { vm, onGloss } = renderBoard();
        fireEvent.press(screen.getByTestId('combat-piles'));
        expect(onGloss).toHaveBeenCalledWith(['piles'], { deck: vm.deckCount, discard: vm.discardCount });
    });

    it('the phase ledger opens PHASE LEDGER with its tally', () => {
        const { vm, onGloss } = renderBoard();
        fireEvent.press(screen.getByTestId('combat-ledger'));
        const tally = { clear: 0, overwhelmed: 0, pending: 0 };
        for (const m of vm.ledger) tally[m] += 1;
        expect(onGloss).toHaveBeenCalledWith(['ledger'], { ledger: tally });
    });
});

describe('A6 — IN PLAY', () => {
    it('the label opens GLOBAL, and a global chip still reads its card', () => {
        const { onGloss } = renderBoard();
        fireEvent.press(screen.getByTestId('combat-globals-label'));
        expect(onGloss).toHaveBeenCalledWith(['global'], undefined);
        onGloss.mockClear();
        fireEvent.press(screen.getByTestId('combat-global-g1'));
        expect(onGloss).not.toHaveBeenCalled();
    });
});

describe('A9 — nothing opens over a drag or a resolving phase', () => {
    it('drops every touch while a drag is live', async () => {
        const { dice, onGloss } = renderBoard({ drag: noopDrag({ type: 'die', dieId: 'g-mana', die: {} }) });
        fireEvent.press(screen.getByTestId('combat-conviction'));
        fireEvent.press(screen.getByTestId('combat-piles'));
        fireEvent.press(screen.getByTestId('combat-ledger'));
        fireEvent.press(screen.getByTestId('combat-globals-label'));
        await holdDie(dice.mana.id);
        expect(onGloss).not.toHaveBeenCalled();
    });

    it('drops every touch while a phase resolves', async () => {
        const { dice, onGloss } = renderBoard({ resolving: true });
        fireEvent.press(screen.getByTestId('combat-conviction'));
        fireEvent.press(screen.getByTestId('combat-piles'));
        await holdDie(dice.boon.id);
        expect(onGloss).not.toHaveBeenCalled();
    });
});

describe('A3-A7, A9 — the panel shows each gloss in the shared plaque', () => {
    function mountPanel() {
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

    it('Conviction, the piles and the ledger open in the plaque and close on a backdrop tap', () => {
        jest.useFakeTimers();
        try {
            mountPanel();
            expect(screen.queryByTestId('combat-gloss')).toBeNull();

            fireEvent.press(screen.getByTestId('combat-conviction'));
            expect(screen.getByTestId('combat-gloss-title').props.children).toBe(BOARD_GLOSSARY.conviction.title);
            expect(screen.getByTestId('combat-gloss-def-0').props.children).toBe(BOARD_GLOSSARY.conviction.def);
            expect(screen.getByTestId('combat-gloss-live').props.children).toMatch(/^You hold ◆ \d+\.$/);
            fireEvent.press(screen.getByTestId('combat-gloss'));
            expect(screen.queryByTestId('combat-gloss')).toBeNull();

            fireEvent.press(screen.getByTestId('combat-piles'));
            expect(screen.getByTestId('combat-gloss-title').props.children).toBe('DECK & DISCARD');
            expect(screen.getByTestId('combat-gloss-live').props.children).toMatch(/^Deck \d+, discard \d+\.$/);
            fireEvent.press(screen.getByTestId('combat-gloss'));

            fireEvent.press(screen.getByTestId('combat-ledger'));
            expect(screen.getByTestId('combat-gloss-title').props.children).toBe('PHASE LEDGER');
            expect(screen.getByTestId('combat-gloss-live').props.children).toMatch(/cleared, \d+ overwhelmed, \d+ ahead\.$/);
        } finally {
            jest.useRealTimers();
        }
    });

    it('A7 — the momentum popup names MOMENTUM SURGE and the GHOST die', () => {
        jest.useFakeTimers();
        try {
            mountPanel();
            fireEvent.press(screen.getByTestId('combat-momentum-v2'));
            expect(screen.getByText(MOMENTUM_GLOSS.title)).toBeTruthy();
            expect(screen.getByTestId('combat-momentum-info-surge').props.children).toBe(MOMENTUM_GLOSS.surge);
            expect(MOMENTUM_GLOSS.surge).toMatch(/SURGES/);
            expect(MOMENTUM_GLOSS.surge).toMatch(/GHOST/);
        } finally {
            jest.useRealTimers();
        }
    });
});

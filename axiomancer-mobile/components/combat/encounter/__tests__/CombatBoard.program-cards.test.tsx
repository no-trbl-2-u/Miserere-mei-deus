/**
 * CombatBoard — program cards (Globals, Curses, SACRIFICE lines).
 *
 * The board half of the presenter test: a staged line the engine refuses
 * names the refusal on its APPLY ribbon and does not commit; an armed
 * "SACRIFICE any amount" line shows an amount stepper and commits the amount
 * chosen; a Global in play is listed and opens its card. Cards are found by
 * what they are, never by id.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
    cardLibrary, initializeCombatEncounter, rollEncounterDice, playCombatCard,
    type Card, type CombatEncounterState,
} from '@mechanics';
import { CombatBoard, type DragController } from '@/components/combat/encounter/CombatBoard';
import { buildCombatViewModel, type CombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { createMockEncounterEnemy } from '@/state/mocks/combat.mock';
import { withAllProviders } from '@/test-utils/withAllProviders';
import { tapCombatDie } from '@/test-utils/tapCombatDie';

const find = (pred: (c: Card) => boolean): Card => {
    const card = cardLibrary.find((c) => c.program && pred(c));
    if (!card) throw new Error('no library card matches');
    return card;
};
const SACRIFICE_FREE = find((c) => /^SACRIFICE \d+, DEAL/.test(c.program?.free?.text ?? ''));
const X_LINE = find((c) => /SACRIFICE any amount/.test(c.program?.paid?.text ?? ''));
const GLOBAL = find((c) => c.cardType === 'global');

const noopDrag = (): DragController =>
    ({ begin: () => undefined, end: () => undefined, active: null, x: { value: 0 }, y: { value: 0 } } as unknown as DragController);

const boardCallbacks = () => ({
    onApply: jest.fn(), onStage: jest.fn(), onUnstage: jest.fn(), onDiscard: jest.fn(),
    onSignature: jest.fn(), onEndPhase: jest.fn(), onInspect: jest.fn(),
});

function open(store: ReturnType<typeof withAllProviders>['store'], hand: string[], vitae: number): CombatEncounterState {
    const base = store.getState().player;
    const player = { ...base, baseStats: { heart: 5, body: 5, mind: 5 } };
    let s = initializeCombatEncounter(player, createMockEncounterEnemy(), [...hand, 'grey-strike', 'grey-ward', 'grey-word'], 9);
    s = rollEncounterDice(s).state;
    return {
        ...s,
        hand: hand.map((cardId, i) => ({ uid: `h${i}`, cardId })),
        player: { ...s.player, health: vitae },
        dice: [{ id: 'w', color: 'wild', state: 'available', temporary: false, face: 'mana' }],
        reserve: [],
    };
}

function mount(vm: CombatViewModel, staged: string[], store: ReturnType<typeof withAllProviders>['store']) {
    const cbs = boardCallbacks();
    const { tree } = withAllProviders(<CombatBoard vm={vm} drag={noopDrag()} stagedUids={staged} {...cbs} />, { store });
    render(tree);
    return cbs;
}

afterEach(() => { jest.clearAllMocks(); });

describe('CombatBoard — program cards', () => {
    it('a FREE line the engine refuses names the refusal and does not commit', () => {
        const { store } = withAllProviders(<></>);
        const vm = buildCombatViewModel(open(store, [SACRIFICE_FREE.id], 2));
        const cbs = mount(vm, ['h0'], store);
        const ribbon = screen.getByTestId('combat-apply-h0');
        expect(screen.getByText(/below 1 VITAE/)).toBeTruthy();
        fireEvent.press(ribbon);
        expect(cbs.onApply).not.toHaveBeenCalled();
    });

    it('an armed X line shows the amount stepper and commits the amount chosen', async () => {
        const { store } = withAllProviders(<></>);
        const vm = buildCombatViewModel(open(store, [X_LINE.id], 100));
        const cbs = mount(vm, ['h0'], store);
        expect(screen.queryByTestId('combat-x-h0')).toBeNull();
        await tapCombatDie('w');
        expect(screen.getByTestId('combat-x-value-h0').props.children).toBe('SACRIFICE 1');
        fireEvent.press(screen.getByTestId('combat-x-more-h0'));
        fireEvent.press(screen.getByTestId('combat-x-more-h0'));
        expect(screen.getByTestId('combat-x-value-h0').props.children).toBe('SACRIFICE 3');
        fireEvent.press(screen.getByTestId('combat-apply-h0'));
        expect(cbs.onApply).toHaveBeenCalledWith('h0', 'w', true, 3);
    });

    it('lists a Global in play and opens its card', () => {
        const { store } = withAllProviders(<></>);
        const s = playCombatCard(open(store, [GLOBAL.id], 100), { uid: 'h0' }, false).state;
        const cbs = mount(buildCombatViewModel(s), [], store);
        expect(screen.getByTestId('combat-globals')).toBeTruthy();
        expect(buildCombatViewModel(s).globals[0].a11y).not.toMatch(/copy/);
        fireEvent.press(screen.getByTestId(`combat-global-${s.program!.globals[0].uid}`));
        expect(cbs.onInspect).toHaveBeenCalledWith(expect.objectContaining({ cardId: GLOBAL.id }));
    });

    it('two copies of a Global in play render as two chips, keyed by instance', () => {
        const { store } = withAllProviders(<></>);
        let s = playCombatCard(open(store, [GLOBAL.id, GLOBAL.id], 100), { uid: 'h0' }, false).state;
        s = playCombatCard(s, { uid: 'h1' }, false).state;
        const uids = s.program!.globals.map((g) => g.uid);
        expect(uids).toHaveLength(2);
        expect(new Set(uids).size).toBe(2);
        // Each copy names itself, so a screen reader hears two different chips.
        const labels = buildCombatViewModel(s).globals.map((g) => g.a11y);
        expect(labels[0]).toMatch(/^[^,]+, copy 1 of 2, a Global in play /);
        expect(labels[1]).toMatch(/^[^,]+, copy 2 of 2, a Global in play /);
        // Restored in `finally`, so a failure here cannot leave console.error
        // muted for the rest of the file.
        const errors = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        try {
            mount(buildCombatViewModel(s), [], store);
            for (const uid of uids) expect(screen.getByTestId(`combat-global-${uid}`)).toBeTruthy();
            const keyWarnings = errors.mock.calls.filter((c) => /same key|unique "key"/.test(String(c[0])));
            expect(keyWarnings).toEqual([]);
        } finally {
            errors.mockRestore();
        }
    });
});

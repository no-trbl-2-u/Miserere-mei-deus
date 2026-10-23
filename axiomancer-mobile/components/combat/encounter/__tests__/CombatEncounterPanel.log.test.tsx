/**
 * Hermetic component test — the persistent combat log, inside the pilgrim
 * modal.
 *
 * Every combat beat is a floating token that vanishes in ~1s, so the log is
 * how the player reconstructs what just happened. The board carries no LOG
 * button: the pilgrim modal (tap the avatar) has one in its XP row, which
 * swaps the modal body to the log; BACK returns to the stats view, and
 * closing the modal resets it. The line content itself is covered by
 * `state/presenters/__tests__/combat-log-history.engine.test.ts`.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { CombatEncounterPanel } from '@/components/combat/encounter/CombatEncounterPanel';
import { COMBAT_LOG_TOGGLE_TEXT, COMBAT_LOG_BACK_TEXT } from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

const CARDS = ['spoiled-poultice', 'the-long-lent', 'chilblain-watch', 'thin-hymn'];

function mount() {
    const { store, enemy } = startRealFight(REAL_FIGHT_FIXTURE, {
        player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 160, maxHealth: 160 },
    });
    const bootstrapPlayer = store.getState().player;
    const onExit = jest.fn();
    const { tree: panelTree } = withAllProviders(
        <CombatEncounterPanel enemy={enemy} bootstrapPlayer={bootstrapPlayer} deck={CARDS} seed={7} onExit={onExit} />,
        { store },
    );
    render(panelTree);
    return { store, onExit };
}

function enter() {
    act(() => { fireEvent.press(screen.getByTestId('combat-enter')); });
}

function openPilgrim() {
    act(() => { fireEvent.press(screen.getByTestId('combat-player-medallion')); });
}

describe('CombatEncounterPanel — the combat log lives in the pilgrim modal', () => {
    it('is absent over the pre-combat reveal (nothing has happened yet)', () => {
        mount();
        expect(screen.getByTestId('combat-reveal')).toBeTruthy();
        expect(screen.queryByTestId('combat-log')).toBeNull();
        expect(screen.queryByTestId('combat-pilgrim-log')).toBeNull();
    });

    it('the board itself carries no LOG button', () => {
        mount();
        enter();
        expect(screen.queryByTestId('combat-log-toggle')).toBeNull();
        expect(screen.queryByTestId('combat-log')).toBeNull();
    });

    it('the pilgrim modal opens on its stats view with a LOG button', () => {
        mount();
        enter();
        openPilgrim();
        expect(screen.getByTestId('combat-pilgrim-modal')).toBeTruthy();
        const log = screen.getByTestId('combat-pilgrim-log');
        expect(log.props.accessibilityRole).toBe('button');
        expect(screen.getByText(COMBAT_LOG_TOGGLE_TEXT)).toBeTruthy();
        expect(screen.queryByTestId('combat-log')).toBeNull();
        expect(screen.getByText('STATUS EFFECTS')).toBeTruthy();
    });

    it('LOG swaps the modal body to the log; BACK returns to the stats view', () => {
        mount();
        enter();
        openPilgrim();

        act(() => { fireEvent.press(screen.getByTestId('combat-pilgrim-log')); });
        expect(screen.getByTestId('combat-log')).toBeTruthy();
        expect(screen.getByText(COMBAT_LOG_BACK_TEXT)).toBeTruthy();
        expect(screen.queryByText('STATUS EFFECTS')).toBeNull();

        act(() => { fireEvent.press(screen.getByTestId('combat-pilgrim-log-back')); });
        expect(screen.queryByTestId('combat-log')).toBeNull();
        expect(screen.getByText('STATUS EFFECTS')).toBeTruthy();
        expect(screen.getByTestId('combat-pilgrim-log')).toBeTruthy();
    });

    it('closing the modal resets it to the stats view', () => {
        mount();
        enter();
        openPilgrim();
        act(() => { fireEvent.press(screen.getByTestId('combat-pilgrim-log')); });
        expect(screen.getByTestId('combat-log')).toBeTruthy();

        act(() => { fireEvent.press(screen.getByTestId('combat-pilgrim-close')); });
        expect(screen.queryByTestId('combat-pilgrim-modal')).toBeNull();

        openPilgrim();
        expect(screen.queryByTestId('combat-log')).toBeNull();
        expect(screen.getByText('STATUS EFFECTS')).toBeTruthy();
    });

    it('a tap on the backdrop closes and resets it too', () => {
        mount();
        enter();
        openPilgrim();
        act(() => { fireEvent.press(screen.getByTestId('combat-pilgrim-log')); });
        act(() => { fireEvent.press(screen.getByTestId('combat-pilgrim-modal')); });
        expect(screen.queryByTestId('combat-pilgrim-modal')).toBeNull();
        openPilgrim();
        expect(screen.queryByTestId('combat-log')).toBeNull();
    });
});

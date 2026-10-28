/**
 * Hermetic screen test - `/quest` per stage (phase QL1c, A10).
 *
 * One test per stage the engine reads off the quest log (`offer`, `turn-in`,
 * `waiting`, `locked`), on the staged questline of
 * `test-utils/questlineFixture.ts`. The buttons dispatch the engine's calls
 * through the store; LEAVE closes the screen; a `card-pick` opens the spoils
 * tiles over it.
 */

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import type { GameState } from '@mechanics';

import QuestScreen from '@/app/quest/index';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import type { AppStore } from '@/state/store';
import { createFixtureStore } from '@/test-utils/fixtureStore';
import {
    FIXTURE_LINE,
    acceptFixtureStep,
    fillFixtureStep,
    registerFixtureQuestline,
    unregisterFixtureQuestline,
} from '@/test-utils/questlineFixture';

const mockBack = jest.fn();
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: () => mockBack(), canGoBack: () => true }),
}));

beforeAll(() => { registerFixtureQuestline(); });
afterAll(() => { unregisterFixtureQuestline(); });

function gs(store: AppStore): GameState {
    return store.getState() as unknown as GameState;
}

/** A store on quest node `node` with the screen opened on it, rendered. */
function open(node: number, description?: string) {
    const handle = createFixtureStore({
        id: `ql1c-screen-${node}`,
        seed: `ql1c-screen-${node}`,
        world: { continent: 'coastal-continent', map: 'breakwater', node: `bw-${node}` },
    });
    const view = () => render(
        <GameStoreProvider store={handle.store}>
            <QuestScreen />
        </GameStoreProvider>,
    );
    const resolve = () => handle.actions.resolveCurrentMapEvent(undefined, {
        kind: 'quest', questline: FIXTURE_LINE, node, ...(description ? { description } : {}),
    });
    return { ...handle, view, resolve };
}

describe('/quest - offer', () => {
    it('shows the giver, "Step 1 of 4", the requirement, the progress and the pay, with ACCEPT and LEAVE', () => {
        const { resolve, view } = open(1, 'A sailor wants the Gallows crossed.');
        resolve();
        view();
        expect(screen.getByTestId('quest-giver-line').props.children).toBe('A sailor wants the Gallows crossed.');
        expect(screen.getByTestId('quest-step-eyebrow').props.children).toBe('STEP 1 OF 4');
        expect(screen.getByTestId('quest-offer')).toBeTruthy();
        expect(screen.getByText('Cross a hazard')).toBeTruthy();
        expect(screen.getByText('0 of 1')).toBeTruthy();
        expect(screen.getByText('+40 XP')).toBeTruthy();
        expect(screen.getByText('+10 shillings')).toBeTruthy();
        expect(screen.getByTestId('quest-accept-button')).toBeTruthy();
        expect(screen.getByTestId('quest-leave-button')).toBeTruthy();
        expect(screen.queryByTestId('quest-turn-in-button')).toBeNull();
    });

    it('ACCEPT starts the step and swaps the button for the accepted line', () => {
        const { store, resolve, view } = open(1);
        resolve();
        view();
        fireEvent.press(screen.getByTestId('quest-accept-button'));
        expect(gs(store).quests.active.map(q => q.name)).toEqual(['Cross the Gallows']);
        expect(screen.queryByTestId('quest-accept-button')).toBeNull();
        expect(screen.getByTestId('quest-accepted-line')).toBeTruthy();
        expect(screen.getByTestId('quest-leave-button')).toBeTruthy();
    });

    it('LEAVE closes the screen and accepts nothing', () => {
        const { store, resolve, view } = open(1);
        resolve();
        view();
        fireEvent.press(screen.getByTestId('quest-leave-button'));
        expect(store.getState().quest.open).toBeNull();
        expect(gs(store).quests.active).toEqual([]);
        expect(screen.getByTestId('quest-inactive')).toBeTruthy();
    });
});

describe('/quest - turn-in', () => {
    it('shows the finished step with its pay and TURN IN, then the next offer on the same screen', () => {
        const { store, resolve, view } = open(2);
        acceptFixtureStep(store, 1);
        fillFixtureStep(store, 1);
        resolve();
        view();
        expect(screen.getByTestId('quest-step-eyebrow').props.children).toBe('STEP 2 OF 4');
        expect(screen.getByTestId('quest-turn-in')).toBeTruthy();
        expect(screen.getByText('Cross the Gallows')).toBeTruthy();
        expect(screen.getByText('1 of 1')).toBeTruthy();
        expect(screen.queryByTestId('quest-accept-button')).toBeNull();

        const before = gs(store).player.currency;
        fireEvent.press(screen.getByTestId('quest-turn-in-button'));

        expect(gs(store).player.currency).toBe(before + 10);
        // The ledger of what was paid, and the next offer, on the same screen.
        expect(screen.getByTestId('quest-paid')).toBeTruthy();
        expect(screen.getByTestId('quest-offer')).toBeTruthy();
        expect(screen.getByText('Thin the Quay')).toBeTruthy();
        expect(screen.queryByTestId('quest-turn-in-button')).toBeNull();
        expect(screen.getByTestId('quest-accept-button')).toBeTruthy();
    });

    it('a card-pick opens the spoils tiles over the screen: TAKE CARD adds the card', () => {
        const { store, resolve, view } = open(3);
        acceptFixtureStep(store, 2);
        fillFixtureStep(store, 2);
        resolve();
        view();
        fireEvent.press(screen.getByTestId('quest-turn-in-button'));
        expect(screen.getByTestId('combat-rewards')).toBeTruthy();
        const offers = store.getState().quest.cardOffers;
        expect(offers).toHaveLength(3);
        fireEvent.press(screen.getByTestId(`combat-reward-${offers[0]}`));
        fireEvent.press(screen.getByTestId('combat-reward-confirm'));
        expect(gs(store).player.combatRewardCards).toEqual([offers[0]]);
        expect(screen.queryByTestId('combat-rewards')).toBeNull();
    });
});

describe('/quest - waiting', () => {
    it('shows the step so far and only LEAVE', () => {
        const { store, resolve, view } = open(2);
        acceptFixtureStep(store, 1);
        resolve();
        view();
        expect(screen.getByTestId('quest-waiting')).toBeTruthy();
        expect(screen.getByText('0 of 1')).toBeTruthy();
        expect(screen.queryByTestId('quest-turn-in-button')).toBeNull();
        expect(screen.queryByTestId('quest-accept-button')).toBeNull();
        expect(screen.getByTestId('quest-leave-button')).toBeTruthy();
    });
});

describe('/quest - locked', () => {
    it('shows one line and LEAVE', () => {
        const { resolve, view } = open(3);
        resolve();
        view();
        expect(screen.getByTestId('quest-step-eyebrow').props.children).toBe('STEP 3 OF 4');
        expect(screen.getByTestId('quest-locked-line')).toBeTruthy();
        expect(screen.queryByTestId('quest-offer')).toBeNull();
        expect(screen.queryByTestId('quest-waiting')).toBeNull();
        expect(screen.queryByTestId('quest-accept-button')).toBeNull();
        expect(screen.queryByTestId('quest-turn-in-button')).toBeNull();
        expect(screen.getByTestId('quest-leave-button')).toBeTruthy();
    });
});

describe('/quest - closed', () => {
    it('with nothing open it shows the empty shell and pops the route', () => {
        mockBack.mockClear();
        const { view } = open(1);
        view();
        expect(screen.getByTestId('quest-inactive')).toBeTruthy();
        expect(mockBack).toHaveBeenCalled();
    });
});

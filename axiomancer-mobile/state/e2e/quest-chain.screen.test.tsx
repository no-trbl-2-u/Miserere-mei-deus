/**
 * Hermetic screen test - `/quest` on the long chain fixture (phase MQ1c, A10).
 *
 * The three cases MQ1 added to the screen: an arrival-settled step's payout
 * above the next offer, a `carry` objective's `Bring: <item>` line, and a
 * quest node of a second questline (the side quest), on the fixtures of
 * `Game/fixtures/quest-chain-long.fixture.ts`.
 */

import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { giveQuestStep, type GameState } from '@mechanics';
import {
    CASTLE_KEY, LONG_MAIN_LINE, LONG_SIDE_LINE, LONG_STEP_1, LONG_STEP_2, LONG_STEP_3, LONG_SIDE_STEP,
    registerLongChainFixture,
} from '@mechanics/Game/fixtures';

import QuestScreen from '@/app/quest/index';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import type { AppStore } from '@/state/store';
import { createFixtureStore } from '@/test-utils/fixtureStore';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

beforeAll(() => { registerLongChainFixture(); });

function gs(store: AppStore): GameState {
    return store.getState() as unknown as GameState;
}

/** A store with the screen opened on quest node `node` of `questline`, rendered. */
function open(questline: string, node: number, completed: string[] = []) {
    const handle = createFixtureStore({
        id: `mq1c-${questline}-${node}`,
        seed: `mq1c-${questline}-${node}`,
        world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-1' },
    });
    handle.store.setState({ quests: { ...gs(handle.store).quests, completed } } as never);
    handle.actions.resolveCurrentMapEvent(undefined, { kind: 'quest', questline, node });
    render(
        <GameStoreProvider store={handle.store}>
            <QuestScreen />
        </GameStoreProvider>,
    );
    return handle;
}

describe('/quest - a step paid on arrival', () => {
    it('shows what the arrival paid above the next offer', () => {
        open(LONG_MAIN_LINE, 3, [LONG_STEP_1, LONG_STEP_2]);
        const paid = screen.getByTestId('quest-paid');
        expect(paid).toBeTruthy();
        expect(screen.getByText(LONG_STEP_2)).toBeTruthy();
        expect(screen.getByText('+30 XP')).toBeTruthy();
        expect(screen.getByText(CASTLE_KEY.name)).toBeTruthy();
        expect(screen.getByTestId('quest-offer')).toBeTruthy();
        expect(screen.getByTestId('quest-accept-button')).toBeTruthy();
    });

    it('a node whose step before was not settled by arrival shows no payout', () => {
        open(LONG_MAIN_LINE, 2, [LONG_STEP_1]);
        expect(screen.queryByTestId('quest-paid')).toBeNull();
    });
});

describe('/quest - a carry objective', () => {
    it('reads "Bring: <item>" with its progress, in the offer and once taken', () => {
        const handle = open(LONG_MAIN_LINE, 3, [LONG_STEP_1, LONG_STEP_2]);
        expect(screen.getByText(`Bring: ${CASTLE_KEY.name}`)).toBeTruthy();
        expect(screen.getByText('0 of 1')).toBeTruthy();
        // Taken (the engine's give door), the line stays on the waiting block of the next node.
        const next = giveQuestStep(gs(handle.store), LONG_MAIN_LINE, 3);
        expect(next.quests.active.map(q => q.name)).toEqual([LONG_STEP_3]);
    });
});

describe('/quest - a node of the second questline', () => {
    it('offers the side quest as step 1 of 1, with its pay', () => {
        open(LONG_SIDE_LINE, 1);
        expect(screen.getByTestId('quest-step-eyebrow').props.children).toBe('STEP 1 OF 1');
        expect(screen.getByText(LONG_SIDE_STEP)).toBeTruthy();
        expect(screen.getByText('+25 XP')).toBeTruthy();
        expect(screen.getByTestId('quest-accept-button')).toBeTruthy();
    });

    it('its turn-in node reads the last step ("1 OF 1", never "2 OF 1") and is locked until the side quest is taken', () => {
        const handle = open(LONG_SIDE_LINE, 2);
        expect(screen.getByTestId('quest-locked-line')).toBeTruthy();
        expect(screen.getByTestId('quest-step-eyebrow').props.children).toBe('STEP 1 OF 1');
        expect(gs(handle.store).quests.active).toEqual([]);
        fireEvent.press(screen.getByTestId('quest-leave-button'));
        expect(screen.getByTestId('quest-inactive')).toBeTruthy();
    });
});

/**
 * Hermetic screen test - the giver scene on `/quest` (phase ET1d, A10-A12).
 *
 * The giver's portrait and name open the screen, the turn-in's relic rises
 * into view before the paid card, and a node reached too early shows the giver
 * dimmed with the node's own refusal line and only LEAVE. The relic rise takes
 * its reduced-motion answer from its caller, as the combat frames do.
 */

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';

import QuestScreen from '@/app/quest/index';
import { RelicRise } from '@/components/quest/QuestGiverScene';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { selectQuestVM } from '@/state/presenters/quest.engine';
import { createFixtureStore } from '@/test-utils/fixtureStore';
import {
    FIXTURE_LINE,
    FIXTURE_NODES,
    acceptFixtureStep,
    fillFixtureStep,
    registerFixtureQuestline,
    unregisterFixtureQuestline,
} from '@/test-utils/questlineFixture';

// The relic rise's motion answer is watched, not read from its source: the
// mutation run rewrites the source in place, so a test of its text cannot run
// there. Both wrap the real functions, so the screen behaves as it ships.
const mockResolveJuiceMode = jest.fn();
jest.mock('@/lib/juice/instant', () => {
    const actual = jest.requireActual<typeof import('@/lib/juice/instant')>('@/lib/juice/instant');
    return { ...actual, resolveJuiceMode: (...args: Parameters<typeof actual.resolveJuiceMode>) => { mockResolveJuiceMode(...args); return actual.resolveJuiceMode(...args); } };
});
const mockAskPlatform = jest.fn();
jest.mock('@/hooks/useReducedMotion', () => {
    const actual = jest.requireActual<typeof import('@/hooks/useReducedMotion')>('@/hooks/useReducedMotion');
    return { ...actual, useReducedMotion: () => { mockAskPlatform(); return actual.useReducedMotion(); } };
});

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

beforeAll(() => { registerFixtureQuestline(); });
afterAll(() => { unregisterFixtureQuestline(); });

const GIVER = { name: '[content] The Ferryman', portrait: 'fishermen-elder' };
const REFUSAL = 'The Ferryman turns his back to you.';

function open(node: number) {
    const handle = createFixtureStore({
        id: `et1d-${node}`,
        seed: `et1d-${node}`,
        world: { continent: 'coastal-continent', map: 'breakwater', node: FIXTURE_NODES[node - 1] ?? FIXTURE_NODES[0] },
    });
    const view = () => render(
        <GameStoreProvider store={handle.store}>
            <QuestScreen />
        </GameStoreProvider>,
    );
    const resolve = () => handle.actions.resolveCurrentMapEvent(undefined, {
        kind: 'quest', questline: FIXTURE_LINE, node, description: 'A line.', lockedLine: REFUSAL, giver: GIVER,
    });
    return { ...handle, view, resolve };
}

describe('/quest - the giver scene', () => {
    it('opens on the giver: portrait, name, then the giver line', () => {
        const { resolve, view } = open(1);
        resolve();
        view();
        expect(screen.getByTestId('quest-giver-portrait')).toBeTruthy();
        expect(screen.getByTestId('quest-giver-name').props.children).toBe(GIVER.name);
        expect(screen.getByTestId('quest-giver-line').props.children).toBe('A line.');
        expect(screen.queryByTestId('quest-giver-turned-away')).toBeNull();
        expect(screen.queryByTestId('quest-relic-rise')).toBeNull();
    });

    it('a turn-in raises the paid relic into view with its name, before the next offer', () => {
        const { store, resolve, view } = open(4);
        acceptFixtureStep(store, 3);
        fillFixtureStep(store, 3);
        resolve();
        view();
        fireEvent.press(screen.getByTestId('quest-turn-in-button'));
        expect(screen.getByTestId('quest-relic-rise')).toBeTruthy();
        expect(screen.getByTestId('quest-relic-name').props.children).toBeTruthy();
        expect(screen.getByTestId('quest-paid')).toBeTruthy();
        // Accept, Turn in and Leave keep their test ids.
        expect(screen.getByTestId('quest-leave-button')).toBeTruthy();
    });

    it('too early, the giver is turned away with the refusal line and only Leave', () => {
        const { resolve, view } = open(3);
        resolve();
        view();
        expect(screen.getByTestId('quest-giver-turned-away')).toBeTruthy();
        expect(screen.getByTestId('quest-locked-line').props.children).toBe(REFUSAL);
        expect(screen.queryByTestId('quest-giver-line')).toBeNull();
        expect(screen.queryByTestId('quest-accept-button')).toBeNull();
        expect(screen.queryByTestId('quest-turn-in-button')).toBeNull();
        expect(screen.getByTestId('quest-leave-button')).toBeTruthy();
    });

    it('a node with no giver opens without the scene', () => {
        const handle = createFixtureStore({
            id: 'et1d-none', seed: 'et1d-none',
            world: { continent: 'coastal-continent', map: 'breakwater', node: FIXTURE_NODES[0] },
        });
        handle.actions.resolveCurrentMapEvent(undefined, { kind: 'quest', questline: FIXTURE_LINE, node: 1 });
        render(<GameStoreProvider store={handle.store}><QuestScreen /></GameStoreProvider>);
        expect(screen.queryByTestId('quest-giver')).toBeNull();
    });
});

describe('/quest - the relic under a turned-in card', () => {
    it('a turn-in that pays no item shows what it paid and raises no relic', () => {
        const { store, resolve, view } = open(2);
        acceptFixtureStep(store, 1);
        fillFixtureStep(store, 1);
        resolve();
        view();
        fireEvent.press(screen.getByTestId('quest-turn-in-button'));
        expect(selectQuestVM(store.getState()).paid?.itemNames).toEqual([]);
        expect(screen.getByTestId('quest-paid')).toBeTruthy();
        expect(screen.queryByTestId('quest-relic-rise')).toBeNull();
    });

    it('the relic wears the first paid item\'s id, for its icon', () => {
        const { store, resolve, view } = open(4);
        acceptFixtureStep(store, 3);
        fillFixtureStep(store, 3);
        resolve();
        view();
        fireEvent.press(screen.getByTestId('quest-turn-in-button'));
        const paid = selectQuestVM(store.getState()).paid!;
        expect(paid.itemIds?.[0]).toEqual(expect.any(String));
        const rise = screen.UNSAFE_getByType(RelicRise);
        expect(rise.props.itemId).toBe(paid.itemIds![0]);
        expect(rise.props.name).toBe(paid.itemNames[0]);
    });

    it('an older ledger with no item ids still raises the relic, with no id', () => {
        const { store, resolve, view } = open(1);
        resolve();
        store.setState({
            quest: {
                ...store.getState().quest,
                paid: { step: 1, questName: 'Cross the Gallows', experience: 0, currency: 0, itemNames: ['[content] An Old Relic'] },
            },
        } as never);
        view();
        const rise = screen.UNSAFE_getByType(RelicRise);
        expect(rise.props.itemId).toBeNull();
        expect(screen.getByTestId('quest-relic-name').props.children).toBe('[content] An Old Relic');
    });
});

describe('/quest - the relic rise, reduced motion', () => {
    it('lands shown at once with reduced motion on', () => {
        render(<RelicRise itemId={null} name="The Tide Relic" reducedMotion />);
        expect(screen.getByTestId('quest-relic-name').props.children).toBe('The Tide Relic');
    });

    it('takes the answer from its caller and never asks the platform', () => {
        const reduceMotionAsked = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled');
        for (const reducedMotion of [true, false]) {
            mockResolveJuiceMode.mockClear();
            mockAskPlatform.mockClear();
            render(<RelicRise itemId={null} name="The Tide Relic" reducedMotion={reducedMotion} />);
            expect(mockResolveJuiceMode).toHaveBeenCalledWith({ reducedMotion });
            expect(mockAskPlatform).not.toHaveBeenCalled();
        }
        expect(reduceMotionAsked).not.toHaveBeenCalled();
        reduceMotionAsked.mockRestore();
    });
});

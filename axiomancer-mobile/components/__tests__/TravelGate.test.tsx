/**
 * Hermetic component tests - TravelGate (phases NK1d, CE1b).
 *
 * Pushes `/travel` once per open offer; when the far bank's crossing opens the
 * chapter complete screen it replaces the travel screen with `/chapter-complete`
 * once, and a plain offer never opens it.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import React from 'react';

import { TravelGate } from '@/components/TravelGate';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createFixtureStore } from '@/test-utils/fixtureStore';
import { resolvePastScene } from '../../test-utils/pastScene';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn(), canGoBack: () => true }),
}));

afterEach(() => { mockPush.mockClear(); mockReplace.mockClear(); });

function onTheDoor(node: string) {
    const handle = createFixtureStore({
        id: `ce1b-gate-${node}`, seed: `ce1b-gate-${node}`,
        world: { continent: 'coastal-continent', map: 'breakwater', node },
    });
    render(<GameStoreProvider store={handle.store}><TravelGate /></GameStoreProvider>);
    return handle;
}

describe('TravelGate', () => {
    it('the far bank: pushes /travel, then replaces it with /chapter-complete once', () => {
        const { store, actions } = onTheDoor('bw-b2');
        act(() => { resolvePastScene(store, actions, 'travel'); });
        expect(mockPush).toHaveBeenCalledWith('/travel');
        expect(mockReplace).not.toHaveBeenCalled();

        act(() => { actions.takeTravel(); });
        expect(mockReplace).toHaveBeenCalledTimes(1);
        expect(mockReplace).toHaveBeenCalledWith('/chapter-complete');
        expect(mockPush).toHaveBeenCalledTimes(1);
    });

    it('the sea cave: pushes /travel and never opens the chapter screen', () => {
        const { store, actions } = onTheDoor('bw-h6');
        act(() => { resolvePastScene(store, actions, 'travel'); });
        act(() => { actions.takeTravel(); });
        expect(mockReplace).not.toHaveBeenCalled();
    });
});

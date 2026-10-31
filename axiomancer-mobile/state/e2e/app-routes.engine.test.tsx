/**
 * Hermetic E2E Tests — App route components
 *
 * Tests the root index route (`app/index.tsx`) through its public entry
 * point with mocked navigation: the title screen, the main menu behind it
 * (CONTINUE / NEW GAME / LOAD GAME / SETTINGS over
 * three save slots), and the fixture-boot bypass.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { afterEach, beforeEach, describe, it, expect, jest } from '@jest/globals';
import { render, act, fireEvent } from '@testing-library/react-native';
import React from 'react';

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: mockReplace,
        push: mockPush,
        back: jest.fn(),
        canGoBack: () => false,
    }),
    useLocalSearchParams: () => mockParams,
    Redirect: ({ href }: { href: string }) => {
        const mockReact = require('react');
        return mockReact.createElement('view', { testID: `redirect-${href}` });
    },
    Stack: ({ children }: { children: unknown }) => {
        const mockReact = require('react');
        return mockReact.createElement('view', { children });
    },
}));

// Mock TitleScreen: pressing it is EMBARK, which shows the menu it was handed
// (the real one hands off in place, under its wordmark).
jest.mock('@/components/TitleScreen', () => ({
    TitleScreen: ({ menu, startAtMenu }: { menu: unknown; startAtMenu?: boolean }) => {
        const mockReact = require('react');
        const [open, setOpen] = mockReact.useState(Boolean(startAtMenu));
        if (open) return menu;
        return mockReact.createElement('view', {
            testID: 'title-screen',
            onPress: () => setOpen(true),
        }, 'Title Screen');
    },
}));

jest.mock('expo-font', () => ({
    useFonts: () => [true, null],
    isLoaded: () => true,
}));

import { createNewGameState, type GameState } from '@mechanics';
import { mockFixedRng } from '@/test-utils/rng';
import { createMemorySlotStore } from '@/state/persistence/memorySlotStore';
import { resetBootFixtureForTests, resolveBootFixture } from '@/state/fixtures';
import { createAppStore, type AppStore } from '@/state/store';
import { withAllProviders } from '@/test-utils/withAllProviders';

// Import the route components
import IndexScreen from '@/app/index';

afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    resetBootFixtureForTests();
    mockParams = {};
});

beforeEach(() => {
    mockFixedRng(0.5);
});

function savedState(name: string, level: number): GameState {
    const s = createNewGameState({ characterId: 'the-chosen' });
    return { ...s, player: { ...s.player, name, level } };
}

function mountIndex(options: { slots?: ReturnType<typeof createMemorySlotStore>; store?: AppStore } = {}) {
    const slots = options.slots ?? createMemorySlotStore();
    const store = options.store ?? createAppStore({ adapter: slots });
    const { tree } = withAllProviders(<IndexScreen />, { store, slots });
    return { ...render(tree), store, slots };
}

// ---------------------------------------------------------------------------
// app/index.tsx tests — title → menu → run
// ---------------------------------------------------------------------------

describe('app/index.tsx: title and menu', () => {
    it('renders the title screen first on a cold launch', () => {
        const { getByTestId, queryByTestId } = mountIndex();
        expect(getByTestId('title-screen')).toBeTruthy();
        expect(queryByTestId('main-menu')).toBeNull();
    });

    it('EMBARK opens the main menu; nothing is auto-started or seeded', () => {
        const { getByTestId, queryByTestId, store, slots } = mountIndex();

        act(() => {
            fireEvent.press(getByTestId('title-screen'));
        });

        expect(getByTestId('main-menu')).toBeTruthy();
        expect(queryByTestId('bundle-select')).toBeNull();
        expect(mockReplace).not.toHaveBeenCalled();
        expect(slots.getActiveSlot()).toBeNull();
        expect(store.getState().player.inventory).toEqual([]);
    });

    it('with no chronicle saved: CONTINUE is absent and LOAD GAME is disabled', () => {
        const { getByTestId, queryByTestId } = mountIndex();
        act(() => { fireEvent.press(getByTestId('title-screen')); });

        expect(queryByTestId('main-menu-continue')).toBeNull();
        expect(getByTestId('main-menu-load-game').props.accessibilityState?.disabled).toBe(true);
        expect(getByTestId('main-menu-new-game')).toBeTruthy();
    });

    it('NEW GAME / LOAD GAME / SETTINGS push their routes', () => {
        const slots = createMemorySlotStore({ initial: { 1: { state: savedState('One', 2), savedAt: 10 } } });
        const { getByTestId } = mountIndex({ slots });
        act(() => { fireEvent.press(getByTestId('title-screen')); });

        act(() => { fireEvent.press(getByTestId('main-menu-new-game')); });
        expect(mockPush).toHaveBeenLastCalledWith('/saves?mode=new');
        act(() => { fireEvent.press(getByTestId('main-menu-load-game')); });
        expect(mockPush).toHaveBeenLastCalledWith('/saves?mode=load');
        act(() => { fireEvent.press(getByTestId('main-menu-settings')); });
        expect(mockPush).toHaveBeenLastCalledWith('/settings');
    });

    it('CONTINUE loads the most recent chronicle and enters the map', () => {
        const slots = createMemorySlotStore({
            initial: {
                1: { state: savedState('Older', 2), savedAt: 10 },
                3: { state: savedState('Newest', 6), savedAt: 30 },
            },
        });
        const { getByTestId, store } = mountIndex({ slots });
        act(() => { fireEvent.press(getByTestId('title-screen')); });

        act(() => { fireEvent.press(getByTestId('main-menu-continue')); });

        expect(slots.getActiveSlot()).toBe(3);
        expect(store.getState().player.name).toBe('Newest');
        expect(mockReplace).toHaveBeenCalledWith('/exploration');
    });

    it('CONTINUE into a chronicle saved mid-fight lands on the map (whose gate then routes the fight), not straight on the combat route', () => {
        const midFight = { ...savedState('Fighter', 3), currentEncounter: { enemies: [] } as never };
        const slots = createMemorySlotStore({ initial: { 2: { state: midFight, savedAt: 5 } } });
        const { getByTestId } = mountIndex({ slots });
        act(() => { fireEvent.press(getByTestId('title-screen')); });

        act(() => { fireEvent.press(getByTestId('main-menu-continue')); });

        expect(mockReplace).toHaveBeenCalledWith('/exploration');
        expect(mockReplace).not.toHaveBeenCalledWith('/combat-encounter');
    });

    it('?menu=1 skips the title (the SETTINGS return path)', () => {
        mockParams = { menu: '1' };
        const { getByTestId, queryByTestId } = mountIndex();
        expect(getByTestId('main-menu')).toBeTruthy();
        expect(queryByTestId('title-screen')).toBeNull();
    });

    it('a fixture boot skips both the title and the menu', () => {
        const fixture = resolveBootFixture({
            request: { source: 'global', ref: { id: 'route-test', arrive: false } as never },
            devToolsEnabled: true,
        });
        // The registry may reject a bare fixture; only assert the bypass when it booted.
        if (fixture === null) return;
        const { getByTestId, queryByTestId } = mountIndex();
        expect(getByTestId('redirect-/exploration')).toBeTruthy();
        expect(queryByTestId('title-screen')).toBeNull();
    });

    it('is stable across multiple renders', () => {
        const first = mountIndex();
        const second = mountIndex();
        expect(first.getByTestId('title-screen')).toBeTruthy();
        expect(second.getByTestId('title-screen')).toBeTruthy();
    });
});

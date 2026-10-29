/**
 * Hermetic component tests — HardwareBackHandler.
 *
 * Side-effect-only component. Registers an Android hardwareBackPress
 * listener that returns `true` (prevent default) while in combat or an
 * open rest-choice node; `false` (allow default) otherwise. Renders null.
 * iOS / other platforms: no listener registered.
 */

import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import React from 'react';
import { BackHandler, Platform } from 'react-native';
import type { ResolveMapEventResult, RestChoiceSession } from '@mechanics';

import { HardwareBackHandler } from '@/components/HardwareBackHandler';
import { CombatModeProvider, useCombatMode } from '@/state/combat-mode';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, EMPTY_EVENT_SLICE, EMPTY_REST_SLICE, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

type BackAction = () => boolean;

const addListenerSpy = jest.spyOn(BackHandler, 'addEventListener');
const removeSpy = jest.fn();

beforeEach(() => {
    addListenerSpy.mockReset();
    removeSpy.mockReset();
    addListenerSpy.mockImplementation((_evt: unknown, _action: unknown) => ({
        remove: removeSpy,
    } as ReturnType<typeof BackHandler.addEventListener>));
    // jest-expo's default Platform.OS is 'ios'; most tests below
    // need android. Override here; individual tests that need iOS
    // set their own value and restore via finally.
    (Platform as { OS: string }).OS = 'android';
});

afterAll(() => {
    addListenerSpy.mockRestore();
});

function makeStore(): AppStore {
    return createAppStore({ adapter: createMemoryAdapter() });
}

function withProvider(store: AppStore, child: React.ReactNode) {
    return (
        <GameStoreProvider store={store}>
            <CombatModeProvider>{child}</CombatModeProvider>
        </GameStoreProvider>
    );
}

function fakeRestSession(): RestChoiceSession {
    return {
        phase: 'offer',
        shelter: 'camp',
        maxHealth: 20,
        health: 20,
        currency: 0,
        deckCardIds: [],
        upgradableCardIds: [],
        offers: [],
        description: null,
        outcome: null,
        seed: 1,
    };
}

/** Captures the latest `backAction` callback registered with BackHandler. */
function lastBackAction(): BackAction {
    const calls = addListenerSpy.mock.calls;
    const lastCall = calls[calls.length - 1];
    if (!lastCall) throw new Error('BackHandler.addEventListener was not called');
    return lastCall[1] as BackAction;
}

/**
 * Helper component for tests that need to flip combat state at
 * runtime — the test imports it and triggers `enterCombat()` etc.
 * via a ref-like pattern (props callback at mount).
 */
function CombatModeProbe({ onMount }: { onMount: (api: ReturnType<typeof useCombatMode>) => void }) {
    const api = useCombatMode();
    React.useEffect(() => {
        onMount(api);
    }, [onMount, api]);
    return null;
}

describe('HardwareBackHandler: Platform.OS gate', () => {
    it('on Android: registers a hardwareBackPress listener', () => {
        const originalOS = Platform.OS;
        (Platform as { OS: string }).OS = 'android';
        try {
            render(withProvider(makeStore(), <HardwareBackHandler />));
            expect(addListenerSpy).toHaveBeenCalledTimes(1);
            expect(addListenerSpy.mock.calls[0]?.[0]).toBe('hardwareBackPress');
        } finally {
            (Platform as { OS: string }).OS = originalOS;
        }
    });

    it('on iOS: does NOT register a listener', () => {
        const originalOS = Platform.OS;
        (Platform as { OS: string }).OS = 'ios';
        try {
            render(withProvider(makeStore(), <HardwareBackHandler />));
            expect(addListenerSpy).not.toHaveBeenCalled();
        } finally {
            (Platform as { OS: string }).OS = originalOS;
        }
    });
});

describe('HardwareBackHandler: inCombat branching', () => {
    it('back action returns false when not in combat (allow default)', () => {
        const originalOS = Platform.OS;
        (Platform as { OS: string }).OS = 'android';
        try {
            render(withProvider(makeStore(), <HardwareBackHandler />));
            expect(lastBackAction()()).toBe(false);
        } finally {
            (Platform as { OS: string }).OS = originalOS;
        }
    });

    it('back action returns true while in combat (prevent default)', () => {
        const originalOS = Platform.OS;
        (Platform as { OS: string }).OS = 'android';
        try {
            let api: ReturnType<typeof useCombatMode> | null = null;
            render(
                withProvider(
                    makeStore(),
                    <>
                        <HardwareBackHandler />
                        <CombatModeProbe onMount={(a) => { api = a; }} />
                    </>,
                ),
            );
            // Pre-combat: back action allows default.
            expect(lastBackAction()()).toBe(false);

            // Enter combat — the effect re-runs and a fresh action is registered.
            act(() => {
                api?.enterCombat();
            });
            expect(lastBackAction()()).toBe(true);
        } finally {
            (Platform as { OS: string }).OS = originalOS;
        }
    });
});

describe('HardwareBackHandler: rest-choice node branching (Phase 52d)', () => {
    it('back action returns true while a rest-choice node is open', () => {
        const originalOS = Platform.OS;
        (Platform as { OS: string }).OS = 'android';
        try {
            const store = makeStore();
            render(withProvider(store, <HardwareBackHandler />));
            expect(lastBackAction()()).toBe(false);

            act(() => {
                store.setState({ rest: { session: fakeRestSession() } });
            });
            expect(lastBackAction()()).toBe(true);
        } finally {
            (Platform as { OS: string }).OS = originalOS;
        }
    });

    it('back action returns false again once the node clears', () => {
        const originalOS = Platform.OS;
        (Platform as { OS: string }).OS = 'android';
        try {
            const store = makeStore();
            store.setState({ rest: { session: fakeRestSession() } });
            render(withProvider(store, <HardwareBackHandler />));
            expect(lastBackAction()()).toBe(true);

            act(() => {
                store.setState({ rest: EMPTY_REST_SLICE });
            });
            expect(lastBackAction()()).toBe(false);
        } finally {
            (Platform as { OS: string }).OS = originalOS;
        }
    });
});

/** The opening omen — a paced event `EventGate` routes to `/cutscene`. */
function pacedCutscene(): ResolveMapEventResult {
    return {
        state: undefined as never,
        event: { kind: 'cutscene', lines: ['The tide goes out and does not come back.'] },
    };
}

/** A combat-prelude — combat-adjacent, rendered in place, never a paced route. */
function combatPrelude(): ResolveMapEventResult {
    const enemy = { id: 'cairn-rot', name: 'Cairn-rot', level: 3, health: 24 } as never;
    return {
        state: undefined as never,
        event: {
            kind: 'encounter',
            encounter: { enemies: [enemy], origin: 'breakwater:bw-2' } as never,
            isBoss: false,
        },
    };
}

describe('HardwareBackHandler: pending paced event (audit 2026-09-12)', () => {
    it('back action returns true while a paced event is pending', () => {
        const originalOS = Platform.OS;
        (Platform as { OS: string }).OS = 'android';
        try {
            const store = makeStore();
            render(withProvider(store, <HardwareBackHandler />));
            expect(lastBackAction()()).toBe(false);

            act(() => {
                store.setState({ event: { ...EMPTY_EVENT_SLICE, pending: pacedCutscene() } });
            });
            expect(lastBackAction()()).toBe(true);
        } finally {
            (Platform as { OS: string }).OS = originalOS;
        }
    });

    it('back action returns false again once the paced event resolves', () => {
        const originalOS = Platform.OS;
        (Platform as { OS: string }).OS = 'android';
        try {
            const store = makeStore();
            store.setState({ event: { ...EMPTY_EVENT_SLICE, pending: pacedCutscene() } });
            render(withProvider(store, <HardwareBackHandler />));
            expect(lastBackAction()()).toBe(true);

            act(() => {
                store.setState({ event: EMPTY_EVENT_SLICE });
            });
            expect(lastBackAction()()).toBe(false);
        } finally {
            (Platform as { OS: string }).OS = originalOS;
        }
    });

    it('does not lock for a combat-prelude, which renders in place over the map', () => {
        const originalOS = Platform.OS;
        (Platform as { OS: string }).OS = 'android';
        try {
            const store = makeStore();
            store.setState({ event: { ...EMPTY_EVENT_SLICE, pending: combatPrelude() } });
            render(withProvider(store, <HardwareBackHandler />));
            expect(lastBackAction()()).toBe(false);
        } finally {
            (Platform as { OS: string }).OS = originalOS;
        }
    });
});

describe('HardwareBackHandler: cleanup', () => {
    it('removes the listener on unmount (Android)', () => {
        const originalOS = Platform.OS;
        (Platform as { OS: string }).OS = 'android';
        try {
            const tree = render(withProvider(makeStore(), <HardwareBackHandler />));
            expect(removeSpy).not.toHaveBeenCalled();
            tree.unmount();
            expect(removeSpy).toHaveBeenCalledTimes(1);
        } finally {
            (Platform as { OS: string }).OS = originalOS;
        }
    });
});

describe('HardwareBackHandler: render contract', () => {
    it('renders nothing (side-effect-only)', () => {
        const tree = render(withProvider(makeStore(), <HardwareBackHandler />));
        expect(tree.toJSON()).toBeNull();
    });
});

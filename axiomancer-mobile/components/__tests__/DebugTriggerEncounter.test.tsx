/**
 * Hermetic component tests — DebugTriggerEncounter.
 *
 * Pins:
 *   - DEV gate (true / simulated-false)
 *   - One button per encounter kind mounts
 *   - COMBAT seeds a combat-prelude encounter event with the
 *     lowest-level standard foe on the current map (level 1 on
 *     the Breakwater) and navigates to the WILDS tab
 *   - BOSS seeds an isBoss encounter with a boss-tier foe
 *   - HAZARD / REST / TREASURE launch their REAL minigame session
 *     (and crucially leave NO paced /event route, so they can never
 *     dead-end at the "NO EVENT" card)
 *   - VILLAGE / CUTSCENE seed their paced events for the dedicated
 *     /village + /cutscene routes
 *
 * Seeding a narrative event for rest/treasure would route through
 * `<EventGate>` to /event, where `composeNarrative` returns the empty VM
 * ("NO EVENT IN PROGRESS"). The contract a player cares about is "the
 * minigame opens", so these tests assert the session selectors + absence
 * of a paced route.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DebugTriggerEncounter } from '@/components/DebugTriggerEncounter';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import {
    selectHasActiveEvent,
    selectPacedEventRoute,
} from '@/state/presenters/event.engine';
import { selectHasActiveHazard } from '@/state/presenters/hazard.engine';
import { selectHasActiveRest } from '@/state/presenters/rest.engine';
import { selectHasActiveCache } from '@/state/presenters/cache.engine';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

const mockPush = jest.fn();
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
        back: jest.fn(),
        canGoBack: () => false,
    }),
}));

afterEach(() => {
    mockPush.mockClear();
    jest.restoreAllMocks();
});

function makeStore(): AppStore {
    return createAppStore({ adapter: createMemoryAdapter() });
}

function withProvider(store: AppStore, child: React.ReactNode) {
    return <GameStoreProvider store={store}>{child}</GameStoreProvider>;
}

describe('DebugTriggerEncounter: DEV gate', () => {
    it('renders a button for every encounter kind when __DEV__ is true', () => {
        const store = makeStore();
        const tree = render(withProvider(store, <DebugTriggerEncounter />));
        for (const kind of ['encounter', 'boss', 'hazard', 'rest', 'treasure']) {
            expect(tree.queryByTestId(`debug-trigger-encounter-${kind}`)).not.toBeNull();
        }
    });

    it('renders null when __DEV__ is false (production build simulation)', () => {

        const g = global as any;
        const original = g.__DEV__;
        g.__DEV__ = false;
        try {
            const store = makeStore();
            const tree = render(withProvider(store, <DebugTriggerEncounter />));
            expect(tree.queryByTestId('debug-trigger-encounter-encounter')).toBeNull();
        } finally {
            g.__DEV__ = original;
        }
    });
});

describe('DebugTriggerEncounter: combat triggers', () => {
    it('COMBAT seeds a non-boss encounter with the lowest-level foe and navigates to WILDS', () => {
        const store = makeStore();
        const tree = render(withProvider(store, <DebugTriggerEncounter />));
        fireEvent.press(tree.getByTestId('debug-trigger-encounter-encounter'));

        expect(mockPush).toHaveBeenCalledWith('/(tabs)/exploration');
        const slice = store.getState().event;
        expect(slice.pending).not.toBeNull();
        const event = slice.pending!.event as { kind: string; isBoss: boolean; encounter: { enemies: { level: number }[] } };
        expect(event.kind).toBe('encounter');
        expect(event.isBoss).toBe(false);
        // Fishing-village's gentlest foes are level 1.
        expect(event.encounter.enemies[0].level).toBe(1);
        expect(selectHasActiveEvent(store.getState())).toBe(true);
    });

    it('BOSS seeds an isBoss encounter with a boss-tier foe', () => {
        const store = makeStore();
        const tree = render(withProvider(store, <DebugTriggerEncounter />));
        fireEvent.press(tree.getByTestId('debug-trigger-encounter-boss'));

        const event = store.getState().event.pending!.event as {
            kind: string;
            isBoss: boolean;
            encounter: { enemies: { difficulty: string }[] };
        };
        expect(event.kind).toBe('encounter');
        expect(event.isBoss).toBe(true);
        expect(event.encounter.enemies[0].difficulty).toBe('boss');
    });
});

describe('DebugTriggerEncounter: minigame triggers', () => {
    // Each minigame button must (a) start its session and (b) leave NO
    // paced /event route — otherwise <EventGate> would push /event and
    // the player would see "NO EVENT IN PROGRESS" instead of the game.
    const MINIGAMES: readonly {
        button: string;
        hasSession: (s: ReturnType<AppStore['getState']>) => boolean;
    }[] = [
        { button: 'hazard', hasSession: (s) => selectHasActiveHazard(s) },
        { button: 'rest', hasSession: (s) => selectHasActiveRest(s) },
        { button: 'treasure', hasSession: (s) => selectHasActiveCache(s) },
    ];

    it.each(MINIGAMES.map((m) => [m.button, m] as const))(
        '%s launches its minigame session and never dead-ends at /event',
        (_button, mg) => {
            const store = makeStore();
            expect(mg.hasSession(store.getState())).toBe(false);

            const tree = render(withProvider(store, <DebugTriggerEncounter />));
            fireEvent.press(tree.getByTestId(`debug-trigger-encounter-${mg.button}`));

            expect(mockPush).toHaveBeenCalledWith('/(tabs)/exploration');
            // The session is live → the gate routes to the minigame.
            expect(mg.hasSession(store.getState())).toBe(true);
            // And there is NO paced event waiting — the bug was that these
            // seeded a loot-cache/interaction/etc onto the event slice,
            // which <EventGate> pushed to /event → "NO EVENT".
            expect(selectHasActiveEvent(store.getState())).toBe(false);
            expect(selectPacedEventRoute(store.getState())).toBeNull();
        },
    );

    it('TREASURE opens the loot-cache ("The Reliquary"), not a NO EVENT card', () => {
        const store = makeStore();
        const tree = render(withProvider(store, <DebugTriggerEncounter />));
        fireEvent.press(tree.getByTestId('debug-trigger-encounter-treasure'));

        expect(selectHasActiveCache(store.getState())).toBe(true);
        // The cache carries the seeded coin so the claim ledger isn't empty.
        expect(store.getState().cache.session).not.toBeNull();
    });

});

describe('DebugTriggerEncounter: paced dedicated-route triggers', () => {
    // VILLAGE + CUTSCENE genuinely DO render through the event slice —
    // <EventGate> (root-mounted) routes them to /village and /cutscene.
    //
    // These must NOT jump to the WILDS tab first. The dedicated route
    // pushes from wherever the dev triggered it, so jumping would make the
    // event's dismiss tap dead-end on the exploration map instead of
    // returning to the dev menu. EventGate fires from any tab.
    it.each([
        ['village', 'village', '/village'],
        ['cutscene', 'cutscene', '/cutscene'],
    ])('%s seeds a %s event, routes to %s, and does NOT jump to WILDS', (button, eventKind, route) => {
        const store = makeStore();
        const tree = render(withProvider(store, <DebugTriggerEncounter />));
        fireEvent.press(tree.getByTestId(`debug-trigger-encounter-${button}`));

        expect(mockPush).not.toHaveBeenCalledWith('/(tabs)/exploration');
        expect(store.getState().event.pending!.event.kind).toBe(eventKind);
        expect(selectHasActiveEvent(store.getState())).toBe(true);
        expect(selectPacedEventRoute(store.getState())).toBe(route);
    });
});

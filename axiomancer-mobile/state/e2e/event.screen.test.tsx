/**
 * Hermetic component render test — event screen (`app/event/index.tsx`).
 *
 * Pins that the screen renders the right VM-driven content for each
 * event kind, dispatches the right action on pick, and gates the
 * skip button on `canSkip`. Drives state via the action layer.
 */

import { afterEach, describe, it, expect, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
        canGoBack: () => true,
    }),
}));

import {
    GameStoreProvider,
    useGameActions,
} from '@/state/GameStoreProvider';
import { createAppStore, EMPTY_EVENT_SLICE, getEmitterForStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import type { ResolveMapEventResult } from '@mechanics';

import DialogueScreen from '@/app/dialogue/index';
import EventScreen from '@/app/event/index';

afterEach(() => {
    jest.restoreAllMocks();
});

function makeStore(): AppStore {
    return createAppStore({ adapter: createMemoryAdapter() });
}

function withProvider(store: AppStore, child: React.ReactNode) {
    return <GameStoreProvider store={store}>{child}</GameStoreProvider>;
}

function setPending(store: AppStore, result: ResolveMapEventResult) {
    store.setState({
        event: { ...EMPTY_EVENT_SLICE, pending: result },
    });
}

function encounter(isBoss = false): ResolveMapEventResult {
    const enemy = {
        id: 'cairn-rot',
        name: 'Cairn-rot',
        level: 3,
        baseStats: { heart: 2, body: 3, mind: 1 },
        health: 24,
        maxHealth: 24,
    } as never;
    return {
        state: undefined as never,
        // Canonical {enemies, origin} shape.
        event: {
            kind: 'encounter',
            encounter: { enemies: [enemy], origin: 'breakwater:bw-2' } as never,
            isBoss,
        },
    };
}

function rest(healed = 6): ResolveMapEventResult {
    return {
        state: undefined as never,
        event: { kind: 'rest', healed, shelter: 'camp' },
    };
}

function cutscene(lines: ReadonlyArray<string>): ResolveMapEventResult {
    return {
        state: undefined as never,
        event: { kind: 'cutscene', lines },
    };
}

function village(villageName: string): ResolveMapEventResult {
    return {
        state: undefined as never,
        event: { kind: 'village', villageName, merchants: [] },
    };
}

function hazard(damage: number): ResolveMapEventResult {
    return {
        state: undefined as never,
        event: { kind: 'hazard', effects: [], damage },
    };
}

function lootCache(items: ReadonlyArray<{ id: string; name: string }>, currency = 0): ResolveMapEventResult {
    return {
        state: undefined as never,
        event: {
            kind: 'loot-cache',
            items: items.map((i) => ({ ...i, category: 'material' } as never)),
            currency,
        },
    };
}

function setDialogueCursor(store: AppStore, choiceText: string) {
    const tree = {
        rootId: 'root',
        nodes: {
            root: {
                id: 'root',
                text: 'A voice speaks.',
                choices: [{ text: choiceText }],
            },
        },
    } as never;
    store.setState({
        event: {
            ...EMPTY_EVENT_SLICE,
            pending: cutscene([]),
            dialogueCursor: { tree, nodeId: 'root' },
        },
    });
}

/**
 * FE-011 — a dialogue tree's closing node has no replies. The reply-list
 * eyebrow must not render over an empty list.
 */
function setDialogueCursorWithNoChoices(store: AppStore) {
    const tree = {
        rootId: 'root',
        nodes: {
            root: {
                id: 'root',
                text: 'Old Marrow nods slowly. Mind the tide.',
                choices: [],
            },
        },
    } as never;
    store.setState({
        event: {
            ...EMPTY_EVENT_SLICE,
            pending: cutscene([]),
            dialogueCursor: { tree, nodeId: 'root' },
        },
    });
}

describe('EventScreen render', () => {
    it('renders combat-prelude with FIGHT and FLEE choices for a non-boss encounter', () => {
        const store = makeStore();
        setPending(store, encounter(false));

        const { getByTestId, getByText } = render(
            withProvider(store, <EventScreen />),
        );

        expect(getByTestId('event-choice-fight')).toBeTruthy();
        expect(getByTestId('event-choice-flee')).toBeTruthy();
        expect(getByText('FIGHT')).toBeTruthy();
        expect(getByText('FLEE')).toBeTruthy();
    });

    it('renders boss combat-prelude with FLEE disabled', () => {
        const store = makeStore();
        setPending(store, encounter(true));

        const { getByTestId } = render(
            withProvider(store, <EventScreen />),
        );

        const flee = getByTestId('event-choice-flee');
        expect(flee.props.accessibilityState?.disabled).toBe(true);
    });

    // Rest events launch the rest-choice session via
    // the resolve interceptor and never reach this modal; a rest result in
    // the slice renders the defensive empty composition (no choices).
    it('renders a rest result as the empty composition (Phase 137)', () => {
        const store = makeStore();
        setPending(store, rest(7));

        const { queryByTestId } = render(
            withProvider(store, <EventScreen />),
        );

        expect(queryByTestId('event-consequence-chips')).toBeNull();
        expect(queryByTestId('event-choice-continue')).toBeNull();
    });

    it('shows the SKIP button when canSkip is true (cutscene)', () => {
        const store = makeStore();
        setPending(store, cutscene(['A vision. A reckoning.']));

        const { getByTestId } = render(
            withProvider(store, <EventScreen />),
        );

        expect(getByTestId('event-skip')).toBeTruthy();
    });

    it('omits the SKIP button when canSkip is false (short rest)', () => {
        const store = makeStore();
        setPending(store, rest(1));

        const { queryByTestId } = render(
            withProvider(store, <EventScreen />),
        );

        expect(queryByTestId('event-skip')).toBeNull();
    });

    it('renders the empty state when no event is active', () => {
        const store = makeStore();
        // pending stays null
        const { getByTestId, getByText } = render(
            withProvider(store, <EventScreen />),
        );

        expect(getByTestId('event-empty')).toBeTruthy();
        expect(getByText('NO EVENT IN PROGRESS')).toBeTruthy();
    });

    it('renders a village event with the village name and a LEAVE choice', () => {
        const store = makeStore();
        setPending(store, village('Hollow Mire'));

        const { getByTestId, getByText } = render(
            withProvider(store, <EventScreen />),
        );

        expect(getByText('HOLLOW MIRE')).toBeTruthy();
        expect(getByTestId('event-choice-leave')).toBeTruthy();
    });

    // Hazard / loot-cache events launch their
    // minigames via the resolve interceptor; results in the slice
    // render the defensive empty composition (no choices, no chips).
    it('renders hazard and loot-cache results as the empty composition (Phase 137)', () => {
        const store = makeStore();
        for (const result of [hazard(4), lootCache([{ id: 'coin', name: 'Tarnished coin' }], 5)]) {
            setPending(store, result);
            const { queryByTestId, queryByText, unmount } = render(
                withProvider(store, <EventScreen />),
            );
            expect(queryByText('ENDURE')).toBeNull();
            expect(queryByText('TAKE IT')).toBeNull();
            expect(queryByTestId('event-consequence-chips')).toBeNull();
            unmount();
        }
    });

    it('renders a cutscene event with the joined lines as body text', () => {
        const store = makeStore();
        setPending(store, cutscene(['First line.', 'Second line.']));

        const { getByText } = render(
            withProvider(store, <EventScreen />),
        );

        // Body merges lines with \n\n; both substrings should be present.
        expect(getByText(/First line\./)).toBeTruthy();
        expect(getByText(/Second line\./)).toBeTruthy();
    });

    // AUDIT [3.2] — narrative-choice reply description is the same
    // string as its label (just re-cased), so it must not also render
    // as an identical sub-line under the button.
    it('does not render a duplicate sub-line for a narrative-choice reply', () => {
        const store = makeStore();
        setDialogueCursor(store, 'Walk on.');

        const { getByText, queryByText } = render(
            withProvider(store, <EventScreen />),
        );

        expect(getByText('WALK ON.')).toBeTruthy();
        expect(queryByText('Walk on.')).toBeNull();
    });
});

describe('EventScreen choice dispatch', () => {
    function PickSpy({
        choiceId,
        onSpy,
    }: {
        choiceId: string;
        onSpy: (spy: jest.Mock) => void;
    }) {
        const actions = useGameActions();
        const spy = jest.fn(actions.pickEventChoice);
        // Replace via mutation so the screen's hook reads the spy.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (actions as any).pickEventChoice = spy;
        React.useEffect(() => onSpy(spy as unknown as jest.Mock), [spy, onSpy]);
        return null;
    }

    it('tapping FIGHT dispatches pickEventChoice("fight")', () => {
        const store = makeStore();
        setPending(store, encounter(false));

        let spy: jest.Mock | null = null;
        const { getByTestId } = render(
            withProvider(
                store,
                <>
                    <PickSpy choiceId="fight" onSpy={(s) => (spy = s)} />
                    <EventScreen />
                </>,
            ),
        );

        fireEvent.press(getByTestId('event-choice-fight'));
        expect(spy).toBeTruthy();
        expect(spy as unknown as jest.Mock).toHaveBeenCalledWith('fight');
    });
});

// The dialogue confirmation flash lives on /dialogue with its kind
// (interactions do not render in the generic modal).
describe('DialogueScreen dialogue confirmation flash (ported Phase 29 Tick C)', () => {
    it('renders a ✓ next to the reply row that matches a dialogue:applied event', () => {
        jest.useFakeTimers();
        const store = makeStore();
        setPending(store, cutscene(['A line.']));

        const { queryByTestId, getByTestId } = render(
            withProvider(store, <DialogueScreen />),
        );

        // No confirmation before any dialogue:applied fires.
        expect(queryByTestId('dialogue-choice-acknowledge-confirmed')).toBeNull();

        // Fire dialogue:applied carrying a choice whose id matches a
        // rendered reply row.
        const emitter = getEmitterForStore(store);
        expect(emitter).not.toBeNull();
        act(() => {
            emitter!.emit({
                type: 'dialogue:applied',
                payload: {
                    action: {
                        type: 'APPLY_DIALOGUE',
                        payload: { choice: { id: 'acknowledge' } },
                    },
                    state: store.getState(),
                } as never,
            });
        });

        // Flash should be visible immediately after the event.
        expect(getByTestId('dialogue-choice-acknowledge-confirmed')).toBeTruthy();

        // Auto-clears after the 500ms TTL.
        act(() => {
            jest.advanceTimersByTime(600);
        });
        expect(queryByTestId('dialogue-choice-acknowledge-confirmed')).toBeNull();

        jest.useRealTimers();
    });

    // AUDIT [3.2] — same guard on the dedicated /dialogue screen's
    // reply rows.
    it('does not render a duplicate sub-line for a reply row', () => {
        const store = makeStore();
        setDialogueCursor(store, 'Walk on.');

        const { getByText, queryByText } = render(
            withProvider(store, <DialogueScreen />),
        );

        expect(getByText('WALK ON.')).toBeTruthy();
        expect(queryByText('Walk on.')).toBeNull();
    });
});

describe('FE-011: the reckoning eyebrow heads a reply list, or nothing', () => {
    it('renders the eyebrow when there are replies', () => {
        const store = makeStore();
        setDialogueCursor(store, 'Walk on.');

        const { getByText } = render(withProvider(store, <DialogueScreen />));

        expect(getByText('WALK ON.')).toBeTruthy();
        expect(getByText(/RECKONING/)).toBeTruthy();
    });

    it('drops the eyebrow on a closing node with no replies', () => {
        const store = makeStore();
        setDialogueCursorWithNoChoices(store);

        const { queryByText, getByTestId } = render(withProvider(store, <DialogueScreen />));

        expect(queryByText(/RECKONING/)).toBeNull();
        // The way out is still there.
        expect(getByTestId('dialogue-leave')).toBeTruthy();
    });
});

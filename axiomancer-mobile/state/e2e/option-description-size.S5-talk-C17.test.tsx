/**
 * Hermetic screen tests — an option's description is the same size wherever
 * it appears (cluster S5-talk-C17).
 *
 * The village stalls printed a ware's description in 8pt uppercase mono —
 * the identical style the inn (`/rest` `offerDesc`) prints at 12 — so the
 * same sentence was comfortable at the inn and fine print at the stall. The
 * dialogue reply's consequence chips carried the same 8pt.
 *
 * Contract asserted here: neither description line is printed below the
 * inn's size.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import DialogueScreen from '@/app/dialogue/index';
import VillageScreen from '@/app/village/index';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

// Hoisted above the imports by babel-plugin-jest-hoist: these screens pop the
// route the moment their slice empties, so the router must be stubbed.
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
        canGoBack: () => true,
    }),
}));

/** The size `/rest` prints its offer descriptions at — the shared floor. */
const INN_DESC_SIZE = 12;

function mount(store: AppStore, child: React.ReactNode) {
    return render(<GameStoreProvider store={store}>{child}</GameStoreProvider>);
}

/** A village whose rest counter prints its described line (NK1c: the stalls became counters). */
function villageStore(): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const state = store.getState();
    store.setState({
        player: { ...state.player, currency: 999 },
        event: {
            ...EMPTY_EVENT_SLICE,
            pending: {
                state: undefined as never,
                event: {
                    kind: 'village',
                    villageName: 'Saltmarsh',
                    merchants: [],
                    rest: { price: 6 },
                } as never,
            },
        },
    });
    return store;
}

/** A parley whose only reply previews a coin consequence. */
function dialogueStore(): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    store.setState({
        event: {
            ...EMPTY_EVENT_SLICE,
            pending: {
                state: undefined as never,
                event: { kind: 'cutscene', lines: [] } as never,
            },
            dialogueCursor: {
                tree: {
                    rootId: 'root',
                    nodes: {
                        root: {
                            id: 'root',
                            text: 'Fetch the net and there is coin in it.',
                            choices: [{ text: 'Consider it done.', effect: { grantCurrency: 3 } }],
                        },
                    },
                } as never,
                nodeId: 'root',
            },
        },
    });
    return store;
}

describe('option descriptions print at one size (S5-talk-C17)', () => {
    it('prints a village counter description no smaller than the inn does', () => {
        const r = mount(villageStore(), <VillageScreen />);
        const style = StyleSheet.flatten(
            r.getByTestId('village-rest-desc').props.style,
        ) as { fontSize?: number };

        expect(style.fontSize).toBeGreaterThanOrEqual(INN_DESC_SIZE);
    });

    it('prints a reply consequence chip no smaller than the inn does', () => {
        const r = mount(dialogueStore(), <DialogueScreen />);
        const style = StyleSheet.flatten(
            r.getByText('+3 shillings').props.style,
        ) as { fontSize?: number };

        expect(style.fontSize).toBeGreaterThanOrEqual(INN_DESC_SIZE);
    });
});

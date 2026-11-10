/**
 * Hermetic screen test, NK1b: the Anvil is a counter inside the village.
 *
 * A village whose payload carries an `anvil` shows a THE ANVIL button that
 * names the cheapest work in shillings; pressing it opens the existing Anvil
 * session (same prices and rules as before) seeded with the payload's variants.
 * A village without a smith shows no such button.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ANVIL_VERB_PRICING } from '@mechanics';
import VillageScreen from '@/app/village/index';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { selectHasActiveBlacksmith } from '@/state/presenters/blacksmith.engine';
import { selectVillageVM } from '@/state/presenters/village.engine';
import { createAppStore, EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
        canGoBack: () => true,
    }),
}));

/** A local fixture: the shipped variant list is empty (EQ4a); the counter carries what it is given. */
const FIXTURE_VARIANT = {
    id: 'fixture-heart-wide-mana',
    name: 'Fixture Fitting',
    gear: { dieColor: 'heart', specialFaces: 1, manaFaces: 3 },
} as const;

function makeStore(anvil: boolean): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    store.setState({
        event: {
            ...EMPTY_EVENT_SLICE,
            pending: {
                state: undefined as never,
                event: {
                    kind: 'village',
                    villageName: 'The Fishing Hamlet',
                    merchants: [],
                    ...(anvil ? { anvil: { variants: [FIXTURE_VARIANT] } } : {}),
                } as never,
            },
        },
    });
    return store;
}

function renderVillage(store: AppStore) {
    return render(
        <GameStoreProvider store={store}>
            <VillageScreen />
        </GameStoreProvider>,
    );
}

describe('the village Anvil counter (NK1b A7)', () => {
    it('the presenter names the cheapest work and carries the variants', () => {
        const vm = selectVillageVM(makeStore(true).getState());
        expect(vm.anvil).toEqual({ variants: [FIXTURE_VARIANT], cheapestWork: ANVIL_VERB_PRICING.hone });
    });

    it('a village without a smith has no counter', () => {
        const store = makeStore(false);
        expect(selectVillageVM(store.getState()).anvil).toBeNull();
        renderVillage(store);
        expect(screen.queryByTestId('village-anvil')).toBeNull();
    });

    it('pressing the counter opens the Anvil session with the offered variants', () => {
        const store = makeStore(true);
        renderVillage(store);
        // 168.3: the hub's BLACKSMITH button carries no price on its plate
        // (V-02b); it still reads the smith's cheapest work aloud.
        expect(screen.getByTestId('village-anvil').props.accessibilityLabel).toContain(
            `cheapest work is ${ANVIL_VERB_PRICING.hone} shillings`,
        );
        expect(selectHasActiveBlacksmith(store.getState())).toBe(false);
        fireEvent.press(screen.getByTestId('village-anvil'));
        expect(selectHasActiveBlacksmith(store.getState())).toBe(true);
        expect(store.getState().blacksmith.session?.variants.map((v) => v.id)).toContain(FIXTURE_VARIANT.id);
        // The village event stays pending underneath, so leaving the anvil lands on the hub.
        expect(store.getState().event.pending?.event.kind).toBe('village');
    });
});

/**
 * Hermetic e2e — the Blacksmith's work screen (168.5, VL1e).
 *
 * The forge opens straight onto the work screen (no intro step); tabs choose
 * one die at a time; HONE works the chosen die; a die with no MISS face has
 * HONE refused on the disabled plate with its reason named.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import BlacksmithScreen from '@/app/blacksmith/index';
import { beginBlacksmithAction } from '@/state/blacksmith/store-actions';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

// The screen pops the route when its slice empties, so the router is stubbed.
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
        canGoBack: () => true,
    }),
}));

function anvil(currency = 100): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const { player } = store.getState();
    store.setState({ player: { ...player, currency } } as never);
    expect(beginBlacksmithAction(store, { seed: 7 })).toBe(true);
    return store;
}

function renderAnvil(store: AppStore) {
    return render(
        <GameStoreProvider store={store}>
            <BlacksmithScreen />
        </GameStoreProvider>,
    );
}

function faceTexts(r: ReturnType<typeof renderAnvil>, color: string): string[] {
    return [0, 1, 2, 3, 4, 5].map((i) => {
        const tile = r.getByTestId(`blacksmith-die-${color}-face-${i}`);
        return String(tile.findByType(require('react-native').Text).props.children);
    });
}

describe('blacksmith work screen (VL1e)', () => {
    it('opens straight onto the work screen with no intro step', () => {
        const store = anvil();
        expect(store.getState().blacksmith.session?.phase).toBe('forging');

        const r = renderAnvil(store);

        expect(r.getByTestId('blacksmith-forging')).toBeTruthy();
        expect(r.queryByTestId('blacksmith-intro')).toBeNull();
        expect(r.queryByTestId('blacksmith-begin')).toBeNull();
        expect(r.getByTestId('blacksmith-smith')).toBeTruthy();
        expect(r.getByTestId('blacksmith-offer-hone:heart')).toBeTruthy();
        expect(r.getByTestId('blacksmith-offer-temper:heart')).toBeTruthy();
        expect(r.getByTestId('blacksmith-offer-upgrade')).toBeTruthy();
        expect(r.getByTestId('blacksmith-leave')).toBeTruthy();
        expect(r.getByTestId('blacksmith-abandon')).toBeTruthy();
        // No smith offers a variant today, so SWAP is not drawn.
        expect(r.queryByTestId('blacksmith-swap-swap:anything')).toBeNull();
    });

    it('shows one die at a time and switches dice by tab', () => {
        const r = renderAnvil(anvil());

        expect(r.getByTestId('blacksmith-die-heart')).toBeTruthy();
        expect(r.queryByTestId('blacksmith-die-body')).toBeNull();
        expect(faceTexts(r, 'heart')).toEqual(['BOON', 'MANA', 'MANA', 'MISS', 'MISS', 'MISS']);

        fireEvent.press(r.getByTestId('blacksmith-tab-body'));

        expect(r.queryByTestId('blacksmith-die-heart')).toBeNull();
        expect(r.getByTestId('blacksmith-die-body')).toBeTruthy();
        // The verbs now work the body die.
        expect(r.getByTestId('blacksmith-offer-hone:body')).toBeTruthy();
        expect(r.queryByTestId('blacksmith-offer-hone:heart')).toBeNull();
    });

    it('a hone adds a MANA face to the chosen die and charges its price', () => {
        const store = anvil(100);
        const r = renderAnvil(store);
        const before = store.getState().blacksmith.session!.rail.mind.manaFaces;

        fireEvent.press(r.getByTestId('blacksmith-tab-mind'));
        fireEvent.press(r.getByTestId('blacksmith-offer-hone:mind'));

        expect(r.getByTestId('blacksmith-card')).toBeTruthy();
        expect(store.getState().blacksmith.session!.rail.mind.manaFaces).toBe(before + 1);
        fireEvent.press(r.getByTestId('blacksmith-continue'));
        expect(r.getByTestId('blacksmith-forging')).toBeTruthy();
        expect(r.getByTestId('blacksmith-budget')).toHaveTextContent(/SHILLINGS/);
    });

    it('a die with no MISS face has HONE refused: disabled plate, reason named, nothing happens', () => {
        const store = anvil(100);
        const s = store.getState().blacksmith.session!;
        store.setState({
            blacksmith: {
                session: { ...s, rail: { ...s.rail, heart: { ...s.rail.heart, specialFaces: 2, manaFaces: 4 } } },
            },
        } as never);

        const r = renderAnvil(store);

        const hone = r.getByTestId('blacksmith-offer-hone:heart');
        expect(hone.props.accessibilityState).toMatchObject({ disabled: true });
        expect(r.getByTestId('blacksmith-offer-hone:heart-reason')).toHaveTextContent(/miss face/i);
        fireEvent.press(hone);
        expect(store.getState().blacksmith.session!.phase).toBe('forging');
        expect(store.getState().blacksmith.session!.rail.heart.manaFaces).toBe(4);
    });
});

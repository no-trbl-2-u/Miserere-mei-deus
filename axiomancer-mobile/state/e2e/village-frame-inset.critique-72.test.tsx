/**
 * Hermetic screen test — the settlement's heading and exit sit inside the
 * backdrop's vignette frame (CRITIQUE pass 72).
 *
 * `ScreenBg` draws its plate inside a dark border `SCREEN_FRAME_INSET`
 * wide. The rest, cache and item-reward screens centre their column, so it
 * clears the frame; the settlement top-aligns its scroller, and at a 14pt
 * pad its SETTLEMENT kicker sat on the frame above the plate and the TAKE
 * THE ROAD bar ran across the bottom band.
 *
 * Contract asserted here: the scroller's top padding and the exit bar's
 * bottom padding are each at least the frame inset.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import VillageScreen from '@/app/village/index';
import VillageRestScreen from '@/app/village/rest';
import VillageShopScreen from '@/app/village/shop';
import { SCREEN_FRAME_INSET } from '@/components/ScreenBg';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

// Hoisted above the imports by babel-plugin-jest-hoist: this screen pops the
// route the moment its slice empties, so the router must be stubbed.
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
        canGoBack: () => true,
    }),
}));

/**
 * Seat a village with no merchants and no shop.
 *
 * Input: none. Output: a fresh `AppStore` on a memory adapter whose event
 * slice holds the settlement. Resolves: critique pass 72 — the frame inset
 * does not depend on what the stalls sell.
 */
function villageStore(): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    store.setState({
        event: {
            ...EMPTY_EVENT_SLICE,
            pending: {
                state: undefined as never,
                event: { kind: 'village', villageName: 'Saltmarsh', merchants: [] } as never,
            },
        },
    });
    return store;
}

/**
 * Collapse a React Native `style` prop into one plain object.
 *
 * Input: the raw `style` prop of a rendered element. Output: a flat record
 * of resolved declarations. Resolves: critique pass 72 — reads padding off
 * the tree without a layout engine.
 */
function flattenStyle(style: unknown): Record<string, unknown> {
    return (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;
}

describe('village rows sit inside the vignette frame (critique pass 72)', () => {
    const mount = () =>
        render(
            <GameStoreProvider store={villageStore()}>
                <VillageScreen />
            </GameStoreProvider>,
        );

    it('pads the scroller top by at least the frame inset', () => {
        const scroll = mount().getByTestId('village-scroll');
        const top = flattenStyle(scroll.props.contentContainerStyle).paddingTop;
        expect(top).toBeGreaterThanOrEqual(SCREEN_FRAME_INSET);
    });

    it('pads the exit bar bottom by at least the frame inset', () => {
        const bar = mount().getByTestId('village-exit-bar');
        expect(flattenStyle(bar.props.style).paddingBottom).toBeGreaterThanOrEqual(SCREEN_FRAME_INSET);
    });

    it('clears the frame on each counter screen too (168.3)', () => {
        for (const [Screen, prefix] of [[VillageRestScreen, 'village-rest-screen'], [VillageShopScreen, 'village-shop']] as const) {
            const r = render(
                <GameStoreProvider store={villageStore()}>
                    <Screen />
                </GameStoreProvider>,
            );
            const top = flattenStyle(r.getByTestId(`${prefix}-scroll`).props.contentContainerStyle).paddingTop;
            expect(top).toBeGreaterThanOrEqual(SCREEN_FRAME_INSET);
            const bottom = flattenStyle(r.getByTestId(`${prefix}-exit-bar`).props.style).paddingBottom;
            expect(bottom).toBeGreaterThanOrEqual(SCREEN_FRAME_INSET);
            r.unmount();
        }
    });
});

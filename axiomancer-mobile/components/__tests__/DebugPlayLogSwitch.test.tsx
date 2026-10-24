/**
 * Hermetic component tests — DebugPlayLogSwitch (phase BE2b, A4).
 *
 * Pins:
 *   - the "Card & combat logging" row shows on in a dev build by default
 *   - a tap flips the dev setting and the row reads it back
 *   - the sub line says nothing is sent without the API
 *   - renders null outside dev builds
 */

import { afterEach, describe, expect, it } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DebugPlayLogSwitch } from '@/components/DebugPlayLogSwitch';
import { createDevSettingsStore } from '@/state/dev/dev-settings';

const memoryStorage = () => {
    const bag = new Map<string, string>();
    return { getItem: async (k: string) => bag.get(k) ?? null, setItem: async (k: string, v: string) => { bag.set(k, v); } };
};

afterEach(() => {
    delete process.env.EXPO_PUBLIC_PUZZLE_API_URL;
    delete process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN;
});

describe('DebugPlayLogSwitch', () => {
    it('shows the row checked by default and flips the dev setting on tap', () => {
        process.env.EXPO_PUBLIC_PUZZLE_API_URL = 'https://miserere-api.example.workers.dev';
        process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN = 'dev-token';
        const store = createDevSettingsStore({ storage: memoryStorage() });
        const tree = render(<DebugPlayLogSwitch store={store} />);
        const toggle = tree.getByTestId('debug-play-log-toggle');
        expect(tree.getByText('Card & combat logging')).toBeTruthy();
        expect(toggle.props.accessibilityState).toEqual({ checked: true });
        expect(tree.getByTestId('debug-play-log-sub').props.children).toMatch(/^on/);

        fireEvent.press(toggle);
        expect(store.get().playLogging).toBe(false);
        expect(tree.getByTestId('debug-play-log-toggle').props.accessibilityState).toEqual({ checked: false });
        expect(tree.getByTestId('debug-play-log-sub').props.children).toMatch(/^off/);
    });

    it('says nothing is sent when the build has no API', () => {
        const tree = render(<DebugPlayLogSwitch store={createDevSettingsStore({ storage: memoryStorage() })} />);
        expect(tree.getByTestId('debug-play-log-sub').props.children).toMatch(/no API/);
    });

    it('renders null when __DEV__ is false (production build simulation)', () => {
        const g = global as unknown as { __DEV__: boolean };
        const original = g.__DEV__;
        g.__DEV__ = false;
        try {
            const tree = render(<DebugPlayLogSwitch store={createDevSettingsStore({ storage: memoryStorage() })} />);
            expect(tree.queryByTestId('debug-play-log')).toBeNull();
        } finally {
            g.__DEV__ = original;
        }
    });
});

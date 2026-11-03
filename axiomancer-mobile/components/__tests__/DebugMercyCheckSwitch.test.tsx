/**
 * Hermetic component tests — DebugMercyCheckSwitch.
 *
 * Pins: the row starts off, a tap flips the dev setting and the row reads it
 * back, and it renders nothing outside dev builds.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DebugMercyCheckSwitch } from '@/components/DebugMercyCheckSwitch';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { createDevSettingsStore } from '@/state/dev/dev-settings';

jest.mock('@/lib/buildProfile', () => ({
    isDevToolsEnabled: jest.fn(() => true),
}));

const memoryStorage = () => {
    const bag = new Map<string, string>();
    return { getItem: async (k: string) => bag.get(k) ?? null, setItem: async (k: string, v: string) => { bag.set(k, v); } };
};

describe('DebugMercyCheckSwitch', () => {
    it('starts off, and a tap forces the check', () => {
        const store = createDevSettingsStore({ storage: memoryStorage() });
        const { getByTestId, getByText } = render(<DebugMercyCheckSwitch store={store} />);
        getByText(/the normal chance/);
        fireEvent.press(getByTestId('debug-mercy-check-toggle'));
        expect(store.get().forceMercyCheck).toBe(true);
        getByText(/every normal foe asks/);
    });

    it('renders nothing outside dev builds', () => {
        (isDevToolsEnabled as jest.Mock).mockReturnValueOnce(false);
        const store = createDevSettingsStore({ storage: memoryStorage() });
        const { queryByTestId } = render(<DebugMercyCheckSwitch store={store} />);
        expect(queryByTestId('debug-mercy-check')).toBeNull();
    });
});

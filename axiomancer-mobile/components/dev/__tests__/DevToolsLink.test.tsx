/**
 * Hermetic component tests — DevToolsLink.
 *
 * Pins the Settings affordance that opens the dedicated `/dev` route:
 *   - DEV gate (production renders null — no dev affordance in Settings)
 *   - Renders the link in dev builds
 *   - Tapping pushes the `/dev` route
 */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true }),
}));

import { DevToolsLink } from '@/components/dev/DevToolsLink';

describe('DevToolsLink: DEV gate', () => {
    it('renders the link when __DEV__ is true (jest default)', () => {
        const tree = render(<DevToolsLink />);
        expect(tree.queryByTestId('settings-dev-tools-link')).not.toBeNull();
    });

    it('renders null when __DEV__ is false (production build simulation)', () => {
        const g = global as unknown as { __DEV__: boolean };
        const original = g.__DEV__;
        g.__DEV__ = false;
        try {
            const tree = render(<DevToolsLink />);
            expect(tree.queryByTestId('settings-dev-tools-link')).toBeNull();
        } finally {
            g.__DEV__ = original;
        }
    });
});

describe('DevToolsLink: navigation', () => {
    it('pushes the /dev route when pressed', () => {
        mockPush.mockClear();
        const tree = render(<DevToolsLink />);
        fireEvent.press(tree.getByTestId('settings-dev-tools-link'));
        expect(mockPush).toHaveBeenCalledWith('/dev');
    });
});

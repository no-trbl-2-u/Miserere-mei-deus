/**
 * SettingsBody under the brass kit: every section heading but the first sits
 * under a brass divider (MOTION, SOUND, STORY, THE RUN, FEEDBACK, THIS DEVICE).
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import SettingsScreen from '@/app/settings/index';
import { createMemorySlotStore } from '@/state/persistence/memorySlotStore';
import { createSettingsStore } from '@/state/settings';
import { createAppStore } from '@/state/store';
import { withAllProviders } from '@/test-utils/withAllProviders';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
    useLocalSearchParams: () => ({}),
}));

jest.mock('@/components/experience/KitBackdrop', () => {
    const { Text } = jest.requireActual('react-native') as typeof import('react-native');
    const React = jest.requireActual('react') as typeof import('react');
    const actual = jest.requireActual('@/components/experience/KitBackdrop') as Record<string, unknown>;
    const Piece = ({ piece }: { piece: string }) => React.createElement(Text, { testID: `piece-${piece}` }, piece);
    const Divider = ({ piece }: { piece: string }) => React.createElement(Text, { testID: `divider-${piece}` }, piece);
    return { ...actual, KitBackdrop: Piece, KitImage: Piece, KitDivider: Divider };
});

const NO_STORAGE = { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined };

describe('SettingsBody dividers', () => {
    it('puts a brass divider above THE RUN, FEEDBACK and THIS DEVICE as well as the first three', () => {
        const slots = createMemorySlotStore({ activeSlot: 1 });
        const store = createAppStore({ adapter: slots });
        const settings = createSettingsStore({ storage: NO_STORAGE });
        render(withAllProviders(<SettingsScreen />, { store, slots, settings }).tree);
        // MOTION and SOUND and STORY, THE RUN (in a run), FEEDBACK, THIS DEVICE: six dividers.
        expect(screen.getAllByTestId(/^divider-divider-/)).toHaveLength(6);
        expect(screen.getAllByTestId('divider-divider-short-brass')).toHaveLength(2);
    });
});

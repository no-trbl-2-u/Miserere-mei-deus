/**
 * SettingsBody under the brass kit: every section heading but the first sits
 * under a brass divider (MOTION, SOUND, STORY, THE RUN, RULES, FEEDBACK, THIS DEVICE).
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import SettingsScreen from '@/app/settings/index';
import SettingsTabScreen from '@/app/(tabs)/settings';
import { keywordGloss, SYSTEM_GLOSSARY } from '@/state/combat/keywords';
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

describe('SettingsBody dev tools row', () => {
    const renderSettings = () => {
        const slots = createMemorySlotStore({ activeSlot: 1 });
        const store = createAppStore({ adapter: slots });
        const settings = createSettingsStore({ storage: NO_STORAGE });
        render(withAllProviders(<SettingsScreen />, { store, slots, settings }).tree);
    };

    it('shows the DEV TOOLS link under the dev gate', () => {
        renderSettings();
        expect(screen.getByTestId('settings-dev-tools-link')).toBeTruthy();
    });

    it('is the last row of the screen, on the route and on the tab', () => {
        for (const Screen of [SettingsScreen, SettingsTabScreen]) {
            const slots = createMemorySlotStore({ activeSlot: 1 });
            const store = createAppStore({ adapter: slots });
            const settings = createSettingsStore({ storage: NO_STORAGE });
            const view = render(withAllProviders(<Screen />, { store, slots, settings }).tree);
            const link = view.getByTestId('settings-dev-tools-link');
            const reset = view.getByTestId('settings-reset');
            const ids: string[] = [];
            const walk = (n: { type?: unknown; props?: { testID?: string }; children?: unknown[] } | string): void => {
                if (typeof n === 'string') return;
                if (n.props?.testID === 'settings-reset' || n.props?.testID === 'settings-dev-tools-link') ids.push(n.props.testID);
                (n.children ?? []).forEach((c) => walk(c as never));
            };
            walk(view.toJSON() as never);
            expect(link).toBeTruthy();
            expect(reset).toBeTruthy();
            expect(ids.indexOf('settings-dev-tools-link')).toBeGreaterThan(ids.indexOf('settings-reset'));
            view.unmount();
        }
    });

    it('hides the link outside dev builds', () => {
        const g = global as unknown as { __DEV__: boolean };
        const original = g.__DEV__;
        g.__DEV__ = false;
        try {
            renderSettings();
            expect(screen.queryByTestId('settings-dev-tools-link')).toBeNull();
        } finally {
            g.__DEV__ = original;
        }
    });
});

describe('SettingsBody dividers', () => {
    it('puts a brass divider above THE RUN, RULES, FEEDBACK and THIS DEVICE as well as the first three', () => {
        const slots = createMemorySlotStore({ activeSlot: 1 });
        const store = createAppStore({ adapter: slots });
        const settings = createSettingsStore({ storage: NO_STORAGE });
        render(withAllProviders(<SettingsScreen />, { store, slots, settings }).tree);
        // MOTION and SOUND and STORY, THE RUN (in a run), RULES, FEEDBACK, THIS DEVICE: seven dividers.
        expect(screen.getAllByTestId(/^divider-divider-/)).toHaveLength(7);
        expect(screen.getAllByTestId('divider-divider-short-brass')).toHaveLength(3);
    });
});

describe('SettingsBody rules glossary', () => {
    it.each([
        ['route', SettingsScreen],
        ['tab', SettingsTabScreen],
    ])('opens a list of every shared glossary term on the %s and closes again', (_name, Screen) => {
        const slots = createMemorySlotStore({ activeSlot: null });
        const store = createAppStore({ adapter: slots });
        const settings = createSettingsStore({ storage: NO_STORAGE });
        render(withAllProviders(<Screen />, { store, slots, settings }).tree);
        expect(screen.queryByTestId('rules-glossary-sheet-list')).toBeNull();
        fireEvent.press(screen.getByTestId('settings-rules-glossary'));
        expect(screen.getAllByTestId('rules-glossary-sheet-entry')).toHaveLength(SYSTEM_GLOSSARY.length + 2);
        const expected = [
            ...SYSTEM_GLOSSARY,
            { term: 'VULNERABLE', def: keywordGloss('Vulnerable') as string },
            { term: 'DISCARD', def: keywordGloss('Discard') as string },
        ];
        for (const { term, def } of expected) {
            expect(screen.getByText(term)).toBeTruthy();
            expect(screen.getByText(def)).toBeTruthy();
        }
        expect(screen.getByText('READING A LINE')).toBeTruthy();
        expect(screen.getByText('GLOBAL')).toBeTruthy();
        fireEvent.press(screen.getByTestId('rules-glossary-sheet-close'));
        expect(screen.queryByTestId('rules-glossary-sheet-list')).toBeNull();
    });
});

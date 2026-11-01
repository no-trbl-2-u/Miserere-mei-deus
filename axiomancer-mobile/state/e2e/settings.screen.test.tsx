/**
 * Hermetic E2E — the `/settings` screen over its
 * own settings store and an in-memory slot store.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, describe, expect, it, jest } from '@jest/globals';

import SettingsTabScreen from '@/app/(tabs)/settings/index';
import SettingsScreen from '@/app/settings/index';
import { createMemorySlotStore } from '@/state/persistence/memorySlotStore';
import { DEFAULT_SETTINGS, createSettingsStore } from '@/state/settings';
import { createAppStore } from '@/state/store';
import { withAllProviders } from '@/test-utils/withAllProviders';
import { DEFAULT_THEME_ID } from '@/theme/palette';
import { getActiveThemeId, setActiveTheme } from '@/theme/runtime';

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: mockBack, canGoBack: () => true }),
    useLocalSearchParams: () => ({}),
}));

afterEach(() => {
    jest.clearAllMocks();
    setActiveTheme(DEFAULT_THEME_ID);
});

const NO_STORAGE = { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined };

function mount(inRun: boolean, Screen: React.ComponentType = SettingsScreen) {
    const slots = createMemorySlotStore({ activeSlot: inRun ? 1 : null });
    const store = createAppStore({ adapter: slots });
    const settings = createSettingsStore({ storage: NO_STORAGE });
    const { tree } = withAllProviders(<Screen />, { store, slots, settings });
    render(tree);
    return { store, slots, settings };
}

describe('/settings', () => {
    it('renders every player row, with the theme picker expanded', () => {
        mount(false);
        expect(screen.getByTestId('theme-switcher')).toBeTruthy();
        expect(screen.getByTestId('theme-ashen-gold')).toBeTruthy();
        for (const id of ['settings-text-scale', 'settings-card-text', 'settings-reduced-motion', 'settings-haptics', 'settings-music-on', 'settings-music', 'settings-feedback', 'settings-sfx', 'settings-story-mode', 'settings-reset']) {
            expect(screen.getByTestId(id)).toBeTruthy();
        }
        // Story mode is listed but not yet a choice.
        expect(screen.getByTestId('settings-story-mode').props.accessibilityState?.disabled).toBe(true);
        // The run-only row is absent outside a run.
        expect(screen.queryByTestId('settings-return-to-title')).toBeNull();
    });

    it('segmented rows write the settings store', () => {
        const { settings } = mount(false);
        act(() => { fireEvent.press(screen.getByTestId('settings-text-scale-1.3')); });
        act(() => { fireEvent.press(screen.getByTestId('settings-reduced-motion-on')); });
        act(() => { fireEvent.press(screen.getByTestId('settings-haptics-false')); });
        expect(settings.get()).toEqual({ ...DEFAULT_SETTINGS, textScale: 1.3, reducedMotion: 'on', haptics: false });
    });

    it('Card text is Words until Glyphs is pressed, and writes the store', () => {
        const { settings } = mount(false);
        expect(settings.get().cardText).toBe('words');
        act(() => { fireEvent.press(screen.getByTestId('settings-card-text-glyphs')); });
        expect(settings.get().cardText).toBe('glyphs');
        act(() => { fireEvent.press(screen.getByTestId('settings-card-text-words')); });
        expect(settings.get().cardText).toBe('words');
    });

    it('volume steppers move by 10 and clamp', () => {
        const { settings } = mount(false);
        act(() => { fireEvent.press(screen.getByTestId('settings-music-up')); });
        expect(settings.get().musicVolume).toBe(DEFAULT_SETTINGS.musicVolume + 10);
        expect(screen.getByTestId('settings-music-value').props.children).toBe(`${DEFAULT_SETTINGS.musicVolume + 10}%`);
        for (let i = 0; i < 12; i++) act(() => { fireEvent.press(screen.getByTestId('settings-sfx-down')); });
        expect(settings.get().sfxVolume).toBe(0);
    });

    it('RESET SETTINGS asks, then restores the defaults', () => {
        const { settings } = mount(false);
        settings.set({ haptics: false, textScale: 0.9 });
        act(() => { fireEvent.press(screen.getByTestId('settings-reset')); });
        act(() => { fireEvent.press(screen.getByTestId('settings-reset-confirm-confirm')); });
        expect(settings.get()).toEqual(DEFAULT_SETTINGS);
    });

    it('RESET SETTINGS also restores the colour theme, as its body promises', () => {
        mount(false);
        act(() => { setActiveTheme('ember-depths'); });
        expect(getActiveThemeId()).toBe('ember-depths');
        act(() => { fireEvent.press(screen.getByTestId('settings-reset')); });
        act(() => { fireEvent.press(screen.getByTestId('settings-reset-confirm-confirm')); });
        expect(getActiveThemeId()).toBe(DEFAULT_THEME_ID);
    });

    it('inside a run: RETURN TO TITLE saves and lands on the menu', async () => {
        const { store, slots } = mount(true);
        store.setState({ flags: ['keepsake'] } as never);

        await act(async () => { fireEvent.press(screen.getByTestId('settings-return-to-title')); });
        expect(slots.readSlot(1)?.flags).toEqual(['keepsake']);
        expect(mockReplace).toHaveBeenCalledWith('/?menu=1');
    });

    it('the back control pops the screen', () => {
        mount(false);
        act(() => { fireEvent.press(screen.getByTestId('settings-back')); });
        expect(mockBack).toHaveBeenCalledTimes(1);
    });
});

describe('the music switch', () => {
    it('writes musicOn, keeps the volume, and RESET turns it back on', () => {
        const { settings } = mount(false);
        act(() => { fireEvent.press(screen.getByTestId('settings-music-on-false')); });
        expect(settings.get().musicOn).toBe(false);
        expect(settings.get().musicVolume).toBe(DEFAULT_SETTINGS.musicVolume);
        act(() => { fireEvent.press(screen.getByTestId('settings-reset')); });
        act(() => { fireEvent.press(screen.getByTestId('settings-reset-confirm-confirm')); });
        expect(settings.get().musicOn).toBe(true);
    });
});

describe('the two hosts', () => {
    it('the route host has the close control; the tab host has none', () => {
        const route = mount(false, SettingsScreen);
        expect(screen.getByTestId('settings-screen')).toBeTruthy();
        expect(screen.getByTestId('settings-back')).toBeTruthy();
        void route;
    });

    it('the tab host renders the same body without the close control', () => {
        mount(false, SettingsTabScreen);
        expect(screen.getByTestId('settings-screen')).toBeTruthy();
        expect(screen.getByTestId('settings-feedback')).toBeTruthy();
        expect(screen.queryByTestId('settings-back')).toBeNull();
    });
});

describe('SEND FEEDBACK', () => {
    const open = () => { act(() => { fireEvent.press(screen.getByTestId('settings-feedback')); }); };

    it('SUBMIT is disabled until a kind is picked and text is typed, then closes with the thanks line', () => {
        mount(false);
        open();
        const submit = () => screen.getByTestId('feedback-sheet-submit');
        expect(submit().props.accessibilityState?.disabled).toBe(true);
        act(() => { fireEvent.changeText(screen.getByTestId('feedback-sheet-text'), 'the map jumps'); });
        expect(submit().props.accessibilityState?.disabled).toBe(true);
        act(() => { fireEvent.press(screen.getByTestId('feedback-sheet-kind-bug')); });
        expect(submit().props.accessibilityState?.disabled).toBe(false);
        expect(screen.getByTestId('feedback-sheet-count').props.children).toBe('13 / 1000');
        act(() => { fireEvent.press(submit()); });
        expect(screen.queryByTestId('feedback-sheet-text')).toBeNull();
        expect(screen.getByTestId('settings-feedback-thanks')).toBeTruthy();
    });

    it('CANCEL and the back gesture close it and the text is gone on reopening', () => {
        mount(false);
        open();
        act(() => { fireEvent.changeText(screen.getByTestId('feedback-sheet-text'), 'draft'); });
        act(() => { fireEvent.press(screen.getByTestId('feedback-sheet-cancel')); });
        expect(screen.queryByTestId('feedback-sheet-text')).toBeNull();
        expect(screen.queryByTestId('settings-feedback-thanks')).toBeNull();
        open();
        expect(screen.getByTestId('feedback-sheet-text').props.value).toBe('');
        act(() => { fireEvent(screen.getByTestId('feedback-sheet'), 'requestClose'); });
        expect(screen.queryByTestId('feedback-sheet-text')).toBeNull();
    });

    it('a tap outside closes it', () => {
        mount(false);
        open();
        act(() => { fireEvent.press(screen.getByTestId('feedback-sheet-backdrop')); });
        expect(screen.queryByTestId('feedback-sheet-text')).toBeNull();
    });
});

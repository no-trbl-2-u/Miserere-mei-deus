/**
 * @jest-environment jsdom
 */

/**
 * BackgroundMusic, web: a browser blocks sound until the player touches the
 * page, so the music starts on the first tap or key press and not before.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

interface MockPlayer { play: jest.Mock; pause: jest.Mock; setVolume: jest.Mock; release: jest.Mock }
const mockPlayers: MockPlayer[] = [];
jest.mock('@/lib/platform/audio', () => ({
    createLoopingPlayer: jest.fn(() => {
        const player = { play: jest.fn(), pause: jest.fn(), setVolume: jest.fn(), release: jest.fn() };
        mockPlayers.push(player);
        return player;
    }),
}));

import { BackgroundMusic } from '@/components/BackgroundMusic';
import { createSettingsStore } from '@/state/settings';
import { withAllProviders } from '@/test-utils/withAllProviders';

const NO_STORAGE = {
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
};

function mount() {
    const settings = createSettingsStore({ storage: NO_STORAGE });
    const { tree } = withAllProviders(<BackgroundMusic />, { settings });
    return render(tree);
}

beforeEach(() => {
    mockPlayers.length = 0;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    Object.defineProperty(globalThis.navigator, 'userActivation', {
        configurable: true,
        value: { hasBeenActive: false },
    });
});

afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    Reflect.deleteProperty(globalThis.navigator, 'userActivation');
});

describe('BackgroundMusic, web autoplay', () => {
    it('does not play before the first gesture', () => {
        mount();
        expect(mockPlayers.every((p) => p.play.mock.calls.length === 0)).toBe(true);
    });

    it('starts on the first pointer release', () => {
        mount();
        act(() => { document.dispatchEvent(new Event('pointerup')); });
        expect(mockPlayers).toHaveLength(1);
        expect(mockPlayers[0]!.play).toHaveBeenCalledTimes(1);
    });

    it('starts on the first key press', () => {
        mount();
        act(() => { document.dispatchEvent(new Event('keydown')); });
        expect(mockPlayers[0]!.play).toHaveBeenCalledTimes(1);
    });

    it('starts at once when the page has already had a gesture', () => {
        Object.defineProperty(globalThis.navigator, 'userActivation', {
            configurable: true,
            value: { hasBeenActive: true },
        });
        mount();
        expect(mockPlayers[0]!.play).toHaveBeenCalledTimes(1);
    });
});

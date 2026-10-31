/**
 * BackgroundMusic: T's theme loops under the whole game, paused while a fight
 * or hazard is staged. The audio seam is mocked; the player records its calls.
 *
 * The web first-gesture start lives in `BackgroundMusic.web.test.tsx` (jsdom).
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';

interface MockPlayer { play: jest.Mock; pause: jest.Mock; setVolume: jest.Mock; release: jest.Mock; isPlaying: jest.Mock }
const mockPlayers: MockPlayer[] = [];
jest.mock('@/lib/platform/audio', () => ({
    configureGameAudio: jest.fn(),
    createLoopingPlayer: jest.fn(() => {
        const player = { play: jest.fn(), pause: jest.fn(), setVolume: jest.fn(), release: jest.fn(), isPlaying: jest.fn(() => true) };
        mockPlayers.push(player);
        return player;
    }),
}));

import { BackgroundMusic } from '@/components/BackgroundMusic';
import { configureGameAudio, createLoopingPlayer } from '@/lib/platform/audio';
import { useCombatMode, type CombatModeApi } from '@/state/combat-mode';
import { createSettingsStore } from '@/state/settings';
import { withAllProviders } from '@/test-utils/withAllProviders';

const NO_STORAGE = {
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
};

const FOE = { enemies: [{ id: 'x' }] } as never;

function mount(initialVolume = 70) {
    const settings = createSettingsStore({ storage: NO_STORAGE, initial: { musicVolume: initialVolume } });
    const { store, tree } = withAllProviders(<BackgroundMusic />, { settings });
    const rendered = render(tree);
    return { store, settings, rendered, tree };
}

const player = () => mockPlayers[0]!;
const lastVolume = () => player().setVolume.mock.calls.at(-1)?.[0] as number;
const advance = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });

beforeEach(() => {
    jest.useFakeTimers();
    mockPlayers.length = 0;
    (createLoopingPlayer as jest.Mock).mockClear();
    (configureGameAudio as jest.Mock).mockClear();
});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});

describe('BackgroundMusic', () => {
    it('starts on mount and fades in to musicVolume / 100', () => {
        mount(70);
        expect(createLoopingPlayer).toHaveBeenCalledTimes(1);
        expect(player().play).toHaveBeenCalledTimes(1);
        expect(lastVolume()).toBeLessThan(0.7);

        advance(2000);
        expect(lastVolume()).toBeCloseTo(0.7, 5);
        expect(player().pause).not.toHaveBeenCalled();
    });

    it('stays silent and unstarted at volume 0', () => {
        mount(0);
        advance(3000);
        expect(mockPlayers.every((p) => p.play.mock.calls.length === 0)).toBe(true);
    });

    it('fades out and pauses when a fight is staged, then resumes and fades in when it ends', () => {
        const { store } = mount(70);
        advance(2000);

        act(() => { store.setState({ currentEncounter: FOE }); });
        advance(250);
        expect(lastVolume()).toBeLessThan(0.7);
        expect(player().pause).not.toHaveBeenCalled();
        advance(300);
        expect(lastVolume()).toBe(0);
        expect(player().pause).toHaveBeenCalledTimes(1);

        player().play.mockClear();
        act(() => { store.setState({ currentEncounter: undefined } as never); });
        expect(player().play).toHaveBeenCalledTimes(1);
        advance(1000);
        expect(lastVolume()).toBeGreaterThan(0);
        expect(lastVolume()).toBeLessThan(0.7);
        advance(1000);
        expect(lastVolume()).toBeCloseTo(0.7, 5);
        // One player for the whole session: resuming never reloads the track.
        expect(createLoopingPlayer).toHaveBeenCalledTimes(1);
    });

    it('pauses for a live hazard too', () => {
        const { store } = mount(70);
        advance(2000);
        act(() => { store.setState({ hazard: { session: {} } } as never); });
        advance(600);
        expect(player().pause).toHaveBeenCalledTimes(1);
    });

    it('applies a volume change at once, without a restart', () => {
        const { settings } = mount(70);
        advance(2000);

        act(() => { settings.set({ musicVolume: 30 }); });
        expect(lastVolume()).toBeCloseTo(0.3, 5);
        expect(player().play).toHaveBeenCalledTimes(1);
        expect(createLoopingPlayer).toHaveBeenCalledTimes(1);
    });

    it('fades out and pauses when the volume is set to 0', () => {
        const { settings } = mount(70);
        advance(2000);
        act(() => { settings.set({ musicVolume: 0 }); });
        advance(600);
        expect(player().pause).toHaveBeenCalledTimes(1);
    });

    it('does not reload or restart when unrelated state changes (route changes, events, cutscenes)', () => {
        const { store } = mount(70);
        advance(2000);
        const calls = player().play.mock.calls.length;

        act(() => { store.setState({ _devSkipSeq: 1 } as never); });
        act(() => { store.setState({ _devSkipSeq: 2 } as never); });
        advance(1000);

        expect(createLoopingPlayer).toHaveBeenCalledTimes(1);
        expect(player().play.mock.calls.length).toBe(calls);
        expect(player().pause).not.toHaveBeenCalled();
        expect(player().release).not.toHaveBeenCalled();
    });

    it('pauses while the app is in the background and fades back in on return', () => {
        let listener: ((s: AppStateStatus) => void) | null = null;
        jest.spyOn(AppState, 'addEventListener').mockImplementation(((_e: string, cb: never) => {
            listener = cb as unknown as (s: AppStateStatus) => void;
            return { remove: jest.fn() } as never;
        }) as never);

        mount(70);
        advance(2000);

        act(() => { listener?.('background'); });
        advance(600);
        expect(player().pause).toHaveBeenCalledTimes(1);

        act(() => { listener?.('active'); });
        advance(2100);
        expect(lastVolume()).toBeCloseTo(0.7, 5);
        expect(player().play).toHaveBeenCalledTimes(2);
    });

    it('stays paused through the summary and resumes only when the fight screen flag drops, without a reload', () => {
        let mode: CombatModeApi | null = null;
        const Probe = () => {
            mode = useCombatMode();
            return null;
        };
        const settings = createSettingsStore({ storage: NO_STORAGE, initial: { musicVolume: 70 } });
        const { store, tree } = withAllProviders(
            <>
                <BackgroundMusic />
                <Probe />
            </>,
            { settings },
        );
        render(tree);
        advance(2000);

        // The fight is staged and the fight screen opens.
        act(() => { store.setState({ currentEncounter: FOE }); });
        act(() => { mode!.enterCombat(); });
        advance(600);
        expect(player().pause).toHaveBeenCalledTimes(1);

        // The outcome is written: the engine clears the staged fight, the screen is still up.
        player().play.mockClear();
        act(() => { store.setState({ currentEncounter: undefined } as never); });
        advance(3000);
        expect(player().play).not.toHaveBeenCalled();
        expect(player().pause).toHaveBeenCalledTimes(1);
        expect((globalThis as { __AXM_MUSIC__?: unknown }).__AXM_MUSIC__).toEqual({ context: 'combat', playing: false });

        // The player leaves the screen: the same player plays on, no seek, no reload.
        act(() => { mode!.exitCombat(); });
        expect(player().play).toHaveBeenCalledTimes(1);
        expect(player()).not.toHaveProperty('seekTo');
        advance(2100);
        expect(lastVolume()).toBeCloseTo(0.7, 5);
        expect(createLoopingPlayer).toHaveBeenCalledTimes(1);
        expect((globalThis as { __AXM_MUSIC__?: unknown }).__AXM_MUSIC__).toEqual({
            context: 'exploration',
            playing: true,
        });
    });

    it('starts the theme again when the native player was stopped behind its back', () => {
        let listener: ((s: AppStateStatus) => void) | null = null;
        jest.spyOn(AppState, 'addEventListener').mockImplementation(((_e: string, cb: never) => {
            listener = cb as unknown as (s: AppStateStatus) => void;
            return { remove: jest.fn() } as never;
        }) as never);

        mount(70);
        advance(2100);
        expect(player().play).toHaveBeenCalledTimes(1);

        // An Android focus loss pauses the player; nothing told the director.
        player().isPlaying.mockReturnValue(false);
        act(() => { listener?.('active'); });
        expect(player().play).toHaveBeenCalledTimes(2);

        // A player that is still playing is left alone.
        player().isPlaying.mockReturnValue(true);
        act(() => { listener?.('active'); });
        expect(player().play).toHaveBeenCalledTimes(2);
    });

    it('sets the audio mode once at start', () => {
        mount(70);
        expect(configureGameAudio).toHaveBeenCalledTimes(1);
    });

    it('releases the player on unmount', () => {
        const { rendered } = mount(70);
        advance(100);
        rendered.unmount();
        expect(player().release).toHaveBeenCalledTimes(1);
    });
});

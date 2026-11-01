/**
 * The play-log gate and stamps (phase BE2b, A5): `canSendPlayLog()` is true
 * only with dev tools on, the BE1 URL and token set, and the switch on; each
 * of the three false shuts it. The session id is minted once per launch.
 * The puzzle poster's own gate ignores the switch.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { isDevToolsEnabled } from '@/lib/buildProfile';
import { canSendPlayLog, mintSessionId, playLogConfig, playLogSource, playLogSourceKind, playSessionId } from '@/lib/playLog';
import { puzzleApiConfig } from '@/lib/puzzleAttempts';
import { createDevSettingsStore, type DevSettingsStore } from '@/state/dev/dev-settings';

jest.mock('@/lib/buildProfile', () => ({
    isDevToolsEnabled: jest.fn(() => true),
    getBuildProfile: jest.fn(() => 'preview'),
    getBuildCommit: jest.fn(() => null),
}));

const devTools = isDevToolsEnabled as unknown as jest.Mock<() => boolean>;

const memoryStorage = () => {
    const bag = new Map<string, string>();
    return { getItem: async (k: string) => bag.get(k) ?? null, setItem: async (k: string, v: string) => { bag.set(k, v); } };
};

let store: DevSettingsStore;

beforeEach(() => {
    devTools.mockReturnValue(true);
    process.env.EXPO_PUBLIC_PUZZLE_API_URL = 'https://miserere-api.example.workers.dev/';
    process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN = 'dev-token';
    store = createDevSettingsStore({ storage: memoryStorage() });
});

afterEach(() => {
    delete process.env.EXPO_PUBLIC_PUZZLE_API_URL;
    delete process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN;
});

describe('canSendPlayLog', () => {
    it('is open with dev tools, the API URL and token, and the switch on (the default)', () => {
        expect(canSendPlayLog(store)).toBe(true);
        expect(playLogConfig(store)).toEqual({ url: 'https://miserere-api.example.workers.dev', token: 'dev-token' });
    });

    it('is shut in a build without dev tools', () => {
        devTools.mockReturnValue(false);
        expect(canSendPlayLog(store)).toBe(false);
        expect(playLogConfig(store)).toBeNull();
    });

    it('is shut without the API URL, and without the token', () => {
        delete process.env.EXPO_PUBLIC_PUZZLE_API_URL;
        expect(canSendPlayLog(store)).toBe(false);
        process.env.EXPO_PUBLIC_PUZZLE_API_URL = 'https://miserere-api.example.workers.dev';
        delete process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN;
        expect(canSendPlayLog(store)).toBe(false);
    });

    it('is shut with the switch off', () => {
        store.set({ playLogging: false });
        expect(canSendPlayLog(store)).toBe(false);
        expect(playLogConfig(store)).toBeNull();
    });

    it('leaves the puzzle poster gate alone: the switch off still lets a puzzle attempt post', () => {
        store.set({ playLogging: false });
        expect(puzzleApiConfig()).not.toBeNull();
    });
});

describe('who played the build (SM1b, A4)', () => {
    afterEach(() => {
        delete process.env.EXPO_PUBLIC_PLAY_LOG_SOURCE;
    });

    it('is the harness when the build carries no stamp: a web export, a dev server, a jest run', () => {
        delete process.env.EXPO_PUBLIC_PLAY_LOG_SOURCE;
        expect(playLogSourceKind()).toBe('harness');
        expect(playLogSource().source).toBe('harness');
    });

    it('is human only when the build carries exactly human', () => {
        process.env.EXPO_PUBLIC_PLAY_LOG_SOURCE = 'human';
        expect(playLogSourceKind()).toBe('human');
        expect(playLogSource()).toMatchObject({ source: 'human', solver: '', sessionId: playSessionId() });
        process.env.EXPO_PUBLIC_PLAY_LOG_SOURCE = ' human ';
        expect(playLogSourceKind()).toBe('human');
    });

    it('never sends sim, and reads any other value as the harness', () => {
        for (const value of ['sim', 'harness', 'Human', '', 'true']) {
            process.env.EXPO_PUBLIC_PLAY_LOG_SOURCE = value;
            expect(playLogSourceKind()).toBe('harness');
        }
    });
});

describe('session id', () => {
    it('is one id for the whole launch', () => {
        const first = playSessionId();
        expect(first).toMatch(/^[0-9a-z]+-[0-9a-z]{8}$/);
        expect(playSessionId()).toBe(first);
    });

    it('differs between launches (different clock or random draw)', () => {
        expect(mintSessionId(1_000, () => 0.25)).not.toBe(mintSessionId(2_000, () => 0.25));
        expect(mintSessionId(1_000, () => 0.25)).not.toBe(mintSessionId(1_000, () => 0.75));
        expect(mintSessionId(1_000, () => 0)).toBe(`${(1_000).toString(36)}-00000000`);
    });
});

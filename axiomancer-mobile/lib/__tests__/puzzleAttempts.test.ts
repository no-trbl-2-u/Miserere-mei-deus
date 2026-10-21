/**
 * The solve-time API poster (phase BE1c, A3): no config outside a dev-tools
 * build or without the URL and token, a post body the shared validator
 * accepts, the bearer request to the versioned path, and a failed post that
 * only warns.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import Constants from 'expo-constants';

import { PUZZLE_ATTEMPTS_PATH, validatePuzzleAttemptPost } from '@mechanics';

import { isDevToolsEnabled } from '@/lib/buildProfile';
import {
    postPuzzleAttempt,
    puzzleApiConfig,
    puzzleAppBuild,
    puzzleAttemptKey,
    toPuzzleAttemptPost,
    type PuzzleFetch,
} from '@/lib/puzzleAttempts';
import type { HazardPuzzleLogAttempt } from '@/state/presenters/hazard-puzzle-log.engine';

jest.mock('@/lib/buildProfile', () => ({
    isDevToolsEnabled: jest.fn(() => true),
    getBuildProfile: jest.fn(() => 'preview'),
}));

const devTools = isDevToolsEnabled as unknown as jest.Mock<() => boolean>;

const ENDED: HazardPuzzleLogAttempt = {
    layoutId: 'cand-easy-01',
    route: 'risk',
    solver: 'T',
    startedAt: '2026-10-21T10:00:00.000Z',
    clockSeconds: 45,
    moves: [
        { n: 1, kind: 'stage', uid: 'c1', ms: 900 },
        { n: 2, kind: 'power', uid: 'c1', dieId: 'd4', ms: 2_100 },
    ],
    end: { kind: 'confirm', ms: 4_200, cleared: true, reachedPercent: 100 },
};

const CONFIG = { url: 'https://miserere-api.example.workers.dev', token: 'dev-token' };

let warn: jest.SpiedFunction<typeof console.warn>;
const expoConfig = (Constants as unknown as { expoConfig: { version?: string } }).expoConfig;
const originalVersion = expoConfig.version;

beforeEach(() => {
    devTools.mockReturnValue(true);
    expoConfig.version = '1.0.0';
    process.env.EXPO_PUBLIC_PUZZLE_API_URL = 'https://miserere-api.example.workers.dev/';
    process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN = 'dev-token';
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    expoConfig.version = originalVersion;
    delete process.env.EXPO_PUBLIC_PUZZLE_API_URL;
    delete process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN;
    warn.mockRestore();
});

describe('puzzleApiConfig', () => {
    it('reads the URL (without its trailing slash) and the token in a dev-tools build', () => {
        expect(puzzleApiConfig()).toEqual(CONFIG);
    });

    it('is null in a production build, even with both values set', () => {
        devTools.mockReturnValue(false);
        expect(puzzleApiConfig()).toBeNull();
    });

    it('is null when the URL or the token is unset or blank', () => {
        delete process.env.EXPO_PUBLIC_PUZZLE_API_URL;
        expect(puzzleApiConfig()).toBeNull();
        process.env.EXPO_PUBLIC_PUZZLE_API_URL = CONFIG.url;
        process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN = '  ';
        expect(puzzleApiConfig()).toBeNull();
    });
});

describe('toPuzzleAttemptPost', () => {
    it('maps an ended attempt to a body the shared validator accepts', () => {
        const post = toPuzzleAttemptPost(ENDED, 'easy', puzzleAppBuild());
        expect(post).toEqual({
            solver: 'T',
            layoutId: 'cand-easy-01',
            route: 'risk',
            intendedBand: 'easy',
            moves: ENDED.moves,
            endKind: 'confirm',
            endMs: 4_200,
            cleared: true,
            appBuild: '1.0.0 preview',
        });
        expect(validatePuzzleAttemptPost(post)).toMatchObject({ ok: true, attempt: post });
    });

    it('carries a null band for a demo and is null for an unfinished attempt', () => {
        const demo = { ...ENDED, layoutId: 'demo-undercroft-hard', end: { ...ENDED.end!, kind: 'expiry' as const, cleared: false } };
        const post = toPuzzleAttemptPost(demo, null, 'x');
        expect(post).toMatchObject({ intendedBand: null, endKind: 'expiry', cleared: false });
        expect(validatePuzzleAttemptPost(post).ok).toBe(true);
        expect(toPuzzleAttemptPost({ ...ENDED, end: null }, 'easy', 'x')).toBeNull();
    });

    it('keys an attempt by its layout and clock start, not its solver', () => {
        expect(puzzleAttemptKey({ ...ENDED, solver: 'someone else' })).toBe(puzzleAttemptKey(ENDED));
    });
});

describe('postPuzzleAttempt', () => {
    const post = toPuzzleAttemptPost(ENDED, 'easy', '1.0.0 preview')!;

    it('POSTs the body with the bearer token to the versioned path', async () => {
        const fetcher = jest.fn<PuzzleFetch>(async () => ({ ok: true, status: 201 }));
        await expect(postPuzzleAttempt(post, CONFIG, fetcher)).resolves.toBe(true);
        expect(fetcher).toHaveBeenCalledTimes(1);
        const [url, init] = fetcher.mock.calls[0];
        expect(url).toBe(`${CONFIG.url}${PUZZLE_ATTEMPTS_PATH}`);
        expect(init.method).toBe('POST');
        expect(init.headers.Authorization).toBe('Bearer dev-token');
        expect(JSON.parse(init.body)).toEqual(post);
        expect(warn).not.toHaveBeenCalled();
    });

    it('a rejected fetch only warns: no throw, no retry', async () => {
        const fetcher = jest.fn<PuzzleFetch>(async () => {
            throw new Error('Network request failed');
        });
        await expect(postPuzzleAttempt(post, CONFIG, fetcher)).resolves.toBe(false);
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).toContain('Network request failed');
    });

    it('a non-2xx answer only warns', async () => {
        const fetcher = jest.fn<PuzzleFetch>(async () => ({ ok: false, status: 401 }));
        await expect(postPuzzleAttempt(post, CONFIG, fetcher)).resolves.toBe(false);
        expect(String(warn.mock.calls[0][0])).toContain('HTTP 401');
    });
});

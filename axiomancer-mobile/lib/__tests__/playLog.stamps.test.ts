// guard-test: pins SM1b's run id and source stamps (mutation survivors on #1251)
/**
 * The stamps every play-log body carries (phase SM1b, A4 and A5), pinned
 * exactly: the source kind from the env value, the whole stamp object, and the
 * run id the deck-event call sites read from a state.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { deckEventRunId } from '@/lib/deckEvents';
import { playLogSource, playLogSourceKind, playSessionId } from '@/lib/playLog';

jest.mock('@/lib/buildProfile', () => ({
    isDevToolsEnabled: jest.fn(() => true),
    getBuildProfile: jest.fn(() => 'preview'),
    getBuildCommit: jest.fn(() => 'abc1234'),
}));

afterEach(() => {
    delete process.env.EXPO_PUBLIC_PLAY_LOG_SOURCE;
});

describe('playLogSourceKind', () => {
    it('is exactly harness or human, nothing else', () => {
        delete process.env.EXPO_PUBLIC_PLAY_LOG_SOURCE;
        expect(playLogSourceKind()).toBe('harness');
        process.env.EXPO_PUBLIC_PLAY_LOG_SOURCE = 'human';
        expect(playLogSourceKind()).toBe('human');
        process.env.EXPO_PUBLIC_PLAY_LOG_SOURCE = '  human\n';
        expect(playLogSourceKind()).toBe('human');
        process.env.EXPO_PUBLIC_PLAY_LOG_SOURCE = '';
        expect(playLogSourceKind()).toBe('harness');
        process.env.EXPO_PUBLIC_PLAY_LOG_SOURCE = 'sim';
        expect(playLogSourceKind()).toBe('harness');
    });
});

describe('playLogSource', () => {
    it('is the whole stamp: blank solver, the launch session, the commit, the app build and the source', () => {
        delete process.env.EXPO_PUBLIC_PLAY_LOG_SOURCE;
        const stamp = playLogSource();
        expect(Object.keys(stamp).sort()).toEqual(['appBuild', 'buildCommit', 'sessionId', 'solver', 'source']);
        expect(stamp.solver).toBe('');
        expect(stamp.sessionId).toBe(playSessionId());
        expect(stamp.buildCommit).toBe('abc1234');
        expect(stamp.appBuild).toMatch(/ preview$/);
        expect(stamp.source).toBe('harness');
        process.env.EXPO_PUBLIC_PLAY_LOG_SOURCE = 'human';
        expect(playLogSource().source).toBe('human');
    });
});

describe('deckEventRunId', () => {
    it('is the run id when it is a non-empty string, and null for anything else', () => {
        expect(deckEventRunId({ runId: 'run-abc' })).toBe('run-abc');
        expect(deckEventRunId({ runId: 'x' })).toBe('x');
        expect(deckEventRunId({ runId: '' })).toBeNull();
        expect(deckEventRunId({})).toBeNull();
        expect(deckEventRunId({ runId: 7 as unknown as string })).toBeNull();
        expect(deckEventRunId({ runId: null as unknown as string })).toBeNull();
    });
});

// guard-test: pins SM1b's run id and source stamps (mutation survivors on #1251)
/**
 * The run id and source on a posted puzzle attempt (phase SM1b, A4 and A5),
 * pinned at the hook: the title-screen shell (no character) posts a null run
 * id, a store holding a character run posts the save's id, the source is the
 * build's stamp, and a later attempt is posted on a re-render.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import React from 'react';

import { createNewGameState, type GameState } from '@mechanics';

import { usePostEndedPuzzleAttempts } from '@/components/hazard/puzzle/usePostEndedPuzzleAttempts';
import { hydrateStoreWithGameState } from '@/state/menu/store-actions';
import type { HazardPuzzleLogAttempt } from '@/state/presenters/hazard-puzzle-log.engine';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { withAllProviders } from '@/test-utils/withAllProviders';

jest.mock('@/lib/buildProfile', () => ({
    isDevToolsEnabled: jest.fn(() => true),
    getBuildProfile: jest.fn(() => 'preview'),
    getBuildCommit: jest.fn(() => null),
}));

const attempt = (layoutId: string): HazardPuzzleLogAttempt => ({
    layoutId,
    route: 'risk',
    solver: 'T',
    startedAt: '2026-10-21T10:00:00.000Z',
    clockSeconds: 45,
    moves: [{ n: 1, kind: 'stage', uid: 'c1', ms: 900 }],
    end: { kind: 'confirm', ms: 4_200, cleared: true, reachedPercent: 100 },
});

type FetchMock = jest.Mock<(url: string, init: { body: string }) => Promise<{ ok: boolean; status: number }>>;
let fetchMock: FetchMock;
const realFetch = globalThis.fetch;

beforeEach(() => {
    process.env.EXPO_PUBLIC_PUZZLE_API_URL = 'https://miserere-api.example.workers.dev';
    process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN = 'dev-token';
    fetchMock = jest.fn(async () => ({ ok: true, status: 201 })) as FetchMock;
    (globalThis as { fetch: unknown }).fetch = fetchMock;
});

afterEach(() => {
    delete process.env.EXPO_PUBLIC_PUZZLE_API_URL;
    delete process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN;
    delete process.env.EXPO_PUBLIC_PLAY_LOG_SOURCE;
    globalThis.fetch = realFetch;
});

const bodies = () => fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body) as Record<string, unknown>);

function mountHook(store: AppStore, initial: readonly HazardPuzzleLogAttempt[]) {
    const wrapper = ({ children }: { children: React.ReactNode }) => withAllProviders(children, { store }).tree;
    return renderHook(
        ({ list }: { list: readonly HazardPuzzleLogAttempt[] }) => usePostEndedPuzzleAttempts(list, () => null),
        { wrapper, initialProps: { list: initial } },
    );
}

function characterStore(): { store: AppStore; runId: string } {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    hydrateStoreWithGameState(store, createNewGameState({ characterId: 'the-chosen' }));
    return { store, runId: (store.getState() as unknown as GameState).runId };
}

describe('usePostEndedPuzzleAttempts run id and source', () => {
    it('posts a null run id from the title-screen shell, which has no character', () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        expect((store.getState() as unknown as GameState).player.characterId).toBeUndefined();
        expect((store.getState() as unknown as GameState).runId.length).toBeGreaterThan(0);
        mountHook(store, [attempt('a')]);
        expect(bodies()).toHaveLength(1);
        expect(bodies()[0]!.runId).toBeNull();
        expect(bodies()[0]!.source).toBe('harness');
    });

    it('posts the save run id once a character run is loaded, with the human stamp when the build has it', () => {
        process.env.EXPO_PUBLIC_PLAY_LOG_SOURCE = 'human';
        const { store, runId } = characterStore();
        mountHook(store, [attempt('a')]);
        expect(bodies()).toHaveLength(1);
        expect(bodies()[0]!.runId).toBe(runId);
        expect(bodies()[0]!.source).toBe('human');
    });

    it('posts an attempt that ends on a later render, and never posts the same one twice', () => {
        const { store, runId } = characterStore();
        const hook = mountHook(store, []);
        expect(fetchMock).not.toHaveBeenCalled();
        hook.rerender({ list: [attempt('a')] });
        expect(bodies()).toHaveLength(1);
        hook.rerender({ list: [attempt('a'), attempt('b')] });
        expect(bodies().map((b) => b.layoutId)).toEqual(['a', 'b']);
        expect(bodies().map((b) => b.runId)).toEqual([runId, runId]);
    });
});

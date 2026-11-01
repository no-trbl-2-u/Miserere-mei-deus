/**
 * The run-log poster (phase SM1d, A8): a run opens once, its events post in
 * `seq` order in batches the Worker accepts, and its close flushes the last
 * batch first. A shut gate makes no call and buffers nothing; a failed post
 * warns and is dropped.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
    PLAY_LOG_LIMITS,
    PLAY_RUNS_PATH,
    RUN_EVENTS_PATH,
    playRunEndPath,
    validatePlayRunEndPost,
    validatePlayRunPost,
    validateRunEventsPost,
    type PlayRunEndPost,
    type RunEventsPost,
} from '@mechanics';

import type { PlayLogStamps } from '@/lib/playLog';
import type { PuzzleApiConfig, PuzzleFetch } from '@/lib/puzzleAttempts';
import { createRunLogPoster, type RunLogPoster } from '@/lib/runLog';

const CONFIG: PuzzleApiConfig = { url: 'https://miserere-api.example.workers.dev', token: 'dev-token' };
const SOURCE: PlayLogStamps = { solver: '', sessionId: 'session-1', buildCommit: 'abc1234', appBuild: '1.0.0 preview', source: 'human' };
const END: PlayRunEndPost = { outcome: 'run-over', endNodeId: 'bw-w2', level: 3, vitaeEnd: 0, nodesResolved: 4, endDeck: ['grey-strike'] };

type Call = { url: string; auth: string | undefined; body: unknown };

let calls: Call[];
let status: number;
let gate: PuzzleApiConfig | null;

const fetcher: PuzzleFetch = async (url, init) => {
    calls.push({ url, auth: init.headers.Authorization, body: JSON.parse(init.body) });
    return { ok: status < 400, status };
};

function poster(): RunLogPoster {
    return createRunLogPoster({ config: () => gate, source: () => SOURCE, fetcher });
}

const batches = (): RunEventsPost[] => calls.filter((c) => c.url.endsWith(RUN_EVENTS_PATH)).map((c) => c.body as RunEventsPost);

beforeEach(() => {
    calls = [];
    status = 201;
    gate = CONFIG;
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('open', () => {
    it('posts the run with the stamps, the character and the start deck, to the bearer-guarded route', async () => {
        const log = poster();
        log.open({ runId: 'run-1', characterId: 'apprentice', startDeck: ['grey-strike', 'grey-ward'] });
        await log.settled();
        expect(calls).toHaveLength(1);
        expect(calls[0]!.url).toBe(`${CONFIG.url}${PLAY_RUNS_PATH}`);
        expect(calls[0]!.auth).toBe('Bearer dev-token');
        expect(calls[0]!.body).toEqual({
            ...SOURCE, runId: 'run-1', characterId: 'apprentice', policyId: null, startDeck: ['grey-strike', 'grey-ward'],
        });
        expect(validatePlayRunPost(calls[0]!.body).reasons).toEqual([]);
    });

    it('opens a run once per launch', async () => {
        const log = poster();
        log.open({ runId: 'run-1', characterId: null, startDeck: [] });
        log.open({ runId: 'run-1', characterId: null, startDeck: [] });
        log.open({ runId: 'run-2', characterId: null, startDeck: [] });
        await log.settled();
        expect(calls.map((c) => (c.body as { runId: string }).runId)).toEqual(['run-1', 'run-2']);
    });
});

describe('events', () => {
    it('numbers a run from 0 across batches, and keeps a batch for the flush', async () => {
        const log = poster();
        log.event('run-1', 'node-entered', { map: 'breakwater', nodeId: 'bw-w2', nodeKind: 'encounter' });
        log.event('run-1', 'node-resolved', { nodeId: 'bw-w2', nodeKind: 'encounter', choice: 'fight' });
        await log.settled();
        expect(calls).toEqual([]);
        log.flush('run-1');
        log.event('run-1', 'xp-gained', { amount: 12, from: 'fight' });
        log.flush('run-1');
        await log.settled();
        const posted = batches();
        expect(posted.map((b) => b.events.map((e) => [e.seq, e.kind]))).toEqual([
            [[0, 'node-entered'], [1, 'node-resolved']],
            [[2, 'xp-gained']],
        ]);
        expect(posted.every((b) => b.runId === 'run-1' && b.source === 'human')).toBe(true);
        for (const batch of posted) expect(validateRunEventsPost(batch).reasons).toEqual([]);
    });

    it('numbers each run on its own', async () => {
        const log = poster();
        log.event('run-a', 'xp-gained', { amount: 1, from: 'fight' });
        log.event('run-b', 'xp-gained', { amount: 2, from: 'fight' });
        log.event('run-a', 'xp-gained', { amount: 3, from: 'fight' });
        log.flush('run-a');
        log.flush('run-b');
        await log.settled();
        expect(batches().map((b) => [b.runId, b.events.map((e) => e.seq)])).toEqual([['run-a', [0, 1]], ['run-b', [0]]]);
    });

    it('posts nothing for a flush with nothing buffered', async () => {
        const log = poster();
        log.flush('run-1');
        log.event('run-1', 'xp-gained', { amount: 1, from: 'fight' });
        log.flush('run-1');
        log.flush('run-1');
        await log.settled();
        expect(batches()).toHaveLength(1);
    });

    it('cuts a batch at the Worker cap of events', async () => {
        const log = poster();
        const total = PLAY_LOG_LIMITS.runEvents + 5;
        for (let i = 0; i < total; i++) log.event('run-1', 'xp-gained', { amount: 1, from: 'fight' });
        log.flush('run-1');
        await log.settled();
        expect(batches().map((b) => b.events.length)).toEqual([PLAY_LOG_LIMITS.runEvents, 5]);
        expect(batches()[1]!.events[0]!.seq).toBe(PLAY_LOG_LIMITS.runEvents);
    });

    it('cuts a batch at the Worker cap of bytes', async () => {
        const log = poster();
        const long = 'x'.repeat(2000);
        for (let i = 0; i < 150; i++) log.event('run-1', 'item-gained', { itemId: long, slot: 'relic', from: 'cache' });
        log.flush('run-1');
        await log.settled();
        const posted = batches();
        expect(posted.length).toBeGreaterThan(1);
        for (const batch of posted) {
            expect(JSON.stringify(batch).length).toBeLessThanOrEqual(PLAY_LOG_LIMITS.runEventBytes);
            expect(batch.events.length).toBeLessThanOrEqual(PLAY_LOG_LIMITS.runEvents);
        }
        expect(posted.flatMap((b) => b.events.map((e) => e.seq))).toEqual(Array.from({ length: 150 }, (_, i) => i));
    });
});

describe('close', () => {
    it('posts the last events, then the close, to the run-end route of the id', async () => {
        const log = poster();
        log.open({ runId: 'run/1', characterId: null, startDeck: [] });
        log.event('run/1', 'node-entered', { map: 'breakwater', nodeId: 'bw-w2', nodeKind: null });
        log.close('run/1', END);
        await log.settled();
        expect(calls.map((c) => c.url)).toEqual([
            `${CONFIG.url}${PLAY_RUNS_PATH}`,
            `${CONFIG.url}${RUN_EVENTS_PATH}`,
            `${CONFIG.url}${playRunEndPath('run/1')}`,
        ]);
        expect(calls[2]!.url).toContain('run%2F1');
        expect(calls[2]!.body).toEqual(END);
        expect(validatePlayRunEndPost(calls[2]!.body).reasons).toEqual([]);
    });

    it('closes a run once; a late event for a closed run is dropped', async () => {
        const log = poster();
        log.close('run-1', END);
        log.close('run-1', { ...END, outcome: 'reset' });
        log.event('run-1', 'xp-gained', { amount: 1, from: 'fight' });
        log.flush('run-1');
        await log.settled();
        expect(calls).toHaveLength(1);
        expect((calls[0]!.body as PlayRunEndPost).outcome).toBe('run-over');
    });

    it('keeps the posts in the order they were made, even when an earlier one is slow', async () => {
        let release: () => void = () => undefined;
        const slow = new Promise<void>((resolve) => { release = resolve; });
        const order: string[] = [];
        const log = createRunLogPoster({
            config: () => CONFIG,
            source: () => SOURCE,
            fetcher: async (url) => {
                if (url.endsWith(PLAY_RUNS_PATH)) await slow;
                order.push(url.replace(CONFIG.url, ''));
                return { ok: true, status: 201 };
            },
        });
        log.open({ runId: 'run-1', characterId: null, startDeck: [] });
        log.event('run-1', 'xp-gained', { amount: 1, from: 'fight' });
        log.close('run-1', END);
        release();
        await log.settled();
        expect(order).toEqual([PLAY_RUNS_PATH, RUN_EVENTS_PATH, playRunEndPath('run-1')]);
    });
});

describe('the gate', () => {
    it('makes no call, and buffers nothing, while it is shut', async () => {
        gate = null;
        const log = poster();
        log.open({ runId: 'run-1', characterId: null, startDeck: [] });
        log.event('run-1', 'xp-gained', { amount: 1, from: 'fight' });
        log.flush('run-1');
        log.close('run-1', END);
        await log.settled();
        expect(calls).toEqual([]);
        // Nothing was buffered while shut: once it opens the next event is the run's first.
        gate = CONFIG;
        const open = poster();
        open.event('run-2', 'xp-gained', { amount: 1, from: 'fight' });
        open.flush('run-2');
        await open.settled();
        expect(batches()[0]!.events[0]!.seq).toBe(0);
    });
});

describe('a failed post', () => {
    it('warns, is dropped and never throws, and the next post still goes', async () => {
        status = 500;
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const log = poster();
        log.open({ runId: 'run-1', characterId: null, startDeck: [] });
        log.event('run-1', 'xp-gained', { amount: 1, from: 'fight' });
        log.close('run-1', END);
        await expect(log.settled()).resolves.toBeUndefined();
        expect(calls).toHaveLength(3);
        expect(warn).toHaveBeenCalledTimes(3);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('dropped'));
    });

    it('warns when the request itself throws', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const log = createRunLogPoster({
            config: () => CONFIG,
            source: () => SOURCE,
            fetcher: async () => { throw new Error('offline'); },
        });
        log.open({ runId: 'run-1', characterId: null, startDeck: [] });
        await expect(log.settled()).resolves.toBeUndefined();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('offline'));
    });
});

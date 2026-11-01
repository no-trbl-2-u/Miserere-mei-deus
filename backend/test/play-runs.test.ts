/**
 * SM1c A6 and A7: a run opens, logs events and closes against a local D1.
 * `POST /v1/play-runs` is idempotent on the run id, `/end` closes a run once,
 * `POST /v1/run-events` stores a batch whole, and every route answers 401, 400
 * and 413 the way the other play-log routes do.
 */

import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import { PLAY_LOG_LIMITS, RUN_EVENT_KINDS } from '../src/contract';
import type {
    PlayLogError,
    PlayRunClosed,
    PlayRunEndPost,
    PlayRunList,
    PlayRunOpened,
    PlayRunPost,
    RunEvent,
    RunEventList,
    RunEventsCreated,
    RunEventsPost,
} from '../src/contract';

const BASE = 'https://miserere-api.test';
const AUTH = { Authorization: 'Bearer test-token' };

function run(over: Partial<PlayRunPost> = {}): PlayRunPost {
    return {
        solver: 'bot', sessionId: 's-1', buildCommit: 'src1234', appBuild: '1.4.0 preview', runId: 'run-a',
        characterId: 'the-chosen', policyId: 'defender', startDeck: ['strike', 'guard'],
        ...over,
    };
}

function end(over: Partial<PlayRunEndPost> = {}): PlayRunEndPost {
    return { outcome: 'run-over', endNodeId: 'n-9', level: 4, vitaeEnd: 0, nodesResolved: 11, endDeck: ['strike', 'guard+'], ...over };
}

const ALL_KINDS: RunEvent[] = [
    { seq: 0, kind: 'node-entered', payload: { map: 'breakwater', nodeId: 'n-1', nodeKind: 'encounter' } },
    { seq: 1, kind: 'node-resolved', payload: { nodeId: 'n-1', nodeKind: 'encounter', choice: 'fight', level: 2, vitae: 17 } },
    { seq: 2, kind: 'hazard-ended', payload: { hazardId: 'tide-pool', cleared: true, vitaeBefore: 20, vitaeAfter: 17 } },
    { seq: 3, kind: 'xp-gained', payload: { amount: 30, from: 'fight' } },
    { seq: 4, kind: 'level-up', payload: { level: 2, stat: 'might' } },
    { seq: 5, kind: 'item-gained', payload: { itemId: 'relic-a', slot: 'relic', from: 'cache' } },
    { seq: 6, kind: 'quest-step', payload: { questId: 'breakwater-line', stepId: '2', action: 'turn-in' } },
];

function post(path: string, body: unknown, headers: Record<string, string> = AUTH): Promise<Response> {
    return SELF.fetch(`${BASE}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
    });
}

function get(path: string): Promise<Response> {
    return SELF.fetch(`${BASE}${path}`, { headers: AUTH });
}

const open = (body: PlayRunPost) => post('/v1/play-runs', body);
const close = (runId: string, body: unknown) => post(`/v1/play-runs/${encodeURIComponent(runId)}/end`, body);
const runs = async (query = '') => (await (await get(`/v1/play-runs${query}`)).json<PlayRunList>()).playRuns;
const events = async (query = '') => (await (await get(`/v1/run-events${query}`)).json<RunEventList>()).runEvents;

describe('POST /v1/play-runs', () => {
    it('opens a run (201), idempotently: a second open is 200 with the same id and start', async () => {
        const first = await open(run({ runId: 'open-1', source: 'sim' }));
        expect(first.status).toBe(201);
        const opened = await first.json<PlayRunOpened>();
        expect(opened.id).toBeGreaterThan(0);
        expect(new Date(opened.startedAt).toISOString()).toBe(opened.startedAt);

        const again = await open(run({ runId: 'open-1', source: 'sim', sessionId: 's-2', policyId: 'merciful' }));
        expect(again.status).toBe(200);
        expect(await again.json<PlayRunOpened>()).toEqual(opened);

        const stored = (await runs()).filter(r => r.runId === 'open-1');
        expect(stored).toHaveLength(1);
        expect(stored[0]).toEqual({
            id: opened.id, runId: 'open-1', source: 'sim', solver: 'bot', sessionId: 's-1', buildCommit: 'src1234',
            appBuild: '1.4.0 preview', characterId: 'the-chosen', policyId: 'defender', startDeck: ['strike', 'guard'],
            startedAt: opened.startedAt, endedAt: null, outcome: null, endNodeId: null, level: null, vitaeEnd: null,
            nodesResolved: null, endDeck: null,
        });
    });

    it('stores a run with no source as human, and a run with no character or policy', async () => {
        expect((await open(run({ runId: 'open-old', characterId: null, policyId: null, buildCommit: null }))).status).toBe(201);
        const stored = (await runs()).find(r => r.runId === 'open-old');
        expect(stored).toMatchObject({ source: 'human', characterId: null, policyId: null, buildCommit: null });
    });

    it('401s without the token', async () => {
        const response = await post('/v1/play-runs', run({ runId: 'no-auth' }), {});
        expect(response.status).toBe(401);
        expect(response.headers.get('WWW-Authenticate')).toBe('Bearer');
        expect((await runs()).some(r => r.runId === 'no-auth')).toBe(false);
    });

    it('400s on a bad body, naming each field, and stores nothing', async () => {
        const response = await open({ ...run({ runId: 'bad-1' }), source: 'bot', startDeck: 'x' } as never);
        expect(response.status).toBe(400);
        expect(await response.json<PlayLogError>()).toEqual({
            error: 'invalid play run',
            reasons: ['source: expected one of human, harness, sim', 'startDeck: expected an array'],
        });
        expect((await runs()).some(r => r.runId === 'bad-1')).toBe(false);
        const notJson = await SELF.fetch(`${BASE}/v1/play-runs`, { method: 'POST', headers: AUTH, body: 'nope' });
        expect(notJson.status).toBe(400);
    });

    it('413s a body over 64 KiB', async () => {
        expect(PLAY_LOG_LIMITS.playRunBytes).toBe(64 * 1024);
        const response = await open(run({ runId: 'big-1', solver: 'x'.repeat(PLAY_LOG_LIMITS.playRunBytes) }));
        expect(response.status).toBe(413);
        expect((await runs()).some(r => r.runId === 'big-1')).toBe(false);
    });

    it('405s any method but GET and POST', async () => {
        const response = await SELF.fetch(`${BASE}/v1/play-runs`, { method: 'DELETE', headers: AUTH });
        expect(response.status).toBe(405);
    });
});

describe('POST /v1/play-runs/<runId>/end', () => {
    it('closes an open run once and records how it ended; a second close is a 409 and changes nothing', async () => {
        await open(run({ runId: 'close-1' }));
        const closed = await close('close-1', end());
        expect(closed.status).toBe(200);
        const { id, endedAt } = await closed.json<PlayRunClosed>();
        expect(new Date(endedAt).toISOString()).toBe(endedAt);

        const stored = (await runs()).find(r => r.runId === 'close-1');
        expect(stored).toMatchObject({
            id, endedAt, outcome: 'run-over', endNodeId: 'n-9', level: 4, vitaeEnd: 0, nodesResolved: 11,
            endDeck: ['strike', 'guard+'],
        });

        const second = await close('close-1', end({ outcome: 'chapter-clear', level: 9 }));
        expect(second.status).toBe(409);
        expect((await second.json<PlayLogError>()).error).toBe('run already closed');
        expect((await runs()).find(r => r.runId === 'close-1')).toMatchObject({ endedAt, outcome: 'run-over', level: 4 });
    });

    it('closes a run with an id that needs escaping, and a re-opened closed run stays closed', async () => {
        await open(run({ runId: 'run/with space' }));
        expect((await close('run/with space', end({ outcome: 'reset', endNodeId: null }))).status).toBe(200);
        expect((await open(run({ runId: 'run/with space' }))).status).toBe(200);
        expect((await runs()).find(r => r.runId === 'run/with space')).toMatchObject({ outcome: 'reset', endNodeId: null });
    });

    it('404s a run that was never opened', async () => {
        const response = await close('never-opened', end());
        expect(response.status).toBe(404);
        expect((await runs()).some(r => r.runId === 'never-opened')).toBe(false);
    });

    it('401s without the token, 400s a bad body and 413s a long one, closing nothing', async () => {
        await open(run({ runId: 'close-2' }));
        expect((await post('/v1/play-runs/close-2/end', end(), {})).status).toBe(401);
        const bad = await close('close-2', end({ outcome: 'won' as never, level: 0 }));
        expect(bad.status).toBe(400);
        expect(await bad.json<PlayLogError>()).toEqual({
            error: 'invalid play run end',
            reasons: ['outcome: expected one of run-over, chapter-clear, reset', 'level: expected a whole number of at least 1'],
        });
        expect((await close('close-2', end({ endNodeId: 'x'.repeat(PLAY_LOG_LIMITS.playRunBytes) }))).status).toBe(413);
        expect((await runs()).find(r => r.runId === 'close-2')?.endedAt).toBeNull();
    });

    it('405s any method but POST', async () => {
        const response = await get('/v1/play-runs/close-2/end');
        expect(response.status).toBe(405);
        expect(response.headers.get('Allow')).toBe('POST');
    });
});

describe('POST /v1/run-events', () => {
    it('stores a batch of all seven kinds (201), and lists them back in seq order with their payloads', async () => {
        expect(RUN_EVENT_KINDS).toHaveLength(7);
        const response = await post('/v1/run-events', { runId: 'ev-1', source: 'sim', events: ALL_KINDS } satisfies RunEventsPost);
        expect(response.status).toBe(201);
        const created = await response.json<RunEventsCreated>();
        expect(created.count).toBe(7);

        const stored = await events('?run=ev-1');
        expect(stored.map(e => [e.seq, e.kind])).toEqual(ALL_KINDS.map(e => [e.seq, e.kind]));
        expect(stored.map(e => e.payload)).toEqual(ALL_KINDS.map(e => e.payload));
        expect(stored.every(e => e.source === 'sim' && e.runId === 'ev-1' && e.receivedAt === created.receivedAt)).toBe(true);
    });

    it('keeps batches apart by run, orders across batches by seq, and stores an absent source as human', async () => {
        await post('/v1/run-events', { runId: 'ev-2', events: [ALL_KINDS[3]] });
        await post('/v1/run-events', { runId: 'ev-3', source: 'harness', events: [ALL_KINDS[0]] });
        await post('/v1/run-events', { runId: 'ev-2', events: [{ ...ALL_KINDS[4], seq: 7 }, { ...ALL_KINDS[5], seq: 8 }] });
        expect((await events('?run=ev-2')).map(e => [e.seq, e.kind, e.source])).toEqual([
            [3, 'xp-gained', 'human'], [7, 'level-up', 'human'], [8, 'item-gained', 'human'],
        ]);
        expect((await events('?run=ev-3&source=harness')).map(e => e.kind)).toEqual(['node-entered']);
        expect(await events('?run=ev-3&source=sim')).toEqual([]);
        expect((await get('/v1/run-events?source=bot')).status).toBe(400);
    });

    it('accepts exactly 200 events and refuses 201 (400), storing none of the refused batch', async () => {
        const many = (n: number) => Array.from({ length: n }, (_, seq) => ({ seq, kind: 'xp-gained', payload: { amount: 1, from: 'fight' } }));
        expect((await post('/v1/run-events', { runId: 'ev-200', events: many(200) })).status).toBe(201);
        expect(await events('?run=ev-200')).toHaveLength(200);
        const over = await post('/v1/run-events', { runId: 'ev-201', events: many(201) });
        expect(over.status).toBe(400);
        expect((await over.json<PlayLogError>()).reasons).toEqual(['events: more than 200 entries']);
        expect(await events('?run=ev-201')).toEqual([]);
    });

    it('400s an unknown kind or a bad payload, naming it, and stores none of the batch', async () => {
        const response = await post('/v1/run-events', {
            runId: 'ev-bad',
            events: [ALL_KINDS[0], { seq: 1, kind: 'gold-gained', payload: {} }, { seq: 2, kind: 'xp-gained', payload: { amount: -1, from: 'x' } }],
        });
        expect(response.status).toBe(400);
        expect(await response.json<PlayLogError>()).toEqual({
            error: 'invalid run events',
            reasons: [
                'events[1].kind: unknown run event kind "gold-gained"',
                'events[2].payload.amount: expected a whole number of at least 0',
            ],
        });
        expect(await events('?run=ev-bad')).toEqual([]);
    });

    it('401s without the token', async () => {
        expect((await post('/v1/run-events', { runId: 'ev-auth', events: [ALL_KINDS[0]] }, {})).status).toBe(401);
        expect(await events('?run=ev-auth')).toEqual([]);
    });

    it('413s a body over 256 KiB', async () => {
        expect(PLAY_LOG_LIMITS.runEventBytes).toBe(256 * 1024);
        const response = await post('/v1/run-events', {
            runId: 'ev-big', events: [{ seq: 0, kind: 'node-resolved', payload: { nodeId: 'n', nodeKind: null, choice: 'x'.repeat(PLAY_LOG_LIMITS.runEventBytes) } }],
        });
        expect(response.status).toBe(413);
        expect(await events('?run=ev-big')).toEqual([]);
    });
});

describe('a fixture run', () => {
    it('opens, logs every kind of event and closes, and every list reads it back by source', async () => {
        const runId = 'fixture-run';
        expect((await open(run({ runId, source: 'sim', policyId: 'blood-price' }))).status).toBe(201);
        expect((await post('/v1/run-events', { runId, source: 'sim', events: ALL_KINDS })).status).toBe(201);
        expect((await close(runId, end({ outcome: 'chapter-clear', endNodeId: 'exit', nodesResolved: 6 }))).status).toBe(200);

        expect((await events(`?run=${runId}`)).map(e => e.kind)).toEqual([...RUN_EVENT_KINDS]);
        const mine = (await runs('?source=sim')).find(r => r.runId === runId);
        expect(mine).toMatchObject({ outcome: 'chapter-clear', endNodeId: 'exit', nodesResolved: 6, policyId: 'blood-price' });
        expect((await runs('?source=human')).some(r => r.runId === runId)).toBe(false);
        expect((await runs('?source=all')).some(r => r.runId === runId)).toBe(true);

        const bad = await get('/v1/play-runs?source=bot');
        expect(bad.status).toBe(400);
        expect(await bad.json<PlayLogError>()).toEqual({
            error: 'invalid query',
            reasons: ['source: expected one of human, harness, sim, all, got "bot"'],
        });
    });
});

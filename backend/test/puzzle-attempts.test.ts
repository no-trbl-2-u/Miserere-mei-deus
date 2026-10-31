/**
 * BE1 A5: the Worker in the Workers runtime against a local D1. A request
 * without the token is a 401, a malformed body a 400, a POST then a GET
 * returns the same row, and `?layout=` narrows the list.
 */

import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import type { PuzzleAttemptCreated, PuzzleAttemptError, PuzzleAttemptList, PuzzleAttemptPost } from '../src/contract';

const URL_BASE = 'https://miserere-api.test/v1/puzzle-attempts';
const AUTH = { Authorization: 'Bearer test-token' };

function attempt(over: Partial<PuzzleAttemptPost> = {}): PuzzleAttemptPost {
    return {
        solver: 'T',
        layoutId: 'cand-easy-01',
        route: 'risk',
        intendedBand: 'easy',
        moves: [
            { n: 1, kind: 'stage', uid: 'h0', ms: 1200 },
            { n: 2, kind: 'power', uid: 'h0', dieId: 'd1', ms: 2400 },
        ],
        endKind: 'confirm',
        endMs: 9100,
        cleared: true,
        appBuild: '1.4.0 preview',
        ...over,
    };
}

function post(body: unknown, headers: Record<string, string> = AUTH): Promise<Response> {
    return SELF.fetch(URL_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: typeof body === 'string' ? body : JSON.stringify(body),
    });
}

function get(query = '', headers: Record<string, string> = AUTH): Promise<Response> {
    return SELF.fetch(`${URL_BASE}${query}`, { headers });
}

describe('auth', () => {
    it('refuses a POST and a GET with no token', async () => {
        const posted = await post(attempt(), {});
        expect(posted.status).toBe(401);
        expect(await posted.json<PuzzleAttemptError>()).toEqual({ error: 'unauthorized' });
        expect((await get('', {})).status).toBe(401);
    });

    it('refuses a wrong token', async () => {
        expect((await post(attempt(), { Authorization: 'Bearer nope' })).status).toBe(401);
        expect((await get('', { Authorization: 'test-token' })).status).toBe(401);
    });

    it('stores nothing from a refused POST', async () => {
        await post(attempt(), {});
        const list = await (await get()).json<PuzzleAttemptList>();
        expect(list.attempts).toEqual([]);
    });
});

describe('POST /v1/puzzle-attempts', () => {
    it('rejects a malformed body with the validator reasons', async () => {
        const response = await post({ ...attempt(), endKind: 'quit', endMs: -1 });
        expect(response.status).toBe(400);
        expect(await response.json<PuzzleAttemptError>()).toEqual({
            error: 'invalid attempt',
            reasons: ['endKind: expected one of confirm, expiry', 'endMs: expected whole milliseconds of at least 0'],
        });
    });

    it('rejects a body that is not JSON', async () => {
        const response = await post('{not json');
        expect(response.status).toBe(400);
        expect(await response.json<PuzzleAttemptError>()).toEqual({
            error: 'invalid attempt',
            reasons: ['body: not valid JSON'],
        });
    });

    it('stores an attempt and GET returns the same row', async () => {
        const response = await post(attempt());
        expect(response.status).toBe(201);
        const created = await response.json<PuzzleAttemptCreated>();
        expect(created.id).toBeTypeOf('number');
        expect(Number.isNaN(Date.parse(created.receivedAt))).toBe(false);

        const list = await (await get()).json<PuzzleAttemptList>();
        expect(list.attempts).toEqual([{ id: created.id, receivedAt: created.receivedAt, source: 'human', runId: null, ...attempt() }]);
    });

    it('round-trips a demo (null band) and an uncleared expiry', async () => {
        const demo = attempt({ layoutId: 'demo-easy', intendedBand: null, endKind: 'expiry', cleared: false, moves: [] });
        expect((await post(demo)).status).toBe(201);
        const [row] = (await (await get()).json<PuzzleAttemptList>()).attempts;
        expect(row).toMatchObject(demo);
    });
});

describe('GET /v1/puzzle-attempts', () => {
    it('lists newest first and filters by ?layout=', async () => {
        await post(attempt({ layoutId: 'cand-easy-01', endMs: 1000 }));
        await post(attempt({ layoutId: 'cand-hard-02', intendedBand: 'hard', endMs: 2000 }));
        await post(attempt({ layoutId: 'cand-easy-01', endMs: 3000 }));

        const all = (await (await get()).json<PuzzleAttemptList>()).attempts;
        expect(all.map((a) => a.endMs)).toEqual([3000, 2000, 1000]);

        const easy = (await (await get('?layout=cand-easy-01')).json<PuzzleAttemptList>()).attempts;
        expect(easy.map((a) => [a.layoutId, a.endMs])).toEqual([['cand-easy-01', 3000], ['cand-easy-01', 1000]]);

        const none = (await (await get('?layout=cand-medium-09')).json<PuzzleAttemptList>()).attempts;
        expect(none).toEqual([]);
    });
});

describe('routing', () => {
    it('is a 404 off the one path and a 405 for another method', async () => {
        expect((await SELF.fetch('https://miserere-api.test/v1/other', { headers: AUTH })).status).toBe(404);
        const put = await SELF.fetch(URL_BASE, { method: 'PUT', headers: AUTH });
        expect(put.status).toBe(405);
        expect(put.headers.get('Allow')).toBe('GET, POST');
    });
});

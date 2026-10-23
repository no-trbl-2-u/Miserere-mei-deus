/**
 * BV1 A2-A4, BV2 A1-A2: the ballot-verdict routes in the Workers runtime
 * against a local D1. A request without the token is a 401, a body the validator rejects a
 * 400 naming each problem, a body over the cap a 413, and a POST then a GET
 * returns the same row, newest first, with `?ballot=` exact. CORS answers on
 * these routes only, for an origin `BALLOT_ORIGINS` allows. Every row carries
 * a `status`, `final` unless the post says `draft`, and `?status=` narrows.
 */

import { env, SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import { BALLOT_LIMITS } from '../src/ballot';
import type { BallotVerdictList, BallotVerdictPost } from '../src/ballot';
import type { PlayLogCreated, PlayLogError } from '../src/contract';

const BASE = 'https://miserere-api.test';
const VERDICTS = `${BASE}/v1/ballot-verdicts`;
const ATTEMPTS = `${BASE}/v1/puzzle-attempts`;
const FIGHTS = `${BASE}/v1/fights`;
const AUTH = { Authorization: 'Bearer test-token' };
const SITE = 'https://axiomancer-ballots.pages.dev';
const PREVIEW = 'https://loop-ship-bv1b.axiomancer-ballots.pages.dev';

function verdict(over: Partial<BallotVerdictPost> = {}): BallotVerdictPost {
    return {
        ballotId: 'elementalist-2026-10-22',
        verdictText: 'ELEMENTALIST VERDICT\nP-01 KEEP P-01a | cut P-01b, P-01c | note: TWEAK 3\n',
        kept: ['P-01a', 'E-04c'],
        notes: { 'P-01': 'TWEAK 3' },
        general: 'Fire reads strongest.',
        client: 'Mozilla/5.0 (iPhone)',
        status: 'final',
        ...over,
    };
}

function post(url: string, body: unknown, headers: Record<string, string> = AUTH): Promise<Response> {
    return SELF.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: typeof body === 'string' ? body : JSON.stringify(body),
    });
}

function get(url: string, headers: Record<string, string> = AUTH): Promise<Response> {
    return SELF.fetch(url, { headers });
}

function preflight(url: string, origin: string): Promise<Response> {
    return SELF.fetch(url, {
        method: 'OPTIONS',
        headers: {
            Origin: origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'authorization, content-type',
        },
    });
}

async function verdicts(query = ''): Promise<BallotVerdictList['ballotVerdicts']> {
    return (await (await get(`${VERDICTS}${query}`)).json<BallotVerdictList>()).ballotVerdicts;
}

function corsHeaders(response: Response): string[] {
    return [...response.headers.keys()].filter((key) => key.startsWith('access-control-allow-'));
}

describe('POST /v1/ballot-verdicts', () => {
    it('stores a verdict and GET returns the same row', async () => {
        const response = await post(VERDICTS, verdict());
        expect(response.status).toBe(201);
        const created = await response.json<PlayLogCreated>();
        expect(created.id).toBeTypeOf('number');
        expect(Number.isNaN(Date.parse(created.receivedAt))).toBe(false);
        expect(await verdicts()).toEqual([{ id: created.id, receivedAt: created.receivedAt, ...verdict() }]);
    });

    it('stores missing general and client as null, and an empty kept list', async () => {
        const { general: _g, client: _c, ...bare } = verdict({ kept: [], notes: {} });
        expect((await post(VERDICTS, bare)).status).toBe(201);
        expect((await verdicts())[0]).toMatchObject({ ...bare, general: null, client: null });
    });

    it('refuses both methods without the token or with a wrong one, and stores nothing', async () => {
        const posted = await post(VERDICTS, verdict(), {});
        expect(posted.status).toBe(401);
        expect(await posted.json<PlayLogError>()).toEqual({ error: 'unauthorized' });
        expect((await post(VERDICTS, verdict(), { Authorization: 'Bearer nope' })).status).toBe(401);
        expect((await get(VERDICTS, {})).status).toBe(401);
        expect(await verdicts()).toEqual([]);
    });

    it('names each problem the validator finds', async () => {
        const response = await post(VERDICTS, {
            ballotId: 'Elementalist!',
            verdictText: '   ',
            kept: ['P-01a', 'p-1a', 7],
            notes: { 'P-01': 3, slot: 'x' },
            general: 5,
            client: 'x'.repeat(BALLOT_LIMITS.client + 1),
        });
        expect(response.status).toBe(400);
        expect(await response.json<PlayLogError>()).toEqual({
            error: 'invalid ballot verdict',
            reasons: [
                'ballotId: expected 3 to 64 lowercase letters, digits or hyphens',
                'verdictText: must not be empty',
                'kept[1]: expected a candidate id like P-01a',
                'kept[2]: expected a candidate id like P-01a',
                'notes.P-01: expected a string',
                'notes.slot: expected a slot id like P-01',
                'general: expected a string or null',
                `client: longer than ${BALLOT_LIMITS.client} characters`,
            ],
        });
        expect(await verdicts()).toEqual([]);
    });

    it('names each missing field and a body that is not an object or not JSON', async () => {
        const empty = await post(VERDICTS, {});
        expect(await empty.json<PlayLogError>()).toEqual({
            error: 'invalid ballot verdict',
            reasons: [
                'ballotId: expected 3 to 64 lowercase letters, digits or hyphens',
                'verdictText: expected a string',
                'kept: expected an array',
                'notes: expected an object',
            ],
        });
        expect((await (await post(VERDICTS, [])).json<PlayLogError>()).reasons).toEqual(['body: expected an object']);
        const broken = await post(VERDICTS, '{not json');
        expect(broken.status).toBe(400);
        expect(await broken.json<PlayLogError>()).toEqual({ error: 'invalid ballot verdict', reasons: ['body: not valid JSON'] });
    });

    it('rejects a verdict text over its byte cap', async () => {
        const response = await post(VERDICTS, verdict({ verdictText: 'é'.repeat(BALLOT_LIMITS.verdictTextBytes / 2 + 1) }));
        expect(response.status).toBe(400);
        expect((await response.json<PlayLogError>()).reasons).toEqual([
            `verdictText: over ${BALLOT_LIMITS.verdictTextBytes} bytes`,
        ]);
    });

    it('refuses a body over the cap with a 413 and drops it', async () => {
        const response = await post(VERDICTS, verdict({ general: 'x'.repeat(BALLOT_LIMITS.bodyBytes) }));
        expect(response.status).toBe(413);
        expect(await response.json<PlayLogError>()).toEqual({ error: 'body too large' });
        expect(await verdicts()).toEqual([]);
    });
});

describe('GET /v1/ballot-verdicts', () => {
    it('lists every submit newest first, a resubmit as a new row, and narrows by ?ballot= exactly', async () => {
        await post(VERDICTS, verdict({ general: 'first' }));
        await post(VERDICTS, verdict({ ballotId: 'blood-price-2026-10-11', general: 'other' }));
        await post(VERDICTS, verdict({ general: 'resubmit' }));

        expect((await verdicts()).map((v) => v.general)).toEqual(['resubmit', 'other', 'first']);
        expect((await verdicts('?ballot=elementalist-2026-10-22')).map((v) => v.general)).toEqual(['resubmit', 'first']);
        expect(await verdicts('?ballot=elementalist')).toEqual([]);
    });
});

describe('status (BV2a)', () => {
    it('stores a draft as draft, and a post without a status as final', async () => {
        const { status: _s, ...unmarked } = verdict({ general: 'unmarked' });
        expect((await post(VERDICTS, unmarked)).status).toBe(201);
        expect((await post(VERDICTS, verdict({ general: 'saved', status: 'draft' }))).status).toBe(201);
        expect((await verdicts()).map((v) => [v.general, v.status])).toEqual([
            ['saved', 'draft'],
            ['unmarked', 'final'],
        ]);
    });

    it('refuses any other status with a 400 naming it, and stores nothing', async () => {
        for (const status of ['maybe', 'FINAL', '', null, 1]) {
            const response = await post(VERDICTS, { ...verdict(), status });
            expect(response.status).toBe(400);
            expect(await response.json<PlayLogError>()).toEqual({
                error: 'invalid ballot verdict',
                reasons: [`status: expected draft or final, got ${JSON.stringify(status)}`],
            });
        }
        expect(await verdicts()).toEqual([]);
    });

    it('narrows by ?status= exactly, alone and with ?ballot=, newest first', async () => {
        await post(VERDICTS, verdict({ general: 'save 1', status: 'draft' }));
        await post(VERDICTS, verdict({ general: 'submit' }));
        await post(VERDICTS, verdict({ ballotId: 'blood-price-2026-10-11', general: 'other', status: 'draft' }));
        await post(VERDICTS, verdict({ general: 'save 2', status: 'draft' }));

        expect((await verdicts()).map((v) => v.general)).toEqual(['save 2', 'other', 'submit', 'save 1']);
        expect((await verdicts('?status=draft')).map((v) => v.general)).toEqual(['save 2', 'other', 'save 1']);
        expect((await verdicts('?status=final')).map((v) => v.general)).toEqual(['submit']);
        expect((await verdicts('?ballot=elementalist-2026-10-22&status=draft')).map((v) => v.general)).toEqual([
            'save 2',
            'save 1',
        ]);
        expect(await verdicts('?ballot=blood-price-2026-10-11&status=final')).toEqual([]);
    });

    it('refuses a ?status= other than draft or final with a 400', async () => {
        const response = await get(`${VERDICTS}?status=finale`);
        expect(response.status).toBe(400);
        expect(await response.json<PlayLogError>()).toEqual({
            error: 'invalid query',
            reasons: ['status: expected draft or final, got "finale"'],
        });
    });

    it('migration 0004 reads a row stored under 0003 as final', async () => {
        const migration = (name: string) => {
            const found = env.TEST_MIGRATIONS.find((m) => m.name === name);
            if (!found) throw new Error(`missing migration ${name}`);
            return found.queries.map((query) => env.DB.prepare(query));
        };
        await env.DB.prepare('DROP TABLE ballot_verdicts').run();
        await env.DB.batch(migration('0003_ballot_verdicts.sql'));
        await env.DB
            .prepare(
                `INSERT INTO ballot_verdicts (received_at, ballot_id, verdict_text, kept_json, notes_json)
                 VALUES ('2026-10-22T20:00:00.000Z', 'elementalist-2026-10-22', 'BV1 verdict', '[]', '{}')`,
            )
            .run();
        await env.DB.batch(migration('0004_ballot_verdict_status.sql'));

        const rows = await verdicts();
        expect(rows.map((v) => [v.verdictText, v.status])).toEqual([['BV1 verdict', 'final']]);
        await expect(
            env.DB.prepare("UPDATE ballot_verdicts SET status = 'maybe'").run(),
        ).rejects.toThrow(/CHECK constraint failed/);
    });
});

describe('CORS', () => {
    it('answers a preflight from the site with 204 and the allow headers, before the token', async () => {
        const response = await preflight(VERDICTS, SITE);
        expect(response.status).toBe(204);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe(SITE);
        expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, GET');
        expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Authorization, Content-Type');
    });

    it('answers a preflight from a branch preview, echoing that origin', async () => {
        const response = await preflight(VERDICTS, PREVIEW);
        expect(response.status).toBe(204);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe(PREVIEW);
    });

    it('sends no allow header to an origin off the list', async () => {
        for (const origin of [
            'https://evil.example',
            'http://axiomancer-ballots.pages.dev',
            'https://a.b.axiomancer-ballots.pages.dev',
            'https://evilaxiomancer-ballots.pages.dev',
            'null',
        ]) {
            expect(corsHeaders(await preflight(VERDICTS, origin))).toEqual([]);
            expect(corsHeaders(await SELF.fetch(VERDICTS, { headers: { ...AUTH, Origin: origin } }))).toEqual([]);
        }
    });

    it('echoes an allowed origin on the 201, the GET, the 400 and the 401', async () => {
        const origin = { Origin: SITE };
        const responses = [
            await post(VERDICTS, verdict(), { ...AUTH, ...origin }),
            await get(VERDICTS, { ...AUTH, ...origin }),
            await post(VERDICTS, {}, { ...AUTH, ...origin }),
            await post(VERDICTS, verdict(), origin),
        ];
        expect(responses.map((r) => r.status)).toEqual([201, 200, 400, 401]);
        for (const response of responses) {
            expect(response.headers.get('Access-Control-Allow-Origin')).toBe(SITE);
            expect(response.headers.get('Vary')).toBe('Origin');
        }
    });

    it('leaves the puzzle and play-log routes exactly as they were', async () => {
        for (const url of [ATTEMPTS, FIGHTS]) {
            const withOrigin = await get(url, { ...AUTH, Origin: SITE });
            expect(withOrigin.status).toBe(200);
            expect(corsHeaders(withOrigin)).toEqual([]);
            expect(withOrigin.headers.get('Vary')).toBeNull();
            const options = await preflight(url, SITE);
            expect(options.status).toBe(401);
            expect(corsHeaders(options)).toEqual([]);
        }
    });
});

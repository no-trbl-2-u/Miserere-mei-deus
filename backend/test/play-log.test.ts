/**
 * BE2 A3: the play-log routes in the Workers runtime against a local D1. A
 * request without the token is a 401, a body the validator rejects (an
 * unknown event kind included) a 400 naming each problem, a body over the
 * cap a 413, and a POST then a GET returns the same row, with `?enemy=` and
 * `?card=` narrowing the lists.
 */

import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import { PLAY_LOG_LIMITS } from '../src/contract';
import {
    COMBAT_EVENT_KINDS,
    PLAY_LOG_UI_EVENT_KINDS,
} from '../../axiomancer-mechanics/src/Combat/combat.play-log-contract';
import type {
    DeckEventList,
    DeckEventPost,
    FightList,
    FightPost,
    PlayLogCreated,
    PlayLogError,
} from '../src/contract';

const BASE = 'https://miserere-api.test';
const FIGHTS = `${BASE}/v1/fights`;
const DECK_EVENTS = `${BASE}/v1/deck-events`;
const AUTH = { Authorization: 'Bearer test-token' };

function fight(over: Partial<FightPost> = {}): FightPost {
    return {
        solver: 'T',
        sessionId: 's-1',
        buildCommit: 'abc1234',
        appBuild: '1.4.0 preview',
        enemyId: 'gutter-wretch',
        playerLevel: 1,
        enemyHpMultiplier: 2,
        outcome: 'victory',
        turns: 4,
        vitaeStart: 30,
        vitaeEnd: 22,
        vitaeLow: 18,
        deck: ['card-1', 'card-h+'],
        relics: ['relic-bleeding-signet'],
        signatures: ['sig-crimson-covenant'],
        events: [
            { kind: 'hand-drawn', cards: ['card-1'], ms: 0, vitae: 30 },
            { kind: 'ui-staged', cardId: 'card-1', ms: 1500, vitae: 30 },
            { kind: 'ui-signature-refused', signatureId: 'sig-crimson-covenant', reason: 'Need 4 Conviction', ms: 1800, vitae: 30 },
            { kind: 'card-played', cardId: 'card-1', useBottom: true, dieId: 'd1', ms: 2100, vitae: 30 },
            { kind: 'effect-fizzled', cardId: 'card-1', effectId: 'e1', message: 'no target', ms: 2100, vitae: 30 },
            { kind: 'combat-ended', outcome: 'victory', ms: 60000, vitae: 22 },
        ],
        ...over,
    };
}

function deckEvent(over: Partial<DeckEventPost> = {}): DeckEventPost {
    return {
        solver: 'T',
        sessionId: 's-1',
        buildCommit: 'abc1234',
        appBuild: '1.4.0 preview',
        kind: 'reward',
        cardId: 'card-2',
        offered: ['card-2', 'card-3', 'card-4'],
        deck: ['card-1', 'card-2'],
        where: { nodeId: 'n-3', screen: 'combat-reward' },
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

async function fights(query = ''): Promise<FightList['fights']> {
    return (await (await get(`${FIGHTS}${query}`)).json<FightList>()).fights;
}

async function deckEvents(query = ''): Promise<DeckEventList['deckEvents']> {
    return (await (await get(`${DECK_EVENTS}${query}`)).json<DeckEventList>()).deckEvents;
}

describe('auth', () => {
    it('refuses both methods on both routes with no token or a wrong one, and stores nothing', async () => {
        for (const [url, body] of [[FIGHTS, fight()], [DECK_EVENTS, deckEvent()]] as const) {
            const posted = await post(url, body, {});
            expect(posted.status).toBe(401);
            expect(await posted.json<PlayLogError>()).toEqual({ error: 'unauthorized' });
            expect((await post(url, body, { Authorization: 'Bearer nope' })).status).toBe(401);
            expect((await get(url, {})).status).toBe(401);
        }
        expect(await fights()).toEqual([]);
        expect(await deckEvents()).toEqual([]);
    });
});

describe('POST /v1/fights', () => {
    it('stores a fight and GET returns the same row', async () => {
        const response = await post(FIGHTS, fight());
        expect(response.status).toBe(201);
        const created = await response.json<PlayLogCreated>();
        expect(created.id).toBeTypeOf('number');
        expect(Number.isNaN(Date.parse(created.receivedAt))).toBe(false);
        expect(await fights()).toEqual([{ id: created.id, receivedAt: created.receivedAt, ...fight() }]);
    });

    it('BUG1b A7: takes a fight holding one of every engine and screen event kind', async () => {
        const events = [
            ...COMBAT_EVENT_KINDS.map((kind, i) => ({ kind, ms: i, vitae: 30 })),
            ...PLAY_LOG_UI_EVENT_KINDS.map((kind, i) => (
                kind === 'ui-signature-refused'
                    ? { kind, signatureId: 'sig-1', reason: 'Need 4 Conviction', ms: i, vitae: 30 }
                    : { kind, cardId: 'card-1', ms: i, vitae: 30 }
            )),
        ] as unknown as FightPost['events'];
        const response = await post(FIGHTS, fight({ events }));
        expect(response.status).toBe(201);
        expect((await fights())[0]!.events).toHaveLength(COMBAT_EVENT_KINDS.length + PLAY_LOG_UI_EVENT_KINDS.length);
    });

    it('round-trips a null build commit and a fractional multiplier', async () => {
        const local = fight({ buildCommit: null, enemyHpMultiplier: 1.5, outcome: 'mercy' });
        expect((await post(FIGHTS, local)).status).toBe(201);
        expect((await fights())[0]).toMatchObject(local);
    });

    it('A19: a post from a build that sends no relics or signatures reads as empty', async () => {
        const { relics: _relics, signatures: _signatures, ...old } = fight();
        expect((await post(FIGHTS, old)).status).toBe(201);
        expect((await fights())[0]).toMatchObject({ ...old, relics: [], signatures: [] });
    });

    it('A19: a bad relics or signatures field and a refused tap with no reason are rejected', async () => {
        const body = { ...fight(), relics: 'relic-bleeding-signet', signatures: [''] };
        (body.events as unknown[]).push({ kind: 'ui-signature-refused', signatureId: 'sig-x', ms: 2, vitae: 1 });
        const response = await post(FIGHTS, body);
        expect(response.status).toBe(400);
        expect((await response.json<PlayLogError>()).reasons).toEqual([
            'relics: expected an array',
            'signatures[0]: must not be empty',
            'events[6].reason: expected a string',
        ]);
        expect(await fights()).toEqual([]);
    });

    it('rejects an unknown event kind and a bad field with the validator reasons', async () => {
        const body = fight({ turns: -1 });
        (body.events as unknown[]).push({ kind: 'card-burned', ms: 1, vitae: 1 });
        const response = await post(FIGHTS, body);
        expect(response.status).toBe(400);
        expect(await response.json<PlayLogError>()).toEqual({
            error: 'invalid fight',
            reasons: ['turns: expected a whole number of at least 0', 'events[6].kind: unknown event kind "card-burned"'],
        });
        expect(await fights()).toEqual([]);
    });

    it('rejects a body that is not JSON', async () => {
        const response = await post(FIGHTS, '{not json');
        expect(response.status).toBe(400);
        expect(await response.json<PlayLogError>()).toEqual({ error: 'invalid fight', reasons: ['body: not valid JSON'] });
    });

    it('refuses a body over the cap with a 413 and drops it', async () => {
        const padding = 'x'.repeat(PLAY_LOG_LIMITS.fightBytes);
        const response = await post(FIGHTS, { ...fight(), padding });
        expect(response.status).toBe(413);
        expect(await response.json<PlayLogError>()).toEqual({ error: 'body too large' });
        expect(await fights()).toEqual([]);
    });
});

describe('POST /v1/deck-events', () => {
    it('stores each kind and GET returns the rows', async () => {
        const posted = [
            deckEvent(),
            deckEvent({ kind: 'cache-reward', cardId: null, where: { nodeId: null, screen: 'cache' } }),
            deckEvent({ kind: 'remove', cardId: 'card-1', offered: null, deck: ['card-2'] }),
            deckEvent({ kind: 'run-end', cardId: null, offered: null }),
        ];
        const ids: number[] = [];
        for (const body of posted) {
            const response = await post(DECK_EVENTS, body);
            expect(response.status).toBe(201);
            ids.push((await response.json<PlayLogCreated>()).id);
        }
        const rows = await deckEvents();
        expect(rows.map((r) => r.id)).toEqual([...ids].reverse());
        expect(rows.map(({ id: _id, receivedAt: _at, ...rest }) => rest)).toEqual([...posted].reverse());
    });

    it('rejects a picked card that was not offered', async () => {
        const response = await post(DECK_EVENTS, deckEvent({ cardId: 'card-9' }));
        expect(response.status).toBe(400);
        expect(await response.json<PlayLogError>()).toEqual({
            error: 'invalid deck event',
            reasons: ['cardId: expected one of the offered cards'],
        });
    });

    it('refuses a body over its smaller cap', async () => {
        const padding = 'x'.repeat(PLAY_LOG_LIMITS.deckEventBytes);
        expect((await post(DECK_EVENTS, { ...deckEvent(), padding })).status).toBe(413);
        expect(await deckEvents()).toEqual([]);
    });
});

describe('GET filters', () => {
    it('lists fights newest first and narrows by ?enemy=', async () => {
        await post(FIGHTS, fight({ enemyId: 'gutter-wretch', turns: 1 }));
        await post(FIGHTS, fight({ enemyId: 'choir-warden', turns: 2 }));
        await post(FIGHTS, fight({ enemyId: 'gutter-wretch', turns: 3 }));

        expect((await fights()).map((f) => f.turns)).toEqual([3, 2, 1]);
        expect((await fights('?enemy=gutter-wretch')).map((f) => f.turns)).toEqual([3, 1]);
        expect(await fights('?enemy=nobody')).toEqual([]);
    });

    it('lists deck events newest first and narrows by ?card=', async () => {
        await post(DECK_EVENTS, deckEvent({ cardId: 'card-2' }));
        await post(DECK_EVENTS, deckEvent({ kind: 'remove', cardId: 'card-1', offered: null }));
        await post(DECK_EVENTS, deckEvent({ cardId: null }));

        expect((await deckEvents()).map((e) => e.cardId)).toEqual([null, 'card-1', 'card-2']);
        expect((await deckEvents('?card=card-1')).map((e) => e.kind)).toEqual(['remove']);
    });
});

describe('routing', () => {
    it('is a 405 for another method on each play-log route', async () => {
        for (const url of [FIGHTS, DECK_EVENTS]) {
            const put = await SELF.fetch(url, { method: 'PUT', headers: AUTH });
            expect(put.status).toBe(405);
            expect(put.headers.get('Allow')).toBe('GET, POST');
        }
    });

    it('is a 404 for a path that only looks like a route', async () => {
        expect((await SELF.fetch(`${BASE}/v1/toString`, { headers: AUTH })).status).toBe(404);
        expect((await SELF.fetch(`${BASE}/v1/fights/1`, { headers: AUTH })).status).toBe(404);
    });
});

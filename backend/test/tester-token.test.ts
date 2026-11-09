/**
 * Spec 163 (TK1a) A1-A3: the tester token, the one a published APK carries.
 * It opens the POST of the app's six paths and nothing else; the walk below
 * reads the Worker's own route table, so a route added later is checked here
 * without editing this file, and is owner-only unless it opts in.
 */

import { env, SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import { BALLOT_VERDICTS_PATH } from '../src/ballot';
import {
    PLAY_LOG_DECK_EVENTS_PATH,
    PLAY_LOG_FIGHTS_PATH,
    PLAY_RUNS_PATH,
    PUZZLE_ATTEMPTS_PATH,
    RUN_EVENTS_PATH,
} from '../src/contract';
import type { DeckEventPost, FightPost, PlayRunEndPost, PlayRunPost, PuzzleAttemptPost, RunEventsPost } from '../src/contract';
import type { Env } from '../src/env';
import worker, { PLAY_RUN_END_ROUTE, REPORTS_ROUTE, ROUTES } from '../src/index';
import { REPORTS_PATH_PREFIX, REPORT_NAMES } from '../src/reports';

const BASE = 'https://miserere-api.test';
const OWNER = { Authorization: 'Bearer test-token' };
const TESTER = { Authorization: 'Bearer tester-token' };
const RUN_END = '/v1/play-runs/<runId>/end';

/**
 * The app's POSTs (axiomancer-mobile/lib: puzzleAttempts, fightRecorder, deckEvents, playLog, runLog),
 * written out by hand: putting `tester: true` on any other route turns this file red.
 */
const APP_POSTS = [PUZZLE_ATTEMPTS_PATH, PLAY_LOG_FIGHTS_PATH, PLAY_LOG_DECK_EVENTS_PATH, PLAY_RUNS_PATH, RUN_EVENTS_PATH, RUN_END];

const attempt: PuzzleAttemptPost = {
    solver: 'T', layoutId: 'cand-easy-01', route: 'risk', intendedBand: 'easy', moves: [], endKind: 'confirm',
    endMs: 9100, cleared: true, appBuild: '1.4.0 preview',
};
const fight: FightPost = {
    solver: 'T', sessionId: 's-1', buildCommit: 'tk1a000', appBuild: '1.4.0 preview', enemyId: 'gutter-wretch',
    playerLevel: 1, enemyHpMultiplier: 2, outcome: 'victory', turns: 1, vitaeStart: 30, vitaeEnd: 30, vitaeLow: 30,
    deck: ['strike'], relics: [], signatures: [],
    events: [{ kind: 'combat-ended', outcome: 'victory', ms: 3, vitae: 30 }] as never,
};
const deckEvent: DeckEventPost = {
    solver: 'T', sessionId: 's-1', buildCommit: 'tk1a000', appBuild: '1.4.0 preview', kind: 'reward',
    cardId: 'strike', offered: ['strike', 'guard'], deck: ['strike'], where: { nodeId: 'n-1', screen: 'combat-reward' },
};
const playRun = (runId: string): PlayRunPost => ({
    solver: 'T', sessionId: 's-1', buildCommit: 'tk1a000', appBuild: '1.4.0 preview', runId,
    characterId: 'the-chosen', policyId: null, startDeck: ['strike'],
});
const runEvents = (runId: string): RunEventsPost => ({
    runId, events: [{ seq: 0, kind: 'xp-gained', payload: { amount: 30, from: 'fight' } }],
});
const runEnd: PlayRunEndPost = { outcome: 'run-over', endNodeId: 'n-9', level: 1, vitaeEnd: 0, nodesResolved: 1, endDeck: ['strike'] };

type Send = (path: string, init: RequestInit) => Promise<Response>;

const viaSelf: Send = (path, init) => SELF.fetch(`${BASE}${path}`, init);

/** Straight into the Worker with a changed env, the way a Worker with another secret set would answer. */
const viaEnv = (over: Partial<Env>): Send => (path, init) =>
    worker.fetch(new Request(`${BASE}${path}`, init) as never, { ...env, ...over });

function postInit(body: unknown, headers: Record<string, string>): RequestInit {
    return { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) };
}

/** Each of the app's six POSTs in order (open, events, end share one run), with the statuses they answer. */
async function postAll(send: Send, headers: Record<string, string>, runId: string): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    out[PUZZLE_ATTEMPTS_PATH] = (await send(PUZZLE_ATTEMPTS_PATH, postInit(attempt, headers))).status;
    out[PLAY_LOG_FIGHTS_PATH] = (await send(PLAY_LOG_FIGHTS_PATH, postInit(fight, headers))).status;
    out[PLAY_LOG_DECK_EVENTS_PATH] = (await send(PLAY_LOG_DECK_EVENTS_PATH, postInit(deckEvent, headers))).status;
    out[PLAY_RUNS_PATH] = (await send(PLAY_RUNS_PATH, postInit(playRun(runId), headers))).status;
    out[RUN_EVENTS_PATH] = (await send(RUN_EVENTS_PATH, postInit(runEvents(runId), headers))).status;
    out[RUN_END] = (await send(`/v1/play-runs/${runId}/end`, postInit(runEnd, headers))).status;
    return out;
}

const CREATED = {
    [PUZZLE_ATTEMPTS_PATH]: 201, [PLAY_LOG_FIGHTS_PATH]: 201, [PLAY_LOG_DECK_EVENTS_PATH]: 201,
    [PLAY_RUNS_PATH]: 201, [RUN_EVENTS_PATH]: 201, [RUN_END]: 200,
};
const REFUSED = Object.fromEntries(APP_POSTS.map((path) => [path, 401]));

describe('A1: the tester token posts on each of the app paths', () => {
    it('succeeds on all six', async () => {
        expect(await postAll(viaSelf, TESTER, 'tk1a-tester')).toEqual(CREATED);
    });

    it('stores what it posts, read back with the owner token', async () => {
        await postAll(viaSelf, TESTER, 'tk1a-readback');
        const runs = await (await viaSelf(`${PLAY_RUNS_PATH}?source=all`, { headers: OWNER })).json<{ playRuns: { runId: string; outcome: string | null }[] }>();
        expect(runs.playRuns.find((r) => r.runId === 'tk1a-readback')?.outcome).toBe('run-over');
    });
});

describe('A2: the tester token opens nothing else (walks the route table)', () => {
    it('only the app paths opt in, and every app path does', () => {
        const optedIn = Object.entries(ROUTES).filter(([, route]) => route.tester === true).map(([path]) => path);
        if (PLAY_RUN_END_ROUTE.tester === true) optedIn.push(RUN_END);
        expect(REPORTS_ROUTE.tester).toBeUndefined();
        expect(optedIn.sort()).toEqual([...APP_POSTS].sort());
    });

    it('is a 401 on every GET of every route, and on any other method', async () => {
        for (const path of Object.keys(ROUTES)) {
            for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
                const response = await viaSelf(path, { method, headers: TESTER });
                expect(response.status, `${method} ${path}`).toBe(401);
                expect(response.headers.get('WWW-Authenticate'), `${method} ${path}`).toBe('Bearer');
            }
        }
    });

    it('is a 401 on the POST of every route the app does not post to, the ballot verdicts included', async () => {
        const ownerOnly = Object.keys(ROUTES).filter((path) => !APP_POSTS.includes(path));
        expect(ownerOnly).toContain(BALLOT_VERDICTS_PATH);
        for (const path of ownerOnly) {
            const response = await viaSelf(path, postInit({}, TESTER));
            expect(response.status, `POST ${path}`).toBe(401);
        }
    });

    it('is a 401 on every report', async () => {
        for (const name of REPORT_NAMES) {
            const response = await viaSelf(`${REPORTS_PATH_PREFIX}${name}`, { headers: TESTER });
            expect(response.status, name).toBe(401);
        }
        expect((await viaSelf(`${REPORTS_PATH_PREFIX}no-such-report`, { headers: TESTER })).status).toBe(401);
    });

    it('is a 401 on any method but POST at a run end', async () => {
        await viaSelf(PLAY_RUNS_PATH, postInit(playRun('tk1a-end-get'), OWNER));
        for (const method of ['GET', 'PUT', 'DELETE']) {
            expect((await viaSelf('/v1/play-runs/tk1a-end-get/end', { method, headers: TESTER })).status, method).toBe(401);
        }
    });

    it('leaves the owner token opening every route and report', async () => {
        for (const path of Object.keys(ROUTES)) {
            expect((await viaSelf(path, { headers: OWNER })).status, `GET ${path}`).toBe(200);
        }
        expect((await viaSelf(`${REPORTS_PATH_PREFIX}${REPORT_NAMES[0]}`, { headers: OWNER })).status).toBe(200);
        expect(await postAll(viaSelf, OWNER, 'tk1a-owner')).toEqual(CREATED);
    });
});

describe('A3: with PUZZLE_TESTER_TOKEN unset the Worker behaves as before', () => {
    it('refuses the tester token on all six app paths', async () => {
        expect(await postAll(viaEnv({ PUZZLE_TESTER_TOKEN: undefined }), TESTER, 'tk1a-unset')).toEqual(REFUSED);
    });

    it('refuses it when the secret is empty', async () => {
        expect(await postAll(viaEnv({ PUZZLE_TESTER_TOKEN: '' }), TESTER, 'tk1a-empty')).toEqual(REFUSED);
    });

    it('still takes the owner token everywhere', async () => {
        const send = viaEnv({ PUZZLE_TESTER_TOKEN: undefined });
        expect(await postAll(send, OWNER, 'tk1a-unset-owner')).toEqual(CREATED);
        for (const path of Object.keys(ROUTES)) {
            expect((await send(path, { headers: OWNER })).status, `GET ${path}`).toBe(200);
        }
    });

    it('opens nothing with neither secret set', async () => {
        const send = viaEnv({ PUZZLE_API_TOKEN: '', PUZZLE_TESTER_TOKEN: undefined });
        expect(await postAll(send, OWNER, 'tk1a-none')).toEqual(REFUSED);
        expect(await postAll(send, { Authorization: 'Bearer ' }, 'tk1a-none-blank')).toEqual(REFUSED);
    });
});

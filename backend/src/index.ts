/**
 * miserere-api: the dev Worker (phases BE1a, BE2a, BE2f, BV1a, BV2a).
 *
 *   POST /v1/puzzle-attempts           store one ended attempt        -> 201 { id, receivedAt }
 *   GET  /v1/puzzle-attempts[?layout=] the stored rows, newest first  -> 200 { attempts }
 *   POST /v1/fights                    store one ended fight          -> 201 { id, receivedAt }
 *   GET  /v1/fights[?enemy=]           the stored fights, newest first -> 200 { fights }
 *   POST /v1/deck-events               store one deck change          -> 201 { id, receivedAt }
 *   GET  /v1/deck-events[?card=]       the stored changes, newest first -> 200 { deckEvents }
 *   GET  /v1/reports/<name>[?build=][&card=]
 *                                      a fixed play-log report         -> 200 { report, ... }
 *   POST /v1/ballot-verdicts           store one ballot save or verdict -> 201 { id, receivedAt }
 *   GET  /v1/ballot-verdicts[?ballot=][&status=]
 *                                      the stored rows, newest first  -> 200 { ballotVerdicts }
 *
 * Every route needs `Authorization: Bearer <PUZZLE_API_TOKEN>` (401 without
 * it). A POST body over its route's cap is a 413; one the route's validator
 * rejects is a 400 naming each problem. Only preview builds post the puzzle
 * and play-log routes; production never does.
 *
 * A ballot row carries `status`: `draft` for a Save, `final` for a Submit
 * (the default when a post leaves it out). The verdict in force for a ballot
 * is its newest `final` row, `?ballot=<id>&status=final`; a `draft` is
 * progress, never a verdict. A `status=` other than those two is a 400.
 *
 * The reports are `card-usage` and `card-gaps` (`reports.ts`); their SQL is
 * fixed on the Worker and the query string only binds values. Another name is
 * a 404 and any method but GET a 405.
 *
 * The ballot routes alone are called from a browser page on another origin
 * (the card-ledger ballots, `plan/card-ledger/ballot-kit.js`, phase BV1b):
 * they answer an `OPTIONS` preflight before the token check and echo an origin
 * the `BALLOT_ORIGINS` var allows on every response. The other routes send no
 * CORS header.
 */

import { insertAttempt, listAttempts } from './attempts';
import { isAuthorized } from './auth';
import { BALLOT_LIMITS, BALLOT_VERDICTS_PATH, isBallotVerdictStatus, validateBallotVerdictPost } from './ballot';
import type { BallotVerdictList } from './ballot';
import { insertBallotVerdict, listBallotVerdicts } from './ballot-verdicts';
import {
    PLAY_LOG_DECK_EVENTS_PATH,
    PLAY_LOG_FIGHTS_PATH,
    PLAY_LOG_LIMITS,
    PUZZLE_ATTEMPTS_PATH,
    validateDeckEventPost,
    validateFightPost,
    validatePuzzleAttemptPost,
} from './contract';
import type { DeckEventList, FightList, PlayLogCreated, PuzzleAttemptList } from './contract';
import { allowedOrigin, preflight, withCors } from './cors';
import { insertDeckEvent, listDeckEvents } from './deck-events';
import type { Env } from './env';
import { insertFight, listFights } from './fights';
import { error, json, readJsonBody } from './http';
import { REPORTS_PATH_PREFIX, isReportName, runReport } from './reports';

/** One path's two methods. `post` gets a parsed body already under the route's byte cap. */
interface Route {
    maxBytes: number;
    /** The 400's message for a body this route refuses. */
    invalid: string;
    /** Called from a browser page on another origin: answers a preflight and echoes an allowed origin. */
    cors?: boolean;
    post(body: unknown, env: Env): Promise<Response>;
    get(url: URL, env: Env): Promise<Response>;
}

function created(body: PlayLogCreated): Response {
    return json(body, 201);
}

const ROUTES: Record<string, Route> = {
    [PUZZLE_ATTEMPTS_PATH]: {
        maxBytes: 256 * 1024,
        invalid: 'invalid attempt',
        async post(body, env) {
            const checked = validatePuzzleAttemptPost(body);
            if (!checked.ok) return error(400, this.invalid, checked.reasons);
            return created(await insertAttempt(env.DB, checked.attempt, new Date().toISOString()));
        },
        async get(url, env) {
            const layout = url.searchParams.get('layout');
            const list: PuzzleAttemptList = { attempts: await listAttempts(env.DB, layout ?? undefined) };
            return json(list);
        },
    },
    [PLAY_LOG_FIGHTS_PATH]: {
        maxBytes: PLAY_LOG_LIMITS.fightBytes,
        invalid: 'invalid fight',
        async post(body, env) {
            const checked = validateFightPost(body);
            if (!checked.ok) return error(400, this.invalid, checked.reasons);
            return created(await insertFight(env.DB, checked.fight, new Date().toISOString()));
        },
        async get(url, env) {
            const enemy = url.searchParams.get('enemy');
            const list: FightList = { fights: await listFights(env.DB, enemy ?? undefined) };
            return json(list);
        },
    },
    [PLAY_LOG_DECK_EVENTS_PATH]: {
        maxBytes: PLAY_LOG_LIMITS.deckEventBytes,
        invalid: 'invalid deck event',
        async post(body, env) {
            const checked = validateDeckEventPost(body);
            if (!checked.ok) return error(400, this.invalid, checked.reasons);
            return created(await insertDeckEvent(env.DB, checked.deckEvent, new Date().toISOString()));
        },
        async get(url, env) {
            const card = url.searchParams.get('card');
            const list: DeckEventList = { deckEvents: await listDeckEvents(env.DB, card ?? undefined) };
            return json(list);
        },
    },
    [BALLOT_VERDICTS_PATH]: {
        maxBytes: BALLOT_LIMITS.bodyBytes,
        invalid: 'invalid ballot verdict',
        cors: true,
        async post(body, env) {
            const checked = validateBallotVerdictPost(body);
            if (!checked.ok) return error(400, this.invalid, checked.reasons);
            return created(await insertBallotVerdict(env.DB, checked.verdict, new Date().toISOString()));
        },
        async get(url, env) {
            const ballot = url.searchParams.get('ballot');
            const status = url.searchParams.get('status');
            if (status !== null && !isBallotVerdictStatus(status)) {
                return error(400, 'invalid query', [`status: expected draft or final, got ${JSON.stringify(status)}`]);
            }
            const ballotVerdicts = await listBallotVerdicts(env.DB, {
                ballotId: ballot ?? undefined,
                status: status ?? undefined,
            });
            const list: BallotVerdictList = { ballotVerdicts };
            return json(list);
        },
    },
};

async function handle(route: Route, request: Request, url: URL, env: Env): Promise<Response> {
    if (!isAuthorized(request, env.PUZZLE_API_TOKEN)) {
        return error(401, 'unauthorized', undefined, { 'WWW-Authenticate': 'Bearer' });
    }
    if (request.method === 'POST') {
        const read = await readJsonBody(request, route.maxBytes, route.invalid);
        return read.ok ? route.post(read.body, env) : read.response;
    }
    if (request.method === 'GET') return route.get(url, env);
    return error(405, 'method not allowed', undefined, { Allow: 'GET, POST' });
}

/** `GET /v1/reports/<name>`: token first, then the name, then the method. */
async function handleReport(request: Request, url: URL, env: Env): Promise<Response> {
    if (!isAuthorized(request, env.PUZZLE_API_TOKEN)) {
        return error(401, 'unauthorized', undefined, { 'WWW-Authenticate': 'Bearer' });
    }
    const name = url.pathname.slice(REPORTS_PATH_PREFIX.length);
    if (!isReportName(name)) return error(404, 'not found', [`report: expected card-usage or card-gaps, got ${JSON.stringify(name)}`]);
    if (request.method !== 'GET') return error(405, 'method not allowed', undefined, { Allow: 'GET' });
    const build = url.searchParams.get('build') || null;
    const card = url.searchParams.get('card') || null;
    return json(await runReport(name, env, { build, card }));
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        if (url.pathname.startsWith(REPORTS_PATH_PREFIX)) return handleReport(request, url, env);
        const route = Object.hasOwn(ROUTES, url.pathname) ? ROUTES[url.pathname] : undefined;
        if (!route) return error(404, 'not found');
        if (!route.cors) return handle(route, request, url, env);
        const origin = allowedOrigin(request, env.BALLOT_ORIGINS);
        if (request.method === 'OPTIONS') return preflight(origin);
        return withCors(await handle(route, request, url, env), origin);
    },
} satisfies ExportedHandler<Env>;

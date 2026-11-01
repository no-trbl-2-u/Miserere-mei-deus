/**
 * miserere-api: the dev Worker (phases BE1a, BE2a, BE2f, BV1a, BV2a, SM1c).
 *
 *   POST /v1/puzzle-attempts           store one ended attempt        -> 201 { id, receivedAt }
 *   GET  /v1/puzzle-attempts[?layout=][&source=]
 *                                      the stored rows, newest first  -> 200 { attempts }
 *   POST /v1/fights                    store one ended fight          -> 201 { id, receivedAt }
 *   GET  /v1/fights[?enemy=][&source=] the stored fights, newest first -> 200 { fights }
 *   POST /v1/deck-events               store one deck change          -> 201 { id, receivedAt }
 *   GET  /v1/deck-events[?card=][&source=]
 *                                      the stored changes, newest first -> 200 { deckEvents }
 *   POST /v1/play-runs                 open a run (idempotent on runId) -> 201 { id, startedAt }, 200 if already open
 *   POST /v1/play-runs/<runId>/end     close it once                  -> 200 { id, endedAt }, 409 if closed, 404 if unknown
 *   GET  /v1/play-runs[?source=]       the stored runs, newest first  -> 200 { playRuns }
 *   POST /v1/run-events                store one batch of a run's events -> 201 { count, receivedAt }
 *   GET  /v1/run-events[?run=][&source=]
 *                                      the stored events, run then seq -> 200 { runEvents }
 *   GET  /v1/reports/<name>[?build=][&source=][&card=]
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
 * Every fight, deck event and puzzle attempt says who played it (phase SM1a): `source` is `human`,
 * `harness` or `sim`, stored `human` when a post leaves it out, and `runId` is the save's run id or
 * null. A list takes `?source=` (`human`, `harness`, `sim` or `all`; absent reads every source); a
 * report takes the same and reads `human` when it is absent, except `run-summary` (every source, one
 * row group each) and `card-vs-bot` (always `human` beside `sim`; it reads `?build=` only). Any other
 * value is a 400.
 *
 * A run (phase SM1c) is one `play_runs` row, opened when it starts and closed once when it ends; the
 * Worker stamps `startedAt` and `endedAt`. Its `run_events` (a node entered or resolved, a hazard
 * ended, XP, a level, an item) post in batches of at most 200 events and 256 KiB, each carrying a
 * per-run `seq`. An open body is capped at 64 KiB, as is a close. The run id is the save's.
 *
 * The reports are `card-usage`, `card-gaps`, `signature-usage`, `card-vs-bot` and `run-summary` (`reports.ts`); their SQL is
 * fixed on the Worker and the query string only binds values. Another name is
 * a 404 and any method but GET a 405.
 *
 * A cron at 05:17 UTC (`scheduled`, `retention.ts`) deletes `sim` and `harness` rows older than 14 days
 * from the play-log tables; `human` rows are never touched.
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
    PLAY_LOG_SOURCE_FILTERS,
    PLAY_RUNS_PATH,
    PUZZLE_ATTEMPTS_PATH,
    RUN_EVENTS_PATH,
    validateDeckEventPost,
    validateFightPost,
    validatePlayRunEndPost,
    validatePlayRunPost,
    validatePuzzleAttemptPost,
    validateRunEventsPost,
} from './contract';
import type {
    DeckEventList,
    FightList,
    PlayLogCreated,
    PlayLogSourceFilter,
    PlayLogSourceKind,
    PlayRunList,
    PuzzleAttemptList,
    RunEventList,
    RunEventsCreated,
} from './contract';
import { allowedOrigin, preflight, withCors } from './cors';
import { insertDeckEvent, listDeckEvents } from './deck-events';
import type { Env } from './env';
import { insertFight, listFights } from './fights';
import { error, json, readJsonBody } from './http';
import { closePlayRun, listPlayRuns, openPlayRun } from './play-runs';
import { REPORTS_PATH_PREFIX, isReportName, runReport } from './reports';
import { retentionLogLine, runRetention } from './retention';
import { insertRunEvents, listRunEvents } from './run-events';

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

const isSourceFilter = (value: string): value is PlayLogSourceFilter =>
    (PLAY_LOG_SOURCE_FILTERS as readonly string[]).includes(value);

/** A bad `?source=`: the 400 every list and report answers with. */
function badSource(value: string): Response {
    return error(400, 'invalid query', [`source: expected one of ${PLAY_LOG_SOURCE_FILTERS.join(', ')}, got ${JSON.stringify(value)}`]);
}

/** `?source=` on a list route: absent or `all` reads every source (null), else one. */
function listSource(url: URL): { source: PlayLogSourceKind | null } | { response: Response } {
    const value = url.searchParams.get('source');
    if (value === null || value === 'all') return { source: null };
    return isSourceFilter(value) ? { source: value as PlayLogSourceKind } : { response: badSource(value) };
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
            const filter = listSource(url);
            if ('response' in filter) return filter.response;
            const list: PuzzleAttemptList = { attempts: await listAttempts(env.DB, layout ?? undefined, filter.source) };
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
            const filter = listSource(url);
            if ('response' in filter) return filter.response;
            const list: FightList = { fights: await listFights(env.DB, enemy ?? undefined, filter.source) };
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
            const filter = listSource(url);
            if ('response' in filter) return filter.response;
            const list: DeckEventList = { deckEvents: await listDeckEvents(env.DB, card ?? undefined, filter.source) };
            return json(list);
        },
    },
    [PLAY_RUNS_PATH]: {
        maxBytes: PLAY_LOG_LIMITS.playRunBytes,
        invalid: 'invalid play run',
        async post(body, env) {
            const checked = validatePlayRunPost(body);
            if (!checked.ok) return error(400, this.invalid, checked.reasons);
            const { created, run } = await openPlayRun(env.DB, checked.playRun, new Date().toISOString());
            return json(run, created ? 201 : 200);
        },
        async get(url, env) {
            const filter = listSource(url);
            if ('response' in filter) return filter.response;
            const list: PlayRunList = { playRuns: await listPlayRuns(env.DB, filter.source) };
            return json(list);
        },
    },
    [RUN_EVENTS_PATH]: {
        maxBytes: PLAY_LOG_LIMITS.runEventBytes,
        invalid: 'invalid run events',
        async post(body, env) {
            const checked = validateRunEventsPost(body);
            if (!checked.ok) return error(400, this.invalid, checked.reasons);
            const receivedAt = new Date().toISOString();
            const count = await insertRunEvents(env.DB, checked.batch, receivedAt);
            const out: RunEventsCreated = { count, receivedAt };
            return json(out, 201);
        },
        async get(url, env) {
            const filter = listSource(url);
            if ('response' in filter) return filter.response;
            const list: RunEventList = { runEvents: await listRunEvents(env.DB, url.searchParams.get('run') || undefined, filter.source) };
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

const PLAY_RUN_END_PATH = /^\/v1\/play-runs\/([^/]+)\/end$/;

/** The run id in a `POST /v1/play-runs/<runId>/end` path, or null when the path is not one. */
function playRunEndId(pathname: string): string | null {
    const match = PLAY_RUN_END_PATH.exec(pathname);
    if (!match) return null;
    try {
        return decodeURIComponent(match[1]);
    } catch {
        return null;
    }
}

/** `POST /v1/play-runs/<runId>/end`: token first, then the method, then the body; a second close is a 409. */
async function handlePlayRunEnd(runId: string, request: Request, env: Env): Promise<Response> {
    if (!isAuthorized(request, env.PUZZLE_API_TOKEN)) {
        return error(401, 'unauthorized', undefined, { 'WWW-Authenticate': 'Bearer' });
    }
    if (request.method !== 'POST') return error(405, 'method not allowed', undefined, { Allow: 'POST' });
    const invalid = 'invalid play run end';
    const read = await readJsonBody(request, PLAY_LOG_LIMITS.playRunBytes, invalid);
    if (!read.ok) return read.response;
    const checked = validatePlayRunEndPost(read.body);
    if (!checked.ok) return error(400, invalid, checked.reasons);
    const closed = await closePlayRun(env.DB, runId, checked.end, new Date().toISOString());
    if (closed.result === 'closed') return json(closed.run);
    if (closed.result === 'already-closed') return error(409, 'run already closed', [`runId: ${JSON.stringify(runId)} has ended`]);
    return error(404, 'not found', [`runId: no run opened as ${JSON.stringify(runId)}`]);
}

/** `GET /v1/reports/<name>`: token first, then the name, then the method. */
async function handleReport(request: Request, url: URL, env: Env): Promise<Response> {
    if (!isAuthorized(request, env.PUZZLE_API_TOKEN)) {
        return error(401, 'unauthorized', undefined, { 'WWW-Authenticate': 'Bearer' });
    }
    const name = url.pathname.slice(REPORTS_PATH_PREFIX.length);
    if (!isReportName(name)) return error(404, 'not found', [`report: expected card-usage, card-gaps, signature-usage, card-vs-bot or run-summary, got ${JSON.stringify(name)}`]);
    if (request.method !== 'GET') return error(405, 'method not allowed', undefined, { Allow: 'GET' });
    const build = url.searchParams.get('build') || null;
    const card = url.searchParams.get('card') || null;
    // run-summary lists each source in its own rows, so an absent `?source=` reads them all (SM1h); every other report reads `human`.
    const asked = url.searchParams.get('source') || (name === 'run-summary' ? 'all' : 'human');
    if (!isSourceFilter(asked)) return badSource(asked);
    return json(await runReport(name, env, { build, card, source: asked }));
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        if (url.pathname.startsWith(REPORTS_PATH_PREFIX)) return handleReport(request, url, env);
        const endedRun = playRunEndId(url.pathname);
        if (endedRun !== null) return handlePlayRunEnd(endedRun, request, env);
        const route = Object.hasOwn(ROUTES, url.pathname) ? ROUTES[url.pathname] : undefined;
        if (!route) return error(404, 'not found');
        if (!route.cors) return handle(route, request, url, env);
        const origin = allowedOrigin(request, env.BALLOT_ORIGINS);
        if (request.method === 'OPTIONS') return preflight(origin);
        return withCors(await handle(route, request, url, env), origin);
    },
    /** The nightly cron (`[triggers]` in wrangler.toml): `sim` and `harness` rows older than 14 days leave D1. */
    async scheduled(controller: ScheduledController, env: Env): Promise<void> {
        console.log(retentionLogLine(await runRetention(env.DB, new Date(controller.scheduledTime))));
    },
} satisfies ExportedHandler<Env>;

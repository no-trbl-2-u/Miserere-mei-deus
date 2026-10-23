/**
 * miserere-api: the dev Worker (phases BE1a, BE2a).
 *
 *   POST /v1/puzzle-attempts           store one ended attempt        -> 201 { id, receivedAt }
 *   GET  /v1/puzzle-attempts[?layout=] the stored rows, newest first  -> 200 { attempts }
 *   POST /v1/fights                    store one ended fight          -> 201 { id, receivedAt }
 *   GET  /v1/fights[?enemy=]           the stored fights, newest first -> 200 { fights }
 *   POST /v1/deck-events               store one deck change          -> 201 { id, receivedAt }
 *   GET  /v1/deck-events[?card=]       the stored changes, newest first -> 200 { deckEvents }
 *
 * Every route needs `Authorization: Bearer <PUZZLE_API_TOKEN>` (401 without
 * it). A POST body over its route's cap is a 413; one the shared contract
 * validator rejects is a 400 naming each problem. Only preview builds post;
 * production never does.
 */

import { insertAttempt, listAttempts } from './attempts';
import { isAuthorized } from './auth';
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
import { insertDeckEvent, listDeckEvents } from './deck-events';
import type { Env } from './env';
import { insertFight, listFights } from './fights';
import { error, json, readJsonBody } from './http';

/** One path's two methods. `post` gets a parsed body already under the route's byte cap. */
interface Route {
    maxBytes: number;
    /** The 400's message for a body this route refuses. */
    invalid: string;
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
};

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const route = Object.hasOwn(ROUTES, url.pathname) ? ROUTES[url.pathname] : undefined;
        if (!route) return error(404, 'not found');
        if (!isAuthorized(request, env.PUZZLE_API_TOKEN)) {
            return error(401, 'unauthorized', undefined, { 'WWW-Authenticate': 'Bearer' });
        }
        if (request.method === 'POST') {
            const read = await readJsonBody(request, route.maxBytes, route.invalid);
            return read.ok ? route.post(read.body, env) : read.response;
        }
        if (request.method === 'GET') return route.get(url, env);
        return error(405, 'method not allowed', undefined, { Allow: 'GET, POST' });
    },
} satisfies ExportedHandler<Env>;

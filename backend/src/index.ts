/**
 * miserere-api: the dev puzzle solve-time Worker (phase BE1a).
 *
 *   POST /v1/puzzle-attempts           store one ended attempt  -> 201 { id, receivedAt }
 *   GET  /v1/puzzle-attempts[?layout=] the stored rows, newest first -> 200 { attempts }
 *
 * Both routes need `Authorization: Bearer <PUZZLE_API_TOKEN>` (401 without
 * it). A POST body the shared contract validator rejects is a 400 naming
 * each problem. Only preview builds post; production never does.
 */

import { insertAttempt, listAttempts } from './attempts';
import { isAuthorized } from './auth';
import { PUZZLE_ATTEMPTS_PATH, validatePuzzleAttemptPost } from './contract';
import type { PuzzleAttemptCreated, PuzzleAttemptList } from './contract';
import type { Env } from './env';
import { error, json } from './http';

/** A body larger than this is refused before it is parsed. */
const MAX_BODY_BYTES = 256 * 1024;

async function postAttempt(request: Request, env: Env): Promise<Response> {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
        return error(413, 'body too large');
    }
    let body: unknown;
    try {
        body = JSON.parse(text);
    } catch {
        return error(400, 'invalid attempt', ['body: not valid JSON']);
    }
    const checked = validatePuzzleAttemptPost(body);
    if (!checked.ok) return error(400, 'invalid attempt', checked.reasons);
    const created: PuzzleAttemptCreated = await insertAttempt(env.DB, checked.attempt, new Date().toISOString());
    return json(created, 201);
}

async function getAttempts(url: URL, env: Env): Promise<Response> {
    const layout = url.searchParams.get('layout');
    const list: PuzzleAttemptList = { attempts: await listAttempts(env.DB, layout ?? undefined) };
    return json(list);
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        if (url.pathname !== PUZZLE_ATTEMPTS_PATH) return error(404, 'not found');
        if (!isAuthorized(request, env.PUZZLE_API_TOKEN)) {
            return error(401, 'unauthorized', undefined, { 'WWW-Authenticate': 'Bearer' });
        }
        if (request.method === 'POST') return postAttempt(request, env);
        if (request.method === 'GET') return getAttempts(url, env);
        return error(405, 'method not allowed', undefined, { Allow: 'GET, POST' });
    },
} satisfies ExportedHandler<Env>;

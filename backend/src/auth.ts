import type { Env } from './env';

/**
 * Whether the request bears `token`. A Worker with no token configured
 * refuses every request rather than serving an open endpoint.
 */
export function isAuthorized(request: Request, token: string | undefined): boolean {
    if (!token) return false;
    const header = request.headers.get('Authorization') ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    return match !== null && timingSafeEqual(match[1].trim(), token);
}

/**
 * The check every route runs: the owner token opens everything, and
 * the tester token opens only a POST to a route that opts in with `tester`.
 * A route is owner-only unless it says otherwise.
 */
export function isAllowed(request: Request, env: Env, route: { tester?: boolean }): boolean {
    if (isAuthorized(request, env.PUZZLE_API_TOKEN)) return true;
    return route.tester === true && request.method === 'POST' && isAuthorized(request, env.PUZZLE_TESTER_TOKEN);
}

function timingSafeEqual(a: string, b: string): boolean {
    const left = new TextEncoder().encode(a);
    const right = new TextEncoder().encode(b);
    let diff = left.length ^ right.length;
    for (let i = 0; i < Math.max(left.length, right.length); i++) {
        diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
    }
    return diff === 0;
}

/**
 * CORS for the routes a browser page calls (the ballot pages). `BALLOT_ORIGINS`
 * is a comma-separated list of origins; an entry may name one `*.` subdomain
 * wildcard, which matches exactly one label (a Pages branch preview) and not
 * the bare host. An origin off the list gets no `Access-Control-Allow-*`
 * header, so the browser refuses the response.
 */

export const CORS_ALLOW_METHODS = 'POST, GET';
export const CORS_ALLOW_HEADERS = 'Authorization, Content-Type';

const LABEL = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function parseOrigin(origin: string): URL | null {
    try {
        return new URL(origin);
    } catch {
        return null;
    }
}

function matches(entry: string, origin: URL): boolean {
    const wildcard = entry.includes('://*.');
    const pattern = parseOrigin(wildcard ? entry.replace('://*.', '://') : entry);
    if (!pattern || pattern.protocol !== origin.protocol || pattern.port !== origin.port) return false;
    if (!wildcard) return pattern.host === origin.host;
    const suffix = `.${pattern.hostname}`;
    if (!origin.hostname.endsWith(suffix)) return false;
    return LABEL.test(origin.hostname.slice(0, -suffix.length));
}

/** The request's origin when the list allows it, else null. */
export function allowedOrigin(request: Request, list: string | undefined): string | null {
    const origin = request.headers.get('Origin');
    if (!origin || !list) return null;
    const parsed = parseOrigin(origin);
    if (!parsed || parsed.origin !== origin) return null;
    const entries = list.split(',').map((e) => e.trim()).filter((e) => e !== '');
    return entries.some((entry) => matches(entry, parsed)) ? origin : null;
}

/** The answer to an `OPTIONS` preflight: 204, with the allow headers only for an allowed origin. */
export function preflight(origin: string | null): Response {
    const headers: Record<string, string> = { Vary: 'Origin' };
    if (origin) {
        headers['Access-Control-Allow-Origin'] = origin;
        headers['Access-Control-Allow-Methods'] = CORS_ALLOW_METHODS;
        headers['Access-Control-Allow-Headers'] = CORS_ALLOW_HEADERS;
        headers['Access-Control-Max-Age'] = '86400';
    }
    return new Response(null, { status: 204, headers });
}

/** A route's response with the allowed origin echoed on it. */
export function withCors(response: Response, origin: string | null): Response {
    const out = new Response(response.body, response);
    out.headers.append('Vary', 'Origin');
    if (origin) out.headers.set('Access-Control-Allow-Origin', origin);
    return out;
}

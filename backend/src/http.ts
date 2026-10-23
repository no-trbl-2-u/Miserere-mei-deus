import type { PlayLogError } from './contract';

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
    });
}

export function error(status: number, message: string, reasons?: string[], headers?: Record<string, string>): Response {
    const body: PlayLogError = reasons ? { error: message, reasons } : { error: message };
    return json(body, status, headers);
}

/**
 * Reads a POST body: a 413 when it is over `maxBytes` (refused before it is
 * parsed, and before it is read when the client declares its length), a 400
 * named `invalid` as the route names a rejected body, when it is not JSON.
 */
export async function readJsonBody(
    request: Request,
    maxBytes: number,
    invalid: string,
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
    const declared = Number(request.headers.get('Content-Length'));
    if (Number.isFinite(declared) && declared > maxBytes) {
        return { ok: false, response: error(413, 'body too large') };
    }
    const text = await request.text();
    if (new TextEncoder().encode(text).length > maxBytes) {
        return { ok: false, response: error(413, 'body too large') };
    }
    try {
        return { ok: true, body: JSON.parse(text) };
    } catch {
        return { ok: false, response: error(400, invalid, ['body: not valid JSON']) };
    }
}

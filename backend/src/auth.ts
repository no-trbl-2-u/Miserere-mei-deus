/**
 * The one shared dev bearer token. A Worker with no token configured refuses
 * every request rather than serving an open endpoint.
 */
export function isAuthorized(request: Request, token: string | undefined): boolean {
    if (!token) return false;
    const header = request.headers.get('Authorization') ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    return match !== null && timingSafeEqual(match[1].trim(), token);
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

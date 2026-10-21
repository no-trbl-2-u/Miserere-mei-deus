import type { PuzzleAttemptError } from './contract';

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
    });
}

export function error(status: number, message: string, reasons?: string[], headers?: Record<string, string>): Response {
    const body: PuzzleAttemptError = reasons ? { error: message, reasons } : { error: message };
    return json(body, status, headers);
}

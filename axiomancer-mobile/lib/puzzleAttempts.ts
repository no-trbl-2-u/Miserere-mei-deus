/**
 * The app's side of the solve-time API (phase BE1c, acceptance A3): each
 * `/devpuzzle` attempt that ends is posted once to the `miserere-api` Worker
 * as the shared `PuzzleAttemptPost` (`@mechanics`), so the Worker's validator
 * and this module read one shape.
 *
 * Only a build with dev tools on, and with both `EXPO_PUBLIC_PUZZLE_API_URL`
 * and `EXPO_PUBLIC_PUZZLE_API_TOKEN` baked in, ever posts; anything else gets
 * a null config and makes no network call. A post that fails is dropped with
 * a console warning: no retry, no queue, no UI. The warning is not gated on
 * `__DEV__`, which is false in a preview APK; the dev-tools gate already keeps
 * it out of production.
 */

import { PUZZLE_ATTEMPTS_PATH, type HazardPuzzleBand, type PlayLogSourceKind, type PuzzleAttemptPost } from '@mechanics';

import { getBuildProfile, isDevToolsEnabled } from '@/lib/buildProfile';
import Constants from '@/lib/platform/constants';
import type { HazardPuzzleLogAttempt } from '@/state/presenters/hazard-puzzle-log.engine';

export interface PuzzleApiConfig {
    /** The Worker's origin, with no trailing slash. */
    url: string;
    /** The shared dev bearer token. */
    token: string;
}

export type PuzzleFetch = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number }>;

/** Where and how to post, or null when this build must not post at all. */
export function puzzleApiConfig(): PuzzleApiConfig | null {
    if (!isDevToolsEnabled()) return null;
    // Each name written out in full: Expo inlines an EXPO_PUBLIC_ value only
    // where the literal `process.env.EXPO_PUBLIC_...` appears.
    const url = process.env.EXPO_PUBLIC_PUZZLE_API_URL?.trim();
    const token = process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN?.trim();
    if (!url || !token) return null;
    return { url: url.replace(/\/+$/, ''), token };
}

/** Which build posted: the app version and the build profile, e.g. `1.0.0 preview`. */
export function puzzleAppBuild(): string {
    return `${Constants.expoConfig?.version ?? 'unknown'} ${getBuildProfile() ?? 'dev'}`;
}

/** One attempt's identity across re-renders and late solver renames. */
export function puzzleAttemptKey(attempt: HazardPuzzleLogAttempt): string {
    return `${attempt.layoutId}@${attempt.startedAt}`;
}

/**
 * Who played the attempt and in which run (phase SM1b): the build's source
 * (`playLogSourceKind()`) and the save's run id, null when no run is in
 * progress (a `/devpuzzle` attempt from the title screen).
 */
export interface PuzzleAttemptOrigin {
    source: PlayLogSourceKind;
    runId: string | null;
}

/** The move-log attempt as the API's post body; null while it has not ended. */
export function toPuzzleAttemptPost(
    attempt: HazardPuzzleLogAttempt,
    intendedBand: HazardPuzzleBand | null,
    appBuild: string,
    origin: PuzzleAttemptOrigin,
): PuzzleAttemptPost | null {
    if (attempt.end === null) return null;
    return {
        solver: attempt.solver,
        layoutId: attempt.layoutId,
        route: attempt.route,
        intendedBand,
        moves: attempt.moves.map((m) => ({ ...m })),
        endKind: attempt.end.kind,
        endMs: attempt.end.ms,
        cleared: attempt.end.cleared,
        appBuild,
        source: origin.source,
        runId: origin.runId,
    };
}

function warnDropped(reason: string): void {
    // eslint-disable-next-line no-console
    console.warn(`[puzzleAttempts] attempt not posted (dropped): ${reason}`);
}

/** Posts one attempt. Resolves true on a 2xx; anything else warns and resolves false, never throws. */
export async function postPuzzleAttempt(
    post: PuzzleAttemptPost,
    config: PuzzleApiConfig,
    fetcher: PuzzleFetch = fetch,
): Promise<boolean> {
    try {
        const res = await fetcher(`${config.url}${PUZZLE_ATTEMPTS_PATH}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.token}` },
            body: JSON.stringify(post),
        });
        if (res.ok) return true;
        warnDropped(`HTTP ${res.status}`);
    } catch (err) {
        warnDropped(err instanceof Error ? err.message : String(err));
    }
    return false;
}

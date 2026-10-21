/**
 * Posts each move-log attempt once, the first render it has an `end`
 * (phase BE1c, A3). The attempt list is the `HazardPuzzleDemo` log state:
 * the open attempt is the last entry and ends on the CONFIRM or the expiry.
 * An attempt is remembered by its layout and clock start, so a solver
 * renamed after the solve, a re-render or a second effect run never posts
 * it again. With no API config (production, or no URL or token) this does
 * nothing.
 */

import { useEffect, useRef } from 'react';

import type { HazardPuzzleBand } from '@mechanics';

import {
    postPuzzleAttempt,
    puzzleApiConfig,
    puzzleAppBuild,
    puzzleAttemptKey,
    toPuzzleAttemptPost,
} from '@/lib/puzzleAttempts';
import type { HazardPuzzleLogAttempt } from '@/state/presenters/hazard-puzzle-log.engine';

export function usePostEndedPuzzleAttempts(
    attempts: readonly HazardPuzzleLogAttempt[],
    intendedBandFor: (layoutId: string) => HazardPuzzleBand | null,
): void {
    const posted = useRef(new Set<string>());

    useEffect(() => {
        const config = puzzleApiConfig();
        if (config === null) return;
        for (const attempt of attempts) {
            const key = puzzleAttemptKey(attempt);
            if (attempt.end === null || posted.current.has(key)) continue;
            posted.current.add(key);
            const post = toPuzzleAttemptPost(attempt, intendedBandFor(attempt.layoutId), puzzleAppBuild());
            if (post !== null) void postPuzzleAttempt(post, config);
        }
    }, [attempts, intendedBandFor]);
}

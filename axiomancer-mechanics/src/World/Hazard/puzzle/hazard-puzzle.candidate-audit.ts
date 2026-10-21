/**
 * Hazard puzzle — the candidate check.
 *
 * A candidate passes when it is a valid candidate (layout, label, intended
 * band, route), and on its nominated route alone it is solvable, inside the
 * solver budget, and its winning line replays to a cleared resolve. Unlike
 * `auditHazardPuzzleRoute` it never reads `hazardPuzzleBandOf`: the
 * candidate's band is a claim T's play tests, not a solver threshold.
 */

import { confirmHazardPuzzle, createHazardPuzzleSession, playHazardPuzzleMoves } from './hazard-puzzle.session';
import { solveHazardPuzzle, type HazardPuzzleSolution, type HazardPuzzleSolveOptions } from './hazard-puzzle.solver';
import type { HazardPuzzleCandidate } from './hazard-puzzle.types';
import { validateHazardPuzzleCandidate } from './hazard-puzzle.validate';

export interface HazardPuzzleCandidateAudit {
    id: string;
    /** The solve on the nominated route, with no unlock; null when the candidate is invalid. */
    solution: HazardPuzzleSolution | null;
    /** The winning line replayed through the session clears the round. */
    replayCleared: boolean;
    /** Why the candidate fails the check; empty when it passes. */
    problems: string[];
}

export function auditHazardPuzzleCandidate(
    candidate: HazardPuzzleCandidate,
    options: HazardPuzzleSolveOptions = {},
): HazardPuzzleCandidateAudit {
    const validation = validateHazardPuzzleCandidate(candidate);
    if (!validation.ok) {
        return { id: candidate.id, solution: null, replayCleared: false, problems: validation.reasons };
    }
    const { route } = candidate;
    const solution = solveHazardPuzzle(candidate, route, [], options);
    const replayCleared =
        solution.winningLine !== null &&
        confirmHazardPuzzle(playHazardPuzzleMoves(createHazardPuzzleSession(candidate, route), solution.winningLine))
            .result?.cleared === true;
    const problems: string[] = [];
    if (solution.overBudget) problems.push(`${route}: too open to count (over ${solution.boardsExplored} boards)`);
    if (solution.winningOutcomes === 0) problems.push(`${route}: unsolvable`);
    if (solution.winningOutcomes > 0 && !replayCleared) problems.push(`${route}: winning line does not replay to a clear`);
    return { id: candidate.id, solution, replayCleared, problems };
}

/**
 * Set-level problems: a candidate id or label used twice, or a candidate id
 * a library layout already uses (the dev board looks puzzles up by id).
 */
export function hazardPuzzleCandidateSetProblems(
    candidates: readonly HazardPuzzleCandidate[],
    libraryIds: readonly string[],
): string[] {
    const problems: string[] = [];
    const seen = (key: 'id' | 'label'): void => {
        const counts = new Map<string, number>();
        for (const c of candidates) counts.set(c[key], (counts.get(c[key]) ?? 0) + 1);
        for (const [value, n] of counts) if (n > 1) problems.push(`${key} "${value}" is used by ${n} candidates`);
    };
    seen('id');
    seen('label');
    for (const c of candidates) {
        if (libraryIds.includes(c.id)) problems.push(`id "${c.id}" is already a library layout id`);
    }
    return problems;
}

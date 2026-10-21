/**
 * Hazard puzzle — the candidate set. Labelled puzzles authored for T to play
 * once and rule keep or cut, ten per intended band once authored. They are
 * kept out of `HAZARD_PUZZLE_LIBRARY` on purpose: the library test holds
 * every library layout to the band its solver count gives, and that count
 * is the definition of difficulty the candidates exist to test. A candidate
 * is held to `auditHazardPuzzleCandidate` instead: valid, pool cards only,
 * solvable on its route and inside the solver budget.
 *
 * Every candidate reuses a live hazard's copy through `hazardId`; no card,
 * keyword or story text is written here.
 */

import type { HazardPuzzleCandidate } from './hazard-puzzle.types';

/** The candidate puzzles, grouped easy, medium, hard. Empty until they are authored. */
export const HAZARD_PUZZLE_CANDIDATES: readonly HazardPuzzleCandidate[] = [];

/** A candidate by id; throws on an unknown id. */
export function getHazardPuzzleCandidate(
    id: string,
    candidates: readonly HazardPuzzleCandidate[] = HAZARD_PUZZLE_CANDIDATES,
): HazardPuzzleCandidate {
    const candidate = candidates.find((c) => c.id === id);
    if (!candidate) throw new Error(`Unknown hazard puzzle candidate id: ${id}`);
    return candidate;
}

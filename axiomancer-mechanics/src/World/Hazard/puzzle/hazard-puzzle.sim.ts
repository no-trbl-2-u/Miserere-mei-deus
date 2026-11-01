/**
 * Hazard puzzle — the bots and the difficulty curve (HP6a).
 *
 * Two seeded bots play a puzzle through the session's own move functions
 * and always end in a confirm:
 *  - `random`: each step picks uniformly among the legal moves and confirm.
 *  - `noisy-greedy`: each step picks the move that leaves the smallest
 *    shortfall to the goal (a move and its best single follow-up count as
 *    one placement), confirms when no move shrinks it, and plays a uniform
 *    random legal move instead `HAZARD_PUZZLE_SIM.noise` of the time.
 *
 * `buildHazardPuzzleCurve` plays every candidate on its graded route with
 * both bots and ranks them easiest to hardest by the mean of the two win
 * rates. It is a rough measurement (D57), not a gated baseline. The
 * solver's exhaustive numbers ride beside the score as a cross-check.
 */

import { scrambleSeed } from '../../../Utils/rng';
import { hazardPuzzleLegalMoves } from './hazard-puzzle.legal-moves';
import { confirmHazardPuzzle, createHazardPuzzleSession, playHazardPuzzleMove } from './hazard-puzzle.session';
import { solveHazardPuzzle } from './hazard-puzzle.solver';
import { HAZARD_PUZZLE_SIM } from './hazard-puzzle.tuning';
import type {
    HazardPuzzleBand,
    HazardPuzzleCandidate,
    HazardPuzzleGoal,
    HazardPuzzleLayout,
    HazardPuzzleResult,
    HazardPuzzleSession,
} from './hazard-puzzle.types';
import type { HazardRouteKey } from '../hazard.types';

export type HazardPuzzleBotKind = 'random' | 'noisy-greedy';

export const HAZARD_PUZZLE_BOTS: readonly HazardPuzzleBotKind[] = ['random', 'noisy-greedy'];

/** A seeded stream of floats in [0, 1) (mulberry32). */
export type HazardPuzzleSimRng = () => number;

export function hazardPuzzleSimRng(seed: number): HazardPuzzleSimRng {
    let a = scrambleSeed(seed) | 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** A stable 32-bit hash of a string (FNV-1a), to give each candidate and bot its own stream. */
function hashText(text: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/** How far a resolved result is from the goal: 0 when cleared. */
export function hazardPuzzleShortfall(result: HazardPuzzleResult): number {
    if (Array.isArray(result.goal)) {
        const [gf, ge] = result.goal;
        return Math.max(0, gf - result.force) + Math.max(0, ge - result.escape);
    }
    return Math.max(0, result.goal - (result.force + result.escape));
}

/** The shortfall the session would end on if it were confirmed now. */
function shortfallIfConfirmed(s: HazardPuzzleSession): number {
    const result = confirmHazardPuzzle(s).result;
    return result ? hazardPuzzleShortfall(result) : 0;
}

/**
 * The shortfall a move leaves: the better of confirming right after it and
 * confirming after the best single follow-up (a stage and its power are one
 * placement, as the solver reads first plays), so a card whose value only
 * shows once a die is on it is not passed over.
 */
function shortfallAfterPlacement(after: HazardPuzzleSession): number {
    let best = shortfallIfConfirmed(after);
    for (const follow of hazardPuzzleLegalMoves(after)) {
        const next = playHazardPuzzleMove(after, follow);
        if (next === after) continue;
        best = Math.min(best, shortfallIfConfirmed(next));
    }
    return best;
}

function pick<T>(items: readonly T[], rng: HazardPuzzleSimRng): T {
    return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

/**
 * Plays one session to its end with `bot` and returns the resolved session.
 * Only legal moves and confirm are played, and at `moveCap` moves it
 * confirms, so the result is always resolved.
 */
export function playHazardPuzzleBot(
    start: HazardPuzzleSession,
    bot: HazardPuzzleBotKind,
    rng: HazardPuzzleSimRng,
    moveCap: number = HAZARD_PUZZLE_SIM.moveCap,
): HazardPuzzleSession {
    let s = start;
    for (let step = 0; step < moveCap && s.phase === 'playing'; step += 1) {
        const moves = hazardPuzzleLegalMoves(s);
        if (moves.length === 0) break;
        if (bot === 'random') {
            // Uniform among the legal moves and confirm.
            const i = Math.floor(rng() * (moves.length + 1));
            if (i >= moves.length) break;
            s = playHazardPuzzleMove(s, moves[i]);
            continue;
        }
        if (rng() < HAZARD_PUZZLE_SIM.noise) {
            s = playHazardPuzzleMove(s, pick(moves, rng));
            continue;
        }
        let best: { session: HazardPuzzleSession; shortfall: number } | null = null;
        const here = shortfallIfConfirmed(s);
        for (const move of moves) {
            const next = playHazardPuzzleMove(s, move);
            if (next === s) continue;
            const shortfall = shortfallAfterPlacement(next);
            if (shortfall < here && (!best || shortfall < best.shortfall)) best = { session: next, shortfall };
        }
        if (!best) break;
        s = best.session;
    }
    return confirmHazardPuzzle(s);
}

/** Plays `plays` sessions of a layout on a route with one bot; returns the wins. */
export function simulateHazardPuzzle(
    layout: HazardPuzzleLayout,
    route: HazardRouteKey,
    bot: HazardPuzzleBotKind,
    plays: number,
    seed: number = HAZARD_PUZZLE_SIM.seed,
): number {
    const rng = hazardPuzzleSimRng(seed ^ hashText(`${layout.id}|${route}|${bot}`));
    const fresh = createHazardPuzzleSession(layout, route);
    let wins = 0;
    for (let i = 0; i < plays; i += 1) {
        if (playHazardPuzzleBot(fresh, bot, rng).result?.cleared) wins += 1;
    }
    return wins;
}

/** One candidate's row of the curve. */
export interface HazardPuzzleCurveRow {
    id: string;
    label: string;
    intendedBand: HazardPuzzleBand;
    route: HazardRouteKey;
    goal: HazardPuzzleGoal;
    plays: number;
    randomWins: number;
    noisyGreedyWins: number;
    /** Win share of the random bot, 0 to 1. */
    randomRate: number;
    /** Win share of the noisy-greedy bot, 0 to 1. */
    noisyGreedyRate: number;
    /** The mean of the two win rates: higher is easier. */
    score: number;
    /** The solver's distinct winning outcomes. */
    winningLines: number;
    /** The solver's share of first plays that can still win, 0 to 1. */
    firstPlayShare: number;
}

export interface HazardPuzzleCurve {
    seed: number;
    plays: number;
    /** Easiest first (see `compareHazardPuzzleCurveRows`). */
    rows: HazardPuzzleCurveRow[];
}

/** Easiest first: the higher score, then more solver winning lines, then id. */
export function compareHazardPuzzleCurveRows(a: HazardPuzzleCurveRow, b: HazardPuzzleCurveRow): number {
    if (a.score !== b.score) return b.score - a.score;
    if (a.winningLines !== b.winningLines) return b.winningLines - a.winningLines;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export interface HazardPuzzleCurveOptions {
    seed?: number;
    plays?: number;
}

/** Plays every candidate on its graded route with both bots and ranks them. */
export function buildHazardPuzzleCurve(
    candidates: readonly HazardPuzzleCandidate[],
    options: HazardPuzzleCurveOptions = {},
): HazardPuzzleCurve {
    const seed = options.seed ?? HAZARD_PUZZLE_SIM.seed;
    const plays = options.plays ?? HAZARD_PUZZLE_SIM.plays;
    const rows = candidates.map((c): HazardPuzzleCurveRow => {
        const randomWins = simulateHazardPuzzle(c, c.route, 'random', plays, seed);
        const noisyGreedyWins = simulateHazardPuzzle(c, c.route, 'noisy-greedy', plays, seed);
        const randomRate = plays === 0 ? 0 : randomWins / plays;
        const noisyGreedyRate = plays === 0 ? 0 : noisyGreedyWins / plays;
        const solved = solveHazardPuzzle(c, c.route);
        const firstPlays = solved.firstPlays.winning + solved.firstPlays.losing;
        return {
            id: c.id,
            label: c.label,
            intendedBand: c.intendedBand,
            route: c.route,
            goal: createHazardPuzzleSession(c, c.route).goal,
            plays,
            randomWins,
            noisyGreedyWins,
            randomRate,
            noisyGreedyRate,
            score: (randomRate + noisyGreedyRate) / 2,
            winningLines: solved.winningOutcomes,
            firstPlayShare: firstPlays === 0 ? 0 : solved.firstPlays.winning / firstPlays,
        };
    });
    rows.sort(compareHazardPuzzleCurveRows);
    return { seed, plays, rows };
}

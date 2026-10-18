/**
 * Hazard puzzle — the solver.
 *
 * Walks every board a layout's one round can reach, through the session's
 * own move functions, and counts the distinct winning outcomes. An outcome
 * is what the player played, read off the board after confirm:
 *  - the multiset of staged cards that change the result (a non-zero
 *    value, a die, or a utility), each with its powered flag;
 *  - the reserve left;
 *  - the available dice.
 * Move order is not counted, and a card held in hand is not part of the
 * outcome. A staged card that changes nothing (unpowered, no utility, adds
 * 0/0) reads as held, so a card that is inert in every line never adds an
 * outcome.
 *
 * The walk skips moves that reach nothing new: unstaging (staging has no
 * side effect), re-powering a powered card (power it with the other die
 * instead), applying a card with no utility (confirm applies it), and a
 * second copy of a card or die that is interchangeable with the first.
 */

import { getHazardCardDef } from '../hazard.content';
import { dieCanPowerCard, hazardCardValue } from '../hazard.engine';
import type { HazardDieKind, HazardHandEntry, HazardRouteKey, HazardSessionState } from '../hazard.types';
import {
    confirmHazardPuzzle,
    createHazardPuzzleSession,
    playHazardPuzzleMove,
} from './hazard-puzzle.session';
import { HAZARD_PUZZLE_SOLVER_BUDGET } from './hazard-puzzle.tuning';
import type {
    HazardPuzzleGoal,
    HazardPuzzleLayout,
    HazardPuzzleMove,
    HazardPuzzleResult,
    HazardPuzzleSession,
    HazardPuzzleUnlock,
} from './hazard-puzzle.types';

export interface HazardPuzzleSolveOptions {
    /** Most distinct boards to explore; defaults to `HAZARD_PUZZLE_SOLVER_BUDGET`. */
    budget?: number;
}

export interface HazardPuzzleSolution {
    route: HazardRouteKey;
    goal: HazardPuzzleGoal;
    /** Distinct winning outcomes (end states of a cleared resolve). */
    winningOutcomes: number;
    /**
     * The card ids each winning outcome stages and that change the result,
     * one list per outcome (a card staged twice is listed twice). Feeds
     * `hazardPuzzleCardReport`.
     */
    winningStaged: string[][];
    /**
     * Largest margin over the goal among the winning outcomes: combined
     * minus goal on safe, the weaker meter's margin on risk. Null when
     * nothing wins.
     */
    bestSurplus: number | null;
    /** A move list reaching the best-surplus outcome; null when nothing wins. */
    winningLine: HazardPuzzleMove[] | null;
    /** Distinct boards explored. */
    boardsExplored: number;
    /** True when the walk stopped at the budget: the counts are partial. */
    overBudget: boolean;
}

/** Margin of a resolve over its goal: combined on safe, the weaker meter on risk. */
export function hazardPuzzleSurplus(result: HazardPuzzleResult): number {
    if (Array.isArray(result.goal)) {
        const [gf, ge] = result.goal;
        return Math.min(result.force - gf, result.escape - ge);
    }
    return result.force + result.escape - result.goal;
}

function sortedJoin(items: string[]): string {
    return items.sort().join(',');
}

/** Identity of a board mid-round, blind to uids, die ids and order. */
function boardKey(b: HazardSessionState): string {
    const dieKind = new Map(b.dice.map((d) => [d.id, d.kind]));
    const hand = sortedJoin(b.hand.map((h) => h.cardId));
    const play = sortedJoin(
        b.play.map((p) => `${p.cardId}:${p.dieId ? dieKind.get(p.dieId) : '-'}:${p.applied ? 'a' : ''}`),
    );
    const dice = sortedJoin(b.dice.filter((d) => d.state === 'available').map((d) => d.kind));
    return `${hand}|${play}|${dice}|${b.drawPile.length}|${b.progressBase.force}/${b.progressBase.escape}`;
}

/** True when a staged card changes the result: a non-zero value, a die, or a utility. */
function changesResult(p: HazardHandEntry): boolean {
    if (p.dieId !== null) return true;
    const def = getHazardCardDef(p.cardId);
    if (def.effect && !def.dead) return true;
    const v = hazardCardValue(p);
    return v.force !== 0 || v.escape !== 0;
}

/** The staged cards of a resolved board that change the result, each with its powered flag. */
function stagedThatCount(b: HazardSessionState): HazardHandEntry[] {
    return b.play.filter(changesResult);
}

/** Identity of a resolved board as an outcome (see the module header). */
function outcomeKey(b: HazardSessionState): string {
    const staged = sortedJoin(stagedThatCount(b).map((p) => `${p.cardId}${p.dieId ? '+' : ''}`));
    const dice = sortedJoin(b.dice.filter((d) => d.state === 'available').map((d) => d.kind));
    return `${staged}|${b.drawPile.join(',')}|${dice}`;
}

/** The moves worth trying from a board, one per interchangeable choice. */
function candidateMoves(b: HazardSessionState): HazardPuzzleMove[] {
    const moves: HazardPuzzleMove[] = [];
    const seenHand = new Set<string>();
    for (const h of b.hand) {
        if (seenHand.has(h.cardId)) continue;
        seenHand.add(h.cardId);
        moves.push({ type: 'stage', uid: h.uid });
    }
    const firstDieOfKind = new Map<HazardDieKind, string>();
    for (const d of b.dice) {
        if (d.state === 'available' && !firstDieOfKind.has(d.kind)) firstDieOfKind.set(d.kind, d.id);
    }
    const dieKind = new Map(b.dice.map((d) => [d.id, d.kind]));
    const seenPower = new Set<string>();
    const seenApply = new Set<string>();
    for (const p of b.play) {
        if (p.applied) continue;
        const def = getHazardCardDef(p.cardId);
        if (p.dieId === null && !def.dead && !seenPower.has(p.cardId)) {
            seenPower.add(p.cardId);
            for (const [kind, dieId] of firstDieOfKind) {
                if (dieCanPowerCard(kind, def)) {
                    moves.push({ type: 'power', uid: p.uid, dieId });
                }
            }
        }
        const applyKey = `${p.cardId}:${p.dieId ? dieKind.get(p.dieId) : '-'}`;
        if (def.effect && !def.dead && !seenApply.has(applyKey)) {
            seenApply.add(applyKey);
            moves.push({ type: 'apply', uid: p.uid });
        }
    }
    return moves;
}

interface Best {
    surplus: number;
    line: HazardPuzzleMove[];
}

/** Solves a session as it stands (still playing); the line starts from it. */
export function solveHazardPuzzleSession(
    start: HazardPuzzleSession,
    options: HazardPuzzleSolveOptions = {},
): HazardPuzzleSolution {
    const budget = options.budget ?? HAZARD_PUZZLE_SOLVER_BUDGET;
    const seen = new Set<string>();
    const wins = new Map<string, string[]>();
    let best: Best | null = null;
    let overBudget = false;
    const line: HazardPuzzleMove[] = [];

    const visit = (s: HazardPuzzleSession): void => {
        if (overBudget) return;
        const key = boardKey(s.board);
        if (seen.has(key)) return;
        if (seen.size >= budget) {
            overBudget = true;
            return;
        }
        seen.add(key);
        const resolved = confirmHazardPuzzle(s);
        const result = resolved.result;
        if (result?.cleared) {
            const outcome = outcomeKey(resolved.board);
            if (!wins.has(outcome)) wins.set(outcome, stagedThatCount(resolved.board).map((p) => p.cardId));
            const surplus = hazardPuzzleSurplus(result);
            if (!best || surplus > best.surplus) best = { surplus, line: line.slice() };
        }
        for (const move of candidateMoves(s.board)) {
            const next = playHazardPuzzleMove(s, move);
            if (next === s) continue;
            line.push(move);
            visit(next);
            line.pop();
        }
    };

    if (start.phase === 'playing') visit(start);
    const found = best as Best | null;
    return {
        route: start.route,
        goal: start.goal,
        winningOutcomes: wins.size,
        winningStaged: [...wins.values()],
        bestSurplus: found ? found.surplus : null,
        winningLine: found ? found.line : null,
        boardsExplored: seen.size,
        overBudget,
    };
}

/**
 * Solves a layout on one route from its opening board, with `unlocks`
 * granted at session start (none by default). The winning line replays on
 * a session created with the same unlocks.
 */
export function solveHazardPuzzle(
    layout: HazardPuzzleLayout,
    route: HazardRouteKey,
    unlocks: readonly HazardPuzzleUnlock[] = [],
    options: HazardPuzzleSolveOptions = {},
): HazardPuzzleSolution {
    return solveHazardPuzzleSession(createHazardPuzzleSession(layout, route, unlocks), options);
}

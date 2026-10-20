/**
 * Hazard puzzle — the solver.
 *
 * Walks every board a layout's one round can reach, through the session's
 * own move functions, and counts the distinct winning outcomes. An outcome
 * is what the player played, read off the board after confirm:
 *  - the multiset of staged cards that change the result (a non-zero
 *    value, a die, or a utility), each with its powered flag;
 *  - the reserve and the reroll faces left;
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
 *
 * Alongside the count it reads five difficulty features off the same walk
 * (`HazardPuzzleFeatures`). The walk never undoes a move, so a die placed
 * on a card stays there: that is what lets a first move close every line.
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

/**
 * Five difficulty features of one layout on one route, read off the
 * solver's walk. Calibration (HP2e) picks the one that tracks real
 * first-time solve times.
 */
export interface HazardPuzzleFeatures {
    /** Distinct winning outcomes: the same number as `winningOutcomes`. */
    winningLines: number;
    /**
     * Share of the first placements from which a win is still reachable. A
     * first placement is one hand card staged, either with its die left open
     * or powered by one die kind that can power it; one per interchangeable
     * choice. 0 when the hand is empty.
     */
    openingShare: number;
    /** Distinct losing outcomes one short of the goal (surplus -1; on risk, the weaker meter). */
    nearMisses: number;
    /** Fewest moves (stage, power, apply) in a winning line; null when nothing wins. */
    shortestWin: number | null;
    /** Share of the winning outcomes that stage a DRAW card (confirm applies it); 0 when nothing wins. */
    drawDependence: number;
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
    /** The five difficulty features (partial with the counts when over budget). */
    features: HazardPuzzleFeatures;
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
    const faces = b.rerollFaces?.length ?? 0;
    return `${hand}|${play}|${dice}|${b.drawPile.length}|${faces}|${b.progressBase.force}/${b.progressBase.escape}`;
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
    return `${staged}|${b.drawPile.join(',')}|${(b.rerollFaces ?? []).join(',')}|${dice}`;
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

/** True when a win stages a DRAW card. */
function stagesDraw(cardIds: readonly string[]): boolean {
    return cardIds.some((id) => getHazardCardDef(id).effect === 'draw');
}

/** Solves a session as it stands (still playing); the line starts from it. */
export function solveHazardPuzzleSession(
    start: HazardPuzzleSession,
    options: HazardPuzzleSolveOptions = {},
): HazardPuzzleSolution {
    const budget = options.budget ?? HAZARD_PUZZLE_SOLVER_BUDGET;
    // Shallowest depth each board was reached at, and whether a win lies on from it.
    const depthOf = new Map<string, number>();
    const winsFrom = new Map<string, boolean>();
    const wins = new Map<string, string[]>();
    const nearMisses = new Set<string>();
    let best: Best | null = null;
    let shortestWin: number | null = null;
    let overBudget = false;
    const line: HazardPuzzleMove[] = [];

    // A board met again at a shallower depth is walked again so the
    // shortest win is honest; outcomes are sets, so nothing counts twice.
    const visit = (s: HazardPuzzleSession): boolean => {
        const key = boardKey(s.board);
        const depth = line.length;
        const known = depthOf.get(key);
        // A board already walked answers from the cache even after the
        // budget trips: `openingShare` re-enters the root's placements
        // after the exhaustive walk, and a win found on the way stays a win.
        if (known !== undefined && known <= depth) return winsFrom.get(key) ?? false;
        if (overBudget) return false;
        if (known === undefined && depthOf.size >= budget) {
            overBudget = true;
            return false;
        }
        depthOf.set(key, depth);
        const resolved = confirmHazardPuzzle(s);
        const result = resolved.result;
        let won = false;
        if (result?.cleared) {
            won = true;
            const outcome = outcomeKey(resolved.board);
            if (!wins.has(outcome)) wins.set(outcome, stagedThatCount(resolved.board).map((p) => p.cardId));
            const surplus = hazardPuzzleSurplus(result);
            if (!best || surplus > best.surplus) best = { surplus, line: line.slice() };
            if (shortestWin === null || depth < shortestWin) shortestWin = depth;
        } else if (result && hazardPuzzleSurplus(result) === -1) {
            nearMisses.add(outcomeKey(resolved.board));
        }
        for (const move of candidateMoves(s.board)) {
            const next = playHazardPuzzleMove(s, move);
            if (next === s) continue;
            line.push(move);
            if (visit(next)) won = true;
            line.pop();
        }
        winsFrom.set(key, won);
        return won;
    };

    /** Walks the root by first placements and returns the share that still wins. */
    const openingShare = (root: HazardPuzzleSession): number => {
        let placements = 0;
        let winning = 0;
        const place = (s: HazardPuzzleSession, move: HazardPuzzleMove): HazardPuzzleSession | null => {
            const next = playHazardPuzzleMove(s, move);
            if (next === s) return null;
            placements += 1;
            line.push(move);
            if (visit(next)) winning += 1;
            line.pop();
            return next;
        };
        visit(root);
        for (const stage of candidateMoves(root.board)) {
            if (stage.type !== 'stage') continue;
            const staged = place(root, stage);
            if (!staged) continue;
            line.push(stage);
            for (const power of candidateMoves(staged.board)) {
                if (power.type === 'power' && power.uid === stage.uid) place(staged, power);
            }
            line.pop();
        }
        return placements === 0 ? 0 : winning / placements;
    };

    const share = start.phase === 'playing' ? openingShare(start) : 0;
    const found = best as Best | null;
    const winningStaged = [...wins.values()];
    return {
        route: start.route,
        goal: start.goal,
        winningOutcomes: wins.size,
        winningStaged,
        bestSurplus: found ? found.surplus : null,
        winningLine: found ? found.line : null,
        boardsExplored: depthOf.size,
        overBudget,
        features: {
            winningLines: wins.size,
            openingShare: share,
            nearMisses: nearMisses.size,
            shortestWin,
            drawDependence: wins.size === 0 ? 0 : winningStaged.filter(stagesDraw).length / wins.size,
        },
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

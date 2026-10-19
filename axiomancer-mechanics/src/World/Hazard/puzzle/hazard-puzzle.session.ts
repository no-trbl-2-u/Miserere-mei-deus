/**
 * Hazard puzzle — the one-round session.
 *
 * The round runs on the live minigame's own transitions (stage, unstage,
 * power, apply, convert); this module only builds the board from a layout
 * and judges it once. A puzzle has no bin: a hand card is staged or held,
 * so no card is discarded and salvage never fires. Determinism comes from
 * the board's shape, not from a seed:
 *  - the draw pile is the layout's reserve and the refill bag is empty, so
 *    DRAW takes the next reserve cards in order and never shuffles;
 *  - RE-CAST cards are rejected by the validator, so no die is ever rolled;
 *  - a reroll turns dice to the layout's `rerollFaces`, in order;
 *  - convert dice carry a fixed colour, so they never roll.
 * The board's rng state is a constant that no move advances.
 */

import {
    applyHazardCard,
    hazardProjectedProgress,
    powerHazardCard,
    stageHazardCard,
    unstageHazardCard,
} from '../hazard.engine';
import { HAZARD_MOMENTUM_CAP } from '../hazard.tuning';
import type { HazardRouteKey, HazardSessionState } from '../hazard.types';
import type {
    HazardPuzzleGoal,
    HazardPuzzleLayout,
    HazardPuzzleMove,
    HazardPuzzleResult,
    HazardPuzzleSession,
    HazardPuzzleUnlock,
} from './hazard-puzzle.types';
import { applyHazardPuzzleUnlocks, hazardPuzzleDeclaresUnlocks } from './hazard-puzzle.unlocks';
import { validateHazardPuzzleLayout } from './hazard-puzzle.validate';

/** The puzzle board's draw refill bag: empty, so a draw never shuffles. */
const NO_REFILL: readonly string[] = [];

/**
 * Builds a fresh session on `route`, with `unlocks` granted once (pick them
 * with `activeHazardPuzzleUnlocks` from the player's base stats). Hand cards
 * get uids `c1…cN` in hand order, an unlocked card last, and dice `d<N+1>…`
 * in layout order, an unlocked die last. Throws on an invalid layout or an
 * unlock the layout does not declare.
 */
export function createHazardPuzzleSession(
    layout: HazardPuzzleLayout,
    route: HazardRouteKey,
    unlocks: readonly HazardPuzzleUnlock[] = [],
): HazardPuzzleSession {
    const check = validateHazardPuzzleLayout(layout);
    if (!check.ok) {
        throw new Error(`Invalid hazard puzzle "${layout.id}": ${check.reasons.join('; ')}`);
    }
    if (!hazardPuzzleDeclaresUnlocks(layout, unlocks)) {
        throw new Error(`Hazard puzzle "${layout.id}": an unlock was passed that the layout does not declare`);
    }
    const granted = applyHazardPuzzleUnlocks(layout, unlocks);
    let uid = 0;
    const hand = granted.hand.map((cardId) => {
        uid += 1;
        return { uid: `c${uid}`, cardId, dieId: null };
    });
    const dice = granted.dice.map((kind) => {
        uid += 1;
        return { id: `d${uid}`, kind, state: 'available' as const };
    });
    const board: HazardSessionState = {
        hazardId: layout.id,
        phase: 'playing',
        route,
        round: 1,
        totalRounds: 1,
        marks: ['pending'],
        drawPile: layout.reserve.slice(),
        discardPile: [],
        hand,
        play: [],
        dice,
        rerollFaces: layout.rerollFaces?.slice() ?? [],
        progressBase: { force: 0, escape: 0 },
        momentumCap: HAZARD_MOMENTUM_CAP,
        resolveInfo: null,
        outcome: null,
        pickedRewardCardId: null,
        seed: 0,
        rng: { s: 0 },
        uidCounter: uid,
    };
    const goal: HazardPuzzleGoal = route === 'risk' ? [layout.goals.risk[0], layout.goals.risk[1]] : layout.goals.safe;
    return { layoutId: layout.id, route, goal, phase: 'playing', board, result: null };
}

function onBoard(s: HazardPuzzleSession, next: HazardSessionState): HazardPuzzleSession {
    return next === s.board ? s : { ...s, board: next };
}

export function stageHazardPuzzleCard(s: HazardPuzzleSession, uid: string): HazardPuzzleSession {
    if (s.phase !== 'playing') return s;
    return onBoard(s, stageHazardCard(s.board, uid, NO_REFILL));
}

export function unstageHazardPuzzleCard(s: HazardPuzzleSession, uid: string): HazardPuzzleSession {
    if (s.phase !== 'playing') return s;
    return onBoard(s, unstageHazardCard(s.board, uid));
}

export function powerHazardPuzzleCard(s: HazardPuzzleSession, uid: string, dieId: string): HazardPuzzleSession {
    if (s.phase !== 'playing') return s;
    return onBoard(s, powerHazardCard(s.board, uid, dieId, NO_REFILL));
}

/** Fires a staged card's utility now; a DRAW card takes the next reserve cards. */
export function applyHazardPuzzleCard(s: HazardPuzzleSession, uid: string): HazardPuzzleSession {
    if (s.phase !== 'playing') return s;
    return onBoard(s, applyHazardCard(s.board, uid, NO_REFILL));
}

/** Applies one recorded move. An illegal move returns the same session. */
export function playHazardPuzzleMove(s: HazardPuzzleSession, move: HazardPuzzleMove): HazardPuzzleSession {
    switch (move.type) {
        case 'stage':
            return stageHazardPuzzleCard(s, move.uid);
        case 'unstage':
            return unstageHazardPuzzleCard(s, move.uid);
        case 'power':
            return powerHazardPuzzleCard(s, move.uid, move.dieId);
        case 'apply':
            return applyHazardPuzzleCard(s, move.uid);
    }
}

export function playHazardPuzzleMoves(
    s: HazardPuzzleSession,
    moves: readonly HazardPuzzleMove[],
): HazardPuzzleSession {
    return moves.reduce(playHazardPuzzleMove, s);
}

function clamp01(n: number): number {
    return Math.min(1, Math.max(0, n));
}

/** Judges a board against a goal without changing it. */
function judge(force: number, escape: number, goal: HazardPuzzleGoal): HazardPuzzleResult {
    if (Array.isArray(goal)) {
        const [gf, ge] = goal;
        const p = clamp01(Math.min(force / gf, escape / ge));
        return { force, escape, goal, p, cleared: force >= gf && escape >= ge };
    }
    const combined = force + escape;
    return { force, escape, goal, p: clamp01(combined / goal), cleared: combined >= goal };
}

/**
 * The player's confirm, or the clock running out: applies every staged
 * card not yet applied (as the live resolve does), judges the round once
 * and locks the session. A second confirm returns the same session.
 */
export function confirmHazardPuzzle(s: HazardPuzzleSession): HazardPuzzleSession {
    if (s.phase !== 'playing') return s;
    let board = s.board;
    for (const entry of board.play) {
        if (!entry.applied) board = applyHazardCard(board, entry.uid, NO_REFILL);
    }
    const progress = hazardProjectedProgress(board);
    const result = judge(progress.force, progress.escape, s.goal);
    board = { ...board, marks: [result.cleared ? 'O' : 'X'] };
    return { ...s, phase: 'resolved', board, result };
}

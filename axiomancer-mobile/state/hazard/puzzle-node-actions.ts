/**
 * A hazard node that plays a puzzle (phase HP6c, A6-A8): the Breakwater's six
 * hazard nodes each name one candidate (`BREAKWATER_HAZARD_PUZZLES`), and
 * entering one opens that candidate's one-round board on its graded route,
 * with no route choice. Every other hazard node still runs the three-round
 * board (`beginHazardAction`).
 *
 * The puzzle rides the store's `hazard` slice beside the old session, as
 * `hazard.puzzle`. Like every minigame slice it is never written to a save:
 * the node's arrival is answered only in memory until the claim saves, so a
 * reload mid-puzzle comes back at the checkpoint the move took (the arrival
 * still owed) and the same, deterministic puzzle opens again.
 *
 * Confirming resolves the round and applies the outcome through the claim
 * the dev board uses (`claimHazardPuzzleAction`: XP, the find, the purse,
 * VITAE never below 1, a scar on a short resolve). The node itself was spent
 * when its arrival resolved, as an old-board hazard's is, so a held node (the
 * wreck) has its road open by the time the player is back on the map.
 */

import {
    activeHazardPuzzleUnlocks,
    BREAKWATER_HAZARD_PUZZLES,
    confirmHazardPuzzle,
    createHazardPuzzleSession,
    getHazardPuzzleCandidate,
    hazardPuzzleSimRng,
    playHazardPuzzleBot,
    type GameState,
    type HazardPuzzleCandidate,
    type HazardPuzzleSession,
    type HazardPuzzleUnlock,
} from '@mechanics';

import { claimHazardPuzzleAction, type ClaimHazardPuzzleResult } from './puzzle-store-actions';
import type { AppStore } from '../store';

/** The puzzle a hazard node is playing: the store's `hazard.puzzle`. */
export interface HazardPuzzleNodePlay {
    /** The node it was opened on. */
    readonly nodeId: string;
    /** The candidate the node names (`BREAKWATER_HAZARD_PUZZLES`). */
    readonly candidateId: string;
    /** The stat unlocks the board was built with. */
    readonly unlocks: readonly HazardPuzzleUnlock[];
    /** The one round, on the candidate's graded route. */
    readonly session: HazardPuzzleSession;
    /** Set once the round is confirmed and claimed; the outcome panel reads it. */
    readonly claim: ClaimHazardPuzzleResult | null;
    /** True when the clock ran out rather than CONFIRM being pressed. */
    readonly timedOut: boolean;
}

/** The candidate a node plays, or null for a node that names none (the old board). */
export function hazardPuzzleCandidateForNode(nodeId: string | null | undefined): HazardPuzzleCandidate | null {
    if (!nodeId) return null;
    const id = BREAKWATER_HAZARD_PUZZLES[nodeId];
    if (!id) return null;
    try {
        return getHazardPuzzleCandidate(id);
    } catch {
        return null;
    }
}

/** The candidate behind a play (the table names a real one; the begin checked it). */
export function hazardPuzzleNodeCandidate(play: HazardPuzzleNodePlay): HazardPuzzleCandidate {
    return getHazardPuzzleCandidate(play.candidateId);
}

function currentPlay(store: AppStore): HazardPuzzleNodePlay | null {
    return store.getState().hazard?.puzzle ?? null;
}

function setPlay(store: AppStore, puzzle: HazardPuzzleNodePlay | null): void {
    const prev = store.getState().hazard;
    store.setState({ hazard: { session: prev?.session ?? null, puzzle } });
}

/**
 * Opens the node's puzzle when the player stands on one of the six. Returns
 * false (and changes nothing) on any other node, or while a hazard of either
 * kind is already open.
 */
export function beginHazardPuzzleNodeAction(store: AppStore): boolean {
    const state = store.getState();
    if (state.hazard?.session || state.hazard?.puzzle) return false;
    const nodeId = (state as unknown as GameState).world?.currentMap?.currentNode ?? null;
    const candidate = hazardPuzzleCandidateForNode(nodeId);
    if (!candidate || !nodeId) return false;
    const unlocks = activeHazardPuzzleUnlocks(candidate, state.player.baseStats);
    setPlay(store, {
        nodeId,
        candidateId: candidate.id,
        unlocks,
        session: createHazardPuzzleSession(candidate, candidate.route, unlocks),
        claim: null,
        timedOut: false,
    });
    return true;
}

/** One board move (stage, unstage, power, apply), while the round is open. */
export function moveHazardPuzzleNodeAction(
    store: AppStore,
    move: (session: HazardPuzzleSession) => HazardPuzzleSession,
): void {
    const play = currentPlay(store);
    if (!play || play.session.phase !== 'playing') return;
    setPlay(store, { ...play, session: move(play.session) });
}

/**
 * CONFIRM (or the clock running out): resolves the round, claims its outcome
 * onto the player and keeps the claim on the slice for the outcome panel.
 * `seed` pins the find's roll (tests, the run driver). Returns the claim, or
 * null when there is no open round.
 */
export function confirmHazardPuzzleNodeAction(
    store: AppStore,
    options: { timedOut?: boolean; seed?: number } = {},
): ClaimHazardPuzzleResult | null {
    const play = currentPlay(store);
    if (!play || play.session.phase !== 'playing') return null;
    return claimResolved(store, play, confirmHazardPuzzle(play.session), options.timedOut === true, options.seed);
}

function claimResolved(
    store: AppStore,
    play: HazardPuzzleNodePlay,
    resolved: HazardPuzzleSession,
    timedOut: boolean,
    seed: number | undefined,
): ClaimHazardPuzzleResult | null {
    const result = resolved.result;
    if (!result) return null;
    const claim = claimHazardPuzzleAction(store, hazardPuzzleNodeCandidate(play), resolved.route, result.p, seed);
    setPlay(store, { ...play, session: resolved, claim, timedOut });
    return claim;
}

/** The outcome panel's DONE: closes the puzzle, and the hazard screen goes back to the map. */
export function leaveHazardPuzzleNodeAction(store: AppStore): void {
    if (!currentPlay(store)) return;
    setPlay(store, null);
}

/**
 * Plays the open round with the `noisy-greedy` bot (the run driver, the dev
 * skip) and claims it. The bot's stream is seeded, so the same seed plays the
 * same line. Returns the claim, or null when there is no open round.
 */
export function playHazardPuzzleNodeBotAction(store: AppStore, seed: number): ClaimHazardPuzzleResult | null {
    const play = currentPlay(store);
    if (!play || play.session.phase !== 'playing') return null;
    const resolved = playHazardPuzzleBot(play.session, 'noisy-greedy', hazardPuzzleSimRng(seed));
    return claimResolved(store, play, resolved, false, seed);
}

/**
 * Hazard puzzle — layout and session types.
 *
 * A hazard puzzle is one fixed, authored round: a hand, a predetermined
 * reserve the DRAW cards pull from, authored dice faces and one goal per
 * route. It is played on the live minigame's card and die rules but never
 * rolls, never shuffles and never advances to a second round.
 */

import type { MapName } from '../../map.library';
import type { HazardDieKind, HazardRouteKey, HazardSessionState } from '../hazard.types';

/** Difficulty band a layout declares per route (the solver checks it). */
export type HazardPuzzleBand = 'easy' | 'medium' | 'hard';

/** The three player stats an unlock may read (`Character` `baseStats`). */
export type HazardPuzzleStat = 'heart' | 'body' | 'mind';

/** What a met stat threshold grants, applied once at session start. */
export type HazardPuzzleUnlockGrant =
    /** +1 die of the stat's colour (Body red, Mind blue, Heart purple). */
    | { kind: 'extraDie' }
    /** A named card joins the hand. */
    | { kind: 'extraCard'; cardId: string }
    /** Every blank (hex) die turns to the named face. */
    | { kind: 'blankReroll'; face: Exclude<HazardDieKind, 'hex'> };

/** An optional stat threshold a layout declares. */
export type HazardPuzzleUnlock = {
    stat: HazardPuzzleStat;
    min: number;
} & HazardPuzzleUnlockGrant;

/** Safe route: one combined number. Risk route: `[force, escape]`, both required. */
export interface HazardPuzzleGoals {
    safe: number;
    risk: [number, number];
}

export interface HazardPuzzleLayout {
    id: string;
    title: string;
    /** Every hazard puzzle is scoped to Act 1; the validator rejects any other act. */
    act: number;
    /**
     * The live hazard whose copy (title, scenario, route names) the puzzle
     * reuses; no new story text is written for a puzzle.
     */
    hazardId: string;
    /** The Act 1 region the puzzle sits in; its gathering list gives the outcome's material. */
    region: MapName;
    /** Hand card ids, in order. */
    hand: string[];
    /** Predetermined DRAW cards, in the order they are drawn. */
    reserve: string[];
    /** Authored die faces; `hex` is the blank face. */
    dice: HazardDieKind[];
    /**
     * Faces a `reroll` card turns dice to, consumed in order like the
     * reserve. Required when the layout holds a `reroll` card.
     */
    rerollFaces?: HazardDieKind[];
    goals: HazardPuzzleGoals;
    bands: Record<HazardRouteKey, HazardPuzzleBand>;
    unlocks: HazardPuzzleUnlock[];
}

export interface HazardPuzzleValidation {
    ok: boolean;
    reasons: string[];
}

/** The goal on the chosen route. */
export type HazardPuzzleGoal = number | [number, number];

/** The one resolve of a puzzle round. */
export interface HazardPuzzleResult {
    force: number;
    escape: number;
    goal: HazardPuzzleGoal;
    /** Value reached over the goal (the weaker meter on risk), clamped to [0, 1]. */
    p: number;
    cleared: boolean;
}

export type HazardPuzzlePhase = 'playing' | 'resolved';

export interface HazardPuzzleSession {
    layoutId: string;
    route: HazardRouteKey;
    goal: HazardPuzzleGoal;
    phase: HazardPuzzlePhase;
    /**
     * The round itself, held in the live minigame's session shape so the
     * existing transitions run it unchanged. Its draw pile is the layout's
     * reserve and its rng is never advanced.
     */
    board: HazardSessionState;
    /** Set once by `confirmHazardPuzzle`. */
    result: HazardPuzzleResult | null;
}

/** One player move, as a replayable record. A puzzle has no bin: a hand card is staged or held. */
export type HazardPuzzleMove =
    | { type: 'stage'; uid: string }
    | { type: 'unstage'; uid: string }
    | { type: 'power'; uid: string; dieId: string }
    | { type: 'apply'; uid: string };

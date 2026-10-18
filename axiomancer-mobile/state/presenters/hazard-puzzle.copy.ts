/**
 * Hazard puzzle demo board copy (dev menu only). Neutral register: this is a
 * dev surface for timing the demo puzzles, not story text. Titles and route
 * names come from the live hazard each demo reuses.
 */

import type { HazardDieKind, HazardPuzzleBand, HazardPuzzleStat } from '@mechanics';

/** Die names as the live hazard board prints them (gold reads YELLOW). */
export const HAZARD_PUZZLE_DIE_WORD: Record<HazardDieKind, string> = Object.freeze({
    red: 'RED',
    blue: 'BLUE',
    purple: 'PURPLE',
    gold: 'YELLOW',
    hex: 'BLANK',
});

export const HAZARD_PUZZLE_LIST_TITLE = 'HAZARD PUZZLES';
export const HAZARD_PUZZLE_LIST_INTRO = 'Fixed one-round demos. Pick a puzzle, then a route; the clock starts on the route.';
export const HAZARD_PUZZLE_BACK_LABEL = 'BACK';
export const HAZARD_PUZZLE_DISABLED = 'Dev tools are off in this build.';

export const HAZARD_PUZZLE_BAND_LABEL: Record<HazardPuzzleBand, string> = Object.freeze({
    easy: 'EASY',
    medium: 'MEDIUM',
    hard: 'HARD',
});

export const HAZARD_PUZZLE_STAT_LABEL: Record<HazardPuzzleStat, string> = Object.freeze({
    heart: 'HEART',
    body: 'BODY',
    mind: 'MIND',
});

export const HAZARD_PUZZLE_CONFIRM_LABEL = 'CONFIRM';
export const HAZARD_PUZZLE_CONFIRM_SUB = 'RESOLVE';
/** The play area's foot line on the puzzle board (the live board names its PLAY). */
export const HAZARD_PUZZLE_RESOLVE_HINT = 'drop dice to power cards — CONFIRM resolves the round';
export const HAZARD_PUZZLE_CLAIM_LABEL = 'CLAIM AND LEAVE ›';
/** The board's one round, as the live header prints its round count. */
export const HAZARD_PUZZLE_ROUND_LABEL = 'ROUND I / I';
export const HAZARD_PUZZLE_NO_UNLOCKS = 'Your stats unlock nothing here.';

export function hazardPuzzleBandChip(band: HazardPuzzleBand): string {
    return `${HAZARD_PUZZLE_BAND_LABEL[band]} ON THE RISK ROUTE`;
}

export function hazardPuzzleReserve(count: number): string {
    return count === 1 ? '1 CARD IN RESERVE' : `${count} CARDS IN RESERVE`;
}

/** The route panel's badge: the route's band and its clock, e.g. "HARD · 60 S". */
export function hazardPuzzleRouteBadge(band: string, seconds: number): string {
    return `${band} · ${seconds} S`;
}

/** The route panel's REWARD chip: what a full clear pays on top of XP. */
export function hazardPuzzleRouteReward(shillings: number): string {
    return `XP and a find; clear it for +${shillings} shillings`;
}

/** The route panel's FAIL chip: the most VITAE a short resolve costs. */
export function hazardPuzzleRoutePenalty(vitae: number): string {
    return `up to −${vitae}♥`;
}

export function hazardPuzzleRouteCta(routeName: string): string {
    return `TAKE ${routeName} ›`;
}

export function hazardPuzzleUnlockLine(parts: readonly string[]): string {
    return parts.length === 0 ? HAZARD_PUZZLE_NO_UNLOCKS : `Your stats unlock: ${parts.join('; ')}.`;
}

export function hazardPuzzleUnlockDie(stat: HazardPuzzleStat, min: number, dieWord: string): string {
    return `+1 ${dieWord} die (${HAZARD_PUZZLE_STAT_LABEL[stat]} ${min})`;
}

export function hazardPuzzleUnlockCard(stat: HazardPuzzleStat, min: number, cardName: string): string {
    return `${cardName} joins the hand (${HAZARD_PUZZLE_STAT_LABEL[stat]} ${min})`;
}

export function hazardPuzzleUnlockBlank(stat: HazardPuzzleStat, min: number, dieWord: string): string {
    return `blank dice turn ${dieWord} (${HAZARD_PUZZLE_STAT_LABEL[stat]} ${min})`;
}

export const HAZARD_PUZZLE_CLEARED = 'CLEARED';
export const HAZARD_PUZZLE_SHORT = 'FELL SHORT';
export const HAZARD_PUZZLE_TIME_UP = 'TIME RAN OUT';

export function hazardPuzzleReached(percent: number): string {
    return `${percent}% OF THE GOAL`;
}

export function hazardPuzzleXpChip(xp: number): string {
    return `+${xp} XP`;
}

export function hazardPuzzleItemChip(name: string): string {
    return `+ ${name.toUpperCase()}`;
}

export function hazardPuzzleShillingsChip(shillings: number): string {
    return `+${shillings} SHILLINGS`;
}

export function hazardPuzzleVitaeChip(vitae: number): string {
    return `-${vitae} VITAE`;
}

export function hazardPuzzleScarChip(scar: number): string {
    return `SCARRED: -${scar} MAX VITAE UNTIL YOU REST`;
}

export const HAZARD_PUZZLE_REWARDS_LABEL = 'GAINED';
export const HAZARD_PUZZLE_PENALTY_LABEL = 'LOST';
export const HAZARD_PUZZLE_NO_PENALTY = 'Nothing lost.';

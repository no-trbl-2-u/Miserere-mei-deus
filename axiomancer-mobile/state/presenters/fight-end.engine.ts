/**
 * The victory screen's view model (phase FE1a): what a won fight
 * paid, and the level panel's XP bar and line.
 *
 * The settle (`applyHazardOutcome`) reports a {@link FightPaid} record read off
 * the player before and after the engine's `endCombat` and level-ups; this
 * module turns it into the paid line ("Shillings +n · XP +n"), the panel's
 * settled line ("LEVEL n" or "k XP to level n+1") and the bar's steps: an
 * ordered list of fills through the levels the fight crossed, each a fraction
 * of one level (empty at `experienceForLevel(L)`, full at
 * `experienceForLevel(L + 1)`), with a "LEVEL n" beat after each fill that
 * ends full. Rules stay the engine's: this only reads the curve. Pure.
 */

import { experienceForLevel, type Character } from '@mechanics';

import {
    FIGHT_END_PAID_SEPARATOR,
    FIGHT_END_SHILLINGS_LABEL,
    FIGHT_END_XP_LABEL,
    fightEndLevelLine,
    fightEndXpToLevelLine,
} from './fight-end.copy';

/**
 * The bar's timing, in one place (the component holds no number of its own):
 * each fill about 0.8 s, eased; "LEVEL n" holds about 1 s before the fresh bar.
 */
export const FIGHT_END_TIMING = {
    /** One fill of the bar, from its start to its end. */
    fillMs: 800,
    /** How long "LEVEL n" shows after a fill that ends full, before the fresh bar. */
    levelHoldMs: 1000,
    /** The fill's easing (an ease-out: fast, then settling). */
    easing: 'ease-out',
} as const;

/** What a settled fight paid, as `applyHazardOutcome` reports it. */
export interface FightPaid {
    /** The shillings the fight paid (the engine's report). */
    readonly shillings: number;
    /** Experience after the settle minus before (a quest step paid at the kill counts too); never below 0. */
    readonly xpGained: number;
    /** The player's running XP total before the fight's settle. */
    readonly experienceBefore: number;
    /** The player's running XP total after the settle and its level-ups. */
    readonly experienceAfter: number;
    readonly levelBefore: number;
    readonly levelAfter: number;
    /** The XP still owed for the next level, after the settle. */
    readonly xpToNext: number;
}

/** The record for a fight that paid nothing (no player, or no settle). */
export const NOTHING_PAID: FightPaid = {
    shillings: 0,
    xpGained: 0,
    experienceBefore: 0,
    experienceAfter: 0,
    levelBefore: 1,
    levelAfter: 1,
    xpToNext: 0,
};

type Progress = Pick<Character, 'experience' | 'level'>;

/** The record of a settle, from the player as they stood before and after it. */
export function fightPaidFrom(
    before: Progress | undefined | null,
    after: Progress | undefined | null,
    shillings: number,
): FightPaid {
    if (!before || !after) return { ...NOTHING_PAID, shillings };
    return {
        shillings,
        xpGained: Math.max(0, Math.round(after.experience - before.experience)),
        experienceBefore: before.experience,
        experienceAfter: after.experience,
        levelBefore: before.level,
        levelAfter: after.level,
        xpToNext: Math.max(0, experienceForLevel(after.level + 1) - after.experience),
    };
}

/** One fill of the XP bar, as fractions of one level. */
export interface XpBarStep {
    /** The level this bar measures (empty at its start, full at the next). */
    readonly level: number;
    readonly from: number;
    readonly to: number;
    /** The fill reaches the end of the level: a "LEVEL n" beat follows. */
    readonly endsFull: boolean;
    /** The beat after the fill ("LEVEL n", the level just reached), or null. */
    readonly levelBeat: string | null;
    /** How long the fill runs: 0 when it does not move. */
    readonly fillMs: number;
}

export interface FightEndVM {
    /** "Shillings +n · XP +n"; the XP half is left off when the fight paid none. */
    readonly paidLine: string;
    readonly shillings: number;
    readonly xpGained: number;
    /** The fight raised the level. */
    readonly leveled: boolean;
    /** The level the player now holds (the highest reached). */
    readonly level: number;
    /** The panel's line once the bar settles. */
    readonly levelLine: string;
    /** The bar's fills, in order; the last ends at the settled place. */
    readonly bar: readonly XpBarStep[];
    /** Where the bar stands at its settled end (a fraction of the current level). */
    readonly settledFraction: number;
    readonly timing: typeof FIGHT_END_TIMING;
}

/** Where `experience` stands through `level`, from 0 (its start) to 1 (the next level). */
export function levelFraction(experience: number, level: number): number {
    const start = experienceForLevel(level);
    const span = experienceForLevel(level + 1) - start;
    if (span <= 0) return 0;
    return Math.max(0, Math.min(1, (experience - start) / span));
}

/** The bar's fills from the player's place before the fight to their place after it. */
export function xpBarSteps(paid: FightPaid): XpBarStep[] {
    const steps: XpBarStep[] = [];
    const first = paid.levelBefore;
    const last = Math.max(first, paid.levelAfter);
    for (let level = first; level <= last; level++) {
        const from = level === first ? levelFraction(paid.experienceBefore, level) : 0;
        const endsFull = level < last;
        const to = endsFull ? 1 : levelFraction(paid.experienceAfter, level);
        steps.push({
            level,
            from,
            to,
            endsFull,
            levelBeat: endsFull ? fightEndLevelLine(level + 1) : null,
            fillMs: to > from ? FIGHT_END_TIMING.fillMs : 0,
        });
    }
    return steps;
}

/** The victory screen's view model from what the settle paid. */
export function selectFightEndVM(paid: FightPaid): FightEndVM {
    const leveled = paid.levelAfter > paid.levelBefore;
    const level = Math.max(paid.levelBefore, paid.levelAfter);
    const shillingsHalf = `${FIGHT_END_SHILLINGS_LABEL} +${paid.shillings}`;
    const paidLine = paid.xpGained > 0
        ? `${shillingsHalf}${FIGHT_END_PAID_SEPARATOR}${FIGHT_END_XP_LABEL} +${paid.xpGained}`
        : shillingsHalf;
    const bar = xpBarSteps(paid);
    return {
        paidLine,
        shillings: paid.shillings,
        xpGained: paid.xpGained,
        leveled,
        level,
        levelLine: leveled ? fightEndLevelLine(level) : fightEndXpToLevelLine(paid.xpToNext, level + 1),
        bar,
        settledFraction: bar[bar.length - 1]!.to,
        timing: FIGHT_END_TIMING,
    };
}

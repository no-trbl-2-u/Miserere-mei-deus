/**
 * Hazard-Pattern Combat: die helpers.
 *
 * The rolled tray itself is the four fixed dice
 * (`combat.upgradeable-dice.ts`). This module keeps the die primitives that
 * model shares: the Reserve and its pips, GHOST (floating) dice, the colour
 * law (`combatDieCanPower`), and spend/refresh helpers.
 */

import type { Stance } from './types';
import type { CombatDieColor, CombatManaDie } from './combat.encounter.types';

/**
 * THE PATH — the highest die-upgrade level the
 * balance harness models. A level HONES a miss face into a mana
 * face (`honedDieGear`); the ladder saturates at level 4.
 */
export const MAX_DIE_UPGRADE_LEVEL = 4;

/** True when a die color carries a stance (heart/body/mind). */
export function dieHasStance(color: CombatDieColor): boolean {
    return color === 'heart' || color === 'body' || color === 'mind';
}

// ---------------------------------------------------------------------------
// Fate Engine — the RESERVE and its ripening pips
// ---------------------------------------------------------------------------

/** Max dice the Reserve holds. Banking past this burns for Conviction instead. */
export const RESERVE_MAX = 2;
/** Max pips a Reserve die ripens to (+1 per threat phase survived). */
export const RESERVE_PIP_CAP = 2;

/** Ripens every Reserve die +1 pip (cap `RESERVE_PIP_CAP`). Pure. */
export function ripenReserve(reserve: readonly CombatManaDie[]): { reserve: CombatManaDie[]; ripenedIds: string[] } {
    const ripenedIds: string[] = [];
    const next = reserve.map(d => {
        const pips = d.pips ?? 0;
        if (pips >= RESERVE_PIP_CAP) return d;
        ripenedIds.push(d.id);
        return { ...d, pips: pips + 1 };
    });
    return { reserve: next, ripenedIds };
}

// ---------------------------------------------------------------------------
// GHOST dice (the live-tray model)
// ---------------------------------------------------------------------------

/** Hard cap on the floating-die pool. Forging at cap → +1 Conviction instead. */
export const FLOATING_DICE_CAP = 3;

/** Materializes the persistent floating pool into this turn's tray. Ids are
 *  stable (`float-N`) so a die keeps its identity across turns and combats. */
export function materializeFloatingDice(
    colors: readonly ('heart' | 'body' | 'mind' | 'wild')[],
): CombatManaDie[] {
    return colors.slice(0, FLOATING_DICE_CAP).map((color, i) => ({
        id: `float-${i}`, color, state: 'available' as const, temporary: false, floating: true,
    }));
}

/**
 * True if `die` can power a card of `cardColor`: a matching-color die, or the
 * WILD die (powers any color). X is never usable (unless an x-die-interaction
 * card has flipped it to `available`, in which case it acts wild). Mirrors the
 * Hazard `dieCanPower` contract.
 */
export function combatDieCanPower(die: CombatManaDie, cardColor: CombatDieColor): boolean {
    if (die.state !== 'available') return false;
    if (die.color === 'x') return false;
    if (cardColor === 'wild') return true;          // wild cards accept any usable die
    return die.color === 'wild' || die.color === cardColor;
}

/** All dice currently spendable for a card of `cardColor`. */
export function availableDiceFor(
    dice: readonly CombatManaDie[],
    cardColor: CombatDieColor,
): CombatManaDie[] {
    return dice.filter(d => combatDieCanPower(d, cardColor));
}

/** Count of non-X dice still available (used by Reserve-bonus / sim policy). */
export function availableDieCount(dice: readonly CombatManaDie[]): number {
    return dice.filter(d => d.state === 'available' && d.color !== 'x').length;
}

/** Sets the named dice to `spent`. Returns a new dice array. */
export function spendDice(dice: readonly CombatManaDie[], dieIds: readonly string[]): CombatManaDie[] {
    const ids = new Set(dieIds);
    return dice.map(d => (ids.has(d.id) ? { ...d, state: 'spent' as const } : d));
}

/**
 * Refreshes one spent die of `color` back to `available` (the self-reinforcing
 * status loop, §4.7). Wild dice are refreshed in preference to leaving a
 * matching colored die spent only when no same-color spent die exists. Returns
 * the same array reference (no refresh) when nothing matches.
 */
export function refreshOneDie(
    dice: readonly CombatManaDie[],
    color: CombatDieColor,
): { dice: CombatManaDie[]; refreshedId: string | null } {
    // Prefer an exact-color spent die; fall back to a spent wild die.
    const exact = dice.find(d => d.state === 'spent' && d.color === color);
    const target = exact ?? dice.find(d => d.state === 'spent' && d.color === 'wild');
    if (!target) return { dice: dice.slice(), refreshedId: null };
    return {
        dice: dice.map(d => (d.id === target.id ? { ...d, state: 'available' as const } : d)),
        refreshedId: target.id,
    };
}

/** Maps a player card stance (heart/body/mind) to its die color. */
export function stanceToDieColor(stance: Stance): CombatDieColor {
    return stance;
}

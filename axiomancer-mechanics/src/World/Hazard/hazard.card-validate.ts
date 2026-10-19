/**
 * Hazard card validation — the cost-card rules T ruled on 2026-10-19.
 *
 * - A `gainDie` card declares how many dice it adds unpowered and powered
 *   and their colour; a `reroll` card declares how many dice it turns
 *   unpowered and powered. Neither has a default.
 * - A card whose powered line carries a cost (a negative powered value)
 *   declares a `poweredEffect`: a paid cost buys a second utility on top
 *   of the card's `effect`, so it needs an `effect` and a different one.
 *
 * The live deck passes; `validateHazardPuzzleLayout` runs this on every
 * card a puzzle layout holds.
 */

import type { HazardCardDef, HazardUtilityEffect } from './hazard.types';

export interface HazardCardValidation {
    ok: boolean;
    reasons: string[];
}

function isCount(n: number | undefined): boolean {
    return n !== undefined && Number.isInteger(n) && n >= 0;
}

function carries(def: HazardCardDef, effect: HazardUtilityEffect): boolean {
    return def.effect === effect || def.poweredEffect === effect;
}

export function validateHazardCardDef(def: HazardCardDef): HazardCardValidation {
    const reasons: string[] = [];
    const id = `"${def.id}"`;
    if (carries(def, 'gainDie')) {
        if (!isCount(def.gainDieBase)) reasons.push(`${id}: a gainDie card needs gainDieBase, a whole number of at least 0`);
        if (!isCount(def.gainDiePowered)) reasons.push(`${id}: a gainDie card needs gainDiePowered, a whole number of at least 0`);
        if (!def.gainDieKind) reasons.push(`${id}: a gainDie card needs gainDieKind, the added dice's colour`);
    }
    if (carries(def, 'reroll')) {
        if (!isCount(def.rerollBase)) reasons.push(`${id}: a reroll card needs rerollBase, a whole number of at least 0`);
        if (!isCount(def.rerollPowered)) reasons.push(`${id}: a reroll card needs rerollPowered, a whole number of at least 0`);
    }
    // The powered line falls back to the free line where `fp` / `ep` are unset.
    const poweredCost = !def.dead && ((def.fp ?? def.f) < 0 || (def.ep ?? def.e) < 0);
    if (poweredCost && !def.poweredEffect) {
        reasons.push(`${id}: a cost on the powered line needs a poweredEffect, a second utility when powered`);
    }
    if (def.poweredEffect) {
        if (!def.effect) reasons.push(`${id}: a poweredEffect is a second utility; the card needs an effect first`);
        else if (def.poweredEffect === def.effect) {
            reasons.push(`${id}: poweredEffect "${def.poweredEffect}" repeats the card's effect; it must be a second utility`);
        }
    }
    return { ok: reasons.length === 0, reasons };
}

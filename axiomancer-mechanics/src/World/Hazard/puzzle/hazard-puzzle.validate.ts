/**
 * Hazard puzzle — layout validation.
 *
 * A layout is playable only when every card exists, passes
 * `validateHazardCardDef`, is in the puzzle card pool, and none is a RE-CAST
 * card (a puzzle never rolls, so re-casting has nothing to do). The act is
 * Act 1, it reuses a live hazard's copy, it sits in an Act 1 region, both
 * goals are positive whole numbers, and a layout holding a reroll card
 * declares the faces it rerolls to. RE-CAST cards stay in
 * `HAZARD_DECK` for the live minigame; they are only kept out of puzzles.
 */

import type { MapName } from '../../map.library';
import { validateHazardCardDef } from '../hazard.card-validate';
import { getHazardCardDef, HAZARD_LIBRARY } from '../hazard.content';
import type { HazardCardDef, HazardRouteKey } from '../hazard.types';
import { HAZARD_PUZZLE_CARD_POOL } from './hazard-puzzle.tuning';
import type {
    HazardPuzzleBand,
    HazardPuzzleCandidate,
    HazardPuzzleLayout,
    HazardPuzzleValidation,
} from './hazard-puzzle.types';

/** The only act a hazard puzzle may belong to until T lifts the scope. */
export const HAZARD_PUZZLE_ACT = 1;

/** The Act 1 regions a puzzle may sit in (`map.library.ts`: Act 1, maps 1-4). */
export const HAZARD_PUZZLE_REGIONS: readonly MapName[] = ['breakwater', 'charcoal-wood', 'beacon-crags', 'lantern-deep'];

function findCard(cardId: string): HazardCardDef | null {
    try {
        return getHazardCardDef(cardId);
    } catch {
        return null;
    }
}

function isPositiveInt(n: number): boolean {
    return Number.isInteger(n) && n > 0;
}

function checkCard(layout: HazardPuzzleLayout, cardId: string, where: string, reasons: string[]): void {
    const def = findCard(cardId);
    if (!def) {
        reasons.push(`${where}: unknown hazard card "${cardId}"`);
        return;
    }
    for (const reason of validateHazardCardDef(def).reasons) reasons.push(`${where}: ${reason}`);
    if (!HAZARD_PUZZLE_CARD_POOL.includes(cardId)) {
        reasons.push(`${where}: "${cardId}" is not in the puzzle card pool`);
    }
    const fires = [def.effect, def.poweredEffect];
    if (fires.includes('recast')) {
        reasons.push(`${where}: "${cardId}" is a RE-CAST card; puzzles never re-cast dice`);
    }
    if (fires.includes('reroll') && (layout.rerollFaces ?? []).length === 0) {
        reasons.push(`${where}: "${cardId}" is a reroll card but the layout declares no rerollFaces`);
    }
}

export function validateHazardPuzzleLayout(layout: HazardPuzzleLayout): HazardPuzzleValidation {
    const reasons: string[] = [];
    if (layout.act !== HAZARD_PUZZLE_ACT) {
        reasons.push(`act ${layout.act}: hazard puzzles are scoped to Act ${HAZARD_PUZZLE_ACT}`);
    }
    if (!HAZARD_LIBRARY.some((h) => h.id === layout.hazardId)) {
        reasons.push(`hazardId: "${layout.hazardId}" is not a live hazard whose copy the puzzle can reuse`);
    }
    if (!HAZARD_PUZZLE_REGIONS.includes(layout.region)) {
        reasons.push(`region: "${layout.region}" is not an Act ${HAZARD_PUZZLE_ACT} region`);
    }
    if (layout.hand.length === 0) reasons.push('hand: a puzzle needs at least one card');
    layout.hand.forEach((id, i) => checkCard(layout, id, `hand[${i}]`, reasons));
    layout.reserve.forEach((id, i) => checkCard(layout, id, `reserve[${i}]`, reasons));
    layout.unlocks.forEach((u, i) => {
        if (!Number.isInteger(u.min) || u.min < 0) {
            reasons.push(`unlocks[${i}]: min ${u.min} is not a whole number of at least 0`);
        }
        if (u.kind === 'extraCard') checkCard(layout, u.cardId, `unlocks[${i}]`, reasons);
    });
    if (!isPositiveInt(layout.goals.safe)) {
        reasons.push(`goals.safe: ${layout.goals.safe} is not a positive whole number`);
    }
    const [gf, ge] = layout.goals.risk;
    if (!isPositiveInt(gf) || !isPositiveInt(ge)) {
        reasons.push(`goals.risk: [${gf}, ${ge}] needs two positive whole numbers`);
    }
    return { ok: reasons.length === 0, reasons };
}

const BANDS: readonly HazardPuzzleBand[] = ['easy', 'medium', 'hard'];
const ROUTES: readonly HazardRouteKey[] = ['safe', 'risk'];

/**
 * A candidate is a valid layout plus a non-empty label, an intended band
 * and one nominated route. Its declared `bands` are not checked against the
 * solver here or anywhere else: a candidate is not held to a band.
 */
export function validateHazardPuzzleCandidate(candidate: HazardPuzzleCandidate): HazardPuzzleValidation {
    const reasons = [...validateHazardPuzzleLayout(candidate).reasons];
    if (candidate.label.trim().length === 0) reasons.push('label: a candidate needs a short label');
    if (!BANDS.includes(candidate.intendedBand)) {
        reasons.push(`intendedBand: "${candidate.intendedBand}" is not easy, medium or hard`);
    }
    if (!ROUTES.includes(candidate.route)) reasons.push(`route: "${candidate.route}" is not safe or risk`);
    return { ok: reasons.length === 0, reasons };
}

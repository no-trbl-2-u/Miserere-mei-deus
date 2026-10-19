/**
 * Hazard puzzle — layout validation.
 *
 * A layout is playable only when every card exists, none is a RE-CAST
 * card (a puzzle never rolls, so re-casting has nothing to do), the act is
 * Act 1, it reuses a live hazard's copy, it sits in an Act 1 region, both
 * goals are positive whole numbers, and a layout holding a reroll card
 * declares the faces it rerolls to. RE-CAST cards stay in
 * `HAZARD_DECK` for the live minigame; they are only kept out of puzzles.
 */

import type { MapName } from '../../map.library';
import { getHazardCardDef, HAZARD_LIBRARY } from '../hazard.content';
import type { HazardCardDef } from '../hazard.types';
import type { HazardPuzzleLayout, HazardPuzzleValidation } from './hazard-puzzle.types';

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
    if (def.effect === 'recast') {
        reasons.push(`${where}: "${cardId}" is a RE-CAST card; puzzles never re-cast dice`);
    }
    if (def.effect === 'reroll' && (layout.rerollFaces ?? []).length === 0) {
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

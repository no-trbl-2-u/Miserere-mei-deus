/**
 * Hazard deck persistence — encoded in `GameState.flags`.
 *
 * The engine persists `flags: string[]` with every save, so the
 * player's hazard action deck rides the existing save/load/migration
 * pipeline for free, stays atomic with the run, and resets on a new
 * run — no parallel storage key to keep in sync.
 *
 * Encoding: one flag per acquired copy, `hazard-card:<cardId>:<n>`
 * where `<n>` disambiguates duplicates (`hazard-card:r_grip:1`,
 * `hazard-card:r_grip:2`, …). The starter bag is implicit and never
 * written.
 */

import { hazardLiveDeck } from './hazard.content';
import { HAZARD_TUNING } from './hazard.tuning';

export const HAZARD_CARD_FLAG_PREFIX = 'hazard-card:';

/** The starter draw bag: weighted card ids from the authored deck, scaled
 *  by the tunable deck-size multiplier (floored at one copy per card).
 *  Puzzle-only cards never enter it. */
export function hazardStarterBag(): string[] {
    const scale = HAZARD_TUNING.deck.starterWeightScale;
    const bag: string[] = [];
    for (const card of hazardLiveDeck()) {
        const w = card.weight ?? 1;
        if (w === 0) continue; // weight:0 = keep def accessible but exclude from starter
        const copies = Math.max(1, Math.round(w * scale));
        for (let i = 0; i < copies; i++) bag.push(card.id);
    }
    return bag;
}

/** Card ids acquired beyond the starter bag, decoded from flags. */
export function decodeAcquiredCards(flags: readonly string[]): string[] {
    const out: string[] = [];
    for (const flag of flags) {
        if (!flag.startsWith(HAZARD_CARD_FLAG_PREFIX)) continue;
        const rest = flag.slice(HAZARD_CARD_FLAG_PREFIX.length);
        const sep = rest.lastIndexOf(':');
        out.push(sep === -1 ? rest : rest.slice(0, sep));
    }
    return out;
}

/** The full current draw bag: starter + acquired (reward picks, CRACK cards). */
export function hazardDeckBag(flags: readonly string[]): string[] {
    return [...hazardStarterBag(), ...decodeAcquiredCards(flags)];
}

/** Returns `flags` with one more copy of `cardId` appended. */
export function appendAcquiredCard(flags: readonly string[], cardId: string): string[] {
    const copies = flags.filter((f) => f.startsWith(`${HAZARD_CARD_FLAG_PREFIX}${cardId}:`)).length;
    return [...flags, `${HAZARD_CARD_FLAG_PREFIX}${cardId}:${copies + 1}`];
}

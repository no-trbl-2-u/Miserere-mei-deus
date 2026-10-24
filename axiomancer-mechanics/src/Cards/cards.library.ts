/**
 * THE CARD LIBRARY — the aggregator.
 *
 * The player library is the grey office: three colourless cards
 * (`library/starters.cards.ts`), plus each registered trial set
 * (`TRIAL_SETS`, one line per set). Stat scaling (`Combat/stat-scaling.ts`)
 * grows their numbers with the player's body, mind and heart. New cards are
 * built only from a brief T wrote or approved.
 *
 * THE CONSTRAINTS:
 *   1. Every card is playable without a die: it authors a non-empty `free`
 *      rider or a program FREE line (a Global's FREE line puts it in play).
 *   2. One tray roll per threat phase (a bug fix, not a design law).
 *
 * There is no rank band, no pricing gate, no win-rate curve and no governing
 * objective function. Numbers are judged by playing the game.
 *
 * Direct damage is a first-class verb (DEAL), scaled by body. Enemy
 * VITAE falls to any authored mix of hits, statuses and reflect.
 *
 * This file is data-only. All runtime behaviour lives in
 * `src/Cards/card.engine.ts` and `src/Combat/combat.engine.ts`.
 */

import { Card } from './types';
import { bindSandboxLibraryGuard, getSandboxCard } from './cards.sandbox';
import { getUpgradedCardById, isUpgradedCardId } from './card-upgrades';
import { GREY_OFFICE_CARDS } from './library/starters.cards';
import type { TrialSet } from './card.lanes';
import { BLOOD_PRICE_SET } from './library/blood-price.cards';
import { ELEMENTALIST_SET } from './library/elementalist.cards';

/**
 * The registered trial sets (plan/revamp/cards.md → "The trial set"). Each
 * is one file and one line here; removing a set is deleting both, and saves
 * drop its card ids on load (`dropUnknownCardIds`).
 */
export const TRIAL_SETS: readonly TrialSet[] = Object.freeze([
    BLOOD_PRICE_SET,
    ELEMENTALIST_SET,
]);

/**
 * The player library: the grey office (A Plain Blow, A Plain Ward, A Plain
 * Word) and the registered trial sets. New cards arrive only from a brief
 * T wrote or approved.
 */
export const cardLibrary: Card[] = [
    ...GREY_OFFICE_CARDS,
    ...TRIAL_SETS.flatMap(set => set.cards),
];

const registry = new Map<string, Card>(cardLibrary.map(card => [card.id, card]));

// Sandbox integration: experimental cards / overrides (loaded via --sandbox)
// take precedence over the curated library at lookup time.
bindSandboxLibraryGuard(id => registry.get(id));

/** O(1) lookup by card id; sandbox-aware: the sandbox first (so experiments
 *  can shadow anything), then the curated library. */
export function getCardById(id: string): Card | undefined {
    const direct = getSandboxCard(id) ?? registry.get(id);
    if (direct) return direct;
    // THE PATH — card upgrades (Slay the Spire's model). An upgraded copy sits
    // in a deck as a plain id string, `some-card+`, and resolves here by
    // upgrading its base on demand. Last in the chain so nothing else changes
    // and a literal `+` card in any registry above still wins.
    // Guarded on the suffix: without it an unknown `foo` would bounce between
    // this function and the resolver forever (baseCardId('foo') === 'foo').
    return isUpgradedCardId(id) ? getUpgradedCardById(id) : undefined;
}

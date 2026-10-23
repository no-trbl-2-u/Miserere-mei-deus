/**
 * Blacksmith encounter ("The Anvil") — Public API.
 *
 * The die-gear upgrade surface: HONE (add a mana face),
 * TEMPER (mana → special), gear SWAP, and one card UPGRADE a visit
 * (Phase UP1e), each priced in shillings
 * (`ANVIL_VERB_PRICING`). The engine is two-way like the
 * other minigames — it never reads `GameState`; the host passes the rail +
 * budget + variant offers and applies the upgraded rail to `Character.dieGear`
 * at claim.
 *
 * The seeded RNG (`blacksmith.rng.ts`) is internal: the engine threads its
 * state but never draws from it, so nothing re-exports it.
 */

// ── Engine types ───────────────────────────────────────────────────────────
export type {
    BlacksmithVariantOffer,
    BlacksmithSession,
    BlacksmithCardUpgrade,
} from './blacksmith.types';

// ── Tuning ─────────────────────────────────────────────────────────────────
export { ANVIL_VERB_PRICING } from './blacksmith.engine';

// ── Witness variant gear (minimal, see module note) ─────────────────────────
export { BLACKSMITH_WITNESS_VARIANTS, HEART_RICH_PAYLOAD_VARIANT } from './blacksmith.content';

// ── Pure engine transitions ────────────────────────────────────────────────
export {
    createBlacksmithSession,
    beginBlacksmith,
    honeBlacksmith,
    temperBlacksmith,
    swapBlacksmith,
    chooseBlacksmithCardUpgrade,
    cancelBlacksmithCardUpgrade,
    pickBlacksmithCardUpgrade,
    blacksmithCardUpgradeRefusal,
    continueBlacksmithCard,
    leaveBlacksmith,
    claimBlacksmithOutcome,
} from './blacksmith.engine';

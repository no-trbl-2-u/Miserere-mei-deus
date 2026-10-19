/**
 * Hazard Minigame — Public API (v2).
 *
 * Faithful port of the mobile v2 Hazard engine that was the living rules
 * source (`../axiomancer-mobile/state/hazard/`, now only store actions).
 * The package exports the exact mobile surface; mobile has deleted its
 * local engine and consumes these exports. See
 * `archive-pre-revamp:plan/archive/2026-09-25-trim-t1/axiomancer-mechanics/docs/hazard-v2-vs-mechanics-divergence.md` (archived 2026-09-25).
 */

// ── Engine types ───────────────────────────────────────────────────────────
export type {
    HazardColor,
    HazardDieKind,
    HazardProgressKey,
    HazardCardDef,
    HazardHandEntry,
    HazardRouteKey,
    HazardDef,
    HazardMark,
    HazardOutcomeTier,
    HazardPhase,
    HazardSessionState,
} from './hazard.types';

// ── Card validation (cost-card rules) ──────────────────────────────────────
export { validateHazardCardDef } from './hazard.card-validate';
export type { HazardCardValidation } from './hazard.card-validate';

// ── Seeded RNG ─────────────────────────────────────────────────────────────
export { seedRng } from './hazard.rng';

// ── Tuning ─────────────────────────────────────────────────────────────────
export { HAZARD_TUNING } from './hazard.tuning';

// ── Authored content (cards, rewards, hazards, keywords, catalogues) ────────
export {
    HAZARD_KEYWORDS,
    HAZARD_DECK,
    HAZARD_CRACK_CARD,
    getHazardCardDef,
    HAZARD_REWARDS,
    HAZARD_CONSEQUENCES,
    HAZARD_VITAE_REWARD,
    HAZARD_SHILLINGS_REWARD,
    HAZARD_RISK_SHILLINGS_REWARD,
    HAZARD_MINHP_LOSS,
    HAZARD_MAXHP_SCAR,
    HAZARD_LIBRARY,
    getHazardDef,
} from './hazard.content';

// ── Deck persistence (GameState.flags codec) ────────────────────────────────
export {
    HAZARD_CARD_FLAG_PREFIX,
    hazardStarterBag,
    decodeAcquiredCards,
    hazardDeckBag,
    appendAcquiredCard,
} from './hazard.deck-flags';

// ── Pure engine transitions ─────────────────────────────────────────────────
export {
    // selectors
    hazardCardValue,
    hazardProjectedProgress,
    dieCanPowerCard,
    // lifecycle
    createHazardSession,
    selectHazardRoute,
    finishHazardRolling,
    // round play
    stageHazardCard,
    unstageHazardCard,
    powerHazardCard,
    applyHazardCard,
    discardHazardCard,
    // resolve / outcome / rewards
    resolveHazardRound,
    continueHazardAfterResolve,
    acknowledgeHazardOutcome,
    claimHazardRewards,
} from './hazard.engine';

// ── Fixed one-round puzzle ──────────────────────────────────────────────────
export * from './puzzle';

/**
 * Rest-choice encounter ("rest" / "upgrade") — Public API.
 *
 * A rest node is one irreversible choice of two. The engine never reads
 * `GameState`; the host settles the outcome ledger against the real
 * `Character` at claim time. Card removal is the village's (`World/Village`).
 */

// ── Engine types ───────────────────────────────────────────────────────────
export type {
    RestChoiceOfferId,
    RestChoiceSession,
} from './restchoice.types';

// ── Tuning ─────────────────────────────────────────────────────────────────
export { RESTCHOICE_TUNING } from './restchoice.content';

// ── Pure engine transitions ────────────────────────────────────────────────
export {
    createRestChoiceSession,
    previewRestChoiceHeal,
    chooseRestChoiceOffer,
    pickRestChoiceUpgrade,
    claimRestChoiceOutcome,
} from './restchoice.engine';

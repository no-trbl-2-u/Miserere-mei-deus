/**
 * Rest-choice encounter ("rest" / "upgrade" / "cut") — Public API.
 *
 * A rest node is one irreversible choice of three. The
 * engine never reads `GameState`; the host settles the outcome ledger
 * against the real `Character` at claim time — see `restchoice.types.ts`
 * for why `cut` names a card rather than removing it itself.
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
    pickRestChoiceCut,
    pickRestChoiceUpgrade,
    claimRestChoiceOutcome,
} from './restchoice.engine';

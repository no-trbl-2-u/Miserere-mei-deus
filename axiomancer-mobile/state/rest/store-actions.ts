/**
 * Rest-choice encounter — store action glue.
 *
 * The pure engine lives in `axiomancer-mechanics` (World/RestChoice); these
 * wrappers thread a rest node's one irreversible choice — `rest` (free,
 * flat 25% heal) / `upgrade` (free, one card upgraded) / `cut` (paid deck
 * removal) — through the mobile `rest` slice and, at claim, apply the
 * settled ledger to the real `GameState`: heal, the upgraded copy, shillings
 * spent, `cardRemovals` incremented, and the scar mend.
 */

import type { GameState } from '@mechanics';

import {
    buildCombatDeck,
    cardRemovalsOf,
    chooseRestChoiceOffer as engineChooseOffer,
    claimRestChoiceOutcome as engineClaim,
    createRestChoiceSession,
    DEFAULT_REST_SHELTER,
    pickRestChoiceCut as engineCut,
    pickRestChoiceUpgrade as engineUpgrade,
    removeCardFromCombatDeck,
    replaceCard,
} from '@mechanics';
import type {
    Character,
    RestChoiceOfferId,
    RestChoiceSession,
    RestShelter,
} from '@mechanics';
import { bankedScarMagnitude, HAZARD_SCAR_FLAG_PREFIX } from '../hazard/store-actions';
import { deckEventPoster, deckEventWhere, runDeck, type DeckEventState } from '@/lib/deckEvents';

import { resolveMinigameSeed } from '../minigame-seeds';
import { EMPTY_REST_SLICE, type AppStore } from '../store';

/**
 * Flag prefix banking a held dream / watchful find. Nothing in the game
 * writes these; saves may still carry them, and `/memoir`'s REMAINS
 * section reads them back.
 */
export const REST_KEEPSAKE_FLAG_PREFIX = 'night-keepsake:';

/**
 * Dev/test seed override (`globalThis.__AXM_REST_SEED__`), mirroring the
 * hazard/gathering/cache/blacksmith hooks.
 */
declare global {
    // eslint-disable-next-line no-var
    var __AXM_REST_SEED__: number | undefined;
}

function setSession(store: AppStore, session: RestChoiceSession | null): void {
    store.setState({ rest: { session } });
}

export interface BeginRestOptions {
    seed?: number;
    /**
     * Authored shelter class from the map-event payload.
     * Defaults to `'camp'`; an `'inn'` words the night as a bed.
     */
    shelter?: RestShelter;
    /** The authored MapEvent one-liner (`ResolvedEvent.description`). */
    description?: string | null;
}

/** Start a rest node from the player's current stats. One node at a time. */
export function beginRestAction(store: AppStore, options: BeginRestOptions = {}): boolean {
    const state = store.getState() as unknown as GameState;
    if (store.getState().rest?.session) return false;
    const seed = resolveMinigameSeed('rest', options.seed, globalThis.__AXM_REST_SEED__);
    const player = state.player;
    const flags = state.flags ?? [];
    setSession(store, createRestChoiceSession(seed, {
        shelter: options.shelter ?? DEFAULT_REST_SHELTER,
        maxHealth: player.maxHealth,
        health: player.health,
        currency: player.currency,
        deckCardIds: buildCombatDeck(player, flags),
        removals: cardRemovalsOf(player),
        description: options.description,
    }));
    return true;
}

/** offer -> outcome | cut-pick. */
export function chooseRestChoiceOfferAction(store: AppStore, offer: RestChoiceOfferId): void {
    const s = store.getState().rest?.session;
    if (!s) return;
    setSession(store, engineChooseOffer(s, offer));
}

/** cut-pick -> outcome. `cardId` must be one of `session.deckCardIds`. */
export function pickRestChoiceCutAction(store: AppStore, cardId: string): void {
    const s = store.getState().rest?.session;
    if (!s) return;
    setSession(store, engineCut(s, cardId));
}

/** upgrade-pick -> outcome. `cardId` must be one of `session.upgradableCardIds`. */
export function pickRestChoiceUpgradeAction(store: AppStore, cardId: string): void {
    const s = store.getState().rest?.session;
    if (!s) return;
    setSession(store, engineUpgrade(s, cardId));
}

export interface ClaimRestChoiceResult {
    applied: boolean;
    chosen: RestChoiceOfferId | null;
    healed: number;
    spent: number;
    removedCardId: string | null;
    /** The upgraded id now in the deck (`<id>+`), or null when no upgrade was taken. */
    upgradedToCardId: string | null;
    /** Max-VITAE mended back from hazard scars (any rest, inn or camp). */
    scarMended: number;
}

const NOOP_CLAIM: ClaimRestChoiceResult = Object.freeze({
    applied: false,
    chosen: null,
    healed: 0,
    spent: 0,
    removedCardId: null,
    upgradedToCardId: null,
    scarMended: 0,
});

/**
 * Confirms the outcome ledger and applies the rest node to the engine
 * `GameState`.
 *
 * A `cut` outcome only NAMES the removed card (see `RestChoiceOutcome`
 * header) — the real `removeCardFromCombatDeck` call, and the loadout
 * reconciliation it may do, happens here.
 *
 * Any rest, inn or camp, mends hazard-scarred max-VITAE regardless of
 * which offer was taken (the night is the trigger, not the choice; the
 * Scarred gloss reads "until you next rest"), unrelated to the flat 25%
 * `rest` heal fraction. The engine
 * computes `rest`'s heal against the PRE-mend maxHealth (it never reads
 * `GameState`), so the clamp below re-caps it against the post-mend max
 * rather than under-healing by the mended amount.
 */
export function claimRestChoiceOutcomeAction(store: AppStore): ClaimRestChoiceResult {
    const s = store.getState().rest?.session;
    if (!s || s.phase !== 'outcome' || !s.outcome) return NOOP_CLAIM;
    const done = engineClaim(s);
    if (done.phase !== 'done') return NOOP_CLAIM;

    const outcome = s.outcome;
    const state = store.getState() as unknown as GameState;
    let player: Character = state.player;
    let flags = state.flags ?? [];

    let removedCardId: string | null = null;
    if (outcome.chosen === 'cut' && outcome.removedCardId) {
        const removal = removeCardFromCombatDeck(player, outcome.removedCardId, flags);
        if (removal.ok) {
            player = removal.player;
            flags = removal.flags;
            removedCardId = outcome.removedCardId;
        }
    }

    // An `upgrade` swaps exactly one owned copy for its upgraded id; the
    // other copies stay as they were.
    let upgradedToCardId: string | null = null;
    if (outcome.chosen === 'upgrade' && outcome.upgradedCardId && outcome.upgradedToCardId) {
        const upgraded = replaceCard(player, outcome.upgradedCardId, outcome.upgradedToCardId);
        if (upgraded !== player) {
            player = upgraded;
            upgradedToCardId = outcome.upgradedToCardId;
        }
    }

    const scarMended = bankedScarMagnitude(flags);
    if (scarMended > 0) {
        flags = flags.filter((f) => !f.startsWith(HAZARD_SCAR_FLAG_PREFIX));
    }
    const recoveredMax = player.maxHealth + scarMended;

    const healed = outcome.chosen !== 'rest'
        ? 0
        : Math.min(outcome.healed, recoveredMax - player.health);

    const nextPlayer: Character = {
        ...player,
        maxHealth: recoveredMax,
        health: player.health + healed,
        currency: Math.max(0, player.currency - outcome.spent),
        cardRemovals: outcome.removals,
    };

    store.setState({
        player: nextPlayer,
        flags,
        rest: EMPTY_REST_SLICE,
    } as never);

    try {
        store.getState().save();
    } catch {
        // Persistence failures must not strand the player on the ledger.
    }

    if (removedCardId) postRemoveEvent(store, removedCardId);
    return {
        applied: true,
        chosen: outcome.chosen,
        healed,
        spent: outcome.spent,
        removedCardId: outcome.removedCardId,
        upgradedToCardId,
        scarMended,
    };
}

/**
 * The play log (phase BE2e): the card cut at the rest site, with the deck
 * after the cut (its size is the deck's length).
 */
function postRemoveEvent(store: AppStore, cardId: string): void {
    const state = store.getState() as unknown as DeckEventState;
    void deckEventPoster.post({
        kind: 'remove',
        cardId,
        offered: null,
        deck: runDeck(state),
        where: deckEventWhere(state, 'rest'),
    });
}

/**
 * Rest-choice encounter — store action glue.
 *
 * The pure engine lives in `axiomancer-mechanics` (World/RestChoice); these
 * wrappers thread a rest node's one irreversible choice — `rest` (free,
 * flat 25% heal) / `upgrade` (free, one card upgraded) — through the mobile
 * `rest` slice and, at claim, apply the settled ledger to the real
 * `GameState`: heal, the upgraded copy, the scar mend, and the act's fought
 * elites brought back (`respawnElites`, phase ER1). Card removal is a
 * village counter (`state/village/`).
 */

import type { GameState } from '@mechanics';

import {
    buildCombatDeck,
    chooseRestChoiceOffer as engineChooseOffer,
    claimRestChoiceOutcome as engineClaim,
    createRestChoiceSession,
    DEFAULT_REST_SHELTER,
    pickRestChoiceUpgrade as engineUpgrade,
    replaceCard,
    respawnElites,
} from '@mechanics';
import type {
    Character,
    EliteNodeRef,
    RestChoiceOfferId,
    RestChoiceSession,
    RestShelter,
} from '@mechanics';
import { bankedScarMagnitude, HAZARD_SCAR_FLAG_PREFIX } from '../hazard/store-actions';

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
        description: options.description,
    }));
    return true;
}

/** offer -> outcome | upgrade-pick. */
export function chooseRestChoiceOfferAction(store: AppStore, offer: RestChoiceOfferId): void {
    const s = store.getState().rest?.session;
    if (!s) return;
    setSession(store, engineChooseOffer(s, offer));
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
    /** The upgraded id now in the deck (`<id>+`), or null when no upgrade was taken. */
    upgradedToCardId: string | null;
    /** Max-VITAE mended back from hazard scars (any rest, inn or camp). */
    scarMended: number;
    /** The act's elite nodes the night brought back (`respawnElites`). */
    respawnedElites: readonly EliteNodeRef[];
}

const NOOP_CLAIM: ClaimRestChoiceResult = Object.freeze({
    applied: false,
    chosen: null,
    healed: 0,
    upgradedToCardId: null,
    scarMended: 0,
    respawnedElites: Object.freeze([]) as readonly EliteNodeRef[],
});

/**
 * Confirms the outcome ledger and applies the rest node to the engine
 * `GameState`.
 *
 * Any rest, inn or camp, mends hazard-scarred max-VITAE regardless of
 * which offer was taken (the night is the trigger, not the choice; the
 * Scarred gloss reads "until you next rest"), unrelated to the flat 25%
 * `rest` heal fraction. The engine
 * computes `rest`'s heal against the PRE-mend maxHealth (it never reads
 * `GameState`), so the clamp below re-caps it against the post-mend max
 * rather than under-healing by the mended amount.
 *
 * The night also brings back every elite already fought anywhere in the act
 * (`respawnElites`), in the same `setState` as the outcome, before the one
 * `save()`. The `rest` (heal) choice also clears `dying` there; upgrade
 * leaves it set. Arriving at the rest and leaving before the claim brings back
 * nothing: the claim is the trigger.
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
    };

    const respawn = respawnElites(state.world);

    store.setState({
        player: nextPlayer,
        flags,
        world: respawn.world,
        // Only the heal choice mends dying; an explicit undefined, because
        // the store's set() merges.
        ...(outcome.chosen === 'rest' ? { dying: undefined } : {}),
        rest: EMPTY_REST_SLICE,
    } as never);

    try {
        store.getState().save();
    } catch {
        // Persistence failures must not strand the player on the ledger.
    }

    return {
        applied: true,
        chosen: outcome.chosen,
        healed,
        upgradedToCardId,
        scarMended,
        respawnedElites: respawn.respawned,
    };
}

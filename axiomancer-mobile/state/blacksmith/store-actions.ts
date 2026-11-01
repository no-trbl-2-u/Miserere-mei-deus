/**
 * Blacksmith encounter ("The Anvil") — store action glue.
 *
 * The pure engine lives in `axiomancer-mechanics` (World/Blacksmith);
 * these wrappers thread its die-gear upgrade session through the mobile
 * `blacksmith` slice. Two-way like the loot-cache / rest minigames: the
 * engine NEVER reads `GameState`. The slice seeds the session from the
 * player's current rail (`player.dieGear`, materialised to a concrete
 * rail) and the player's spendable currency (the PLACEHOLDER budget unit
 * the host maps to ◆/souls). At claim it writes
 * `outcome.rail` back to `Character.dieGear` and deducts `outcome.spent`
 * from the wallet (floors at 0 — the anvil charges, it never indebts).
 *
 * Cap-violating OR unaffordable upgrades are refused LOUDLY by the engine
 * (a refusal card, rail + budget untouched); the slice just relays them.
 *
 * The anvil also upgrades one card a visit (Phase UP1e): the session is
 * seeded with the deck (`buildCombatDeck`), and the claim swaps the one
 * picked copy through `replaceCard`, the rest site's split.
 */

import type { GameState } from '@mechanics';
import {
    createBlacksmithSession,
    beginBlacksmith as engineBegin,
    honeBlacksmith as engineHone,
    temperBlacksmith as engineTemper,
    swapBlacksmith as engineSwap,
    continueBlacksmithCard as engineContinueCard,
    leaveBlacksmith as engineLeave,
    claimBlacksmithOutcome as engineClaim,
    chooseBlacksmithCardUpgrade as engineChooseCardUpgrade,
    cancelBlacksmithCardUpgrade as engineCancelCardUpgrade,
    pickBlacksmithCardUpgrade as enginePickCardUpgrade,
    buildCombatDeck,
    concreteDefaultRail,
    replaceCard,
    DIE_GEAR_COLORS,
} from '@mechanics';
import type {
    BlacksmithSession,
    BlacksmithVariantOffer,
    DieGearColor,
    DieGearRail,
} from '@mechanics';
import { resolveMinigameSeed } from '../minigame-seeds';
import { recordDeckUpgrade, recordNodeResolved } from '../run-log';
import { EMPTY_BLACKSMITH_SLICE, type AppStore } from '../store';

/**
 * Dev/test seed override (`globalThis.__AXM_BLACKSMITH_SEED__`),
 * mirroring the hazard/cache/rest hooks. The upgrade transitions are
 * deterministic, so the seed only threads the (unused) RNG.
 */
declare global {
    // eslint-disable-next-line no-var
    var __AXM_BLACKSMITH_SEED__: number | undefined;
}

function setSession(store: AppStore, session: BlacksmithSession | null): void {
    const prev = store.getState().blacksmith ?? EMPTY_BLACKSMITH_SLICE;
    store.setState({ blacksmith: { ...prev, session } });
}

/** Materialise the player's current die-gear into a full concrete rail. */
function playerRail(state: GameState): DieGearRail {
    const rail = concreteDefaultRail();
    const worn = state.player?.dieGear;
    if (worn) {
        for (const color of DIE_GEAR_COLORS) {
            const gear = worn[color];
            if (gear) rail[color] = { ...gear };
        }
    }
    return rail;
}

export interface BeginBlacksmithOptions {
    /** Variant gear pieces on offer this visit (swap targets). */
    variants?: readonly BlacksmithVariantOffer[];
    /**
     * Spendable budget for the visit. Defaults to the player's currency
     * (the wallet the claim deducts from — keeps affordability honest).
     */
    budget?: number;
    seed?: number;
}

/**
 * Start a blacksmith visit from the player's current rail + wallet.
 * Returns false if one is already open (one anvil at a time).
 */
export function beginBlacksmithAction(store: AppStore, options: BeginBlacksmithOptions = {}): boolean {
    const gameState = store.getState() as unknown as GameState;
    if (store.getState().blacksmith?.session) return false;

    const seed = resolveMinigameSeed(
        'blacksmith',
        options.seed,
        globalThis.__AXM_BLACKSMITH_SEED__,
    );
    const rail = playerRail(gameState);
    const budget = options.budget ?? gameState.player?.currency ?? 0;
    const variants = options.variants ?? [];
    const deck = gameState.player ? buildCombatDeck(gameState.player, gameState.flags ?? []) : [];

    store.setState({
        blacksmith: {
            session: createBlacksmithSession(seed, rail, budget, variants, deck),
        },
    });
    return true;
}

/** The anvil acknowledged: intro → forging. */
export function startBlacksmithForgingAction(store: AppStore): void {
    const s = store.getState().blacksmith?.session;
    if (!s) return;
    setSession(store, engineBegin(s));
}

/** HONE a die (add a mana face). forging → card (success or loud refusal). */
export function honeBlacksmithAction(store: AppStore, color: DieGearColor): void {
    const s = store.getState().blacksmith?.session;
    if (!s) return;
    setSession(store, engineHone(s, color));
}

/** TEMPER a die (mana face → special face). forging → card. */
export function temperBlacksmithAction(store: AppStore, color: DieGearColor): void {
    const s = store.getState().blacksmith?.session;
    if (!s) return;
    setSession(store, engineTemper(s, color));
}

/** SWAP an offered variant gear piece in for its die. forging → card. */
export function swapBlacksmithAction(store: AppStore, variantId: string): void {
    const s = store.getState().blacksmith?.session;
    if (!s) return;
    setSession(store, engineSwap(s, variantId));
}

/** Open the card upgrade's picker: forging → upgrade-pick (or a loud refusal card). */
export function chooseBlacksmithCardUpgradeAction(store: AppStore): void {
    const s = store.getState().blacksmith?.session;
    if (!s) return;
    setSession(store, engineChooseCardUpgrade(s));
}

/** Back out of the card picker: upgrade-pick → forging, nothing charged. */
export function cancelBlacksmithCardUpgradeAction(store: AppStore): void {
    const s = store.getState().blacksmith?.session;
    if (!s) return;
    setSession(store, engineCancelCardUpgrade(s));
}

/** Upgrade the picked card: upgrade-pick → card. Must be one of `upgradableCardIds`. */
export function pickBlacksmithCardUpgradeAction(store: AppStore, cardId: string): void {
    const s = store.getState().blacksmith?.session;
    if (!s) return;
    setSession(store, enginePickCardUpgrade(s, cardId));
}

/** Acknowledge the open result/refusal flash: card → forging. */
export function continueBlacksmithCardAction(store: AppStore): void {
    const s = store.getState().blacksmith?.session;
    if (!s) return;
    setSession(store, engineContinueCard(s));
}

/** Leave the anvil, sealing the ledger: forging → outcome. */
export function leaveBlacksmithAction(store: AppStore): void {
    const s = store.getState().blacksmith?.session;
    if (!s) return;
    setSession(store, engineLeave(s));
}

export interface ClaimBlacksmithResult {
    applied: boolean;
    spent: number;
    honed: number;
    tempered: number;
    swapped: number;
    /** The upgraded id now in the deck (`<id>+`), or null when no card was upgraded. */
    upgradedToCardId: string | null;
}

const NOOP_CLAIM: ClaimBlacksmithResult = Object.freeze({
    applied: false,
    spent: 0,
    honed: 0,
    tempered: 0,
    swapped: 0,
    upgradedToCardId: null,
});

/**
 * Confirms the ledger and applies the outcome to the engine `GameState`:
 * `outcome.rail` is written to `Character.dieGear`, `outcome.spent` is
 * deducted from the wallet (floors at 0), and a card upgrade swaps exactly
 * one owned copy for its upgraded id. Clears the slice and persists.
 */
export function claimBlacksmithOutcomeAction(store: AppStore): ClaimBlacksmithResult {
    const s = store.getState().blacksmith?.session;
    if (!s || !s.outcome) return NOOP_CLAIM;
    const done = engineClaim(s);
    if (done.phase !== 'done') return NOOP_CLAIM;

    const outcome = s.outcome;
    const state = store.getState() as unknown as GameState;
    let player = state.player;

    let upgradedToCardId: string | null = null;
    if (outcome.cardUpgrade) {
        const upgraded = replaceCard(player, outcome.cardUpgrade.fromCardId, outcome.cardUpgrade.toCardId);
        if (upgraded !== player) {
            player = upgraded;
            upgradedToCardId = outcome.cardUpgrade.toCardId;
        }
    }

    store.setState({
        player: {
            ...player,
            currency: Math.max(0, player.currency - outcome.spent),
            dieGear: outcome.rail,
        },
        blacksmith: EMPTY_BLACKSMITH_SLICE,
    } as never);

    try {
        store.getState().save();
    } catch {
        // Persistence failures must not strand the player on the ledger.
    }

    // The run log: what the visit came to, and the card upgrade as a deck change.
    const forged = outcome.honed + outcome.tempered + outcome.swapped > 0;
    recordNodeResolved(store, upgradedToCardId !== null ? 'upgrade' : forged ? 'forge' : 'leave');
    if (upgradedToCardId !== null && outcome.cardUpgrade) {
        recordDeckUpgrade(store, outcome.cardUpgrade.fromCardId, upgradedToCardId, 'blacksmith');
    }

    return {
        applied: true,
        spent: outcome.spent,
        honed: outcome.honed,
        tempered: outcome.tempered,
        swapped: outcome.swapped,
        upgradedToCardId,
    };
}

/** Clears the anvil without applying anything (dev / navigation escape). */
export function abandonBlacksmithAction(store: AppStore): void {
    const prev = store.getState().blacksmith ?? EMPTY_BLACKSMITH_SLICE;
    store.setState({ blacksmith: { ...prev, session: null } });
}

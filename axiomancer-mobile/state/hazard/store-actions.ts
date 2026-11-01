/**
 * Hazard minigame — store action implementations.
 *
 * The pure engine lives in `axiomancer-mechanics` (World/Hazard; mobile
 * owns UI only); these wrappers thread the session through the mobile
 * store slice and, at claim time, apply the outcome to the real engine
 * `GameState` (VITAE, max VITAE, currency, deck flags).
 */

import type { GameState } from '@mechanics';

import {
    acknowledgeHazardOutcome as engineAcknowledgeOutcome,
    applyHazardCard as engineApplyCard,
    claimHazardRewards as engineClaimRewards,
    continueHazardAfterResolve as engineContinueAfterResolve,
    createHazardSession,
    discardHazardCard as engineDiscardCard,
    finishHazardRolling as engineFinishRolling,
    isDefeated as engineIsDefeated,
    powerHazardCard as enginePowerCard,
    resolveHazardRound as engineResolveRound,
    selectHazardRoute as engineSelectRoute,
    stageHazardCard as engineStageCard,
    unstageHazardCard as engineUnstageCard,
} from '@mechanics';
import {
    HAZARD_CRACK_CARD,
    hazardLiveDeck,
    HAZARD_LIBRARY,
    HAZARD_MAXHP_SCAR,
    HAZARD_MINHP_LOSS,
    HAZARD_RISK_SHILLINGS_REWARD,
    HAZARD_SHILLINGS_REWARD,
    HAZARD_VITAE_REWARD,
} from '@mechanics';
import { appendAcquiredCard, HAZARD_CARD_FLAG_PREFIX, hazardDeckBag } from '@mechanics';
import type { HazardRouteKey, HazardSessionState } from '@mechanics';
import { resolveMinigameSeed, resolveMinigameString } from '../minigame-seeds';
import { armDeathReturn } from '../death-return';
import { recordHazardEnded, recordNodeResolved } from '../run-log';
import type { AppStore } from '../store';

export interface MobileHazardSlice {
    session: HazardSessionState | null;
}

export const EMPTY_HAZARD_SLICE: MobileHazardSlice = Object.freeze({ session: null });

/**
 * Flag prefix recording an unhealed max-VITAE scar from the `maxhp`
 * consequence. The suffix is the magnitude of max-VITAE lost. The scar
 * is also baked into `player.maxHealth` at claim (the live effect); the
 * flag is the durable record a rest reads to restore the loss
 * toward baseline. Mobile-only adapter — `axiomancer-mechanics` owns no
 * scar-recovery truth.
 */
export const HAZARD_SCAR_FLAG_PREFIX = 'hazard-scar:';

/**
 * Flag prefix recording an out-of-combat death. One flag is
 * stamped per fatal Hazard crossing — a crossing whose net VITAE swing
 * would drop the player to `health <= 0` by the engine's `isDefeated`
 * threshold. The suffix is a timestamp so repeated deaths accumulate
 * distinct tombstones rather than collapsing to one. The durable record
 * a future deaths-this-save surface reads; engine owns no death counter.
 */
export const HAZARD_DEATH_FLAG_PREFIX = 'hazard-death:';

/** Sum the banked max-VITAE loss across all unhealed scar flags. */
export function bankedScarMagnitude(flags: readonly string[]): number {
    let total = 0;
    for (const flag of flags) {
        if (!flag.startsWith(HAZARD_SCAR_FLAG_PREFIX)) continue;
        const magnitude = Number.parseInt(flag.slice(HAZARD_SCAR_FLAG_PREFIX.length), 10);
        if (Number.isFinite(magnitude) && magnitude > 0) total += magnitude;
    }
    return total;
}

/** Count the out-of-combat deaths recorded across all tombstone flags. */
export function hazardDeathCount(flags: readonly string[]): number {
    let count = 0;
    for (const flag of flags) {
        if (flag.startsWith(HAZARD_DEATH_FLAG_PREFIX)) count += 1;
    }
    return count;
}

/**
 * Dev/test seed override. The Playwright playthrough (and any dev
 * tooling) sets `globalThis.__AXM_HAZARD_SEED__` /
 * `globalThis.__AXM_HAZARD_ID__` before triggering a hazard to get a
 * reproducible session. Ignored when unset.
 */
declare global {
    // eslint-disable-next-line no-var
    var __AXM_HAZARD_SEED__: number | undefined;
    // eslint-disable-next-line no-var
    var __AXM_HAZARD_ID__: string | undefined;
}

function currentBag(store: AppStore): string[] {
    const flags = (store.getState() as unknown as GameState).flags ?? [];
    return hazardDeckBag(flags);
}

function setSession(store: AppStore, session: HazardSessionState | null): void {
    const prev = store.getState().hazard ?? EMPTY_HAZARD_SLICE;
    store.setState({ hazard: { ...prev, session } });
}

export interface BeginHazardOptions {
    hazardId?: string;
    seed?: number;
}

export type HazardDeckPresetId = 'starter-baseline' | 'straightforward' | 'utility';

export type HazardDeckPresetProfile = 'baseline' | 'straightforward' | 'utility';

export interface HazardDeckPreset {
    id: HazardDeckPresetId;
    label: string;
    profile: HazardDeckPresetProfile;
    description: string;
    cardIds: readonly string[];
}

export interface HazardDeckPresetResult {
    presetId: HazardDeckPresetId;
    label: string;
    profile: HazardDeckPresetProfile;
    cardIds: string[];
}

/** Core cards that print only numbers, and the ones that carry a utility (never a puzzle-only card). */
const numberCardIds = hazardLiveDeck().filter((card) => !card.effect).map((card) => card.id);
const utilityCardIds = hazardLiveDeck().filter((card) => !!card.effect).map((card) => card.id);

export const HAZARD_DECK_PRESETS: readonly HazardDeckPreset[] = Object.freeze([
    {
        id: 'starter-baseline',
        label: 'Starter baseline',
        profile: 'baseline',
        description: 'Only the implicit starter bag. Use this as the clean control deck.',
        cardIds: [],
    },
    {
        id: 'straightforward',
        label: 'Straightforward',
        profile: 'straightforward',
        description: 'One more copy of each number card: direct force/escape progress.',
        cardIds: numberCardIds,
    },
    {
        id: 'utility',
        label: 'Utility',
        profile: 'utility',
        description: 'One more copy of each utility card: draw, convert and re-cast lines.',
        cardIds: utilityCardIds,
    },
]);

function hazardDeckPresetById(presetId: HazardDeckPresetId): HazardDeckPreset {
    const preset = HAZARD_DECK_PRESETS.find((candidate) => candidate.id === presetId);
    if (!preset) throw new Error(`Unknown hazard deck preset: ${presetId}`);
    return preset;
}

export function beginHazardAction(store: AppStore, options: BeginHazardOptions = {}): boolean {
    const state = store.getState();
    if (state.hazard?.session) return false; // one crisis at a time
    const seed = resolveMinigameSeed(
        'hazard',
        options.seed,
        globalThis.__AXM_HAZARD_SEED__,
    );
    let hazardId = resolveMinigameString(
        'hazard',
        ['hazardId', 'id'],
        options.hazardId,
        globalThis.__AXM_HAZARD_ID__,
    );
    if (!hazardId) {
        hazardId = HAZARD_LIBRARY[Math.abs(seed) % HAZARD_LIBRARY.length].id;
    }
    const session = createHazardSession(seed, currentBag(store), hazardId);
    store.setState({ hazard: { session } });
    return true;
}

export function selectHazardRouteAction(store: AppStore, route: HazardRouteKey): void {
    const s = store.getState().hazard?.session;
    if (!s) return;
    setSession(store, engineSelectRoute(s, route, currentBag(store)));
}

export function finishHazardRollingAction(store: AppStore): void {
    const s = store.getState().hazard?.session;
    if (!s) return;
    setSession(store, engineFinishRolling(s));
}

export function stageHazardCardAction(store: AppStore, uid: string): void {
    const s = store.getState().hazard?.session;
    if (!s) return;
    setSession(store, engineStageCard(s, uid, currentBag(store)));
}

export function unstageHazardCardAction(store: AppStore, uid: string): void {
    const s = store.getState().hazard?.session;
    if (!s) return;
    setSession(store, engineUnstageCard(s, uid));
}

export function discardHazardCardAction(store: AppStore, uid: string): void {
    const s = store.getState().hazard?.session;
    if (!s) return;
    setSession(store, engineDiscardCard(s, uid));
}

export function powerHazardCardAction(store: AppStore, uid: string, dieId: string): void {
    const s = store.getState().hazard?.session;
    if (!s) return;
    setSession(store, enginePowerCard(s, uid, dieId, currentBag(store)));
}

export function applyHazardCardAction(store: AppStore, uid: string): void {
    const s = store.getState().hazard?.session;
    if (!s) return;
    setSession(store, engineApplyCard(s, uid, currentBag(store)));
}

export function resolveHazardRoundAction(store: AppStore): void {
    const s = store.getState().hazard?.session;
    if (!s) return;
    setSession(store, engineResolveRound(s, currentBag(store)));
}

export function continueHazardAfterResolveAction(store: AppStore): void {
    const s = store.getState().hazard?.session;
    if (!s) return;
    setSession(store, engineContinueAfterResolve(s, currentBag(store)));
}

export function acknowledgeHazardOutcomeAction(store: AppStore): void {
    const s = store.getState().hazard?.session;
    if (!s) return;
    setSession(store, engineAcknowledgeOutcome(s));
}

export interface ClaimHazardRewardsResult {
    applied: boolean;
    vitaeDelta: number;
    maxVitaeDelta: number;
    shillings: number;
    cardAdded: string | null;
    crackAdded: boolean;
    /**
     * True when the crossing was fatal: the net VITAE swing
     * would have dropped the player to `health <= 0` (engine `isDefeated`
     * threshold), so the death rule ran (`playerDied('hazard')`) and the
     * crossing's spoils were forfeit. On a fatal claim every delta reads 0
     * — death yields no reward.
     */
    died: boolean;
    /**
     * What the death rule answered on a fatal crossing: `'revived'` (a first
     * death: back on the node walked from at 1 VITAE, dying, the hazard node
     * open to cross again) or `'run-over'` (a death while dying: the run was
     * reset). `null` when the crossing was survived.
     */
    outcome: 'revived' | 'run-over' | null;
}

/** The death verb a fatal crossing runs; the app's `actions.playerDied` is the real one. */
export type HazardDeathVerb = (cause: 'hazard') => 'revived' | 'run-over';

/**
 * The death verb every claim path shares: runs the app's `playerDied` and
 * arms the return moment on a revive. It arms here, before the claim clears
 * the session, so the hazard screen (which watches the session) routes to
 * `/death-return` instead of popping.
 */
export function armingHazardDeath(
    playerDied: (cause: 'hazard') => 'revived' | 'run-over',
): HazardDeathVerb {
    return (cause) => {
        const outcome = playerDied(cause);
        if (outcome === 'revived') armDeathReturn();
        return outcome;
    };
}

const NOOP_CLAIM: ClaimHazardRewardsResult = Object.freeze({
    applied: false,
    vitaeDelta: 0,
    maxVitaeDelta: 0,
    shillings: 0,
    cardAdded: null,
    crackAdded: false,
    died: false,
    outcome: null,
});

/**
 * Confirms the rewards modal and applies the whole outcome to the
 * engine `GameState`:
 *
 *  rewards     — `vitae` heals; `shillings`/`riskShillings` pay shillings.
 *  reserves    — +1 VITAE per unspent non-hex die (REC#3).
 *  consequences— `minhp` damages; `maxhp` scars max VITAE;
 *                `deadcard` shuffles a CRACK into the deck flags.
 *  penalty     — route penaltyVitae × lost rounds.
 *  card pick   — appended to the persistent deck flags.
 *
 * A survivable crossing floors VITAE at 1. A crossing whose net swing
 * reaches `health <= 0` is a death and runs the death rule through `die`
 * (the app passes `actions.playerDied`, which also posts the play log's
 * `run-end` on a run over).
 */
export function claimHazardRewardsAction(
    store: AppStore,
    cardId: string | null,
    die: HazardDeathVerb,
): ClaimHazardRewardsResult {
    const s = store.getState().hazard?.session;
    if (!s || !s.outcome) return NOOP_CLAIM;
    const done = engineClaimRewards(s, cardId);
    if (done.phase !== 'done') return NOOP_CLAIM;

    const outcome = s.outcome;
    const state = store.getState() as unknown as GameState;
    let flags = (state.flags ?? []).slice();
    let vitaeDelta = 0;
    let maxVitaeDelta = 0;
    let shillings = 0;
    let crackAdded = false;

    for (const reward of outcome.rewards) {
        if (reward === 'vitae') vitaeDelta += HAZARD_VITAE_REWARD;
        if (reward === 'shillings') shillings += HAZARD_SHILLINGS_REWARD;
        if (reward === 'riskShillings') shillings += HAZARD_RISK_SHILLINGS_REWARD;
    }
    vitaeDelta += outcome.reserveBonus;

    for (const consequence of outcome.consequences) {
        if (consequence === 'minhp') vitaeDelta -= HAZARD_MINHP_LOSS;
        if (consequence === 'maxhp') maxVitaeDelta -= HAZARD_MAXHP_SCAR;
        if (consequence === 'deadcard') {
            flags = appendAcquiredCard(flags, HAZARD_CRACK_CARD.id);
            crackAdded = true;
        }
    }
    vitaeDelta -= outcome.penaltyVitae;

    if (done.pickedRewardCardId) {
        flags = appendAcquiredCard(flags, done.pickedRewardCardId);
    }

    const player = state.player;

    // Out-of-combat death. The nominal post-crossing VITAE
    // (before the floor-1 clamp below) decides lethality by the engine's
    // own `isDefeated` threshold (`health <= 0`) -- the SAME predicate the
    // combat death path uses. A fatal crossing runs the death rule: a first
    // death revives the player on the node walked from (1 VITAE, dying, the
    // hazard node unspent), a death while dying resets the run. Spoils are
    // forfeit on the killing crossing: we never reach the spoils-apply
    // `setState` below.
    const nominalHealth = player.health + vitaeDelta;
    if (engineIsDefeated({ ...player, health: nominalHealth })) {
        // The run log: the node is named before the death rule moves the player, and the
        // hazard is logged on the run it happened in (a run over gives the store a new id).
        const hazardRun = state.runId;
        recordNodeResolved(store, 'hazard-died');
        const outcomeKind = die('hazard');
        // A revive leaves the player at the VITAE the death rule gave; a run over leaves none.
        const vitaeAfter = outcomeKind === 'revived' ? (store.getState() as unknown as GameState).player.health : 0;
        recordHazardEnded(store, { hazardId: s.hazardId, cleared: false, vitaeBefore: player.health, vitaeAfter }, hazardRun);
        // Stamp the tombstone onto the post-death flags (a run over rebuilds
        // run flags, so it is appended after the death rule ran). `dying` is
        // never written here: the death rule owns it.
        const afterDeath = store.getState() as unknown as GameState;
        const tombstoned = [...(afterDeath.flags ?? []), `${HAZARD_DEATH_FLAG_PREFIX}${Date.now()}`];
        store.setState({ flags: tombstoned, hazard: { session: null } } as never);
        try {
            store.getState().save();
        } catch {
            // Persistence failures must not strand the player on the modal.
        }
        return {
            applied: true,
            vitaeDelta: 0,
            maxVitaeDelta: 0,
            shillings: 0,
            cardAdded: null,
            crackAdded: false,
            died: true,
            outcome: outcomeKind,
        };
    }

    const newMax = Math.max(5, player.maxHealth + maxVitaeDelta);
    const newHealth = Math.min(newMax, Math.max(1, player.health + vitaeDelta));
    // Record the scar that was actually applied (the floor-5 clamp may
    // soften the nominal HAZARD_MAXHP_SCAR) so a rest can restore
    // exactly the max-VITAE lost — never more.
    const appliedScar = player.maxHealth - newMax;
    if (appliedScar > 0) {
        flags = [...flags, `${HAZARD_SCAR_FLAG_PREFIX}${appliedScar}`];
    }
    store.setState({
        player: {
            ...player,
            maxHealth: newMax,
            health: newHealth,
            currency: player.currency + shillings,
        },
        flags,
        hazard: { session: null },
    } as never);

    // Persist immediately — the hazard's spoils and scars are exactly the
    // kind of moment the explicit-save policy exists for.
    try {
        store.getState().save();
    } catch {
        // Persistence failures must not strand the player on the modal.
    }

    // The run log: the crossing survived, and the VITAE on either side of it.
    const cleared = outcome.tier !== 'failure';
    recordHazardEnded(store, { hazardId: s.hazardId, cleared, vitaeBefore: player.health, vitaeAfter: newHealth });
    recordNodeResolved(store, cleared ? 'hazard-cleared' : 'hazard-failed');

    return {
        applied: true,
        vitaeDelta,
        maxVitaeDelta,
        shillings,
        cardAdded: done.pickedRewardCardId,
        crackAdded,
        died: false,
        outcome: null,
    };
}

/** Clears the session without rewards or penalties (dev / navigation escape). */
export function abandonHazardAction(store: AppStore): void {
    setSession(store, null);
}

/** Acquired cards granted by the dev deck-randomizer. */
const RANDOMIZE_ACQUIRED_COUNT = 10;

/** Apply a deterministic Kid playtest deck preset by replacing acquired hazard-card flags. */
export function applyHazardDeckPresetAction(store: AppStore, presetId: HazardDeckPresetId): HazardDeckPresetResult {
    const preset = hazardDeckPresetById(presetId);
    const state = store.getState() as unknown as GameState;
    let flags = (state.flags ?? []).filter((f) => !f.startsWith(HAZARD_CARD_FLAG_PREFIX));
    const cardIds = [...preset.cardIds];
    for (const cardId of cardIds) {
        flags = appendAcquiredCard(flags, cardId);
    }
    store.setState({ flags } as never);
    return {
        presetId: preset.id,
        label: preset.label,
        profile: preset.profile,
        cardIds,
    };
}

/**
 * Dev tool — rebuilds the player's acquired hazard cards as a random
 * selection from the core deck (never a puzzle-only card). Existing
 * `hazard-card:` flags are dropped first; the implicit starter bag is
 * untouched. Returns the granted card ids (with duplicates).
 */
export function randomizeHazardDeckAction(store: AppStore): string[] {
    const state = store.getState() as unknown as GameState;
    const pool = hazardLiveDeck();
    let flags = (state.flags ?? []).filter((f) => !f.startsWith(HAZARD_CARD_FLAG_PREFIX));
    const granted: string[] = [];
    for (let i = 0; i < RANDOMIZE_ACQUIRED_COUNT; i++) {
        const card = pool[Math.floor(Math.random() * pool.length)];
        flags = appendAcquiredCard(flags, card.id);
        granted.push(card.id);
    }
    store.setState({ flags } as never);
    return granted;
}

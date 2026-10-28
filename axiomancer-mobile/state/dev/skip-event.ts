/**
 * Dev-only SKIP EVENT — resolve whatever the player is in (or standing on)
 * with a plausible outcome, so an AI playtester can get past a node it
 * cannot complete. Never visible to players: the action is gated on
 * `isDevToolsEnabled()` (a production call is a logged no-op that touches
 * nothing), and this module is only ever loaded by the lazy `/dev` leaf
 * (`DebugSkipEvent`) and the lazily mounted `<DevSkipBridge>` that installs
 * `globalThis.__AXM_SKIP_EVENT__` — production bundles never import it.
 *
 * Detection order — what the player is "in" (first match wins):
 *   1. a live fight (`state.currentEncounter`)
 *   2. a hazard / rest / loot-cache / blacksmith session
 *   3. a pending event on the slice (a combat prelude, or a paced kind)
 *   4. a queued item reward (`/item-reward`)
 *   5. nothing active but an arrival owed on the node under the player
 *      (start node or `pendingArrival`) → fire it, then resolve as above
 *
 * Resolution per kind (what "plausible" means here):
 *   encounter   VICTORY through the engine's real `endCombat` reducer — XP,
 *               loot, quest kill objectives, level-ups. The engine combat sim
 *               (`runOneEncounter`, greedy witness) plays the fight first;
 *               its outcome rides the result/log and its HP toll (capped at
 *               half max VITAE, never fatal) is taken off the player so a
 *               skipped fight still costs something. The post-combat card
 *               draft is not rolled (nothing to pick from headlessly).
 *   hazard      a median crossing — `complete` tier, ceil(rounds/2) rounds
 *               cleared on the chosen (default safe) route — computed by the
 *               engine's own `continueHazardAfterResolve` outcome path and
 *               claimed with the first offered card.
 *   rest        the free REST offer, claimed (flat heal; mends scars).
 *   loot-cache  the ITEM offer, claimed (rolled items + the node's coin).
 *   blacksmith  leave the anvil unchanged, claimed (nothing spent).
 *   interaction / narration / village / cutscene / gathering
 *               dismissed — the slice clears and the screen pops itself
 *               (each paced screen already does `router.back()` when its
 *               event goes inactive). Mid-tree dialogue effects not yet
 *               chosen are forfeited, exactly as a dismiss would.
 *   item-reward every queued item confirmed into the satchel.
 *   travel      only reachable via the owed-arrival path (doors apply
 *               immediately); reported as the crossing it made.
 *
 * State stays consistent because every branch goes through the same store
 * actions the screens use (`claim*Action`, `endCombat`, `resolveCurrentMapEvent`),
 * so node consumption, rewards and checkpoints land the way live play lands
 * them. `_devSkipSeq` is bumped on every effective skip so the exploration
 * screen can tear down the in-place combat overlay (the one surface whose
 * "in progress" state lives in React, not the store).
 *
 * Every call writes an `action/dev-skip-event` line to the AXM log
 * (`globalThis.__AXM_LOG__`), so captured logs show each skip.
 *
 * Functions:
 *   skipCurrentEvent(store, actions, options)   the action; returns
 *                                               `{ kind, nodeId, outcome, detail }`
 *   installDevSkipHook(store, actions)          `globalThis.__AXM_SKIP_EVENT__`
 *                                               (dev-tools-gated; returns the uninstaller)
 */

import {
    getLogger,
    getMapDefinition,
    getNodeEventPool,
    type Character,
    type Enemy,
    type GameState,
    type HazardMark,
    type HazardSessionState,
    type QuestLog,
} from '@mechanics';
import { runOneEncounter } from '@mechanics/Combat/combat.encounter.sim';

import { isDevToolsEnabled } from '@/lib/buildProfile';
import type { AppActions } from '@/state/actions';
import {
    abandonBlacksmithAction,
    claimBlacksmithOutcomeAction,
    continueBlacksmithCardAction,
    leaveBlacksmithAction,
    startBlacksmithForgingAction,
} from '@/state/blacksmith/store-actions';
import {
    chooseLootCacheChoiceOfferAction,
    claimLootCacheChoiceOutcomeAction,
} from '@/state/cache/store-actions';
import {
    abandonHazardAction,
    acknowledgeHazardOutcomeAction,
    claimHazardRewardsAction,
    continueHazardAfterResolveAction,
} from '@/state/hazard/store-actions';
import { confirmItemRewardAction } from '@/state/item-reward/store-actions';
import { selectHasActiveQuest } from '@/state/presenters/quest.engine';
import { closeQuestAction, offerCompletedQuestExtrasAction } from '@/state/quest/store-actions';
import {
    chooseRestChoiceOfferAction,
    claimRestChoiceOutcomeAction,
    pickRestChoiceCutAction,
} from '@/state/rest/store-actions';
import {
    EMPTY_CACHE_SLICE,
    EMPTY_EVENT_SLICE,
    EMPTY_REST_SLICE,
    type AppStore,
} from '@/state/store';

declare global {
    var __AXM_SKIP_EVENT__: (() => SkipEventResult) | undefined;
}

/** What was skipped. Map-event kinds plus the two mobile-only waits. */
export type SkipEventKind =
    | 'encounter'
    | 'hazard'
    | 'rest'
    | 'loot-cache'
    | 'blacksmith'
    | 'interaction'
    | 'narration'
    | 'village'
    | 'cutscene'
    | 'gathering'
    | 'travel'
    | 'labyrinth'
    | 'quest'
    | 'item-reward'
    | 'none';

/** The small record a Playwright driver logs: what, where, how it ended. */
export interface SkipEventResult {
    readonly kind: SkipEventKind;
    /** The node the player stands on (`null` when the world is unreadable). */
    readonly nodeId: string | null;
    /** One short token: `victory`, `complete:2/3`, `rest:healed=9`, `dismissed`, `nothing-to-skip`, … */
    readonly outcome: string;
    /** Per-kind specifics (rewards, witness sim, …); logged verbatim. */
    readonly detail?: Readonly<Record<string, unknown>>;
}

/** The two app actions the skip needs beyond raw store access. */
export type SkipEventActions = Pick<AppActions, 'resolveCurrentMapEvent' | 'beginHazardEncounter'>;

export interface SkipEventOptions {
    /** Override the gate (tests). Defaults to `isDevToolsEnabled()`. */
    devToolsEnabled?: boolean;
    /** Seed for the combat witness sim; defaults to a clock-derived value. */
    seed?: number;
    /** When nothing is active, fire an owed arrival on the current node first. Default `true`. */
    resolveOwedArrival?: boolean;
}

/** A skipped combat never costs more than this share of max VITAE. */
export const SKIP_COMBAT_MAX_TOLL_FRACTION = 0.5;

/** The AXM log kind every skip writes (`domain: 'action'`). */
export const SKIP_EVENT_LOG_KIND = 'dev-skip-event';

// ---------------------------------------------------------------------------
// The action
// ---------------------------------------------------------------------------

/**
 * Resolve the current event with a plausible outcome (see the module
 * header for the per-kind table). Dev-tools-gated: when disabled the store
 * is untouched and the result reports `ignored:dev-tools-disabled`.
 */
export function skipCurrentEvent(
    store: AppStore,
    actions: SkipEventActions,
    options: SkipEventOptions = {},
): SkipEventResult {
    const enabled = options.devToolsEnabled ?? isDevToolsEnabled();
    const nodeId = currentNodeId(store);
    if (!enabled) {
        const ignored: SkipEventResult = { kind: 'none', nodeId, outcome: 'ignored:dev-tools-disabled' };
        getLogger().warn('action', `${SKIP_EVENT_LOG_KIND}-ignored`, { ...ignored, reason: 'dev-tools-disabled' });
        return ignored;
    }

    let result: SkipEventResult | null = null;
    try {
        result = skipActive(store, actions, options);
        if (result === null && options.resolveOwedArrival !== false && arrivalOwed(store)) {
            result = fireOwedArrival(store, actions, options);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result = { kind: 'none', nodeId, outcome: `failed:${message}` };
        getLogger().error('action', `${SKIP_EVENT_LOG_KIND}-failed`, { nodeId, message });
    }
    if (result === null) result = { kind: 'none', nodeId, outcome: 'nothing-to-skip' };

    if (result.kind !== 'none') {
        store.setState({ _devSkipSeq: (store.getState()._devSkipSeq ?? 0) + 1 });
    }
    flushDeferredQuestExtras();
    getLogger().info('action', SKIP_EVENT_LOG_KIND, {
        kind: result.kind, nodeId: result.nodeId, outcome: result.outcome, ...(result.detail ?? {}),
    });
    return result;
}

// A skipped fight's quest extras (a relic for `/item-reward`, a card pick)
// wait for the next macrotask: the combat screen leaves on the skip's seq
// bump, and an item reward queued in the same render would be pushed and
// then popped by that leave, stranding the player on the combat route.
let pendingQuestExtras: (() => void) | null = null;

function deferQuestExtras(store: AppStore, before: QuestLog): void {
    pendingQuestExtras = () => offerCompletedQuestExtrasAction(store, before);
}

function flushDeferredQuestExtras(): void {
    const run = pendingQuestExtras;
    pendingQuestExtras = null;
    if (run) setTimeout(run, 0);
}

/**
 * Install `globalThis.__AXM_SKIP_EVENT__` for browser harnesses. No-op
 * (returns a no-op uninstaller) when dev tools are off, so production never
 * carries the global. The returned function removes exactly the hook it
 * installed.
 */
export function installDevSkipHook(store: AppStore, actions: SkipEventActions): () => void {
    if (!isDevToolsEnabled()) return () => {};
    const hook = () => skipCurrentEvent(store, actions);
    globalThis.__AXM_SKIP_EVENT__ = hook;
    return () => {
        if (globalThis.__AXM_SKIP_EVENT__ === hook) delete globalThis.__AXM_SKIP_EVENT__;
    };
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

function gameState(store: AppStore): GameState {
    return store.getState() as unknown as GameState;
}

function currentNodeId(store: AppStore): string | null {
    try {
        return gameState(store).world?.currentMap?.currentNode ?? null;
    } catch {
        return null;
    }
}

function currentMapName(store: AppStore): string | null {
    try {
        return gameState(store).world?.currentMap?.name ?? null;
    } catch {
        return null;
    }
}

/**
 * The arrival the map still owes the player — the same two sentences the
 * exploration presenter reads (`arrivalPending` is the record the move
 * verb wrote; `startNodePending` is the one placement that counts as an
 * arrival). A placement by fixture or `/dev` JUMP owes nothing.
 */
function arrivalOwed(store: AppStore): boolean {
    try {
        const map = gameState(store).world.currentMap;
        const nodeId = map.currentNode;
        if ((map.pendingArrival ?? null) === nodeId) return true;
        const def = getMapDefinition(map.continent, map.name);
        return nodeId === def.startingNode.id
            && !(map.consumedNodes ?? []).includes(nodeId)
            && getNodeEventPool(map.continent, map.name, nodeId) !== undefined;
    } catch {
        return false;
    }
}

function skipActive(store: AppStore, actions: SkipEventActions, options: SkipEventOptions): SkipEventResult | null {
    const state = store.getState();
    const nodeId = currentNodeId(store);

    if (state.currentEncounter) {
        return skipCombat(store, state.currentEncounter.enemies[0] ?? null, nodeId, options, 'live');
    }
    if (state.hazard?.session) return skipHazard(store, nodeId);
    if (state.rest?.session) return skipRest(store, nodeId);
    if (state.cache?.session) return skipCache(store, nodeId);
    if (state.blacksmith?.session) return skipBlacksmith(store, nodeId);
    if (selectHasActiveQuest(state)) {
        // The quest screen is left as the LEAVE button does: nothing is
        // accepted or turned in, and the node stays unspent. A card pick
        // waiting with no node open (a boss-victory pick) counts as active
        // and is taken as nothing.
        const open = state.quest.open;
        const offers = state.quest.cardOffers.length;
        closeQuestAction(store);
        return {
            kind: 'quest', nodeId, outcome: 'dismissed',
            detail: { questline: open?.questline ?? null, node: open?.node ?? null, cardOffers: offers },
        };
    }

    const pending = state.event?.pending ?? null;
    if (pending) {
        const kind = pending.event.kind;
        if (kind === 'encounter') {
            // The same engage the overlay performs: pulls the foe, guarantees a
            // deck, clears the slice, stages `currentEncounter` (with the live
            // HP scaling), so the victory below settles against a real encounter.
            const enemy = actions.beginHazardEncounter();
            if (!enemy) {
                store.setState({ event: EMPTY_EVENT_SLICE });
                return { kind: 'encounter', nodeId, outcome: 'dismissed:no-foe' };
            }
            return skipCombat(store, enemy, nodeId, options, 'prelude');
        }
        store.setState({ event: EMPTY_EVENT_SLICE });
        if (kind === 'none') return null;
        return { kind, nodeId, outcome: 'dismissed', detail: pacedDetail(pending.event) };
    }

    const queued = state.itemReward?.queue.length ?? 0;
    if (queued > 0) return skipItemRewards(store, nodeId, queued);

    return null;
}

function pacedDetail(event: { kind: string } & Record<string, unknown>): Record<string, unknown> {
    switch (event.kind) {
        case 'interaction': return { npcName: event.npcName };
        case 'village': return { villageName: event.villageName };
        case 'cutscene': return { lines: Array.isArray(event.lines) ? event.lines.length : 0 };
        case 'gathering': return { items: Array.isArray(event.items) ? event.items.length : 0 };
        default: return {};
    }
}

function fireOwedArrival(store: AppStore, actions: SkipEventActions, options: SkipEventOptions): SkipEventResult {
    const nodeId = currentNodeId(store);
    const mapBefore = currentMapName(store);
    const fired = actions.resolveCurrentMapEvent();
    const mapAfter = currentMapName(store);
    if (mapBefore !== mapAfter && store.getState().labyrinthUi?.session) {
        // The Lantern Deep's vault door: the world is now an Aporia act.
        return { kind: 'labyrinth', nodeId, outcome: `entered:${mapAfter}`, detail: { from: mapBefore, firedArrival: true } };
    }
    if (mapBefore !== mapAfter) {
        return { kind: 'travel', nodeId, outcome: `crossed:${mapAfter}`, detail: { from: mapBefore, firedArrival: true } };
    }
    if (!fired) return { kind: 'none', nodeId, outcome: 'arrival-fired:none', detail: { firedArrival: true } };
    const resolved = skipActive(store, actions, options);
    if (resolved === null) return { kind: 'none', nodeId, outcome: 'arrival-fired:nothing-left', detail: { firedArrival: true } };
    return { ...resolved, detail: { ...(resolved.detail ?? {}), firedArrival: true } };
}

// ---------------------------------------------------------------------------
// Per-kind resolutions
// ---------------------------------------------------------------------------

interface CombatWitness {
    outcome: string;
    rounds: number;
    playerHpTaken: number;
}

/** Play the fight headlessly with the engine's greedy witness; `null` when the sim cannot run. */
function runCombatWitness(player: Character, enemy: Enemy, seed: number): CombatWitness | null {
    try {
        if ((player.knownCards?.length ?? 0) === 0) return null;
        const run = runOneEncounter(player, enemy, seed, 'greedy');
        return { outcome: run.outcome, rounds: run.rounds, playerHpTaken: run.playerHpTaken };
    } catch {
        return null;
    }
}

function cascadeLevelUps(store: AppStore): void {
    const levelUp = (store.getState() as unknown as { levelUp?: () => void }).levelUp;
    let guard = 0;
    while (
        typeof levelUp === 'function'
        && store.getState().player
        && store.getState().player.experience >= store.getState().player.experienceToNextLevel
        && guard < 20
    ) {
        guard += 1;
        levelUp();
    }
}

function checkpoint(store: AppStore): void {
    try {
        store.getState().save();
    } catch {
        /* persistence must not block the skip */
    }
}

function skipCombat(
    store: AppStore,
    enemy: Enemy | null,
    nodeId: string | null,
    options: SkipEventOptions,
    entered: 'live' | 'prelude',
): SkipEventResult {
    const before = gameState(store).player;
    if (!enemy) {
        store.getState().endCombat('flee');
        store.setState({ event: EMPTY_EVENT_SLICE });
        return { kind: 'encounter', nodeId, outcome: 'dismissed:no-foe', detail: { entered } };
    }
    const seed = options.seed ?? (Date.now() % 1_000_003);
    const witness = runCombatWitness(before, enemy, seed);

    // The engine's real END_COMBAT: XP, loot, quest objectives, codex. A
    // kill that completed a quest routes its relic to `/item-reward` and its
    // card pick to the spoils tiles, as the combat host does, once the
    // combat screen has heard the skip and left (`deferQuestExtras`).
    const questsBefore = gameState(store).quests;
    const report = store.getState().endCombat('victory');
    if (questsBefore) deferQuestExtras(store, questsBefore);

    // A plausible win still bleeds: the witness's HP toll, capped and never fatal.
    let hpToll = 0;
    if (witness && witness.playerHpTaken > 0) {
        const player = gameState(store).player;
        const cap = Math.floor(player.maxHealth * SKIP_COMBAT_MAX_TOLL_FRACTION);
        hpToll = Math.max(0, Math.min(witness.playerHpTaken, cap, player.health - 1));
        if (hpToll > 0) {
            store.setState({ player: { ...player, health: player.health - hpToll } } as never);
        }
    }
    cascadeLevelUps(store);
    store.setState({ event: EMPTY_EVENT_SLICE });
    checkpoint(store);

    const after = gameState(store).player;
    return {
        kind: 'encounter',
        nodeId,
        outcome: 'victory',
        detail: {
            entered,
            enemy: enemy.name,
            enemyId: enemy.id,
            xpGained: report?.xpGained ?? 0,
            loot: (report?.loot ?? []).map((item) => item.id),
            levelsGained: after.level - before.level,
            hpToll,
            witness: witness ? { policy: 'greedy', seed, ...witness } : null,
        },
    };
}

/** Median crossing: `complete` tier with ceil(rounds/2) cleared, via the engine's own outcome path. */
function skipHazard(store: AppStore, nodeId: string | null): SkipEventResult {
    const slice = store.getState().hazard;
    const session = slice.session as HazardSessionState;
    const total = Math.max(1, session.totalRounds);
    const wins = Math.ceil(total / 2);

    const alreadyOnFinalFlash = session.phase === 'resolve-flash'
        && (session.resolveInfo?.round ?? 0) >= total;
    if (session.phase !== 'outcome' && session.phase !== 'rewards' && !alreadyOnFinalFlash) {
        const marks: HazardMark[] = Array.from({ length: total }, (_, i) => (i < wins ? 'O' : 'X'));
        const resolveInfo: NonNullable<HazardSessionState['resolveInfo']> = {
            cleared: marks[total - 1] === 'O',
            dual: false,
            round: total,
            force: 0,
            escape: 0,
            carryForce: 0,
            carryEscape: 0,
        };
        store.setState({
            hazard: {
                ...slice,
                session: {
                    ...session,
                    route: session.route ?? 'safe',
                    round: total,
                    marks,
                    play: [],
                    phase: 'resolve-flash',
                    resolveInfo,
                },
            },
        });
    }
    if (store.getState().hazard.session?.phase === 'resolve-flash') continueHazardAfterResolveAction(store);
    if (store.getState().hazard.session?.phase === 'outcome') acknowledgeHazardOutcomeAction(store);

    const settled = store.getState().hazard.session;
    const outcome = settled?.outcome ?? null;
    if (!settled || !outcome) {
        abandonHazardAction(store);
        return { kind: 'hazard', nodeId, outcome: 'abandoned', detail: { hazardId: session.hazardId } };
    }
    const cardId = outcome.canSkip ? null : (outcome.offerCards[0]?.id ?? null);
    const claim = claimHazardRewardsAction(store, cardId);
    if (!claim.applied) {
        abandonHazardAction(store);
        return { kind: 'hazard', nodeId, outcome: 'abandoned', detail: { hazardId: session.hazardId } };
    }
    return {
        kind: 'hazard',
        nodeId,
        outcome: `${outcome.tier}:${outcome.wins}/${outcome.wins + outcome.losses}`,
        detail: {
            hazardId: session.hazardId,
            route: settled.route,
            rewards: outcome.rewards,
            consequences: outcome.consequences,
            vitaeDelta: claim.vitaeDelta,
            maxVitaeDelta: claim.maxVitaeDelta,
            shillings: claim.shillings,
            cardAdded: claim.cardAdded,
            died: claim.died,
        },
    };
}

/** The free REST offer, claimed. A cut already in progress removes the first offered card. */
function skipRest(store: AppStore, nodeId: string | null): SkipEventResult {
    const session = store.getState().rest.session;
    if (session?.phase === 'offer') chooseRestChoiceOfferAction(store, 'rest');
    else if (session?.phase === 'cut-pick') {
        const first = session.deckCardIds[0];
        if (first) pickRestChoiceCutAction(store, first);
    }
    const claim = claimRestChoiceOutcomeAction(store);
    if (!claim.applied) {
        store.setState({ rest: EMPTY_REST_SLICE });
        return { kind: 'rest', nodeId, outcome: 'abandoned', detail: { shelter: session?.shelter ?? null } };
    }
    return {
        kind: 'rest',
        nodeId,
        outcome: `${claim.chosen}:healed=${claim.healed}`,
        detail: {
            shelter: session?.shelter ?? null,
            healed: claim.healed,
            spent: claim.spent,
            removedCardId: claim.removedCardId,
            scarMended: claim.scarMended,
            respawnedElites: claim.respawnedElites.map(e => `${e.map}/${e.node}`),
        },
    };
}

/** The ITEM offer (rolled items + the node's coin), claimed. */
function skipCache(store: AppStore, nodeId: string | null): SkipEventResult {
    const session = store.getState().cache.session;
    if (session?.phase === 'offer') chooseLootCacheChoiceOfferAction(store, 'item');
    const claim = claimLootCacheChoiceOutcomeAction(store);
    if (!claim.applied || !claim.outcome) {
        store.setState({ cache: EMPTY_CACHE_SLICE });
        return { kind: 'loot-cache', nodeId, outcome: 'abandoned' };
    }
    const outcome = claim.outcome;
    return {
        kind: 'loot-cache',
        nodeId,
        outcome: `${outcome.chosen}:items=${outcome.items.length},coin=${outcome.currency}`,
        detail: {
            chosen: outcome.chosen,
            items: outcome.items.map((item) => item.id),
            currency: outcome.currency,
            rewardCardId: outcome.rewardCardId,
        },
    };
}

/** Leave the anvil untouched and claim the (empty) ledger. */
function skipBlacksmith(store: AppStore, nodeId: string | null): SkipEventResult {
    for (let guard = 0; guard < 4; guard += 1) {
        const phase = store.getState().blacksmith.session?.phase;
        if (phase === 'intro') startBlacksmithForgingAction(store);
        else if (phase === 'card') continueBlacksmithCardAction(store);
        else if (phase === 'forging') leaveBlacksmithAction(store);
        else break;
    }
    const claim = claimBlacksmithOutcomeAction(store);
    if (!claim.applied) {
        abandonBlacksmithAction(store);
        return { kind: 'blacksmith', nodeId, outcome: 'abandoned' };
    }
    return {
        kind: 'blacksmith',
        nodeId,
        outcome: `left:spent=${claim.spent}`,
        detail: { spent: claim.spent, honed: claim.honed, tempered: claim.tempered, swapped: claim.swapped },
    };
}

/** Confirm every queued item into the satchel. */
function skipItemRewards(store: AppStore, nodeId: string | null, queued: number): SkipEventResult {
    const granted: string[] = [];
    for (let guard = 0; guard < 20 && (store.getState().itemReward?.queue.length ?? 0) > 0; guard += 1) {
        const head = store.getState().itemReward.queue[0];
        confirmItemRewardAction(store);
        if (head) granted.push(head.item.id);
    }
    return { kind: 'item-reward', nodeId, outcome: `confirmed:${granted.length}`, detail: { queued, granted } };
}

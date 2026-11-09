/**
 * The headless run driver (phase SM1e, A9): one Chapter 1 run, from a new
 * game to its end, through the app's own store actions.
 *
 * The run starts the way a player's does: character select's CONFIRM
 * (`startNewGameAction`, as a character the policy picks from the live
 * roster) on an app store with a memory adapter. Each step then does what the
 * app would do next. An open screen is answered the way its screen's buttons
 * answer it (`run-screens.ts`, `run-fight.ts`); with nothing open, a banked
 * stat point is spent, an owed arrival is resolved (what the map screen does
 * on mount), or the policy picks a road and the driver walks it the way the
 * map's confirm does (`moveTo`, then `resolveCurrentMapEvent`).
 *
 * The run ends at `run-over` (a death while dying) or `chapter-clear` (the
 * run leaves its starting map: the Breakwater's far bank opens only once its
 * boss is beaten and the bridge quest turned in). A step with no legal move
 * throws a `RunStuckError` naming the node and the state. It posts nothing:
 * the play-log gate is shut under the driver (no API URL or token).
 */

import {
    CHARACTER_ROSTER,
    buildCombatDeck,
    deckLaneIds,
    getMapDefinition,
    runRoadOptions,
    type CharacterDefinition,
    type GameState,
    type HazardPolicyId,
    type RunPolicy,
} from '@mechanics';

import { createAppActions, type AppActions } from '@/state/actions';
import { startNewGameAction } from '@/state/menu/store-actions';
import { createMemorySlotStore } from '@/state/persistence/memorySlotStore';
import { selectExplorationViewModel } from '@/state/presenters/exploration.engine';
import { createAppStore, type AppStore, type AppStoreState } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

import { withSeededRun } from './run-env';
import { startTuning, tunedPolicy, type RunTuning } from './run-options';
import { emptyBossLedger, emptyMercyLedger, FightStuckError, playFight, type BossLedger, type MercyLedger, type RunFightResult } from './run-fight';
import {
    ScreenStuckError,
    resolveCache,
    resolveHazard,
    resolveItemReward,
    resolvePacedEvent,
    resolveQuest,
    resolveRest,
    resolveStatPoints,
    resolveTravel,
    resolveVillage,
} from './run-screens';
import { detailOf, questFindings, tapRunEvents, type EventTap, type RunFinding } from './run-breaks';
import { RunCrashError, RunStuckError, stuck, stuckStateOf } from './run-stuck';

/** How a run ended. */
export type RunOutcome = 'run-over' | 'chapter-clear';

/** One run, summed up (what `npm run sim:run` prints). */
export interface RunResult {
    readonly policy: string;
    readonly seed: number;
    readonly characterId: string;
    readonly runId: string;
    readonly outcome: RunOutcome;
    /** The node the run ended on (on its starting map). */
    readonly endNodeId: string;
    /** The deepest node stood on (the map's depth from its start). */
    readonly furthestNodeId: string;
    /** The share (0 to 100) of the boss's VITAE gone when the run's last fight with it ended; null if it never met it. */
    readonly bossDamagePct: number | null;
    readonly level: number;
    readonly vitae: number;
    readonly maxVitae: number;
    readonly fights: Readonly<Record<RunFightResult, number>>;
    /** The mercy checks that fired, their answers and what the won fights paid. */
    readonly mercy: MercyLedger;
    /** The XP into the level at the end, and the shillings held then. */
    readonly experience: number;
    readonly currency: number;
    /** Node arrivals the run resolved. */
    readonly nodesResolved: number;
    readonly steps: number;
    /** The end deck's card count per lane (`none` for a card in no lane). */
    readonly deckByLane: Readonly<Record<string, number>>;
    /** The end deck's card ids (what the `play_runs` close carries). */
    readonly endDeck: readonly string[];
    /** Breaks the end-of-run checks found (phase SM2d): never thrown, never a failure. */
    readonly findings: readonly RunFinding[];
}

export interface PlayRunOptions {
    readonly policy: RunPolicy;
    readonly seed: number;
    /** Steps before the run is called stuck. Defaults to {@link MAX_RUN_STEPS}. */
    readonly maxSteps?: number;
    /** The roster character select shows. Defaults to the live roster. */
    readonly roster?: readonly CharacterDefinition[];
    /** Tuning flags (shillings, boss level, start relics, fight policy, no anvil, no guard); off when absent. */
    readonly tuning?: RunTuning;
    /** A hook on the fresh store, before the first step (tests seat fixtures here). */
    readonly onStart?: (store: AppStore) => void;
    /** A hook before every step (tests and traces read the store here). */
    readonly onStep?: (store: AppStore, step: number) => void;
}

/** A run that takes more steps than this is stuck (the whole Breakwater is ~45 nodes). */
export const MAX_RUN_STEPS = 6000;

interface Tally {
    fights: Record<RunFightResult, number>;
    nodesResolved: number;
    visited: Set<string>;
    furthest: { nodeId: string; depth: number };
    hazard: { policy: HazardPolicyId | null };
    /** Withdrawals from a fight this run, by node id. */
    fled: Map<string, number>;
    /** What the won fights paid and what the mercy checks did. */
    mercy: MercyLedger;
    /** How the last fight with the boss went. */
    boss: BossLedger;
    /** The last state seen alive, for a run-over's summary. */
    alive: AppStoreState;
    /** The node entered with an event still owed, until its `node-resolved` is seen (phase SM2d). */
    owed: { nodeId: string; map: string; step: number } | null;
    /** Findings collected as nodes are left. */
    findings: RunFinding[];
}

/**
 * The node kinds whose resolution logs a `node-resolved` (a fight, a rest, a
 * cache, a hazard, a quest step). A cutscene, a village and a trip are left by
 * dismissing, leaving or declining, and log none, so leaving one is not a break.
 */
const LOGS_RESOLVE: ReadonlySet<string> = new Set(['encounter', 'rest', 'loot-cache', 'hazard', 'quest']);

/** The owed node left without a `node-resolved`: a finding (phase SM2d). */
function checkOwed(store: AppStore, tally: Tally, tap: EventTap, step: number): void {
    const owed = tally.owed;
    tally.owed = null;
    if (owed === null) return;
    const state = store.getState();
    const base = stuckStateOf(state, owed.step);
    tally.findings.push({
        kind: 'node-unresolved',
        node: owed.nodeId,
        message: `node ${owed.nodeId} was entered with an event and left before it resolved (left at step ${step})`,
        state: { ...base, map: owed.map, node: owed.nodeId },
        detail: detailOf(state, deckSizeOf(state), tap.recent),
    });
}

function deckSizeOf(state: AppStoreState): number {
    const game = state as unknown as GameState;
    return buildCombatDeck(game.player, game.flags).length;
}

function depthOf(state: AppStoreState, nodeId: string): number {
    const map = state.world.currentMap;
    const node = getMapDefinition(map.continent, map.name).nodes.find((n) => n.id === nodeId);
    return node?.location[0] ?? 0;
}

function standOn(tally: Tally, state: AppStoreState, startMap: string): void {
    if (state.world.currentMap.name !== startMap) return;
    const here = state.world.currentMap.currentNode;
    tally.visited.add(here);
    const depth = depthOf(state, here);
    if (depth > tally.furthest.depth) tally.furthest = { nodeId: here, depth };
}

function deckByLane(state: AppStoreState): Record<string, number> {
    const game = state as unknown as GameState;
    const out: Record<string, number> = {};
    for (const cardId of buildCombatDeck(game.player, game.flags)) {
        const lane = deckLaneIds([cardId])[0] ?? 'none';
        out[lane] = (out[lane] ?? 0) + 1;
    }
    return out;
}

/** Walk the road the policy picks, the way the map screen walks it. */
function takeRoad(store: AppStore, actions: AppActions, policy: RunPolicy, step: number, tally: Tally, tap: EventTap): number {
    checkOwed(store, tally, tap, step);
    const state = store.getState();
    const game = state as unknown as GameState;
    const options = runRoadOptions(game);
    if (options.length === 0) throw stuck('no legal move from here', state, step);
    const here = game.world.currentMap.currentNode;
    const choice = policy.chooseRoad({
        mapName: game.world.currentMap.name,
        currentNodeId: here,
        options,
        health: state.player.health,
        maxHealth: state.player.maxHealth,
        dying: game.dying === true,
    });
    if (choice === null) throw stuck('no road leads to anything unfinished', state, step);
    const option = options.find((o) => o.nodeId === choice);
    if (!option) throw stuck(`the policy chose '${choice}', which is not a legal road`, state, step);
    const vm = selectExplorationViewModel(state);
    const node = vm.nodes.find((n) => n.id === option.nodeId);
    if (option.via === 'travel') {
        // The tap on the travel node underfoot offers its trip again; YES takes it.
        if (!actions.offerTravelHere() || !actions.takeTravel()) {
            throw stuck(`the trip from ${here} to ${choice} would not go`, store.getState(), step);
        }
        return 0;
    }
    if (option.via === 'retry') {
        if (!actions.moveTo(here).moved) throw stuck(`${here} would not be tried again`, state, step);
        actions.resolveCurrentMapEvent(node?.type);
        return 1;
    }
    const resolves = node !== undefined && (node.kind === 'available' || (node.kind === 'completed' && node.actsAgain === true));
    const result = actions.moveTo(choice);
    if (!result.moved) throw stuck(`the road to ${choice} would not open`, state, step);
    // A quiet walk back moves at once and fires nothing.
    if (!resolves) return 0;
    // An owed arrival with an event: the node must resolve before the run leaves it.
    const arrived = store.getState().world.currentMap;
    if (option.nodeKind !== null && LOGS_RESOLVE.has(option.nodeKind) && (arrived.pendingArrival ?? null) === choice) {
        tally.owed = { nodeId: choice, map: arrived.name, step };
    }
    actions.resolveCurrentMapEvent(node?.type);
    return 1;
}

/**
 * One step: answer whatever is open, else spend a point, resolve an owed
 * arrival or walk a road.
 */
function step(store: AppStore, actions: AppActions, policy: RunPolicy, tally: Tally, tap: EventTap, n: number): void {
    const s = store.getState();
    if (resolveItemReward(store, policy)) return;
    if ((s.quest?.cardOffers.length ?? 0) > 0 && resolveQuest(store, actions, policy)) return;
    if (resolveHazard(store, actions, policy, tally.hazard)) return;
    if (resolveRest(store, actions, policy)) return;
    if (resolveCache(store, actions, policy)) return;
    if (s.blacksmith?.session) {
        actions.leaveBlacksmith();
        if (store.getState().blacksmith?.session) actions.abandonBlacksmith();
        return;
    }
    if (resolveQuest(store, actions, policy)) return;
    if (resolveTravel(store, actions, policy, tally.visited)) return;
    if (s.labyrinthUi?.session) throw stuck('the run entered the Aporia, which the driver does not walk', s, n);
    const pending = s.event?.pending ?? null;
    if ((pending && pending.event.kind === 'encounter') || s.currentEncounter) {
        const result = playFight(store, actions, policy, tally.fled, tally.mercy, tally.boss);
        if (result === null) throw stuck('a fight was offered but would not stage', s, n);
        tally.fights[result]++;
        return;
    }
    if (resolveVillage(store, actions, policy)) return;
    if (resolvePacedEvent(store, actions)) return;
    if (resolveStatPoints(store, actions, policy)) return;
    const vm = selectExplorationViewModel(s);
    if (vm.arrivalPending || vm.startNodePending) {
        const before = s.world;
        actions.resolveCurrentMapEvent();
        tally.nodesResolved++;
        if (store.getState().world === before && !store.getState().event?.pending) {
            throw stuck('the owed arrival would not resolve', store.getState(), n);
        }
        return;
    }
    tally.nodesResolved += takeRoad(store, actions, policy, n, tally, tap);
}

function summarize(
    store: AppStore,
    policy: RunPolicy,
    seed: number,
    outcome: RunOutcome,
    tally: Tally,
    steps: number,
    findings: readonly RunFinding[] = [],
): RunResult {
    const end = outcome === 'run-over' ? tally.alive : store.getState();
    const game = end as unknown as GameState;
    return {
        policy: policy.id,
        seed,
        characterId: game.player.characterId ?? '-',
        runId: game.runId,
        outcome,
        endNodeId: tally.alive.world.currentMap.currentNode,
        furthestNodeId: tally.furthest.nodeId,
        bossDamagePct: tally.boss.damagePct,
        level: game.player.level,
        vitae: outcome === 'run-over' ? 0 : Math.max(0, game.player.health),
        maxVitae: game.player.maxHealth,
        fights: { ...tally.fights },
        mercy: { ...tally.mercy, table: { ...tally.mercy.table } },
        experience: game.player.experience,
        currency: game.player.currency,
        nodesResolved: tally.nodesResolved,
        steps,
        deckByLane: deckByLane(end),
        endDeck: buildCombatDeck(game.player, game.flags),
        findings,
    };
}

/**
 * Play one run to its end.
 *
 * @param options - The policy, the seed, and optional test seams.
 * @returns The run's summary.
 * @throws RunStuckError when a step has no legal move.
 */
export function playRun(options: PlayRunOptions): RunResult {
    const { seed } = options;
    const policy = tunedPolicy(options.policy, options.tuning);
    const maxSteps = options.maxSteps ?? MAX_RUN_STEPS;
    return withSeededRun(seed, () => {
        const tap = tapRunEvents();
        const store = createAppStore({ adapter: createMemoryAdapter() });
        try {
            return playOn(store, tap, { ...options, policy }, maxSteps);
        } finally {
            tap.restore();
        }
    });
}

function playOn(store: AppStore, tap: EventTap, options: PlayRunOptions, maxSteps: number): RunResult {
    const { policy, seed } = options;
    const actions = createAppActions(store);
    const roster = options.roster ?? CHARACTER_ROSTER;
    const characterId = policy.chooseCharacter(roster);
    // Character select's CONFIRM: a new game as the chosen character.
    startNewGameAction(store, createMemorySlotStore(), 1, undefined, characterId, roster);
    const undoTuning = startTuning(store, options.tuning);
    try {
        options.onStart?.(store);
        const startMap = store.getState().world.currentMap.name;
        const tally: Tally = {
            fights: { won: 0, spared: 0, lost: 0, fled: 0 },
            nodesResolved: 0,
            visited: new Set(),
            furthest: { nodeId: store.getState().world.currentMap.currentNode, depth: -1 },
            hazard: { policy: null },
            fled: new Map(),
            mercy: emptyMercyLedger(),
            boss: emptyBossLedger(),
            alive: store.getState(),
            owed: null,
            findings: [],
        };
        tap.onResolved = (nodeId) => {
            if (tally.owed?.nodeId === nodeId) tally.owed = null;
        };
        const enriched = (error: RunStuckError): RunStuckError => {
            const state = store.getState();
            error.detail = detailOf(state, deckSizeOf(state), tap.recent);
            return error;
        };
        for (let n = 0; n < maxSteps; n++) {
            const s = store.getState();
            if (s.runOver === true) return summarize(store, policy, seed, 'run-over', tally, n, tally.findings);
            if (s.world.currentMap.name !== startMap) {
                checkOwed(store, tally, tap, n);
                const detail = detailOf(tally.alive, deckSizeOf(tally.alive), tap.recent);
                const found = [...tally.findings, ...questFindings(tally.alive, n, detail)];
                return summarize(store, policy, seed, 'chapter-clear', tally, n, found);
            }
            tally.alive = s;
            standOn(tally, s, startMap);
            options.onStep?.(store, n);
            try {
                step(store, actions, policy, tally, tap, n);
            } catch (error) {
                if (error instanceof RunStuckError) throw enriched(error);
                if (error instanceof FightStuckError) {
                    const e = stuck(error.message, store.getState(), n);
                    e.kind = 'fight-stuck';
                    throw enriched(e);
                }
                if (error instanceof ScreenStuckError) throw enriched(stuck(error.message, store.getState(), n));
                const state = store.getState();
                throw new RunCrashError(error, stuckStateOf(state, n), detailOf(state, deckSizeOf(state), tap.recent));
            }
        }
        throw enriched(stuck(`no run end in ${maxSteps} steps`, store.getState(), maxSteps));
    } finally {
        undoTuning();
    }
}

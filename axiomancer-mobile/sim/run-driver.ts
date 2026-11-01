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
import { FightStuckError, playFight, type RunFightResult } from './run-fight';
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
import { RunStuckError, stuck } from './run-stuck';

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
    readonly level: number;
    readonly vitae: number;
    readonly maxVitae: number;
    readonly fights: Readonly<Record<RunFightResult, number>>;
    /** Node arrivals the run resolved. */
    readonly nodesResolved: number;
    readonly steps: number;
    /** The end deck's card count per lane (`none` for a card in no lane). */
    readonly deckByLane: Readonly<Record<string, number>>;
    /** The end deck's card ids (what the `play_runs` close carries). */
    readonly endDeck: readonly string[];
}

export interface PlayRunOptions {
    readonly policy: RunPolicy;
    readonly seed: number;
    /** Steps before the run is called stuck. Defaults to {@link MAX_RUN_STEPS}. */
    readonly maxSteps?: number;
    /** The roster character select shows. Defaults to the live roster. */
    readonly roster?: readonly CharacterDefinition[];
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
    /** The last state seen alive, for a run-over's summary. */
    alive: AppStoreState;
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
function takeRoad(store: AppStore, actions: AppActions, policy: RunPolicy, step: number): number {
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
    actions.resolveCurrentMapEvent(node?.type);
    return 1;
}

/**
 * One step: answer whatever is open, else spend a point, resolve an owed
 * arrival or walk a road.
 */
function step(store: AppStore, actions: AppActions, policy: RunPolicy, tally: Tally, n: number): void {
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
        const result = playFight(store, actions, policy, tally.fled);
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
    tally.nodesResolved += takeRoad(store, actions, policy, n);
}

function summarize(
    store: AppStore,
    policy: RunPolicy,
    seed: number,
    outcome: RunOutcome,
    tally: Tally,
    steps: number,
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
        level: game.player.level,
        vitae: outcome === 'run-over' ? 0 : Math.max(0, game.player.health),
        maxVitae: game.player.maxHealth,
        fights: { ...tally.fights },
        nodesResolved: tally.nodesResolved,
        steps,
        deckByLane: deckByLane(end),
        endDeck: buildCombatDeck(game.player, game.flags),
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
    const { policy, seed } = options;
    const maxSteps = options.maxSteps ?? MAX_RUN_STEPS;
    return withSeededRun(seed, () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        const actions = createAppActions(store);
        const roster = options.roster ?? CHARACTER_ROSTER;
        const characterId = policy.chooseCharacter(roster);
        // Character select's CONFIRM: a new game as the chosen character.
        startNewGameAction(store, createMemorySlotStore(), 1, undefined, characterId, roster);
        options.onStart?.(store);
        const startMap = store.getState().world.currentMap.name;
        const tally: Tally = {
            fights: { won: 0, spared: 0, lost: 0, fled: 0 },
            nodesResolved: 0,
            visited: new Set(),
            furthest: { nodeId: store.getState().world.currentMap.currentNode, depth: -1 },
            hazard: { policy: null },
            fled: new Map(),
            alive: store.getState(),
        };
        for (let n = 0; n < maxSteps; n++) {
            const s = store.getState();
            if (s.runOver === true) return summarize(store, policy, seed, 'run-over', tally, n);
            if (s.world.currentMap.name !== startMap) return summarize(store, policy, seed, 'chapter-clear', tally, n);
            tally.alive = s;
            standOn(tally, s, startMap);
            options.onStep?.(store, n);
            try {
                step(store, actions, policy, tally, n);
            } catch (error) {
                if (error instanceof RunStuckError) throw error;
                if (error instanceof FightStuckError || error instanceof ScreenStuckError) {
                    throw stuck(error.message, store.getState(), n);
                }
                throw error;
            }
        }
        throw stuck(`no run end in ${maxSteps} steps`, store.getState(), maxSteps);
    });
}

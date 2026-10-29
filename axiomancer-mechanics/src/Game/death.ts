/**
 * The death rule.
 *
 * A player whose VITAE reaches 0 in a fight or on a hazard does not lose the
 * run the first time. `resolveDeath` brings them back on the node they walked
 * from (`MapState.arrivedFrom`) with 1 VITAE and `dying` set, and the node
 * they died on is made live again so it can be walked into and retried. A
 * death while dying ends the run exactly as `RESET_RUN` with
 * `keepCharacter: true` does. `clearDying` is what a rest's heal calls.
 *
 * Pure. It does not depend on how a lost fight settled the node: the revive
 * un-spends the death node itself, so it holds whether or not `END_COMBAT`
 * settled it on the defeat.
 */

import type { GameState } from './types';
import type { MapState, NodeId } from '../World/types';
import { createStartingWorld } from '../World/starting-world';
import { emptyQuestLog } from '../World/quest.engine';
import { getMapDefinition } from '../World/map.registry';
import { revealAdjacent, syncMoveLists, unspendNode } from '../World/world.reducer';
import { getRng } from '../Utils/rng';
import { generateRunId } from './run-loop';

export type DeathCause = 'fight' | 'hazard';

export interface DeathResult {
    state: GameState;
    /** `'revived'`: back on the map, dying. `'run-over'`: the run is reset. */
    outcome: 'revived' | 'run-over';
}

/**
 * The state `RESET_RUN` with `keepCharacter: true` gives: a fresh `runId` and
 * world, full VITAE, empty quests and flags; the character, codex and rng
 * kept. `version` is carried from `state`; the reducer stamps its own.
 */
export function freshRunKeepingCharacter(
    state: GameState,
    runId: string = generateRunId(() => getRng().random()),
): GameState {
    return {
        version: state.version,
        runId,
        player: {
            ...state.player,
            health: state.player.maxHealth,
            effects: [],
        },
        world: createStartingWorld(),
        quests: emptyQuestLog(),
        flags: [],
        rngState: state.rngState,
        codex: state.codex,
        // Spelled out so a store merging this over the old state drops it.
        dying: undefined,
    };
}

/** Where a revive stands the player: `arrivedFrom`, else the map's start. */
function returnNode(map: MapState): NodeId {
    const def = getMapDefinition(map.continent, map.name);
    const from = map.arrivedFrom;
    if (from && from !== map.currentNode && def.nodes.some(n => n.id === from)) return from;
    return def.startingNode.id;
}

/**
 * Resolves a death. `cause` names where it happened; the rule is the same
 * for both, so it only travels with the call for callers that report it.
 */
export function resolveDeath(state: GameState, _cause: DeathCause): DeathResult {
    if (state.dying) {
        return { state: freshRunKeepingCharacter(state), outcome: 'run-over' };
    }

    const map = state.world.currentMap;
    const deathNode = map.currentNode;
    const back = returnNode(map);

    // The death node is live again whatever the defeat did to it.
    let revived: MapState = unspendNode(map, deathNode);
    if (back === deathNode) {
        // No previous node and the death node is the start: stay, with the
        // arrival owed, as a reload re-offers a fight.
        revived = { ...revived, pendingArrival: deathNode, arrivedFrom: null };
    } else {
        revived = revealAdjacent(
            { ...revived, currentNode: back, pendingArrival: null, arrivedFrom: null },
            back,
        );
    }
    // The move lists are read from where the player now stands.
    revived = syncMoveLists(revived);

    return {
        state: {
            ...state,
            player: { ...state.player, health: 1, effects: [] },
            world: { ...state.world, currentMap: revived },
            currentEncounter: undefined,
            dying: true,
        },
        outcome: 'revived',
    };
}

/** Removes dying (a rest's heal). Identity-stable when not dying. */
export function clearDying(state: GameState): GameState {
    if (!state.dying) return state;
    return { ...state, dying: undefined };
}

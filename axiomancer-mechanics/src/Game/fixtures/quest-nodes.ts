/**
 * Test-only: settles a map's quest nodes so a walker can cross a map that
 * carries a questline without playing it.
 *
 * Every registered questline on the map has its quest nodes spent (consumed,
 * so their held roads open) and every road its steps open on ready
 * (`opensOnReady`, the quest-node locks) or on completion (`gatesPast`, the
 * quest gates) unblocked. The quest log is not
 * touched: no step is accepted, counted or paid. A walk that is ABOUT the
 * questline plays it instead (`breakwater-chapter.engine.test.ts`).
 *
 * Never called by the game: the fixtures, the tests and the e2e walkers use
 * it to keep a walk to the sea keep or the bridge short.
 */

import type { GameState } from '../types';
import type { MapState } from '../../World/types';
import { listQuestlines } from '../../World/questline';
import { markNodeConsumed, syncMoveLists, unblockMapRoute } from '../../World/world.reducer';

/** The quest-node ids of every registered questline on `mapName`, step order. */
export function questNodeIdsOn(mapName: string): string[] {
    return listQuestlines()
        .filter(line => line.mapName === mapName)
        .flatMap(line => line.steps.map(step => step.nodeId));
}

/** `map` with its quest nodes spent and its quest-node locks and gates open. */
export function settleQuestNodes(map: MapState): MapState {
    let next = map;
    for (const line of listQuestlines()) {
        if (line.mapName !== map.name) continue;
        for (const step of line.steps) {
            for (const road of step.opensOnReady ?? []) next = unblockMapRoute(next, road.from, road.to);
            for (const road of step.gatesPast ?? []) next = unblockMapRoute(next, road.from, road.to);
        }
        for (const step of line.steps) next = markNodeConsumed(next, step.nodeId);
    }
    return next === map ? map : syncMoveLists(next);
}

/** `state` with its current map's quest nodes settled (`settleQuestNodes`). */
export function settleQuestNodesIn(state: GameState): GameState {
    const map = settleQuestNodes(state.world.currentMap);
    if (map === state.world.currentMap) return state;
    return { ...state, world: { ...state.world, currentMap: map } };
}

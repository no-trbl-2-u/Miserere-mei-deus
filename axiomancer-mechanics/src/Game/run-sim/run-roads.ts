/**
 * The road seam's map reading (phase SM1e): the legal roads from where the
 * player stands, each marked with how far it is to the nearest node that
 * still has something to do.
 *
 * A node is UNFINISHED when an active quest asks the player to reach it, or
 * when it is unspent (`isNodeSpent`), except a quest node, which is
 * unfinished only while it has business (a step to turn in or to accept:
 * `actsOnRevisit`); an unspent quest node that only refuses the player is not
 * worth a walk until the quest log moves. The map's start node is never a
 * target (the player is placed there, never arrives).
 *
 * Distances count roads as the road rule opens them (`legalMovesFrom`, so
 * blocked gates and held roads are shut) plus same-map travel passages (a
 * travel node whose trip lands on another node of the map). Reads only; no
 * RNG.
 */

import type { GameState } from '../types';
import type { MapState } from '../../World/types';
import type { MapEventPool } from '../../World/MapEvents/types';
import { getMapDefinition } from '../../World/map.registry';
import { isNodeSpent, legalMovesFrom } from '../../World/world.reducer';
import {
    actsOnRevisit,
    getNodeEventPool,
    getNodePrimaryEventKind,
} from '../../World/MapEvents/resolve-map-event';
import type { RunRoadOption } from './run-policy.types';

type RoadState = Pick<GameState, 'world' | 'quests'>;

/** The same-map node a travel node's trip lands on, or null (another map, or no trip). */
export function travelPassageTarget(pool: MapEventPool | undefined): string | null {
    const entry = pool?.entries.find(e => e.payload.kind === 'travel');
    if (!entry || entry.payload.kind !== 'travel') return null;
    const destination = entry.payload.destination;
    return 'node' in destination ? destination.node : null;
}

/** True when an active quest still asks the player to reach `nodeId` (an unfilled `reach` objective). */
export function isReachTarget(state: Pick<GameState, 'quests'>, nodeId: string): boolean {
    return (state.quests?.active ?? []).some(q =>
        q.objectives.some(o => o.type === 'reach' && o.target === nodeId && o.currentCount < o.requiredCount));
}

/** True when `nodeId` on the current map still has something to do (see the file header). */
export function isNodeUnfinished(state: RoadState, nodeId: string): boolean {
    const map = state.world.currentMap;
    const def = getMapDefinition(map.continent, map.name);
    if (nodeId === def.startingNode.id) return false;
    if (isReachTarget(state, nodeId)) return true;
    const kind = getNodePrimaryEventKind(map.continent, map.name, nodeId);
    if (kind === 'quest') return actsOnRevisit(state, nodeId);
    return !isNodeSpent(map, nodeId);
}

/** The nodes one step from `nodeId`: its open roads, then its same-map travel passage. */
function neighbours(map: MapState, nodeId: string): { roads: string[]; passage: string | null } {
    const roads = legalMovesFrom({ ...map, currentNode: nodeId });
    const passage = travelPassageTarget(getNodeEventPool(map.continent, map.name, nodeId));
    return { roads, passage: passage !== null && passage !== nodeId ? passage : null };
}

/**
 * Steps from `startId` to the nearest unfinished node, counting `startId`
 * itself as 0, or null when none is reachable. `blocked` is never entered
 * (the node the player stands on, so a distance never runs back through it).
 */
export function distanceToUnfinished(state: RoadState, startId: string, blocked?: string): number | null {
    const map = state.world.currentMap;
    const seen = new Set<string>([startId]);
    if (blocked !== undefined) seen.add(blocked);
    let frontier = [startId];
    for (let depth = 0; frontier.length > 0; depth++) {
        const next: string[] = [];
        for (const id of frontier) {
            if (isNodeUnfinished(state, id)) return depth;
            const { roads, passage } = neighbours(map, id);
            for (const n of passage === null ? roads : [...roads, passage]) {
                if (seen.has(n)) continue;
                seen.add(n);
                next.push(n);
            }
        }
        frontier = next;
    }
    return null;
}

/**
 * Every legal road from where the player stands, in map order: each open road
 * (`legalMovesFrom`), the node underfoot when it can be tried again (an
 * unfinished node whose arrival is answered: a fled or lost fight), and the
 * trip from here when the node underfoot is a same-map travel node.
 *
 * @param state - The run's state (its current map and quest log).
 * @returns The options the road seam chooses from; empty when there is no legal move.
 */
export function runRoadOptions(state: RoadState): RunRoadOption[] {
    const map = state.world.currentMap;
    const here = map.currentNode;
    const option = (nodeId: string, via: RunRoadOption['via']): RunRoadOption => ({
        nodeId,
        via,
        nodeKind: getNodePrimaryEventKind(map.continent, map.name, nodeId) ?? null,
        unfinished: isNodeUnfinished(state, nodeId),
        distanceToUnfinished: distanceToUnfinished(state, nodeId, nodeId === here ? undefined : here),
    });
    const out: RunRoadOption[] = [];
    const answered = (map.pendingArrival ?? null) === null;
    if (answered && isNodeUnfinished(state, here)) out.push(option(here, 'retry'));
    for (const id of legalMovesFrom(map)) out.push(option(id, 'road'));
    const { passage } = neighbours(map, here);
    if (passage !== null) out.push(option(passage, 'travel'));
    return out;
}

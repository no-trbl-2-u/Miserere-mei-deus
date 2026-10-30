/**
 * A questline's supply: what each step's objectives can count on its map.
 *
 * Read-only and definition-only (the static graph, its blocked roads and its
 * hold list; never a save). Two readers:
 *   - the authoring test (`quest.library.test.ts`), which fails when a step's
 *     pocket holds fewer nodes of the needed kind than its goal plus the
 *     spare (`questlineSupplyProblems`);
 *   - the Act 1 walk plan (`act1-walk.ts`), which plays the questline on its
 *     way to the door and picks the nodes each step counts.
 *
 * A node's class is what a step can count there: a hazard node counts a
 * `hazard` objective; an encounter counts a `kill` objective of `foeClass`
 * `'any'` (the boss excluded: the boss is the last step's), `'elite'` when
 * its foe is an elite, and `'boss'` when it is the boss.
 */

import type { MapDefinition, NodeId, QuestObjective } from './types';
import type { Questline, QuestlineStep } from './questline';
import { getNodeEventPool } from './MapEvents/resolve-map-event';
import { payloadDifficulty } from './encounter-tier';

/** What a node can count toward a step's objective. */
export type SupplyClass = 'hazard' | 'any' | 'elite' | 'boss';

/** Reads a node's supply classes off its registered pool. */
export type SupplyClassOf = (nodeId: NodeId) => readonly SupplyClass[];

/** The supply classes of `nodeId`, read off its registered pool's first entry. */
export function supplyClassesOf(continent: string, map: string, nodeId: NodeId): SupplyClass[] {
    const payload = getNodeEventPool(continent, map, nodeId)?.entries[0]?.payload;
    if (!payload) return [];
    if (payload.kind === 'hazard') return ['hazard'];
    if (payload.kind !== 'encounter') return [];
    if (payload.isBoss) return ['boss'];
    const difficulty = payloadDifficulty(payload);
    return difficulty === 'elite' ? ['any', 'elite'] : ['any'];
}

/** The class an objective counts, or `undefined` when it counts no node. */
export function objectiveClass(objective: Pick<QuestObjective, 'type' | 'target' | 'foeClass'>): SupplyClass | undefined {
    if (objective.type === 'hazard') return 'hazard';
    if (objective.type === 'kill' && objective.target === undefined) return objective.foeClass;
    return undefined;
}

/** Undirected adjacency over a definition's authored edges. */
function adjacency(def: MapDefinition): Map<NodeId, NodeId[]> {
    const adj = new Map<NodeId, NodeId[]>();
    for (const node of def.nodes) adj.set(node.id, []);
    for (const node of def.nodes) {
        for (const next of node.connectedNodes) {
            if (!adj.has(next)) continue;
            adj.get(node.id)!.push(next);
            adj.get(next)!.push(node.id);
        }
    }
    return adj;
}

/**
 * The nodes reachable from the start under the map's rules: a road blocked
 * at map creation stays shut unless it is in `open`, and a held node
 * (`holdRoadsUntilSettled`) is reached but leads nowhere unless it is in
 * `settled`.
 */
export function reachableUnder(
    def: MapDefinition,
    settled: ReadonlySet<NodeId>,
    open: readonly { from: NodeId; to: NodeId }[],
): Set<NodeId> {
    const adj = adjacency(def);
    const held = new Set<NodeId>(def.holdRoadsUntilSettled ?? []);
    const isOpen = (a: NodeId, b: NodeId) => open.some(r => (r.from === a && r.to === b) || (r.from === b && r.to === a));
    const blocked = (a: NodeId, b: NodeId) =>
        (def.initialBlockedRoutes ?? []).some(r => (r.from === a && r.to === b) || (r.from === b && r.to === a))
        && !isOpen(a, b);
    const seen = new Set<NodeId>([def.startingNode.id]);
    const queue: NodeId[] = [def.startingNode.id];
    while (queue.length > 0) {
        const at = queue.shift()!;
        if (held.has(at) && !settled.has(at)) continue;
        for (const next of adj.get(at) ?? []) {
            if (seen.has(next) || blocked(at, next)) continue;
            seen.add(next);
            queue.push(next);
        }
    }
    return seen;
}

/**
 * Step `step`'s supply, strict downstream: the nodes that become reachable
 * when its marker is settled, with the markers before it settled, the locks
 * into its own marker and the ones before it open, and every later lock shut.
 * A node reachable while the marker is unsettled is not supply.
 */
export function stepSupply(def: MapDefinition, questline: Questline, step: QuestlineStep): NodeId[] {
    const before = questline.steps.filter(s => s.step < step.step);
    const open = before.flatMap(s => s.opensOnReady ?? []);
    const settledBefore = new Set<NodeId>(before.map(s => s.nodeId));
    const without = reachableUnder(def, settledBefore, open);
    const withIt = reachableUnder(def, new Set([...settledBefore, step.nodeId]), open);
    return def.nodes.map(n => n.id).filter(id => withIt.has(id) && !without.has(id));
}

/** The spare each class must hold beyond its goal (T, 2026-10-28). */
const SPARE: Readonly<Record<SupplyClass, number>> = { hazard: 1, any: 1, elite: 0, boss: 0 };

/**
 * Every way `questline`'s steps outrun their supply on `def`, as one line
 * each; empty when every pocket holds its goal (and its spare). A hazard or
 * `'any'` step needs its goal plus one; an elite step needs its elites and
 * one further fight beside them; the boss step needs its boss and no spare.
 */
export function questlineSupplyProblems(
    def: MapDefinition,
    questline: Questline,
    classOf: SupplyClassOf = id => supplyClassesOf(def.continent, def.name, id),
): string[] {
    const problems: string[] = [];
    for (const step of questline.steps) {
        const supply = stepSupply(def, questline, step);
        const count = (cls: SupplyClass) => supply.filter(id => classOf(id).includes(cls)).length;
        for (const objective of step.quest.objectives) {
            const cls = objectiveClass(objective);
            if (!cls) continue;
            const need = objective.requiredCount;
            const have = count(cls);
            if (have < need) {
                problems.push(`step ${step.step}: needs ${need} ${cls} node(s) behind ${step.nodeId}, its pocket holds ${have}`
                    + (cls === 'elite' ? ' (a second elite needs a foe change)' : ''));
                continue;
            }
            const spareNeed = need + (cls === 'elite' ? 1 : SPARE[cls]);
            const spareHave = cls === 'elite' ? count('any') : have;
            if (spareHave < spareNeed) {
                problems.push(`step ${step.step}: its pocket behind ${step.nodeId} holds no spare (${spareHave} of ${spareNeed} ${cls === 'elite' ? 'fights' : cls})`);
            }
        }
    }
    return problems;
}

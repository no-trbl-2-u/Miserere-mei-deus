/**
 * A chapter's story, read from its data (phase SM2b, chunk 135.2): which
 * nodes stage an elite or the boss, which trips leave the map (the chapter's
 * exit), which questline is the chapter's main one, and which nodes its
 * current step needs.
 *
 * Everything here reads the map definition, the registered pools and the
 * registered questlines; nothing names a node, a foe or a quest. The run
 * sim's road reading (`Game/run-sim/run-roads.ts`) and the chapter content
 * listing (`chapter1-content.ts`) both read the chapter through it.
 */

import { getNodeEventPool } from './MapEvents/resolve-map-event';
import type { EncounterPayload, MapEventPool } from './MapEvents/types';
import { payloadDifficulty } from './encounter-tier';
import { listQuestlines, questStepState, turnInNodeOf, type Questline, type QuestlineStep } from './questline';
import type { MapDefinition, NodeId, QuestLog } from './types';

/** The encounter payloads a pool can stage, in pool order. */
export function poolEncounters(pool: MapEventPool | undefined): EncounterPayload[] {
    const out: EncounterPayload[] = [];
    for (const entry of pool?.entries ?? []) if (entry.payload.kind === 'encounter') out.push(entry.payload);
    return out;
}

/** True when a pool can stage a foe at the elite tier (its own tier, or the slot's). */
export function poolStagesElite(pool: MapEventPool | undefined): boolean {
    return poolEncounters(pool).some(p => payloadDifficulty(p) === 'elite');
}

/** True when a pool can stage the boss (the payload's boss flag, or a boss-tier foe). */
export function poolStagesBoss(pool: MapEventPool | undefined): boolean {
    return poolEncounters(pool).some(p => p.isBoss === true || payloadDifficulty(p) === 'boss');
}

/** True when `nodeId`'s pool on `def` can stage an elite. */
export function nodeStagesElite(def: MapDefinition, nodeId: NodeId): boolean {
    return poolStagesElite(getNodeEventPool(def.continent, def.name, nodeId));
}

/** True when `nodeId`'s pool on `def` can stage the boss. */
export function nodeStagesBoss(def: MapDefinition, nodeId: NodeId): boolean {
    return poolStagesBoss(getNodeEventPool(def.continent, def.name, nodeId));
}

/** True when `nodeId`'s pool on `def` offers a trip to another map: the chapter's exit. */
export function isExitNode(def: MapDefinition, nodeId: NodeId): boolean {
    const pool = getNodeEventPool(def.continent, def.name, nodeId);
    return (pool?.entries ?? []).some(e => e.payload.kind === 'travel' && 'map' in e.payload.destination);
}

/** The nodes of `def` that stage the boss, in map order. */
export function bossNodes(def: MapDefinition): NodeId[] {
    return def.nodes.filter(n => nodeStagesBoss(def, n.id)).map(n => n.id);
}

/** The nodes of `def` whose trip leaves the map, in map order. */
export function exitNodes(def: MapDefinition): NodeId[] {
    return def.nodes.filter(n => isExitNode(def, n.id)).map(n => n.id);
}

/** The questlines registered on `def`'s map, in registration order. */
export function questlinesOn(def: MapDefinition, questlines: readonly Questline[] = listQuestlines()): Questline[] {
    return questlines.filter(q => q.mapName === def.name);
}

/**
 * The chapter's main questline: the one on the map whose first step is given
 * at the map's start node (the chapter's arrival gives it), else the first
 * questline on the map; null when the map holds none.
 */
export function mainQuestline(def: MapDefinition, questlines: readonly Questline[] = listQuestlines()): Questline | null {
    const on = questlinesOn(def, questlines);
    const opening = on.find(q => q.steps[0]?.nodeId === def.startingNode.id);
    return opening ?? on[0] ?? null;
}

/** The nodes whose pool stages a foe of `slug`, in map order. */
function nodesStaging(def: MapDefinition, slug: string): NodeId[] {
    return def.nodes
        .filter(n => poolEncounters(getNodeEventPool(def.continent, def.name, n.id)).some(p => p.enemySlug === slug))
        .map(n => n.id);
}

/** The nodes whose pool stages an elite, in map order. */
function eliteNodes(def: MapDefinition): NodeId[] {
    return def.nodes.filter(n => nodeStagesElite(def, n.id)).map(n => n.id);
}

/** Where a step's turn-in happens: the next step's node, its own `turnInAt`, else none. */
function turnInOf(line: Questline, step: QuestlineStep): NodeId[] {
    const at = turnInNodeOf(line, step);
    return at === undefined ? [] : [at];
}

/**
 * Every node a step may need, whatever the log says: the node that gives
 * it, what its objectives send the player to, and where it is turned in.
 */
export function stepNodes(def: MapDefinition, line: Questline, step: QuestlineStep): NodeId[] {
    const out = new Set<NodeId>([step.nodeId]);
    for (const objective of step.quest.objectives) for (const id of objectiveNodes(def, line, step, objective)) out.add(id);
    for (const id of turnInOf(line, step)) out.add(id);
    return [...out];
}

/** The nodes one objective sends the player to. */
function objectiveNodes(
    def: MapDefinition,
    line: Questline,
    step: QuestlineStep,
    objective: QuestlineStep['quest']['objectives'][number],
): NodeId[] {
    switch (objective.type) {
        case 'reach':
            return objective.target !== undefined ? [objective.target] : [];
        case 'kill':
            if (objective.target !== undefined) return nodesStaging(def, objective.target);
            if (objective.foeClass === 'boss') return bossNodes(def);
            if (objective.foeClass === 'elite') return eliteNodes(def);
            return [];
        default:
            // A carry, a collect, a talk or a flag is met at its turn-in.
            return turnInOf(line, step);
    }
}

/**
 * The nodes the main questline's current step needs now: the first step not
 * yet completed. Unaccepted, its giver; accepted, what each unmet objective
 * sends the player to; ready, where it is turned in. Empty when the map has no
 * questline or every step is completed.
 */
export function currentStoryTargets(
    def: MapDefinition,
    log: QuestLog | undefined,
    questlines: readonly Questline[] = listQuestlines(),
): NodeId[] {
    const line = mainQuestline(def, questlines);
    if (!line) return [];
    const quests: QuestLog = log ?? { available: [], active: [], completed: [] };
    for (const step of line.steps) {
        const state = questStepState(quests, step);
        if (state === 'completed') continue;
        if (state === 'unaccepted') return [step.nodeId];
        if (state === 'ready') return turnInOf(line, step);
        const active = quests.active.find(q => q.name === step.quest.name);
        const out = new Set<NodeId>();
        for (const objective of active?.objectives ?? step.quest.objectives) {
            if (objective.currentCount >= objective.requiredCount) continue;
            for (const id of objectiveNodes(def, line, step, objective)) out.add(id);
        }
        return [...out];
    }
    return [];
}

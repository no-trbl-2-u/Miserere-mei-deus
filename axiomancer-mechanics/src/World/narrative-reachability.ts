/**
 * Narrative reachability audit.
 *
 * No overworld node kind talks to a map's NPC roster: the `interaction` kind
 * that looked an NPC up by name was cut with the node-kind cleanup. So a
 * rostered NPC carrying a `dialogueTree` is a conversation no player can
 * reach, unless the map declares it deliberately unplaced in `unstagedNpcs`.
 *
 * `auditNarrativeReachability` is the structural guard, mirroring
 * `auditMapTraversal`'s shape: a pure function over a static `MapDefinition`,
 * with a hermetic invariant test on top
 * (`e2e/narrative-reachability.engine.test.ts`).
 */

import type { MapDefinition } from './types';

export interface NarrativeReachabilityAudit {
    mapName: string;
    /**
     * Rostered NPCs carrying a `dialogueTree` that aren't declared in
     * `unstagedNpcs`. No node can reach them.
     */
    unreachableNpcs: readonly string[];
}

/**
 * Lists every NPC on `def`'s roster (`def.npcs`) whose dialogue tree no node
 * reaches and that its declared-unstaged list (`def.unstagedNpcs`) does not
 * account for.
 */
export function auditNarrativeReachability(def: MapDefinition): NarrativeReachabilityAudit {
    const unstagedNames = new Set((def.unstagedNpcs ?? []).map(u => u.name));
    const unreachableNpcs = (def.npcs ?? [])
        .filter(npc => npc.dialogueTree && !unstagedNames.has(npc.name))
        .map(npc => npc.name);
    return { mapName: def.name, unreachableNpcs };
}

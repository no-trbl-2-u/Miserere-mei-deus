/**
 * Narrative reachability — registry-wide invariant.
 *
 * `resolveInteraction` falls back silently when an authored `npcName`
 * doesn't resolve in the host map's roster, so a mismatch or a lost NPC
 * never fails anything at runtime — it just quietly ships a dialogue no
 * player can ever reach. `auditNarrativeReachability` is the
 * structural guard; this file is the hermetic invariant test over the
 * whole registry, mirroring `e2e/map-traversal.engine.test.ts`.
 *
 * The four Act 1 maps are the playable world and carry no NPC roster. Only
 * Chapter 1, the Breakwater, carries a quest (phase LR1f, T 2026-10-27),
 * started by one choice on one node, its giver's narration; Chapters 2-4
 * start none, and nothing on any of them sets a story flag.
 */

import { describe, expect, it } from 'vitest';

import { MAP_REGISTRY } from '../map.registry';
import { auditNarrativeReachability } from '../narrative-reachability';
import { getNodeEventPool } from '../MapEvents/resolve-map-event';
import type { MapDefinition } from '../types';
// Import for side effect — registers the authored pools when the test loads.
import '../MapEvents/content';

const ALL_MAPS: MapDefinition[] = Object.values(MAP_REGISTRY)
    .flatMap(maps => Object.values(maps))
    .filter((def): def is MapDefinition => def !== undefined);

const ACT1_MAPS = ['breakwater', 'charcoal-wood', 'beacon-crags', 'lantern-deep'] as const;

/** Quests per Act 1 map: Chapter 1 only so far. */
const QUEST_COUNT: Readonly<Record<(typeof ACT1_MAPS)[number], number>> = {
    'breakwater': 1, 'charcoal-wood': 0, 'beacon-crags': 0, 'lantern-deep': 0,
};

describe('narrative reachability — pinned to Act 1 (R3c)', () => {
    it('registers the four Act 1 maps', () => {
        expect(ALL_MAPS.map(d => d.name)).toEqual(expect.arrayContaining([...ACT1_MAPS]));
    });

    for (const name of ACT1_MAPS) {
        describe(name, () => {
            const def = ALL_MAPS.find(d => d.name === name)!;

            it('audits clean: no unresolved interaction, lost NPC or scenery-as-people', () => {
                const audit = auditNarrativeReachability(def);
                expect(audit.unresolvedInteractions).toEqual([]);
                expect(audit.unreachableNpcs).toEqual([]);
                expect(audit.sceneryAsPeople).toEqual([]);
            });

            it(`carries no NPC roster and ${QUEST_COUNT[name]} quest(s)`, () => {
                expect(def.npcs ?? []).toEqual([]);
                expect(def.quests ?? []).toHaveLength(QUEST_COUNT[name]);
            });

            it('each map quest is started by one node event, and none sets a story flag', () => {
                // R3c deleted the unread flags; in Act 1 there are none left
                // to read, so none may be written. A quest is started by its
                // giver alone, and a map with no quest starts none.
                const names = (def.quests ?? []).map(q => q.name);
                const starters: string[] = [];
                for (const node of def.nodes) {
                    const pool = getNodeEventPool(def.continent, def.name, node.id);
                    const text = JSON.stringify(pool?.entries ?? []);
                    expect(text, `${name} ${node.id}`).not.toMatch(/"setFlag"/);
                    const started = [...text.matchAll(/"startQuest":"([^"]*)"/g)].map(m => m[1]);
                    expect(started.length, `${name} ${node.id}`).toBeLessThanOrEqual(1);
                    for (const q of started) {
                        expect(names, `${name} ${node.id}`).toContain(q);
                        starters.push(node.id);
                    }
                }
                expect(starters).toHaveLength(names.length);
            });
        });
    }
});

describe('narrative reachability — registry-wide invariant', () => {

    for (const def of ALL_MAPS) {
        describe(def.name, () => {
            const audit = auditNarrativeReachability(def);

            it('names only rostered NPCs from interaction nodes', () => {
                // No exceptions are declared.
                expect(audit.unresolvedInteractions, JSON.stringify(audit.unresolvedInteractions)).toEqual([]);
            });

            it('homes or declares every tree-carrying NPC', () => {
                expect(audit.unreachableNpcs, audit.unreachableNpcs.join(', ')).toEqual([]);
            });
        });
    }
});

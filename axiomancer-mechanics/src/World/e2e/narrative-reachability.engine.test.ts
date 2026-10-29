/**
 * Narrative reachability — registry-wide invariant.
 *
 * No node kind talks to a map NPC, so a rostered NPC with a dialogue tree
 * quietly ships a conversation no player can ever reach.
 * `auditNarrativeReachability` is the structural guard; this file is the hermetic invariant test over the
 * whole registry, mirroring `e2e/map-traversal.engine.test.ts`.
 *
 * The four Act 1 maps are the playable world, they carry no NPC roster, and
 * nothing on them starts a quest or sets a story flag.
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

describe('narrative reachability — pinned to Act 1 (R3c)', () => {
    it('registers the four Act 1 maps', () => {
        expect(ALL_MAPS.map(d => d.name)).toEqual(expect.arrayContaining([...ACT1_MAPS]));
    });

    for (const name of ACT1_MAPS) {
        describe(name, () => {
            const def = ALL_MAPS.find(d => d.name === name)!;

            it('audits clean: no lost NPC', () => {
                expect(auditNarrativeReachability(def).unreachableNpcs).toEqual([]);
            });

            it('carries no NPC roster and no quests', () => {
                expect(def.npcs ?? []).toEqual([]);
                expect(def.quests ?? []).toEqual([]);
            });

            it('no node event starts a quest or sets a story flag', () => {
                // R3c deleted the unstartable quests and unread flags; in Act 1
                // there are none left to read, so none may be written.
                for (const node of def.nodes) {
                    const pool = getNodeEventPool(def.continent, def.name, node.id);
                    const text = JSON.stringify(pool?.entries ?? []);
                    expect(text, `${name} ${node.id}`).not.toMatch(/"(startQuest|setFlag)"/);
                }
            });
        });
    }
});

describe('narrative reachability — registry-wide invariant', () => {

    for (const def of ALL_MAPS) {
        describe(def.name, () => {
            const audit = auditNarrativeReachability(def);

            it('homes or declares every tree-carrying NPC', () => {
                expect(audit.unreachableNpcs, audit.unreachableNpcs.join(', ')).toEqual([]);
            });
        });
    }
});

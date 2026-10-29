/**
 * Unit test for `auditNarrativeReachability` against a hand-built fixture
 * map. No node kind talks to a map NPC, so a tree-carrying NPC is reported
 * unless the map declares it unstaged.
 */

import { describe, expect, it } from 'vitest';

import { auditNarrativeReachability } from './narrative-reachability';
import type { MapDefinition } from './types';
import type { NPC, DialogueTree } from '../NPCs/types';
import type { ContinentName, MapName } from './map.library';

const CONTINENT = 'test-continent' as ContinentName;
const MAP = 'test-map' as MapName;

function fixtureTree(id: string): DialogueTree {
    return { id, rootId: 'greet', nodes: { greet: { id: 'greet', text: 'Hello.' } } };
}

const npcGhost: NPC = { name: 'Ghost Npc', dialogueTree: fixtureTree('ghost') };
const npcDeferred: NPC = { name: 'Deferred Npc', dialogueTree: fixtureTree('deferred') };
const npcSilent: NPC = { name: 'Silent Npc' };

const def: MapDefinition = {
    name: MAP,
    continent: CONTINENT,
    description: 'fixture map',
    startingNode: { id: 'tn-1', location: [0, 0], connectedNodes: ['tn-2'] },
    nodes: [
        { id: 'tn-1', location: [0, 0], connectedNodes: ['tn-2'] },
        { id: 'tn-2', location: [1, 0], connectedNodes: [] },
    ],
    npcs: [npcGhost, npcDeferred, npcSilent],
    unstagedNpcs: [{ name: 'Deferred Npc', reason: 'fixture: deliberately unplaced' }],
};

describe('auditNarrativeReachability', () => {
    it('a rostered NPC with a tree is reported', () => {
        expect(auditNarrativeReachability(def).unreachableNpcs).toContain('Ghost Npc');
    });

    it('an unstagedNpcs entry suppresses that report', () => {
        expect(auditNarrativeReachability(def).unreachableNpcs).not.toContain('Deferred Npc');
    });

    it('an NPC with no tree is not reported', () => {
        expect(auditNarrativeReachability(def).unreachableNpcs).not.toContain('Silent Npc');
    });
});

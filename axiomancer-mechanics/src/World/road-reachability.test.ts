import { describe, it, expect } from 'vitest';

import { auditRoadReachability } from './road-reachability';
import { openRoadsFrom, roadMoveLists } from './roads';
import type { Questline } from './questline';
import type { MapDefinition, MapNode, Quest } from './types';

//   s0 ── m ── p        m holds its road to p until spent
//    └─── a ── b        a plain lane; b's road from a is blocked at creation
const NODES: MapNode[] = [
    { id: 's0', location: [0, 0], connectedNodes: ['m', 'a'] },
    { id: 'm', location: [1, 1], connectedNodes: ['p'] },
    { id: 'p', location: [2, 1], connectedNodes: [] },
    { id: 'a', location: [1, 0], connectedNodes: ['b'] },
    { id: 'b', location: [2, 0], connectedNodes: [] },
];

const DEF: MapDefinition = {
    name: 'wr1a-roads' as MapDefinition['name'],
    continent: 'coastal-continent',
    description: 'WR1a roads fixture.',
    startingNode: NODES[0]!,
    nodes: NODES,
    holdRoadsUntilSettled: ['m'],
    initialBlockedRoutes: [{ from: 'a', to: 'b', reason: 'Not yet.' }],
};

const QUEST: Quest = {
    name: 'wr1a-step', description: '', objectives: [], rewards: [],
} as unknown as Quest;

const line = (opens: boolean): Questline => ({
    id: 'wr1a-line',
    mapName: DEF.name,
    steps: [{ step: 1, nodeId: 'm', quest: QUEST, rewards: [], settle: 'turn-in', ...(opens ? { opensOnReady: [{ from: 'a', to: 'b' }] } : {}) }],
});

const at = (currentNode: string, spent: string[] = [], blocked = DEF.initialBlockedRoutes!.map(r => ({ ...r }))) =>
    ({ currentNode, completedNodes: spent, consumedNodes: [], blockedRoutes: blocked });

describe('openRoadsFrom', () => {
    it('reads roads both ways and drops blocked and held ones', () => {
        expect(openRoadsFrom(DEF, at('s0'), 's0')).toEqual(['m', 'a']);
        expect(openRoadsFrom(DEF, at('a'), 'a')).toEqual(['s0']);
        expect(openRoadsFrom(DEF, at('a', [], []), 'a')).toEqual(['s0', 'b']);
        expect(openRoadsFrom(DEF, at('m'), 'm')).toEqual(['s0']);
        expect(openRoadsFrom(DEF, at('p'), 'p')).toEqual([]);
        expect(openRoadsFrom(DEF, at('m', ['m']), 'm')).toEqual(['s0', 'p']);
        expect(openRoadsFrom(DEF, at('p', ['m']), 'p')).toEqual(['m']);
        expect(openRoadsFrom(DEF, at('s0'), 'nowhere')).toEqual([]);
    });
});

describe('roadMoveLists', () => {
    it('available is the open roads from where the player stands; locked is every other unspent node', () => {
        expect(roadMoveLists(DEF, at('s0'))).toEqual({ availableNodes: ['m', 'a'], lockedNodes: ['p', 'b'] });
        expect(roadMoveLists(DEF, at('m', ['a']))).toEqual({ availableNodes: ['s0'], lockedNodes: ['p', 'b'] });
    });
});

describe('auditRoadReachability', () => {
    it('reaches every node when the questline opens its gates in order', () => {
        expect(auditRoadReachability(DEF, [line(true)])).toEqual({ mapName: DEF.name, unreachableNodes: [], unreachableSteps: [] });
    });

    it('reports a node behind a gate nothing opens', () => {
        expect(auditRoadReachability(DEF, [line(false)]).unreachableNodes).toEqual(['b']);
    });

    it('settles a reachable held node with no quest step, and reports a step whose node is out of reach', () => {
        const noLine = auditRoadReachability(DEF, []);
        expect(noLine.unreachableNodes).toEqual(['b']);
        const behind: Questline = { ...line(true), steps: [{ ...line(true).steps[0]!, nodeId: 'b' }] };
        expect(auditRoadReachability(DEF, [behind]).unreachableSteps).toEqual([{ questline: 'wr1a-line', step: 1, nodeId: 'b' }]);
    });

    it('crosses a same-map passage both ways, as a road', () => {
        //   s0 ── a        a and x are the two ends of a passage; x ── y
        //   x ── y
        const nodes: MapNode[] = [
            { id: 's0', location: [0, 0], connectedNodes: ['a'] },
            { id: 'a', location: [1, 0], connectedNodes: [] },
            { id: 'x', location: [2, 0], connectedNodes: ['y'] },
            { id: 'y', location: [3, 0], connectedNodes: [] },
        ];
        const def: MapDefinition = { ...DEF, nodes, startingNode: nodes[0]!, holdRoadsUntilSettled: [], initialBlockedRoutes: [] };
        expect(auditRoadReachability(def, [], []).unreachableNodes).toEqual(['x', 'y']);
        const passages = [{ from: 'a', to: 'x' }, { from: 'x', to: 'a' }];
        expect(auditRoadReachability(def, [], passages).unreachableNodes).toEqual([]);
    });

    it('settles the held nodes in reach before it checks a step (an elite beaten on the way)', () => {
        //   s0 ── e ── q     e (an elite) holds its road on to the quest node q
        const nodes: MapNode[] = [
            { id: 's0', location: [0, 0], connectedNodes: ['e'] },
            { id: 'e', location: [1, 0], connectedNodes: ['q'] },
            { id: 'q', location: [2, 0], connectedNodes: [] },
        ];
        const def: MapDefinition = { ...DEF, nodes, startingNode: nodes[0]!, holdRoadsUntilSettled: ['e'], initialBlockedRoutes: [] };
        const toQ: Questline = { ...line(false), mapName: def.name, steps: [{ ...line(false).steps[0]!, nodeId: 'q' }] };
        expect(auditRoadReachability(def, [toQ], [])).toEqual({ mapName: def.name, unreachableNodes: [], unreachableSteps: [] });
    });

    it('returns an empty audit for a labyrinth', () => {
        expect(auditRoadReachability({ ...DEF, traversal: 'labyrinth' }, []).unreachableNodes).toEqual([]);
    });
});

/**
 * The authored questlines (phase QL1d: A14 of the QL1 brief; the Breakwater
 * chain since phase BW1b).
 *
 *   The only authored questline is the Breakwater's Chapter 1 chain
 *   (`breakwater-chapter.questline.ts`); its shape, rewards and gates are
 *   pinned in `breakwater-chapter.test.ts`. Every authored line is registered
 *   on load, its quest nodes are reached in step order and no gate can be
 *   walked around. The chain counts no pocket (its goals are places, a key
 *   and the boss), so the A14 supply check (a step's pocket holds its goal
 *   plus a spare) is pinned below on what a node and an objective count, and
 *   on a staged map.
 */

import { describe, it, expect } from 'vitest';

import { AUTHORED_QUESTLINES } from './quest.library';
import { BREAKWATER_CHAPTER_QUESTLINE } from './breakwater-chapter.questline';
import { listQuestlines, type Questline, type QuestlineStep } from './questline';
import { objectiveClass, questlineSupplyProblems, supplyClassesOf, type SupplyClass } from './questline-supply';
import { auditRoadReachability } from './road-reachability';
import { questGateProblems } from './quest-gates';
import { getMapDefinition } from './map.registry';
import { MAP_REGISTRY } from './map.registry';
import type { MapDefinition } from './types';
import './index';

function continentOf(map: string): string {
    for (const [continent, maps] of Object.entries(MAP_REGISTRY)) {
        if ((maps as Record<string, unknown>)[map]) return continent;
    }
    throw new Error(`no map ${map}`);
}

const defOf = (line: Questline): MapDefinition =>
    getMapDefinition(continentOf(line.mapName) as never, line.mapName);

describe('the authored questlines are registered', () => {
    it('registers every authored line at module load: the Breakwater chain, and only it', () => {
        expect(AUTHORED_QUESTLINES).toEqual([BREAKWATER_CHAPTER_QUESTLINE]);
        for (const line of AUTHORED_QUESTLINES) expect(listQuestlines()).toContain(line);
    });
});

describe.each(AUTHORED_QUESTLINES.map(l => [l.id, l] as const))('%s: every step and node in reach', (_id, line) => {
    it('reaches every quest node in step order, and every node of its map, walking the roads', () => {
        const audit = auditRoadReachability(defOf(line), [line]);
        expect(audit.unreachableSteps).toEqual([]);
        expect(audit.unreachableNodes).toEqual([]);
    });
});

describe.each(listQuestlines().map(l => [l.id, l] as const))('MQ1 A3: %s gates hold', (_id, line) => {
    it('no node past a gate on its map is reachable around it (a map with no gates passes)', () => {
        expect(questGateProblems(defOf(line), listQuestlines())).toEqual([]);
    });
});

describe('A14: what a node and an objective count', () => {
    const cls = (id: string) => supplyClassesOf('coastal-continent', 'breakwater', id);

    it('reads each node\'s class off its pool: a hazard, a normal fight, an elite, the boss, and nothing else', () => {
        expect(cls('bw-m2')).toEqual(['hazard']);
        expect(cls('bw-w2')).toEqual(['any']);
        expect(cls('bw-w5')).toEqual(['any', 'elite']);
        expect(cls('bw-k2')).toEqual(['boss']);
        expect(cls('bw-w4')).toEqual([]);
        expect(cls('bw-c2')).toEqual([]);
        expect(cls('no-such-node')).toEqual([]);
        expect(supplyClassesOf('coastal-continent', 'no-such-map', 'bw-m2')).toEqual([]);
    });

    it('reads an objective\'s class: a hazard, a kill by foe class, and nothing for a named target or another type', () => {
        expect(objectiveClass({ type: 'hazard' })).toBe('hazard');
        expect(objectiveClass({ type: 'kill', foeClass: 'any' })).toBe('any');
        expect(objectiveClass({ type: 'kill', foeClass: 'elite' })).toBe('elite');
        expect(objectiveClass({ type: 'kill', foeClass: 'boss' })).toBe('boss');
        expect(objectiveClass({ type: 'kill', target: 'Float-Eye', foeClass: 'any' })).toBeUndefined();
        expect(objectiveClass({ type: 'kill' })).toBeUndefined();
        expect(objectiveClass({ type: 'reach', target: 'bw-m2' })).toBeUndefined();
        expect(objectiveClass({ type: 'collect', target: 'driftwood' })).toBeUndefined();
    });

    it('skips an objective that counts no node: a questline asking for a named kill reports no supply problem for it', () => {
        const line = stagedLine(1);
        const named = {
            ...line,
            steps: line.steps.map(s => s.step !== 2 ? s : {
                ...s, quest: { ...s.quest, objectives: [{ ...s.quest.objectives[0]!, target: 'Float-Eye', requiredCount: 9 }] },
            }),
        };
        expect(questlineSupplyProblems(stagedDef({ withSpare: true }), named, classOf)).toEqual([]);
    });
});

// ─── Negative cases: a staged map and staged classes ─────────────────────────
//
//   s ── m1 ── h1            (pocket 1: one hazard, h2 optional)
//   │    (h2 off m1 when `withSpare`)
//   s ── m2 ── f1, f2, f3    (pocket 2), `around` adds s ── f1
//   s ── m3 ── e1, f4        (pocket 3)
//   s ── m4 ── boss          (pocket 4)

function stagedDef(opts: { withSpare?: boolean; around?: boolean } = {}): MapDefinition {
    const node = (id: string, connectedNodes: string[]) => ({ id, location: [0, 0] as [number, number], connectedNodes });
    return {
        name: 'staged' as never,
        continent: 'coastal-continent',
        description: '',
        startingNode: node('s', ['m1', 'm2', 'm3', 'm4', ...(opts.around ? ['f1'] : [])]),
        nodes: [
            node('s', ['m1', 'm2', 'm3', 'm4', ...(opts.around ? ['f1'] : [])]),
            node('m1', ['h1', ...(opts.withSpare ? ['h2'] : [])]), node('h1', []), node('h2', []),
            node('m2', ['f1', 'f2', 'f3']), node('f1', []), node('f2', []), node('f3', []),
            node('m3', ['e1', 'f4']), node('e1', []), node('f4', []),
            node('m4', ['boss']), node('boss', []),
        ],
        holdRoadsUntilSettled: ['m1', 'm2', 'm3', 'm4', 'boss'],
        npcs: [], enemies: [], uniqueEvents: [], quests: [],
        images: { mapImage: { alt: '', src: '' }, combatImage: { alt: '', src: '' } },
    } as MapDefinition;
}

const STAGED_CLASSES: Record<string, readonly SupplyClass[]> = {
    h1: ['hazard'], h2: ['hazard'],
    f1: ['any'], f2: ['any'], f3: ['any'], f4: ['any'],
    e1: ['any', 'elite'], boss: ['boss'],
};
const classOf = (id: string) => STAGED_CLASSES[id] ?? [];

function stagedLine(hazards: number): Questline {
    const mk = (n: number, nodeId: string, type: 'hazard' | 'kill', foeClass: 'any' | 'elite' | 'boss' | undefined, count: number): QuestlineStep => ({
        step: n,
        nodeId,
        quest: {
            name: `staged-${n}`, description: '', mapName: 'staged' as never, reward: 'quest', status: 'available',
            objectives: [{ id: 'g', type, ...(foeClass ? { foeClass } : {}), description: '', requiredCount: count, currentCount: 0 }],
        },
        rewards: [],
        settle: n === 4 ? 'on-victory' : 'turn-in',
    });
    return {
        id: 'staged-line', mapName: 'staged' as never,
        steps: [mk(1, 'm1', 'hazard', undefined, hazards), mk(2, 'm2', 'kill', 'any', 2), mk(3, 'm3', 'kill', 'elite', 1), mk(4, 'm4', 'kill', 'boss', 1)],
    };
}

describe('A14: the supply check fails loudly', () => {
    it('passes a staged pocket that holds the goal and the spare', () => {
        expect(questlineSupplyProblems(stagedDef({ withSpare: true }), stagedLine(1), classOf)).toEqual([]);
    });

    it('fails a step asking for two hazards of a pocket that holds one', () => {
        const problems = questlineSupplyProblems(stagedDef(), stagedLine(2), classOf);
        expect(problems.some(p => p.startsWith('step 1: needs 2 hazard'))).toBe(true);
    });

    it('fails a pocket holding exactly the goal: no spare', () => {
        const problems = questlineSupplyProblems(stagedDef(), stagedLine(1), classOf);
        expect(problems).toEqual([expect.stringMatching(/^step 1: .* holds no spare/)]);
    });

    it('fails a map with a second road around a marker: that node is not supply', () => {
        const problems = questlineSupplyProblems(stagedDef({ withSpare: true, around: true }), stagedLine(1), classOf);
        expect(problems).toEqual([expect.stringMatching(/^step 2: its pocket behind m2 holds no spare/)]);
    });

    it('fails an elite step whose pocket holds no second elite, naming the foe change', () => {
        const line = stagedLine(1);
        const steps = line.steps.map(s => s.step !== 3 ? s : {
            ...s, quest: { ...s.quest, objectives: [{ ...s.quest.objectives[0]!, requiredCount: 2 }] },
        });
        const problems = questlineSupplyProblems(stagedDef({ withSpare: true }), { ...line, steps }, classOf);
        expect(problems).toEqual([expect.stringContaining('a second elite needs a foe change')]);
    });
});

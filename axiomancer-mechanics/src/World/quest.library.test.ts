/**
 * The authored questlines (phase QL1d: A13, A14 of the QL1 brief).
 *
 *   A13 every authored questline is four steps on four distinct quest nodes
 *       of its map, steps 1-3 turned in and step 4 paid on the boss victory;
 *       each step pays exactly one XP and one extra, the last also one relic,
 *       and every relic a questline pays is a quest relic.
 *   A14 the supply, strict downstream: the nodes that open when step k's
 *       marker is settled hold its goal plus one spare (the boss step none),
 *       and a node reachable around a marker is never supply.
 */

import { describe, it, expect } from 'vitest';

import { AUTHORED_QUESTLINES, BREAKWATER_QUESTLINE } from './quest.library';
import { listQuestlines, type Questline, type QuestlineStep } from './questline';
import { objectiveClass, questlineSupplyProblems, stepSupply, supplyClassesOf, type SupplyClass } from './questline-supply';
import { questGateProblems } from './quest-gates';
import { getMapDefinition } from './map.registry';
import { getNodeEventPool } from './MapEvents/resolve-map-event';
import { MAP_REGISTRY } from './map.registry';
import type { MapDefinition, Reward } from './types';
import type { Equipment, Item } from '../Items/types';
import './index';

function continentOf(map: string): string {
    for (const [continent, maps] of Object.entries(MAP_REGISTRY)) {
        if ((maps as Record<string, unknown>)[map]) return continent;
    }
    throw new Error(`no map ${map}`);
}

const defOf = (line: Questline): MapDefinition =>
    getMapDefinition(continentOf(line.mapName) as never, line.mapName);

function itemOf(reward: Reward): Item | undefined {
    if (typeof reward !== 'object') return undefined;
    if ('category' in reward) return reward;
    return reward.kind === 'item' ? reward.item : undefined;
}

const isRelic = (r: Reward) => itemOf(r)?.category === 'equipment';
const isExtra = (r: Reward) => typeof r === 'object' && (
    ('kind' in r && (r.kind === 'currency' || r.kind === 'card-pick'))
    || itemOf(r)?.category === 'consumable');
const isXp = (r: Reward) => typeof r === 'object' && 'kind' in r && r.kind === 'experience';

describe('the authored questlines are registered', () => {
    it('registers every authored line at module load, the Breakwater\'s first', () => {
        expect(AUTHORED_QUESTLINES[0]).toBe(BREAKWATER_QUESTLINE);
        for (const line of AUTHORED_QUESTLINES) expect(listQuestlines()).toContain(line);
    });
});

describe.each(AUTHORED_QUESTLINES.map(l => [l.id, l] as const))('A13: %s', (_id, line) => {
    const def = defOf(line);

    it('is four steps, numbered 1-4, on four distinct quest nodes of its map, node k offering step k', () => {
        expect(line.steps.map(s => s.step)).toEqual([1, 2, 3, 4]);
        expect(new Set(line.steps.map(s => s.nodeId)).size).toBe(4);
        for (const step of line.steps) {
            expect(def.nodes.some(n => n.id === step.nodeId)).toBe(true);
            const payload = getNodeEventPool(def.continent, def.name, step.nodeId)?.entries[0]?.payload;
            expect(payload).toMatchObject({ kind: 'quest', questline: line.id, node: step.step });
            expect(step.quest.mapName).toBe(line.mapName);
        }
    });

    it('turns in steps 1-3 and pays step 4 on the boss victory', () => {
        expect(line.steps.slice(0, 3).map(s => s.settle)).toEqual(['turn-in', 'turn-in', 'turn-in']);
        const last = line.steps[3]!;
        expect(last.settle).toBe('on-victory');
        expect(last.quest.objectives.some(o => o.type === 'kill' && o.foeClass === 'boss')).toBe(true);
    });

    it('pays exactly one XP and one extra per step, the last step also exactly one relic', () => {
        for (const step of line.steps) {
            expect(step.rewards.filter(isXp), `step ${step.step} XP`).toHaveLength(1);
            expect(step.rewards.filter(isExtra), `step ${step.step} extra`).toHaveLength(1);
            expect(step.rewards.filter(isRelic), `step ${step.step} relic`).toHaveLength(step.step === 4 ? 1 : 0);
            expect(step.rewards).toHaveLength(step.step === 4 ? 3 : 2);
        }
    });

    it('pays only quest relics (none is elite-only)', () => {
        const relics = line.steps.flatMap(s => s.rewards.filter(isRelic).map(r => itemOf(r) as Equipment));
        expect(relics.length).toBeGreaterThan(0);
        for (const relic of relics) expect(relic.relicSource).toBe('quest');
    });
});

describe.each(AUTHORED_QUESTLINES.map(l => [l.id, l] as const))('A14: %s supply, strict downstream', (_id, line) => {
    it('holds every step\'s goal plus the spare in the pocket behind its own marker', () => {
        expect(questlineSupplyProblems(defOf(line), line)).toEqual([]);
    });
});

describe.each(listQuestlines().map(l => [l.id, l] as const))('MQ1 A3: %s gates hold', (_id, line) => {
    it('no node past a gate on its map is reachable around it (a map with no gates passes)', () => {
        expect(questGateProblems(defOf(line), listQuestlines())).toEqual([]);
    });
});

describe('A14: the Breakwater\'s pockets', () => {
    const def = defOf(BREAKWATER_QUESTLINE);
    it('opens exactly the authored pocket behind each marker', () => {
        const pockets = BREAKWATER_QUESTLINE.steps.map(s => stepSupply(def, BREAKWATER_QUESTLINE, s).sort());
        expect(pockets).toEqual([
            ['bw-12', 'bw-3'],
            ['bw-10', 'bw-14', 'bw-2'],
            ['bw-6', 'bw-8'],
            ['bw-17'],
        ]);
    });
});

describe('A14: what a node and an objective count', () => {
    const cls = (id: string) => supplyClassesOf('coastal-continent', 'breakwater', id);

    it('reads each node\'s class off its pool: a hazard, a normal fight, the elite, the boss, and nothing else', () => {
        expect(cls('bw-3')).toEqual(['hazard']);
        expect(cls('bw-2')).toEqual(['any']);
        expect(cls('bw-8')).toEqual(['any', 'elite']);
        expect(cls('bw-17')).toEqual(['boss']);
        expect(cls('bw-4')).toEqual([]);
        expect(cls('bw-19')).toEqual([]);
        expect(cls('no-such-node')).toEqual([]);
        expect(supplyClassesOf('coastal-continent', 'no-such-map', 'bw-3')).toEqual([]);
    });

    it('reads an objective\'s class: a hazard, a kill by foe class, and nothing for a named target or another type', () => {
        expect(objectiveClass({ type: 'hazard' })).toBe('hazard');
        expect(objectiveClass({ type: 'kill', foeClass: 'any' })).toBe('any');
        expect(objectiveClass({ type: 'kill', foeClass: 'elite' })).toBe('elite');
        expect(objectiveClass({ type: 'kill', foeClass: 'boss' })).toBe('boss');
        expect(objectiveClass({ type: 'kill', target: 'Float-Eye', foeClass: 'any' })).toBeUndefined();
        expect(objectiveClass({ type: 'kill' })).toBeUndefined();
        expect(objectiveClass({ type: 'reach', target: 'bw-3' })).toBeUndefined();
        expect(objectiveClass({ type: 'collect', target: 'driftwood' })).toBeUndefined();
    });

    it('skips an objective that counts no node: a questline asking for a named kill reports no supply problem for it', () => {
        const line = BREAKWATER_QUESTLINE;
        const named = {
            ...line,
            steps: line.steps.map(s => s.step !== 2 ? s : {
                ...s, quest: { ...s.quest, objectives: [{ ...s.quest.objectives[0]!, target: 'Float-Eye', requiredCount: 9 }] },
            }),
        };
        expect(questlineSupplyProblems(defOf(line), named)).toEqual([]);
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

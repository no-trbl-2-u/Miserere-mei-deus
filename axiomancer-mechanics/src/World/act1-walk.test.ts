import { describe, it, expect } from 'vitest';
import { planAct1Walk, ACT1_WALK_EVENT_KINDS } from './act1-walk';
import { MAP_REGISTRY } from './map.registry';
import { getNodeEventPool } from './MapEvents/resolve-map-event';
import { mapPassages } from './road-reachability';
import { BREAKWATER_CHAPTER_QUESTLINE } from './breakwater-chapter.questline';

const plan = planAct1Walk();

describe('planAct1Walk', () => {
    it('reads the four Act 1 regions, doors and exits off the graph and the pools', () => {
        expect(plan.regions.map(r => [r.map, r.door, r.exit])).toEqual([
            ['breakwater', 'bw-b1', 'bw-b2'],
            ['charcoal-wood', 'cw-17', 'cw-20'],
            ['beacon-crags', 'bc-15', 'bc-17'],
            ['lantern-deep', 'ld-16', 'ld-18'],
        ]);
    });

    for (const region of plan.regions) {
        describe(region.map, () => {
            const def = MAP_REGISTRY[region.continent][region.map]!;
            const edges = new Set<string>();
            for (const n of def.nodes) {
                for (const m of n.connectedNodes) {
                    edges.add(`${n.id}|${m}`);
                    edges.add(`${m}|${n.id}`);
                }
            }
            const passages = new Set(mapPassages(def).map(p => `${p.from}|${p.to}`));
            // The Breakwater's door is the river bridge's quest node (step 4 is
            // turned in there); every other region's door is its boss fight.
            const doorKind = region.map === 'breakwater' ? 'quest' : 'encounter';

            it('starts on the arrival node and ends door, then exit', () => {
                const steps = region.steps;
                expect(steps[0]).toMatchObject({ nodeId: region.start, role: 'arrival' });
                expect(steps[steps.length - 2]).toMatchObject({ nodeId: region.door, role: 'door', kind: doorKind });
                expect(steps[steps.length - 1]).toMatchObject({ nodeId: region.exit, role: 'exit' });
            });

            it('walks the roads and passages: each step is joined to the one before, and only a back or passage step repeats a node', () => {
                const walked = new Set<string>([region.start]);
                let here = region.start;
                for (const step of region.steps.slice(1)) {
                    const link = `${here}|${step.nodeId}`;
                    if (step.role === 'passage') {
                        expect(passages.has(link), `${here} => ${step.nodeId} is a passage`).toBe(true);
                    } else {
                        expect(edges.has(link), `${here} -> ${step.nodeId}`).toBe(true);
                        expect(walked.has(step.nodeId)).toBe(step.role === 'back');
                    }
                    walked.add(step.nodeId);
                    here = step.nodeId;
                }
            });

            it('never reaches the door before every kind the region carries is met', () => {
                const doorAt = region.steps.findIndex(s => s.role === 'door');
                const before = new Set(region.steps.slice(0, doorAt + 2).map(s => s.kind));
                for (const kind of region.carried) expect(before.has(kind)).toBe(true);
            });

            it("labels each step with its pool kind, or 'none' for a waypoint", () => {
                for (const step of region.steps) {
                    const kind = getNodeEventPool(region.continent, region.map, step.nodeId)?.entries[0]?.kind ?? 'none';
                    expect(kind).toBe(step.kind);
                }
            });
        });
    }

    it('plays the Breakwater chain in order: the camp, the lighthouse, the keep gate, the boss, the bridge', () => {
        const ids = plan.regions[0]!.steps.map(s => s.nodeId);
        const firstAt = (id: string) => ids.indexOf(id);
        const order = [...BREAKWATER_CHAPTER_QUESTLINE.steps.slice(1).map(s => s.nodeId), 'bw-k2', 'bw-b1', 'bw-b2'];
        expect(order).toEqual(['bw-c2', 'bw-l5', 'bw-k1', 'bw-k2', 'bw-b1', 'bw-b2']);
        const at = order.map(firstAt);
        expect(at.every(i => i > 0)).toBe(true);
        expect([...at].sort((a, b) => a - b)).toEqual(at);
    });

    it('crosses the sea cave by its passage both ways, and never by road', () => {
        const steps = plan.regions[0]!.steps;
        const passages = steps.filter(s => s.role === 'passage').map(s => s.nodeId);
        expect(passages).toEqual(['bw-c0', 'bw-h6']);
    });

    it('lists the nine kinds and the waypoint the audit table covers, and no removed kind', () => {
        expect(ACT1_WALK_EVENT_KINDS).toHaveLength(10);
        expect(ACT1_WALK_EVENT_KINDS).not.toContain('blacksmith');
        expect(ACT1_WALK_EVENT_KINDS).toContain('quest');
        expect(ACT1_WALK_EVENT_KINDS).toContain('none');
    });

    it('meets the waypoint: the gathering nodes the cut emptied are on the plan as none', () => {
        expect(plan.carried).toContain('none');
    });

    it('carries a subset of the eleven kinds, and the walk meets every one it carries', () => {
        for (const kind of plan.carried) expect(ACT1_WALK_EVENT_KINDS).toContain(kind);
        const met = new Set(plan.regions.flatMap(r => r.steps.map(s => s.kind)));
        expect([...met].sort()).toEqual([...plan.carried].sort());
    });
});

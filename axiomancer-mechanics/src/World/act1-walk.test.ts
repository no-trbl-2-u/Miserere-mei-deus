import { describe, it, expect } from 'vitest';
import { planAct1Walk, ACT1_WALK_EVENT_KINDS } from './act1-walk';
import { MAP_REGISTRY } from './map.registry';
import { getNodeEventPool } from './MapEvents/resolve-map-event';

const plan = planAct1Walk();

describe('planAct1Walk', () => {
    it('reads the four Act 1 regions, doors and exits off the graph', () => {
        expect(plan.regions.map(r => [r.map, r.door, r.exit])).toEqual([
            ['breakwater', 'bw-17', 'bw-18'],
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

            it('starts on the arrival node and ends door, then exit', () => {
                const steps = region.steps;
                expect(steps[0]).toMatchObject({ nodeId: region.start, role: 'arrival' });
                expect(steps[steps.length - 2]).toMatchObject({ nodeId: region.door, role: 'door', kind: 'encounter' });
                expect(steps[steps.length - 1]).toMatchObject({ nodeId: region.exit, role: 'exit' });
            });

            it('only steps on to frontier nodes (each touches a node already walked) and never repeats one', () => {
                const walked = new Set<string>([region.start]);
                for (const step of region.steps.slice(1)) {
                    expect(walked.has(step.nodeId)).toBe(false);
                    expect([...walked].some(w => edges.has(`${w}|${step.nodeId}`))).toBe(true);
                    walked.add(step.nodeId);
                }
            });

            it('never reaches the door before every kind the region carries is met', () => {
                const doorAt = region.steps.findIndex(s => s.role === 'door');
                const before = new Set(region.steps.slice(0, doorAt + 2).map(s => s.kind));
                for (const kind of region.carried) expect(before.has(kind)).toBe(true);
            });

            it('labels each step with its pool kind', () => {
                for (const step of region.steps) {
                    expect(getNodeEventPool(region.continent, region.map, step.nodeId)?.entries[0]?.kind).toBe(step.kind);
                }
            });
        });
    }

    it('carries a subset of the thirteen kinds, and the walk meets every one it carries', () => {
        for (const kind of plan.carried) expect(ACT1_WALK_EVENT_KINDS).toContain(kind);
        const met = new Set(plan.regions.flatMap(r => r.steps.map(s => s.kind)));
        expect([...met].sort()).toEqual([...plan.carried].sort());
    });
});

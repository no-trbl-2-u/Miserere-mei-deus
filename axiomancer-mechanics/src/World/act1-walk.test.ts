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

            it('walks the roads: each step is joined to the one before, and only a back step repeats a node', () => {
                const walked = new Set<string>([region.start]);
                let here = region.start;
                for (const step of region.steps.slice(1)) {
                    expect(edges.has(`${here}|${step.nodeId}`), `${here} -> ${step.nodeId}`).toBe(true);
                    expect(walked.has(step.nodeId)).toBe(step.role === 'back');
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

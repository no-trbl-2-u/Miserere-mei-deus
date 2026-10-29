/**
 * Hermetic presenter tests — what the exploration chart has to SAY.
 *
 * Two engine rules the presenter must reflect:
 *
 *   1. `legalMovesFrom` is the FRONTIER (`world.reducer.ts`), so a node the
 *      player has resolved is not a legal destination, and `classifyNode`
 *      must say why it is not one.
 *   2. LATERAL LANE RIBS connect nodes across the maps. They are traversal,
 *      not progression — the engine's own route audits walk the forward
 *      skeleton and ignore them — and the canvas has to draw that difference
 *      or a branching map reads as a tangle.
 *
 * Neither is a cosmetic question, which is why these live beside the engine
 * facts rather than in a snapshot.
 */

import { describe, it, expect } from '@jest/globals';
import { getMapDefinition, forwardEdges, createStartingWorld } from '@mechanics';

import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { createAppStore } from '@/state/store';
import { createAppActions } from '@/state/actions';
import {
    selectExplorationViewModel,
    MAP_LEGEND_KEYS,
    MAP_LEGEND_LEFT,
} from '@/state/presenters/exploration.engine';

const freshStore = () => createAppStore({ adapter: createMemoryAdapter(), overrides: { world: createStartingWorld('breakwater') } });

// ---------------------------------------------------------------------------
// SPENT IS NOT SEALED
// ---------------------------------------------------------------------------

/**
 * `isNodeSpent()` is `completedNodes ∪ consumedNodes`, and the two lists are
 * written by different verbs: `completeNode` and `markNodeConsumed`. Mobile
 * exercises both — `moveToAction` completes, `resolveMapEvent`'s follow-up
 * consumes — and a rest / treasure / quest / gathering node resolved without
 * a completion lands in `consumedNodes` alone.
 *
 * Spent nodes are not in the frontier, so a presenter that tested
 * `completedNodes` alone would let such a node match neither `completed` nor
 * `available`, fall through to `locked`, and draw it SEALED — counted in the
 * legend's "N sealed" and announced to a screen reader as sealed — when the
 * player had in fact walked it and answered it.
 */
describe('D1: a consumed node reads as TRODDEN, never as SEALED', () => {
    /** Put `nodeId` in `consumedNodes` ONLY, leaving `completedNodes` alone. */
    const consumeOnly = (store: ReturnType<typeof freshStore>, nodeId: string) => {
        const world = (store.getState() as any).world;
        store.setState({
            world: {
                ...world,
                currentMap: {
                    ...world.currentMap,
                    consumedNodes: [...(world.currentMap.consumedNodes ?? []), nodeId],
                    completedNodes: (world.currentMap.completedNodes as string[])
                        .filter((id: string) => id !== nodeId),
                },
            },
        } as any);
    };

    it('classifies a consumed-but-not-completed node as completed', () => {
        const store = freshStore();
        const actions = createAppActions(store);
        actions.moveTo('bw-w2');

        // bw-w1 is the Breakwater arrival the player has now left behind.
        consumeOnly(store, 'bw-w1');

        const vm = selectExplorationViewModel(store.getState());
        const start = vm.nodes.find((n) => n.id === 'bw-w1');
        expect(start).toBeDefined();
        // THE REGRESSION: this read 'locked' before the spent union landed.
        expect(start!.kind).toBe('completed');
    });

    it('keeps the engine and the screen agreeing on what is still shut', () => {
        const store = freshStore();
        const actions = createAppActions(store);
        actions.moveTo('bw-w2');
        consumeOnly(store, 'bw-w1');

        const vm = selectExplorationViewModel(store.getState());
        // A node the player resolved is not a legal destination, but it is
        // also not sealed — those are different sentences and the chart now
        // draws them differently.
        expect(vm.nodes.filter((n) => n.kind === 'locked').map((n) => n.id)).not.toContain('bw-w1');
        expect(vm.options.map((o) => o.nodeId)).not.toContain('bw-w1');
    });

    it('stops the legend counting a walked node among the sealed', () => {
        const store = freshStore();
        const actions = createAppActions(store);
        actions.moveTo('bw-w2');

        const before = selectExplorationViewModel(store.getState());
        const sealedBefore = before.nodes.filter((n) => n.kind === 'locked').length;

        consumeOnly(store, 'bw-w1');
        const after = selectExplorationViewModel(store.getState());
        const sealedAfter = after.nodes.filter((n) => n.kind === 'locked').length;

        // Resolving a node can only ever REMOVE it from the sealed tally.
        expect(sealedAfter).toBeLessThanOrEqual(sealedBefore);
        // And the counter keeps agreeing with the pips it sits beside (BUG-01).
        expect(after.legend.right).toBe(`${after.nodes.length} nodes · ${sealedAfter} sealed`);
    });

    it('marks a road travelled once BOTH its ends are spent, by either list', () => {
        const store = freshStore();
        const actions = createAppActions(store);
        actions.moveTo('bw-w2');
        // bw-w2 is a fight: winning it completes it (by `completedNodes`);
        // the windmill behind it is spent by `consumedNodes` alone.
        const world = (store.getState() as any).world;
        store.setState({
            world: { ...world, currentMap: { ...world.currentMap, completedNodes: [...world.currentMap.completedNodes, 'bw-w2'] } },
        } as any);
        consumeOnly(store, 'bw-w1');

        const vm = selectExplorationViewModel(store.getState());
        const firstRoad = vm.edges.find(
            (e) => (e.fromId === 'bw-w1' && e.toId === 'bw-w2') || (e.fromId === 'bw-w2' && e.toId === 'bw-w1'),
        );
        expect(firstRoad).toBeDefined();
        expect(firstRoad!.traveled).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// LATERAL LANE RIBS
// ---------------------------------------------------------------------------

/**
 * The Charcoal Wood carries ribs (its columns hold several lanes); the
 * Breakwater carries none (a tree whose every road runs one column deeper).
 * The layer law holds on both, so both are read.
 */
const RIB_MAPS = [
    { mapId: 'charcoal-wood', continent: 'coastal-continent', hasRibs: true },
    { mapId: 'breakwater', continent: 'coastal-continent', hasRibs: false },
] as const;

describe('D1: the chart separates lateral ribs from forward roads', () => {
    for (const { mapId, continent, hasRibs } of RIB_MAPS) {
        describe(mapId, () => {
            const vmEdges = () => selectExplorationViewModel(
                createAppStore({ adapter: createMemoryAdapter(), overrides: { world: createStartingWorld(mapId) } }).getState(),
            ).edges;
            const def = () => getMapDefinition(continent, mapId);

            it(hasRibs ? 'finds ribs and roads on the map' : 'finds roads and no ribs on the map', () => {
                // Guards against the flag silently defaulting one way
                // everywhere, which would make every assertion below vacuous.
                expect(vmEdges().some((e) => e.lateral)).toBe(hasRibs);
                expect(vmEdges().some((e) => !e.lateral)).toBe(true);
            });

            it('calls an edge lateral exactly when the engine does not call it forward', () => {
                const forward = forwardEdges(def());
                const isForward = (a: string, b: string) =>
                    (forward.get(a) ?? []).includes(b) || (forward.get(b) ?? []).includes(a);

                for (const e of vmEdges()) {
                    expect(e.lateral).toBe(!isForward(e.fromId, e.toId));
                }
            });

            it('puts every rib inside ONE column and every road across TWO', () => {
                // The layer law, read off the chart
                // rather than off the engine's own invariant test — if the presenter
                // ever mislabels an edge, the canvas draws a sideways step as
                // progress.
                const columnOf = new Map(def().nodes.map((n) => [n.id, n.location[0]] as const));

                for (const e of vmEdges()) {
                    const a = columnOf.get(e.fromId)!;
                    const b = columnOf.get(e.toId)!;
                    if (e.lateral) expect(a).toBe(b);
                    else expect(Math.abs(a - b)).toBe(1);
                }
            });

            it('draws each edge once, though a rib is authored in both directions', () => {
                // `connectedNodes` carries a rib as two entries. Drawn twice they
                // stack, doubling the ink on exactly the lines meant to be faintest.
                const seen = new Set<string>();
                for (const e of vmEdges()) {
                    const key = [e.fromId, e.toId].sort().join('|');
                    expect(seen.has(key)).toBe(false);
                    seen.add(key);
                }
            });
        });
    }
});

// ---------------------------------------------------------------------------
// owner finding 9 — the legend teaches the three states
// ---------------------------------------------------------------------------

describe('the legend key matches the marks the chart actually draws', () => {
    it('names exactly the three states a player must tell apart', () => {
        expect(MAP_LEGEND_KEYS.map((k) => k.label)).toEqual(['TRODDEN', 'OPEN', 'SEALED']);
    });

    it('retires the ✕ that 23 of 28 nodes wore', () => {
        // The mark is gone from `NodeMark`, so the key must not promise it.
        expect(MAP_LEGEND_LEFT).not.toContain('✕');
        expect(selectExplorationViewModel(freshStore().getState()).legend.left).not.toContain('✕');
    });

    it('gives each state a DIFFERENT glyph, and each glyph a different fill weight', () => {
        const glyphs = MAP_LEGEND_KEYS.map((k) => k.glyph);
        expect(new Set(glyphs).size).toBe(glyphs.length);
        // ● solid mass · ◉ ring with a lit core · ◌ empty broken ring.
        expect(glyphs).toEqual(['●', '◉', '◌']);
    });

    it('keeps FE-008: one word for the shut state, in the key and the counter', () => {
        const vm = selectExplorationViewModel(freshStore().getState());
        expect(vm.legend.left).toContain('SEALED');
        expect(vm.legend.left).not.toContain('SHUT');
        expect(vm.legend.right).toMatch(/sealed/);
    });

    it('builds the strip from the key list, so the two cannot drift apart', () => {
        const vm = selectExplorationViewModel(freshStore().getState());
        expect(vm.legend.left).toBe(MAP_LEGEND_LEFT);
        for (const k of MAP_LEGEND_KEYS) {
            expect(vm.legend.left).toContain(`${k.glyph} ${k.label}`);
        }
    });
});

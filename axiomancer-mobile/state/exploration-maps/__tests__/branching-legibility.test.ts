/**
 * Branching-graph legibility guard — can each map's sheet actually CARRY
 * the graph the engine authored?
 *
 * The parity guard next door answers "does every engine node have a
 * position". It does not answer "are those positions any good". Lateral lane
 * ribs join two nodes that already exist, so parity stays green however many
 * are added, while the number of lines drawn on the sheet grows.
 *
 * A rib between two nodes that sit too close together is a line nobody can
 * see: the node glyph is 44 device px on a canvas spread `sheet.scale` x wider
 * than the sheet, so it covers `NODE_SIZE / sheet.scale` sheet units, and an edge
 * shorter than that is entirely hidden under the two marks it joins. A rib
 * drawn under a node glyph is a branch that was authored and never shown, and
 * the map stops reading as branching.
 *
 * These assertions are derived from the real render constants rather than
 * hard-coded, so shrinking the spread or growing the glyph moves the bar with
 * them instead of quietly invalidating the guard.
 */

import { describe, it, expect } from '@jest/globals';
import { getMapDefinition, forwardEdges } from '@mechanics';

import { NODE_SIZE } from '@/components/exploration/ExplorationNode';
import { getMapLayout } from '../index';

/**
 * How much of a map's sheet ONE node glyph covers, in sheet units.
 *
 * `<ExplorationNode>` draws a `NODE_SIZE`-px mark on `<MapCanvas>`'s spread
 * canvas, which is `sheet.scale`x the sheet — so the mark's footprint here is
 * the quotient. Two glyphs closer together than this overlap outright. Per
 * map, because each layout declares its own sheet.
 */
function glyphDiameter(mapId: string): number {
    return NODE_SIZE / getMapLayout(mapId)!.sheet.scale;
}

const MAPS = [
    // Act 1's four maps, on the 1000×1000 plate sheet.
    { mapId: 'breakwater', continent: 'coastal-continent' },
    { mapId: 'charcoal-wood', continent: 'coastal-continent' },
    { mapId: 'beacon-crags', continent: 'northern-continent' },
    { mapId: 'lantern-deep', continent: 'northern-continent' },
] as const;

interface DrawnEdge { a: string; b: string; lateral: boolean; length: number; }

/** Every edge the canvas actually draws for a map, de-duplicated and measured. */
function drawnEdges(continent: string, mapId: string): DrawnEdge[] {
    const def = getMapDefinition(continent as never, mapId as never);
    const layout = getMapLayout(mapId);
    if (!layout) throw new Error(`no layout for ${mapId}`);
    const pos = new Map(layout.nodes.map((n) => [n.id, { x: n.x, y: n.y }] as const));
    const forward = forwardEdges(def);
    const isForward = (a: string, b: string) =>
        (forward.get(a) ?? []).includes(b) || (forward.get(b) ?? []).includes(a);

    const out: DrawnEdge[] = [];
    const seen = new Set<string>();
    for (const node of def.nodes) {
        for (const target of node.connectedNodes) {
            const key = [node.id, target].sort().join('|');
            if (seen.has(key)) continue;
            seen.add(key);
            const A = pos.get(node.id);
            const B = pos.get(target);
            if (!A || !B) continue; // parity guard owns this failure mode
            out.push({
                a: node.id,
                b: target,
                lateral: !isForward(node.id, target),
                length: Math.hypot(A.x - B.x, A.y - B.y),
            });
        }
    }
    return out;
}

describe('exploration map: the sheet can carry the branching graph', () => {
    for (const { mapId, continent } of MAPS) {
        describe(mapId, () => {
            it('gives every node its own position — two nodes never share one mark', () => {
                const layout = getMapLayout(mapId)!;
                const byPos = new Map<string, string[]>();
                for (const n of layout.nodes) {
                    const key = `${n.x},${n.y}`;
                    byPos.set(key, [...(byPos.get(key) ?? []), n.id]);
                }
                const collisions = [...byPos.entries()].filter(([, ids]) => ids.length > 1);
                expect(collisions).toEqual([]);
            });

            it('keeps every node on the sheet', () => {
                // A node outside the viewBox is only reachable by panning to a
                // place nothing tells the player about.
                const { nodes, sheet } = getMapLayout(mapId)!;
                for (const n of nodes) {
                    expect(n.x).toBeGreaterThanOrEqual(0);
                    expect(n.x).toBeLessThanOrEqual(sheet.width);
                    expect(n.y).toBeGreaterThanOrEqual(0);
                    expect(n.y).toBeLessThanOrEqual(sheet.height);
                }
            });

            it('draws no edge shorter than the glyphs at its ends', () => {
                // The bar a branch has to clear to be a branch on screen.
                const glyph = glyphDiameter(mapId);
                const tooShort = drawnEdges(continent, mapId)
                    .filter((e) => e.length <= glyph)
                    .map((e) => `${e.a}|${e.b} (${e.length.toFixed(1)} < ${glyph.toFixed(1)})`);
                // Named, so a failure says WHICH pair sits on top of itself.
                expect(tooShort).toEqual([]);
            });

            it('draws every lateral rib D1 authored, once and visibly', () => {
                const edges = drawnEdges(continent, mapId);
                const ribs = edges.filter((e) => e.lateral);
                // Every shipped gauntlet map has at least one multi-lane
                // column, so every one of them gained ribs. A map with none
                // means either the ribs were lost or the forward-skeleton
                // read is wrong — both silent on screen.
                expect(ribs.length).toBeGreaterThan(0);
                for (const r of ribs) expect(r.length).toBeGreaterThan(glyphDiameter(mapId));
            });
        });
    }

    it('accounts for all 37 ribs: 3 on the Breakwater, 13 on the Charcoal Wood, 10 on the Beacon Crags, 11 on the Lantern Deep', () => {
        // A total, not a per-map count: this is the one number that catches a
        // whole map's ribs disappearing in a refactor of the forward-skeleton
        // read, which no per-map "> 0" assertion would notice.
        const total = MAPS.reduce(
            (n, m) => n + drawnEdges(m.continent, m.mapId).filter((e) => e.lateral).length,
            0,
        );
        // The Breakwater's open fan carries 1 + 1 + 1 (the pass and the cove,
        // the wreck and the harbour town, the chapel and the hamlet): its
        // pockets hang off their quest markers and carry none (QL1d).
        // The Charcoal Wood's four carry 4 + 3 + 3 + 3.
        // The Beacon Crags' four bands carry 2 + 2 + 2 + 4.
        // The Lantern Deep's four bands carry 3 + 3 + 2 + 3.
        // Each map's door fight stands alone in its column and carries none.
        expect(total).toBe(3 + 13 + 10 + 11);
    });
});

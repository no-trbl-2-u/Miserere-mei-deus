/**
 * The Charcoal Wood — Act 1, map 2.
 *
 * Pins the second Act 1 map:
 * - the Breakwater's river bridge leads here, and this map's stair cave leads
 *   on into the Beacon Crags;
 * - the map borrows the shipped builders, the northern forest's roster and
 *   its materials, with one authored event on every node and one
 *   Anvil near its exit;
 * - the forest roster is level 9 and up, so every fight here is pinned low.
 *
 * The generic gauntlet invariants (no strands, column law, ribs, distinct
 * coordinates) run over this map in `map-traversal.engine.test.ts` like every
 * other registered map. The layout pins live in mobile, where the landmarks
 * and the sheet are.
 */

import { describe, expect, it } from 'vitest';

import { getMapDefinition, createMapState, resolveMapEvent, getNodeEventPool } from '../index';
import { auditMapTraversal } from '../world.reducer';
import { createNewGameState } from '../../Game/game.reducer';
import { EnemiesByMap } from '../../Enemy/enemy.library';
import type { GameState } from '../../Game/types';

const charcoalWood = getMapDefinition('coastal-continent', 'charcoal-wood');
const breakwater = getMapDefinition('coastal-continent', 'breakwater');

/** A fresh game standing on `nodeId` of `map`. */
function standingOn(map: typeof charcoalWood, nodeId: string): GameState {
    const base = createNewGameState();
    return {
        ...base,
        world: {
            ...base.world,
            currentMap: { ...createMapState(map), currentNode: nodeId },
        },
    };
}

describe('the Charcoal Wood map', () => {
    it('carries one node per landmark on the forest plate (D25: 20)', () => {
        expect(charcoalWood.nodes).toHaveLength(20);
        expect(charcoalWood.nodes.map(n => n.id)).toEqual(
            Array.from({ length: 20 }, (_, i) => `cw-${i + 1}`),
        );
    });

    it('ends every run at the stair cave', () => {
        const audit = auditMapTraversal(charcoalWood);
        expect(audit.strands).toEqual([]);
        expect(audit.terminalNodes).toEqual(['cw-20']);
    });

    it('draws the Act 1 pool (D61)', () => {
        expect(EnemiesByMap['charcoal-wood']).toBe(EnemiesByMap['breakwater']);
    });
});

describe('the Charcoal Wood\'s events (D29)', () => {
    const kinds = Object.fromEntries(
        charcoalWood.nodes.map(n => [n.id, resolveMapEvent(standingOn(charcoalWood, n.id)).event.kind]),
    );
    /** Each node's authored payload (every Charcoal Wood pool has one entry). */
    const payloads = charcoalWood.nodes.map(
        n => getNodeEventPool('coastal-continent', 'charcoal-wood', n.id)!.entries[0]!.payload,
    );

    it('resolves an authored event on every node', () => {
        expect(Object.values(kinds)).not.toContain('empty');
        expect(Object.keys(kinds)).toHaveLength(20);
    });

    it('spreads 7 encounters, 3 rests, 3 loot caches, 3 gatherings, 1 hazard, 1 Anvil, an arrival and a door', () => {
        const tally: Record<string, number> = {};
        for (const k of Object.values(kinds)) tally[k] = (tally[k] ?? 0) + 1;
        expect(tally).toEqual({
            encounter: 7, rest: 3, 'loot-cache': 3, gathering: 3, hazard: 1, blacksmith: 1, cutscene: 1, travel: 1,
        });
    });

    it('keeps its Anvil at the well, cw-18 (D61, R3b)', () => {
        expect(kinds['cw-18']).toBe('blacksmith');
    });

    it('opens on the arrival over the river bridge', () => {
        expect(kinds['cw-1']).toBe('cutscene');
    });

    it('pins every fight to a low level, never above the Act 1 door fight\'s level (3)', () => {
        const fights = payloads.filter(p => p.kind === 'encounter');
        expect(fights).toHaveLength(7);
        for (const payload of fights) {
            if (payload.kind !== 'encounter') continue;
            expect(payload.enemySlug).toBeDefined();
            expect(payload.level).toBeGreaterThanOrEqual(2);
            expect(payload.level).toBeLessThanOrEqual(3);
        }
    });

    it('gathers only the northern forest\'s own materials', () => {
        const items = payloads.flatMap(p => (p.kind === 'gathering' ? p.items.map(i => i.id) : []));
        expect(items.sort()).toEqual(['dark-berries', 'moonbell-petals', 'oak-branch']);
    });

    it('goes down the stair cave into the Beacon Crags, on the northern continent (Act 1, map 3)', () => {
        const r = resolveMapEvent(standingOn(charcoalWood, 'cw-20'));
        expect(r.event.kind).toBe('travel');
        expect(r.state.world.currentContinent.name).toBe('northern-continent');
        expect(r.state.world.currentMap.name).toBe('beacon-crags');
        expect(r.state.world.currentMap.currentNode).toBe('bc-1');
    });
});

describe('the Act 1 chain so far', () => {
    it('crosses the Breakwater\'s river bridge into the Charcoal Wood, at the bridge end', () => {
        const r = resolveMapEvent(standingOn(breakwater, 'bw-18'));
        expect(r.event.kind).toBe('travel');
        expect(r.state.world.currentMap.name).toBe('charcoal-wood');
        expect(r.state.world.currentMap.currentNode).toBe('cw-1');
    });
});

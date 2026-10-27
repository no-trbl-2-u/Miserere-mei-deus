/**
 * The Beacon Crags — Act 1, map 3.
 *
 * Pins the third Act 1 map:
 * - the first Act 1 map on `northern-continent`: the Charcoal Wood's
 *   stair cave crosses into it, and this map's glacier shrine leads on down
 *   into the Lantern Deep;
 * - the map borrows the shipped builders, the caverns' roster and its iron,
 *   with one authored event on every node;
 * - the caverns' roster is level 13 and up, so every fight here is pinned low.
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
import { EnemiesByMap, EnemyLibrary } from '../../Enemy/enemy.library';
import type { GameState } from '../../Game/types';

const beaconCrags = getMapDefinition('northern-continent', 'beacon-crags');

/** A fresh game standing on `nodeId` of the Beacon Crags. */
function standingOn(nodeId: string): GameState {
    const base = createNewGameState({ startMap: 'beacon-crags' });
    return {
        ...base,
        world: {
            ...base.world,
            currentMap: { ...createMapState(beaconCrags), currentNode: nodeId },
        },
    };
}

describe('the Beacon Crags map', () => {
    it('carries one node per landmark on the mountain plate (D25: 17)', () => {
        expect(beaconCrags.nodes).toHaveLength(17);
        expect(beaconCrags.nodes.map(n => n.id)).toEqual(
            Array.from({ length: 17 }, (_, i) => `bc-${i + 1}`),
        );
    });

    it('sits on the northern continent (D28)', () => {
        expect(beaconCrags.continent).toBe('northern-continent');
    });

    it('ends every run at the glacier shrine', () => {
        const audit = auditMapTraversal(beaconCrags);
        expect(audit.strands).toEqual([]);
        expect(audit.unreachableNodes).toEqual([]);
        expect(audit.terminalNodes).toEqual(['bc-17']);
    });

    it('draws the Act 1 pool (D61)', () => {
        expect(EnemiesByMap['beacon-crags']).toBe(EnemiesByMap['breakwater']);
    });
});

describe('the Beacon Crags\' events (D29)', () => {
    const kinds = Object.fromEntries(
        beaconCrags.nodes.map(n => [n.id, resolveMapEvent(standingOn(n.id)).event.kind]),
    );
    /** Each node's authored payload (every Beacon Crags pool has one entry). */
    const payloads = beaconCrags.nodes.map(
        n => getNodeEventPool('northern-continent', 'beacon-crags', n.id)!.entries[0]!.payload,
    );

    it('resolves an authored event on every node', () => {
        expect(Object.values(kinds)).not.toContain('empty');
        expect(Object.keys(kinds)).toHaveLength(17);
    });

    it('spreads 6 encounters, 3 rests, 2 loot caches, 1 gathering, 2 hazards, 1 Anvil, an arrival and a door', () => {
        const tally: Record<string, number> = {};
        for (const k of Object.values(kinds)) tally[k] = (tally[k] ?? 0) + 1;
        expect(tally).toEqual({
            encounter: 6, rest: 3, 'loot-cache': 2, gathering: 1, hazard: 2, blacksmith: 1, cutscene: 1, travel: 1,
        });
    });

    it('keeps its Anvil at the falls, bc-12 (D61, R3b)', () => {
        expect(kinds['bc-12']).toBe('blacksmith');
    });

    it('opens on the arrival up the stair, at the top pass', () => {
        expect(kinds['bc-1']).toBe('cutscene');
    });

    it('pins every fight low: 3 on the upper mountain, 4 below the gorge', () => {
        const fights = payloads.filter(p => p.kind === 'encounter');
        expect(fights).toHaveLength(6);
        for (const payload of fights) {
            if (payload.kind !== 'encounter') continue;
            expect(payload.enemySlug).toBeDefined();
            expect(EnemyLibrary.map(e => e.portraitAsset)).toContain(payload.enemySlug);
            expect(payload.level).toBeGreaterThanOrEqual(3);
            expect(payload.level).toBeLessThanOrEqual(4);
        }
    });

    it('rests only in camps: the mountain has no settlement inn (Phase 52b)', () => {
        const shelters = payloads.flatMap(p => (p.kind === 'rest' ? [p.shelter] : []));
        expect(shelters).toEqual(['camp', 'camp', 'camp']);
    });

    it('gathers only the caverns\' own iron', () => {
        const items = payloads.flatMap(p => (p.kind === 'gathering' ? p.items.map(i => i.id) : []));
        expect(items).toEqual(['iron-ore']);
    });

    it('goes down under the glacier shrine into the Lantern Deep (Act 1, map 4)', () => {
        const r = resolveMapEvent(standingOn('bc-17'));
        expect(r.event.kind).toBe('travel');
        expect(r.state.world.currentContinent.name).toBe('northern-continent');
        expect(r.state.world.currentMap.name).toBe('lantern-deep');
        expect(r.state.world.currentMap.currentNode).toBe('ld-1');
    });
});

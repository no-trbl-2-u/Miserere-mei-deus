/**
 * The Lantern Deep — Act 1, map 4.
 *
 * Pins the last Act 1 map:
 * - on `northern-continent`: the Beacon Crags' glacier shrine goes down
 *   into it, and this map's deep stair is sealed: there
 *   is no end-of-run state;
 * - the map borrows the shipped builders, the caverns' roster and its iron,
 *   with one authored event on every node;
 * - the caverns' roster is level 13 and up, so every fight here is pinned low;
 * - the vault door (`ld-15`) is the Labyrinth's; the Labyrinth is parked,
 *   so the door is sealed and never opens in play.
 *
 * The generic gauntlet invariants (no strands, column law, ribs, distinct
 * coordinates) run over this map in `map-traversal.engine.test.ts` like every
 * other registered map. The layout pins live in mobile, where the landmarks
 * and the sheet are.
 */

import { describe, expect, it } from 'vitest';

import {
    getMapDefinition, createMapState, resolveMapEvent, getNodeEventPool,
} from '../index';
import { auditMapTraversal } from '../world.reducer';
import { createNewGameState } from '../../Game/game.reducer';
import { EnemiesByMap, EnemyLibrary } from '../../Enemy/enemy.library';
import type { GameState } from '../../Game/types';

const lanternDeep = getMapDefinition('northern-continent', 'lantern-deep');

/** A fresh game standing on `nodeId` of the Lantern Deep. */
function standingOn(nodeId: string): GameState {
    const base = createNewGameState({ startMap: 'lantern-deep' });
    return {
        ...base,
        world: {
            ...base.world,
            currentMap: { ...createMapState(lanternDeep), currentNode: nodeId },
        },
    };
}

describe('the Lantern Deep map', () => {
    it('carries one node per landmark on the underworld plate (D25: 18)', () => {
        expect(lanternDeep.nodes).toHaveLength(18);
        expect(lanternDeep.nodes.map(n => n.id)).toEqual(
            Array.from({ length: 18 }, (_, i) => `ld-${i + 1}`),
        );
    });

    it('sits on the northern continent (D28)', () => {
        expect(lanternDeep.continent).toBe('northern-continent');
    });

    it('ends every run at the deep stair', () => {
        const audit = auditMapTraversal(lanternDeep);
        expect(audit.strands).toEqual([]);
        expect(audit.unreachableNodes).toEqual([]);
        expect(audit.terminalNodes).toEqual(['ld-18']);
    });

    it('draws the Act 1 pool (D61)', () => {
        expect(EnemiesByMap['lantern-deep']).toBe(EnemiesByMap['breakwater']);
    });
});

describe('the Lantern Deep\'s events (D29)', () => {
    const kinds = Object.fromEntries(
        lanternDeep.nodes.map(n => [n.id, resolveMapEvent(standingOn(n.id)).event.kind]),
    );
    /** Each node's authored payload (every Lantern Deep pool has one entry). */
    const payloads = lanternDeep.nodes.map(
        n => getNodeEventPool('northern-continent', 'lantern-deep', n.id)!.entries[0]!.payload,
    );

    it('resolves an authored event on every node', () => {
        expect(Object.values(kinds)).not.toContain('empty');
        expect(Object.keys(kinds)).toHaveLength(18);
    });

    it('spreads 7 encounters, 3 rests, a loot cache, 1 gathering, 2 hazards, 1 Anvil, an arrival and two sealed doors', () => {
        const tally: Record<string, number> = {};
        for (const k of Object.values(kinds)) tally[k] = (tally[k] ?? 0) + 1;
        expect(tally).toEqual({
            encounter: 7, rest: 3, 'loot-cache': 1, gathering: 1, hazard: 2, blacksmith: 1, cutscene: 3,
        });
    });

    it('keeps its Anvil at the forge landmark, ld-14 (D61, R3b)', () => {
        expect(kinds['ld-14']).toBe('blacksmith');
    });

    it('opens on the arrival down the stair, at the surface stair (D31)', () => {
        expect(kinds['ld-1']).toBe('cutscene');
    });

    it('pins every fight low: 3 above the aqueducts, 4 below them', () => {
        const fights = payloads.filter(p => p.kind === 'encounter');
        expect(fights).toHaveLength(7);
        for (const payload of fights) {
            if (payload.kind !== 'encounter') continue;
            expect(payload.enemySlug).toBeDefined();
            expect(EnemyLibrary.map(e => e.portraitAsset)).toContain(payload.enemySlug);
            expect(payload.level).toBeGreaterThanOrEqual(3);
            expect(payload.level).toBeLessThanOrEqual(4);
        }
    });

    it('rests only in camps: the deep has no settlement inn (Phase 52b)', () => {
        const shelters = payloads.flatMap(p => (p.kind === 'rest' ? [p.shelter] : []));
        expect(shelters).toEqual(['camp', 'camp', 'camp']);
    });

    it('gathers only the caverns\' own iron', () => {
        const items = payloads.flatMap(p => (p.kind === 'gathering' ? p.items.map(i => i.id) : []));
        expect(items).toEqual(['iron-ore']);
    });

    it('seals the vault door: the Labyrinth never opens in play (THE REVAMP R3a, D54)', () => {
        const r = resolveMapEvent(standingOn('ld-15'));
        expect(r.event).toEqual({ kind: 'cutscene', lines: ['The round door is sealed.'] });
        expect(r.state.world.currentMap.name).toBe('lantern-deep');
        expect(r.state.world.currentMap.currentNode).toBe('ld-15');
    });

    it('keeps the way on open past the sealed vault door', () => {
        const r = resolveMapEvent(standingOn('ld-15'));
        for (const next of ['ld-16', 'ld-17']) {
            expect(r.state.world.currentMap.availableNodes).toContain(next);
        }
    });

    it('seals the deep stair: it leads nowhere and the map stays put (D61)', () => {
        const r = resolveMapEvent(standingOn('ld-18'));
        expect(r.event).toEqual({ kind: 'cutscene', lines: ['The deep stair is sealed.'] });
        expect(r.state.world.currentContinent.name).toBe('northern-continent');
        expect(r.state.world.currentMap.name).toBe('lantern-deep');
        expect(r.state.world.currentMap.currentNode).toBe('ld-18');
    });
});

describe('Act 1 is the whole world (THE REVAMP R3a, D53)', () => {
    const ACT1 = [
        ['coastal-continent', 'breakwater'],
        ['coastal-continent', 'charcoal-wood'],
        ['northern-continent', 'beacon-crags'],
        ['northern-continent', 'lantern-deep'],
    ] as const;

    it('no Act 1 door leads off Act 1, and none opens the Labyrinth', () => {
        const act1Names: readonly string[] = ACT1.map(([, m]) => m);
        for (const [continent, map] of ACT1) {
            for (const node of getMapDefinition(continent, map).nodes) {
                const pool = getNodeEventPool(continent, map, node.id);
                for (const entry of pool?.entries ?? []) {
                    expect(entry.kind, `${node.id}`).not.toBe('labyrinth');
                    if (entry.payload.kind === 'travel') {
                        expect(act1Names, `${node.id}`).toContain(entry.payload.destinationMap);
                    }
                }
            }
        }
    });
});

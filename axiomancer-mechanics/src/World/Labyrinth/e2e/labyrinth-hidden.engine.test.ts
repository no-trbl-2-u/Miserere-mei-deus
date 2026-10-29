/**
 * The labyrinth, kept and hidden — hermetic coverage (phase NK1a, A4 and A5).
 *
 * "Hidden" means no overworld map places a `labyrinth` door: every map on
 * every continent but the Aporia's own is checked node by node, so a door
 * added to any map, today's or a later chapter's, fails here. The Aporia
 * itself is kept whole; only its pools moved onto kept kinds: the Sophist's
 * lines are `cutscene` lines (words verbatim) and the act's material is a
 * `loot-cache` item.
 */

import { describe, expect, it } from 'vitest';

import { MAP_REGISTRY } from '../../map.registry';
import type { ContinentName } from '../../map.library';
import { getNodeEventPool } from '../../MapEvents/resolve-map-event';
import type { MapEventKind } from '../../MapEvents/types';
import { APORIA_ACTS } from '../maps';
import '../../MapEvents/content';
import '../labyrinth.pools';

const LABYRINTH_CONTINENT: ContinentName = 'labyrinth-continent';

const overworld = (Object.keys(MAP_REGISTRY) as ContinentName[])
    .filter(c => c !== LABYRINTH_CONTINENT)
    .flatMap(continent => Object.values(MAP_REGISTRY[continent]).flatMap(def => (def ? [{ continent, def }] : [])));

describe('the labyrinth door is on no overworld map (A5)', () => {
    it('checks every overworld map', () => {
        expect(overworld.map(m => m.def.name)).toEqual(
            expect.arrayContaining(['breakwater', 'charcoal-wood', 'beacon-crags', 'lantern-deep']),
        );
    });

    it.each(overworld.map(m => [m.def.name, m] as const))('%s places no labyrinth door', (_name, { continent, def }) => {
        for (const node of def.nodes) {
            const kinds = (getNodeEventPool(continent, def.name, node.id)?.entries ?? []).map(e => e.kind);
            expect(kinds, `${def.name} ${node.id}`).not.toContain('labyrinth');
        }
    });

    it('the Aporia is still registered, so /dev can enter it', () => {
        for (const act of APORIA_ACTS) expect(MAP_REGISTRY[LABYRINTH_CONTINENT][act.mapName]).toBeDefined();
    });
});

describe("the labyrinth's pools use only kept kinds (A4)", () => {
    const ROOM_KINDS: readonly MapEventKind[] = ['encounter', 'hazard', 'loot-cache', 'rest', 'cutscene'];

    for (const act of APORIA_ACTS) {
        describe(act.mapName, () => {
            const pools = act.rooms.map(room => ({ room, pool: getNodeEventPool(LABYRINTH_CONTINENT, act.mapName, room.nodeId) }));

            it('every room rolls a pool of kept kinds', () => {
                for (const { room, pool } of pools) {
                    expect(pool, room.nodeId).toBeDefined();
                    for (const entry of pool!.entries) expect(ROOM_KINDS, `${room.nodeId} ${entry.kind}`).toContain(entry.kind);
                }
            });

            it("the random pool keeps the act's material as a one-item loot cache and its vignette as a cutscene", () => {
                const plain = pools.find(p => p.pool?.id === `${act.mapName}.default`)!.pool!;
                const material = plain.entries.filter(e => e.payload.kind === 'loot-cache' && (e.payload.items?.length ?? 0) > 0);
                expect(material).toHaveLength(1);
                const item = material[0]!.payload.kind === 'loot-cache' ? material[0]!.payload.items![0]! : undefined;
                expect(item).toMatchObject({ category: 'material', quantity: 1 });
                const vignette = plain.entries.filter(e => e.kind === 'cutscene');
                expect(vignette).toHaveLength(1);
            });

            it("the quest room plays the Sophist's line verbatim as a cutscene", () => {
                const room = act.rooms.find(r => r.nodeId === act.questRoom)!;
                const pool = getNodeEventPool(LABYRINTH_CONTINENT, act.mapName, room.nodeId)!;
                expect(pool.entries.map(e => e.payload)).toEqual([{ kind: 'cutscene', lines: [room.narration] }]);
            });

            it('the entry, the gates and the Oubliette play their lines verbatim as cutscenes (a waystone rests instead)', () => {
                const scripted = act.rooms.filter(r => !r.waystone && r.nodeId !== act.bossRoom
                    && (r.nodeId === act.entry || r.eject || act.gates.some(g => g.roomId === r.nodeId)));
                expect(scripted.length).toBeGreaterThan(0);
                for (const room of scripted) {
                    const pool = getNodeEventPool(LABYRINTH_CONTINENT, act.mapName, room.nodeId)!;
                    expect(pool.entries.map(e => e.payload), room.nodeId).toEqual([{ kind: 'cutscene', lines: [room.narration] }]);
                }
            });
        });
    }
});

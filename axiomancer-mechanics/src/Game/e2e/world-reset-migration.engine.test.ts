/**
 * Hermetic engine test — the v27 → v28 hop: the world reset.
 *
 * The world is Act 1: the Lantern Deep's deep stair and the Labyrinth's vault
 * door are sealed and the northern maps are parked. A v27 save may stand on
 * fishing-village, a parked map or inside the Labyrinth. The hop moves it
 * onto the Lantern Deep (`ld-15` from the Labyrinth, `ld-18` otherwise); an
 * Act 1 save passes through with only its version stamped.
 *
 * Also the v28 → v29 hop: the purge of fishing-village and the
 * village goodwill system. It drops `mapGoodwill` and the goodwill bonus
 * flags, takes fishing-village out of every continent list and `mapStates`,
 * and drops the map's two quests. fishing-village is gone from the map
 * registry, so saves standing on it are built by hand (`v27OnFishingVillage`).
 */

import { describe, it, expect } from 'vitest';
import { migrate } from '../game.migrate';
import { createNewGameState, GAME_STATE_VERSION } from '../game.reducer';
import { createMapState, getMapDefinition } from '../../World/map.registry';
import { createLabyrinthProgress } from '../../World';
import type { MapName } from '../../World/map.library';
import type { GameState } from '../types';

/** A v27 save standing on `map`'s starting node. */
function v27On(map: MapName): Record<string, unknown> {
    return { ...createNewGameState({ startMap: map }), version: 27 };
}

/** A v27 save inside the Labyrinth, entered from the vault door. */
function v27InLabyrinth(withReturn: boolean): Record<string, unknown> {
    const outside = createNewGameState({ startMap: 'lantern-deep' });
    const returnWorld = {
        ...outside.world,
        currentMap: { ...outside.world.currentMap, currentNode: 'ld-15', completedNodes: ['ld-1', 'ld-3'] },
    };
    const inside = createMapState(getMapDefinition('labyrinth-continent', 'aporia-colonnade'));
    return {
        ...outside,
        version: 27,
        world: { ...outside.world, currentMap: inside },
        labyrinth: withReturn ? { ...createLabyrinthProgress(), returnWorld } : createLabyrinthProgress(),
    };
}

/**
 * A v27 save standing on the start node of a map that has left the registry
 * (fishing-village, the parked northern maps). Its MapState is
 * hand-built from the Breakwater's shape with the map name and node prefix a
 * pre-v28 save carried.
 */
function v27OnLegacyMap(name: string, prefix: string): Record<string, unknown> {
    const fresh = createNewGameState({ startMap: 'breakwater' });
    const re = (ids: string[]): string[] => ids.map(id => id.replace(/^bw-/, `${prefix}-`));
    const bw = fresh.world.currentMap;
    const legacyMap = {
        ...bw,
        name,
        currentNode: `${prefix}-1`,
        completedNodes: re(bw.completedNodes),
        availableNodes: re(bw.availableNodes),
        lockedNodes: re(bw.lockedNodes),
        discoveredNodes: re(bw.discoveredNodes),
    };
    const coastal = {
        ...fresh.world.currentContinent,
        availableMaps: [name, ...fresh.world.currentContinent.availableMaps],
    };
    return {
        ...fresh,
        version: 27,
        world: {
            ...fresh.world,
            currentContinent: coastal,
            world: fresh.world.world.map(c => (c.name === coastal.name ? coastal : c)),
            currentMap: legacyMap,
        },
    };
}

const v27OnFishingVillage = (): Record<string, unknown> => v27OnLegacyMap('fishing-village', 'fv');

const hop = (raw: Record<string, unknown>): GameState => migrate(raw, 27, 28);

describe('migrate v27 → v28 (THE REVAMP R3a / D53, D54, D61)', () => {
    it('lands at the current version', () => {
        expect(GAME_STATE_VERSION).toBeGreaterThanOrEqual(28);
        expect(hop(v27On('breakwater')).version).toBe(28);
    });

    it('leaves an Act 1 save where it stands', () => {
        const raw = v27On('charcoal-wood');
        const migrated = hop(raw);
        expect(migrated.world).toEqual(raw.world);
    });

    it('moves a fishing-village save onto the sealed deep stair', () => {
        const migrated = hop({ ...v27OnFishingVillage(), currentEncounter: { origin: 'fv-2', enemies: [] } });
        expect(migrated.world.currentMap.name).toBe('lantern-deep');
        expect(migrated.world.currentMap.currentNode).toBe('ld-18');
        expect(migrated.world.currentContinent.name).toBe('northern-continent');
        expect(migrated.world.currentMap.pendingArrival).toBeNull();
        expect(migrated.currentEncounter).toBeUndefined();
        // The departed map is preserved like any travel, not lost.
        expect((migrated.world.mapStates as Record<string, { name: string }> | undefined)?.['fishing-village']?.name)
            .toBe('fishing-village');
    });

    it('moves a save on a parked map onto the sealed deep stair', () => {
        for (const [map, prefix] of [['northern-forest', 'nf'], ['caverns', 'nc'], ['the-capital', 'cap']] as const) {
            const migrated = hop(v27OnLegacyMap(map, prefix));
            expect(migrated.world.currentMap.name).toBe('lantern-deep');
            expect(migrated.world.currentMap.currentNode).toBe('ld-18');
        }
    });

    it('reuses the save\'s own Lantern Deep state when it has one', () => {
        const raw = v27OnFishingVillage();
        const world = raw.world as GameState['world'];
        const deep = { ...createMapState(getMapDefinition('northern-continent', 'lantern-deep')), completedNodes: ['ld-3'] };
        const migrated = hop({ ...raw, world: { ...world, mapStates: { 'lantern-deep': deep } } });
        expect(migrated.world.currentMap.completedNodes).toContain('ld-3');
        expect(migrated.world.mapStates?.['lantern-deep']).toBeUndefined();
    });

    it('returns a Labyrinth save to the sealed vault door, from its return world', () => {
        const migrated = hop(v27InLabyrinth(true));
        expect(migrated.world.currentMap.name).toBe('lantern-deep');
        expect(migrated.world.currentMap.currentNode).toBe('ld-15');
        expect(migrated.world.currentMap.completedNodes).toContain('ld-3');
        expect(migrated.labyrinth).toBeDefined();
        expect(migrated.labyrinth).not.toHaveProperty('returnWorld');
    });

    it('returns a Labyrinth save with no return world to the vault door too', () => {
        const migrated = hop(v27InLabyrinth(false));
        expect(migrated.world.currentMap.name).toBe('lantern-deep');
        expect(migrated.world.currentMap.currentNode).toBe('ld-15');
        expect(migrated.world.mapStates?.['aporia-colonnade']).toBeUndefined();
    });

    it('is idempotent', () => {
        const once = hop(v27OnFishingVillage());
        const twice = migrate({ ...once, version: 27 }, 27, 28);
        expect(twice.world).toEqual(once.world);
    });
});

/** A raw quest-log entry (the purged quests are no longer `QuestName`s). */
function rawQuest(name: string, mapName: string): Record<string, unknown> {
    return { name, description: name, mapName, objectives: [], reward: {}, status: 'active' };
}

/** A v28 save still carrying every fishing-village / goodwill remnant v29 purges. */
function v28WithVillageRemnants(): Record<string, unknown> {
    const fresh = createNewGameState({ startMap: 'breakwater' });
    const withVillage = (c: GameState['world']['currentContinent']) => (c.name === 'coastal-continent'
        ? {
            ...c,
            availableMaps: ['fishing-village', ...c.availableMaps],
            lockedMaps: ['fishing-village', ...c.lockedMaps],
            completedMaps: ['fishing-village', ...c.completedMaps],
        }
        : c);
    const legacyMapState = { ...fresh.world.currentMap, name: 'fishing-village', currentNode: 'fv-1' };
    const deep = createMapState(getMapDefinition('northern-continent', 'lantern-deep'));
    return {
        ...fresh,
        version: 28,
        mapGoodwill: { 'fishing-village': 3 },
        flags: ['village-goodwill-bonus:fishing-village', 'befriended-green-jelly', 'village-goodwill-bonus:breakwater'],
        world: {
            ...fresh.world,
            currentContinent: withVillage(fresh.world.currentContinent),
            world: fresh.world.world.map(withVillage),
            mapStates: { 'fishing-village': legacyMapState, 'lantern-deep': deep },
        },
        quests: {
            available: [rawQuest('get-to-forest', 'fishing-village'), rawQuest('get-to-cave', 'northern-forest')],
            active: [rawQuest('starting-quest', 'fishing-village'), rawQuest('gather-wood', 'northern-forest')],
            completed: ['starting-quest', 'gather-wood'],
        },
    };
}

const hop29 = (raw: Record<string, unknown>): GameState => migrate(raw, 28, 29);

describe('migrate v28 → v29 (THE REVAMP R3b / D53: fishing-village + goodwill purge)', () => {
    it('lands at the current version', () => {
        expect(GAME_STATE_VERSION).toBeGreaterThanOrEqual(29);
        expect(hop29(v28WithVillageRemnants()).version).toBe(29);
    });

    it('drops the mapGoodwill slice', () => {
        expect(hop29(v28WithVillageRemnants())).not.toHaveProperty('mapGoodwill');
    });

    it('strips the goodwill bonus flags and keeps every other flag', () => {
        expect(hop29(v28WithVillageRemnants()).flags).toEqual(['befriended-green-jelly']);
    });

    it('takes fishing-village out of every continent list and out of mapStates', () => {
        const migrated = hop29(v28WithVillageRemnants());
        for (const c of [migrated.world.currentContinent, ...migrated.world.world]) {
            expect(c.availableMaps as string[]).not.toContain('fishing-village');
            expect(c.lockedMaps as string[]).not.toContain('fishing-village');
            expect(c.completedMaps as string[]).not.toContain('fishing-village');
        }
        const coastal = migrated.world.world.find(c => c.name === 'coastal-continent')!;
        expect(coastal.availableMaps).toContain('breakwater');
        expect(migrated.world.mapStates).not.toHaveProperty('fishing-village');
        expect(migrated.world.mapStates?.['lantern-deep']?.name).toBe('lantern-deep');
        // The save's position is untouched (v28 already moved it off the village).
        expect(migrated.world.currentMap).toEqual((v28WithVillageRemnants().world as GameState['world']).currentMap);
    });

    it('drops starting-quest and get-to-forest from the quest log and keeps the rest', () => {
        const { quests } = hop29(v28WithVillageRemnants());
        expect(quests.available.map(q => q.name)).toEqual(['get-to-cave']);
        expect(quests.active.map(q => q.name)).toEqual(['gather-wood']);
        expect(quests.completed).toEqual(['gather-wood']);
    });

    it('is idempotent', () => {
        const once = hop29(v28WithVillageRemnants());
        const twice = migrate({ ...once, version: 28 }, 28, 29);
        expect(twice).toEqual(once);
    });

    it('chains a v27 save standing on fishing-village through v28 and v29 onto the Lantern Deep', () => {
        const raw = v27OnFishingVillage();
        raw.mapGoodwill = { 'fishing-village': 2 };
        const migrated = migrate(raw, 27, 29);
        expect(migrated.version).toBe(29);
        expect(migrated.world.currentMap.name).toBe('lantern-deep');
        expect(migrated.world.currentMap.currentNode).toBe('ld-18');
        expect(migrated.world.currentContinent.name).toBe('northern-continent');
        // v28 preserved the departed village's MapState; v29 then purges it.
        expect(migrated.world.mapStates).not.toHaveProperty('fishing-village');
        for (const c of migrated.world.world) {
            expect(c.availableMaps as string[]).not.toContain('fishing-village');
        }
        expect(migrated).not.toHaveProperty('mapGoodwill');
    });
});

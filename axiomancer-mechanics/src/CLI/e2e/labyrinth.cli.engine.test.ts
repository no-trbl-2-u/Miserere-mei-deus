/**
 * Hermetic e2e - the Labyrinth CLI's boss room (`bossRoomSequence`).
 *
 * The CLI's boss has one outcome: a won fight records the act's boss as
 * slain, and a lost one records nothing. The fight itself is stubbed, so the
 * test pins only what the sequence does with the result.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { CombatOutcome } from '../../Combat/combat.encounter.types';

const fight = vi.hoisted(() => ({ outcome: 'victory' as CombatOutcome, calls: 0 }));

vi.mock('../combat.cli', async (importOriginal) => {
    const real = await importOriginal<typeof import('../combat.cli')>();
    return {
        ...real,
        runHazardCombatCliEncounter: vi.fn(async () => {
            fight.calls += 1;
            return { outcome: fight.outcome };
        }),
    };
});

import { bossRoomSequence } from '../labyrinth.cli';
import { createCharacter } from '../../Character';
import { createGameStore } from '../../Game/store';
import { createEventEmitter } from '../../Game/events';
import { nullAdapter } from '../../Game/persistence/null.adapter';
import { getMapDefinition, createMapState } from '../../World/map.registry';
import { teleportToNode } from '../../World/world.reducer';
import { getAporiaAct } from '../../World/Labyrinth/maps';
import { createLabyrinthProgress } from '../../World/Labyrinth/labyrinth.engine';
import { parseArgv, setOutputMode } from '../io';

function storeAtBossRoom() {
    const act = getAporiaAct('act1');
    const store = createGameStore(
        nullAdapter,
        { player: createCharacter({ name: 'Walker', level: 14, baseStats: { heart: 6, body: 6, mind: 6 } }) },
        createEventEmitter(),
    );
    const world = {
        world: [],
        currentContinent: {
            name: 'labyrinth-continent', description: 'THE APORIA', availableMaps: [act.mapName],
            lockedMaps: [], completedMaps: [],
        },
        currentMap: createMapState(getMapDefinition('labyrinth-continent', act.mapName)),
    };
    store.setState({ world: teleportToNode(world as never, act.bossRoom), labyrinth: createLabyrinthProgress() });
    return { store, act };
}

beforeEach(() => {
    fight.outcome = 'victory';
    fight.calls = 0;
    setOutputMode('json');
});

describe('Labyrinth CLI boss room', () => {
    it('a won boss fight is recorded as slain and the act completes', async () => {
        const { store, act } = storeAtBossRoom();
        const result = await bossRoomSequence(store, act, parseArgv([]), 'kid-l15');
        expect(fight.calls).toBe(1);
        expect(result).toBe('won');
        const progress = store.getState().labyrinth!;
        expect(progress.bossOutcomes[act.id]).toBe('slain');
        expect(progress.actsCompleted).toContain(act.id);
    });

    it('a lost boss fight is lost and records no outcome', async () => {
        fight.outcome = 'defeat';
        const { store, act } = storeAtBossRoom();
        const result = await bossRoomSequence(store, act, parseArgv([]), 'kid-l15');
        expect(result).toBe('lost');
        const progress = store.getState().labyrinth!;
        expect(progress.bossOutcomes[act.id]).toBeUndefined();
        expect(progress.actsCompleted).not.toContain(act.id);
    });
});

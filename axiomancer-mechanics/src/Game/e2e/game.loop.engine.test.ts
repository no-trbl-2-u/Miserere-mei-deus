/**
 * Hermetic E2E — Game loop orchestration.
 *
 * Full transcript that exercises every public verb on the store via the
 * `gameReducer` dispatch spine:
 *
 *   1. createGameStore + createEventEmitter
 *   2. START_COMBAT against FloatEye (low-HP enemy → cheap victory)
 *   3. the Hazard-Pattern driver decides the fight outside the store
 *   4. endCombat('victory') — loot + XP applied
 *   5. LEVEL_UP — confirms the placeholder level-up reducer
 *   6. MOVE_TO_NODE to bw-w2
 *   7. SAVE_GAME (via the memory adapter)
 *   8. LOAD_GAME — round-trip through `migrate()`
 *
 * The hermetic suite stubs `Math.random` with the alternating helper so
 * combat rolls are deterministic; the in-memory adapter holds the save
 * payload between save/load so the round-trip assertion stays self-contained.
 */

import { createStartingWorld } from '../../World';
import { describe, it, expect, afterEach, vi } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { FloatEye } from '../../Enemy/enemy.library';
import { createGameStore } from '../store';
import { createEventEmitter, GameEvent, GameEventType } from '../events';
import { createNewGameState, gameReducer } from '../game.reducer';
import { migrate } from '../game.migrate';
import { GAME_STATE_VERSION } from '../game.reducer';
import { STAT_POINTS_PER_LEVEL } from '../game-mechanics.constants';
import { GameState } from '../types';
import { PersistenceAdapter } from '../persistence/types';
import { mockAlternatingRng } from '../../test-utils/rng';

afterEach(() => vi.restoreAllMocks());

function memoryAdapter(): PersistenceAdapter & { snapshot(): GameState | null } {
    let stored: GameState | null = null;
    return {
        load: () => stored,
        save: (s: GameState) => { stored = JSON.parse(JSON.stringify(s)) as GameState; },
        snapshot: () => stored,
    };
}

describe('Game loop — full transcript through gameReducer', () => {
    it('new game → combat → victory → level up → move → save → load round-trips identically', () => {
        mockAlternatingRng();

        const adapter = memoryAdapter();
        const emitter = createEventEmitter();
        const seenEvents: GameEventType[] = [];
        emitter.onAny(e => seenEvents.push(e.type));

        // High-XP override pushes the player over the level-1 threshold on
        // the first victory so LEVEL_UP has something to chew on.
        const seededPlayer = {
            ...Player,
            experience: Player.experienceToNextLevel - 1,
        };
        const store = createGameStore(adapter, { player: seededPlayer, world: createStartingWorld('breakwater') }, emitter);

        // 1. START_COMBAT — stages the encounter in the store.
        store.getState().dispatch({
            type: 'START_COMBAT',
            payload: { target: FloatEye },
        });
        expect(store.getState().currentEncounter).toBeDefined();
        expect(store.getState().currentEncounter!.enemies[0]!.id).toBe(FloatEye.id);

        // 2. END_COMBAT — combat resolution lives outside the store, so we
        //    report the victory outcome; it grants enemy XP and rolls loot.
        const report = store.getState().endCombat('victory');
        expect(report.outcome).toBe('victory');
        expect(report.xpGained).toBe(FloatEye.xpReward);
        expect(store.getState().currentEncounter).toBeUndefined();

        // 4. LEVEL_UP — the seeded XP + enemy reward should clear the threshold.
        const levelBefore = store.getState().player.level;
        const pointsBefore = store.getState().player.availableStatPoints;
        store.getState().dispatch({ type: 'LEVEL_UP' });
        const levelAfter = store.getState().player.level;
        expect(levelAfter).toBeGreaterThan(levelBefore);
        // Every level promotion grants STAT_POINTS_PER_LEVEL.
        const expectedGrant = (levelAfter - levelBefore) * STAT_POINTS_PER_LEVEL;
        expect(store.getState().player.availableStatPoints)
            .toBe(pointsBefore + expectedGrant);

        // 5. MOVE_TO_NODE to bw-w2 (the first fight, adjacent to the bw-w1 start).
        store.getState().dispatch({
            type: 'MOVE_TO_NODE',
            payload: { nodeId: 'bw-w2' },
        });
        expect(store.getState().world.currentMap.currentNode).toBe('bw-w2');

        // 6. Snapshot for round-trip.
        const preSave: GameState = JSON.parse(JSON.stringify({
            version:    store.getState().version,
            runId:      store.getState().runId,
            player:     store.getState().player,
            world:      store.getState().world,
            quests:     store.getState().quests,
            flags:      store.getState().flags,
            rngState:   store.getState().rngState,
            codex:      store.getState().codex,
        }));

        // 7. SAVE_GAME (autosave already fired through the dispatch chain).
        store.getState().save();
        const stored = adapter.snapshot();
        expect(stored).not.toBeNull();

        // 8. LOAD_GAME — pull through `migrate` to exercise the version path.
        const loaded = migrate(stored, stored!.version, GAME_STATE_VERSION);
        expect(loaded).toEqual(preSave);

        // 9. Event surface fired the expected verbs (order-independent).
        expect(seenEvents).toContain('combat:started');
        expect(seenEvents).toContain('combat:ended');
        expect(seenEvents).toContain('character:levelup');
        expect(seenEvents).toContain('world:moved');
        expect(seenEvents).toContain('game:saved');
    });
});

describe('gameReducer — pure path (no store)', () => {
    it('SAVE_GAME refreshes rngState; LOAD_GAME is a reducer-level no-op', () => {
        const s = createNewGameState({ startMap: 'breakwater' });
        // SAVE_GAME stamps a fresh `rngState` snapshot — every other
        // field passes through unchanged.
        const afterSave = gameReducer(s, { type: 'SAVE_GAME' });
        expect(afterSave).toEqual({ ...s, rngState: afterSave.rngState });
        // LOAD_GAME owns its side effect at the store layer; reducer is pure.
        expect(gameReducer(s, { type: 'LOAD_GAME' })).toBe(s);
    });

    it('MOVE_TO_NODE returns a new WorldState while keeping unrelated state intact', () => {
        const s = createNewGameState({ startMap: 'breakwater' });
        const next = gameReducer(s, { type: 'MOVE_TO_NODE', payload: { nodeId: 'bw-w2' } });
        expect(next.world.currentMap.currentNode).toBe('bw-w2');
        expect(next.player).toBe(s.player);
        expect(next.quests).toBe(s.quests);
    });
});

describe('migrate — version handling', () => {
    it('passes through a current-version payload unchanged', () => {
        const s = createNewGameState({ startMap: 'breakwater' });
        const out = migrate(s, GAME_STATE_VERSION, GAME_STATE_VERSION);
        expect(out).toEqual(s);
    });

    it('refuses payloads from a non-current runtime version', () => {
        const s = createNewGameState({ startMap: 'breakwater' });
        expect(() => migrate(s, GAME_STATE_VERSION + 1, GAME_STATE_VERSION))
            .toThrow(/not supported/);
    });

    it('throws on a malformed payload', () => {
        expect(() => migrate(null, 1, 1)).toThrow(/invalid save payload/);
        expect(() => migrate({}, 1, 1)).toThrow(/missing required GameState fields/);
    });
});

describe('createEventEmitter — subscription surface', () => {
    it('on() routes to type-matched handlers and unsubscribe stops further delivery', () => {
        const e = createEventEmitter();
        const seen: GameEvent[] = [];
        const off = e.on('combat:started', ev => seen.push(ev));
        e.emit({ type: 'combat:started', payload: 'a' });
        e.emit({ type: 'combat:ended',   payload: 'b' });
        off();
        e.emit({ type: 'combat:started', payload: 'c' });
        expect(seen).toEqual([{ type: 'combat:started', payload: 'a' }]);
    });

    it('onAny() receives every event regardless of type', () => {
        const e = createEventEmitter();
        const seen: string[] = [];
        e.onAny(ev => seen.push(ev.type));
        e.emit({ type: 'combat:started', payload: null });
        e.emit({ type: 'game:saved',     payload: null });
        expect(seen).toEqual(['combat:started', 'game:saved']);
    });
});

// guard-test: pins the version refusal T sees on an old save (mutation survivor game.migrate.ts:44 left by #1080), so it passes on the parent by design
/**
 * `migrate` refuses a save from another version with the line the player
 * reads: the message is the behaviour here, so its text is pinned.
 */

import { describe, it, expect } from 'vitest';

import { migrate } from './game.migrate';
import { GAME_STATE_VERSION, createNewGameState } from './game.reducer';
import { defeatedEnemies } from './defeat-ledger';

describe('migrate refuses a save from another version', () => {
    it('names both versions and tells the player to start a new game', () => {
        expect(() => migrate({}, GAME_STATE_VERSION - 1)).toThrow(
            `migrate: save version ${GAME_STATE_VERSION - 1} is not supported (runtime is ${GAME_STATE_VERSION}); ` +
            'saves made before the new Breakwater are not migrated — delete it and start a new game.',
        );
    });

    it('refuses a payload that is not an object before reading its version', () => {
        expect(() => migrate(null, GAME_STATE_VERSION)).toThrow('migrate: invalid save payload (got object).');
    });
});

describe('the optional defeat ledger (EN1b)', () => {
    it('a save written before it loads at the current version and reads as none beaten', () => {
        const old = createNewGameState();
        const { defeatedEnemies: _drop, ...codex } = old.codex;
        const loaded = migrate({ ...old, codex }, GAME_STATE_VERSION);
        expect(loaded.codex.defeatedEnemies).toBeUndefined();
        expect(defeatedEnemies(loaded)).toEqual([]);
    });

    it('a save that carries the ledger keeps it through the load', () => {
        const state = createNewGameState();
        const saved = { ...state, codex: { ...state.codex, defeatedEnemies: ['float-eye' as const] } };
        expect(defeatedEnemies(migrate(saved, GAME_STATE_VERSION))).toEqual(['float-eye']);
    });
});

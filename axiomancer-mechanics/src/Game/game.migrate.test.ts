// guard-test: pins the version refusal T sees on an old save (mutation survivor game.migrate.ts:44 left by #1080), so it passes on the parent by design
/**
 * `migrate` refuses a save from another version with the line the player
 * reads: the message is the behaviour here, so its text is pinned.
 */

import { describe, it, expect } from 'vitest';

import { migrate } from './game.migrate';
import { GAME_STATE_VERSION } from './game.reducer';

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

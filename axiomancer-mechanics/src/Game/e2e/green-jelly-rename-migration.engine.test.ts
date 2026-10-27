/**
 * Hermetic engine test — the v37 → v38 hop: the Brine Hag becomes the Green
 * Jelly (AN3 A3).
 *
 * A save is the only place an old enemy id can outlive the rename. Its
 * durable slice never holds the staged encounter, and map state holds no
 * payloads, so the two ids a save can carry are the befriend flag and the
 * codex entry the Hag's friendship wrote. Both move to the Jelly's.
 */

import { describe, it, expect } from 'vitest';
import { migrate } from '../game.migrate';
import { createNewGameState, GAME_STATE_VERSION } from '../game.reducer';
import { GreenJelly } from '../../Enemy/enemy.library';
import type { GameState } from '../types';

/** A v37 save carrying `flags` and `unlockedEntries`. */
function v37With(flags: string[], unlockedEntries: string[]): Record<string, unknown> {
    const fresh = createNewGameState({ startMap: 'breakwater' });
    return { ...fresh, version: 37, flags, codex: { unlockedEntries } };
}

const hop = (raw: Record<string, unknown>): GameState => migrate(raw, 37, 38);

describe('migrate v37 → v38 (AN3a: the Brine Hag becomes the Green Jelly)', () => {
    it('lands at the current version', () => {
        expect(GAME_STATE_VERSION).toBeGreaterThanOrEqual(38);
        expect(hop(v37With([], [])).version).toBe(38);
    });

    it('a befriended Hag stays befriended, as the Jelly', () => {
        const migrated = hop(v37With(['some-flag', 'befriended-brine-hag'], ['codex-brine-hag']));
        expect(migrated.flags).toEqual(['some-flag', GreenJelly.friendshipReward!.flagSet]);
        expect(migrated.codex.unlockedEntries).toEqual([GreenJelly.journalEntry!.id]);
    });

    it('the renamed codex entry resolves to the live Jelly entry', () => {
        expect(GreenJelly.friendshipReward!.flagSet).toBe('befriended-green-jelly');
        expect(GreenJelly.journalEntry!.id).toBe('codex-green-jelly');
    });

    it('a save that already holds the new id does not hold it twice', () => {
        const migrated = hop(v37With(['befriended-brine-hag', 'befriended-green-jelly'], []));
        expect(migrated.flags).toEqual(['befriended-green-jelly']);
    });

    it('a save that never met the Hag is untouched', () => {
        const migrated = hop(v37With(['some-flag'], ['codex-other']));
        expect(migrated.flags).toEqual(['some-flag']);
        expect(migrated.codex.unlockedEntries).toEqual(['codex-other']);
    });

    it('a v36 save chains through to the current version', () => {
        const fresh = createNewGameState({ startMap: 'breakwater' });
        const raw = { ...fresh, version: 36, flags: ['befriended-brine-hag'] };
        const migrated = migrate(raw, 36);
        expect(migrated.version).toBe(GAME_STATE_VERSION);
        expect(migrated.flags).toEqual(['befriended-green-jelly']);
    });
});

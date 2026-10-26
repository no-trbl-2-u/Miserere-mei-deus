/**
 * Hermetic engine test — equipment-progression save migration (v21 → v22).
 *
 * The hop is a version bump only (the head/hands/feet signet relics it once
 * appended no longer exist): a v21 save loads
 * at v22 with its player untouched (the v34 → v35 hop drops any deleted relic
 * a save still holds).
 */

import { describe, it, expect } from 'vitest';
import { migrate } from '../game.migrate';
import { createNewGameState, GAME_STATE_VERSION } from '../game.reducer';
import { cloneRelic, getRelicById } from '../../Items/relic.library';

/** A v21 save: a fresh state stamped back to v21, wearing and holding the ring. */
function v21Save(): Record<string, unknown> {
    const fresh = createNewGameState();
    const relics = [cloneRelic(getRelicById('relic-disarming-plea')!)];
    return {
        ...fresh,
        player: {
            ...fresh.player,
            equipment: { weapon: null, armor: null, accessories: relics },
            inventory: [...relics],
        },
        version: 21,
    } as unknown as Record<string, unknown>;
}

describe('migrate v21 → v22 — a version bump since R7e2', () => {
    it('the v21 → v22 hop is on the supported chain', () => {
        expect(GAME_STATE_VERSION).toBeGreaterThanOrEqual(22);
        expect(migrate(v21Save(), 21, 22).version).toBe(22);
    });

    it('leaves the player untouched — no relic is appended, the loadout is unchanged', () => {
        const raw = v21Save();
        const before = JSON.parse(JSON.stringify(raw.player));
        const migrated = migrate(raw, 21, 22);
        expect(JSON.parse(JSON.stringify(migrated.player))).toEqual(before);
    });

    it('chains a v20 save straight to v22 in one call', () => {
        const raw = v21Save();
        raw.version = 20;
        const before = JSON.parse(JSON.stringify((raw.player as { inventory: unknown }).inventory));
        const { mapStates: _mapStates, ...worldWithout } = (raw.world as { mapStates: unknown; world: unknown[] });
        raw.world = { ...worldWithout, world: [] };

        const migrated = migrate(raw, 20, 22);
        expect(migrated.version).toBe(22);
        expect(JSON.parse(JSON.stringify(migrated.player.inventory))).toEqual(before);
        expect(migrated.player.inventory.map(i => i.id)).toEqual(['relic-disarming-plea']);
    });
});

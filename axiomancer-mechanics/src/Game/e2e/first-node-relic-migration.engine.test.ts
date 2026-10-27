/**
 * Hermetic engine test — the v23 → v24 hop, and old saves that carry the ring.
 *
 * v24 moved the Suppliant's Ring out of the silent seed and into the run's
 * first node, and stamped `first-node-relic-granted` on every save it
 * migrated. The hand-over is gone now (a run starts with no relic and is
 * given none), so the flag is inert, but the hop still writes it and a save
 * keeps exactly the relic it carries, worn or not.
 */

import { describe, it, expect } from 'vitest';
import { migrate } from '../game.migrate';
import { createNewGameState, GAME_STATE_VERSION, gameReducer } from '../game.reducer';
import type { GameState } from '../types';
import { createCharacter } from '../../Character';
import type { Character } from '../../Character/types';
import { grantItem } from '../../Items/item-grant';
import { getRelicById } from '../../Items/relic.library';
import { initializeCombatEncounter } from '../../Combat/combat.engine';
import { FloatEye } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';

const RING_ID = 'relic-disarming-plea';
const FLAG = 'first-node-relic-granted';

/** A level-1 player given the ring: worn (`equip`) or carried. */
function ringPlayer(equip: boolean): Character {
    const bare = createCharacter({ name: 'Player', level: 1, baseStats: { heart: 5, body: 5, mind: 5 } });
    return grantItem(bare, getRelicById(RING_ID)!, { equip }).character;
}

/** A save at `version` around `player`, no first-node flag. */
function saveAt(version: number, player: Character, extraFlags: string[] = []): Record<string, unknown> {
    const fresh = createNewGameState();
    return {
        ...fresh,
        version,
        player,
        flags: [...fresh.flags, ...extraFlags],
    } as unknown as Record<string, unknown>;
}

describe('migrate v23 → v24 — the inert first-node flag', () => {
    it('the v23 → v24 hop is on the supported chain', () => {
        expect(GAME_STATE_VERSION).toBeGreaterThanOrEqual(24);
        expect(migrate(saveAt(23, ringPlayer(true)), 23, 24).version).toBe(24);
    });

    it('still stamps the flag string', () => {
        const migrated = migrate(saveAt(23, ringPlayer(true)), 23, 24);
        expect(migrated.flags).toContain(FLAG);
    });

    it('does not touch the player — the ring and the worn loadout pass through', () => {
        const raw = saveAt(23, ringPlayer(true));
        const before = JSON.parse(JSON.stringify(raw.player));
        const migrated = migrate(raw, 23, 24);
        expect(JSON.parse(JSON.stringify(migrated.player))).toEqual(before);
    });

    it('keeps every other flag', () => {
        const migrated = migrate(saveAt(23, ringPlayer(true), ['some-story-flag', 'starter-bundle-chosen']), 23, 24);
        expect(migrated.flags).toContain('some-story-flag');
        expect(migrated.flags).toContain('starter-bundle-chosen');
    });

    it('is idempotent — a save already carrying the flag gets one copy', () => {
        const migrated = migrate(saveAt(23, ringPlayer(true), [FLAG]), 23, 24);
        expect(migrated.flags.filter(f => f === FLAG)).toHaveLength(1);
    });

    it('a save whose player parted with the ring is not given one', () => {
        const bare = createCharacter({ name: 'Player', level: 1, baseStats: { heart: 5, body: 5, mind: 5 } });
        const migrated = migrate(saveAt(23, bare), 23, 24);
        expect(migrated.flags).toContain(FLAG);
        expect(migrated.player.inventory.map(i => i.id)).not.toContain(RING_ID);
    });
});

describe('old saves keep the ring where it was', () => {
    function loadAndFight(equip: boolean) {
        const loaded = migrate(saveAt(23, ringPlayer(equip)), 23, GAME_STATE_VERSION) as GameState;
        const staged = gameReducer(loaded, { type: 'START_COMBAT', payload: { target: deepClone(FloatEye) } });
        const fight = initializeCombatEncounter(staged.player, deepClone(FloatEye), undefined, 7);
        return { loaded, staged, fight };
    }

    it('a save wearing the ring loads and fights with The Open Hand', () => {
        const { loaded, staged, fight } = loadAndFight(true);
        expect(loaded.player.equipment.relics.map(a => a.id)).toEqual([RING_ID]);
        expect(staged.player).toBe(loaded.player);
        expect(fight.signatures).toEqual(['sig-disarming-plea']);
    });

    it('a save carrying the ring unworn loads with it carried, and fights without it', () => {
        const { loaded, staged, fight } = loadAndFight(false);
        expect(loaded.player.inventory.map(i => i.id)).toContain(RING_ID);
        expect(loaded.player.equipment.relics).toEqual([]);
        expect(staged.player.equipment.relics).toEqual([]);
        expect(fight.signatures).toEqual([]);
    });
});

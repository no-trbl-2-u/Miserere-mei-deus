/**
 * Hermetic engine test — the v34 → v35 hop: the relic strip.
 *
 * One relic exists, the Suppliant's Ring. A v34 save may still hold
 * any of the ten deleted relics, worn or benched. The hop drops them from the
 * inventory and the loadout, recomputes max VITAE off the bonus that remains
 * and clamps health; the ring and every non-relic item ride through.
 */

import { describe, it, expect } from 'vitest';
import { migrate } from '../game.migrate';
import { createNewGameState, GAME_STATE_VERSION } from '../game.reducer';
import { FIXTURE_ARMOR } from '../fixtures/fixture-content';
import type { GameState } from '../types';

const relic = (id: string, slot: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
    id, name: id, description: '', category: 'equipment', slot, statModifiers: [], ...extra,
});

const RING = relic('relic-disarming-plea', 'accessory', { accessoryKind: 'ring', grantsSignature: 'sig-disarming-plea' });
const DELETED_WEAPON = relic('relic-overwhelming', 'weapon', { grantsSignature: 'sig-overwhelming-argument' });
const DELETED_ARMOR = relic('relic-read', 'armor', {
    grantsSignature: 'sig-read-opponent', statModifiers: [{ stat: 'maxHp', value: 5 }],
});
const DELETED_TRINKET = relic('relic-clever-gambit', 'accessory', { accessoryKind: 'charm', grantsSignature: 'sig-clever-gambit' });
const BENCHED = relic('relic-endless-labor', 'accessory', { accessoryKind: 'hands', grantsSignature: 'sig-endless-labor' });
const POTION = { id: 'healing-potion', name: 'Healing Potion', description: '', category: 'consumable', healAmount: 20, quantity: 2 };

/** A v34 save wearing the old kit: three deleted relics, the ring, a benched relic and a potion. */
function v34WithOldKit(): Record<string, unknown> {
    const fresh = createNewGameState({ startMap: 'breakwater' });
    const maxHealth = fresh.player.maxHealth + 5;
    return {
        ...fresh,
        version: 34,
        player: {
            ...fresh.player,
            inventory: [DELETED_WEAPON, DELETED_ARMOR, RING, DELETED_TRINKET, BENCHED, POTION],
            equipment: { weapon: DELETED_WEAPON, armor: DELETED_ARMOR, accessories: [RING, DELETED_TRINKET] },
            maxHealth,
            health: maxHealth,
        },
    };
}

const hop = (raw: Record<string, unknown>): GameState => migrate(raw, 34, 35);
const ids = (items: readonly { id: string }[]): string[] => items.map(i => i.id);

describe('migrate v34 → v35 (THE REVAMP R7e2 / D72: the ring alone)', () => {
    it('lands at the current version', () => {
        expect(GAME_STATE_VERSION).toBeGreaterThanOrEqual(35);
        expect(hop(v34WithOldKit()).version).toBe(35);
    });

    it('drops the deleted relics from the inventory and keeps the ring and the potion', () => {
        expect(ids(hop(v34WithOldKit()).player.inventory)).toEqual(['relic-disarming-plea', 'healing-potion']);
    });

    it('empties the loadout slots the deleted relics held and keeps the ring worn', () => {
        const { equipment } = hop(v34WithOldKit()).player;
        expect(equipment.weapon).toBeNull();
        expect(equipment.armor).toBeNull();
        expect(ids(equipment.relics)).toEqual(['relic-disarming-plea']);
    });

    it('takes the deleted armor bonus off max VITAE and clamps health', () => {
        const before = v34WithOldKit();
        const player = before.player as GameState['player'];
        const migrated = hop(before).player;
        expect(migrated.maxHealth).toBe(player.maxHealth - 5);
        expect(migrated.health).toBe(migrated.maxHealth);
    });

    it('passes non-relic equipment through, bonus and all', () => {
        const fresh = createNewGameState({ startMap: 'breakwater' });
        const maxHealth = fresh.player.maxHealth + 5;
        const raw = {
            ...fresh, version: 34,
            player: {
                ...fresh.player, inventory: [FIXTURE_ARMOR],
                equipment: { weapon: null, armor: FIXTURE_ARMOR, accessories: [] }, maxHealth, health: 10,
            },
        };
        const migrated = hop(raw).player;
        expect(migrated.equipment.armor?.id).toBe('fixture-armor');
        expect(migrated.maxHealth).toBe(maxHealth);
        expect(migrated.health).toBe(10);
    });

    it('passes a fresh save through unchanged but for the version', () => {
        const fresh = createNewGameState({ startMap: 'breakwater' });
        expect(hop({ ...fresh, version: 34 })).toEqual({ ...fresh, version: 35 });
    });

    it('is idempotent', () => {
        const once = hop(v34WithOldKit());
        const twice = hop({ ...once, version: 34 } as unknown as Record<string, unknown>);
        expect(twice).toEqual(once);
    });
});

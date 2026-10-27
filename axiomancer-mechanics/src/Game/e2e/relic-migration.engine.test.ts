/**
 * Hermetic engine test — relic save migration (v12 → v13).
 *
 * A v12 save has the 5-slot loadout but no signet relics. Migrating seeds the
 * starting relics (the Suppliant's Ring alone, the kit before a run began with none),
 * worn — displaces the old gear to inventory and recomputes
 * maxHealth, so a loaded save derives its signature kit from the worn loadout
 * instead of the old archetype kit.
 */

import { describe, it, expect } from 'vitest';
import { migrate, createNewGameState, GAME_STATE_VERSION } from '../index';
import { calculateMaxHealth } from '../../Utils';
import { getSignaturesForLoadout } from '../../Items/relic.library';
import type { Equipment } from '../../Items/types';

const oldSword: Equipment = {
    id: 'old-sword', name: 'Old Sword', description: '', category: 'equipment',
    slot: 'weapon', 
    statModifiers: [{ stat: 'maxHp', value: 1 }],
};

/** A v12 save: 5-slot loadout with an old worn weapon (also present in
 *  inventory, per the mobile inventory-position worn convention), no relics. */
function v12Save(): Record<string, unknown> {
    const fresh = createNewGameState(); // v13 with relics
    const base = calculateMaxHealth(fresh.player.level, fresh.player.baseStats);
    return {
        ...fresh,
        version: 12,
        player: {
            ...fresh.player,
            equipment: { weapon: oldSword, armor: null, accessories: [] },
            inventory: [oldSword],
            maxHealth: base,
            health: base,
        },
    };
}

// Pin toVersion=13 to exercise the v12→v13 hop in isolation; the
// v13→v14 purge is covered in its own block below.
describe('migrate v12 → v13 — seed the signet relics', () => {
    it('seeds the Suppliant\'s Ring worn onto a v12 save, the other slots empty', () => {
        const migrated = migrate(v12Save(), 12, 13);
        expect(migrated.version).toBe(13);
        expect(migrated.player.equipment.weapon).toBeNull();
        expect(migrated.player.equipment.armor).toBeNull();
        expect(migrated.player.equipment.relics.map(a => a.id)).toEqual(['relic-disarming-plea']);
    });

    it('displaces the old worn gear to inventory behind the ring', () => {
        const invIds = migrate(v12Save(), 12, 13).player.inventory.map(i => i.id);
        expect(invIds).toEqual(['relic-disarming-plea', 'old-sword']); // nothing lost at v13
    });

    it('recomputes maxHealth off the ring loadout (no stat line) and clamps health', () => {
        const raw = v12Save();
        const player = raw.player as { level: number; baseStats: { heart: number; body: number; mind: number } };
        const base = calculateMaxHealth(player.level, player.baseStats);
        const migrated = migrate(raw, 12, 13);
        expect(migrated.player.maxHealth).toBe(base);
        expect(migrated.player.health).toBeLessThanOrEqual(migrated.player.maxHealth);
    });

    it('the migrated player derives The Open Hand from the worn loadout', () => {
        const migrated = migrate(v12Save(), 12, 13);
        expect(getSignaturesForLoadout(migrated.player.equipment)).toEqual(['sig-disarming-plea']);
    });

    it('still rejects an unsupported (pre-v11) version', () => {
        expect(() => migrate({ version: 9 }, 9)).toThrow(/not supported/);
    });
});

// v13 → v14 purges non-relic equipment.
describe('migrate v13 → v14 — purge non-relic equipment', () => {
    it('strips the old procedural weapon (worn + inventory) and keeps only relics as equipment', () => {
        // A v12 save chained all the way to current: the old sword parked in
        // inventory at v13 is stripped at v14; only relic equipment survives.
        const migrated = migrate(v12Save(), 12);
        expect(migrated.version).toBe(GAME_STATE_VERSION); // chains v12 → current
        const equipmentIds = migrated.player.inventory
            .filter((i): i is typeof i => (i as { category?: string }).category === 'equipment')
            .map(i => i.id);
        expect(equipmentIds).toEqual(['relic-disarming-plea']);
        // The worn loadout is the ring and still derives The Open Hand.
        expect(migrated.player.equipment.weapon).toBeNull();
        expect(getSignaturesForLoadout(migrated.player.equipment)).toEqual(['sig-disarming-plea']);
    });

    it('empties a weapon slot that held procedural gear and backfills the ring', () => {
        // A hand-built v13 save whose loadout still wears the old sword (edge case).
        const fresh = createNewGameState();
        const base = calculateMaxHealth(fresh.player.level, fresh.player.baseStats);
        const v13 = {
            ...fresh,
            version: 13,
            player: {
                ...fresh.player,
                equipment: { weapon: oldSword, armor: null, accessories: [] },
                inventory: [oldSword],
                maxHealth: base,
                health: base,
            },
        };
        const migrated = migrate(v13, 13);
        expect(migrated.version).toBe(GAME_STATE_VERSION); // chains v13 → current
        // No starting weapon relic is left, so the procedural weapon's slot empties.
        expect(migrated.player.equipment.weapon).toBeNull();
        expect(migrated.player.equipment.armor).toBeNull();
        expect(migrated.player.equipment.relics.map(a => a.id)).toEqual(['relic-disarming-plea']);
        expect(migrated.player.inventory.map(i => i.id)).not.toContain('old-sword');
    });
});

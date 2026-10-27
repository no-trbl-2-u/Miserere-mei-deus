/**
 * The shared item-grant path — hermetic E2E tests.
 *
 * Two of these tests exist to pin the SILENT failure modes that make this
 * module necessary. `equipItem` does not return the displaced piece: on
 * weapon/armor it replaces in place (the worn relic is gone), and on a FULL
 * relic row it is a guarded no-op that returns the SAME character
 * reference, so a shallow equality check reads the failure as success. The
 * `equipItem — the failure modes this module exists to prevent` block asserts
 * that behaviour directly, and the `grantItem` blocks assert that the shared
 * path does not inherit it.
 *
 * Hermetic: the Suppliant's Ring (the one library relic) and the fixture
 * relics (R7e2) for the other slots, characters built in-line, no mocks.
 */

import { describe, it, expect } from 'vitest';

import { createCharacter } from '../../Character/index';
import { equipItem } from '../../Character/equipment.reducer';
import { getRelicById, relicLibrary } from '../relic.library';
import { FIXTURE_WEAPON, FIXTURE_ARMOR, FIXTURE_TRINKETS } from '../../Game/fixtures';
import {
    grantItem,
    grantWearingIfFree,
    qualifiesForItemRewardScreen,
    partitionGrantsForReward,
    displacedBy,
} from '../item-grant';
import { SLOT_CAPACITY } from '../types';
import type { Consumable, Equipment, Item, Material, QuestItem } from '../types';
import type { Character } from '../../Character/types';

// ─── fixtures ─────────────────────────────────────────────────────────────────

/** A deep clone, so no test aliases a library or fixture singleton. */
const clone = (e: Equipment): Equipment => JSON.parse(JSON.stringify(e)) as Equipment;

const relic = (id: string): Equipment => {
    const found = getRelicById(id);
    if (!found) throw new Error(`relic fixture missing: ${id}`);
    return clone(found);
};

const RING_ID = 'relic-disarming-plea';
const ring = (): Equipment => relic(RING_ID);
const weapon = (): Equipment => clone(FIXTURE_WEAPON);
/** A second placeholder weapon — the swap needs two. */
const weapon2 = (): Equipment => clone({ ...FIXTURE_WEAPON, id: 'fixture-weapon-2', name: 'Fixture Weapon 2' });
const armor = (): Equipment => clone(FIXTURE_ARMOR);
/** A second placeholder armor — the swap needs two. */
const armor2 = (): Equipment => clone({ ...FIXTURE_ARMOR, id: 'fixture-armor-2', name: 'Fixture Armor 2' });
const trinket = (i: 0 | 1 | 2): Equipment => clone(FIXTURE_TRINKETS[i]!);
const [T1, T2, T3] = FIXTURE_TRINKETS.map(t => t.id) as [string, string, string];

/** A player given the Suppliant's Ring, worn and carried. */
const seededPlayer = (): Character =>
    grantItem(
        createCharacter({
            name: 'Grantee',
            level: 3,
            baseStats: { body: 3, mind: 3, heart: 3 },
        }),
        getRelicById(RING_ID)!,
        { equip: true },
    ).character;

/** A bare player: nothing worn, nothing carried. */
const barePlayer = (): Character =>
    createCharacter({
        name: 'Pauper',
        level: 1,
        baseStats: { body: 2, mind: 2, heart: 2 },
    });

/** A player wearing `worn` via the loadout ONLY — nothing in inventory. This is
 *  what `createCharacter({ equipment: [...] })` produces, and it is the shape
 *  that proves the displaced piece is genuinely rescued rather than merely
 *  already present. */
const loadoutOnlyPlayer = (worn: Equipment[]): Character => {
    let c = barePlayer();
    for (const piece of worn) c = equipItem(c, piece);
    return c;
};

const potion = (id: string, quantity = 1): Consumable => ({
    id,
    name: 'Draught',
    description: 'A test draught.',
    category: 'consumable',
    quantity,
    healAmount: 10,
});

const scrap = (id: string, quantity = 1): Material => ({
    id,
    name: 'Scrap',
    description: 'A test material.',
    category: 'material',
    quantity,
});

const token = (id: string): QuestItem => ({
    id,
    name: 'Token',
    description: 'A test quest item.',
    category: 'quest-item',
    questId: 'q-test',
});

const countById = (inventory: readonly Item[], id: string): number =>
    inventory.filter(i => i.id === id).length;

const wornIds = (c: Character): string[] => [
    ...(c.equipment.weapon ? [c.equipment.weapon.id] : []),
    ...(c.equipment.armor ? [c.equipment.armor.id] : []),
    ...c.equipment.relics.map(a => a.id),
];

// ─── the failure modes ────────────────────────────────────────────────────────

describe('equipItem — the failure modes this module exists to prevent', () => {
    it('weapon: a naive equip DESTROYS the worn piece (it is in neither loadout nor inventory)', () => {
        const worn = weapon();
        const incoming = weapon2();
        const player = loadoutOnlyPlayer([worn]);

        const after = equipItem(player, incoming);

        expect(after.equipment.weapon?.id).toBe(incoming.id);
        // The displaced piece is simply gone — no return value, no inventory row.
        expect(countById(after.inventory, worn.id)).toBe(0);
        expect(wornIds(after)).not.toContain(worn.id);
    });

    it('full relic row: a naive equip is a SILENT no-op returning the same reference', () => {
        const player = loadoutOnlyPlayer([trinket(0), trinket(1), trinket(2)]);
        expect(player.equipment.relics).toHaveLength(SLOT_CAPACITY.relic);

        const incoming = ring();
        const after = equipItem(player, incoming);

        // Same reference — a shallow equality check reads this as success.
        expect(after).toBe(player);
        expect(wornIds(after)).not.toContain(incoming.id);
    });
});

// ─── grantItem: inventory-only grants ─────────────────────────────────────────

describe('grantItem — inventory grants', () => {
    it('adds a deep clone, never the caller object', () => {
        const player = barePlayer();
        const source = potion('elixir');

        const res = grantItem(player, source);

        expect(res.outcome).toBe('inventory');
        expect(res.equipped).toBe(false);
        expect(res.displaced).toBeNull();
        expect(res.granted).not.toBe(source);
        expect(res.granted.id).toBe('elixir');
        expect(countById(res.character.inventory, 'elixir')).toBe(1);
        // Pure: the input character is untouched.
        expect(player.inventory).toHaveLength(0);
    });

    it('stacks a consumable already in inventory instead of adding a row', () => {
        let player = barePlayer();
        player = grantItem(player, potion('elixir', 1)).character;
        const res = grantItem(player, potion('elixir', 2));

        expect(countById(res.character.inventory, 'elixir')).toBe(1);
        const row = res.character.inventory.find(i => i.id === 'elixir') as Consumable;
        expect(row.quantity).toBe(3);
    });

    it('stacks materials too, and honours { stack: false }', () => {
        let player = barePlayer();
        player = grantItem(player, scrap('iron', 2)).character;

        const stacked = grantItem(player, scrap('iron', 3)).character;
        expect(countById(stacked.inventory, 'iron')).toBe(1);
        expect((stacked.inventory.find(i => i.id === 'iron') as Material).quantity).toBe(5);

        const unstacked = grantItem(player, scrap('iron', 3), { stack: false }).character;
        expect(countById(unstacked.inventory, 'iron')).toBe(2);
    });

    it('{ equip: true } on a non-equipment item is ignored, not an error', () => {
        const res = grantItem(barePlayer(), potion('elixir'), { equip: true });
        expect(res.outcome).toBe('inventory');
        expect(res.equipped).toBe(false);
        expect(countById(res.character.inventory, 'elixir')).toBe(1);
    });
});

// ─── grantItem: equipping into a free slot ────────────────────────────────────

describe('grantItem — equipping into a free slot', () => {
    it('wears the grant and keeps it in inventory (worn items live in both)', () => {
        const incoming = weapon();
        const res = grantItem(barePlayer(), incoming, { equip: true });

        expect(res.outcome).toBe('equipped');
        expect(res.equipped).toBe(true);
        expect(res.displaced).toBeNull();
        expect(res.character.equipment.weapon?.id).toBe(incoming.id);
        expect(countById(res.character.inventory, incoming.id)).toBe(1);
    });

    it('fills a free relic position without displacing anything', () => {
        const player = loadoutOnlyPlayer([trinket(0)]);
        const incoming = ring();

        const res = grantItem(player, incoming, { equip: true });

        expect(res.outcome).toBe('equipped');
        expect(res.displaced).toBeNull();
        expect(res.character.equipment.relics.map(a => a.id)).toEqual([T1, RING_ID]);
    });

    it('folds the grant stat modifiers into the wearer (the sole equipment channel)', () => {
        const before = barePlayer();
        // The fixture armor carries a flat maxHp modifier.
        const incoming = armor();
        const res = grantItem(before, incoming, { equip: true });

        const hpMod = (incoming.statModifiers ?? []).find(m => m.stat === 'maxHp');
        expect(hpMod).toBeDefined();
        expect(res.character.maxHealth).toBe(before.maxHealth + hpMod!.value);
    });
});

// ─── grantItem: the swap (D6) ─────────────────────────────────────────────────

describe('grantItem — swap never destroys (D6)', () => {
    it('weapon swap returns the displaced piece to inventory', () => {
        const worn = weapon();
        const incoming = weapon2();
        const player = loadoutOnlyPlayer([worn]);

        const res = grantItem(player, incoming, { equip: true });

        expect(res.outcome).toBe('swapped');
        expect(res.equipped).toBe(true);
        expect(res.displaced?.id).toBe(worn.id);
        expect(res.character.equipment.weapon?.id).toBe(incoming.id);
        // The whole point: the displaced piece is still the player's.
        expect(countById(res.character.inventory, worn.id)).toBe(1);
        expect(countById(res.character.inventory, incoming.id)).toBe(1);
    });

    it('armor swap returns the displaced piece to inventory', () => {
        const worn = armor();
        const incoming = armor2();
        const player = loadoutOnlyPlayer([worn]);

        const res = grantItem(player, incoming, { equip: true });

        expect(res.displaced?.id).toBe(worn.id);
        expect(res.character.equipment.armor?.id).toBe(incoming.id);
        expect(countById(res.character.inventory, worn.id)).toBe(1);
    });

    it('a FULL relic row swaps instead of silently no-op-ing', () => {
        const player = loadoutOnlyPlayer([trinket(0), trinket(1), trinket(2)]);
        const incoming = ring();

        const res = grantItem(player, incoming, { equip: true });

        expect(res.character).not.toBe(player);
        expect(res.outcome).toBe('swapped');
        expect(res.equipped).toBe(true);
        expect(res.character.equipment.relics).toHaveLength(SLOT_CAPACITY.relic);
        expect(wornIds(res.character)).toContain(incoming.id);
        // Default displacement is the LAST worn relic.
        expect(res.displaced?.id).toBe(T3);
        expect(countById(res.character.inventory, T3)).toBe(1);
    });

    it('honours an explicit replaceIndex on a full relic row', () => {
        const player = loadoutOnlyPlayer([trinket(0), trinket(1), trinket(2)]);
        const incoming = ring();

        const res = grantItem(player, incoming, { equip: true, replaceIndex: 0 });

        expect(res.displaced?.id).toBe(T1);
        expect(countById(res.character.inventory, T1)).toBe(1);
        expect(wornIds(res.character)).toContain(incoming.id);
        expect(wornIds(res.character)).not.toContain(T1);
    });

    it('an out-of-range replaceIndex falls back to the last position, never a no-op', () => {
        const player = loadoutOnlyPlayer([trinket(0), trinket(1), trinket(2)]);
        const incoming = ring();

        const res = grantItem(player, incoming, { equip: true, replaceIndex: 99 });

        expect(res.character).not.toBe(player);
        expect(res.equipped).toBe(true);
        expect(res.displaced?.id).toBe(T3);
    });

    it('conserves item count across a full-row swap on a seeded player', () => {
        // The seeded player wears the ring; two trinkets fill the row.
        let player = seededPlayer();
        player = grantItem(player, trinket(0), { equip: true }).character;
        player = grantItem(player, trinket(1), { equip: true }).character;
        expect(player.equipment.relics).toHaveLength(SLOT_CAPACITY.relic);
        const before = player.inventory.length;

        const res = grantItem(player, trinket(2), { equip: true });

        // One row added (the granted clone); nothing removed.
        expect(res.character.inventory.length).toBe(before + 1);
        expect(res.character.equipment.relics).toHaveLength(SLOT_CAPACITY.relic);
        expect(res.displaced?.id).toBe(T2);
        expect(countById(res.character.inventory, T2)).toBe(1);
        expect(countById(res.character.inventory, RING_ID)).toBe(1);
    });
});

// ─── displacedBy ──────────────────────────────────────────────────────────────

describe('displacedBy — the swap preview', () => {
    it('reports null for an empty slot and for a free relic position', () => {
        const bare = barePlayer();
        expect(displacedBy(bare, weapon()).item).toBeNull();
        expect(displacedBy(bare, ring()).item).toBeNull();
    });

    it('reports the worn weapon and the last relic at capacity', () => {
        const player = loadoutOnlyPlayer([weapon(), trinket(0), trinket(1), trinket(2)]);
        expect(displacedBy(player, weapon2()).item?.id).toBe(FIXTURE_WEAPON.id);
        const acc = displacedBy(player, ring());
        expect(acc.item?.id).toBe(T3);
        expect(acc.index).toBe(2);
    });

    it('agrees with what grantItem actually displaces', () => {
        const player = loadoutOnlyPlayer([trinket(0), trinket(1), trinket(2)]);
        const incoming = ring();
        const preview = displacedBy(player, incoming, { replaceIndex: 1 });
        const res = grantItem(player, incoming, { equip: true, replaceIndex: 1 });
        expect(preview.item?.id).toBe(T2);
        expect(res.displaced?.id).toBe(preview.item?.id);
    });
});

// ─── D5 predicate ─────────────────────────────────────────────────────────────

describe('qualifiesForItemRewardScreen — the D5 trigger (routes the intended items exactly)', () => {
    it('true for a signet relic (signature, no stats)', () => {
        expect(qualifiesForItemRewardScreen(ring())).toBe(true);
    });

    it('true for every relic in the library — each carries a signature', () => {
        for (const r of relicLibrary) {
            expect(qualifiesForItemRewardScreen(clone(r)), r.id).toBe(true);
        }
    });

    it('true for equipment with stat modifiers but no signature', () => {
        expect(qualifiesForItemRewardScreen(armor())).toBe(true);
    });

    it('false for equipment with neither a signature nor stat modifiers', () => {
        const inert: Equipment = {
            id: 'gear-inert',
            name: 'Inert Gear',
            description: '',
            category: 'equipment',
            slot: 'weapon',
        };
        expect(qualifiesForItemRewardScreen(inert)).toBe(false);
        expect(qualifiesForItemRewardScreen(weapon())).toBe(false);
    });

    it('false for consumables, materials, and quest items', () => {
        expect(qualifiesForItemRewardScreen(potion('elixir'))).toBe(false);
        expect(qualifiesForItemRewardScreen(scrap('iron'))).toBe(false);
        expect(qualifiesForItemRewardScreen(token('sigil'))).toBe(false);
    });

    it('partitions a mixed haul into reward-screen and inline grants, preserving order', () => {
        const haul: Item[] = [
            scrap('iron'),
            ring(),
            potion('elixir'),
            armor(),
        ];
        const { reward, inline } = partitionGrantsForReward(haul);
        expect(reward.map(i => i.id)).toEqual([RING_ID, FIXTURE_ARMOR.id]);
        expect(inline.map(i => i.id)).toEqual(['iron', 'elixir']);
    });
});

describe('grantWearingIfFree — every dev relic grant wears while a position is free', () => {
    const SIGNET_ID = 'relic-bleeding-signet';

    it('wears each relic on a bare player while a position is free, then carries the rest', () => {
        let player = barePlayer();
        const ids = relicLibrary.map(r => r.id);
        const fits = SLOT_CAPACITY.relic;
        for (const [i, relic] of relicLibrary.entries()) {
            const res = grantWearingIfFree(player, relic);
            expect(res.equipped).toBe(i < fits);
            expect(res.displaced).toBeNull();
            player = res.character;
        }
        expect(player.equipment.relics.map(a => a.id)).toEqual(ids.slice(0, fits));
        expect(player.inventory.map(i => i.id)).toEqual(ids);
    });

    it('carries the relic when the slot is full, and nothing worn moves', () => {
        const full = loadoutOnlyPlayer([...FIXTURE_TRINKETS]);
        const before = full.equipment.relics.map(a => a.id);
        const res = grantWearingIfFree(full, getRelicById(SIGNET_ID)!);
        expect(res.equipped).toBe(false);
        expect(res.outcome).toBe('inventory');
        expect(res.character.equipment.relics.map(a => a.id)).toEqual(before);
        expect(res.character.inventory.map(i => i.id)).toContain(SIGNET_ID);
    });

    it('does not wear a second copy of a relic already worn', () => {
        const player = seededPlayer();
        const res = grantWearingIfFree(player, getRelicById(RING_ID)!);
        expect(res.equipped).toBe(false);
        expect(res.character.equipment.relics.map(a => a.id)).toEqual([RING_ID]);
    });

    it('grants a consumable as a plain stacking grant', () => {
        const res = grantWearingIfFree(barePlayer(), potion('elixir', 2));
        expect(res.outcome).toBe('inventory');
        expect(res.character.inventory.map(i => i.id)).toEqual(['elixir']);
    });
});

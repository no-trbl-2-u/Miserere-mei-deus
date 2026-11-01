/**
 * What the player wears, read from the one record of it: `player.equipment`.
 *
 * Combat's signatures, the stat fold and the reward lanes all read the engine
 * loadout, so every mobile surface that says an item is worn reads it too.
 * Inventory order means nothing: a relic can be carried and not worn, and a
 * body can wear fewer relics than it carries (or none).
 *
 * Pure helpers over a `Character`; the rules (capacity, which piece a full row
 * displaces) are the engine's `SLOT_CAPACITY` and `displacedBy`.
 */

import {
    displacedBy,
    isEquipment,
    type Character,
    type Equipment,
    type EquipmentSlot,
    type Item,
} from '@mechanics';

type EquipmentLoadout = Character['equipment'];

/** The worn pieces in `slot`, in loadout order (empty when none). */
export function wornInSlot(loadout: EquipmentLoadout, slot: EquipmentSlot): readonly Equipment[] {
    if (slot === 'weapon') return loadout.weapon ? [loadout.weapon] : [];
    if (slot === 'armor') return loadout.armor ? [loadout.armor] : [];
    return loadout.relics.flatMap((a) => (a ? [a] : []));
}

/** True iff the loadout wears a piece with this id. */
export function isWornId(loadout: EquipmentLoadout, id: string): boolean {
    return (
        loadout.weapon?.id === id
        || loadout.armor?.id === id
        || loadout.relics.some((a) => a?.id === id)
    );
}

/**
 * An equipment piece the player owns, by id: the inventory row first, then the
 * loadout (a hand-built character may wear a piece its inventory lacks).
 */
export function findOwnedEquipment(player: Character, id: string): Equipment | null {
    const carried = player.inventory.find((i: Item) => i.id === id);
    if (carried !== undefined) return isEquipment(carried) ? carried : null;
    const { weapon, armor, relics } = player.equipment;
    for (const piece of [weapon, armor, ...relics]) {
        if (piece && piece.id === id) return piece;
    }
    return null;
}

/**
 * The worn piece equipping `item` would take off, or `null` when a position is
 * free (or `item` is already worn). A full relic row gives up its last-worn
 * piece, the engine's `displacedBy` default.
 */
export function replacedByEquip(
    player: Character,
    item: Equipment,
    row?: DockRowId | null,
): Equipment | null {
    if (isWornId(player.equipment, item.id)) return null;
    const position = equipPositionFor(item, row);
    const { item: displaced } = displacedBy(
        player,
        item,
        position === undefined ? undefined : { position },
    );
    return displaced !== null && displaced.id !== item.id ? displaced : null;
}

/** The one loadout action an owned equipment piece offers. */
export interface LoadoutAction {
    mode: 'equip' | 'unequip';
    /**
     * `UNEQUIP`, or the put-on verb (`WEAR` for a relic, `EQUIP` otherwise),
     * as `<VERB> · REPLACE <NAME>` when the slot is full.
     */
    label: string;
    /** The worn piece an equip takes off; `null` for a free position or an unequip. */
    replacing: Equipment | null;
}

/**
 * Worn → UNEQUIP; unworn → WEAR (a relic) or EQUIP, naming the piece it
 * replaces: the piece in the picked row when one is picked, else the piece a
 * full slot gives up.
 */
export function loadoutActionFor(
    player: Character,
    item: Equipment,
    row?: DockRowId | null,
): LoadoutAction {
    if (isWornId(player.equipment, item.id)) {
        return { mode: 'unequip', label: 'UNEQUIP', replacing: null };
    }
    const replacing = replacedByEquip(player, item, row);
    const verb = item.grantsSignature ? 'WEAR' : 'EQUIP';
    return {
        mode: 'equip',
        label: replacing === null ? verb : `${verb} · REPLACE ${replacing.name.toUpperCase()}`,
        replacing,
    };
}

/** Which dock row is meant: the weapon, the armor, or one of the three relic positions. */
export type DockRowId = 'weapon' | 'armor' | 'relic-0' | 'relic-1' | 'relic-2';

/** One row of the loadout as the player reads it: the dock and the SELF sheet map over these. */
export interface LoadoutRow {
    /** The row's identity; the three relic rows never share one. */
    readonly id: DockRowId;
    /** Engine slot kind. */
    readonly key: EquipmentSlot;
    /** Which relic position this row is (0-2); absent on weapon and armor. */
    readonly relicIndex?: 0 | 1 | 2;
    /** Dock chrome label (uppercase, numbered for relics). */
    readonly dockLabel: string;
    /** SELF sheet label. */
    readonly selfLabel: string;
}

/**
 * The one order and wording of the loadout: Weapon, Armor, then three Relic
 * positions. A weapon or armor row stays on screen bare when nothing is worn.
 */
export const LOADOUT_ROWS: readonly LoadoutRow[] = [
    { id: 'weapon', key: 'weapon', dockLabel: 'WEAPON', selfLabel: 'Weapon' },
    { id: 'armor', key: 'armor', dockLabel: 'ARMOR', selfLabel: 'Armor' },
    { id: 'relic-0', key: 'relic', relicIndex: 0, dockLabel: 'RELIC I', selfLabel: 'Relic' },
    { id: 'relic-1', key: 'relic', relicIndex: 1, dockLabel: 'RELIC II', selfLabel: 'Relic' },
    { id: 'relic-2', key: 'relic', relicIndex: 2, dockLabel: 'RELIC III', selfLabel: 'Relic' },
];

/** The loadout row with this id. */
export function loadoutRowById(id: DockRowId): LoadoutRow {
    return LOADOUT_ROWS.find((row) => row.id === id) ?? LOADOUT_ROWS[0];
}

/** The engine slot kind a dock row holds (what its satchel filter shows). */
export function rowSlotKind(id: DockRowId): EquipmentSlot {
    return loadoutRowById(id).key;
}

/** The relic position (0-2) a row stands for; `undefined` for the weapon and armor rows. */
export function rowRelicPosition(id: DockRowId | null | undefined): 0 | 1 | 2 | undefined {
    return id == null ? undefined : loadoutRowById(id).relicIndex;
}

/**
 * The relic position that wearing `item` should fill because a row is picked,
 * or `undefined` for the engine's default (first empty position, else the last):
 * no row picked, a weapon or armor row picked, or a piece that is not a relic.
 */
export function equipPositionFor(
    item: Equipment,
    row: DockRowId | null | undefined,
): number | undefined {
    return item.slot === 'relic' ? rowRelicPosition(row) : undefined;
}

/** The piece worn in a loadout row, or `null` when the position is empty. */
export function wornAtRow(loadout: EquipmentLoadout, row: LoadoutRow): Equipment | null {
    if (row.key === 'weapon') return loadout.weapon ?? null;
    if (row.key === 'armor') return loadout.armor ?? null;
    return loadout.relics[row.relicIndex ?? 0] ?? null;
}

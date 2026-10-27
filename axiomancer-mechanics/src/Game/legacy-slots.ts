/**
 * Old-save equipment-slot re-slotting.
 *
 * Old saves can carry up to 7 independent slots
 * (`weapon | armor | accessory | head | body | hands | feet`), and saves up to
 * v38 call the third slot kind `accessory` (with an `accessoryKind` flavour
 * field and a loadout field named `accessories`). This module is the single,
 * permanent source of truth for folding both old shapes into the 3-kind /
 * 5-slot model (1 weapon + 1 armor + 3 relics). It lives in the Game (save)
 * module deliberately: the maps here must stay so old-save upgrades keep
 * working, and it is the one place outside `game.migrate.ts` allowed to name
 * the old slot words.
 */

import type { Equipment, EquipmentSlot } from '../Items/types';
import { SLOT_CAPACITY } from '../Items/types';
import type { EquipmentLoadout } from '../Character/types';
import { emptyLoadout } from '../Character/types';

/** The seven legacy slot literals. */
export type LegacySlot =
    | 'weapon' | 'armor' | 'accessory' | 'head' | 'body' | 'hands' | 'feet';

/** Where a legacy slot lands in the current model. */
export interface LegacySlotMapping {
    slot: EquipmentSlot;
}

/**
 * Fixed legacy → current slot mapping. `body` folds into `armor` (torso wear
 * is armor); `head`/`hands`/`feet` and the old `accessory` slot all fold into
 * `relic`. `weapon` and `armor` are unchanged.
 */
export const LEGACY_SLOT_MAP: Record<LegacySlot, LegacySlotMapping> = {
    weapon:    { slot: 'weapon' },
    armor:     { slot: 'armor' },
    body:      { slot: 'armor' },
    accessory: { slot: 'relic' },
    head:      { slot: 'relic' },
    hands:     { slot: 'relic' },
    feet:      { slot: 'relic' },
};

/**
 * The order legacy relic-family slots fill the 3 relic positions when
 * migrating a worn record: `accessory` first, then `head`, `hands`, `feet`.
 * The first 3 present stay worn; any remainder overflows.
 */
const RELIC_FILL_ORDER: readonly LegacySlot[] = ['accessory', 'head', 'hands', 'feet'];

/**
 * Re-slot a single persisted equipment piece to the current model: rewrites
 * `slot` via `LEGACY_SLOT_MAP` (so the old `accessory`, `head`, `hands` and
 * `feet` all become `relic`, `body` becomes `armor`) and drops the retired
 * `accessoryKind` flavour field. A piece already on the current model passes
 * through unchanged (same reference). Pure.
 *
 * This is the helper the v38 → v39 save hop applies to every equipment object,
 * and the one the mobile item-reward queue applies to a pending piece.
 */
export function reslotRelicPiece<T extends Equipment>(item: T): T {
    const raw = item as T & { accessoryKind?: unknown };
    const mapping = LEGACY_SLOT_MAP[raw.slot as LegacySlot];
    const nextSlot: EquipmentSlot = mapping ? mapping.slot : raw.slot;
    if (nextSlot === raw.slot && !('accessoryKind' in raw)) return item;
    const { accessoryKind: _drop, ...rest } = raw;
    return { ...rest, slot: nextSlot } as T;
}

/** The v11-era name for `reslotRelicPiece`; kept for the v11 → v12 hop. */
export const reslotLegacyEquipment = (item: Equipment): Equipment => reslotRelicPiece(item);

/**
 * Fold a legacy worn-equipment record into an `EquipmentLoadout`,
 * returning the loadout plus every piece that no longer fits (`overflow` — the
 * caller returns these to inventory). Deterministic:
 *
 *   - `weapon` → the weapon slot.
 *   - `armor` wins the armor slot; if both `armor` and `body` are worn, the
 *     `body` occupant overflows. A lone `body` takes the armor slot.
 *   - relics fill in fixed order `[accessory, head, hands, feet]`; the
 *     first 3 present stay worn, the rest overflow.
 *
 * Pure — the input record is not mutated.
 */
export function reslotLegacyLoadout(
    record: Partial<Record<LegacySlot, Equipment>>,
): { loadout: EquipmentLoadout; overflow: Equipment[] } {
    const loadout = emptyLoadout();
    const overflow: Equipment[] = [];

    if (record.weapon) loadout.weapon = reslotRelicPiece(record.weapon);

    if (record.armor) {
        loadout.armor = reslotRelicPiece(record.armor);
        if (record.body) overflow.push(reslotRelicPiece(record.body));
    } else if (record.body) {
        loadout.armor = reslotRelicPiece(record.body);
    }

    for (const legacySlot of RELIC_FILL_ORDER) {
        const piece = record[legacySlot];
        if (!piece) continue;
        const reslotted = reslotRelicPiece(piece);
        if (loadout.relics.length < SLOT_CAPACITY.relic) {
            loadout.relics.push(reslotted);
        } else {
            overflow.push(reslotted);
        }
    }

    return { loadout, overflow };
}

/** The pre-v39 name of the loadout's relic row. */
const OLD_RELIC_ROW = 'accessories';

/**
 * Deep-walk a raw save payload and bring every equipment piece and loadout in
 * it onto the relic model: each object with `category: 'equipment'` goes
 * through `reslotRelicPiece`, and each loadout-shaped object (it has `weapon`
 * and `armor` keys) has its old `accessories` row renamed to `relics`. Covers
 * the inventory, the worn loadout and inline quest rewards alike, wherever
 * they sit. Idempotent, pure (returns new objects only where something
 * changed; untouched subtrees keep their references).
 */
export function reslotRelicSave<T>(value: T): T {
    return walk(value) as T;
}

function walk(value: unknown): unknown {
    if (Array.isArray(value)) {
        let changed = false;
        const next = value.map(v => {
            const w = walk(v);
            if (w !== v) changed = true;
            return w;
        });
        return changed ? next : value;
    }
    if (!value || typeof value !== 'object') return value;

    const obj = value as Record<string, unknown>;
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(obj)) {
        const w = walk(v);
        if (w !== v) changed = true;
        next[key] = w;
    }

    if ('weapon' in next && 'armor' in next && OLD_RELIC_ROW in next) {
        const { [OLD_RELIC_ROW]: oldRow, ...rest } = next;
        const existing = Array.isArray(rest.relics) ? rest.relics : [];
        const moved = Array.isArray(oldRow) ? oldRow : [];
        return { ...rest, relics: [...existing, ...moved] };
    }

    const base = changed ? next : obj;
    if (base.category === 'equipment' && typeof base.slot === 'string') {
        const reslotted = reslotRelicPiece(base as unknown as Equipment);
        if (reslotted !== (base as unknown)) return reslotted;
    }
    return base;
}

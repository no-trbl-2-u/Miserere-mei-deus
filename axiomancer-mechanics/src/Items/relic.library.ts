/**
 * The signet relics. A relic is an ordinary `Equipment` that grants exactly
 * ONE signature (`grantsSignature`) while worn; signatures come from worn
 * equipment, not the player's archetype.
 *
 * Relic identity = `grantsSignature !== undefined` (plus the `relic-` id
 * prefix). There is no new item category and no slot marker.
 *
 * There are two, and a run starts with neither. The Suppliant's Ring (The
 * Open Hand) and the Bleeding Signet (+20 max VITAE, Crimson Covenant) have no
 * in-run source yet: no shop, loot or reward carries them. Old saves keep the
 * ring they were given; the dev menu's relic chips hand either over, worn
 * while a position is free.
 *
 * Every relic takes the `relic` slot, and a character wears up to three
 * (`SLOT_CAPACITY.relic`), so the Ring and the Signet are worn together
 * and both signatures are on the bar. A relic's flavour (a ring, a brooch, a
 * circlet) is its name alone; any relic fits any relic position.
 */

import type { Equipment } from './types';
import type { EquipmentLoadout } from '../Character/types';
import type { SignatureSkillId } from '../Combat/combat.encounter.types';

/**
 * The Suppliant's Ring. It carries no stat line; it grants The Open Hand (the
 * befriend) and nothing else.
 */
const SUPPLIANTS_RING: Equipment = {
    id: 'relic-disarming-plea',
    name: "Suppliant's Ring",
    description: 'Offer a foe that can be befriended the choice of mercy, once it is low enough.',
    category: 'equipment',
    slot: 'relic',
    statModifiers: [],
    grantsSignature: 'sig-disarming-plea',
};

/**
 * The Bleeding Signet (placeholder name): +20 max VITAE while worn, folded
 * onto `maxHealth` by the equip reducer like any `maxHp` line, and Crimson
 * Covenant.
 */
const BLEEDING_SIGNET: Equipment = {
    id: 'relic-bleeding-signet',
    name: 'Bleeding Signet',
    description: '+20 max VITAE while worn. TETHER 3, and your next SACRIFICE this turn counts twice.',
    category: 'equipment',
    slot: 'relic',
    statModifiers: [{ stat: 'maxHp', value: 20 }],
    grantsSignature: 'sig-crimson-covenant',
};

/** A fresh copy of a relic (never aliases the library singleton). */
export function cloneRelic(relic: Equipment): Equipment {
    return { ...relic, statModifiers: (relic.statModifiers ?? []).map(m => ({ ...m })) };
}

/**
 * The relics as canonical singletons (source of truth). Callers that
 * mutate/equip should clone via `cloneRelic` — combat and the equip
 * reducers deep-clone the wearer, but the library itself must never be aliased
 * into a mutable character.
 */
export const relicLibrary: readonly Equipment[] = [SUPPLIANTS_RING, BLEEDING_SIGNET];

/** Resolve a relic by id (returns the canonical singleton, not a clone). */
export function getRelicById(id: string): Equipment | undefined {
    return relicLibrary.find(r => r.id === id);
}

/**
 * The signatures granted by a worn loadout: the worn relics' `grantsSignature`
 * values in relic-position order, de-duplicated (first occurrence wins). Only
 * the relic slot grants signatures; the weapon and armor never do. Replaces
 * `SIGNATURE_KITS[archetype]` at combat-init. An empty loadout yields `[]`
 * (combat legally begins with zero signatures and resolves via cards).
 */
export function getSignaturesForLoadout(loadout: EquipmentLoadout): SignatureSkillId[] {
    const out: SignatureSkillId[] = [];
    const seen = new Set<SignatureSkillId>();
    for (const piece of loadout.relics) {
        const sig = piece.grantsSignature;
        if (sig && !seen.has(sig)) {
            seen.add(sig);
            out.push(sig);
        }
    }
    return out;
}

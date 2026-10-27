/**
 * The signet relics. A relic is an ordinary `Equipment` that grants exactly
 * ONE signature (`grantsSignature`) while worn; signatures come from worn
 * equipment, not the player's archetype.
 *
 * Relic identity = `grantsSignature !== undefined` (plus the `relic-` id
 * prefix). There is no new item category and no slot marker.
 *
 * The relics and where each comes from (`relicSource`):
 *
 *   Suppliant's Ring (The Open Hand)  no lane     no source (no longer handed out)
 *   Crimson Circlet (Crimson Return)  Blood Price elite only
 *   Ruby Signet (Ruby Tithe)          Blood Price quest
 *   Bleeding Signet (Open Vein)       Blood Price quest
 *
 * A run starts with none. The dev menu's relic chips hand any over, worn
 * while a position is free.
 *
 * Relics are accessories, and a character wears up to three
 * (`SLOT_CAPACITY.accessory`), so their signatures share the bar.
 *
 * A worn relic's stat lines and signature are read from the library entry by
 * id when there is one (`relicStatLines`, `getSignaturesForLoadout`), so a
 * saved copy takes the current entry's.
 */

import type { Equipment } from './types';
import type { StatModifier } from '../Effects/types';
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
    slot: 'accessory',
    accessoryKind: 'ring',
    statModifiers: [],
    grantsSignature: 'sig-disarming-plea',
};

/**
 * The Crimson Circlet (T's): +5 Body, +20 max VITAE, and Crimson Return (◆5):
 * the next SACRIFICE heals instead of costing. Elite only.
 */
const CRIMSON_CIRCLET: Equipment = {
    id: 'relic-crimson-circlet',
    name: 'Crimson Circlet',
    description: '+5 Body and +20 max VITAE while worn. Your next SACRIFICE heals you instead of costing VITAE; it still counts as a SACRIFICE.',
    category: 'equipment',
    slot: 'accessory',
    accessoryKind: 'head',
    statModifiers: [{ stat: 'body', value: 5 }, { stat: 'maxHp', value: 20 }],
    grantsSignature: 'sig-crimson-circlet',
    laneId: 'blood-price',
    relicSource: 'elite',
};

/**
 * The Ruby Signet (T's): +5 Heart, and Ruby Tithe (◆3): the next SACRIFICE
 * also adds LEECH equal to the VITAE paid. A quest's reward.
 */
const RUBY_SIGNET: Equipment = {
    id: 'relic-ruby-signet',
    name: 'Ruby Signet',
    description: '+5 Heart while worn. Your next SACRIFICE also gives the foe LEECH equal to the VITAE paid.',
    category: 'equipment',
    slot: 'accessory',
    accessoryKind: 'ring',
    statModifiers: [{ stat: 'heart', value: 5 }],
    grantsSignature: 'sig-ruby-signet',
    laneId: 'blood-price',
    relicSource: 'quest',
};

/**
 * The Bleeding Signet (T's rework): +5 Mind (its old +20 max VITAE is gone),
 * and Open Vein (◆4): HEAL 5, then trigger the foe's LEECH. A quest's reward.
 */
const BLEEDING_SIGNET: Equipment = {
    id: 'relic-bleeding-signet',
    name: 'Bleeding Signet',
    description: "+5 Mind while worn. HEAL 5, then trigger the foe's LEECH.",
    category: 'equipment',
    slot: 'accessory',
    accessoryKind: 'ring',
    statModifiers: [{ stat: 'mind', value: 5 }],
    grantsSignature: 'sig-bleeding-signet',
    laneId: 'blood-price',
    relicSource: 'quest',
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
export const relicLibrary: readonly Equipment[] = [SUPPLIANTS_RING, CRIMSON_CIRCLET, RUBY_SIGNET, BLEEDING_SIGNET];

/** Resolve a relic by id (returns the canonical singleton, not a clone). */
export function getRelicById(id: string): Equipment | undefined {
    return relicLibrary.find(r => r.id === id);
}

/**
 * A worn piece's stat lines: the library entry's when the piece is a library
 * relic (so a saved copy takes the current lines), else the piece's own.
 */
export function relicStatLines(piece: Equipment): readonly StatModifier[] {
    return getRelicById(piece.id)?.statModifiers ?? piece.statModifiers ?? [];
}

/**
 * The signatures granted by a worn loadout, in stable slot order (weapon, armor,
 * accessories), de-duplicated (first occurrence wins). A library relic grants
 * its library entry's signature, so a saved copy takes the current one. An
 * empty loadout yields `[]` (combat legally begins with zero signatures and
 * resolves via cards).
 */
export function getSignaturesForLoadout(loadout: EquipmentLoadout): SignatureSkillId[] {
    const ordered: Equipment[] = [];
    if (loadout.weapon) ordered.push(loadout.weapon);
    if (loadout.armor) ordered.push(loadout.armor);
    for (const a of loadout.accessories) ordered.push(a);

    const out: SignatureSkillId[] = [];
    const seen = new Set<SignatureSkillId>();
    for (const piece of ordered) {
        const sig = getRelicById(piece.id)?.grantsSignature ?? piece.grantsSignature;
        if (sig && !seen.has(sig)) {
            seen.add(sig);
            out.push(sig);
        }
    }
    return out;
}

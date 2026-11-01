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
 *   Suppliant's Ring (The Open Hand)  Merciful    elite drop
 *   Crimson Circlet (Crimson Return)  Blood Price elite drop
 *   Ruby Signet (Ruby Tithe)          Blood Price quest
 *   Bleeding Signet (Open Vein)       Blood Price quest
 *   Elementalist's Signet             Elementalist elite drop
 *   Elementalist's Brooch             Elementalist quest
 *   Elementalist's Belt               Elementalist quest
 *   Thornback Signet                  Defender      elite drop
 *   Mirror Brooch                     Defender      quest
 *   Carapace Belt                     Defender      quest
 *
 * `relicSource` says where the elite drop draws from when a fight lists no
 * drops of its own (`eliteRelicPool`); it does not limit who may pay a relic.
 * No relic is elite-only: a quest may pay any lane relic, the elite-drop ones
 * included (T, 2026-10-28).
 *
 * A run starts with none. The dev menu's relic chips hand any over, worn
 * while a position is free.
 *
 * Every relic takes the `relic` slot, and a character wears up to three
 * (`SLOT_CAPACITY.relic`), so their signatures share the bar. A relic's
 * flavour (a ring, a brooch, a circlet) is its name alone; any relic fits any
 * relic position.
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
    slot: 'relic',
    statModifiers: [],
    grantsSignature: 'sig-disarming-plea',
    laneId: 'merciful',
    relicSource: 'elite',
};

/**
 * The Crimson Circlet (T's): +5 Body, +20 max VITAE, and Crimson Return (◆5):
 * the next SACRIFICE heals instead of costing. The elite drop's; a quest may pay it too.
 */
const CRIMSON_CIRCLET: Equipment = {
    id: 'relic-crimson-circlet',
    name: 'Crimson Circlet',
    description: '+5 Body and +20 max VITAE while worn. Your next SACRIFICE heals you instead of costing VITAE; it still counts as a SACRIFICE.',
    category: 'equipment',
    slot: 'relic',
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
    slot: 'relic',
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
    slot: 'relic',
    statModifiers: [{ stat: 'mind', value: 5 }],
    grantsSignature: 'sig-bleeding-signet',
    laneId: 'blood-price',
    relicSource: 'quest',
};

/**
 * The Elementalist's Signet (T's): +5 Heart, +20 max VITAE, and Eye of the
 * Storm (◆6): clear your INFERNO, then trigger the foe's STORM. The elite drop's; a quest may pay it too.
 */
const ELEMENTALIST_SIGNET: Equipment = {
    id: 'relic-elementalist-signet',
    name: "Elementalist's Signet",
    description: "+5 Heart and +20 max VITAE while worn. Clear your INFERNO, then trigger the foe's STORM.",
    category: 'equipment',
    slot: 'relic',
    statModifiers: [{ stat: 'heart', value: 5 }, { stat: 'maxHp', value: 20 }],
    grantsSignature: 'sig-elementalist-signet',
    laneId: 'elementalist',
    relicSource: 'elite',
};

/**
 * The Elementalist's Brooch (T's): +5 Mind, and Kindle the Gale (◆4): the
 * foe-only INFERNO becomes STORM; the shared stack stays. A quest's reward.
 */
const ELEMENTALIST_BROOCH: Equipment = {
    id: 'relic-elementalist-brooch',
    name: "Elementalist's Brooch",
    description: "+5 Mind while worn. Turn the foe's own INFERNO into STORM; INFERNO that burns you too stays.",
    category: 'equipment',
    slot: 'relic',
    statModifiers: [{ stat: 'mind', value: 5 }],
    grantsSignature: 'sig-elementalist-brooch',
    laneId: 'elementalist',
    relicSource: 'quest',
};

/**
 * The Elementalist's Belt (T's): +5 Body, and Thaw into Thunder (◆3): all
 * BLIZZARD becomes STORM. A quest's reward.
 */
const ELEMENTALIST_BELT: Equipment = {
    id: 'relic-elementalist-belt',
    name: "Elementalist's Belt",
    description: '+5 Body while worn. Turn all BLIZZARD into STORM.',
    category: 'equipment',
    slot: 'relic',
    statModifiers: [{ stat: 'body', value: 5 }],
    grantsSignature: 'sig-elementalist-belt',
    laneId: 'elementalist',
    relicSource: 'quest',
};

/**
 * The Thornback Signet (T's): +5 Heart, +20 max VITAE, and Thorn Mantle (◆5):
 * THORNS equal to your GUARD. The elite drop's; a quest may pay it too.
 */
const THORNBACK_SIGNET: Equipment = {
    id: 'relic-thornback-signet',
    name: 'Thornback Signet',
    description: '+5 Heart and +20 max VITAE while worn. Gain THORNS equal to your GUARD.',
    category: 'equipment',
    slot: 'relic',
    statModifiers: [{ stat: 'heart', value: 5 }, { stat: 'maxHp', value: 20 }],
    grantsSignature: 'sig-defender-signet',
    laneId: 'defender',
    relicSource: 'elite',
};

/**
 * The Mirror Brooch (T's): +5 Mind, and Mirror Ward (◆3): REFLECT 50%. A
 * quest's reward (no quest hands it out yet).
 */
const MIRROR_BROOCH: Equipment = {
    id: 'relic-mirror-brooch',
    name: 'Mirror Brooch',
    description: '+5 Mind while worn. Gain REFLECT 50%.',
    category: 'equipment',
    slot: 'relic',
    statModifiers: [{ stat: 'mind', value: 5 }],
    grantsSignature: 'sig-defender-brooch',
    laneId: 'defender',
    relicSource: 'quest',
};

/**
 * The Carapace Belt (T's): +5 Body, and Hold the Line (◆4): your GUARD is not
 * lost at the end of the foe's next turn. A quest's reward (no quest hands it
 * out yet).
 */
const CARAPACE_BELT: Equipment = {
    id: 'relic-carapace-belt',
    name: 'Carapace Belt',
    description: "+5 Body while worn. Your GUARD isn't lost at the end of the foe's next turn.",
    category: 'equipment',
    slot: 'relic',
    statModifiers: [{ stat: 'body', value: 5 }],
    grantsSignature: 'sig-defender-belt',
    laneId: 'defender',
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
export const relicLibrary: readonly Equipment[] = [
    SUPPLIANTS_RING, CRIMSON_CIRCLET, RUBY_SIGNET, BLEEDING_SIGNET,
    ELEMENTALIST_SIGNET, ELEMENTALIST_BROOCH, ELEMENTALIST_BELT,
    THORNBACK_SIGNET, MIRROR_BROOCH, CARAPACE_BELT,
];

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
 * The signatures granted by a worn loadout: the worn relics' signatures in
 * relic-position order, de-duplicated (first occurrence wins). Only the relic
 * slot grants signatures; the weapon and armor never do. A library relic
 * grants its library entry's signature, so a saved copy takes the current one.
 * An empty loadout yields `[]` (combat legally begins with zero signatures and
 * resolves via cards).
 */
export function getSignaturesForLoadout(loadout: EquipmentLoadout): SignatureSkillId[] {
    const out: SignatureSkillId[] = [];
    const seen = new Set<SignatureSkillId>();
    for (const piece of loadout.relics) {
        if (!piece) continue;
        const sig = getRelicById(piece.id)?.grantsSignature ?? piece.grantsSignature;
        if (sig && !seen.has(sig)) {
            seen.add(sig);
            out.push(sig);
        }
    }
    return out;
}

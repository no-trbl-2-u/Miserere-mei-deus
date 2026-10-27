/**
 * Character presets — pre-built characters for testing and tooling.
 *
 * Presets are load-bearing — mobile's DEV preset picker
 * (`applyCharacterPreset`), the Playtest runner, and the Tuning
 * difficulty bands all consume them. They are a supported public
 * surface until those consumers migrate.
 *
 * Each preset is a declarative recipe. `buildCharacterFromPreset` lifts
 * the recipe into a real `Character` by calling `createCharacter`
 * through the canonical path: the fixed signet-relic loadout is seeded by
 * `createCharacter` (there is no procedural `dropItem` equipment path —
 * see `buildCharacterFromPreset`), and consumables are cloned from the
 * shared `consumableLibrary` so the canonical library is never
 * mutated.
 */

import { Character, BaseStats } from './types';
import { createCharacter } from './index';
import { consumableLibrary } from '../Items/consumable.library';
import type { Item } from '../Items/types';

export interface CharacterPresetEquipmentEntry {
    /**
     * EquipmentTemplate id (e.g. 'iron-blade'). The dropped item's slot kind is
     * taken from the template itself (presets do not restate the slot).
     * Declaration order is the equip order: the worn loadout takes the
     * first weapon, first armor, and first 3 relics; the rest seed the
     * inventory.
     */
    templateId: string;
}

export interface CharacterPreset {
    id: string;
    name: string;
    /** Short blurb shown in the picker. */
    summary: string;
    level: number;
    baseStats: BaseStats;
    /** Vestigial: there is no procedural equipment library, so these entries
     *  resolve to nothing (see `buildCharacterFromPreset`). */
    equipment: CharacterPresetEquipmentEntry[];
    /** Card IDs the character knows. The full known set is the combat
     *  catalogue (ADR-0002); there is no equipped-card rotation. */
    knownCards: string[];
    /** Consumable IDs (and quantities) to seed the inventory. */
    consumables: { id: string; quantity: number }[];
    currency: number;
}

// Every preset's `baseStats` total is exactly what a pilgrim of its level
// can bank: the 15 points a new game starts with plus
// `STAT_POINTS_PER_LEVEL` for each level after the first. The guard is
// `presets.engine.test.ts` "stat curve".

// ─── Preset records ───────────────────────────────────────────────────────────

// Every preset seeds the grey deck a fresh run opens with (Blow 5 / Ward 3 /
// Word 2 — mirrors `STARTING_CARD_IDS`).
const TIER_1_CARDS = [
    'grey-strike', 'grey-strike', 'grey-strike', 'grey-strike', 'grey-strike',
    'grey-ward', 'grey-ward', 'grey-ward',
    'grey-word', 'grey-word',
];

const TIER_2_CARDS: string[] = [];

const TIER_3_CARDS: string[] = [];

const TIER_2_SYNERGY_CARDS: string[] = [];

export const apprenticePreset: CharacterPreset = {
    id: 'apprentice',
    name: 'Apprentice',
    summary: 'Just stepping out — balanced stats, basic cards, no gear.',
    level: 1,
    baseStats: { heart: 5, body: 5, mind: 5 },
    equipment: [],
    knownCards: [...TIER_1_CARDS],
    consumables: [
        { id: 'minor-healing-potion', quantity: 3 },
    ],
    currency: 0,
};

export const wandererPreset: CharacterPreset = {
    id: 'wanderer',
    name: 'Wanderer',
    summary: 'Mid-game — light armor, mixed-tier cards, a pouch of shillings.',
    level: 8,
    baseStats: { heart: 7, body: 8, mind: 7 },
    equipment: [
        { templateId: 'iron-blade' },
        { templateId: 'hide-vest' },
        { templateId: 'leather-cap' },
    ],
    knownCards: [...TIER_1_CARDS, ...TIER_2_CARDS, ...TIER_2_SYNERGY_CARDS],
    consumables: [
        { id: 'healing-potion', quantity: 5 },
    ],
    currency: 25,
};

export const sagePreset: CharacterPreset = {
    id: 'sage',
    name: 'Sage',
    summary: 'Late-game — mid-tier kit, every card known, paradox in reach.',
    level: 15,
    baseStats: { heart: 8, body: 11, mind: 10 },
    equipment: [
        { templateId: 'steel-blade' },
        { templateId: 'chain-mail' },
        { templateId: 'chain-coif' },
    ],
    knownCards: [...TIER_1_CARDS, ...TIER_2_CARDS, ...TIER_3_CARDS, ...TIER_2_SYNERGY_CARDS],
    consumables: [
        { id: 'healing-potion', quantity: 6 },
    ],
    currency: 75,
};

export const characterPresets: CharacterPreset[] = [
    apprenticePreset, wandererPreset, sagePreset,
];

// ─── Level-ladder presets (evidence / tooling) ──────────────────────────────────
//
// A finer, level-explicit ladder (L1 / L15 / L30 / L50) used by consumer
// dev tooling for reproducible combat / encounter evidence runs. Kept in a
// SEPARATE array so the canonical archetype picker (`characterPresets`)
// stays apprentice / wanderer / sage; `getPresetById` searches both.
// Previously authored client-side (`axiomancer-mobile`); moved here so the
// engine owns the preset data (curated level / stat / card / gear
// selection) — `buildCharacterFromPreset` validates every consumable id at build time.

export const ladderL1Preset: CharacterPreset = {
    id: 'kid-l1',
    name: 'Ladder · L1',
    summary: 'Tier-1 evidence baseline.',
    level: 1,
    baseStats: { heart: 5, body: 5, mind: 5 },
    equipment: [],
    knownCards: [...TIER_1_CARDS],
    consumables: [{ id: 'minor-healing-potion', quantity: 3 }],
    currency: 0,
};

export const ladderL15Preset: CharacterPreset = {
    id: 'kid-l15',
    name: 'Ladder · L15',
    summary: 'Mid-tier evidence kit.',
    level: 15,
    baseStats: { heart: 9, body: 11, mind: 9 },
    equipment: [
        { templateId: 'steel-blade' },
        { templateId: 'chain-mail' },
        { templateId: 'chain-coif' },
        { templateId: 'leather-coat' },
        { templateId: 'chain-gauntlets' },
        { templateId: 'leather-boots' },
        { templateId: 'silver-ring' },
    ],
    knownCards: [...TIER_1_CARDS, ...TIER_2_CARDS, ...TIER_2_SYNERGY_CARDS],
    consumables: [
        { id: 'healing-potion', quantity: 5 },
    ],
    currency: 50,
};

export const ladderL30Preset: CharacterPreset = {
    id: 'kid-l30',
    name: 'Ladder · L30',
    summary: 'Late-tier evidence kit.',
    level: 30,
    baseStats: { heart: 14, body: 16, mind: 14 },
    equipment: [
        { templateId: 'mithril-blade' },
        { templateId: 'plate-mail' },
        { templateId: 'full-helm' },
        { templateId: 'scaled-coat' },
        { templateId: 'plate-gauntlets' },
        { templateId: 'iron-greaves' },
        { templateId: 'gold-ring' },
    ],
    knownCards: [
        ...TIER_1_CARDS,
        ...TIER_2_CARDS,
        ...TIER_3_CARDS,
        ...TIER_2_SYNERGY_CARDS,
    ],
    consumables: [
        { id: 'greater-healing-potion', quantity: 6 },
    ],
    currency: 250,
};

export const ladderL50Preset: CharacterPreset = {
    id: 'kid-l50',
    name: 'Ladder · L50',
    summary: 'Endgame evidence kit.',
    level: 50,
    baseStats: { heart: 21, body: 22, mind: 21 },
    // Top-tier curated affixed L20 variants — the highest requiredLevel
    // rows the library ships — so the build still arrives geared and
    // affix-backed.
    equipment: [
        { templateId: 'savage-mithril-blade-of-ruin' },
        { templateId: 'adamant-plate-mail-of-warding' },
        { templateId: 'full-helm-of-insight' },
        { templateId: 'scaled-coat-of-thorns' },
        { templateId: 'plate-gauntlets-of-the-duelist' },
        { templateId: 'phantom-iron-greaves-of-shadows' },
        { templateId: 'silver-ring-of-resilience' },
    ],
    knownCards: [
        ...TIER_1_CARDS,
        ...TIER_2_CARDS,
        ...TIER_3_CARDS,
        ...TIER_2_SYNERGY_CARDS,
    ],
    consumables: [
        { id: 'greater-healing-potion', quantity: 8 },
    ],
    currency: 1000,
};

/** Level-explicit evidence ladder. Not part of `characterPresets`. */
export const levelLadderPresets: CharacterPreset[] = [
    ladderL1Preset, ladderL15Preset, ladderL30Preset, ladderL50Preset,
];

export function getPresetById(id: string): CharacterPreset | undefined {
    return characterPresets.find(p => p.id === id)
        ?? levelLadderPresets.find(p => p.id === id);
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildCharacterFromPreset(preset: CharacterPreset): Character {
    const consumables: Item[] = preset.consumables.map(({ id, quantity }) => {
        const source = consumableLibrary.find(c => c.id === id);
        if (!source) {
            throw new Error(`buildCharacterFromPreset: unknown consumable id '${id}'.`);
        }
        return { ...source, quantity };
    });

    // The declared `preset.equipment` template entries resolve to nothing
    // (there is no procedural gear), so presets carry only their consumables
    // and wear no relic (a run starts with none). The `equipment` field stays
    // on the recipe as vestigial metadata.
    return createCharacter({
        name: preset.name,
        level: preset.level,
        baseStats: preset.baseStats,
        currency: preset.currency,
        inventory: consumables,
        knownCards: preset.knownCards,
    });
}

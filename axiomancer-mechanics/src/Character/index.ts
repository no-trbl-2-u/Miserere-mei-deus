import { Character, BaseStats, PreviewAllocation, PreviewResult, emptyLoadout } from './types';
import { ActiveEffect } from '../Effects/types';
import { Equipment, Item } from '../Items/types';
import { calculateMaxHealth } from '../Utils';
import { getRng } from '../Utils/rng';
import { experienceForLevel } from './experience';
import { equipItem, wornMaxHpBonus } from './equipment.reducer';

/**
 * Produce a stable character id drawn from `getRng()`. Seeded
 * tests inherit determinism; production gets a non-colliding 8-char base36
 * suffix that's good enough for in-process attribution. Not a true UUID
 * because the package ships into React Native and we don't want a
 * Node-only `crypto` import on the core barrel.
 */
function generateCharacterId(): string {
    const r = getRng().random();
    const suffix = Math.floor(r * 36 ** 8).toString(36).padStart(8, '0');
    return `char-${suffix}`;
}

/**
 * Inputs required to create a new Character.
 */
export interface CreateCharacterOptions {
    /**
     * Stable identifier. Auto-generated via `getRng()` when omitted so every
     * Character ships with a non-empty `id`. Supply explicitly when you need
     * a deterministic id (e.g. fixtures that pin `ActiveEffect.sourceId`).
     */
    id?: string;
    name: string;
    level: number;
    baseStats: BaseStats;
    inventory?: Item[];
    /** Starting currency. Defaults to 0. */
    currency?: number;
    /**
     * Optional starting equipment as an ordered list of pieces to equip.
     * Each is equipped via `equipItem`, so weapon/armor replace in
     * place and relics fill the first 3 free positions (a 4th relic is
     * a guarded no-op — order the list so the worn 3 come first). A worn
     * armor relic's +max VITAE is folded in at create-time, so the returned
     * `Character` is already "post-equipment".
     */
    equipment?: Equipment[];
    effects?: ActiveEffect[];
    knownCards?: string[];
}

/**
 * Builds a fully-initialised Character. Max VITAE is computed from
 * `baseStats` (plus any worn armor relic's bonus).
 */
export function createCharacter(options: CreateCharacterOptions): Character {
    const {
        id, name, level, baseStats, inventory = [], currency = 0, equipment = [], effects = [],
        knownCards = [],
    } = options;

    const maxHealth = calculateMaxHealth(level, baseStats);

    const baseChar: Character = {
        id: id ?? generateCharacterId(),
        name,
        level,
        experience: experienceForLevel(level),
        experienceToNextLevel: experienceForLevel(level + 1),
        health: maxHealth,
        maxHealth,
        baseStats,
        inventory: [...inventory],
        currency,
        equipment: emptyLoadout(),
        effects,
        knownCards,
        availableStatPoints: 0,
    };

    // Equip every worn piece in order so the maxHp fold gets applied via the
    // canonical path (weapon/armor replace,
    // relics fill the first 3 positions).
    let initialised = baseChar;
    for (const piece of equipment) {
        initialised = equipItem(initialised, piece);
    }
    return initialised;
}

/**
 * Spend one entry from `availableStatPoints` to raise the
 * named base stat by 1, recompute maxHealth, and grow current HP by the
 * maxHealth delta.
 *
 * Returns the unchanged character (and logs a warning at the call site,
 * not here) when `availableStatPoints <= 0`.
 *
 * Pure; equipment passives are not touched — only the base-stat math.
 */
export function allocateStatPoint(
    character: Character,
    stat: 'heart' | 'body' | 'mind',
): Character {
    if (character.availableStatPoints <= 0) return character;

    const nextBase: BaseStats = {
        ...character.baseStats,
        [stat]: character.baseStats[stat] + 1,
    };
    // Tier 0 item 4 (TRIM THE FAT T2a): keep the worn armor relics' bonus.
    const nextMaxHealth = calculateMaxHealth(character.level, nextBase) + wornMaxHpBonus(character.equipment);
    // Grow current HP by the maxHealth delta — allocation isn't a free
    // heal, but neither does raising max-HP leave the player stuck below
    // the new ceiling.
    const hpDelta = nextMaxHealth - character.maxHealth;

    return {
        ...character,
        baseStats:           nextBase,
        maxHealth:           nextMaxHealth,
        health:              character.health + hpDelta,
        availableStatPoints: character.availableStatPoints - 1,
    };
}

/**
 * Preview max VITAE for a hypothetical stat point allocation, so
 * the mobile level-up modal never duplicates the engine's VITAE formula.
 *
 * Takes current base stats, character level, and allocation delta. Returns computed
 * stats without mutating any character data. Pure function.
 */
export function previewStatAllocation(
    baseStats: BaseStats,
    level: number,
    allocation: PreviewAllocation,
): PreviewResult {
    // Apply allocation deltas additively to base stats
    const previewStats: BaseStats = {
        heart: baseStats.heart + allocation.heart,
        body: baseStats.body + allocation.body,
        mind: baseStats.mind + allocation.mind,
    };

    return { maxHealth: calculateMaxHealth(level, previewStats) };
}

export type { Character, BaseStats } from './types';
export { equipItem, unequipItem, moveRelic, relicPositions, getEquippedItems } from './equipment.reducer';
export { computeEquipDelta } from './equip-delta';
export { experienceForLevel, experienceToNext, levelForExperience } from './experience';
export type {
    EquipDelta,
    SignatureDeltaEntry,
} from './equip-delta';
export {
    validateDieGear, concreteDefaultRail,
    dieSpecialCap, dieGearMissFaces,
    DIE_GEAR_COLORS,
} from './dieGear.reducer';
export type { DieGearColor, DieGearRail } from './dieGear.reducer';
export {
    characterPresets,
    levelLadderPresets,
    getPresetById, buildCharacterFromPreset,
} from './presets';
export type { CharacterPreset } from './presets';
export {
    CHARACTER_ROSTER, CHARACTER_GREY_DECK, FRESH_RUN_BASE_STATS, FRESH_RUN_STAT_BUDGET,
    getCharacterDefinition, characterDeck, characterProblems,
} from './roster';
export type { CharacterDefinition, CharacterProblem, CharacterProblemCode } from './roster';

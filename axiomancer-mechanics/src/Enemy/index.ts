import { Card } from '../Cards/types';
import { MapName } from '../World/map.library';
import { ActiveEffect } from '../Effects/types';
import { BaseStats } from '../Character/types';
import {
    ENEMY_STAT_PER_LEVEL, ENEMY_GEAR_TIER_PER_LEVEL,
    ENEMY_VITAE_BASE, ENEMY_VITAE_PER_LEVEL, ENEMY_VITAE_MULT,
} from '../Game/game-mechanics.constants';
import {
    Enemy, EnemyLogic, EnemyDifficulty, LootTableEntry,
    FriendshipReward, BefriendabilityConfig,
    FinalBlowLines, PactLines, CauseLines,
    CodexEntry, EnemyPhase,
} from './types';
import type { EnemyKeyword, EnemyStage } from './enemy-keywords';

/**
 * Inputs required to create a new Enemy.
 */
export interface CreateEnemyOptions {
    id: string;
    name: string;
    description: string;
    level: number;
    baseStats: BaseStats;
    mapName: MapName;
    logic: EnemyLogic;
    difficulty?: EnemyDifficulty;
    cards?: Card[];
    loot?: LootTableEntry[];
    xpReward?: number;
    effects?: ActiveEffect[];
    /** Optional per-enemy friendship-resolution content. */
    friendshipReward?: FriendshipReward;
    /**
     * Optional per-enemy override of the friendship-eligibility predicate.
     * When undefined, the default eligibility rule applies.
     */
    befriendabilityConfig?: BefriendabilityConfig;
    /** Optional per-foe victory final-blow chronicle prose. */
    finalBlowLines?: FinalBlowLines;
    /** Optional per-foe friendship-pact chronicle prose. */
    pactLines?: PactLines;
    /** Optional per-foe defeat / cause-of-loss chronicle prose. */
    causeLines?: CauseLines;
    /** Optional per-foe codex / journal entry. */
    journalEntry?: CodexEntry;
    /** Content-provenance metadata. */
    addedIn?: string;
    tags?: string[];
    /** Asset id for the enemy's combat portrait (kebab-case). */
    portraitAsset?: string;
    /**
     * Authored VITAE pool. Overrides the difficulty
     * curve in {@link enemyVitae}. Every boss and unique authors this; ordinary
     * foes let the curve decide.
     */
    vitae?: number;
    /** Combat keywords. None are defined yet. */
    keywords?: EnemyKeyword[];
    /** Boss/unique stage thresholds. */
    stages?: EnemyStage[];
    /** HP phases (see `Enemy.phases`). A foe with phases gets no default stages. */
    phases?: EnemyPhase[];
}

/**
 * The VITAE pool a player has to chew through.
 *
 * Enemies do not use the player's per-stat health formula: `baseStats`
 * drives derived combat stats and befriend logic, but the
 * pool is its own number so the difficulty bands separate cleanly and a boss
 * can be a wall without a grotesque stat budget.
 *
 *   vitae = round((ENEMY_VITAE_BASE + ENEMY_VITAE_PER_LEVEL × level)
 *                 × ENEMY_VITAE_MULT[difficulty])
 *
 * An authored `vitae` always wins (every boss and unique authors one).
 *
 * @param level      - Enemy level.
 * @param difficulty - Difficulty band; absent is treated as `normal`.
 * @param authored   - An authored override, used verbatim when > 0.
 */
export function enemyVitae(
    level: number,
    difficulty: EnemyDifficulty | undefined,
    authored?: number,
): number {
    if (authored !== undefined && authored > 0) return Math.round(authored);
    const mult = ENEMY_VITAE_MULT[difficulty ?? 'normal'];
    return Math.round((ENEMY_VITAE_BASE + ENEMY_VITAE_PER_LEVEL * Math.max(0, level)) * mult);
}

/**
 * Default XP grant on kill by difficulty band. Strategy authors can override
 * per-enemy with `xpReward`.
 */
export const DEFAULT_XP_BY_DIFFICULTY: Record<EnemyDifficulty, number> = {
    simple: 10,
    normal: 20,
    elite:  50,
    boss:   200,
    unique: 500,
};

/**
 * Distributes an enemy's total stat budget (`level × ENEMY_STAT_PER_LEVEL`)
 * across heart / body / mind according to a normalised weight triple, then
 * applies an optional gear-tier bonus weighted toward defensive stats.
 *
 * Used by budget-scaled enemies (and by the tuning workflow's enemy scaler)
 * so a single `ENEMY_STAT_PER_LEVEL` knob governs global enemy power. The
 * returned stats always sum to the rounded budget; any rounding remainder is
 * folded into the largest-weight stat so the total stays exact.
 *
 * @param level   - Enemy level.
 * @param weights - Relative heart/body/mind weighting (need not sum to 1).
 * @param perLevel - Override for `ENEMY_STAT_PER_LEVEL` (the tuner passes a
 *                   candidate value when A/B-testing the scaling constant).
 * @param gearTierPerLevel - Override for `ENEMY_GEAR_TIER_PER_LEVEL` (the tuner
 *                          passes a candidate value when A/B-testing the gear scaling).
 */
export function enemyStatBudget(
    level: number,
    weights: BaseStats = { heart: 1, body: 1, mind: 1 },
    perLevel: number = ENEMY_STAT_PER_LEVEL,
    gearTierPerLevel: number = ENEMY_GEAR_TIER_PER_LEVEL,
): BaseStats {
    const total = Math.max(0, Math.round(level * perLevel));
    const order: (keyof BaseStats)[] = (['body', 'mind', 'heart'] as (keyof BaseStats)[])
        .sort((a, b) => weights[b] - weights[a]);

    // Distribute `budget` across stats by weight, exact-sum, remainder to the
    // highest-weighted stats first.
    const distribute = (budget: number): BaseStats => {
        const weightSum = weights.heart + weights.body + weights.mind || 1;
        const out: BaseStats = {
            heart: Math.floor((weights.heart / weightSum) * budget),
            body: Math.floor((weights.body / weightSum) * budget),
            mind: Math.floor((weights.mind / weightSum) * budget),
        };
        let remainder = budget - (out.heart + out.body + out.mind);
        let i = 0;
        while (remainder > 0) {
            out[order[i % order.length]!] += 1;
            remainder -= 1;
            i += 1;
        }
        return out;
    };

    // When the budget can afford it (≥3), guarantee at least 1 in every stat so
    // no derived combat stat collapses to 0 (a heart-0 enemy would deal no
    // emotional damage). Below 3 we distribute what's available as-is.
    let baseStats: BaseStats;
    if (total >= 3) {
        const extra = distribute(total - 3);
        baseStats = { heart: extra.heart + 1, body: extra.body + 1, mind: extra.mind + 1 };
    } else {
        baseStats = distribute(total);
    }

    // Apply gear-tier scaling bonus weighted toward defensive stats (heart for HP,
    // body/mind for defense/resists). The bonus is ≈0 at level 1 and grows with level.
    const gearTierMultiplier = 1 + (level * gearTierPerLevel);
    return {
        heart: Math.round(baseStats.heart * gearTierMultiplier),
        body: Math.round(baseStats.body * gearTierMultiplier),
        mind: Math.round(baseStats.mind * gearTierMultiplier),
    };
}

/**
 * The stage floor.
 *
 * Every boss and unique gets at least one moment where the fight becomes a
 * different fight. Marquee foes author their own stages (which win outright);
 * the rest inherit this pair — a second wind at 60% and a last stand at 25% —
 * so no boss is simply a larger pile of VITAE.
 */
export function defaultEnemyStages(
    difficulty: EnemyDifficulty | undefined,
    vitae: number,
): EnemyStage[] {
    if (difficulty !== 'boss' && difficulty !== 'unique') return [];
    return [
        {
            at: { vitaePct: 0.6 },
            name: 'SECOND WIND',
            text: 'It stops fighting like something that expects to win easily.',
            heal: { pct: 0.1 },
            threatBonus: 0.15,
        },
        {
            at: { vitaePct: 0.25 },
            name: 'LAST STAND',
            text: 'Whatever it was holding back, it is not holding back now.',
            heal: Math.round(vitae * 0.05),
            threatBonus: 0.25,
        },
    ];
}

/**
 * Builds a fully-initialised Enemy. Derived stats and resources are
 * computed automatically from `baseStats` and `level`. `xpReward` defaults
 * to `level × DEFAULT_XP_BY_DIFFICULTY[difficulty]` when not supplied.
 */
export function createEnemy(options: CreateEnemyOptions): Enemy {
    const {
        id, name, description, level, baseStats, mapName, logic,
        difficulty,
        cards, loot, xpReward, effects = [],
        friendshipReward, befriendabilityConfig,
        finalBlowLines, pactLines, causeLines,
        journalEntry, addedIn, tags,
        portraitAsset,
        vitae, keywords, stages, phases,
    } = options;
    const phased = (phases?.length ?? 0) > 0;

    const maxHealth = enemyVitae(level, difficulty, vitae);
    const resolvedXp =
        xpReward ?? (difficulty ? level * DEFAULT_XP_BY_DIFFICULTY[difficulty] : level * DEFAULT_XP_BY_DIFFICULTY.normal);

    return {
        id, name, description, level,
        health: maxHealth, maxHealth,
        baseStats,
        mapName, logic,
        difficulty,
        cards,
        loot,
        xpReward: resolvedXp,
        effects,
        friendshipReward,
        befriendabilityConfig,
        finalBlowLines,
        pactLines,
        causeLines,
        journalEntry,
        addedIn,
        tags,
        portraitAsset,
        // No keywords are defined yet; an empty list keeps the slot.
        keywords: keywords ?? [],
        // A foe with HP phases changes shape at its phase lines, not stages.
        stages: stages ?? (phased ? [] : defaultEnemyStages(difficulty, maxHealth)),
        ...(phased ? { phases } : {}),
    };
}

export { isEnemyBefriendable, befriendHpGateOpen } from './befriend';
export type { EnemyKeyword } from './enemy-keywords';
export { ENEMY_KEYWORDS, moveKeywords, enemyPhaseKeywords } from './enemy-keywords';

export type {
    Enemy, EnemyDifficulty, EnemyMove, EnemyMoveKind, EnemyMoveRider, EnemyMoveRiderKind, EnemyPhase,
} from './types';
export {
    PHASE_LINES, PHASES_AUTHORED_LEVEL, enemyPhaseTier, hasEnemyPhases,
    enemyPhaseLinesCrossed, enemyPhaseTarget, escalationApplies,
} from './enemy-phases';
export type { EnemyPhaseTier } from './enemy-phases';

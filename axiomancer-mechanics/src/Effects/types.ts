/**
 * Effect System Types
 *
 * Effects are buffs and debuffs that modify combatant behaviour. The library
 * (./effects.library.ts) defines the catalogue; ActiveEffect tracks a runtime
 * instance attached to a combatant.
 */

import { Stance } from '../Combat/types';

/** Whether an effect helps (`buff`) or hinders (`debuff`) its bearer. */
export type EffectType = 'buff' | 'debuff';

/**
 * How repeated applications of the same effect interact:
 * - `none`      — only the strongest instance wins; reapplications are ignored.
 * - `intensity` — intensity increments (capped); duration resets or extends.
 * - `duration`  — base duration is added to the remaining duration.
 */
export type EffectStacking = 'none' | 'intensity' | 'duration';

/**
 * Tier of the effect, which determines how it is applied/resisted:
 * - 1 — auto-applies, no roll.
 * - 2 — opposed roll determines whether the effect lands.
 * - 3 — only a critical resist (nat 20) repels it.
 */
export type EffectTier = 1 | 2 | 3;

/** Thematic grouping for UI / library queries. */
export type EffectCategory =
    | 'stat' | 'damage' | 'defense' | 'control' | 'regeneration';

/**
 * A persistent stat line on a piece of equipment, while worn. `maxHp` is
 * folded onto `Character.maxHealth` by the equip reducers; `heart`, `body`
 * and `mind` are added to the fighter's stats at combat start
 * (`wornStatBonus`), so they feed the stat scaling of every line.
 */
export interface StatModifier {
    stat: 'maxHp' | 'heart' | 'body' | 'mind';
    /** Flat delta added to that stat while the item is worn. */
    value: number;
}

/**
 * Trigger-clock DoT substrate — the EVENT clock a DoT ticks on instead of
 * the round boundary ('card-played' counts PLAYER-side card plays only). A DoT with no trigger ticks
 * at round start.
 */
export type DotTriggerClock = 'card-played' | 'damage-instance' | 'payoff';

/**
 * Damage dealt each round to the bearer. Total per tick = `damagePerRound × intensity`
 * and is dealt as raw HP loss — DoT bypasses `damageType`-keyed defense (Q5). The
 * `damageType` is informational today and reserved for future immunities.
 */
export interface DamageOverTime {
    damagePerRound: number;
    /** Which stat family the damage reads as. Informational (UI accent only). */
    damageType: Stance;
    /** WS3 event clock. Absent = the round clock (ticks at round start).
     *  Event-clocked DoTs never tick at the round boundary — the engine
     *  advances them via `fireDotTrigger`. */
    trigger?: DotTriggerClock;
}

/** Constraints on what actions the bearer may take. */
export interface ActionRestriction {
    skipTurn?: boolean;
}

/**
 * Mechanical payload of an effect. Every field is optional; an effect may
 * combine several (e.g. a DoT with its `dotModifiers`).
 */
export interface EffectPayload {
    damageOverTime?: DamageOverTime;
    actionRestriction?: ActionRestriction;
    /**
     * VULNERABLE — outgoing-damage multiplier applied to HP the bearer TAKES.
     * `1` (or absent) is neutral; `1.5` means the bearer takes +50% from the
     * attacker's HP sources. Read by the HP-model combat engine
     * (`getDamageTakenMultiplier`) and aggregated additively across the bearer's
     * own payloads, uncapped.
     */
    damageTakenMult?: number;
    /** DoT-specific behaviour beyond the plain `damageOverTime` tick. */
    dotModifiers?: {
        /** Tick damage ramps the longer the effect survives (POISON):
         *  `tickDamage = baseTick * (1 + turnsSurvived * rampFactor)`. Reapplication
         *  resets the ramp rather than stacking. */
        escalatesPerTurn?: boolean;
        /** Multiplier applied per turn survived when `escalatesPerTurn` is set. */
        rampFactor?: number;
        /** BLEED — front-loaded: the effect loses 1 intensity each
         *  time it ticks (removed at 0). Big now, gone soon. */
        decaysPerTick?: boolean;
        /** Explicit opt-out of the round-end duration countdown: the
         *  instance expires only via its own decay (e.g. `decaysPerTick`
         *  washout) or combat end. Absent = the round-end calendar. */
        calendarExpiry?: false;
        /** Doom species (card-local, not a keyword):
         *  the effect's intensity grows +1 each time the enemy acts. */
        growth?: 'per-enemy-action';
    };
    /**
     * MARK — the universal glue affliction: every DoT
     * tick on the bearer deals +`tickAmplifyFlat` × intensity extra HP, and the
     * effect counts as an affliction for RUPTURE / SOUL / REAP payoffs.
     */
    tickAmplifyFlat?: number;
    /** Outgoing-damage multiplier applied to damage the bearer DEALS (QUARTER)
     *  — additive across stacks, -X% each. */
    outgoingDamageMulPct?: number;
}

/**
 * A definition entry in the effects library.
 *
 * @property id          - Unique identifier used for lookups.
 * @property duration    - Base duration in rounds (-1 permanent, 0 instant).
 * @property tier        - Application/resist tier (1-3).
 * @property resistedBy  - Which stat family resists this effect. Absent for tier 1.
 * @property resistDR    - Base difficulty for a resist roll. Absent for tier 1.
 * @property payload     - Mechanical modifiers applied to the bearer.
 */
export interface Effect {
    id: string;
    name: string;
    description: string;
    type: EffectType;
    category: EffectCategory;
    duration: number;
    stacking: EffectStacking;
    tier: EffectTier;
    payload: EffectPayload;
    resistedBy?: Stance;
    resistDR?: number;
    /**
     * On re-application an `intensity`-stacking effect normally
     * extends (additive) or resets its duration. With this set it adds the
     * intensity and refreshes the duration to the longer of the two, so
     * repeating the card grows the effect without stretching its window.
     */
    refreshOnStack?: boolean;
    /**
     * Content-provenance metadata. `addedIn` is an ISO date (`YYYY-MM-DD`)
     * or phase tag marking when the effect was authored; `tags` are freeform
     * labels. Both optional and ignored by the effects engine. Present in the
     * JSON library entries as plain fields.
     */
    addedIn?: string;
    tags?: string[];
}

/**
 * A live instance of an Effect attached to a combatant.
 *
 * @property effectId          - Lookup key into the effects library.
 * @property remainingDuration - Rounds left (-1 permanent).
 * @property intensity         - Current stack count for intensity-stacking effects.
 * @property appliedAt         - Combat round when the effect was first applied.
 * @property tier              - Cached from Effect for quick application logic.
 * @property resistedBy        - Cached from Effect for resist-roll lookups.
 * @property resistDR          - Cached from Effect for resist-roll lookups.
 * @property sourceId          - Optional ID of the combatant that applied it.
 */
export interface ActiveEffect {
    effectId: string;
    remainingDuration: number;
    intensity: number;
    appliedAt: number;
    tier: EffectTier;
    resistedBy?: Stance;
    resistDR?: number;
    sourceId?: string;
}

/**
 * Result of attempting to apply an effect.
 *
 * @property success     - True if the effect successfully landed on its intended target.
 * @property activeEffect - The resulting ActiveEffect (if produced).
 * @property message     - Human-readable description for battle logs.
 * @property stackedWith - Previous intensity/duration when reapplied.
 * @property roll        - Roll details, present only for Tier 2 buff effects (caster fumble/crit).
 */
export interface EffectApplicationResult {
    success: boolean;
    activeEffect?: ActiveEffect;
    message: string;
    stackedWith?: { previousIntensity: number; previousDuration: number };
    roll?: {
        rolled: number;
        resistStat: number;
        total: number;
        dr: number;
        wasCrit: boolean;
        wasFumble: boolean;
    };
}

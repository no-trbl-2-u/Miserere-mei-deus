/**
 * Effect-driven combat helpers — read-only queries plus pure mutators that
 * operate on a combatant's `effects` array (ticks, buff removal, DoT,
 * cleanse).
 */

import { ActiveEffect } from '../Effects/types';
import { lookupEffect } from '../Effects/effects.library';
import { removeEffectsByType } from '../Effects';
import { MAX_EFFECT_INTENSITY } from '../Game/game-mechanics.constants';
import { Combatant } from './types';
import { applyDamage } from './health';
import {
    getActiveEffectModifiers, getDotAmplificationByEffect, rampedDamagePerRound,
    getTickAmplifyFlat, ticksOnRoundClock, dotEventTrigger, DotEventTrigger,
} from './effect-modifiers';

// ─── 0.34.0 status-depth epic — HP-model selectors + tunable scalars ──────────
// These power VULNERABLE
// and the mobile honesty layer. Pure reads over a combatant's `effects`; the HP
// behavior itself is owned by `combat.engine.ts`. Kept here (a writable,
// non-engine home) so the tuning loops can rebalance them by simulation.

/** RESOLUTE — hard floor on the incoming-damage multiplier for a protected
 *  bearer (a fully-stacked protective mult still lets half the hit through).
 *  Protective (`damageTakenMult < 1`) payloads are real. Tunable. */
export const RESOLUTE_MIN_MULT = 0.5;
/**
 * VULNERABLE / RESOLUTE multiplier — the damage multiplier the HP engine applies
 * to every HP source landing on this bearer. Aggregated additively across the
 * bearer's OWN `damageTakenMult` payloads:
 *   mult = 1 + Σ ((damageTakenMult - 1) × intensity)
 * floored at `RESOLUTE_MIN_MULT` and UNCAPPED above. Returns EXACTLY `1`
 * when the bearer carries no marker, so unmarked HP assertions are byte-identical.
 * Protective (<1) payloads count — `buff_resolute` and self-`debuff_vulnerable`
 * both apply. Pure.
 */
export function getDamageTakenMultiplier(bearer: Combatant): number {
    let mult = 1;
    for (const ae of bearer.effects) {
        const def = lookupEffect(ae.effectId);
        const dtm = def?.payload.damageTakenMult;
        if (dtm === undefined) continue;
        mult += (dtm - 1) * (ae.intensity ?? 1);
    }
    return Math.max(RESOLUTE_MIN_MULT, mult);
}

/**
 * SHOCK: what each DEAL against this bearer gains, per hit. Works on either
 * side, since the status lives on the combatant. 0 when unmarked. Pure.
 */
export function getDamageTakenFlat(bearer: Combatant): number {
    let flat = 0;
    for (const ae of bearer.effects) {
        const n = lookupEffect(ae.effectId)?.payload.damageTakenFlat ?? 0;
        if (n !== 0) flat += n * (ae.intensity ?? 1);
    }
    return flat;
}

/**
 * Outgoing-damage multiplier for the bearer, from `outgoingDamageMulPct`
 * (QUARTER −10/stack — dampens the bearer's hits):
 *   mult = 1 + Σ (outgoingDamageMulPct/100 × intensity)
 * clamped to [0.1, 2]. Exactly 1 for an unmarked bearer. Applied to the
 * enemy's telegraphed threat damage and the player's powered strike. Pure.
 */
export function getOutgoingDamageMult(bearer: Combatant): number {
    let mult = 1;
    for (const ae of bearer.effects) {
        const pct = lookupEffect(ae.effectId)?.payload.outgoingDamageMulPct ?? 0;
        if (pct !== 0) mult += (pct / 100) * (ae.intensity ?? 1);
    }
    return Math.min(2, Math.max(0.1, mult));
}

/** One pending DoT effect's remaining lifetime total (amplification-aware). */
export interface PendingDotEntry {
    effectId: string;
    label: string;
    /** floor(damagePerRound × intensity × comboMultiplier) summed over the
     *  effect's expected remaining ticks (per-round for round clocks,
     *  `EXPECTED_TRIGGERS_PER_ROUND` per round for event clocks). */
    amount: number;
}

/** Fuel math — how many times each EVENT clock is expected to fire per
 *  round. Round-clocked (no-trigger) DoTs never read this: they tick once per
 *  remaining-duration round.
 *  // PLAYTEST-CALIBRATION: conservative constants until telemetry
 *  // replaces them with the sim's own per-policy averages — 2 player plays
 *  // per round drive the card-played and damage-instance clocks; payoff
 *  // verbs fire about once a round at most. */
export const EXPECTED_TRIGGERS_PER_ROUND: Readonly<Record<DotEventTrigger, number>> = {
    'card-played': 2,
    'damage-instance': 2,
    'payoff': 1,
};

/**
 * The total DoT HP still pending on the bearer over the effects' remaining
 * lifetimes — the figure RUPTURE detonates. Amplification-aware (reuses the same
 * combo multiplier the aggregator applies), floored per-tick. Round-clocked
 * DoTs tick once per remaining-duration round (permanent counts one
 * tick); event-clocked DoTs expect
 * `EXPECTED_TRIGGERS_PER_ROUND` ticks over the same round horizon (a
 * no-calendar instance, `remainingDuration` -1, counts one round —
 * conservative, bounded). Pure.
 */
export function getPendingDotTotal(bearer: Combatant, currentRound?: number): { total: number; perEffect: PendingDotEntry[] } {
    const dotAmp = getDotAmplificationByEffect(bearer.effects);
    const perEffect: PendingDotEntry[] = [];
    let total = 0;
    for (const ae of bearer.effects) {
        const def = lookupEffect(ae.effectId);
        const dot = def?.payload.damageOverTime;
        if (!def || !dot) continue;
        const intensity = ae.intensity ?? 1;
        const multiplier = dotAmp.get(ae.effectId) ?? 1;
        const eventClock = dotEventTrigger(dot);
        const ticksPerRound = eventClock ? EXPECTED_TRIGGERS_PER_ROUND[eventClock] : 1;
        const rounds = Math.max(1, ae.remainingDuration);
        // Escalating DoTs (`escalatesPerTurn`) sum their GROWING future
        // ticks when a round is threaded; flat DoTs keep perTick × ticks.
        // BLEED (`decaysPerTick`): intensity falls 1 per future tick
        // and the instance washes out at 0 — the pending fuel must model that
        // decay or RUPTURE previews overstate the burst (projection-truth law).
        const decays = def.payload.dotModifiers?.decaysPerTick === true;
        let amount = 0;
        let tickNo = 0;
        outer: for (let k = 0; k < rounds; k++) {
            const dpr = rampedDamagePerRound(
                ae, dot.damagePerRound, def.payload.dotModifiers,
                currentRound === undefined ? undefined : currentRound + k,
            );
            for (let t = 0; t < ticksPerRound; t++, tickNo++) {
                const tickIntensity = decays ? intensity - tickNo : intensity;
                if (tickIntensity <= 0) break outer;
                amount += Math.floor(dpr * tickIntensity * multiplier);
            }
        }
        perEffect.push({ effectId: ae.effectId, label: def.name, amount });
        total += amount;
    }
    return { total, perEffect };
}

/**
 * Rounds until the bearer's currently-stacked DoT effects alone would drop it
 * to 0 HP, walking round-by-round with the same per-tick formula
 * `getPendingDotTotal` sums in lump form (ramp- and combo-amplification-aware).
 * Each effect's round horizon is capped at `Math.max(1, remainingDuration)` —
 * the same "permanent DoT counts one round" convention `getPendingDotTotal`
 * uses — and event-clocked DoTs contribute their expected
 * `EXPECTED_TRIGGERS_PER_ROUND` ticks each round, so the two figures never
 * diverge. Returns `null` when the DoT alone won't finish the bearer over its
 * remaining duration. Pure.
 */
export function computeRoundsToKill(bearer: Combatant, currentRound?: number): number | null {
    const dotAmp = getDotAmplificationByEffect(bearer.effects);
    const dotEffects = bearer.effects
        .map(ae => {
            const def = lookupEffect(ae.effectId);
            const dot = def?.payload.damageOverTime;
            if (!def || !dot) return null;
            const eventClock = dotEventTrigger(dot);
            return {
                ae, dot, dotModifiers: def.payload.dotModifiers,
                intensity: ae.intensity ?? 1,
                multiplier: dotAmp.get(ae.effectId) ?? 1,
                rounds: Math.max(1, ae.remainingDuration),
                ticksPerRound: eventClock ? EXPECTED_TRIGGERS_PER_ROUND[eventClock] : 1,
                decays: def.payload.dotModifiers?.decaysPerTick === true,
                ticksTaken: 0,
            };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null);
    if (dotEffects.length === 0) return null;

    const maxRounds = Math.max(...dotEffects.map(e => e.rounds));
    let cumulative = 0;
    for (let k = 0; k < maxRounds; k++) {
        for (const e of dotEffects) {
            if (k >= e.rounds) continue;
            const dpr = rampedDamagePerRound(
                e.ae, e.dot.damagePerRound, e.dotModifiers,
                currentRound === undefined ? undefined : currentRound + k,
            );
            for (let t = 0; t < e.ticksPerRound; t++, e.ticksTaken++) {
                // BLEED decay — same convention as `getPendingDotTotal`.
                const tickIntensity = e.decays ? e.intensity - e.ticksTaken : e.intensity;
                if (tickIntensity <= 0) break;
                cumulative += Math.floor(dpr * tickIntensity * e.multiplier);
            }
        }
        if (cumulative >= bearer.health) return k + 1;
    }
    return null;
}

/** Count of DISTINCT debuff effect ids on the bearer — variety payoffs' scaler. Pure. */
export function getDistinctDebuffCount(bearer: Combatant): number {
    const ids = new Set<string>();
    for (const ae of bearer.effects) {
        if (lookupEffect(ae.effectId)?.type === 'debuff') ids.add(ae.effectId);
    }
    return ids.size;
}

/**
 * Decrements the remainingDuration of one specific active effect by 1.
 * Permanent effects (-1) are untouched. Does not remove expired effects;
 * use `tickAllEffects` for the full cleanup.
 */
export function updateEffectDuration<T extends Combatant>(target: T, effectId: string): T {
    const updated = target.effects.map(effect => {
        if (effect.effectId !== effectId) return effect;
        if (effect.remainingDuration === -1) return effect;
        return { ...effect, remainingDuration: effect.remainingDuration - 1 };
    });
    return { ...target, effects: updated };
}

/**
 * Decrements every non-permanent effect's remaining duration by 1, removes
 * any that expired, and returns both the updated combatant and the list of
 * expired effects (for UI announcements). Effects that opted out of the
 * calendar (`dotModifiers.calendarExpiry === false`) never count down — they
 * expire only via their own decay (e.g. `decaysPerTick` washout) or combat end.
 *
 * BEARER ASYMMETRY: the no-calendar law holds for ENEMY
 * bearers, where payoff consumption (RUPTURE / consumeMarks / cleanse riders)
 * bounds a permanent affliction. The player has no such consumer, so a
 * player-borne no-calendar effect honors the opt-out only when it can wash
 * itself out (`decaysPerTick`); otherwise (e.g. MARK) its printed duration
 * applies again — enemy-applied marks on the player must not snowball forever.
 */
export function tickAllEffects<T extends Combatant>(
    target: T,
    bearer: 'player' | 'enemy' = 'enemy',
): { target: T; expired: ActiveEffect[] } {
    const expired: ActiveEffect[] = [];
    const remaining = target.effects.reduce<ActiveEffect[]>((acc, effect) => {
        const mods = lookupEffect(effect.effectId)?.payload.dotModifiers;
        const noCalendar = mods?.calendarExpiry === false
            && (bearer === 'enemy' || mods?.decaysPerTick === true);
        if (effect.remainingDuration === -1 || noCalendar) {
            acc.push(effect);
            return acc;
        }
        const ticked = { ...effect, remainingDuration: effect.remainingDuration - 1 };
        if (ticked.remainingDuration <= 0) {
            expired.push(ticked);
        } else {
            acc.push(ticked);
        }
        return acc;
    }, []);

    return { target: { ...target, effects: remaining }, expired };
}

/**
 * Applies the round-clock damage-over-time tick. A DoT with no `trigger`
 * ticks at round start; per Q5 it is unresisted — it bypasses defense and
 * the `damageType` is purely informational. Event-clocked DoTs never tick
 * here (the aggregator already excludes them); `washedOut` surfaces
 * decay-consumed instances so the Soul economy can count no-calendar expiries.
 */
export function processDamageOverTime<T extends Combatant>(
    target: T,
    currentRound?: number,
): { target: T; damage: number; washedOut: ActiveEffect[] } {
    const mods = getActiveEffectModifiers(target.effects, currentRound);
    const projectedDamage = mods.dotStart;
    if (projectedDamage <= 0) return { target, damage: 0, washedOut: [] };
    // A receipt names HP that actually left the bar, never theoretical overkill.
    // `applyDamage` already clamps the resulting health; clamp the returned
    // amount to the same truth or attribution can exceed total VITAE lost.
    const damage = Math.min(projectedDamage, Math.max(0, target.health));
    let next: T = applyDamage(target, damage);
    // BLEED (`dotModifiers.decaysPerTick`): a front-loaded DoT loses
    // 1 intensity each time it ticks; the instance washes out at 0. Only effects
    // that ticked on the round clock decay. No-op for every non-decaying DoT.
    const washedOut: ActiveEffect[] = [];
    const decayed = next.effects.reduce<ActiveEffect[]>((acc, ae) => {
        const p = lookupEffect(ae.effectId)?.payload;
        const ticked = !!p?.damageOverTime && ticksOnRoundClock(p.damageOverTime);
        if (ticked && p?.dotModifiers?.decaysPerTick) {
            if (ae.intensity > 1) acc.push({ ...ae, intensity: ae.intensity - 1 });
            else washedOut.push(ae); // intensity 1 → the instance is spent
        } else {
            acc.push(ae);
        }
        return acc;
    }, []);
    if (decayed.length !== next.effects.length
        || decayed.some((ae, i) => ae !== next.effects[i])) {
        next = { ...next, effects: decayed };
    }
    return { target: next, damage, washedOut };
}

/**
 * Round-start orchestration: the round-clock DoT tick.
 *
 * Tick / expiry are intentionally *not* performed here; they belong to
 * `processRoundEndEffects` so duration counts down once per round.
 */
export function processRoundStartEffects<T extends Combatant>(target: T, currentRound?: number): {
    target: T;
    dotDamage: number;
    /** Decay-consumed DoT instances (Soul economy reads no-calendar ones). */
    dotWashedOut: ActiveEffect[];
} {
    const dot = processDamageOverTime(target, currentRound);
    return { target: dot.target, dotDamage: dot.damage, dotWashedOut: dot.washedOut };
}

/** Round-end orchestration: tick / expire all effects (single decrement per round). */
export function processRoundEndEffects<T extends Combatant>(
    target: T,
    bearer: 'player' | 'enemy' = 'enemy',
): { target: T; expired: ActiveEffect[] } {
    return tickAllEffects(target, bearer);
}

// ── Trigger-clock DoT substrate ──────────────────────────────────────────────

/** One `fireDotTrigger` outcome. */
export interface DotTriggerResult<T extends Combatant> {
    target: T;
    /** Total HP the matching effects ticked for (0 = no matching clock fired). */
    damage: number;
    /** Per-effect breakdown for `dot-tick` event emission. */
    perEffect: { effectId: string; label: string; amount: number }[];
    /** `decaysPerTick` instances consumed by this tick (intensity hit 0) — the
     *  Soul economy counts the no-calendar ones as expiries. */
    washedOut: ActiveEffect[];
}

/**
 * Advances one EVENT clock: ticks exactly the effects whose
 * `damageOverTime.trigger` matches, with the same per-tick body
 * `processDamageOverTime` uses — combo amplification, POISON ramp
 * (`escalatesPerTurn`), MARK flat amplification, and BLEED `decaysPerTick`
 * washout. Untriggered (round-clocked) DoTs never match here.
 * The tick damage is applied with the plain `applyDamage`, so a
 * 'damage-instance' DoT can never re-trigger itself. Pure; exact no-op
 * (same object) when nothing matches.
 *
 * `eligible` — optional per-instance gate: an instance for which it
 * returns false (or 0) neither ticks nor decays on this trigger. The card-play
 * resolver passes "existed BEFORE this play" so a play's own fresh stacks are
 * never on their own clock (doctrine witness: a PAID line must not chip a
 * clean enemy — the stacks start paying from the NEXT play). A NUMBER return
 * is a partial gate: the instance ticks as if its intensity were
 * `min(intensity, n)` — with 'intensity' merge-stacking a re-application
 * raises the ONE existing instance, so the resolver caps the tick at the
 * pre-play intensity and only the pre-existing stacks pay this play.
 */
export function fireDotTrigger<T extends Combatant>(
    target: T,
    trigger: DotEventTrigger,
    currentRound?: number,
    eligible?: (ae: ActiveEffect) => boolean | number,
): DotTriggerResult<T> {
    const dotAmp = getDotAmplificationByEffect(target.effects);
    const markBonus = getTickAmplifyFlat(target.effects);
    const perEffect: DotTriggerResult<T>['perEffect'] = [];
    const onClock = (ae: ActiveEffect): boolean => {
        if (!eligible) return true;
        const gate = eligible(ae);
        return gate !== false && gate !== 0;
    };
    let damage = 0;
    for (const ae of target.effects) {
        const def = lookupEffect(ae.effectId);
        const dot = def?.payload.damageOverTime;
        if (!def || !dot || dot.trigger !== trigger) continue;
        const gate = eligible ? eligible(ae) : true;
        if (gate === false || gate === 0) continue;
        const clocked = typeof gate === 'number'
            ? Math.max(0, Math.min(ae.intensity ?? 1, gate))
            : (ae.intensity ?? 1);
        const multiplier = dotAmp.get(ae.effectId) ?? 1;
        const dpr = rampedDamagePerRound(ae, dot.damagePerRound, def.payload.dotModifiers, currentRound);
        const amount = Math.floor(dpr * clocked * multiplier) + markBonus;
        perEffect.push({ effectId: ae.effectId, label: def.name, amount });
        damage += amount;
    }
    if (damage <= 0) return { target, damage: 0, perEffect: [], washedOut: [] };
    // Clamp the labeled breakdown in deterministic effect order. The event
    // stream is an accounting ledger: once VITAE reaches zero, later theoretical
    // ticks cannot claim damage that never occurred.
    let hpRemaining = Math.max(0, target.health);
    const actualPerEffect = perEffect.flatMap(tick => {
        const amount = Math.min(tick.amount, hpRemaining);
        hpRemaining -= amount;
        return amount > 0 ? [{ ...tick, amount }] : [];
    });
    const actualDamage = actualPerEffect.reduce((sum, tick) => sum + tick.amount, 0);
    let next: T = applyDamage(target, actualDamage);
    // Same decay rule as the round clocks: only effects that ticked THIS
    // trigger decay; the instance washes out at intensity 0.
    const washedOut: ActiveEffect[] = [];
    const decayed = next.effects.reduce<ActiveEffect[]>((acc, ae) => {
        const p = lookupEffect(ae.effectId)?.payload;
        const tickedThisTrigger = p?.damageOverTime?.trigger === trigger
            && onClock(ae);
        if (tickedThisTrigger && p?.dotModifiers?.decaysPerTick) {
            if (ae.intensity > 1) acc.push({ ...ae, intensity: ae.intensity - 1 });
            else washedOut.push(ae); // intensity 1 → the instance is spent
        } else {
            acc.push(ae);
        }
        return acc;
    }, []);
    if (decayed.length !== next.effects.length
        || decayed.some((ae, i) => ae !== next.effects[i])) {
        next = { ...next, effects: decayed };
    }
    return { target: next, damage: actualDamage, perEffect: actualPerEffect, washedOut };
}

/**
 * Doom growth (`dotModifiers.growth: 'per-enemy-action'`) — every matching
 * effect on the bearer gains +1 intensity (capped at `MAX_EFFECT_INTENSITY`).
 * The engine calls this on the ENEMY after its telegraphed action actually
 * fires (a denied turn never grows the Doom). Pure; no-op when none match.
 */
export function growPerEnemyActionDots<T extends Combatant>(bearer: T): { combatant: T; grown: string[] } {
    const grown: string[] = [];
    const effects = bearer.effects.map(ae => {
        const p = lookupEffect(ae.effectId)?.payload;
        if (p?.dotModifiers?.growth !== 'per-enemy-action') return ae;
        grown.push(ae.effectId);
        return { ...ae, intensity: Math.min(MAX_EFFECT_INTENSITY, ae.intensity + 1) };
    });
    return grown.length ? { combatant: { ...bearer, effects }, grown } : { combatant: bearer, grown };
}

/**
 * Cleanse — strip debuffs from the bearer scoped by the cleanse effect's tier.
 * A Tier 2 cleanse removes Tier 1 + 2 debuffs; a Tier 3 cleanse strips
 * everything. Pure: returns updated combatant and the list of removed effects.
 *
 * @param tier - Tier of the cleansing effect (1, 2, or 3). Removes any debuff
 *               whose `tier <= cleanseTier`.
 */
export function applyCleanse<T extends Combatant>(
    target: T,
    tier: 1 | 2 | 3,
): { target: T; removed: ActiveEffect[] } {
    const { activeEffects, removed } = removeEffectsByType(target.effects, 'debuff', tier);
    return { target: { ...target, effects: activeEffects }, removed };
}

/**
 * STAT SCALING.
 *
 * The player's three stats scale the numbers their cards print. Which stat is
 * decided by WHERE THE EFFECT LANDS, never by the card's colour:
 *
 *   body  — immediate damage to the foe (DEAL)
 *   mind  — anything that sits on you (GUARD, THORNS, self-buffs)
 *   heart — anything that sits on the foe (VULNERABLE, POISON, BLEED, STUN)
 *   grey  — everything else: unscaled
 *
 * and HOW MUCH is decided by the scaling kind:
 *
 *   one-shot  — `base × stat ÷ 5`: 5 is neutral, each point is +20% of the
 *               base. Single amounts and percentages (DEAL, GUARD, VULNERABLE).
 *   repeating — `base × (1 + (stat − 5) ÷ 10)`: half rate, because it fires
 *               again and again (DoT per tick, THORNS per hit, regen).
 *   flat      — never scales: on/off effects and every duration (no
 *               stun-lock).
 *
 * Nothing is capped. Enemies never use this: their numbers stay
 * authored. No engine state, safe to import from presenters.
 */

import type { BaseStats } from '../Character/types';
import type { Card, CardRider, CardSpecialMechanic } from '../Cards/types';
import type { CardProgram } from '../Cards/card-program.types';
import type { Effect, EffectPayload } from '../Effects/types';
import { lookupEffect } from '../Effects';

export type StatFamily = 'body' | 'mind' | 'heart' | 'grey';
export type ScalingKind = 'one-shot' | 'repeating' | 'flat';

export interface KeywordScaling {
    /** Where the effect lands. `by-target` = an applied status: heart on the
     *  foe, mind on you (see `effectFamily`). */
    family: StatFamily | 'by-target';
    scaling: ScalingKind;
}

/** The starting value of every stat: a stat of 5 leaves every number as printed. */
export const NEUTRAL_STAT = 5;

/**
 * THE formula. Every scaled player number goes through here. Integer out,
 * floored (the printed number never overstates the hit); a positive base
 * never scales below 1, so a low stat can shrink a card but not erase it.
 */
export function scaleAmount(base: number, stat: number, kind: ScalingKind): number {
    if (base <= 0 || kind === 'flat' || stat === NEUTRAL_STAT) return base;
    const scaled = kind === 'one-shot'
        ? (base * stat) / NEUTRAL_STAT
        : (base * (10 + stat - NEUTRAL_STAT)) / 10;
    return Math.max(1, Math.floor(scaled + 1e-9));
}

/** The stat a family reads. Grey reads the neutral value, so it never scales. */
export function statFor(stats: BaseStats | undefined, family: StatFamily): number {
    if (!stats || family === 'grey') return NEUTRAL_STAT;
    return stats[family];
}

/** Scale `base` for a family and kind against the player's stats. */
export function scaleFor(
    base: number,
    stats: BaseStats | undefined,
    family: StatFamily,
    kind: ScalingKind,
): number {
    return scaleAmount(base, statFor(stats, family), kind);
}

// ─── The keyword table ───────────────────────────────────────────────────────
// Typed as a full `Record` over the mechanic kinds and rider fields, so a new
// kind or rider field without a family is a COMPILE error (and the guard test
// in `e2e/stat-scaling.engine.test.ts` walks the runtime lists as well).

const BODY_ONE_SHOT: KeywordScaling = { family: 'body', scaling: 'one-shot' };
const MIND_ONE_SHOT: KeywordScaling = { family: 'mind', scaling: 'one-shot' };

/** Every PAID mechanic kind. */
export const MECHANIC_SCALING: Record<CardSpecialMechanic['kind'], KeywordScaling> = {
    deal: BODY_ONE_SHOT,
    guard: MIND_ONE_SHOT,
};

/** Every FREE-line rider field. */
export const RIDER_SCALING: Record<keyof CardRider, KeywordScaling> = {
    damage: BODY_ONE_SHOT,
    guard: MIND_ONE_SHOT,
    applyEffect: { family: 'by-target', scaling: 'one-shot' },
};

// ─── Applied statuses ────────────────────────────────────────────────────────

/**
 * How an effect's intensity scales, by what its payload does. A repeating
 * payload wins over a percentage one; an effect that doesn't stack by
 * intensity is on/off and never scales. A full `Record` over the payload keys,
 * so a new payload key has to pick one here.
 */
export const PAYLOAD_SCALING: Record<keyof EffectPayload, ScalingKind> = {
    damageOverTime: 'repeating',
    tickAmplifyFlat: 'repeating',
    damageTakenMult: 'one-shot',
    outgoingDamageMulPct: 'one-shot',
    actionRestriction: 'flat',
    dotModifiers: 'flat',
};

export function effectScaling(def: Effect): ScalingKind {
    if (def.stacking !== 'intensity') return 'flat';
    const kinds = (Object.keys(def.payload) as (keyof EffectPayload)[]).map(k => PAYLOAD_SCALING[k]);
    if (kinds.includes('repeating')) return 'repeating';
    if (kinds.includes('one-shot')) return 'one-shot';
    return 'flat';
}

/**
 * The family of a status the player applies: heart on the foe, mind on
 * yourself. A DEBUFF you put on yourself is a cost (a curse's FREE line), not
 * a benefit, so it stays grey: a better stat must never make a cost worse.
 */
export function effectFamily(def: Effect, onSelf: boolean): StatFamily {
    if (!onSelf) return 'heart';
    return def.type === 'debuff' ? 'grey' : 'mind';
}

/** The intensity a player-applied status actually lands with. */
export function scaleEffectIntensity(
    def: Effect,
    intensity: number,
    onSelf: boolean,
    stats: BaseStats | undefined,
): number {
    return scaleFor(intensity, stats, effectFamily(def, onSelf), effectScaling(def));
}

// ─── The card face: a stat-scaled copy ("final numbers on card faces") ───────

/** A rider with every scaled field at the player's stats. Pure. */
export function scaleRider(r: CardRider, stats: BaseStats | undefined): CardRider {
    const out: CardRider = { ...r };
    if (r.damage) out.damage = scaleFor(r.damage, stats, 'body', 'one-shot');
    if (r.guard) out.guard = scaleFor(r.guard, stats, 'mind', 'one-shot');
    if (r.applyEffect) {
        const def = lookupEffect(r.applyEffect.effectId);
        if (def) {
            out.applyEffect = {
                ...r.applyEffect,
                intensity: scaleEffectIntensity(def, r.applyEffect.intensity ?? 1, r.applyEffect.to === 'self', stats),
            };
        }
    }
    return out;
}

function isNeutral(stats: BaseStats | undefined): boolean {
    return !stats || (stats.body === NEUTRAL_STAT && stats.mind === NEUTRAL_STAT && stats.heart === NEUTRAL_STAT);
}

/**
 * The card as the player's stats print it: every scaled number replaced by
 * the number the engine will apply (before the read and the foe's
 * VULNERABLE). For DISPLAY only — the engine always executes the
 * library card and scales at resolution, so never feed this back into play.
 * Returns the same object at neutral stats.
 */
export function scaleCardForStats(card: Card, stats: BaseStats | undefined): Card {
    if (isNeutral(stats)) return card;
    const mechanic = (m: CardSpecialMechanic): CardSpecialMechanic => {
        switch (m.kind) {
            case 'deal': return { ...m, amount: scaleFor(m.amount, stats, 'body', 'one-shot') };
            case 'guard': return { ...m, amount: scaleFor(m.amount, stats, 'mind', 'one-shot') };
        }
    };
    const out: Card = { ...card };
    // The authored PAID sentence carries the PRINTED numbers and can't follow
    // the stats, so the scaled copy drops it: the face falls back to the text
    // generated from the scaled mechanics (P0-truth: the printed number is the
    // applied number).
    delete out.paidSummary;
    if (card.specialMechanics) out.specialMechanics = card.specialMechanics.map(mechanic);
    if (card.combatEffects) {
        out.combatEffects = card.combatEffects.map(p => {
            const def = lookupEffect(p.effectId);
            return def ? { ...p, intensity: scaleEffectIntensity(def, p.intensity ?? 1, p.appliedTo === 'self', stats) } : p;
        });
    }
    if (card.free) out.free = scaleRider(card.free, stats);
    if (card.program) out.program = scaleProgramText(card.program, stats);
    return out;
}

const PROGRAM_TOKEN = /\{(deal|guard|heal|vuln|leech|thorns|radiance|mercy):(\d+)\}/g;

/**
 * A program line's printed text at the player's stats: every number token
 * (`card-program.types.ts`) replaced by the number the engine applies,
 * before the foe's VULNERABLE. `stats` undefined prints the base numbers.
 *
 * @example programText('SACRIFICE 2, DEAL {deal:5}.', { body: 6, mind: 5, heart: 5 })
 *          // 'SACRIFICE 2, DEAL 6.'
 */
export function programText(text: string, stats: BaseStats | undefined): string {
    return text.replace(PROGRAM_TOKEN, (_m, kind: string, raw: string) => `${programTokenValue(kind, Number(raw), stats)}`);
}

function programTokenValue(kind: string, n: number, stats: BaseStats | undefined): number {
    switch (kind) {
        case 'deal': return scaleFor(n, stats, 'body', 'one-shot');
        case 'guard':
        case 'heal': return scaleFor(n, stats, 'mind', 'one-shot');
        case 'leech':
        case 'thorns':
        case 'radiance':
        case 'mercy': return scaleFor(n, stats, 'heart', 'repeating');
        case 'vuln': {
            const def = lookupEffect('debuff_vulnerable');
            return def ? scaleEffectIntensity(def, n, false, stats) : n;
        }
        default: return n;
    }
}

/** A display copy of a program with every printed text at the player's stats. */
function scaleProgramText(p: CardProgram, stats: BaseStats | undefined): CardProgram {
    const line = <L extends { text: string }>(l: L | undefined): L | undefined => l && { ...l, text: programText(l.text, stats) };
    return {
        ...p,
        ...(p.free ? { free: line(p.free) } : {}),
        ...(p.paid ? { paid: line(p.paid) } : {}),
        ...(p.global ? {
            global: {
                ...p.global,
                text: programText(p.global.text, stats),
                ...(p.global.paidDelta ? { paidDelta: programText(p.global.paidDelta, stats) } : {}),
            },
        } : {}),
        ...(p.onDiscard ? { onDiscard: { ...p.onDiscard, text: programText(p.onDiscard.text, stats) } } : {}),
    };
}

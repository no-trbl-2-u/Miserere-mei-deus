/**
 * CARD PROGRAMS — the runtime for cards that carry a `program`
 * (`Cards/card-program.types.ts`): SACRIFICE (with WAIVE), HEAL, EXILE,
 * TETHER, LEECH, the Global and Curse card types, Global triggers (start of
 * turn, SACRIFICE, Curse played) and VITAE conditions.
 *
 * Every card line is one function run three ways:
 *
 *   'cost'  — the SACRIFICE probe: what the line would make the player pay.
 *             A line whose SACRIFICE would leave the player below 1 VITAE
 *             cannot be played (plan/revamp/cards.md).
 *   'value' — the sim witness's estimate of the line, so the greedy policy
 *             can rank it (`combat.card-program.policy.ts`).
 *   'apply' — the real resolution.
 *
 * The engine (`combat.engine.ts`) calls in here only when a fight carries a
 * program ledger (its deck holds a program card), so every other fight is
 * untouched.
 *
 * The verbs as applied:
 *   DEAL n        body-scaled damage to the foe (VULNERABLE applies)
 *   GUARD n       mind-scaled block
 *   HEAL n        mind-scaled VITAE restore, capped at max VITAE; healing
 *                 "the damage dealt" heals that amount unscaled
 *   VULNERABLE    the existing status, heart-scaled
 *   foe loses n   unscaled VITAE loss on the foe (not a DEAL)
 *   SACRIFICE n   lose n VITAE, unscaled; a cost that never goes below 1
 *   WAIVE         the next SACRIFICE this turn costs no VITAE but still counts
 *   EXILE         the card leaves combat instead of going to discard
 *   TETHER n      for n turns each SACRIFICE x makes the foe take DEAL x
 *                 (x = VITAE that instance paid, unscaled; VULNERABLE applies)
 *   LEECH n       a debuff on the foe with turns and potency: each LEECH n
 *                 adds 3 turns and adds n (heart-scaled when applied) to the
 *                 potency. At the start of each foe turn the foe loses the
 *                 potency in VITAE (not a DEAL) and you HEAL what it lost;
 *                 then a turn ticks off. At 0 turns LEECH ends and the
 *                 potency resets. The potency never decays.
 *   next DEAL +n  the next DEAL this turn (a card's, a Global's or TETHER's)
 *                 deals n more, unscaled, before VULNERABLE; stacks, and
 *                 expires at the end of the turn
 */

import type {
    CardProgram, GlobalTrigger, InfernoSide, ProgramCtx, ProgramLine, ProgramQuery, SacrificeModifier,
} from '../Cards/card-program.types';
import {
    anyElement, driftElements, elementsOnFoe, foeInferno, initElementState, weatherEvents, yourInferno,
    type ElementState,
} from './combat.elements';
import { drawCombatCards } from './combat.deck';
import { getRng } from '../Utils/rng';
import { getCardById } from '../Cards/cards.library';
import { lookupEffect, applyEffect } from '../Effects';
import type { Enemy } from '../Enemy/types';
import { applyDamage, heal as healCombatant, isDefeated } from './health';
import { fireDotTrigger, getDamageTakenMultiplier } from './effects';
import { scaleFor, scaleEffectIntensity, programText } from './stat-scaling';

export { programText };
import { spendDice } from './combat.dice';
import { recordAttribution } from './combat.attribution';
import type {
    CombatEncounterState, CombatEvent, CombatHandEntry, CombatManaDie,
} from './combat.encounter.types';

/** A FREE Global stays in play for this many turn starts. */
export const GLOBAL_FREE_TURNS = 3;

/** Each LEECH application adds this many foe turns. */
export const LEECH_TURNS_PER_APPLICATION = 3;

// ── State ───────────────────────────────────────────────────────────────────

/**
 * One Global in play. Copies stack as independent instances (experimental,
 * T 2026-10-14): each copy is its own entry, fires its own trigger and
 * leaves on its own expiry.
 */
export interface GlobalInPlay {
    /** This instance, unique within the combat ('g1', 'g2', ...). */
    uid: string;
    cardId: string;
    paid: boolean;
    /** Turn starts left before a FREE Global leaves play; null = rest of combat. */
    turnsLeft: number | null;
}

/** The SACRIFICE / Global / Curse ledger a fight carries when its deck holds a program card. */
export interface ProgramLedger {
    globals: GlobalInPlay[];
    /** Card ids EXILED this combat (one entry per copy). */
    exiled: string[];
    lostThisCombat: number;
    /** Every VITAE the player lost this round: damage and SACRIFICE (heals
     *  ignored). Reset at the round boundary. */
    lostThisRound: number;
    takenThisRound: number;
    takenLastRound: number;
    /** SACRIFICES made this combat, as counted. */
    sacrificeCount: number;
    /** VITAE actually paid to SACRIFICE this combat. */
    sacrificePaid: number;
    /** WAIVES left this turn. */
    waives: number;
    /** The next SACRIFICE this turn is doubled. */
    nextDouble: boolean;
    /** The next SACRIFICE this turn counts twice (cost paid once). */
    nextTwice: boolean;
    /** Added to the next DEAL this turn (unscaled); 0 = none. */
    nextDealBonus: number;
    drains: { perHit: number; untilRound: number }[];
    deathWardRound: number | null;
    pendingHeal: number;
    /** Counter for the hand uids of Curses added or returned mid-combat. */
    curseUid: number;
    /** Counter for the instance uids of Globals entering play. */
    globalUid: number;
    /** TETHER is live through this round (inclusive); 0 = none. */
    tetherUntil: number;
    tetherCardId: string | null;
    /** The display name of a TETHER source that is not a card (a signature). */
    tetherSourceName: string | null;
    /** LEECH on the foe: foe turns left (0 = no LEECH). */
    leechTurns: number;
    /** LEECH potency: the VITAE the foe loses each of its turns. */
    leechPotency: number;
    leechCardId: string | null;
    /** The Elementalist's weather (`combat.elements.ts`). */
    el: ElementState;
}

export function initProgramLedger(): ProgramLedger {
    return {
        globals: [], exiled: [],
        lostThisCombat: 0, lostThisRound: 0, takenThisRound: 0, takenLastRound: 0,
        sacrificeCount: 0, sacrificePaid: 0,
        waives: 0, nextDouble: false, nextTwice: false, nextDealBonus: 0,
        drains: [], deathWardRound: null, pendingHeal: 0, curseUid: 0, globalUid: 0,
        tetherUntil: 0, tetherCardId: null, tetherSourceName: null, leechTurns: 0, leechPotency: 0, leechCardId: null,
        el: initElementState(),
    };
}

function cloneLedger(l: ProgramLedger): ProgramLedger {
    return {
        ...l,
        globals: l.globals.map(g => ({ ...g })),
        exiled: l.exiled.slice(),
        drains: l.drains.map(d => ({ ...d })),
        el: { ...(l.el ?? initElementState()) },
    };
}

// ── Lookups ─────────────────────────────────────────────────────────────────

export function cardProgram(cardId: string): CardProgram | undefined {
    return getCardById(cardId)?.program;
}

export function isProgramCard(cardId: string): boolean {
    return cardProgram(cardId) !== undefined;
}

/** A Curse: a dead card that holds a hand slot until played; it cannot be scrapped. */
export function isCurseCard(cardId: string): boolean {
    return getCardById(cardId)?.cardType === 'curse';
}

/** True when a deck holds any program card (the fight then carries a ledger). */
export function deckHasProgramCards(deck: readonly string[]): boolean {
    return deck.some(isProgramCard);
}

// ── Printed text ────────────────────────────────────────────────────────────

// ── Engine kit (passed in by the engine, so this module never imports it) ────

export interface ProgramKit {
    convictionCap: number;
    /** The foe's telegraphed hits this phase, each after the clock
     *  and multipliers and before BLIZZARD and soak. */
    incomingHits?(state: CombatEncounterState): number[];
    /** The telegraphed hit, netted against live GUARD (projectIncomingThreat). */
    incomingNet(state: CombatEncounterState): number;
}

// ── The line context ────────────────────────────────────────────────────────

type Mode = 'cost' | 'value' | 'apply';

interface Work {
    s: CombatEncounterState;
    l: ProgramLedger;
    events: CombatEvent[];
    kit: ProgramKit;
    /** Cost accumulated in 'cost' mode. */
    cost: number;
    value: number;
    /** The X the player chose for a "SACRIFICE any amount" line, if any. */
    x?: number;
    /** The largest printed max a "SACRIFICE any amount" line asked for (cost mode). */
    xMax?: number;
}

interface Frame {
    cardId: string;
    /** The Curse is being played with its SACRIFICE WAIVED. */
    waived: boolean;
}

const BEFRIEND_CONVICTION_VALUE = 1.5;
const PLAIN_CONVICTION_VALUE = 0.3;
const SAC_COST_VALUE = 0.6;
const CURSE_ADDED_VALUE = -4;
const CURSE_CLEARED_VALUE = 5;
const VULN_VALUE_PER_PCT_TURN = 0.08;
const TETHER_VALUE_PER_TURN = 3;
const LEECH_VALUE_PER_POINT = 1.6;
// The witness's weather: rounds an element is valued over, and its weights.
const ELEMENT_HORIZON = 3;
const ELEMENT_DOT_VALUE = 0.9;
const SELF_BURN_VALUE = 1.0;
const LETHAL_BURN_VALUE = 100;
const FROZEN_VALUE = 6;
const DRAW_VALUE = 3;

function expectedGlobalFires(trigger: GlobalTrigger, paid: boolean): number {
    const base = trigger === 'turn' ? GLOBAL_FREE_TURNS : trigger === 'sac' ? 2 : 1.5;
    return paid ? base * 2 : base;
}

class LineCtx implements ProgramCtx {
    constructor(private w: Work, private mode: Mode, private f: Frame) {}

    get q(): ProgramQuery {
        return buildQuery(this.w.s, this.mode === 'cost' ? this.w.cost : 0);
    }

    private stats() { return this.w.s.player.baseStats; }
    private incoming(): number { return this.w.kit.incomingNet(this.w.s); }

    // -- foe -----------------------------------------------------------------
    /** Returns the VITAE the foe actually lost (a hit past 0 counts what was left). */
    deal(n: number, opts?: { exact?: boolean; plus?: number }): number {
        const plus = Math.max(0, opts?.plus ?? 0);
        if (n <= 0 && plus <= 0) return 0;
        const enemy = this.w.s.enemy;
        if (isDefeated(enemy)) return 0;
        const base = (n > 0 ? (opts?.exact ? n : scaleFor(n, this.stats(), 'body', 'one-shot')) : 0) + plus;
        let dmg = base + this.w.l.nextDealBonus;
        // FROZEN: the next DEAL the foe takes is doubled, then FROZEN ends.
        if (this.w.l.el.frozen && this.mode !== 'cost') {
            dmg *= 2;
            this.w.l.el.frozen = false;
        }
        const vuln = getDamageTakenMultiplier(enemy);
        if (vuln !== 1) dmg = Math.round(dmg * vuln);
        const landed = Math.min(dmg, enemy.health);
        if (this.mode === 'cost') return landed;
        if (this.mode === 'value') {
            this.w.value += landed + (dmg >= enemy.health ? 20 : 0) + this.drainValue();
            return landed;
        }
        this.w.l.nextDealBonus = 0;
        this.hitFoe(dmg, true);
        return landed;
    }

    empowerNextDeal(n: number): void {
        if (n <= 0) return;
        if (this.mode === 'value') { this.w.value += n * 0.8; return; }
        if (this.mode === 'apply') this.w.l.nextDealBonus += n;
    }

    foeLoses(n: number): void {
        if (n <= 0 || isDefeated(this.w.s.enemy)) return;
        if (this.mode === 'value') {
            const enemy = this.w.s.enemy;
            this.w.value += Math.min(n, enemy.health) + (n >= enemy.health ? 20 : 0) + this.drainValue();
            return;
        }
        if (this.mode === 'apply') this.hitFoe(n, false);
    }

    /** A second TETHER extends the window, never doubles it. */
    tether(turns: number): void {
        if (turns <= 0) return;
        const l = this.w.l;
        if (this.mode === 'value') {
            const left = Math.max(0, l.tetherUntil - this.w.s.round + 1);
            this.w.value += Math.max(0, turns - left) * TETHER_VALUE_PER_TURN;
            return;
        }
        if (this.mode !== 'apply') return;
        l.tetherUntil = Math.max(l.tetherUntil, this.w.s.round + turns - 1);
        l.tetherCardId = this.f.cardId;
        l.tetherSourceName = null;
    }

    leech(n: number): void {
        if (n <= 0) return;
        const amt = scaleFor(n, this.stats(), 'heart', 'repeating');
        if (amt <= 0) return;
        const l = this.w.l;
        if (this.mode === 'value') {
            // The new potency over every turn left, plus three more turns of the old potency.
            const turns = l.leechTurns + LEECH_TURNS_PER_APPLICATION;
            this.w.value += (amt * turns + l.leechPotency * LEECH_TURNS_PER_APPLICATION) * LEECH_VALUE_PER_POINT;
            return;
        }
        if (this.mode !== 'apply') return;
        l.leechTurns += LEECH_TURNS_PER_APPLICATION;
        l.leechPotency += amt;
        l.leechCardId = this.f.cardId;
    }

    private drainValue(): number {
        const round = this.w.s.round;
        return this.w.l.drains.filter(d => d.untilRound >= round).reduce((s, d) => s + d.perHit, 0) * 0.8;
    }

    /** VITAE loss on the foe: `dealt` advances the damage-instance clock like
     *  any player hit; a plain loss does not. Then each drain HEALs. */
    hitFoe(amount: number, dealt: boolean): void {
        if (amount <= 0) return;
        const w = this.w;
        const before = w.s.enemy.health;
        let enemy: Enemy = applyDamage(w.s.enemy, amount);
        let extra = 0;
        if (dealt) {
            const clock = fireDotTrigger(enemy, 'damage-instance', w.s.round);
            if (clock.damage > 0) { enemy = clock.target; extra = clock.damage; }
        }
        const cardName = getCardById(this.f.cardId)?.name
            ?? (this.f.cardId === w.l.tetherCardId ? w.l.tetherSourceName : null)
            ?? this.f.cardId;
        w.s = {
            ...w.s, enemy,
            directDamageDealt: w.s.directDamageDealt + amount + extra,
            attribution: recordAttribution(w.s.attribution, this.f.cardId, cardName, null, amount, before),
        };
        w.events.push({ kind: 'damage-dealt', cardId: this.f.cardId, target: 'enemy', amount });
        const round = w.s.round;
        for (const d of w.l.drains) {
            if (d.untilRound >= round) this.healExact(d.perHit, false);
        }
    }

    vulnerable(pct: number, turns: number): void {
        const def = lookupEffect('debuff_vulnerable');
        if (!def || pct <= 0) return;
        const intensity = scaleEffectIntensity(def, pct, false, this.stats());
        if (this.mode === 'value') {
            const fresh = !this.w.s.enemy.effects.some(e => e.effectId === def.id);
            this.w.value += intensity * turns * VULN_VALUE_PER_PCT_TURN + (fresh ? 2 : 0);
            return;
        }
        if (this.mode !== 'apply') return;
        const w = this.w;
        const applied = applyEffect(w.s.enemy.effects, def, w.s.round, {
            intensityDelta: intensity, uncapped: true,
            durationMode: 'additive', durationDelta: turns, sourceId: this.f.cardId,
        });
        w.s = { ...w.s, enemy: { ...w.s.enemy, effects: applied.activeEffects } };
        const active = applied.result.activeEffect;
        if (active) {
            w.events.push({
                kind: 'effect-landed', cardId: this.f.cardId, effectId: def.id, target: 'enemy',
                effectKind: 'control', intensity: active.intensity, effect: def,
            });
        }
    }

    // -- self ----------------------------------------------------------------
    guard(n: number, opts?: { exact?: boolean; plus?: number }): number {
        const amt = (n > 0 ? (opts?.exact ? n : scaleFor(n, this.stats(), 'mind', 'one-shot')) : 0) + Math.max(0, opts?.plus ?? 0);
        if (amt <= 0) return 0;
        if (this.mode === 'value') {
            const need = Math.max(0, this.incoming());
            const useful = Math.min(amt, need);
            this.w.value += useful + 0.2 * (amt - useful);
        } else if (this.mode === 'apply') {
            this.w.s = { ...this.w.s, guard: (this.w.s.guard ?? 0) + amt };
        }
        return amt;
    }

    heal(n: number, opts?: { exact?: boolean; overflowToGuard?: boolean; plus?: number }): number {
        const amt = (n > 0 ? (opts?.exact ? n : scaleFor(n, this.stats(), 'mind', 'one-shot')) : 0) + Math.max(0, opts?.plus ?? 0);
        if (amt <= 0) return 0;
        return this.healExact(amt, opts?.overflowToGuard === true);
    }

    private healExact(amt: number, overflowToGuard: boolean): number {
        const p = this.w.s.player;
        const healed = Math.min(amt, Math.max(0, p.maxHealth - p.health));
        const toGuard = overflowToGuard ? amt - healed : 0;
        if (this.mode === 'value') {
            this.w.value += healed * 0.9 + toGuard * 0.5;
            return healed;
        }
        if (this.mode === 'apply') {
            this.w.s = {
                ...this.w.s,
                player: healCombatant(p, healed),
                guard: (this.w.s.guard ?? 0) + toGuard,
            };
            if (healed > 0) this.w.events.push({ kind: 'player-healed', cardId: this.f.cardId, amount: healed });
        }
        return healed;
    }

    conviction(n: number): void {
        if (n <= 0) return;
        if (this.mode === 'value') {
            const befriendable = this.w.s.enemy.friendshipReward !== undefined;
            const room = Math.max(0, this.w.kit.convictionCap - this.w.s.conviction);
            this.w.value += Math.min(n, room) * (befriendable ? BEFRIEND_CONVICTION_VALUE : PLAIN_CONVICTION_VALUE);
            return;
        }
        if (this.mode !== 'apply') return;
        const total = Math.min(this.w.kit.convictionCap, this.w.s.conviction + n);
        const gained = total - this.w.s.conviction;
        this.w.s = { ...this.w.s, conviction: total };
        if (gained > 0) this.w.events.push({ kind: 'conviction-gained', amount: gained, total, reason: 'effect' });
    }

    // -- SACRIFICE -----------------------------------------------------------
    sacrifice(n: number): void {
        this.sacrificeEvent(n);
    }

    sacrificeX(max: number): number {
        if (this.mode === 'cost') this.w.xMax = Math.max(this.w.xMax ?? 0, max);
        const x = this.chooseX(max);
        if (x <= 0) return 0;
        this.sacrificeEvent(x);
        return x;
    }

    /** The X: the player's choice when given (1..max), else the witness's —
     *  as much as it may pay without the telegraphed hit becoming lethal. */
    private chooseX(max: number): number {
        const vitae = this.w.s.player.health - (this.mode === 'cost' ? this.w.cost : 0);
        if (this.w.x !== undefined) return Math.max(1, Math.min(max, Math.floor(this.w.x)));
        const affordable = vitae - 1;
        if (affordable < 1) return this.mode === 'cost' ? 1 : 0;
        if (this.mode === 'cost') return 1;
        const safe = vitae - Math.max(0, this.incoming()) - 1;
        const cap = Math.min(max, affordable);
        return Math.max(1, Math.min(cap, Math.max(1, safe)));
    }

    /** One SACRIFICE: the turn's modifiers, the payment, the ledger, then
     *  each instance it counts as fires the 🩸 Globals and TETHER. A WAIVED
     *  SACRIFICE pays 0 and still counts. */
    private sacrificeEvent(nominalIn: number): void {
        if (nominalIn <= 0) return;
        const l = this.w.l;
        // Doubled: the cost and the count double. Counts twice: the count
        // doubles and each instance carries the whole payment.
        let costMult = 1;
        let echo = 1;
        if (l.nextDouble) { costMult = 2; l.nextDouble = false; }
        if (l.nextTwice) { echo = 2; l.nextTwice = false; }
        const nominal = nominalIn * costMult;
        const times = costMult * echo;
        let cost = nominal;
        if (this.f.waived) cost = 0;
        else if (l.waives > 0) { cost = 0; l.waives -= 1; }
        const perN = nominalIn;

        if (this.mode === 'cost') { this.w.cost += cost; return; }
        if (this.mode === 'value') {
            this.w.value -= cost * SAC_COST_VALUE;
            const tethered = l.tetherUntil >= this.w.s.round;
            for (let k = 0; k < times; k++) {
                this.fireTriggersValue('sac', perN);
                if (tethered) this.w.value += (cost / costMult) * getDamageTakenMultiplier(this.w.s.enemy);
            }
            return;
        }
        const w = this.w;
        const p = w.s.player;
        const paid = Math.max(0, Math.min(cost, p.health - 1));
        if (paid > 0) {
            w.s = { ...w.s, player: { ...p, health: p.health - paid } };
            l.lostThisCombat += paid;
            l.lostThisRound += paid;
            l.sacrificePaid += paid;
        }
        l.sacrificeCount += times;
        w.events.push({ kind: 'vitae-sacrificed', cardId: this.f.cardId, amount: paid, counted: nominalIn * times });
        const perPaid = Math.floor(paid / costMult);
        for (let k = 0; k < times; k++) {
            fireTriggers(w, 'sac', perN);
            if (perPaid > 0 && l.tetherUntil >= w.s.round && !isDefeated(w.s.enemy)) {
                // TETHER's hit is a DEAL: it takes the next-DEAL bonus.
                const dmg = Math.round((perPaid + l.nextDealBonus) * getDamageTakenMultiplier(w.s.enemy));
                l.nextDealBonus = 0;
                new LineCtx(w, 'apply', { cardId: l.tetherCardId ?? this.f.cardId, waived: false }).hitFoe(dmg, true);
            }
        }
    }

    private fireTriggersValue(trigger: GlobalTrigger, n: number): void {
        for (const g of this.w.l.globals) {
            const spec = cardProgram(g.cardId)?.global;
            if (!spec || spec.trigger !== trigger) continue;
            const ctx = new LineCtx(this.w, 'value', { cardId: g.cardId, waived: false });
            (g.paid ? spec.paid : spec.free)(ctx, n);
        }
    }

    // -- Curses ----------------------------------------------------------------
    addCurse(curseId: string, count: number): void {
        if (count <= 0) return;
        if (this.mode === 'value') {
            const curseGlobal = this.w.l.globals.some(g => cardProgram(g.cardId)?.global?.trigger === 'curse');
            this.w.value += count * (curseGlobal ? -1 : CURSE_ADDED_VALUE);
            return;
        }
        if (this.mode !== 'apply') return;
        const w = this.w;
        const added: CombatHandEntry[] = [];
        for (let i = 0; i < count; i++) {
            w.l.curseUid += 1;
            added.push({ uid: `pc${w.l.curseUid}`, cardId: curseId });
        }
        w.s = { ...w.s, hand: [...w.s.hand, ...added] };
        w.events.push({ kind: 'curse-added', cardId: curseId, count });
    }

    playCurseFromHandWaived(): number {
        const entry = this.w.s.hand.find(h => isCurseCard(h.cardId));
        if (!entry) return 0;
        if (this.mode === 'apply') {
            this.w.s = { ...this.w.s, hand: this.w.s.hand.filter(h => h.uid !== entry.uid) };
        }
        this.resolveCurse(entry.cardId);
        return 1;
    }

    /** A Curse played by another card: its PAID line with the SACRIFICE
     *  WAIVED, then its lifecycle (EXILE when the line says so), then the 📜 Globals. */
    private resolveCurse(cardId: string): void {
        const line = cardProgram(cardId)?.paid;
        if (!line) return;
        line.run(new LineCtx(this.w, this.mode, { cardId, waived: true }));
        if (this.mode === 'value') {
            this.w.value += CURSE_CLEARED_VALUE;
            this.fireTriggersValue('curse', 0);
            return;
        }
        if (this.mode !== 'apply') return;
        if (line.exile) {
            this.w.l.exiled.push(cardId);
            this.w.events.push({ kind: 'card-exiled', cardId });
        } else {
            this.w.s = { ...this.w.s, discard: [...this.w.s.discard, cardId] };
        }
        fireTriggers(this.w, 'curse', 0);
    }

    returnCurseFromDiscard(): number {
        const idx = this.w.s.discard.findIndex(isCurseCard);
        if (idx < 0) return 0;
        if (this.mode === 'value') {
            const curseGlobal = this.w.l.globals.some(g => cardProgram(g.cardId)?.global?.trigger === 'curse');
            this.w.value += curseGlobal ? 1 : -2;
            return 1;
        }
        if (this.mode !== 'apply') return 1;
        const discard = this.w.s.discard.slice();
        const [cardId] = discard.splice(idx, 1);
        this.w.l.curseUid += 1;
        this.w.s = { ...this.w.s, discard, hand: [...this.w.s.hand, { uid: `pc${this.w.l.curseUid}`, cardId }] };
        return 1;
    }

    exileCurseFromHand(): number {
        const entry = this.w.s.hand.find(h => isCurseCard(h.cardId));
        if (!entry) return 0;
        if (this.mode === 'value') { this.w.value += CURSE_CLEARED_VALUE; return 1; }
        if (this.mode !== 'apply') return 1;
        this.w.s = { ...this.w.s, hand: this.w.s.hand.filter(h => h.uid !== entry.uid) };
        this.w.l.exiled.push(entry.cardId);
        this.w.events.push({ kind: 'card-exiled', cardId: entry.cardId });
        return 1;
    }

    // -- modifiers and lasting effects -------------------------------------------
    sacModifier(mod: SacrificeModifier): void {
        if (this.mode === 'value') { this.w.value += modifierValue(this.w, mod); return; }
        if (this.mode !== 'apply') return;
        if (mod.kind === 'next-free') this.w.l.waives += mod.count;
        else if (mod.kind === 'next-twice') this.w.l.nextTwice = true;
        else this.w.l.nextDouble = true;
    }

    deathWard(): void {
        if (this.mode === 'value') {
            const lethal = this.incoming() >= this.w.s.player.health;
            this.w.value += lethal ? 40 : 0.5;
            return;
        }
        if (this.mode === 'apply') this.w.l.deathWardRound = this.w.s.round;
    }

    healNextTurn(n: number): void {
        const amt = scaleFor(n, this.stats(), 'mind', 'one-shot');
        if (this.mode === 'value') {
            const p = this.w.s.player;
            this.w.value += 0.8 * Math.min(amt, p.maxHealth - p.health + this.incoming());
            return;
        }
        if (this.mode === 'apply') this.w.l.pendingHeal += amt;
    }

    // -- the Elementalist's weather -------------------------------------------
    private el(): ElementState { return this.w.l.el; }

    /** The foe's hits this phase (before BLIZZARD and soak). */
    private hits(): number[] { return this.w.kit.incomingHits?.(this.w.s) ?? []; }

    /** Foe VITAE an INFERNO or STORM stack takes over the witness horizon, capped at what the foe has. */
    private foeLossValue(loss: number): number {
        const hp = this.w.s.enemy.health;
        return Math.min(loss, hp) * ELEMENT_DOT_VALUE;
    }

    /** Lethal-burn check for the witness: your next turn-start burn after the foe's telegraphed hit. */
    private burnIsLethal(burn: number): boolean {
        if (burn <= 0) return false;
        const el = this.el();
        // The foe dies to its own turn-start ticks before it can hit or you can burn.
        if (foeInferno(el) + el.storm >= this.w.s.enemy.health) return false;
        return this.w.s.player.health - Math.max(0, this.incoming()) - burn <= 0;
    }

    inferno(n: number, side: InfernoSide = 'both'): void {
        if (n <= 0) return;
        const el = this.el();
        if (this.mode === 'value') {
            let v = 0;
            if (side !== 'self') {
                const I = foeInferno(el);
                let loss = 0;
                for (let t = 0; t < ELEMENT_HORIZON; t++) loss += Math.max(0, I + n - t) - Math.max(0, I - t);
                v += this.foeLossValue(loss);
            }
            const kills = foeInferno(el) + (side !== 'self' ? n : 0) + el.storm >= this.w.s.enemy.health;
            if (kills) v += 15;
            if (side !== 'foe' && !kills) {
                const S = el.infShared, Y = el.infSelf;
                let burn = 0;
                for (let t = 0; t < ELEMENT_HORIZON; t++) {
                    if (side === 'both') burn += Math.floor(Math.max(0, S + n - t) / 2) - Math.floor(Math.max(0, S - t) / 2);
                    else burn += Math.max(0, Y + n - t) - Math.max(0, Y - t);
                }
                v -= burn * SELF_BURN_VALUE;
                const next = side === 'both' ? Math.floor((S + n) / 2) + Y : Math.floor(S / 2) + Y + n;
                if (this.burnIsLethal(next)) v -= LETHAL_BURN_VALUE;
            }
            this.w.value += v;
            return;
        }
        if (this.mode !== 'apply') return;
        if (side === 'both') el.infShared += n;
        else if (side === 'foe') el.infFoe += n;
        else el.infSelf += n;
    }

    /** The witness's worth of BLIZZARD going from `from` to `to`. */
    private blizzardValue(from: number, to: number): number {
        const hits = this.hits();
        if (hits.length === 0) return Math.max(0, to - from) * 0.3;
        const A = Math.max(...hits);
        let v = 0;
        for (let t = 0; t < ELEMENT_HORIZON; t++) {
            const per = hits.reduce((s, h) => s + Math.min(Math.max(0, to - t), h) - Math.min(Math.max(0, from - t), h), 0);
            v += per * (t === 0 ? 1 : 0.7);
        }
        if (from < A && to >= A) v += FROZEN_VALUE;
        return v;
    }

    blizzard(n: number): void {
        if (n <= 0) return;
        const el = this.el();
        if (this.mode === 'value') { this.w.value += this.blizzardValue(el.blizzard, el.blizzard + n); return; }
        if (this.mode === 'apply') el.blizzard += n;
    }

    storm(n: number): void {
        if (n <= 0) return;
        const el = this.el();
        if (this.mode === 'value') {
            this.w.value += this.foeLossValue(n * ELEMENT_HORIZON);
            if (foeInferno(el) + el.storm + n >= this.w.s.enemy.health) this.w.value += 15;
            return;
        }
        if (this.mode === 'apply') el.storm += n;
    }

    draw(n: number): void {
        if (n <= 0) return;
        const avail = this.w.s.drawPile.length + this.w.s.discard.length;
        if (this.mode === 'value') { this.w.value += DRAW_VALUE * Math.min(n, avail); return; }
        if (this.mode !== 'apply' || avail === 0) return;
        const w = this.w;
        const d = drawCombatCards(w.s.drawPile, w.s.discard, [], n, () => getRng().random());
        const added = d.drawn.map(cardId => ({ uid: `ed${++w.l.el.drawUid}`, cardId }));
        w.s = { ...w.s, drawPile: d.drawPile, discard: d.discard, hand: [...w.s.hand, ...added] };
        w.events.push({ kind: 'hand-drawn', cards: d.drawn });
    }

    /** The witness's worth of taking `amount` off your INFERNO (burn avoided, death avoided). */
    private relieveValue(amount: number): number {
        const yours = yourInferno(this.el());
        if (amount <= 0 || yours <= 0) return 0;
        let v = 0;
        for (let t = 0; t < ELEMENT_HORIZON; t++) v += Math.min(amount, Math.max(0, yours - t));
        v *= SELF_BURN_VALUE;
        if (this.burnIsLethal(yours) && !this.burnIsLethal(yours - amount)) v += LETHAL_BURN_VALUE;
        return v;
    }

    /** Takes `amount` off your INFERNO: first the INFERNO on you alone, then
     *  by turning both-sides INFERNO into foe-only INFERNO, two at a time. */
    private relieve(amount: number): void {
        const el = this.el();
        const fromSelf = Math.min(el.infSelf, amount);
        el.infSelf -= fromSelf;
        let rest = amount - fromSelf;
        while (rest > 0 && el.infShared > 0) {
            const before = Math.floor(el.infShared / 2);
            const k = Math.min(el.infShared, 2);
            el.infShared -= k;
            el.infFoe += k;
            rest -= before - Math.floor(el.infShared / 2);
        }
    }

    removeYourInferno(): number {
        const el = this.el();
        const yours = yourInferno(el);
        if (this.mode === 'value') { this.w.value += this.relieveValue(yours); return yours; }
        if (this.mode === 'apply') { el.infFoe += el.infShared; el.infShared = 0; el.infSelf = 0; }
        return yours;
    }

    moveYourInferno(share: 'half' | 'all'): number {
        const el = this.el();
        const yours = yourInferno(el);
        const h = share === 'all' ? yours : Math.floor(yours / 2);
        if (h <= 0) return 0;
        if (this.mode === 'value') {
            this.w.value += this.relieveValue(h);
            const I = foeInferno(el);
            let loss = 0;
            for (let t = 0; t < ELEMENT_HORIZON; t++) loss += Math.max(0, I + h - t) - Math.max(0, I - t);
            this.w.value += this.foeLossValue(loss);
            return h;
        }
        if (this.mode !== 'apply') return h;
        if (share === 'all') { el.infFoe += el.infShared; el.infShared = 0; el.infSelf = 0; }
        else this.relieve(h);
        el.infFoe += h;
        return h;
    }

    spendBlizzard(): number {
        const el = this.el();
        const b = el.blizzard;
        if (this.mode === 'value') this.w.value -= this.blizzardValue(0, b);
        else if (this.mode === 'apply') el.blizzard = 0;
        return b;
    }

    triggerStorm(): void {
        const el = this.el();
        const n = el.storm;
        if (n <= 0 || isDefeated(this.w.s.enemy)) return;
        if (this.mode === 'value') {
            const hp = this.w.s.enemy.health;
            this.w.value += Math.min(n, hp) + (n >= hp ? 20 : 0);
            return;
        }
        if (this.mode !== 'apply') return;
        this.hitFoe(n, false);
    }

    doubleBlizzardAndStorm(): void {
        const el = this.el();
        const b = el.blizzard, st = el.storm;
        this.blizzard(b);
        this.storm(st);
    }

    /** The witness's score of a weather: what the elements are worth to you now. */
    private weatherScore(e: ElementState): number {
        const hits = this.hits();
        const A = hits.length ? Math.max(...hits) : 0;
        return 3 * e.storm + 2 * Math.min(e.blizzard, A) + (A > 0 && e.blizzard >= A ? FROZEN_VALUE : 0)
            + 1.5 * foeInferno(e) - SELF_BURN_VALUE * 2 * yourInferno(e);
    }

    /** The three swaps of two elements' numbers, and the best one's gain. */
    private bestSwap(): { next: ElementState; gain: number } | null {
        const el = this.el();
        const I = foeInferno(el);
        const setInferno = (e: ElementState, v: number): void => {
            if (I > 0) {
                const shared = Math.round(v * el.infShared / I);
                e.infShared = shared; e.infFoe = v - shared;
            } else { e.infShared = v; e.infFoe = 0; }
        };
        const options: ElementState[] = [];
        { const e = { ...el }; setInferno(e, el.blizzard); e.blizzard = I; options.push(e); }
        { const e = { ...el }; setInferno(e, el.storm); e.storm = I; options.push(e); }
        { const e = { ...el }; e.blizzard = el.storm; e.storm = el.blizzard; options.push(e); }
        const base = this.weatherScore(el);
        let best: { next: ElementState; gain: number } | null = null;
        for (const e of options) {
            const gain = this.weatherScore(e) - base;
            if (gain > 0 && (!best || gain > best.gain)) best = { next: e, gain };
        }
        return best;
    }

    swapElements(): void {
        const best = this.bestSwap();
        if (!best) return;
        if (this.mode === 'value') { this.w.value += best.gain; return; }
        if (this.mode === 'apply') {
            const el = this.el();
            el.infShared = best.next.infShared; el.infFoe = best.next.infFoe;
            el.blizzard = best.next.blizzard; el.storm = best.next.storm;
        }
    }

    stormGrowthMarker(n: number): void {
        if (n <= 0 || this.mode !== 'value') return;
        this.w.value += (this.el().storm > 0 ? 1.5 : 0.7) * n;
    }

    drain(perHit: number, turns: number): void {
        const amt = scaleFor(perHit, this.stats(), 'mind', 'one-shot');
        if (this.mode === 'value') { this.w.value += amt * 2 * turns * 0.8; return; }
        if (this.mode === 'apply') this.w.l.drains.push({ perHit: amt, untilRound: this.w.s.round + turns - 1 });
    }
}

/** Witness value of a SACRIFICE modifier: what it saves on the other program
 *  lines in hand, or what an extra count is worth with a 🩸 Global out. */
function modifierValue(w: Work, mod: SacrificeModifier): number {
    const costs: number[] = [];
    for (const h of w.s.hand) {
        const program = cardProgram(h.cardId);
        if (!program || program.global) continue;
        for (const line of [program.free, program.paid]) {
            if (!line) continue;
            const c = probeLineCost(w.s, w.l, h.cardId, line, w.kit);
            if (c > 0) costs.push(c);
        }
    }
    const sacGlobal = w.l.globals.some(g => cardProgram(g.cardId)?.global?.trigger === 'sac');
    const biggest = costs.length ? Math.max(...costs) : 0;
    if (mod.kind === 'next-free') return SAC_COST_VALUE * biggest * Math.min(mod.count, costs.length);
    if (mod.kind === 'next-twice') return costs.length ? (sacGlobal ? 4 : 1) : 0;
    return costs.length ? (sacGlobal ? 4 : -SAC_COST_VALUE * biggest) : 0;
}

function buildQuery(s: CombatEncounterState, spent: number): ProgramQuery {
    const l = s.program ?? initProgramLedger();
    const vitae = s.player.health - spent;
    const maxVitae = s.player.maxHealth;
    return {
        vitae, maxVitae,
        missing: Math.max(0, maxVitae - vitae),
        atHalf: vitae <= maxVitae / 2,
        takenLastTurn: l.takenLastRound,
        lostThisCombat: l.lostThisCombat,
        lostThisRound: l.lostThisRound,
        cursesInHand: s.hand.filter(h => isCurseCard(h.cardId)).length,
        cursesInDiscard: s.discard.filter(isCurseCard).length,
        foeInferno: foeInferno(l.el ?? initElementState()),
        yourInferno: yourInferno(l.el ?? initElementState()),
        blizzard: l.el?.blizzard ?? 0,
        storm: l.el?.storm ?? 0,
        frozen: l.el?.frozen ?? false,
        elementsOnFoe: elementsOnFoe(l.el ?? initElementState()),
        handSize: s.hand.length,
    };
}

/** Fires every Global in play on `trigger` (apply mode). A Global whose
 *  SACRIFICE cannot be paid does not resolve. */
function fireTriggers(w: Work, trigger: GlobalTrigger, n: number): void {
    for (const g of w.l.globals.slice()) {
        const glob = cardProgram(g.cardId)?.global;
        if (!glob || glob.trigger !== trigger) continue;
        if (isDefeated(w.s.enemy)) return;
        const body = g.paid ? glob.paid : glob.free;
        const frame: Frame = { cardId: g.cardId, waived: false };
        const probe: Work = { ...w, s: { ...w.s, program: w.l }, l: cloneLedger(w.l), cost: 0, value: 0, events: [] };
        body(new LineCtx(probe, 'cost', frame), n);
        if (probe.cost > 0 && w.s.player.health - probe.cost < 1) continue;
        body(new LineCtx(w, 'apply', frame), n);
    }
}

// ── Legality, cost and value (shared by the engine, the mobile board and the witness) ──

function lineFor(program: CardProgram, paid: boolean): ProgramLine | undefined {
    return paid ? program.paid : program.free;
}

function probeLineCost(
    s: CombatEncounterState, l: ProgramLedger, cardId: string, line: ProgramLine, kit: ProgramKit, x?: number,
): number {
    const w: Work = { s: { ...s, program: l }, l: cloneLedger(l), events: [], kit, cost: 0, value: 0, x };
    line.run(new LineCtx(w, 'cost', { cardId, waived: false }));
    return w.cost;
}

/** The state with the played card out of hand (lines never see themselves). */
function withoutEntry(state: CombatEncounterState, uid: string): CombatEncounterState {
    return { ...state, hand: state.hand.filter(h => h.uid !== uid) };
}

/** The reason a line is refused at the SACRIFICE floor. */
export const SACRIFICE_FLOOR_REASON = 'that SACRIFICE would leave you below 1 VITAE';

/** A SACRIFICE the player cannot pay: what it costs and the VITAE they hold. */
export interface ProgramShortfall {
    cost: number;
    vitae: number;
}

/** The SACRIFICE floor: a cost that would leave less than 1 VITAE (null = payable). */
function floorShortfall(vitae: number, cost: number): ProgramShortfall | null {
    return cost > 0 && vitae - cost < 1 ? { cost, vitae } : null;
}

/**
 * Why a line cannot be played right now (null = it can). Covers printed
 * conditions, Curse targets, and the SACRIFICE floor (a line whose SACRIFICE
 * would leave less than 1 VITAE cannot be played). A Global is always
 * playable: copies stack (experimental). The die and the Color Law are
 * checked by the play itself.
 *
 * @param x - The amount chosen for a "SACRIFICE any amount" line.
 */
export function programIllegalReason(
    state: CombatEncounterState, uid: string, paid: boolean, kit: ProgramKit, x?: number,
): string | null {
    const entry = state.hand.find(h => h.uid === uid);
    if (!entry) return 'not in hand';
    const program = cardProgram(entry.cardId);
    const ledger = state.program ?? initProgramLedger();
    if (!program) return 'not a program card';
    const s = withoutEntry(state, uid);
    if (program.global) return null;
    const line = lineFor(program, paid);
    if (!line) return 'this card has no such line';
    if (line.requires && !line.requires.test(buildQuery({ ...s, program: ledger }, 0))) return line.requires.why;
    const cost = probeLineCost(s, ledger, entry.cardId, line, kit, x);
    if (floorShortfall(s.player.health, cost)) return SACRIFICE_FLOOR_REASON;
    return null;
}

/** The SACRIFICE a line would cost right now (0 for a Global). */
export function programLineCost(
    state: CombatEncounterState, uid: string, paid: boolean, kit: ProgramKit, x?: number,
): number {
    const entry = state.hand.find(h => h.uid === uid);
    const program = entry ? cardProgram(entry.cardId) : undefined;
    if (!entry || !program || program.global) return 0;
    const line = lineFor(program, paid);
    const ledger = state.program ?? initProgramLedger();
    return line ? probeLineCost(withoutEntry(state, uid), ledger, entry.cardId, line, kit, x) : 0;
}

/**
 * The SACRIFICE a line cannot pay, or null. Non-null exactly when
 * `programIllegalReason` refuses the line at the SACRIFICE floor; any other
 * refusal (a printed condition, a Curse target) or a payable line is null.
 *
 * @param x - The amount chosen for a "SACRIFICE any amount" line.
 */
export function programShortfall(
    state: CombatEncounterState, uid: string, paid: boolean, kit: ProgramKit, x?: number,
): ProgramShortfall | null {
    if (programIllegalReason(state, uid, paid, kit, x) !== SACRIFICE_FLOOR_REASON) return null;
    return floorShortfall(state.player.health, programLineCost(state, uid, paid, kit, x));
}

/**
 * The amounts a "SACRIFICE any amount (max n)" line accepts right now, or
 * null when the line has no X. `max` is already capped so the payment
 * leaves at least 1 VITAE (0 when even 1 cannot be paid).
 */
export function programXRange(
    state: CombatEncounterState, uid: string, paid: boolean, kit: ProgramKit,
): { min: number; max: number } | null {
    const entry = state.hand.find(h => h.uid === uid);
    const program = entry ? cardProgram(entry.cardId) : undefined;
    const line = program ? lineFor(program, paid) : undefined;
    if (!entry || !line || program?.global) return null;
    const ledger = state.program ?? initProgramLedger();
    const w: Work = {
        s: { ...withoutEntry(state, uid), program: ledger }, l: cloneLedger(ledger),
        events: [], kit, cost: 0, value: 0, x: 1,
    };
    line.run(new LineCtx(w, 'cost', { cardId: entry.cardId, waived: false }));
    const printedMax = w.xMax ?? 0;
    if (printedMax === 0) return null;
    let max = 0;
    for (let x = 1; x <= printedMax; x++) {
        if (programIllegalReason(state, uid, paid, kit, x) === null) max = x;
    }
    return { min: 1, max };
}

/** The witness's estimate of a line (higher is better). */
export function programLineValue(
    state: CombatEncounterState, uid: string, paid: boolean, kit: ProgramKit,
): number {
    const entry = state.hand.find(h => h.uid === uid);
    const program = entry ? cardProgram(entry.cardId) : undefined;
    if (!entry || !program) return 0;
    const ledger = state.program ?? initProgramLedger();
    const s = withoutEntry(state, uid);
    const w: Work = { s: { ...s, program: ledger }, l: cloneLedger(ledger), events: [], kit, cost: 0, value: 0 };
    const frame: Frame = { cardId: entry.cardId, waived: false };
    if (program.global) {
        const body = paid ? program.global.paid : program.global.free;
        const n = program.global.trigger === 'sac' ? 4 : 0;
        body(new LineCtx(w, 'value', frame), n);
        return w.value * expectedGlobalFires(program.global.trigger, paid);
    }
    const line = lineFor(program, paid);
    if (!line) return 0;
    line.run(new LineCtx(w, 'value', frame));
    return w.value;
}

/**
 * Which verbs a line uses, by name, read off a value-mode run (the witness
 * orders its FREE plays by them). Pure.
 */
export function programLineVerbs(state: CombatEncounterState, cardId: string, paid: boolean, kit: ProgramKit): Set<string> {
    const used = new Set<string>();
    const program = cardProgram(cardId);
    const line = program && !program.global ? lineFor(program, paid) : undefined;
    if (!line) return used;
    const ledger = state.program ?? initProgramLedger();
    const ctx = new LineCtx(
        { s: { ...state, program: ledger }, l: cloneLedger(ledger), events: [], kit, cost: 0, value: 0 },
        'value', { cardId, waived: false },
    );
    const spy = new Proxy(ctx, {
        get(target, prop, receiver) {
            const v = Reflect.get(target, prop, receiver);
            if (typeof v !== 'function') return v;
            return (...args: unknown[]) => { used.add(String(prop)); return (v as (...a: unknown[]) => unknown).apply(target, args); };
        },
    });
    line.run(spy);
    return used;
}

// ── Play ────────────────────────────────────────────────────────────────────

export interface ProgramPlayResult {
    state: CombatEncounterState;
    events: CombatEvent[];
}

/**
 * Plays a program card's FREE or PAID line. An illegal play fizzles with the
 * reason and changes nothing. A PAID play spends its die under the Color Law
 * and emits `card-played` with the die, so the engine's BOON and momentum
 * bookkeeping run as for any PAID play.
 *
 * @param x - The amount chosen for a "SACRIFICE any amount" line (the witness
 *            picks one when it is absent).
 */
export function playProgramCard(
    state: CombatEncounterState, uid: string, useBottom: boolean, dieId: string | undefined, kit: ProgramKit,
    x?: number,
): ProgramPlayResult {
    const entry = state.hand.find(h => h.uid === uid);
    const card = entry ? getCardById(entry.cardId) : undefined;
    const program = card?.program;
    if (!entry || !card || !program) return { state, events: [] };
    const ledgerIn = state.program ?? initProgramLedger();
    const fizzle = (message: string): ProgramPlayResult => ({
        state, events: [{ kind: 'effect-fizzled', cardId: card.id, effectId: '', message }],
    });

    const reason = programIllegalReason(state, uid, useBottom, kit, x);
    if (reason) return fizzle(reason);

    let s = state;
    let usedDie: CombatManaDie | null = null;
    if (useBottom) {
        if (dieId === undefined) return fizzle('choose a die to power this card');
        const banked = (s.reserve ?? []).find(d => d.id === dieId);
        const floating = s.dice.find(d => d.id === dieId && d.floating && d.state === 'available');
        const tray = s.dice.find(d => d.id === dieId && !d.floating && d.state === 'available' && d.face !== 'miss');
        const die = banked ?? floating ?? tray;
        if (!die) return fizzle('that die cannot power this card');
        if (!(card.color === 'any' || die.color === 'wild' || die.color === card.color)) {
            return fizzle(`a ${die.color} die cannot power a ${card.color} card — colors must match`);
        }
        usedDie = die;
        if (banked) s = { ...s, reserve: (s.reserve ?? []).filter(d => d.id !== die.id) };
        else if (floating) {
            s = {
                ...s,
                dice: s.dice.filter(d => d.id !== die.id),
                floatingDice: (s.floatingDice ?? []).filter(d => d.id !== die.id),
            };
        } else s = { ...s, dice: spendDice(s.dice, [die.id]) };
    }

    const events: CombatEvent[] = [
        { kind: 'card-played', cardId: card.id, useBottom, dieId: usedDie?.id ?? null },
    ];
    if (usedDie) events.push({ kind: 'die-spent', dieId: usedDie.id, color: usedDie.color });

    const ledger = cloneLedger(ledgerIn);
    const w: Work = { s: { ...withoutEntry(s, uid), program: ledger }, l: ledger, events, kit, cost: 0, value: 0, x };
    const frame: Frame = { cardId: card.id, waived: false };

    if (program.global) {
        const turnsLeft = useBottom ? null : GLOBAL_FREE_TURNS;
        w.l.globalUid = (w.l.globalUid ?? 0) + 1;
        w.l.globals.push({ uid: `g${w.l.globalUid}`, cardId: card.id, paid: useBottom, turnsLeft });
        w.events.push({ kind: 'global-entered', cardId: card.id, paid: useBottom, turnsLeft });
    } else {
        const line = lineFor(program, useBottom) as ProgramLine;
        line.run(new LineCtx(w, 'apply', frame));
        if (useBottom && line.exile) {
            w.l.exiled.push(card.id);
            w.events.push({ kind: 'card-exiled', cardId: card.id });
        } else {
            w.s = { ...w.s, discard: [...w.s.discard, card.id] };
        }
        if (card.cardType === 'curse') fireTriggers(w, 'curse', 0);
    }
    if (useBottom) w.s = { ...w.s, spellsPlayedThisTurn: (w.s.spellsPlayedThisTurn ?? 0) + 1 };
    w.events.push(...weatherEvents(ledgerIn.el, w.l.el));
    return { state: { ...w.s, program: w.l }, events: w.events };
}

/**
 * Start of the player's turn: the turn's SACRIFICE modifiers reset, a
 * pending HEAL lands, ⟳ Globals fire, then each FREE Global counts down and
 * leaves play (to discard) after its third turn start.
 */
export function programTurnStart(state: CombatEncounterState, kit: ProgramKit): ProgramPlayResult {
    if (!state.program) return { state, events: [] };
    const l = cloneLedger(state.program);
    const w: Work = { s: { ...state, program: l }, l, events: [], kit, cost: 0, value: 0 };
    l.waives = 0;
    l.nextDouble = false;
    l.nextTwice = false;
    l.nextDealBonus = 0;
    l.drains = l.drains.filter(d => d.untilRound >= state.round);
    if (l.pendingHeal > 0) {
        const p = w.s.player;
        const healed = Math.min(l.pendingHeal, Math.max(0, p.maxHealth - p.health));
        w.s = { ...w.s, player: healCombatant(p, healed) };
        if (healed > 0) w.events.push({ kind: 'player-healed', cardId: 'pending-heal', amount: healed });
        l.pendingHeal = 0;
    }
    // INFERNO: you lose half the both-sides INFERNO (rounded down)
    // plus any INFERNO on you alone. Plain loss; it can kill you.
    const burn = yourInferno(l.el ?? initElementState());
    if (burn > 0 && !isDefeated(w.s.enemy)) {
        const p = w.s.player;
        const lost = Math.min(burn, Math.max(0, p.health));
        w.s = { ...w.s, player: { ...p, health: p.health - lost } };
        l.lostThisCombat += lost;
        l.lostThisRound += lost;
        w.events.push({ kind: 'dot-tick', effectId: 'inferno', label: 'INFERNO', amount: lost, target: 'self' });
        if (w.s.player.health <= 0) return { state: { ...w.s, program: l }, events: w.events };
    }
    fireTriggers(w, 'turn', 0);
    const stay: GlobalInPlay[] = [];
    const leaving: string[] = [];
    for (const g of l.globals) {
        if (g.turnsLeft === null) { stay.push(g); continue; }
        const left = g.turnsLeft - 1;
        if (left > 0) stay.push({ ...g, turnsLeft: left });
        else leaving.push(g.cardId);
    }
    l.globals = stay;
    for (const cardId of leaving) w.events.push({ kind: 'global-left', cardId });
    if (leaving.length) w.s = { ...w.s, discard: [...w.s.discard, ...leaving] };
    w.events.push(...weatherEvents(state.program.el, l.el));
    return { state: { ...w.s, program: l }, events: w.events };
}

/**
 * A signature's TETHER and SACRIFICE modifier, applied outside any card line:
 * TETHER `turns` (this turn included) and the next SACRIFICE this turn counts
 * twice. Creates the ledger when the fight has none, so the rest of the
 * program runtime (turn starts, foe turns) picks it up.
 */
export function programTetherAndTwice(
    state: CombatEncounterState, source: { id: string; name: string }, turns: number,
): CombatEncounterState {
    const l = cloneLedger(state.program ?? initProgramLedger());
    l.tetherUntil = Math.max(l.tetherUntil, state.round + turns - 1);
    l.tetherCardId = source.id;
    l.tetherSourceName = source.name;
    l.nextTwice = true;
    return { ...state, program: l };
}

/**
 * Start of the foe's turn (before its telegraphed action): the foe loses its
 * LEECH potency in VITAE (not a DEAL: unscaled, no VULNERABLE), the player
 * HEALs the VITAE actually lost (capped at max), then a LEECH turn ticks off.
 * At 0 turns LEECH ends and the potency resets.
 */
export function programFoeTurnStart(state: CombatEncounterState): ProgramPlayResult {
    const l = state.program;
    const n = l && l.leechTurns > 0 ? l.leechPotency : 0;
    if (!l || n <= 0 || isDefeated(state.enemy)) return { state, events: [] };
    const turns = l.leechTurns - 1;
    const lost = Math.min(n, state.enemy.health);
    const cardId = l.leechCardId ?? 'leech';
    const cardName = getCardById(cardId)?.name ?? cardId;
    const before = state.enemy.health;
    const enemy = applyDamage(state.enemy, lost);
    const p = state.player;
    const healed = Math.min(lost, Math.max(0, p.maxHealth - p.health));
    const events: CombatEvent[] = [{ kind: 'damage-dealt', cardId, target: 'enemy', amount: lost }];
    if (healed > 0) events.push({ kind: 'player-healed', cardId, amount: healed });
    return {
        state: {
            ...state, enemy,
            player: healCombatant(p, healed),
            directDamageDealt: state.directDamageDealt + lost,
            attribution: recordAttribution(state.attribution, cardId, cardName, null, lost, before),
            program: turns > 0
                ? { ...l, leechTurns: turns }
                : { ...l, leechTurns: 0, leechPotency: 0, leechCardId: null },
        },
        events,
    };
}

/**
 * Start of the foe's turn, the weather: the foe loses its INFERNO,
 * then its STORM (both plain loss), then the STORM grows by 1, plus 1 per
 * STORM-growth Global in play (E-06).
 */
export function programElementFoeTurnStart(state: CombatEncounterState): ProgramPlayResult {
    const l = state.program;
    if (!l || !anyElement(l.el) || isDefeated(state.enemy)) return { state, events: [] };
    const el = { ...l.el };
    const events: CombatEvent[] = [];
    let s = state;
    const lose = (amount: number, id: string, label: string): number => {
        if (amount <= 0 || isDefeated(s.enemy)) return 0;
        const before = s.enemy.health;
        const lost = Math.min(amount, before);
        s = {
            ...s, enemy: applyDamage(s.enemy, lost),
            attribution: recordAttribution(s.attribution, id, label, null, lost, before),
        };
        events.push({ kind: 'dot-tick', effectId: id, label, amount: lost, target: 'enemy' });
        return lost;
    };
    lose(foeInferno(el), 'inferno', 'INFERNO');
    if (el.storm > 0) {
        lose(el.storm, 'storm', 'STORM');
        const extra = l.globals.reduce((sum, g) => sum + (cardProgram(g.cardId)?.global?.stormGrowth ?? 0), 0);
        el.storm += 1 + extra;
    }
    events.push(...weatherEvents(l.el, el));
    return { state: { ...s, program: { ...l, el } }, events };
}

/**
 * The FROZEN check, as the foe is about to attack: when its every
 * hit this phase is at most the BLIZZARD, the foe is FROZEN. Returns the
 * state, the BLIZZARD to take off each hit, and the `weather-changed` event
 * when FROZEN comes up.
 */
export function programFrozenCheck(
    state: CombatEncounterState, hits: readonly number[],
): { state: CombatEncounterState; blizzard: number; events: CombatEvent[] } {
    const l = state.program;
    if (!l || isDefeated(state.enemy)) return { state, blizzard: 0, events: [] };
    const el = l.el ?? initElementState();
    if (el.blizzard <= 0) return { state, blizzard: 0, events: [] };
    if (hits.length > 0 && el.blizzard >= Math.max(...hits)) {
        const next = { ...el, frozen: true };
        return {
            state: { ...state, program: { ...l, el: next } }, blizzard: el.blizzard,
            events: weatherEvents(el, next),
        };
    }
    return { state, blizzard: el.blizzard, events: [] };
}

/** The round boundary for the weather: INFERNO and BLIZZARD drift down. */
export function programElementDrift(l: ProgramLedger): ProgramLedger {
    return { ...l, el: driftElements(l.el ?? initElementState()) };
}

/** Damage the player takes from the foe: the death ward clamps it. Returns the clamped damage. */
export function programClampDamage(state: CombatEncounterState, health: number, dmg: number): number {
    const l = state.program;
    if (!l || dmg <= 0) return dmg;
    if (l.deathWardRound === state.round) return Math.max(0, Math.min(dmg, health - 1));
    return dmg;
}

/** Folds VITAE the player lost to damage into the ledger. */
export function programRecordDamage(l: ProgramLedger, taken: number): ProgramLedger {
    if (taken <= 0) return l;
    return {
        ...l,
        lostThisCombat: l.lostThisCombat + taken,
        lostThisRound: l.lostThisRound + taken,
        takenThisRound: l.takenThisRound + taken,
    };
}

/** The round boundary: this round's damage taken becomes last round's, and
 *  the VITAE lost this round starts again at 0. */
export function programRollRound(l: ProgramLedger): ProgramLedger {
    return { ...l, takenLastRound: l.takenThisRound, takenThisRound: 0, lostThisRound: 0 };
}

/**
 * The deck a refill may reshuffle when both the draw pile and the discard
 * are empty: the deck minus the cards out of the cycle (EXILED, Globals in
 * play, cards in hand), one deck copy per entry (two instances of a Global
 * in play take two copies out).
 */
export function programDrawFallback(state: CombatEncounterState): readonly string[] {
    const l = state.program;
    if (!l) return state.deck;
    const out = state.deck.slice();
    const remove = [...l.exiled, ...l.globals.map(g => g.cardId), ...state.hand.map(h => h.cardId)];
    for (const id of remove) {
        const i = out.indexOf(id);
        if (i >= 0) out.splice(i, 1);
    }
    return out;
}

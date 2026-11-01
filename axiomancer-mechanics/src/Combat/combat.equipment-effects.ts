/**
 * EQUIPMENT EFFECTS: a worn weapon and armor's one fight effect
 * (the shape is `EquipmentEffect` in `Items/types.ts`).
 *
 * The worn effects are read once, at `initializeCombatEncounter`, into
 * `CombatEncounterState.equipmentEffects`; a fight whose worn gear carries no
 * effect has no such state and nothing here runs. The state holds the turn's
 * "first" flags (reset at the start of each of your turns) and a pending
 * +n for the next card DEAL.
 *
 * The engine calls one function, `fireEquipment(hook, state, events)`, at each
 * hook point, on both the program path (`combat.card-program.ts`) and the
 * grey cards' path (`combat.engine.ts`):
 *
 *   'card-deal'    a card's DEAL is about to land: fires 'card-deal', the
 *                  turn's first 'first-card-deal', and every condition that
 *                  holds; returns the +n the DEAL takes (unscaled, before
 *                  VULNERABLE, as the next-DEAL bonus is). A card's DEAL is a
 *                  card line's (RADIANCE and the MERCY burst included), never
 *                  a Global's, TETHER's, THORNS' or REFLECT's.
 *   'card-guard'   a card line gave you GUARD: fires the turn's first 'first-guard'.
 *   'sacrifice', 'inferno', 'discard-pay', 'heal'   fire the trigger of that name.
 *
 * The gear's own HEAL, GUARD, draw and Conviction never call a hook, so a
 * piece can never fire itself (or another piece) again. Each firing pushes an
 * `equipment-fired` event naming the piece.
 *
 * The dice half of a piece (`initEquipmentDice`) is read at the same moment
 * into `CombatEncounterState.equipmentDice`: the worn armor's die change
 * (`applyDieChanges`, applied by `activeDieGear` on top of the character's die
 * gear) and the worn weapon's special payload (paid where a special-face die
 * is used to power a card). With no weapon worn a special only powers its card.
 *
 * This module never imports the engine (the Conviction cap is stored in the
 * state at fight setup).
 */

import type { EquipmentLoadout } from '../Character/types';
import type {
    Equipment, EquipmentCondition, EquipmentConditionEffect, EquipmentDieChange, EquipmentEffect,
    EquipmentPayoff, EquipmentSlot, EquipmentTrigger, EquipmentTriggerEffect, SpecialPayload,
} from '../Items/types';
import { getRng } from '../Utils/rng';
import { drawCombatCards } from './combat.deck';
import { elementsOnFoe, initElementState } from './combat.elements';
import { cutGuardGain, veilHeal } from './combat.enemy-words';
import { heal as healCombatant } from './health';
import type { CombatEncounterState, CombatEvent, UpgradeableDieGear } from './combat.encounter.types';

/** One worn piece that carries an effect, as read at fight setup. */
export interface WornEquipmentEffect {
    itemId: string;
    itemName: string;
    slot: EquipmentSlot;
    /** The trigger or condition half; a piece whose only effect is on the dice is not listed. */
    effect: EquipmentTriggerEffect | EquipmentConditionEffect;
}

/**
 * The fight's dice effects, read at fight setup: the worn armor's die change
 * and the worn weapon's special payload. `special` is absent when no weapon
 * with a payload is worn: a special then only powers its card.
 */
export interface EquipmentDiceState {
    dieChanges: EquipmentDieChange[];
    special?: SpecialPayload;
    /** The weapon that sets the special (for the event and the log). */
    specialSource?: { itemId: string; itemName: string };
}

/** The fight's equipment-effect state (present only when the worn gear carries an effect). */
export interface EquipmentEffectsState {
    worn: WornEquipmentEffect[];
    /** The Conviction cap a Conviction payoff stops at. */
    convictionCap: number;
    /** A card's DEAL already landed this turn (the 'first-card-deal' trigger is spent). */
    firstDealDone: boolean;
    /** A card line already gave you GUARD this turn (the 'first-guard' trigger is spent). */
    firstGuardDone: boolean;
    /** +n to your next card DEAL this turn: a +n payoff on a trigger that is not a DEAL. */
    nextDealBonus: number;
    /** Counter for the hand uids of cards a draw payoff adds. */
    drawUid: number;
}

/** Where the engine calls in. */
export type EquipmentHook = 'card-deal' | 'card-guard' | 'sacrifice' | 'inferno' | 'discard-pay' | 'heal';

export interface EquipmentFiring {
    state: CombatEncounterState;
    /** The +n a 'card-deal' adds to its DEAL; 0 for every other hook. */
    bonus: number;
}

/** A worn slot entry is a piece (the relic row may hold holes). */
function isWorn(e: Equipment | null | undefined): e is Equipment {
    return !!e;
}

/** A usable effect: a known shape with a positive number. */
function liveEffect(e: EquipmentEffect | undefined): e is EquipmentTriggerEffect | EquipmentConditionEffect {
    if (!e) return false;
    if (e.condition !== undefined) return (e.bonus ?? 0) > 0;
    return e.trigger !== undefined && !!e.payoff && e.payoff.amount > 0;
}

/** A usable die change: a known colour and change. */
function liveDieChange(d: EquipmentDieChange | undefined): d is EquipmentDieChange {
    return !!d && ['heart', 'body', 'mind', 'wild'].includes(d.color)
        && (d.change === 'miss-to-mana' || d.change === 'mana-to-special');
}

/** A usable special payload: a positive amount. */
function livePayload(p: SpecialPayload | undefined): p is SpecialPayload {
    return !!p && p.amount > 0;
}

/**
 * The worn pieces' effects, weapon, then armor, then relics in their order.
 * Null-safe on every slot.
 */
export function wornEquipmentEffects(loadout: EquipmentLoadout | undefined | null): WornEquipmentEffect[] {
    if (!loadout) return [];
    const relics: ReadonlyArray<Equipment | null | undefined> = loadout.relics ?? [];
    const pieces = [loadout.weapon, loadout.armor, ...relics].filter(isWorn);
    return pieces
        .filter(p => liveEffect(p.effect))
        .map(p => ({
            itemId: p.id, itemName: p.name, slot: p.slot,
            effect: p.effect as EquipmentTriggerEffect | EquipmentConditionEffect,
        }));
}

/**
 * The fight's dice effects, or undefined when nothing worn has one. The die
 * change comes from the worn armor; the special payload from the worn weapon.
 */
export function initEquipmentDice(loadout: EquipmentLoadout | undefined | null): EquipmentDiceState | undefined {
    if (!loadout) return undefined;
    const die = loadout.armor?.effect?.die;
    const dieChanges = liveDieChange(die) ? [die] : [];
    const weapon = loadout.weapon;
    const special = weapon?.effect?.special;
    if (dieChanges.length === 0 && !livePayload(special)) return undefined;
    return {
        dieChanges,
        ...(livePayload(special) && weapon
            ? { special, specialSource: { itemId: weapon.id, itemName: weapon.name } }
            : {}),
    };
}

/**
 * One die's gear with the worn armor's change applied on top of it. A
 * `'miss-to-mana'` change needs a miss face left (special + mana below 6);
 * a `'mana-to-special'` change needs a mana face. Otherwise the die gains nothing.
 */
export function applyDieChanges(
    gear: UpgradeableDieGear,
    changes: readonly EquipmentDieChange[] | undefined,
): UpgradeableDieGear {
    let out = gear;
    for (const c of changes ?? []) {
        if (c.color !== out.dieColor) continue;
        if (c.change === 'miss-to-mana') {
            if (out.specialFaces + out.manaFaces < DIE_FACE_COUNT) out = { ...out, manaFaces: out.manaFaces + 1 };
        } else if (out.manaFaces > 0) {
            out = { ...out, manaFaces: out.manaFaces - 1, specialFaces: out.specialFaces + 1 };
        }
    }
    return out;
}

/** Faces on a die. */
const DIE_FACE_COUNT = 6;

/** The fight's equipment state, or undefined when nothing worn carries an effect. */
export function initEquipmentEffects(
    loadout: EquipmentLoadout | undefined | null, convictionCap: number,
): EquipmentEffectsState | undefined {
    const worn = wornEquipmentEffects(loadout);
    if (worn.length === 0) return undefined;
    return { worn, convictionCap, firstDealDone: false, firstGuardDone: false, nextDealBonus: 0, drawUid: 0 };
}

/** The start of your turn: the "first" triggers re-arm and a pending +n expires. */
export function equipmentTurnStart(state: CombatEncounterState): CombatEncounterState {
    const g = state.equipmentEffects;
    if (!g) return state;
    if (!g.firstDealDone && !g.firstGuardDone && g.nextDealBonus === 0) return state;
    return { ...state, equipmentEffects: { ...g, firstDealDone: false, firstGuardDone: false, nextDealBonus: 0 } };
}

/** Whether a condition holds as a card's DEAL resolves. */
function conditionHolds(state: CombatEncounterState, c: EquipmentCondition): boolean {
    switch (c) {
        case 'foe-has-weather': return elementsOnFoe(state.program?.el ?? initElementState()) > 0;
        case 'guard-holds': return (state.guard ?? 0) > 0;
        case 'foe-above-half': return state.enemy.health > state.enemy.maxHealth / 2;
    }
}

/** The triggers a hook fires (the "first" ones only while unspent). */
function firesOn(hook: EquipmentHook, t: EquipmentTrigger, g: EquipmentEffectsState): boolean {
    switch (hook) {
        case 'card-deal': return t === 'card-deal' || (t === 'first-card-deal' && !g.firstDealDone);
        case 'card-guard': return t === 'first-guard' && !g.firstGuardDone;
        default: return t === hook;
    }
}

/**
 * The +n a card's DEAL would take right now, without firing anything (the
 * sim witness's estimate and the cost probe).
 */
export function equipmentDealBonusPreview(state: CombatEncounterState): number {
    const g = state.equipmentEffects;
    if (!g) return 0;
    let bonus = g.nextDealBonus;
    for (const w of g.worn) {
        const e = w.effect;
        if (e.condition !== undefined) {
            if (conditionHolds(state, e.condition)) bonus += e.bonus;
        } else if (e.payoff.kind === 'deal-bonus' && firesOn('card-deal', e.trigger, g)) {
            bonus += e.payoff.amount;
        }
    }
    return bonus;
}

/** One payoff, applied. Returns the state and what it actually gave. */
function pay(
    state: CombatEncounterState, payoff: EquipmentPayoff, g: EquipmentEffectsState, events: CombatEvent[],
): { state: CombatEncounterState; amount: number } {
    const n = payoff.amount;
    switch (payoff.kind) {
        case 'heal': {
            const p = state.player;
            const healed = Math.min(veilHeal(state, n), Math.max(0, p.maxHealth - p.health));
            if (healed <= 0) return { state, amount: 0 };
            return { state: { ...state, player: healCombatant(p, healed) }, amount: healed };
        }
        case 'guard': {
            const gained = cutGuardGain(state, n, events);
            if (gained <= 0) return { state, amount: 0 };
            return { state: { ...state, guard: (state.guard ?? 0) + gained }, amount: gained };
        }
        case 'conviction': {
            const total = Math.min(g.convictionCap, state.conviction + n);
            const gained = Math.max(0, total - state.conviction);
            if (gained <= 0) return { state, amount: 0 };
            events.push({ kind: 'conviction-gained', amount: gained, total, reason: 'effect' });
            return { state: { ...state, conviction: total }, amount: gained };
        }
        case 'draw': {
            if (state.drawPile.length + state.discard.length === 0) return { state, amount: 0 };
            const d = drawCombatCards(state.drawPile, state.discard, [], n, () => getRng().random());
            const added = d.drawn.map(cardId => ({ uid: `eq${++g.drawUid}`, cardId }));
            if (d.drawn.length > 0) events.push({ kind: 'hand-drawn', cards: d.drawn });
            return {
                state: { ...state, drawPile: d.drawPile, discard: d.discard, hand: [...state.hand, ...added] },
                amount: d.drawn.length,
            };
        }
        case 'deal-bonus':
            // A +n off a DEAL trigger is the caller's (it adds to that DEAL);
            // off any other trigger it waits for your next card DEAL this turn.
            g.nextDealBonus += n;
            return { state, amount: n };
    }
}

/**
 * Fires every worn effect the hook reaches, in worn order, and pushes one
 * `equipment-fired` event per firing. Returns the new state and, for
 * 'card-deal', the +n that DEAL takes. No equipment state, no change.
 */
export function fireEquipment(
    hook: EquipmentHook, stateIn: CombatEncounterState, events: CombatEvent[],
): EquipmentFiring {
    const g0 = stateIn.equipmentEffects;
    if (!g0) return { state: stateIn, bonus: 0 };
    const g: EquipmentEffectsState = { ...g0 };
    let state = stateIn;
    let bonus = 0;
    if (hook === 'card-deal') {
        // Conditions read the fight as the DEAL resolves, before this DEAL's own payoffs.
        for (const w of g.worn) {
            const e = w.effect;
            if (e.condition === undefined || !conditionHolds(state, e.condition)) continue;
            bonus += e.bonus;
            events.push({
                kind: 'equipment-fired', itemId: w.itemId, itemName: w.itemName, slot: w.slot,
                condition: e.condition, payoff: 'deal-bonus', amount: e.bonus,
            });
        }
        bonus += g.nextDealBonus;
        g.nextDealBonus = 0;
    }
    for (const w of g.worn) {
        const e = w.effect;
        if (e.condition !== undefined || !firesOn(hook, e.trigger, g)) continue;
        let amount: number;
        if (hook === 'card-deal' && e.payoff.kind === 'deal-bonus') {
            bonus += e.payoff.amount;
            amount = e.payoff.amount;
        } else {
            const paid = pay(state, e.payoff, g, events);
            state = paid.state;
            amount = paid.amount;
        }
        events.push({
            kind: 'equipment-fired', itemId: w.itemId, itemName: w.itemName, slot: w.slot,
            trigger: e.trigger, payoff: e.payoff.kind, amount,
        });
    }
    if (hook === 'card-deal') g.firstDealDone = true;
    if (hook === 'card-guard') g.firstGuardDone = true;
    return { state: { ...state, equipmentEffects: g }, bonus };
}

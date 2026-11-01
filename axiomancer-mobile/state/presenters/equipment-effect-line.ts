/**
 * Equipment EFFECT LINE: the one presenter that words what a worn weapon or
 * armor does. The satchel row, the worn dock, the detail card, the combat log
 * and the dice tray's special gloss all read it, so a piece says the same thing
 * on every surface.
 *
 * Words are Dawncaster-terse: the payload only, in the game's keyword caps
 * (DEAL, GUARD, HEAL, INFERNO, VULNERABLE), no "when" or "you".
 *
 *   trigger piece    "First DEAL: +2 DEAL"       (a DEAL trigger paying DEAL says "First DEAL +2")
 *   condition piece  "DEAL +2 while GUARD holds"
 *   weapon special   "Special: +2 Conviction"
 *   armor die        "Gold die: +1 hit"
 *
 * Pure: an effect in, strings out. No store, no RNG.
 */

import type {
    EquipmentCondition,
    EquipmentDieChange,
    EquipmentDieColor,
    EquipmentEffect,
    EquipmentPayoff,
    EquipmentTrigger,
    SpecialPayload,
} from '@mechanics';

/** What each trigger is called, as the head of its line. */
const TRIGGER_WORD: Record<EquipmentTrigger, string> = {
    'card-deal': 'Each DEAL',
    'first-card-deal': 'First DEAL',
    'first-guard': 'First GUARD',
    sacrifice: 'Each SACRIFICE',
    inferno: 'Each INFERNO',
    'discard-pay': 'Each discard',
    heal: 'Each HEAL',
};

/** What each condition reads as, after "DEAL +n". */
const CONDITION_WORD: Record<EquipmentCondition, string> = {
    'foe-has-weather': 'while the foe has weather',
    'guard-holds': 'while GUARD holds',
    'foe-above-half': 'while the foe is above half VITAE',
};

/** The die colours, as the dice are called on the board. */
const DIE_WORD: Record<EquipmentDieColor, string> = {
    body: 'Red',
    mind: 'Blue',
    heart: 'Purple',
    wild: 'Gold',
};

function payoffWord(p: EquipmentPayoff): string {
    switch (p.kind) {
        case 'heal': return `HEAL ${p.amount}`;
        case 'guard': return `GUARD ${p.amount}`;
        case 'conviction': return `+${p.amount} Conviction`;
        case 'deal-bonus': return `+${p.amount} DEAL`;
        case 'draw': return `Draw ${p.amount}`;
    }
}

/** A weapon special's payload as a bare phrase: "+2 Conviction", "HEAL 4", "INFERNO 2". */
export function specialPayloadText(p: SpecialPayload): string {
    switch (p.kind) {
        case 'conviction': return `+${p.amount} Conviction`;
        case 'deal': return `DEAL ${p.amount}`;
        case 'heal': return `HEAL ${p.amount}`;
        case 'guard': return `GUARD ${p.amount}`;
        case 'inferno': return `INFERNO ${p.amount}`;
        case 'vulnerable': return p.amount === 1 ? 'VULNERABLE 1 turn' : `VULNERABLE ${p.amount} turns`;
    }
}

/** An armor's die change: "Gold die: +1 hit", "Red die: 1 hit becomes special". */
export function dieChangeText(d: EquipmentDieChange): string {
    const die = `${DIE_WORD[d.color]} die`;
    return d.change === 'miss-to-mana' ? `${die}: +1 hit` : `${die}: 1 hit becomes special`;
}

/**
 * The trigger or condition half of an effect, or null when it has none (a
 * piece that only changes dice). A DEAL trigger that pays a DEAL bonus reads
 * as one phrase ("First DEAL +2").
 */
function mainText(e: EquipmentEffect): string | null {
    if (e.condition !== undefined) return `DEAL +${e.bonus} ${CONDITION_WORD[e.condition]}`;
    if (e.trigger === undefined) return null;
    const head = TRIGGER_WORD[e.trigger];
    const dealTrigger = e.trigger === 'card-deal' || e.trigger === 'first-card-deal';
    if (dealTrigger && e.payoff.kind === 'deal-bonus') return `${head} +${e.payoff.amount}`;
    if (e.payoff.kind === 'deal-bonus') return `${head}: next DEAL +${e.payoff.amount}`;
    return `${head}: ${payoffWord(e.payoff)}`;
}

/**
 * Every line an effect has, in the order they are read: the trigger or
 * condition, the weapon's special, the armor's die change. Empty for a piece
 * with no effect.
 */
export function equipmentEffectParts(effect: EquipmentEffect | null | undefined): string[] {
    if (!effect) return [];
    const parts: string[] = [];
    const main = mainText(effect);
    if (main !== null) parts.push(main);
    if (effect.special) parts.push(`Special: ${specialPayloadText(effect.special)}`);
    if (effect.die) parts.push(dieChangeText(effect.die));
    return parts;
}

/** The effect on one line, parts joined by a middle dot, or null when the piece has none. */
export function equipmentEffectLine(effect: EquipmentEffect | null | undefined): string | null {
    const parts = equipmentEffectParts(effect);
    return parts.length === 0 ? null : parts.join(' · ');
}

/**
 * What the dice tray says a special face does. With a weapon payload worn it
 * names the payload; with none, a special only powers its card.
 */
export function specialFaceText(special: SpecialPayload | null | undefined): string {
    return special
        ? `Your weapon's special: ${specialPayloadText(special)} when it powers a card.`
        : 'No weapon special worn: this face only powers its card.';
}

/** The combat log sentence for one fired piece: "Opening Blade: +2 DEAL." and the like. */
export function equipmentFiredText(
    e: { itemName: string; payoff: EquipmentPayoff['kind']; amount: number },
): string {
    const n = e.amount;
    if (n <= 0) return `${e.itemName}: nothing to give.`;
    switch (e.payoff) {
        case 'heal': return `${e.itemName}: HEAL ${n}.`;
        case 'guard': return `${e.itemName}: GUARD ${n}.`;
        case 'conviction': return `${e.itemName}: +${n} Conviction.`;
        case 'draw': return `${e.itemName}: Draw ${n}.`;
        case 'deal-bonus': return `${e.itemName}: +${n} DEAL.`;
    }
}

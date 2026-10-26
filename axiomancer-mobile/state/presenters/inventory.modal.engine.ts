/**
 * Item-use / item-equip modal presenter for the inventory screen.
 *
 * Q2 / Q5 both call for a confirmation modal that previews the effect
 * of using or equipping an item before it is committed. The helpers
 * here are pure: state → view-model, no side effects.
 */

import {
    displacedBy,
    equipItem as engineEquipItem,
    getSignatureSkill,
    unequipItem as engineUnequipItem,
    isConsumable,
    isEquipment,
    lookupEffect,
    resolveConsumableHeal,
    type Character,
    type Consumable,
    type Equipment,
    type GameStore,
    type Item,
} from '@mechanics';

import { keywordForEffect } from '@/state/combat/keywords';
import { freezeViewModel } from './freeze';
import { parseHealAmount } from '../actions';
import { computeEquipDelta } from '@mechanics';
import { findOwnedEquipment, loadoutActionFor } from './loadout';

/**
 * Modal mode discriminator. The screen branches on this to pick
 * which action to dispatch on confirm:
 * - `'use'` → `actions.useItem` (consumables).
 * - `'equip'` → `actions.equipItem` (equipment `player.equipment` does
 *   not wear).
 * - `'unequip'` → `actions.unequipItem` (equipment it wears; taking it
 *   off leaves the position empty).
 * - `'view'` → no action (display-only; items with no available action).
 */
export type ItemModalMode = 'use' | 'equip' | 'unequip' | 'view';

export interface StatDelta {
    label: string;
    before: number;
    after: number;
    delta: number;
}

/**
 * A non-stat change — a signet-relic signature — gained or lost by the
 * equip operation the modal previews. Stat changes ride on `statDeltas`.
 */
export interface ModalEffectDelta {
    /** Display label (`grants <name>` / `loses <name>`; falls back to the
     * signature id when it has no name). */
    label: string;
    /** `'gained'` when the equip adds this, `'lost'` when it removes it. */
    direction: 'gained' | 'lost';
}

/**
 * One line of an item's *intrinsic* modifier block — the stat lines the
 * item itself grants (independent of equip state), e.g. "+5 MAX VITAE".
 */
export interface ItemModifierLine {
    label: string;
}

export interface ItemModalViewModel {
    /** Item ID the modal is acting on. */
    itemId: string | null;
    /** Display name of the item. */
    name: string;
    /** Engine description. */
    description: string;
    /** Modal mode — determines the primary button. */
    mode: ItemModalMode;
    /** Confirmation copy ("Drink the phial?"). */
    confirmPrompt: string;
    /** Primary button label, e.g. `"DRINK"` / `"EQUIP"`. */
    confirmLabel: string;
    /** Preview lines (Q2 / Q5 — "potential results"). */
    previewLines: readonly string[];
    /**
     * Stat deltas for an equip preview (Q5). Max health is the only stat
     * equipment can change; a row appears **only** when its value actually
     * changes (unchanged stats are dropped, per the design brief).
     */
    statDeltas: readonly StatDelta[];
    /**
     * Signet-relic signatures the equip preview gains or loses. Empty for
     * consumables, display-only rows, and equips that change no signature.
     */
    effectDeltas: readonly ModalEffectDelta[];
    /**
     * The item's own intrinsic stat modifiers (with values), regardless of
     * equip state. Empty for items with no stat modifiers and for
     * consumables.
     */
    itemModifiers: readonly ItemModifierLine[];
    /**
     * Name of the currently-equipped item that this equip would
     * replace, or `null` when the slot is empty / this item is
     * already equipped / the item isn't equipment. Surfaced on the
     * equip modal's confirmLabel as `"EQUIP · REPLACE <NAME>"`.
     * The view layer reads `replacingName` directly to avoid
     * parsing the label string back out.
     */
    replacingName: string | null;
    /**
     * "Not worn: <signature> is off." on a relic carried unworn, shown above
     * the WEAR button; `null` for a worn relic and anything else.
     */
    notWornLine: string | null;
}

/**
 * Build the modal view-model for a tapped item. The screen passes the
 * item id; this helper resolves the rest from engine state. Returns
 * `null` when the item can't be found.
 */
export function selectItemModalViewModel(
    state: GameStore,
    itemId: string,
): ItemModalViewModel | null {
    const inventory: readonly Item[] = state.player.inventory;
    const item = inventory.find((i: Item) => i.id === itemId)
        ?? findOwnedEquipment(state.player, itemId);
    if (!item) return null;

    if (isConsumable(item)) return buildConsumableModal(state.player, item);
    if (isEquipment(item)) return buildEquipmentModal(state.player, item);

    return freezeViewModel({
        itemId: item.id,
        name: item.name,
        description: item.description,
        mode: 'view' as ItemModalMode,
        confirmPrompt: '',
        confirmLabel: 'CLOSE',
        previewLines: [item.description] as readonly string[],
        statDeltas: [] as readonly StatDelta[],
        effectDeltas: [] as readonly ModalEffectDelta[],
        itemModifiers: [] as readonly ItemModifierLine[],
        replacingName: null,
        notWornLine: null,
    });
}

function buildConsumableModal(player: Character, item: Item): ItemModalViewModel {
    // `isConsumable(item)` has narrowed at the call site; cast through.
    const consumable = item as Consumable;
    // Prefer the engine's structured heal; fall back to parsing a heal
    // amount out of a free-form `effectId` string (fixtures / records that
    // carry no structured heal).
    const legacyEffect = consumable.effectId ?? '';
    // Ask the engine what THIS player, at THIS HP, would actually be paid.
    // `resolveConsumableHeal` is the same call `useConsumableEffect` makes, so
    // the number previewed here is by construction the number drinking pays;
    // `parseHealAmount` is the fallback for an `effectId`-encoded heal.
    const { amount: resolvedHeal, desperate } = resolveConsumableHeal(player, consumable);
    const heal = resolvedHeal > 0 ? resolvedHeal : parseHealAmount(legacyEffect);
    const projectedHp = heal > 0
        ? Math.min(player.maxHealth, player.health + heal)
        : player.health;
    const hpDelta = projectedHp - player.health;

    const previewLines: string[] = [];
    if (resolvedHeal > 0) {
        // The headline number is always what the player gets right now. When the
        // desperation band is what earned it, say so on the same line — a player
        // who is told "you are getting the wounded rate" learns the rule from
        // one drink instead of inferring it from a number that changed.
        previewLines.push(
            desperate
                ? `Heal ${resolvedHeal} VITAE (badly wounded)`
                : `Heal ${resolvedHeal} VITAE`,
        );
        // Not currently desperate, but the item HAS a band: advertise the
        // upside. This is the anti-hoarding lever's whole job — the player must
        // be able to see, at full health, that the flask is worth more later.
        if (!desperate && (consumable.healAmountBelowHalf ?? 0) > 0) {
            previewLines.push(
                `Heal ${consumable.healAmountBelowHalf} VITAE instead when below half VITAE`,
            );
        }
    } else if (legacyEffect) {
        previewLines.push(legacyEffect);
    }
    if (hpDelta > 0) {
        previewLines.push(`VITAE ${player.health} → ${projectedHp} (+${hpDelta})`);
    } else if (legacyEffect && heal === 0) {
        previewLines.push('No VITAE change.');
    }

    return freezeViewModel({
        itemId: item.id,
        name: item.name,
        description: item.description,
        mode: 'use' as ItemModalMode,
        confirmPrompt: `Drink the ${item.name.toLowerCase()}?`,
        confirmLabel: 'DRINK',
        previewLines: previewLines as readonly string[],
        statDeltas: [] as readonly StatDelta[],
        effectDeltas: [] as readonly ModalEffectDelta[],
        itemModifiers: [] as readonly ItemModifierLine[],
        replacingName: null,
        notWornLine: null,
    });
}

/** The off-signature line for a relic carried unworn (copy lives here). */
function notWornLineFor(item: Equipment, mode: ItemModalMode): string | null {
    if (mode !== 'equip' || !item.grantsSignature) return null;
    const signature = getSignatureSkill(item.grantsSignature)?.name;
    return signature ? `Not worn: ${signature} is off.` : null;
}

function buildEquipmentModal(player: Character, item: Item): ItemModalViewModel {
    const eq = item as Equipment;
    // Worn state is `player.equipment`. confirmLabel matrix:
    // - Worn → 'UNEQUIP' (the position is left empty).
    // - Not worn, a position free → 'EQUIP'.
    // - Not worn, slot full → 'EQUIP · REPLACE <NAME>' (the last-worn piece).
    const action = loadoutActionFor(player, eq);
    const mode: ItemModalMode = action.mode;
    const confirmLabel = action.label;
    const replacing = action.replacing;

    const previewLines: string[] = [
        `Slot · ${eq.slot.toUpperCase()}`,
        mode === 'unequip'
            ? 'Worn now.'
            : `${eq.slot.charAt(0).toUpperCase() + eq.slot.slice(1)} slot.`,
    ];

    // The real before/after character for the operation the confirm button
    // performs; every changed stat and signature surfaces, nothing else.
    let afterChar: Character;
    if (mode === 'equip') {
        const { index } = displacedBy(player, eq);
        afterChar = engineEquipItem(player, eq, index === null ? undefined : { replaceIndex: index });
    } else {
        const accessoryIndex = eq.slot === 'accessory'
            ? player.equipment.accessories.findIndex((a) => a.id === eq.id)
            : undefined;
        afterChar = engineUnequipItem(player, eq.slot, accessoryIndex);
    }

    const statDeltas = computeStatDeltas(player, afterChar);
    // An unequip compares the piece against itself (the engine's lost-only case).
    const effectDeltas = mode === 'equip'
        ? computeEffectDeltas(eq, replacing, player)
        : computeEffectDeltas(eq, eq, player);
    const itemModifiers = computeItemModifiers(eq);

    return freezeViewModel({
        itemId: item.id,
        name: item.name,
        description: item.description,
        mode,
        confirmPrompt: mode === 'unequip'
            ? `Stop wearing the ${item.name.toLowerCase()}?`
            : `Wear the ${item.name.toLowerCase()}?`,
        confirmLabel,
        previewLines: previewLines as readonly string[],
        statDeltas: statDeltas as readonly StatDelta[],
        effectDeltas: effectDeltas as readonly ModalEffectDelta[],
        itemModifiers: itemModifiers as readonly ItemModifierLine[],
        replacingName: replacing === null ? null : replacing.name,
        notWornLine: notWornLineFor(eq, mode),
    });
}

/**
 * Short chrome labels for the known engine stat keys. Anything not
 * listed (a stat the engine adds later) falls back to a humanized
 * upper-case rendering of the key, so the table never silently drops a
 * new stat.
 */
const STAT_LABELS: Record<string, string> = {
    maxHp: 'MAX VITAE',
    maxHealth: 'MAX VITAE',
};

function statLabelFor(key: string): string {
    return (
        STAT_LABELS[key]
        ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).toUpperCase().trim()
    );
}

/**
 * Round a stat value to one decimal place for display. Integer stats
 * stay integers (`15`); a fractional value reads cleanly (`1.5` rather
 * than `1.55432728`).
 */
function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

/**
 * Flatten a character's diffable stats into one `key → value` map. Max
 * health is the only stat equipment can change (the armor relics' +max
 * VITAE).
 */
function characterStatMap(character: Character): Map<string, number> {
    const out = new Map<string, number>();
    const add = (key: string, value: unknown) => {
        if (typeof value === 'number' && Number.isFinite(value)) out.set(key, value);
    };
    add('maxHealth', character.maxHealth);
    return out;
}

/**
 * Diff every stat between the player and the post-operation character,
 * emitting a before→after row for each stat that *changed*. Unchanged
 * stats are dropped. Rows sort by label.
 */
function computeStatDeltas(before: Character, after: Character): StatDelta[] {
    const beforeMap = characterStatMap(before);
    const afterMap = characterStatMap(after);
    const keys = new Set<string>([...beforeMap.keys(), ...afterMap.keys()]);

    const out: StatDelta[] = [];
    for (const key of keys) {
        // Round to one decimal so a fractional value reads as e.g.
        // 1.5, and compare the rounded values so a sub-0.05 wobble never
        // surfaces a "+0.0" row.
        const b = round1(beforeMap.get(key) ?? 0);
        const a = round1(afterMap.get(key) ?? 0);
        if (a === b) continue;
        const d = round1(a - b);
        out.push({ label: statLabelFor(key), before: b, after: a, delta: d });
    }
    out.sort((x, y) => x.label.localeCompare(y.label));
    return out;
}

/** Signed stat-value string, rounded to one decimal (`+5` / `-2` /
 * `+1.5`). */
function signed(n: number): string {
    const r = round1(n);
    return r >= 0 ? `+${r}` : `${r}`;
}

/** Resolve an effect id to its player-facing keyword (falling back to engine name). */
function effectName(id: string): string {
    try {
        return keywordForEffect(id) ?? lookupEffect(id)?.name ?? id;
    } catch {
        return id;
    }
}

/**
 * Build the item's intrinsic modifier block — the stat lines (with
 * values) it grants on its own. Values render as `+N` / `-N`. Returns
 * `[]` for an item with no stat modifiers.
 */
function computeItemModifiers(eq: Equipment): ItemModifierLine[] {
    const out: ItemModifierLine[] = [];
    for (const mod of eq.statModifiers ?? []) {
        const value = signed(mod.value);
        out.push({ label: `${value} ${statLabelFor(mod.stat)}` });
    }
    // Equipment is stat-only + `grantsSignature`; there are no
    // passive-effect / proc / resource lines to list. The granted signature is
    // surfaced separately (see `computeEffectDeltas`).
    return out;
}

/**
 * The non-stat change the equip causes: the signet-relic signature gained /
 * lost (equipment carries no other non-stat channel). Stat changes
 * ride on `computeStatDeltas`.
 */
function computeEffectDeltas(
    newlyWorn: Equipment,
    removed: Equipment | null,
    player: Character,
): ModalEffectDelta[] {
    const equipDelta = computeEquipDelta(newlyWorn, removed, player);
    const out: ModalEffectDelta[] = [];
    for (const s of equipDelta.signatures.gained) {
        out.push({ label: `grants ${s.name ?? s.id}`, direction: 'gained' });
    }
    for (const s of equipDelta.signatures.lost) {
        out.push({ label: `loses ${s.name ?? s.id}`, direction: 'lost' });
    }
    return out;
}


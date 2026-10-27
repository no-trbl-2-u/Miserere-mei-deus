/**
 * Equipment DETAIL presenter — the long-press card for a worn equipment slot.
 *
 * WHY THIS EXISTS
 * ---------------
 * Swapping equipment tells the player which signature skill ("sigSkill") the
 * change gains or loses — by NAME only. This presenter resolves what that
 * named skill DOES, and everything else a player needs to judge a relic, in
 * one place.
 *
 * WHAT IT PRODUCES
 * ----------------
 * `EquipmentDetailViewModel` — a pure, deep-frozen projection of one equipment
 * item:
 *
 *   - `name` / `slotLabel`  — identity and which slot it occupies.
 *   - `sub`                 — the ItemGlyph discriminator ('Weapon' | 'Armor' |
 *                             'Relic' | …), so the view can draw the item's
 *                             placeholder art without re-deriving it.
 *   - `statLines`           — every stat modifier the item grants, pre-formatted
 *                             as a label/value pair ("BODY", "+2").
 *   - `signature`           — the granted signature skill's name, Conviction
 *                             cost, and EXACT in-game effect text (the engine's
 *                             own `description`; no added flare).
 *   - `flavor`              — the item's engine `description`, shown last.
 *   - `action`              — the one loadout action the card offers: UNEQUIP
 *                             for a worn piece, WEAR for a relic or EQUIP (or <VERB> · REPLACE
 *                             <NAME>) for an unworn one, read from
 *                             `player.equipment`.
 *
 * PURITY
 * ------
 * State in, view-model out. No store writes, no RNG, no side effects. All rules
 * data is read from `@mechanics` (`getSignatureSkill`), never re-implemented
 * here — per the monorepo rule that rules live in the engine.
 */

import {
    getCardLane,
    getSignatureSkill,
    relicLaneId,
    type Equipment,
    type GameStore,
} from '@mechanics';

import { freezeViewModel } from './freeze';
import { findOwnedEquipment, loadoutActionFor } from './loadout';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * One row of the item's stat block, already formatted for display.
 *
 * @property label - Chrome label for the stat ("BODY", "MAX VITAE", "MIND").
 * @property value - Signed display value ("+2") or multiplier ("×1.5").
 * @property id    - Raw engine stat key, kept for testIDs / future tooltips.
 */
export interface EquipmentStatLine {
    label: string;
    value: string;
    id: string;
}

/**
 * The signature skill a signet relic grants while worn.
 *
 * @property id          - Engine `SignatureSkillId`.
 * @property name        - Player-facing skill name ("The Open Hand").
 * @property cost        - Conviction (◆) cost to cast, from the engine.
 * @property description - The engine's own effect text, verbatim. This is the
 *                         exact mechanical effect — deliberately NOT rewritten
 *                         into flavour.
 */
export interface EquipmentSignatureInfo {
    id: string;
    name: string;
    cost: number;
    description: string;
}

/**
 * Everything the long-press equipment card renders.
 *
 * @property itemId    - Engine item id (stable key / testIDs).
 * @property name      - Display name of the item.
 * @property slotLabel - Human slot name ("Weapon" / "Armor" / "Relic").
 * @property sub       - ItemGlyph discriminator for the placeholder art.
 * @property statLines - Stat modifiers the item grants. May be empty.
 * @property signature - Granted signature, or `null` for non-relic equipment.
 * @property lane      - `Lane: <lane name> (while worn)` for a relic whose
 *                       resolved lane is registered, else `null`.
 * @property flavor    - The item's engine description (flavour prose).
 * @property action   - The loadout action the card's button performs.
 */
export interface EquipmentDetailViewModel {
    itemId: string;
    name: string;
    slotLabel: string;
    sub: string | null;
    statLines: readonly EquipmentStatLine[];
    signature: EquipmentSignatureInfo | null;
    lane: string | null;
    flavor: string;
    action: EquipmentDetailAction;
}

/**
 * The card's loadout button.
 *
 * @property mode  - `'equip'` for an unworn piece, `'unequip'` for a worn one.
 * @property label - `'WEAR'` (a relic) or `'EQUIP'`, either `· REPLACE <NAME>`, or `'UNEQUIP'`.
 */
export interface EquipmentDetailAction {
    mode: 'equip' | 'unequip';
    label: string;
}

// ---------------------------------------------------------------------------
// Formatting helpers (pure, module-private)
// ---------------------------------------------------------------------------

/**
 * Short chrome labels for the stat keys equipment actually uses. Relic
 * `statModifiers` carry the engine's attribute keys (`body` / `mind` / `heart`
 * / `maxHp`); derived-stat keys are listed too so a future piece that bumps
 * e.g. `physicalAttack` still reads well.
 */
const STAT_LABELS: Record<string, string> = {
    body: 'BODY',
    mind: 'MIND',
    heart: 'HEART',
    maxHp: 'MAX VITAE',
    maxHealth: 'MAX VITAE',
    physicalAttack: 'PHYS ATK',
    physicalDefense: 'PHYS DEF',
    mentalAttack: 'MENT ATK',
    mentalDefense: 'MENT DEF',
    emotionalAttack: 'EMOT ATK',
    emotionalDefense: 'EMOT DEF',
    luck: 'LUCK',
};

/**
 * Human slot names. Mirrors the inventory presenter's `SLOT_LABELS` so the
 * detail card and the sack rows agree on wording ('Relic').
 */
const SLOT_LABELS: Record<Equipment['slot'], string> = {
    weapon: 'Weapon',
    armor: 'Armor',
    relic: 'Relic',
};

/**
 * Resolve a stat key to its chrome label, falling back to a humanised
 * upper-case rendering so an unknown key is never silently dropped.
 *
 * @param key - Engine stat key, e.g. `'maxHp'`.
 * @returns Display label, e.g. `'MAX VITAE'`.
 */
function statLabelFor(key: string): string {
    return (
        STAT_LABELS[key]
        ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).toUpperCase().trim()
    );
}

/** Round to one decimal so fractional stats (luck) read as `1.5`, not `1.5432`. */
function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

/**
 * Format a stat modifier's magnitude for display.
 *
 * @param value        - Raw modifier value.
 * @param isMultiplier - Whether the engine applies it multiplicatively.
 * @returns `'×1.5'` for multipliers, `'+2'` / `'-1'` for flat modifiers.
 */
function formatStatValue(value: number): string {
    const r = round1(value);
    return r >= 0 ? `+${r}` : `${r}`;
}

/**
 * Project an equipment item's `statModifiers` into display rows, preserving
 * the engine's authored order.
 *
 * @param eq - The equipment item.
 * @returns One row per modifier; `[]` when the item grants no stats.
 */
function buildStatLines(eq: Equipment): EquipmentStatLine[] {
    return (eq.statModifiers ?? []).map((mod) => ({
        id: mod.stat,
        label: statLabelFor(mod.stat),
        value: formatStatValue(mod.value),
    }));
}

/**
 * Resolve the signature an item grants into its display record.
 *
 * @param eq - The equipment item.
 * @returns The signature info, or `null` when the item grants none (or the id
 *          does not resolve against the engine's kit — a content drift guard).
 */
function buildSignature(eq: Equipment): EquipmentSignatureInfo | null {
    if (!eq.grantsSignature) return null;
    const skill = getSignatureSkill(eq.grantsSignature);
    if (!skill) return null;
    return {
        id: skill.id,
        name: skill.name,
        cost: skill.cost,
        description: skill.description,
    };
}

/**
 * The "Lane:" line for a relic that opens a card lane while worn. The lane is
 * resolved by the engine (`relicLaneId`, library first) and named from the
 * lane registry; an unresolved or unregistered lane gives `null`.
 *
 * @param eq - The equipment item.
 * @returns `'Lane: Blood Price (while worn)'`, or `null`.
 */
function buildLaneLine(eq: Equipment): string | null {
    const id = relicLaneId(eq);
    if (id === undefined) return null;
    const lane = getCardLane(id);
    return lane ? `Lane: ${lane.name} (while worn)` : null;
}

// ---------------------------------------------------------------------------
// Public selector
// ---------------------------------------------------------------------------

/**
 * Build the detail view-model for one equipment item in the player's inventory.
 *
 * @param state  - The game store.
 * @param itemId - Engine id of the item to describe.
 * @returns The frozen view-model, or `null` when the player owns no equipment
 *          piece with this id, carried or worn (the card is equipment-only).
 */
export function selectEquipmentDetailViewModel(
    state: GameStore,
    itemId: string,
): EquipmentDetailViewModel | null {
    const player = state.player;
    if (!player) return null;
    const item = findOwnedEquipment(player, itemId);
    if (item === null) return null;
    const { mode, label } = loadoutActionFor(player, item);

    return freezeViewModel({
        itemId: item.id,
        name: item.name,
        slotLabel: SLOT_LABELS[item.slot] ?? item.slot,
        sub: SLOT_LABELS[item.slot] ?? null,
        statLines: buildStatLines(item) as readonly EquipmentStatLine[],
        signature: buildSignature(item),
        lane: buildLaneLine(item),
        flavor: item.description,
        action: { mode, label },
    });
}

/**
 * Aftermath presenter.
 *
 * Composes the view model that `<CombatVictoryPanel>` consumes
 * to render the in-encounter-modal aftermath. The combat slice is
 * cleared at the moment combat exits (`actions.endCombat()` fires
 * before this VM is built), so the presenter reads from the
 * `AftermathData` snapshot stashed on the `combat-mode` provider
 * instead — see `state/combat-mode.tsx`.
 *
 * VM keyed by `kind` (victory only: a lost fight goes to the
 * death-return and game-over screens, not an aftermath panel).
 *
 * Per Hard Rule #8 — no display literals at the view layer. The
 * chronicle flavour lines are selected here, keyed off a tier: the
 * foe's engine-authored line when present, else a presenter-local
 * fallback.
 */

import { isEquipment, type Item } from '@mechanics';

import type { AftermathData } from '@/state/combat-mode';

/**
 * Loot tile rendered in the spoils list. Name + slot + rarity cover
 * the design's `RarityRail` + `ItemGlyph` rendering.
 */
export interface AftermathLootEntry {
    /** Engine item id: lets the row draw the item's own sprite (EQ3k). */
    itemId?: string;
    name: string;
    slot: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'unique';
}

/**
 * Maps an engine loot `Item` (from `CombatEndReport.loot`) into a
 * spoils tile. Only `Equipment` carries an explicit slot + rarity;
 * consumables / materials / quest items show their category as the
 * slot and read as `common` (they have no rarity axis).
 */
function toAftermathLootEntry(item: Item): AftermathLootEntry {
    // Equipment has no rarity axis; every item reports as `common` for the
    // aftermath loot list.
    return isEquipment(item)
        ? { itemId: item.id, name: item.name, slot: item.slot, rarity: 'common' }
        : { itemId: item.id, name: item.name, slot: item.category, rarity: 'common' };
}

/**
 * Currency reward strip cell: the shillings the engine paid
 * (`CombatEndReport.shillings`). Nullable; the cell collapses when absent.
 */
export interface AftermathCurrency {
    shillings: number;
}

export interface AftermathRewards {
    xp: number | null;
    currency: AftermathCurrency | null;
    loot: AftermathLootEntry[];
}

export interface AftermathVictoryViewModel {
    kind: 'victory';
    /** Display name in gothic caps (already uppercased upstream). */
    enemyName: string;
    /** Italic serif epithet (short phrase, no period). Nullable —
     *  the engine's `Enemy.description` field is a sentence, not an
     *  epithet; the presenter picks the first clause as a best-effort
     *  epithet, returning null when no usable text is found. */
    enemyEpithet: string | null;
    finalBlow: { cardName: string; damage: number; descriptor: string } | null;
    finalBlowPhrase: string;
    rewards: AftermathRewards;
}

export type AftermathViewModel = AftermathVictoryViewModel;

/**
 * Build the aftermath VM from the snapshot stashed at combat-exit
 * time. Returns `null` when the snapshot is null (no aftermath to
 * render). Only victory carries a VM;
 * flee never lands here (the seal dismisses without an aftermath
 * render).
 */
export function selectAftermathViewModel(
    data: AftermathData | null,
): AftermathViewModel | null {
    if (data === null) return null;
    return {
        kind: 'victory',
        enemyName: data.enemy.name.toUpperCase(),
        enemyEpithet: deriveEpithet(data.enemy.description),
        finalBlow: deriveFinalBlow(data),
        finalBlowPhrase: deriveFinalBlowPhrase(data),
        rewards: {
            xp: data.xpReward,
            currency: (data.shillings ?? 0) > 0 ? { shillings: data.shillings! } : null,
            loot: (data.loot ?? []).map(toAftermathLootEntry),
        },
    };
}

/**
 * Pull a short epithet out of the enemy description. The engine's
 * `Enemy.description` is a full sentence (e.g., "A figure long since
 * gnawed by the road's hunger."); we lift the part *after* the first
 * verb-phrase as a rough epithet ("long since gnawed by the road's
 * hunger"). When no usable text is found, return null so the panel
 * skips the epithet line entirely.
 *
 * Heuristic — not a parser. Good enough to fill the line on a vast
 * majority of enemies; for the rest, the line collapses gracefully.
 */
function deriveEpithet(description: string): string | null {
    if (description.length === 0) return null;
    // Strip leading "A " / "An " / "The " and trim to the first ~40
    // chars at a word boundary. The result reads as a fragment, which
    // matches the design's intent (italic serif fragment under the
    // enemy name).
    const stripped = description
        .replace(/^(A |An |The )/, '')
        .replace(/\.$/, '')
        .toLowerCase();
    if (stripped.length === 0) return null;
    if (stripped.length <= 40) return stripped;
    const cutoff = stripped.lastIndexOf(' ', 40);
    return cutoff > 0 ? stripped.slice(0, cutoff) : stripped.slice(0, 40);
}

function deriveFinalBlow(
    data: Extract<AftermathData, { variant: 'victory' }>,
): AftermathVictoryViewModel['finalBlow'] {
    if (data.finalBlow === null) return null;
    return {
        cardName: data.finalBlow.cardName ?? 'STRIKE',
        damage: data.finalBlow.damage,
        descriptor: data.finalBlow.descriptor ?? 'felled the foe',
    };
}

/**
 * Tier-key extraction helper for the final-blow narrative
 * selector. Engine line keys are `brutal | quiet | ironic`.
 */
function damageTier3<K extends string>(damage: number, high: K, mid: K, low: K): K {
    if (damage >= 20) return high;
    if (damage >= 10) return mid;
    return low;
}

/**
 * Pick a chronicle-flavour final-blow phrase. Prefers per-foe
 * lines from the engine (`Enemy.finalBlowLines`); falls back to a
 * presenter-local per-tier phrase when the foe has no engine
 * lines authored yet.
 */
function deriveFinalBlowPhrase(
    data: Extract<AftermathData, { variant: 'victory' }>,
): string {
    const damage = data.finalBlow?.damage ?? 0;
    const tier = damageTier3(damage, 'brutal', 'quiet', 'ironic');
    const engineLine = data.enemy.finalBlowLines?.[tier];
    if (engineLine !== undefined) return engineLine;
    if (tier === 'brutal') {
        return `and the ${data.enemy.name.toLowerCase()} went down face-first into its own teeth.`;
    }
    if (tier === 'quiet') {
        return `it folded into itself, twice, the way a wet rag folds.`;
    }
    return `it set the bell down, slow. the bell did not ring. the wet ground took the rest.`;
}

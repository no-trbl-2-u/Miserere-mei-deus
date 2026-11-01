/**
 * Aftermath presenter.
 *
 * Composes the view model that `<CombatVictoryPanel>`,
 * `<CombatFriendshipPanel>` and `<CombatDefeatPanel>` consume
 * to render the in-encounter-modal aftermath. The combat slice is
 * cleared at the moment combat exits (`actions.endCombat()` fires
 * before this VM is built), so the presenter reads from the
 * `AftermathData` snapshot stashed on the `combat-mode` provider
 * instead — see `state/combat-mode.tsx`.
 *
 * Discriminated-union VM keyed by `kind` (victory, parley, defeat).
 * The view-side mount only renders the panel matching the VM's `kind`.
 *
 * Per Hard Rule #8 — no display literals at the view layer. The
 * chronicle flavour lines are selected here, keyed off a tier: the
 * foe's engine-authored line when present, else a presenter-local
 * fallback.
 */

import { isEquipment, type Item } from '@mechanics';

import type { AftermathData } from '@/state/combat-mode';
import { getMapLayout } from '@/state/exploration-maps';

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
 * Currency reward strip cell. Combat spoils are engine-owned and
 * item-based (`CombatEndReport.loot`), so victories pay no separate
 * purse; the cell is nullable and collapses when absent.
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

/**
 * Optional journal-entry card surfaced under the reward strip on
 * the friendship panel, read from the aftermath snapshot. Null
 * collapses the section.
 */
export interface AftermathJournalEntry {
    bookName: string;
    entryTitle: string;
    /** First sentence-or-so of the entry, no trailing ellipsis (the
     *  panel adds it). */
    preview: string;
}

export interface AftermathParleyViewModel {
    kind: 'parley';
    enemyName: string;
    enemyEpithet: string | null;
    /**
     * One-line chronicle phrase rendered in italic under the pixel
     * emblem. Presenter-selected from a small variant table keyed
     * off enemy level (`derivePactPhrase`). Prefers the foe's engine
     * `pactLines`; falls back to a presenter-local phrase.
     */
    pactPhrase: string;
    /** A befriend pays no XP: shillings (null when none) or a potion in `loot`. */
    rewards: {
        currency: AftermathCurrency | null;
        loot: AftermathLootEntry[];
    };
    journalEntry: AftermathJournalEntry | null;
}

export interface AftermathDefeatViewModel {
    kind: 'defeat';
    /** Display name of the player character ("WORM-EATEN PILGRIM"
     *  in the design's exemplar). Sourced from engine player.name
     *  (uppercased) at snapshot time. */
    characterName: string;
    /** The killer — the foe that took the final blow. */
    killer: {
        name: string;
        epithet: string | null;
        finalCard: string;
        damage: number;
    } | null;
    /** Chronicle paragraph rendered with the `axm-dropcap` rule.
     *  Presenter-selected from a small variant table. */
    causePhrase: string;
    /** Run summary ledger — three rows. `deepestNodeId` may be
     *  null when the player died on their first node. */
    runSummary: {
        rounds: number;
        encountersFaced: number;
        deepestNodeId: string | null;
    };
}

export type AftermathViewModel =
    | AftermathVictoryViewModel
    | AftermathParleyViewModel
    | AftermathDefeatViewModel;

/**
 * Resolve a node ID to human-readable name via map layout lookup.
 * Fallback to the original node ID if map layout or node lookup fails.
 */
function resolveNodeIdToHumanName(nodeId: string | null, mapId: string | null): string {
    if (nodeId === null) return '·';
    if (mapId === null) return nodeId; // fallback to ID

    const layout = getMapLayout(mapId);
    if (layout === null) return nodeId; // fallback to ID

    const node = layout.nodes.find(n => n.id === nodeId);
    if (node === undefined) return nodeId; // fallback to ID

    return node.label;
}

/**
 * Build the aftermath VM from the snapshot stashed at combat-exit
 * time. Returns `null` when the snapshot is null (no aftermath to
 * render). Victory, parley and defeat each return a populated VM;
 * flee never lands here (the seal dismisses without an aftermath
 * render).
 */
export function selectAftermathViewModel(
    data: AftermathData | null,
): AftermathViewModel | null {
    if (data === null) return null;
    if (data.variant === 'victory') {
        return {
            kind: 'victory',
            enemyName: data.enemy.name.toUpperCase(),
            enemyEpithet: deriveEpithet(data.enemy.description),
            finalBlow: deriveFinalBlow(data),
            finalBlowPhrase: deriveFinalBlowPhrase(data),
            rewards: {
                xp: data.xpReward,
                currency: null,
                loot: (data.loot ?? []).map(toAftermathLootEntry),
            },
        };
    }
    if (data.variant === 'parley') {
        return {
            kind: 'parley',
            enemyName: data.enemy.name.toUpperCase(),
            enemyEpithet: deriveEpithet(data.enemy.description),
            pactPhrase: derivePactPhrase(data),
            rewards: {
                currency: (data.shillings ?? 0) > 0 ? { shillings: data.shillings! } : null,
                loot: (data.loot ?? []).map(toAftermathLootEntry),
            },
            journalEntry: data.journalEntry,
        };
    }
    // Defeat.
    return {
        kind: 'defeat',
        characterName: data.characterName.toUpperCase(),
        killer: data.finalBlow !== null
            ? {
                  name: data.enemy.name.toUpperCase(),
                  epithet: deriveEpithet(data.enemy.description),
                  finalCard: data.finalBlow.cardName ?? 'STRIKE',
                  damage: data.finalBlow.damage,
              }
            : {
                  name: data.enemy.name.toUpperCase(),
                  epithet: deriveEpithet(data.enemy.description),
                  finalCard: 'STRIKE',
                  damage: 0,
              },
        causePhrase: deriveCausePhrase(data),
        runSummary: {
            rounds: data.runSummary.roundsEndured,
            // The fatal encounter is not counted as survived; clamp at 0.
            encountersFaced: Math.max(0, data.runSummary.encountersFaced - 1),
            // Resolve node ID to its human-readable name.
            deepestNodeId: resolveNodeIdToHumanName(data.runSummary.deepestNodeId, data.runSummary.currentMapId),
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
 * Tier-key extraction helpers shared by the three
 * narrative selectors. Engine line keys differ per kind
 * (`brutal | quiet | ironic` for victory; `brutal | broken | quiet`
 * for defeat; `quiet | setDown | heavy` for parley), so each kind
 * passes its own key set in.
 */
function damageTier3<K extends string>(damage: number, high: K, mid: K, low: K): K {
    if (damage >= 20) return high;
    if (damage >= 10) return mid;
    return low;
}

function levelTier3<K extends string>(level: number, low: K, mid: K, high: K): K {
    if (level <= 2) return low;
    if (level <= 5) return mid;
    return high;
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

/**
 * Pick a chronicle cause-of-death paragraph. Prefers per-foe
 * lines from the engine (`Enemy.causeLines`); falls back to a
 * presenter-local per-tier phrase when absent.
 *
 * Engine tier names diverge from the victory branch — the
 * mid-damage key is `'broken'`, not `'quiet'`. The presenter
 * does not normalize; each kind uses its own key set.
 */
function deriveCausePhrase(
    data: Extract<AftermathData, { variant: 'defeat' }>,
): string {
    const damage = data.finalBlow?.damage ?? 0;
    const tier = damageTier3(damage, 'brutal', 'broken', 'quiet');
    const engineLine = data.enemy.causeLines?.[tier];
    if (engineLine !== undefined) return engineLine;
    const killerName = data.enemy.name;
    if (tier === 'brutal') {
        return `And so the pilgrim laid down where it stood, while the ${killerName.toLowerCase()}'s blade learned its ribs by name. The journey had been short. The journey had been kept.`;
    }
    if (tier === 'broken') {
        return `It came in pieces. First the breath, then the legs, then a long silence that did not break. The ${killerName.toLowerCase()} looked once, then looked away.`;
    }
    return `Not a great wound; a steady one. The pilgrim sat down to rest, and did not stand up. The page closed without ceremony.`;
}

/**
 * Pick a chronicle pact phrase. Prefers per-foe lines from the
 * engine (`Enemy.pactLines`); falls back to a presenter-local
 * per-tier phrase keyed off enemy level when absent.
 */
function derivePactPhrase(
    data: Extract<AftermathData, { variant: 'parley' }>,
): string {
    const tier = levelTier3(data.enemy.level, 'quiet', 'setDown', 'heavy');
    const engineLine = data.enemy.pactLines?.[tier];
    if (engineLine !== undefined) return engineLine;
    if (tier === 'quiet') {
        return `it stopped, then lowered its long face against the wet ground.`;
    }
    if (tier === 'setDown') {
        return `it set down the bell, slow, and laid its long face against the wet ground.`;
    }
    return `it held out the bell, mouth-down, so it would not sound. then it knelt.`;
}

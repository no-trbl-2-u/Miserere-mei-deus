/**
 * Equip-change delta model.
 *
 * When the player equips, unequips, or swaps an equipment item, a client wants
 * to show **only what changes**. Equipment carries only `statModifiers` (the
 * `maxHp` line) and one `grantsSignature`. So the delta is just:
 *
 *   - the net signed **max-VITAE** delta (armor relics' `maxHp`), and
 *   - the **signature** gained / lost (signet relics).
 *
 * Contract:
 *   - Compare the candidate against the currently-worn sibling in the same slot.
 *   - No worn sibling   → gained-only (`mode: 'equip'`).
 *   - Candidate is worn → lost-only   (`mode: 'unequip'`).
 *   - Both present      → swap.
 *   - Deltas only — unchanged values never surface.
 *
 * Pure: no rendering. Voice-register chrome (canon terms, colours) is the view's
 * job.
 */

import { equipItem as engineEquipItem, unequipItem as engineUnequipItem, statsWithWorn } from './equipment.reducer';
import { getSignatureSkill } from '../Combat/combat.signature';
import type { Character } from './types';
import type { Equipment } from '../Items/types';
import type { SignatureSkillId } from '../Combat/combat.encounter.types';
import type { StatModifier } from '../Effects/types';

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * Which equip operation produced this delta.
 *   - `equip`   — candidate worn into a previously-empty slot (gained only).
 *   - `unequip` — currently-worn item taken off (lost only).
 *   - `swap`    — candidate replaces a worn sibling.
 */
export type EquipDeltaMode = 'equip' | 'unequip' | 'swap';

/** A signed, additive stat change (e.g. `attack +2`). */
export interface StatDeltaEntry {
    stat: string;
    /** Signed net additive delta. Always non-zero (zero entries are dropped). */
    delta: number;
}

/** A signature skill gained or lost by equipping a signet relic.
 * `name` is the engine signature name when resolvable, else `null`. */
export interface SignatureDeltaEntry {
    id: SignatureSkillId;
    name: string | null;
}

export interface EquipDelta {
    mode: EquipDeltaMode;
    /** The other item in the comparison (the worn sibling for `equip`/`swap`
     * candidates, or the candidate itself for `unequip`). `null` for an
     * `equip` into an empty slot. */
    against: { id: string; name: string } | null;
    /** Net signed additive stat deltas, zero entries dropped. */
    stats: readonly StatDeltaEntry[];
    /** Signet-relic signatures gained / lost by this equip change.
     * Empty on non-relic gear. Same-signature swaps surface nothing. */
    signatures: { gained: readonly SignatureDeltaEntry[]; lost: readonly SignatureDeltaEntry[] };
    /** True when nothing actually changed. */
    isEmpty: boolean;
}

// ─── Stat aggregation ──────────────────────────────────────────────────────────

/** Aggregate an item's flat `statModifiers` into a stat → value map. */
function aggregateStats(equipment: Equipment): Map<string, number> {
    const out = new Map<string, number>();
    for (const mod of equipment.statModifiers ?? []) {
        out.set(mod.stat, (out.get(mod.stat) ?? 0) + mod.value);
    }
    return out;
}

function computeStatDeltas(candidate: Map<string, number>, against: Map<string, number>): StatDeltaEntry[] {
    const keys = new Set<string>([...candidate.keys(), ...against.keys()]);
    const out: StatDeltaEntry[] = [];
    for (const stat of keys) {
        const delta = (candidate.get(stat) ?? 0) - (against.get(stat) ?? 0);
        if (delta !== 0) out.push({ stat, delta });
    }
    out.sort((a, b) => a.stat.localeCompare(b.stat));
    return out;
}

function characterStats(character: Character): Map<string, number> {
    const out = new Map<string, number>();
    if (typeof character.maxHealth === 'number' && Number.isFinite(character.maxHealth)) {
        out.set('maxHealth', character.maxHealth);
    }
    // Worn Heart/Body/Mind lines (e.g. the Crimson Circlet's +5 Body) never
    // touch `maxHealth`, so they must be folded in here too, or a multi-stat
    // relic's non-HP lines vanish from the full recomputed-character diff.
    const worn = statsWithWorn(character);
    out.set('heart', worn.heart);
    out.set('body', worn.body);
    out.set('mind', worn.mind);
    return out;
}

/** Full recomputed-character stat diff when a `player` is supplied, else the
 * item-level additive diff. */
function fullOrItemStatDeltas(
    player: Character | undefined,
    after: Character,
    fallbackCandidate: Map<string, number>,
    fallbackAgainst: Map<string, number>,
): StatDeltaEntry[] {
    if (player !== undefined) {
        const full = computeStatDeltas(characterStats(after), characterStats(player));
        if (full.length > 0) return full;
    }
    return computeStatDeltas(fallbackCandidate, fallbackAgainst);
}

// ─── Signature diff ─────────────────────────────────────────────────────────────

function signatureEntry(equipment: Equipment): SignatureDeltaEntry | null {
    const id = equipment.grantsSignature;
    if (!id) return null;
    return { id, name: getSignatureSkill(id)?.name ?? null };
}

/** Signatures gained / lost when `candidate` replaces `against`. A swap where
 * both grant the same signature nets to nothing. */
function diffSignatures(
    candidate: Equipment | null,
    against: Equipment | null,
): { gained: SignatureDeltaEntry[]; lost: SignatureDeltaEntry[] } {
    const cand = candidate ? signatureEntry(candidate) : null;
    const other = against ? signatureEntry(against) : null;
    const gained = cand && cand.id !== other?.id ? [cand] : [];
    const lost = other && other.id !== cand?.id ? [other] : [];
    return { gained, lost };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute the equip-change delta for `candidate` against the currently worn
 * sibling (`worn`, or `null` for an empty slot). When a `player` Character is
 * supplied, stat deltas are the full recomputed-character diff (via the engine
 * `equipItem` / `unequipItem` reducers); otherwise they fall back to the
 * item-level additive stat diff.
 */
export function computeEquipDelta(
    candidate: Equipment,
    worn: Equipment | null,
    player?: Character,
): EquipDelta {
    if (worn === null) {
        const stats =
            player === undefined
                ? computeStatDeltas(aggregateStats(candidate), new Map())
                : fullOrItemStatDeltas(player, engineEquipItem(player, candidate), aggregateStats(candidate), new Map());
        const signatures = diffSignatures(candidate, null);
        return {
            mode: 'equip',
            against: null,
            stats,
            signatures,
            isEmpty: stats.length === 0 && signatures.gained.length === 0,
        };
    }

    if (worn.id === candidate.id) {
        const stats =
            player === undefined
                ? computeStatDeltas(new Map(), aggregateStats(candidate))
                : fullOrItemStatDeltas(
                      player,
                      engineUnequipItem(
                          player,
                          candidate.slot,
                          candidate.slot === 'relic'
                              ? player.equipment.relics.findIndex(a => a.id === candidate.id)
                              : undefined,
                      ),
                      new Map(),
                      aggregateStats(candidate),
                  );
        const signatures = diffSignatures(null, candidate);
        return {
            mode: 'unequip',
            against: { id: candidate.id, name: candidate.name },
            stats,
            signatures,
            isEmpty: stats.length === 0 && signatures.lost.length === 0,
        };
    }

    const stats =
        player === undefined
            ? computeStatDeltas(aggregateStats(candidate), aggregateStats(worn))
            : fullOrItemStatDeltas(
                  player,
                  engineEquipItem(
                      player,
                      candidate,
                      candidate.slot === 'relic'
                          ? { replaceIndex: player.equipment.relics.findIndex(a => a.id === worn.id) }
                          : undefined,
                  ),
                  aggregateStats(candidate),
                  aggregateStats(worn),
              );
    const signatures = diffSignatures(candidate, worn);
    return {
        mode: 'swap',
        against: { id: worn.id, name: worn.name },
        stats,
        signatures,
        isEmpty: stats.length === 0 && signatures.gained.length === 0 && signatures.lost.length === 0,
    };
}

export type { StatModifier };

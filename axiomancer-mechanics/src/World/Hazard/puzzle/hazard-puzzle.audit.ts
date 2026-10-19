/**
 * Hazard puzzle — the card audit.
 *
 * Reads every hazard card the way a puzzle sees it. A puzzle has no bin
 * and no random draw, so `salvage`, `rarity` and `weight` do nothing in
 * one; what is left (colour, the four values, the utility and its amounts,
 * `majorEffect`, `dead`) is the card's puzzle shape. Cards with an equal
 * shape behave the same in every puzzle and fall in one group. A card is
 * banned from puzzles when it re-casts (a puzzle never rolls) or is dead.
 *
 * The audit recommends; the pool (`HAZARD_PUZZLE_CARD_POOL`) is the list
 * T approves. `npm run puzzle:audit` writes the full report.
 */

import type { HazardCardDef, HazardRouteKey } from '../hazard.types';
import { hazardPuzzleCardReport } from './hazard-puzzle.report';
import type { HazardPuzzleLayout } from './hazard-puzzle.types';

/** Fields a puzzle never reads: the bin's benefit and the live deck's draw odds. */
export const HAZARD_PUZZLE_IGNORED_FIELDS = ['salvage', 'rarity', 'weight'] as const;

/** Fields that name or describe a card without changing what it does. */
const LABEL_FIELDS: readonly string[] = ['id', 'name', 'flavor', 'keywords'];

/** The card's puzzle-relevant fields, by name, in a fixed order. */
export function hazardPuzzleCardShape(def: HazardCardDef): Record<string, unknown> {
    const skip = new Set<string>([...LABEL_FIELDS, ...HAZARD_PUZZLE_IGNORED_FIELDS]);
    const shape: Record<string, unknown> = {};
    for (const key of Object.keys(def).sort()) {
        const value = (def as unknown as Record<string, unknown>)[key];
        if (!skip.has(key) && value !== undefined) shape[key] = value;
    }
    return shape;
}

/** A comparable key for the card's puzzle shape. */
export function hazardPuzzleCardShapeKey(def: HazardCardDef): string {
    return JSON.stringify(hazardPuzzleCardShape(def));
}

/**
 * Cards grouped by equal puzzle shape, groups and members in input order.
 * A group of one is a card nothing else plays like.
 */
export function hazardPuzzleCardGroups(defs: readonly HazardCardDef[]): string[][] {
    const groups = new Map<string, string[]>();
    for (const def of defs) {
        const key = hazardPuzzleCardShapeKey(def);
        groups.set(key, [...(groups.get(key) ?? []), def.id]);
    }
    return [...groups.values()];
}

/** Why puzzles ban the card, or null when they may use it. */
export function hazardPuzzleCardBan(def: HazardCardDef): string | null {
    if (def.dead) return 'dead: it does nothing and cannot be powered';
    if (def.effect === 'recast') return 'RE-CAST: a puzzle never rolls, so re-casting has nothing to do';
    return null;
}

/** How a card fared across the library's winning outcomes. */
export type HazardPuzzleLibraryUse = 'required' | 'unused' | 'mixed' | 'absent';

/**
 * The card's HP1a report columns across every library layout, both routes,
 * with no unlock and with every declared unlock: `required` when every
 * report holding it says required, `unused` when every one says unused,
 * `mixed` otherwise, `absent` when no layout holds it.
 */
export function hazardPuzzleLibraryUse(
    cardIds: readonly string[],
    library: readonly HazardPuzzleLayout[],
): Map<string, HazardPuzzleLibraryUse> {
    const seen = new Map<string, { required: boolean; unused: boolean }[]>();
    for (const layout of library) {
        const unlockSets = layout.unlocks.length > 0 ? [[], layout.unlocks] : [[]];
        for (const route of ['safe', 'risk'] as HazardRouteKey[]) {
            for (const unlocks of unlockSets) {
                for (const c of hazardPuzzleCardReport(layout, route, unlocks).cards) {
                    seen.set(c.cardId, [...(seen.get(c.cardId) ?? []), { required: c.required, unused: c.unused }]);
                }
            }
        }
    }
    const use = new Map<string, HazardPuzzleLibraryUse>();
    for (const id of cardIds) {
        const rows = seen.get(id) ?? [];
        if (rows.length === 0) use.set(id, 'absent');
        else if (rows.every((r) => r.required)) use.set(id, 'required');
        else if (rows.every((r) => r.unused)) use.set(id, 'unused');
        else use.set(id, 'mixed');
    }
    return use;
}

export interface HazardPuzzleCardAuditRow {
    def: HazardCardDef;
    /** The card's group: every card with its puzzle shape, itself included. */
    group: string[];
    ban: string | null;
    libraryUse: HazardPuzzleLibraryUse;
    keep: boolean;
    reason: string;
}

/**
 * The audit, one row per card in input order. The recommendation cuts a
 * banned card and every card after the first in its group (the first one
 * kept stands for the group); it keeps the rest.
 */
export function hazardPuzzleCardAudit(
    defs: readonly HazardCardDef[],
    library: readonly HazardPuzzleLayout[],
): HazardPuzzleCardAuditRow[] {
    const groups = hazardPuzzleCardGroups(defs);
    const groupOf = new Map(groups.flatMap((g) => g.map((id) => [id, g] as const)));
    const use = hazardPuzzleLibraryUse(defs.map((d) => d.id), library);
    const kept = new Map<string, string>();
    return defs.map((def) => {
        const group = groupOf.get(def.id) ?? [def.id];
        const ban = hazardPuzzleCardBan(def);
        const libraryUse = use.get(def.id) ?? 'absent';
        const base = { def, group, ban, libraryUse };
        if (ban) return { ...base, keep: false, reason: `banned (${ban})` };
        const shapeKey = hazardPuzzleCardShapeKey(def);
        const twin = kept.get(shapeKey);
        if (twin) return { ...base, keep: false, reason: `plays the same as ${twin} in every puzzle` };
        kept.set(shapeKey, def.id);
        const reason = group.length > 1 ? `stands for its group (${group.join(', ')})` : 'no other card plays like it';
        return { ...base, keep: true, reason };
    });
}

/**
 * The Breakwater's encounter arrival lines and tier reads (phase ET1a).
 *
 * One line per encounter node, shown on the fight's reveal once the ink
 * curtain parts. Kept in their own table, keyed by node id, apart from the
 * encounter pools, so the pool rewrites never touch them. Every line is a
 * `[content]` placeholder until T's sitting writes the words.
 *
 * Authored content, never saved.
 */

import { breakwaterChapter, BREAKWATER_CHAPTER_HELD } from '../Continents/Coastal-Village/breakwater-chapter';
import { BREAKWATER_CHAPTER_KINDS } from './content';

/** The tier a Breakwater encounter node frames its reveal at. */
export type BreakwaterEncounterTier = 'fight' | 'elite' | 'boss';

/** The Breakwater's 19 encounter nodes: 15 fights, 3 elites and the boss. */
export const BREAKWATER_ENCOUNTER_NODES: readonly string[] = Object.entries(BREAKWATER_CHAPTER_KINDS)
    .filter(([, row]) => row.kind === 'fight' || row.kind === 'elite' || row.kind === 'boss')
    .map(([id]) => id);

/** The arrival line each encounter node shows (`[content]` until T's sitting). */
export const BREAKWATER_ARRIVAL_LINES: Readonly<Record<string, string>> = Object.freeze(
    Object.fromEntries(
        BREAKWATER_ENCOUNTER_NODES.map((id) => [id, `[content] ${BREAKWATER_CHAPTER_KINDS[id]!.place}.`]),
    ),
);

/** The arrival line for a node, or undefined when the node has none. */
export function arrivalLineAt(nodeId: string | undefined): string | undefined {
    return nodeId === undefined ? undefined : BREAKWATER_ARRIVAL_LINES[nodeId];
}

/** The tier a Breakwater node frames its reveal at, or undefined off the chapter's encounter nodes. */
export function breakwaterEncounterTier(nodeId: string | undefined): BreakwaterEncounterTier | undefined {
    const row = nodeId === undefined ? undefined : BREAKWATER_CHAPTER_KINDS[nodeId];
    if (!row) return undefined;
    if (row.kind === 'fight' || row.kind === 'elite' || row.kind === 'boss') return row.kind;
    return undefined;
}

/**
 * The place a held node's road leads to: the first node its own roads name
 * ("Holds the road to <place>"). Undefined for a node that holds nothing.
 */
export function heldRoadPlaceAt(nodeId: string | undefined): string | undefined {
    if (nodeId === undefined || !(BREAKWATER_CHAPTER_HELD as readonly string[]).includes(nodeId)) return undefined;
    const node = breakwaterChapter.nodes.find((n) => n.id === nodeId);
    const far = node?.connectedNodes[0];
    return far === undefined ? undefined : BREAKWATER_CHAPTER_KINDS[far]?.place;
}

/** A node's place name from the chapter's node list, or undefined. */
export function breakwaterPlaceAt(nodeId: string | undefined): string | undefined {
    return nodeId === undefined ? undefined : BREAKWATER_CHAPTER_KINDS[nodeId]?.place;
}

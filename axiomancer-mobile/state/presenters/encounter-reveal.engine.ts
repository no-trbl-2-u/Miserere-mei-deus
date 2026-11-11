/**
 * The encounter reveal's tier frame (phase ET1a).
 *
 * Reads the map node a fight was walked to and says how the reveal dresses
 * it: a normal fight as it always was, an elite framed in oxblood with the
 * road it holds, the boss behind a held title card. The tier comes from the
 * Breakwater node list, the same source the map's kind tokens use, so the
 * token the player tapped and the reveal always agree. Pure over its input.
 */

import { arrivalLineAt, breakwaterEncounterTier, breakwaterPlaceAt, heldRoadPlaceAt } from '@mechanics';
import {
    BOSS_CARD_SUBTITLE, ELITE_CHIP, heldRoadLine,
} from '@/components/combat/encounter/reveal.copy';

export type RevealTier = 'fight' | 'elite' | 'boss';

export interface RevealFrameVM {
    readonly tier: RevealTier;
    /** The node's arrival line, or null when the node has none. */
    readonly arrivalLine: string | null;
    /** "Holds the road to <place>" for an elite that holds one, else null. */
    readonly heldLine: string | null;
    /** The held title card shown before a boss reveal, else null. */
    readonly bossCard: { readonly place: string; readonly subtitle: string } | null;
}

/** How the reveal dresses the fight at `nodeId`; a node off the chapter reads as a plain fight. */
export function buildRevealFrame(nodeId: string | undefined): RevealFrameVM {
    const tier: RevealTier = breakwaterEncounterTier(nodeId) ?? 'fight';
    const heldPlace = tier === 'elite' ? heldRoadPlaceAt(nodeId) : undefined;
    const place = breakwaterPlaceAt(nodeId);
    return {
        tier,
        arrivalLine: arrivalLineAt(nodeId) ?? null,
        heldLine: heldPlace === undefined ? null : heldRoadLine(heldPlace),
        bossCard: tier === 'boss' ? { place: place ?? '', subtitle: BOSS_CARD_SUBTITLE } : null,
    };
}

/** What the reveal reads (FR1a): tier, the foe's numbers and, for a boss, the card. */
export interface RevealVM {
    readonly tier: RevealTier;
    readonly name: string;
    readonly level: number;
    /** The foe's current VITAE (the board shows the maximum). */
    readonly vitae: number;
    /** The tier chip's word: ELITE for an elite, null for a normal foe or a boss. */
    readonly chip: string | null;
    /** The boss card's place and eyebrow, else null. */
    readonly bossCard: { readonly place: string; readonly subtitle: string } | null;
}

/** The reveal view-model for the foe walked to at `nodeId`; off the chapter it is a plain fight. */
export function buildRevealVM(
    nodeId: string | undefined,
    foe: { readonly name: string; readonly level: number; readonly hp: number },
): RevealVM {
    const frame = buildRevealFrame(nodeId);
    return {
        tier: frame.tier,
        name: foe.name,
        level: foe.level,
        vitae: foe.hp,
        chip: frame.tier === 'elite' ? ELITE_CHIP : null,
        bossCard: frame.bossCard,
    };
}

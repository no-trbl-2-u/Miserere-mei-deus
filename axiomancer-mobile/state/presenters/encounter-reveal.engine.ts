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
    BOSS_CARD_SUBTITLE, REVEAL_EYEBROW_BOSS, REVEAL_EYEBROW_ELITE, REVEAL_EYEBROW_FIGHT, heldRoadLine,
} from '@/components/combat/encounter/reveal.copy';

export type RevealTier = 'fight' | 'elite' | 'boss';

export interface RevealFrameVM {
    readonly tier: RevealTier;
    readonly eyebrow: string;
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
        eyebrow: tier === 'boss' ? REVEAL_EYEBROW_BOSS : tier === 'elite' ? REVEAL_EYEBROW_ELITE : REVEAL_EYEBROW_FIGHT,
        arrivalLine: arrivalLineAt(nodeId) ?? null,
        heldLine: heldPlace === undefined ? null : heldRoadLine(heldPlace),
        bossCard: tier === 'boss' ? { place: place ?? '', subtitle: BOSS_CARD_SUBTITLE } : null,
    };
}

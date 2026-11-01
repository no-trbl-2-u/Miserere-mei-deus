/**
 * What the archetype bots know about lanes, read from the card, relic and
 * roster data (phase SM1f). Nothing here names a card: a card added to a lane
 * is picked up by every rule with no edit.
 *
 * Every function takes the registries as optional last arguments, so tests
 * can pass fixtures.
 */

import { CARD_LANES, GREY_LANE, type CardLane } from '../../Cards/card.lanes';
import { baseCardId } from '../../Cards/card-upgrades';
import { printedKeywords } from '../../Cards/card-rules';
import { getCardById } from '../../Cards/cards.library';
import type { Card } from '../../Cards/types';
import type { CharacterDefinition } from '../../Character/roster';
import { relicLibrary } from '../../Items/relic.library';
import { relicLaneId } from '../../Items/relic-lanes';
import type { Equipment } from '../../Items/types';
import type { RunStat } from './run-policy.types';

/** A card by id, an upgraded copy read as its base when the id itself does not resolve. */
export function laneCard(cardId: string): Card | undefined {
    return getCardById(cardId) ?? getCardById(baseCardId(cardId));
}

/**
 * The lane a card belongs to (upgraded copies count as their base).
 *
 * @returns The lane id, or undefined for a card in no lane.
 */
export function cardLaneId(cardId: string, lanes: readonly CardLane[] = CARD_LANES): string | undefined {
    const base = baseCardId(cardId);
    return lanes.find(lane => lane.cardIds.includes(base))?.id;
}

/** The keywords a card prints, or none for an unknown id. */
export function cardKeywords(cardId: string): readonly string[] {
    const card = laneCard(cardId);
    return card ? printedKeywords(card) : [];
}

/** CONVICTION is the pool every deck banks (each die's BOON face grants it), so a card
 *  that prints it is no sign of a lane. */
const SHARED_RESOURCE_WORDS: ReadonlySet<string> = new Set(['CONVICTION']);

/**
 * The keywords a lane's own cards print that the grey office does not: the
 * lane's vocabulary (SACRIFICE for Blood Price, INFERNO for the Elementalist).
 * A keyword every deck prints says nothing about a lane, and nor does
 * {@link SHARED_RESOURCE_WORDS}.
 */
export function laneKeywords(laneId: string, lanes: readonly CardLane[] = CARD_LANES): ReadonlySet<string> {
    const lane = lanes.find(l => l.id === laneId);
    if (!lane) return new Set();
    const grey = new Set(GREY_LANE.cardIds.flatMap(id => cardKeywords(id)));
    return new Set(lane.cardIds.flatMap(id => cardKeywords(id)).filter(k => !grey.has(k) && !SHARED_RESOURCE_WORDS.has(k)));
}

/** How many of the lane's keywords a card prints. */
export function laneKeywordOverlap(cardId: string, keywords: ReadonlySet<string>): number {
    return cardKeywords(cardId).filter(k => keywords.has(k)).length;
}

/**
 * The stat a lane's cards are paid in most: the colour most of its cards
 * carry (colour is payment), raised at a level up. Ties go heart, body, mind.
 */
export function laneStat(laneId: string, lanes: readonly CardLane[] = CARD_LANES): RunStat {
    const lane = lanes.find(l => l.id === laneId);
    const counts: Record<RunStat, number> = { heart: 0, body: 0, mind: 0 };
    for (const id of lane?.cardIds ?? []) {
        const color = laneCard(id)?.color;
        if (color === 'heart' || color === 'body' || color === 'mind') counts[color]++;
    }
    const order: RunStat[] = ['heart', 'body', 'mind'];
    return order.reduce((best, stat) => (counts[stat] > counts[best] ? stat : best), order[0]!);
}

/** The lane a relic opens, by its library entry. */
export function itemLaneId(
    itemId: string,
    lanes: readonly CardLane[] = CARD_LANES,
    relics: readonly Equipment[] = relicLibrary,
): string | undefined {
    return relicLaneId({ id: itemId, laneId: undefined }, lanes, relics);
}

/**
 * How well a character opens a lane: 2 when the lane is one of its starting
 * lanes, 1 when its starting relic opens it (both put the lane in the reward
 * pool from the first fight), 0 when the run starts outside the lane.
 */
export function characterLaneFit(
    def: CharacterDefinition,
    laneId: string,
    lanes: readonly CardLane[] = CARD_LANES,
    relics: readonly Equipment[] = relicLibrary,
): 0 | 1 | 2 {
    if (def.startingLaneIds.includes(laneId)) return 2;
    if (itemLaneId(def.startingRelicId, lanes, relics) === laneId) return 1;
    return 0;
}

/** True when a run opened as this character starts inside the lane (its reward pool holds the lane). */
export function characterOpensLane(
    def: CharacterDefinition,
    laneId: string,
    lanes: readonly CardLane[] = CARD_LANES,
    relics: readonly Equipment[] = relicLibrary,
): boolean {
    return characterLaneFit(def, laneId, lanes, relics) > 0;
}

/**
 * The character an archetype opens its run as, from the live roster, the way
 * a player picks at character select: the character whose starting lanes
 * include the lane; else one whose starting relic opens it; else the
 * closest fit, the one with most of the lane's stat. Ties keep roster order.
 *
 * @throws when the roster is empty.
 */
export function characterForLane(
    roster: readonly CharacterDefinition[],
    laneId: string,
    lanes: readonly CardLane[] = CARD_LANES,
    relics: readonly Equipment[] = relicLibrary,
): CharacterDefinition {
    const stat = laneStat(laneId, lanes);
    let best: CharacterDefinition | undefined;
    let bestScore = -Infinity;
    for (const def of roster) {
        const score = characterLaneFit(def, laneId, lanes, relics) * 1000 + def.baseStats[stat];
        if (score > bestScore) { best = def; bestScore = score; }
    }
    if (!best) throw new Error(`${laneId}: the roster holds no character.`);
    return best;
}

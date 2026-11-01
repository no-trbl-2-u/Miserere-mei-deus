/**
 * The four archetype bots that know the game (phase SM1f, A11): `blood-price`,
 * `defender`, `merciful` and `elementalist`, one `RunPolicy` per lane.
 *
 * Each bot:
 *
 * - opens its run at character select as the roster character whose starting
 *   lanes include its lane, else one whose starting relic opens it, else the
 *   closest fit (`characterForLane`): the run a player plays, never a `/dev`
 *   preset (T, 2026-10-31);
 * - picks rewards of its own lane first, then the elite upgrade of one of its
 *   lane's cards, then a card that prints its lane's keywords, and skips the
 *   rest; takes a cache's card only when it would pick it as a reward;
 * - at a rest, rests under its VITAE threshold and otherwise upgrades a card
 *   of its lane; at a village, rests under the threshold, buys its lane's
 *   cards and has off-lane cards removed while it can pay;
 * - walks to an adjacent rest or village under its threshold, and walks away
 *   from an elite (WITHDRAW) under it;
 * - raises its lane's stat (the colour its lane's cards are paid in);
 * - wears an item unless it is a relic that opens another lane;
 * - plays fights with its lane's ranking (`laneFightPolicy`).
 *
 * Every rule reads lanes, keywords, colours, verbs and intents from the data,
 * never a card id, so a new card in a lane is picked up with no edit.
 */

import { CHARACTER_GREY_DECK } from '../../Character/roster';
import type { CombatSimPolicy } from '../../Combat/combat.sim-policies';
import { laneFightPolicy } from './run-policy.fight';
import {
    cardLaneId,
    characterForLane,
    itemLaneId,
    laneKeywordOverlap,
    laneKeywords,
    laneStat,
} from './run-policy.lanes';
import type { RunPolicy, RunRewardDecision, RunRoadOption } from './run-policy.types';
import { nearestRoad } from './run-policy.wanderer';

/** What makes one archetype differ from the next. */
export interface ArchetypeSpec {
    /** The policy id, which is also the lane it builds. */
    readonly laneId: string;
    readonly description: string;
    /** The share of max VITAE under which it rests and walks away from elites. */
    readonly restBelow: number;
}

/** The deck size under which a bot has nothing more removed: the size of a character's dealt deck. */
export const MIN_DECK_SIZE = CHARACTER_GREY_DECK.length + 3;

/**
 * The node kinds a hurt bot walks to: a rest, which is spent once used. A
 * village stays open after a visit and its bed is priced, so a hurt bot that
 * cannot pay would pace to it and back forever.
 */
const MENDING_KINDS: ReadonlySet<string> = new Set(['rest']);

/**
 * The errands a hurt bot runs before a fight or a hazard: nodes that cost no
 * VITAE and are done once done (a cache, a cutscene, a quest step), so a hurt
 * bot never paces between them.
 */
const ERRAND_KINDS: ReadonlySet<string> = new Set(['loot-cache', 'cutscene', 'quest']);

/** The lane-aware pieces of one archetype, computed once. */
interface LaneKnowledge {
    readonly laneId: string;
    readonly keywords: ReadonlySet<string>;
    readonly fight: CombatSimPolicy;
}

function inLane(k: LaneKnowledge, cardId: string): boolean {
    return cardLaneId(cardId) === k.laneId;
}

/** The best offer by lane: its own lane first, then the most of its keywords; null when none is worth taking. */
export function bestLaneOffer(k: Pick<LaneKnowledge, 'laneId' | 'keywords'>, offers: readonly string[]): string | null {
    const own = offers.find(id => cardLaneId(id) === k.laneId);
    if (own !== undefined) return own;
    let best: string | null = null;
    let bestOverlap = 0;
    for (const id of offers) {
        const overlap = laneKeywordOverlap(id, k.keywords);
        if (overlap > bestOverlap) { best = id; bestOverlap = overlap; }
    }
    return best;
}

/**
 * The off-lane cards to have removed, in the order to remove them: another
 * lane's cards first, then cards in no lane but grey, then grey, never taking
 * the deck under {@link MIN_DECK_SIZE}.
 */
export function offLaneRemovals(
    k: Pick<LaneKnowledge, 'laneId'>,
    removable: readonly string[],
    deckSize: number,
    count: number,
): string[] {
    const rank = (id: string): number => {
        const lane = cardLaneId(id);
        if (lane === k.laneId) return -1;
        if (lane === undefined) return 1;
        return lane === 'grey' ? 0 : 2;
    };
    const candidates = removable.filter(id => rank(id) >= 0).sort((a, b) => rank(b) - rank(a));
    return candidates.slice(0, Math.max(0, Math.min(count, deckSize - MIN_DECK_SIZE)));
}

/** How many of a price the bot can pay for out of its currency (an unpriced service: as many as asked). */
function affordable(currency: number, price: number, wanted: number): number {
    if (price <= 0) return wanted;
    return Math.min(wanted, Math.floor(currency / price));
}

/** Build one archetype's run policy from its spec. */
export function archetypePolicy(spec: ArchetypeSpec): RunPolicy {
    const k: LaneKnowledge = {
        laneId: spec.laneId,
        keywords: laneKeywords(spec.laneId),
        fight: laneFightPolicy(spec.laneId),
    };
    const hurt = (health: number, maxHealth: number): boolean => health < maxHealth * spec.restBelow;
    return Object.freeze<RunPolicy>({
        id: spec.laneId,
        description: spec.description,
        chooseCharacter: (roster) => characterForLane(roster, spec.laneId).id,
        chooseRoad: (ctx) => {
            if (hurt(ctx.health, ctx.maxHealth)) {
                const mend = ctx.options.find((o: RunRoadOption) =>
                    o.unfinished && o.via !== 'travel' && o.nodeKind !== null && MENDING_KINDS.has(o.nodeKind));
                if (mend) return mend.nodeId;
                // Hurt, it does a safe errand one road away before a fight or a hazard,
                // and tries the node underfoot again (the elite it walked away from) last.
                const errand = ctx.options.find((o: RunRoadOption) =>
                    o.unfinished && o.via === 'road' && o.nodeKind !== null && ERRAND_KINDS.has(o.nodeKind));
                if (errand) return errand.nodeId;
                const onward = nearestRoad(ctx.options.filter(o => o.via !== 'retry'));
                if (onward) return onward.nodeId;
            }
            return nearestRoad(ctx.options)?.nodeId ?? null;
        },
        takeTravel: (ctx) => ctx.leavesMap || !ctx.destinationVisited,
        pickReward: (ctx): RunRewardDecision => {
            const own = ctx.offers.find(id => inLane(k, id));
            if (own !== undefined) return { kind: 'card', cardId: own };
            if (ctx.upgradeFromCardId !== null && inLane(k, ctx.upgradeFromCardId)) return { kind: 'upgrade' };
            const kin = bestLaneOffer(k, ctx.offers);
            if (kin !== null) return { kind: 'card', cardId: kin };
            if (ctx.upgradeFromCardId !== null) return { kind: 'upgrade' };
            return { kind: 'skip' };
        },
        chooseRest: (ctx) => {
            const upgrade = ctx.offers.find(o => o.id === 'upgrade' && o.enabled);
            const rest = ctx.offers.find(o => o.id === 'rest' && o.enabled);
            const pick = ctx.upgradableCardIds.find(id => inLane(k, id)) ?? ctx.upgradableCardIds[0];
            if (upgrade && pick !== undefined && (!hurt(ctx.health, ctx.maxHealth) || !rest)) {
                return { offer: 'upgrade', cardId: pick };
            }
            return { offer: 'rest' };
        },
        chooseCacheOffer: (ctx) =>
            (bestLaneOffer(k, [ctx.cardCandidate]) !== null || ctx.itemIds.length === 0 ? 'card' : 'item'),
        visitVillage: (ctx) => {
            let currency = ctx.currency;
            const rest = ctx.rest !== null && ctx.rest.enabled && hurt(ctx.health, ctx.maxHealth)
                && ctx.rest.price <= currency;
            if (rest && ctx.rest) currency -= ctx.rest.price;
            const buy: string[] = [];
            for (const offer of ctx.shop) {
                if (!offer.enabled || !inLane(k, offer.cardId) || offer.price > currency) continue;
                buy.push(offer.cardId);
                currency -= offer.price;
            }
            const removal = ctx.removal;
            const remove = removal && removal.enabled
                ? offLaneRemovals(k, removal.cardIds, ctx.deck.length + buy.length,
                    affordable(currency, removal.price, removal.cardIds.length))
                : [];
            return { rest, buy, remove };
        },
        hazardPolicy: (ctx) => (hurt(ctx.health, ctx.maxHealth) ? 'conservative' : 'greedy'),
        pickHazardCard: (ctx) => ctx.offers[0] ?? null,
        fightPolicy: () => k.fight,
        // An elite holds its road on: walk away from it once, hurt, and take it the next time.
        flee: (ctx) => ctx.isElite && !ctx.isBoss && ctx.fledHere === 0 && hurt(ctx.health, ctx.maxHealth),
        raiseStat: () => laneStat(spec.laneId),
        takeItem: (ctx) => {
            if (!ctx.wearable) return 'keep';
            const lane = itemLaneId(ctx.itemId);
            return lane === undefined || lane === spec.laneId ? 'equip' : 'keep';
        },
    });
}

/** Blood Price: pays in its own blood, so it keeps more VITAE in hand before it rests. */
export const BLOOD_PRICE_POLICY = archetypePolicy({
    laneId: 'blood-price',
    description: 'Builds Blood Price: its lane\'s cards first, SACRIFICE when a signature pays it back.',
    restBelow: 0.5,
});

/** The Defender: holds the line, so it presses on lower. */
export const DEFENDER_POLICY = archetypePolicy({
    laneId: 'defender',
    description: 'Builds the Defender: its lane\'s cards first, a guard up against every ATTACK and DANGER.',
    restBelow: 0.35,
});

/** The Merciful: drives every fight to befriending, and spares. */
export const MERCIFUL_POLICY = archetypePolicy({
    laneId: 'merciful',
    description: 'Builds the Merciful: its lane\'s cards first, mercy lines first in a fight, and it spares.',
    restBelow: 0.4,
});

/** The Elementalist: burns itself to burn the foe, so it rests early. */
export const ELEMENTALIST_POLICY = archetypePolicy({
    laneId: 'elementalist',
    description: 'Builds the Elementalist: its lane\'s cards first, its elements chained, no self-burn that ends it.',
    restBelow: 0.45,
});

/** The four archetypes, in listing order. */
export const ARCHETYPE_POLICIES: readonly RunPolicy[] = Object.freeze([
    BLOOD_PRICE_POLICY, DEFENDER_POLICY, MERCIFUL_POLICY, ELEMENTALIST_POLICY,
]);

/**
 * The four player personas (phase SM2c, chunk 135.3; A7 of
 * `plan/135-sm2-sim-follow-ups.md`): `cautious`, `reckless`, `explorer` and
 * `rusher`, the run sim's main bots. Each plays Chapter 1 the way one kind of
 * player would, rather than building one card lane.
 *
 * All four:
 *
 * - open at character select as the first character of the live roster;
 * - take the first card a reward offers, and the elite upgrade when it
 *   improves a card (the pool is already the character's lanes);
 * - take a cache's card, and the first card a hazard pays;
 * - wear every item they can, and raise the character's highest stat;
 * - buy nothing and remove nothing at a village (a bed when hurt);
 * - fight with the player witness plus the guard-when-hit rule (`PERSONA_FIGHT`: it kills every foe, so a
 *   persona earns XP and drafts).
 *
 * What differs is how hurt each lets itself get before it rests, which
 * roads it walks and whether it walks away from a fight. Every rule reads
 * node kinds, the elite and story flags, distances and VITAE from the
 * contexts, never a card or a node id (the no-id guard covers this file).
 */

import { PERSONA_FIGHT } from './run-policy.fight';
import { nearestRoad } from './run-policy.wanderer';
import type {
    RunFightContext,
    RunPolicy,
    RunRestContext,
    RunRewardContext,
    RunRewardDecision,
    RunRoadContext,
    RunRoadOption,
    RunStat,
} from './run-policy.types';

/** The node kinds a cautious player would rather visit than fight: no VITAE cost, or a way to mend. */
const SAFE_KINDS: ReadonlySet<string> = new Set(['rest', 'village', 'loot-cache', 'cutscene', 'quest']);

/** True when VITAE is under `share` of the maximum. */
function below(health: number, maxHealth: number, share: number): boolean {
    return health < maxHealth * share;
}

/** The first option holding the least of `distance`, or null when none has one. */
function nearestBy(options: readonly RunRoadOption[], distance: (o: RunRoadOption) => number | null): RunRoadOption | null {
    let best: RunRoadOption | null = null;
    let bestDistance = Infinity;
    for (const o of options) {
        const d = distance(o);
        if (d !== null && d < bestDistance) { best = o; bestDistance = d; }
    }
    return best;
}

/** The pieces every persona shares, with the three it varies: its rest line, its roads and its hazard crossing. */
interface PersonaSpec {
    readonly id: string;
    readonly description: string;
    /** The share of max VITAE under which it rests at a rest node and pays for a village bed. */
    readonly restBelow: number;
    chooseRoad(ctx: RunRoadContext): string | null;
    hazardPolicy: RunPolicy['hazardPolicy'];
    takeTravel: RunPolicy['takeTravel'];
    flee: RunPolicy['flee'];
}

function persona(spec: PersonaSpec): RunPolicy {
    return Object.freeze<RunPolicy>({
        id: spec.id,
        description: spec.description,
        chooseCharacter: (roster) => {
            const first = roster[0];
            if (!first) throw new Error(`${spec.id}: the roster holds no character.`);
            return first.id;
        },
        chooseRoad: spec.chooseRoad,
        takeTravel: spec.takeTravel,
        pickReward: (ctx: RunRewardContext): RunRewardDecision => {
            if (ctx.upgradeFromCardId !== null) return { kind: 'upgrade' };
            const first = ctx.offers[0];
            return first === undefined ? { kind: 'skip' } : { kind: 'card', cardId: first };
        },
        chooseRest: (ctx: RunRestContext) => {
            const rest = ctx.offers.find(o => o.id === 'rest' && o.enabled);
            const upgrade = ctx.offers.find(o => o.id === 'upgrade' && o.enabled);
            const card = ctx.upgradableCardIds[0];
            if (rest && below(ctx.health, ctx.maxHealth, spec.restBelow)) return { offer: 'rest' };
            if (upgrade && card !== undefined) return { offer: 'upgrade', cardId: card };
            return { offer: 'rest' };
        },
        chooseCacheOffer: () => 'card',
        visitVillage: (ctx) => ({
            rest: ctx.rest !== null && ctx.rest.enabled && ctx.rest.price <= ctx.currency
                && below(ctx.health, ctx.maxHealth, spec.restBelow),
            buy: [],
            remove: [],
        }),
        hazardPolicy: spec.hazardPolicy,
        pickHazardCard: (ctx) => ctx.offers[0] ?? null,
        fightPolicy: () => PERSONA_FIGHT,
        flee: spec.flee,
        raiseStat: (ctx): RunStat => {
            const { heart, body, mind } = ctx.baseStats;
            if (heart >= body && heart >= mind) return 'heart';
            return body >= mind ? 'body' : 'mind';
        },
        takeItem: (ctx) => (ctx.wearable ? 'equip' : 'keep'),
    });
}

/** Take a trip to a node not yet stood on, and the trip off the map. */
const takeTripsOnward: RunPolicy['takeTravel'] = (ctx) => ctx.leavesMap || !ctx.destinationVisited;

/** Never walk away from a fight. */
const neverFlee: RunPolicy['flee'] = () => false;

/** The share of max VITAE under which the cautious rests, and walks away from an elite. */
const CAUTIOUS_REST_BELOW = 0.6;
/** The share under which the cautious withdraws from any fight it may leave. */
const CAUTIOUS_WITHDRAW_BELOW = 0.4;

/**
 * Cautious: mends early, walks away from an elite once when hurt, and puts
 * the safe errands (a rest, village, cache, cutscene or quest) before fights
 * and hazards; never walks to an elite while other work is reachable.
 */
export const CAUTIOUS_POLICY: RunPolicy = persona({
    id: 'cautious',
    description: 'The careful player: rests early, avoids elites while other work remains, withdraws when hurt, crosses hazards conservatively.',
    restBelow: CAUTIOUS_REST_BELOW,
    chooseRoad: (ctx) => {
        const walkable = ctx.options.filter(o => o.distanceToUnfinished !== null);
        if (below(ctx.health, ctx.maxHealth, CAUTIOUS_REST_BELOW)) {
            const mend = walkable.find(o => o.unfinished && o.via === 'road' && o.nodeKind === 'rest');
            if (mend) return mend.nodeId;
        }
        // An elite waits while other work stands one road away; work only far off (or behind
        // the elite's own held road) does not send it pacing back and forth.
        const otherWork = walkable.some(o => !o.elite && o.unfinished);
        const pool = otherWork ? walkable.filter(o => !o.elite) : walkable;
        const near = Math.min(...pool.map(o => o.distanceToUnfinished ?? Infinity));
        const equal = pool.filter(o => o.distanceToUnfinished === near);
        const safe = equal.find(o => o.nodeKind !== null && SAFE_KINDS.has(o.nodeKind));
        return (safe ?? equal[0])?.nodeId ?? null;
    },
    hazardPolicy: () => 'conservative',
    takeTravel: takeTripsOnward,
    flee: (ctx: RunFightContext) =>
        // An elite holds its road on and a player who keeps leaving never gets past it:
        // each node is walked away from once, then fought.
        ctx.fledHere === 0
        && (below(ctx.health, ctx.maxHealth, CAUTIOUS_WITHDRAW_BELOW)
            || (ctx.isElite && !ctx.isBoss && below(ctx.health, ctx.maxHealth, CAUTIOUS_REST_BELOW))),
});

/** The share of max VITAE under which the reckless rests, and pays for a village bed. */
const RECKLESS_REST_BELOW = 0.5;

/** Reckless: walks to an elite or a hazard first, never withdraws, rests only under half. */
export const RECKLESS_POLICY: RunPolicy = persona({
    id: 'reckless',
    description: 'The bold player: elites and hazards first, never withdraws, upgrades at a rest unless under half VITAE, crosses hazards greedily.',
    restBelow: RECKLESS_REST_BELOW,
    chooseRoad: (ctx) => {
        const danger = ctx.options.find(o =>
            o.unfinished && o.via !== 'travel' && (o.elite || o.nodeKind === 'hazard'));
        if (danger) return danger.nodeId;
        return nearestRoad(ctx.options)?.nodeId ?? null;
    },
    hazardPolicy: () => 'greedy',
    takeTravel: takeTripsOnward,
    flee: neverFlee,
});

/** The share of max VITAE under which the explorer rests. */
const EXPLORER_REST_BELOW = 0.5;

/**
 * Explorer: walks to the nearest unfinished node (which includes every quest,
 * village and cutscene node, so it talks to every NPC and finishes side
 * quests), and leaves the map only when nothing unfinished is left in reach.
 */
export const EXPLORER_POLICY: RunPolicy = persona({
    id: 'explorer',
    description: 'The thorough player: the nearest unfinished node every time, every NPC and side quest, leaves the map last.',
    restBelow: EXPLORER_REST_BELOW,
    chooseRoad: (ctx) => {
        // The exit trip reads as unspent work too, and so does the road that only leads to it
        // (its nearest work is the exit itself): both are left for last.
        const inland = ctx.options.filter(o => o.distanceToExit === null || o.distanceToUnfinished !== o.distanceToExit);
        return (nearestRoad(inland) ?? nearestRoad(ctx.options))?.nodeId ?? null;
    },
    hazardPolicy: (ctx) => (below(ctx.health, ctx.maxHealth, EXPLORER_REST_BELOW) ? 'conservative' : 'greedy'),
    takeTravel: (ctx) => (ctx.leavesMap ? ctx.unfinishedReachable === 0 : !ctx.destinationVisited),
    flee: neverFlee,
});

/** The share of max VITAE under which the rusher rests. */
const RUSHER_REST_BELOW = 0.3;

/**
 * Rusher: the road nearest the story's next step (a main-questline node, a
 * road-holding gate, the boss), else nearest the chapter exit; takes the exit
 * trip as soon as it can; rests only when nearly down.
 */
export const RUSHER_POLICY: RunPolicy = persona({
    id: 'rusher',
    description: 'The hurried player: the story\'s next step, then the exit; skips every node that is neither; rests only when nearly down.',
    restBelow: RUSHER_REST_BELOW,
    chooseRoad: (ctx) => {
        const toStory = nearestBy(ctx.options, o => o.distanceToStory);
        if (toStory) return toStory.nodeId;
        const toExit = nearestBy(ctx.options, o => o.distanceToExit);
        if (toExit) return toExit.nodeId;
        return nearestRoad(ctx.options)?.nodeId ?? null;
    },
    hazardPolicy: () => 'greedy',
    takeTravel: (ctx) => ctx.leavesMap || !ctx.destinationVisited,
    flee: neverFlee,
});

/** The four personas, in listing order. */
export const PERSONA_POLICIES: readonly RunPolicy[] = Object.freeze([
    CAUTIOUS_POLICY, RECKLESS_POLICY, EXPLORER_POLICY, RUSHER_POLICY,
]);

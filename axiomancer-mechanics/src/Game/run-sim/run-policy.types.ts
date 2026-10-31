/**
 * The run policy contract: every choice a player makes over a whole run, one
 * seam per decision (phase SM1e).
 *
 * A headless run driver (the app's `sim/` driver, `npm run sim:run`) walks a
 * Chapter 1 run through the app's own store actions and asks a `RunPolicy`
 * at each choice: which character to open as, which road to take, whether to
 * take a trip, which reward to pick or skip, which rest option, which cache
 * offer, what to do in a village, how to play a hazard and a fight, which
 * stat to raise, which item to wear, and when to flee. The driver hands each
 * seam a small read-only context built from the store; the seam answers with
 * one of the legal choices the context lists. The driver checks the answer
 * and throws when it is not legal.
 *
 * A policy reads data (card lanes, keywords, intents, node kinds), never a
 * card id: the bots stay current as cards are added (the brief's "the bot
 * knows the game from data").
 *
 * The `wanderer` baseline (`run-policy.wanderer.ts`) takes the first legal
 * choice at every seam and fights `greedy`.
 */

import type { CharacterDefinition } from '../../Character/roster';
import type { BaseStats } from '../../Character/types';
import type { CombatSimPolicy } from '../../Combat/combat.sim-policies';
import type { HazardPolicyId } from '../../World/Hazard/hazard.sim';

/** One legal road from where the player stands. */
export interface RunRoadOption {
    /** The node the road leads to (the node underfoot for a retry). */
    readonly nodeId: string;
    /** How the driver takes it: walk the road, retry the node underfoot, or take the trip from here. */
    readonly via: 'road' | 'retry' | 'travel';
    /** The node's authored event kind (`fight`, `rest`, `quest`, …), or null when it has none. */
    readonly nodeKind: string | null;
    /** True when the node still has something to do (unspent, or a quest node with business). */
    readonly unfinished: boolean;
    /**
     * Roads from this option to the nearest unfinished node (0 when the option
     * is unfinished itself), or null when no unfinished node lies past it.
     */
    readonly distanceToUnfinished: number | null;
}

/** The road seam's view of the map. */
export interface RunRoadContext {
    readonly mapName: string;
    readonly currentNodeId: string;
    readonly options: readonly RunRoadOption[];
    readonly health: number;
    readonly maxHealth: number;
    /** True while the player is dying (a first death revived them). */
    readonly dying: boolean;
}

/** A trip a travel node offers. */
export interface RunTravelContext {
    readonly fromNodeId: string;
    /** The node the trip lands on when it stays on this map; null for another map. */
    readonly toNodeId: string | null;
    /** The map the trip leads to when it leaves this one; null on the same map. */
    readonly toMap: string | null;
    /** True when the trip leaves the map: the chapter's exit. */
    readonly leavesMap: boolean;
    /** True when the destination node has been stood on this run. */
    readonly destinationVisited: boolean;
}

/** Where a card offer came from. */
export type RunRewardSource = 'fight' | 'elite' | 'quest';

/** A card draft: pick one offer, take the elite upgrade, or skip. */
export interface RunRewardContext {
    readonly source: RunRewardSource;
    /** The offered card ids, in offer order. */
    readonly offers: readonly string[];
    /** After an elite fight, the owned card the upgrade would improve; null otherwise. */
    readonly upgradeFromCardId: string | null;
    /** The run's combat deck before the pick. */
    readonly deck: readonly string[];
}

/** A reward answer: a card from the offers, the elite upgrade, or nothing. */
export type RunRewardDecision =
    | { readonly kind: 'card'; readonly cardId: string }
    | { readonly kind: 'upgrade' }
    | { readonly kind: 'skip' };

/** A rest node: two priced offers. */
export interface RunRestContext {
    readonly health: number;
    readonly maxHealth: number;
    readonly currency: number;
    readonly offers: readonly { readonly id: 'rest' | 'upgrade'; readonly cost: number; readonly enabled: boolean }[];
    /** The distinct deck cards that can take one more upgrade. */
    readonly upgradableCardIds: readonly string[];
    readonly deck: readonly string[];
}

/** A rest answer: rest, or upgrade one of the upgradable cards. */
export type RunRestDecision =
    | { readonly offer: 'rest' }
    | { readonly offer: 'upgrade'; readonly cardId: string };

/** A loot cache: the card offer or the item offer. */
export interface RunCacheContext {
    readonly cardCandidate: string;
    readonly itemIds: readonly string[];
    readonly currency: number;
    readonly deck: readonly string[];
}

/** A village visit: its counters as the screen shows them. */
export interface RunVillageContext {
    readonly health: number;
    readonly maxHealth: number;
    readonly currency: number;
    /** The paid rest, or null when the village lets no bed. */
    readonly rest: { readonly price: number; readonly enabled: boolean } | null;
    /** The card shop's cards, or empty when there is no shop. */
    readonly shop: readonly { readonly cardId: string; readonly price: number; readonly enabled: boolean }[];
    /** The removal service, or null when there is no shop. */
    readonly removal: { readonly price: number; readonly enabled: boolean; readonly cardIds: readonly string[] } | null;
    readonly hasAnvil: boolean;
    readonly deck: readonly string[];
}

/** A village answer, carried out in order: rest, buy, remove, then leave. */
export interface RunVillageDecision {
    readonly rest: boolean;
    readonly buy: readonly string[];
    readonly remove: readonly string[];
}

/** A hazard about to be crossed. */
export interface RunHazardContext {
    readonly hazardId: string;
    readonly health: number;
    readonly maxHealth: number;
}

/** A hazard's card reward: pick one offer, or skip when allowed. */
export interface RunHazardCardContext {
    readonly offers: readonly string[];
    readonly canSkip: boolean;
}

/** A fight about to be played. */
export interface RunFightContext {
    readonly enemyName: string;
    readonly isBoss: boolean;
    readonly isElite: boolean;
    /** True when the fight may be walked away from (WITHDRAW). */
    readonly fleeAllowed: boolean;
    readonly health: number;
    readonly maxHealth: number;
    readonly deck: readonly string[];
}

/** A level-up's stat point. */
export interface RunLevelUpContext {
    readonly level: number;
    readonly baseStats: Readonly<BaseStats>;
    readonly availableStatPoints: number;
}

/** An item on the reward screen. */
export interface RunItemContext {
    readonly itemId: string;
    readonly category: string;
    /** True when the item can be worn (EQUIP is offered). */
    readonly wearable: boolean;
}

/** The stats a level-up can raise. */
export type RunStat = 'heart' | 'body' | 'mind';

/**
 * A run policy: one answer per decision a run asks of a player. Every seam is
 * pure and synchronous; randomness, if a policy wants any, comes from the
 * engine's seeded stream through the fight policy's `rng`, never Math.random.
 */
export interface RunPolicy {
    readonly id: string;
    readonly description: string;
    /** Character select: the roster id CONFIRM opens the run as. */
    chooseCharacter(roster: readonly CharacterDefinition[]): string;
    /** Which road to take; null when no road is worth taking (the driver throws). */
    chooseRoad(ctx: RunRoadContext): string | null;
    /** Whether to take the trip a travel node offers. */
    takeTravel(ctx: RunTravelContext): boolean;
    /** Which reward to pick, the elite upgrade, or skip. */
    pickReward(ctx: RunRewardContext): RunRewardDecision;
    /** Which rest option to take at a rest node. */
    chooseRest(ctx: RunRestContext): RunRestDecision;
    /** Which loot-cache offer to take. */
    chooseCacheOffer(ctx: RunCacheContext): 'card' | 'item';
    /** What to do at a village before leaving. */
    visitVillage(ctx: RunVillageContext): RunVillageDecision;
    /** How to play a hazard: a `hazard.sim.ts` policy. */
    hazardPolicy(ctx: RunHazardContext): HazardPolicyId;
    /** Which hazard card to take from a crossing's reward, or null to skip. */
    pickHazardCard(ctx: RunHazardCardContext): string | null;
    /** How to play a fight: a combat sim witness. */
    fightPolicy(ctx: RunFightContext): CombatSimPolicy;
    /** Whether to WITHDRAW from a fight before it starts (only asked when allowed). */
    flee(ctx: RunFightContext): boolean;
    /** Which stat a banked stat point raises. */
    raiseStat(ctx: RunLevelUpContext): RunStat;
    /** Whether to wear a reward item (EQUIP) or keep it in the satchel (CONFIRM). */
    takeItem(ctx: RunItemContext): 'equip' | 'keep';
}

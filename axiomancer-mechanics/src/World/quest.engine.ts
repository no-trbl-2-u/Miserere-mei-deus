/**
 * Quest engine (per-objective tracking).
 *
 * Quests live in a `QuestLog` carried on `GameState`. The lifecycle is:
 *
 *   1. `startQuest(log, quest)` — moves the quest into `active`.
 *   2. `progressQuest(log, name, objectiveId, amount)` — advances a single
 *      objective's `currentCount`. When every objective is filled the quest
 *      auto-completes via `tryCompleteQuest`.
 *   3. `completeQuest(log, name)` — explicit completion; moves the quest into
 *      the `completed` list.
 *
 * All reducers are pure. Helpers (`isQuestComplete`, `findActiveQuest`,
 * `findQuest`, the `*Objectives` lookups) are read-only.
 */

import { Quest, QuestLog, QuestObjective, QuestStatus, Reward } from './types';
import type { QuestName } from './quest.library';
import { NodeId } from './types';
import type { MapName } from './map.library';
import type { Character } from '../Character/types';
import type { Item } from '../Items/types';
import { grantItem } from '../Items/item-grant';
import { removeItem } from '../Items/item.reducer';
import { isConsumable, isMaterial } from '../Items/types';
import { rollCombatCardRewards, isEliteEnemy } from '../Combat/combat.rewards';
import { getRng } from '../Utils/rng';
import type { Enemy } from '../Enemy/types';

/** Empty quest log used by `createNewGameState`. */
export function emptyQuestLog(): QuestLog {
    return { available: [], active: [], completed: [] };
}

/** Returns true when every objective on `quest` has `currentCount >= requiredCount`. */
export function isQuestComplete(quest: Quest): boolean {
    return quest.objectives.every(o => o.currentCount >= o.requiredCount);
}

/** Looks up a quest in `log.active` by name. */
export function findActiveQuest(log: QuestLog, name: QuestName): Quest | undefined {
    return log.active.find(q => q.name === name);
}

/** Looks up a quest anywhere in the log. */
export function findQuest(log: QuestLog, name: QuestName): Quest | undefined {
    return log.active.find(q => q.name === name)
        ?? log.available.find(q => q.name === name);
}

/**
 * Moves a quest from `available` → `active`. If the quest isn't already in
 * the log it is added directly to `active`. Idempotent on re-start.
 */
export function startQuest(log: QuestLog, quest: Quest): QuestLog {
    if (log.completed.includes(quest.name)) return log;
    if (log.active.some(q => q.name === quest.name)) return log;

    const fromAvailable = log.available.find(q => q.name === quest.name);
    const next: Quest = {
        ...(fromAvailable ?? quest),
        status: 'active' as QuestStatus,
    };
    return {
        ...log,
        available: log.available.filter(q => q.name !== quest.name),
        active: [...log.active, next],
    };
}

/**
 * Advances one objective's `currentCount` by `amount` (default 1). Capped at
 * `requiredCount`. When every objective fills, the quest is auto-completed
 * (moved to `completed`); when this happens the returned `completedName` is
 * set so callers can grant the reward.
 */
export function progressQuest(
    log: QuestLog,
    name: QuestName,
    objectiveId: string,
    amount = 1,
): { log: QuestLog; completedName?: QuestName } {
    const quest = findActiveQuest(log, name);
    if (!quest) return { log };

    let touched = false;
    const objectives: QuestObjective[] = quest.objectives.map(o => {
        if (o.id !== objectiveId) return o;
        touched = true;
        const next = Math.min(o.requiredCount, o.currentCount + amount);
        return { ...o, currentCount: next };
    });
    if (!touched) return { log };

    const next: Quest = { ...quest, objectives };
    const updatedActive = log.active.map(q => q.name === name ? next : q);

    // A held quest (`holdForTurnIn`) that fills stays active ("ready"): it is
    // neither completed nor paid until it is turned in (QL1b).
    if (isQuestComplete(next) && !next.holdForTurnIn) {
        return {
            log: {
                ...log,
                active: updatedActive.filter(q => q.name !== name),
                completed: [...log.completed, name],
            },
            completedName: name,
        };
    }
    return { log: { ...log, active: updatedActive } };
}

/**
 * Returns active-quest objectives that fire on `collect`-type completion for
 * `itemId`. Used by `resolveMapEvent` to auto-advance "gather N of X"
 * objectives when a gathering event grants a matching item.
 */
export function collectObjectives(log: QuestLog, itemId: string): Array<{
    questName: QuestName;
    objectiveId: string;
}> {
    const out: Array<{ questName: QuestName; objectiveId: string }> = [];
    for (const q of log.active) {
        for (const o of q.objectives) {
            if (o.type === 'collect' && o.target === itemId && o.currentCount < o.requiredCount) {
                out.push({ questName: q.name, objectiveId: o.id });
            }
        }
    }
    return out;
}

/**
 * Advances every active `kill` objective that names `enemyName` AND belongs
 * to `mapName`, returning the updated log plus the quests that completed as
 * a result.
 *
 * Matching is on the enemy's DISPLAY NAME (`Enemy.name`), which is what the
 * authored objectives carry — e.g. an objective targets "The Death Beholder",
 * not the `death-beholder` slug. Several Act 1 regions share a door-fight
 * display name, so `mapName` (the current map) is required: without it, a
 * kill in one region would wrongly advance a same-named kill objective
 * authored for another region's quest.
 *
 * It is a reusable reducer because the hazard-pattern combat never routes
 * through `endCombat`, so the host calls it when a fight ends.
 */
export function advanceKillObjectives(
    log: QuestLog,
    enemy: string | KilledFoe,
    mapName: MapName,
): { log: QuestLog; completed: QuestName[] } {
    let next = log;
    const completed: QuestName[] = [];
    // Re-read the objectives each pass: progressQuest may move a quest out of
    // `active`, and one kill can fill objectives on more than one quest.
    for (const { questName, objectiveId } of killObjectives(log, enemy, mapName)) {
        const step = progressQuest(next, questName, objectiveId);
        next = step.log;
        if (step.completedName) completed.push(step.completedName);
    }
    return { log: next, completed };
}

/**
 * Mark a quest completed explicitly (no objective bookkeeping). Used by event
 * nodes that want to short-circuit objective tracking.
 */
export function completeQuest(log: QuestLog, name: QuestName): QuestLog {
    if (log.completed.includes(name)) return log;
    return {
        ...log,
        active: log.active.filter(q => q.name !== name),
        available: log.available.filter(q => q.name !== name),
        completed: [...log.completed, name],
    };
}

/**
 * Adds a quest to `available` if not already present anywhere in the log.
 * Used by map definitions that publish quests on a per-map basis.
 */
export function discoverQuest(log: QuestLog, quest: Quest): QuestLog {
    if (log.completed.includes(quest.name)) return log;
    if (log.active.some(q => q.name === quest.name)) return log;
    if (log.available.some(q => q.name === quest.name)) return log;
    return {
        ...log,
        available: [...log.available, { ...quest, status: 'available' as QuestStatus }],
    };
}

/**
 * Returns active-quest objectives that fire on `reach`-type completion for
 * `nodeId`. Used by `resolveMapEvent` to auto-advance "reach the X" objectives
 * the moment a player arrives.
 */
export function reachableObjectives(log: QuestLog, nodeId: NodeId): Array<{
    questName: QuestName;
    objectiveId: string;
}> {
    const out: Array<{ questName: QuestName; objectiveId: string }> = [];
    for (const q of log.active) {
        for (const o of q.objectives) {
            if (o.type === 'reach' && o.target === nodeId && o.currentCount < o.requiredCount) {
                out.push({ questName: q.name, objectiveId: o.id });
            }
        }
    }
    return out;
}

/**
 * Returns active-quest objectives that fire on `kill`-type completion for
 * `enemySlug` on `mapName`. Used by `endCombat` to auto-advance kill
 * counters. Scoped to `mapName` because a kill objective's `target` is the
 * enemy's display name, and that name is not unique across maps (every Act 1
 * region's door fight is "The Death Beholder").
 */
export function killObjectives(log: QuestLog, enemy: string | KilledFoe, mapName: MapName): Array<{
    questName: QuestName;
    objectiveId: string;
}> {
    const foe: KilledFoe = typeof enemy === 'string' ? { name: enemy } : enemy;
    const out: Array<{ questName: QuestName; objectiveId: string }> = [];
    for (const q of log.active) {
        if (q.mapName !== mapName) continue;
        for (const o of q.objectives) {
            if (o.type !== 'kill' || o.currentCount >= o.requiredCount) continue;
            if (killObjectiveCounts(o, foe)) out.push({ questName: q.name, objectiveId: o.id });
        }
    }
    return out;
}

/** The part of a foe a kill objective reads: its display name and difficulty. */
export type KilledFoe = Pick<Enemy, 'name'> & Partial<Pick<Enemy, 'difficulty'>>;

/**
 * True when a won fight against `foe` counts toward `objective`. A `target`
 * names a foe by display name; with no `target`, `foeClass` counts a class:
 * `'any'` every foe, `'elite'` an elite (`isEliteEnemy`), `'boss'` a foe whose
 * difficulty is `'boss'`. An objective with neither counts nothing.
 */
function killObjectiveCounts(objective: QuestObjective, foe: KilledFoe): boolean {
    if (objective.target !== undefined) return objective.target === foe.name;
    switch (objective.foeClass) {
        case 'any':   return true;
        case 'elite': return isEliteEnemy({ difficulty: foe.difficulty });
        case 'boss':  return foe.difficulty === 'boss';
        default:      return false;
    }
}

/**
 * Returns active-quest `hazard` objectives on `mapName` that have room left.
 * Scoped to the quest's own map like the kill objectives.
 */
export function hazardObjectives(log: QuestLog, mapName: MapName): Array<{
    questName: QuestName;
    objectiveId: string;
}> {
    const out: Array<{ questName: QuestName; objectiveId: string }> = [];
    for (const q of log.active) {
        if (q.mapName !== mapName) continue;
        for (const o of q.objectives) {
            if (o.type === 'hazard' && o.currentCount < o.requiredCount) {
                out.push({ questName: q.name, objectiveId: o.id });
            }
        }
    }
    return out;
}

/**
 * Counts one resolved hazard node toward every active `hazard` objective on
 * `mapName`, whatever the hazard did to the player.
 */
export function advanceHazardObjectives(
    log: QuestLog,
    mapName: MapName,
): { log: QuestLog; completed: QuestName[] } {
    let next = log;
    const completed: QuestName[] = [];
    for (const { questName, objectiveId } of hazardObjectives(log, mapName)) {
        const step = progressQuest(next, questName, objectiveId);
        next = step.log;
        if (step.completedName) completed.push(step.completedName);
    }
    return { log: next, completed };
}

// ─── Carry objectives ─────────────────────────────────────────────────────────

/** How many of item `itemId` the inventory holds (a stack counts its quantity). */
export function carriedCount(inventory: readonly Item[], itemId: string): number {
    let held = 0;
    for (const item of inventory) {
        if (item.id !== itemId) continue;
        held += isConsumable(item) || isMaterial(item) ? item.quantity : 1;
    }
    return held;
}

/** Removes one of `itemId` from the inventory (a stack loses one, a lone item goes). */
function consumeOne(inventory: Item[], itemId: string): Item[] {
    const row = inventory.find(i => i.id === itemId);
    if (!row) return inventory;
    if ((isConsumable(row) || isMaterial(row)) && row.quantity > 1) {
        return inventory.map(i => i === row ? { ...row, quantity: row.quantity - 1 } : i);
    }
    return removeItem(inventory, itemId);
}

/**
 * Reads every active quest's `carry` objectives off the inventory: an
 * objective is met (`currentCount` = `requiredCount`) while the player holds
 * enough of its `target`, and unmet again when the item leaves. A quest that
 * is not held for a turn-in and so fills completes, as any filled quest does.
 * The same log comes back when nothing moved.
 */
export function syncCarryObjectives(player: Character, log: QuestLog): QuestLog {
    let next = log;
    for (const quest of log.active) {
        if (!quest.objectives.some(o => o.type === 'carry')) continue;
        const objectives = quest.objectives.map(o => {
            if (o.type !== 'carry' || o.target === undefined) return o;
            const held = Math.min(o.requiredCount, carriedCount(player.inventory, o.target));
            return held === o.currentCount ? o : { ...o, currentCount: held };
        });
        if (objectives.every((o, i) => o === quest.objectives[i])) continue;
        const updated: Quest = { ...quest, objectives };
        const active = next.active.map(q => q.name === quest.name ? updated : q);
        next = isQuestComplete(updated) && !updated.holdForTurnIn
            ? { ...next, active: active.filter(q => q.name !== quest.name), completed: [...next.completed, quest.name] }
            : { ...next, active };
    }
    return next;
}

/** Uses up the items a completed quest's `carry` objectives asked for (`requiredCount` of each). */
export function consumeCarriedItems(player: Character, quest: Pick<Quest, 'objectives'>): Character {
    let inventory = player.inventory;
    for (const o of quest.objectives) {
        if (o.type !== 'carry' || o.target === undefined) continue;
        for (let i = 0; i < o.requiredCount; i++) inventory = consumeOne(inventory, o.target);
    }
    return inventory === player.inventory ? player : { ...player, inventory };
}

// ─── Quest rewards ────────────────────────────────────────────────────────────

/** What one completed quest paid: its name and the items it put in the inventory. */
export interface PaidQuestReward {
    questName: QuestName;
    /** The quest's first reward (`Quest.reward`). */
    reward: Reward;
    /** Every reward paid, in order: `reward` then `Quest.rewards`. */
    rewards: Reward[];
    /** The items granted to the inventory (an `Item` or `{ kind: 'item' }` reward). */
    items: Item[];
    /** The card ids a `card-pick` reward rolled; none is added to the deck here. */
    cardOffers?: string[];
}

/** The item a reward hands over, or `null` for a currency, experience, card, card-pick or tag reward. */
export function questRewardItem(reward: Reward): Item | null {
    if (typeof reward === 'string') return null;
    if ('kind' in reward) return reward.kind === 'item' ? reward.item : null;
    return reward;
}

/**
 * The quests that moved into `after.completed` since `before`, read from
 * `before` (a completed quest leaves only its name in the log). A quest the
 * log never held is skipped: there is no reward to read.
 */
export function newlyCompletedQuests(before: QuestLog, after: QuestLog): Quest[] {
    const out: Quest[] = [];
    for (const name of after.completed) {
        if (before.completed.includes(name)) continue;
        const quest = findQuest(before, name) ?? findQuest(after, name);
        if (quest) out.push(quest);
    }
    return out;
}

/**
 * Pays one quest's rewards to `player`, `reward` first and then each of
 * `rewards` in order: `currency` and `experience` add their amount, an `Item`
 * or `{ kind: 'item' }` reward is granted to the inventory (unworn, through
 * `grantItem`), and a `card-pick` rolls its offers (`rollCombatCardRewards`)
 * onto `cardOffers` without adding a card. A card or a bare tag pays nothing
 * here. A quest with only `reward` pays exactly as it always has.
 */
export function payQuestReward(
    player: Character,
    quest: Pick<Quest, 'name' | 'reward'> & Partial<Pick<Quest, 'rewards'>>,
    rng: () => number = () => getRng().random(),
): { player: Character; paid: PaidQuestReward } {
    const rewards = [quest.reward, ...(quest.rewards ?? [])];
    let next = player;
    const items: Item[] = [];
    let cardOffers: string[] | undefined;
    for (const reward of rewards) {
        if (typeof reward !== 'string' && 'kind' in reward) {
            if (reward.kind === 'currency') {
                next = { ...next, currency: next.currency + reward.amount };
                continue;
            }
            if (reward.kind === 'experience') {
                next = { ...next, experience: next.experience + reward.amount };
                continue;
            }
            if (reward.kind === 'card-pick') {
                cardOffers = [...(cardOffers ?? []), ...rollCombatCardRewards(next, rng, reward.count)];
                continue;
            }
        }
        const item = questRewardItem(reward);
        if (!item) continue;
        const granted = grantItem(next, item);
        next = granted.character;
        items.push(granted.granted);
    }
    const paid: PaidQuestReward = { questName: quest.name, reward: quest.reward, rewards, items };
    if (cardOffers) paid.cardOffers = cardOffers;
    return { player: next, paid };
}

/**
 * THE quest-reward door: pays every quest that completed between `before`
 * and `after`, once each. Every completion path reaches it through the
 * settle seam (`settleQuestLog`, `questline.ts`) — `endCombat`'s kills,
 * the hazard, `reach` and `collect` branches of `resolveMapEvent`, the
 * dialogue `progressQuest` / `completeQuest` effects and a questline turn-in —
 * or through `settleKill` — so no path pays twice and none pays nothing.
 */
export function payCompletedQuests(
    player: Character,
    before: QuestLog,
    after: QuestLog,
    rng: () => number = () => getRng().random(),
): { player: Character; paid: PaidQuestReward[] } {
    let next = player;
    const paid: PaidQuestReward[] = [];
    for (const quest of newlyCompletedQuests(before, after)) {
        // A carried item is used up on completion, before the reward lands.
        next = consumeCarriedItems(next, quest);
        const step = payQuestReward(next, quest, rng);
        next = step.player;
        paid.push(step.paid);
    }
    return { player: next, paid };
}

/**
 * A won fight's kill, settled on the quest log AND paid: advances every
 * `kill` objective that counts `enemy` on `mapName` (`advanceKillObjectives`:
 * by display name, or by class for `foeClass`) and pays the quests it
 * completed. A host whose fight never routes through `endCombat` calls it
 * when the fight ends (`endCombat` itself advances the kills and settles
 * them through `settleQuestLog`, which also opens a ready questline step's
 * roads; this helper opens none). A bare name counts only
 * name-targeted objectives; pass the enemy to count a class.
 */
export function settleKill(
    player: Character,
    quests: QuestLog,
    enemy: string | KilledFoe,
    mapName: MapName,
    rng?: () => number,
): { player: Character; quests: QuestLog; paid: PaidQuestReward[] } {
    const { log } = advanceKillObjectives(quests, enemy, mapName);
    if (log === quests) return { player, quests, paid: [] };
    const pay = payCompletedQuests(player, quests, log, rng);
    return { player: pay.player, quests: log, paid: pay.paid };
}

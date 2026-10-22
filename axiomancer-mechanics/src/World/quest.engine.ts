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

import { Quest, QuestLog, QuestObjective, QuestStatus } from './types';
import { QuestName } from './quest.library';
import { NodeId } from './types';

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

    if (isQuestComplete(next)) {
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
 * Advances every active `kill` objective that names `enemyName`, returning the
 * updated log plus the quests that completed as a result.
 *
 * Matching is on the enemy's DISPLAY NAME (`Enemy.name`), which is what the
 * authored objectives carry — e.g. an objective targets "The Death Beholder",
 * not the `death-beholder` slug.
 *
 * It is a reusable reducer because the hazard-pattern combat never routes
 * through `endCombat`, so the host calls it when a fight ends.
 */
export function advanceKillObjectives(
    log: QuestLog,
    enemyName: string,
): { log: QuestLog; completed: QuestName[] } {
    let next = log;
    const completed: QuestName[] = [];
    // Re-read the objectives each pass: progressQuest may move a quest out of
    // `active`, and one kill can fill objectives on more than one quest.
    for (const { questName, objectiveId } of killObjectives(log, enemyName)) {
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
 * `enemySlug`. Used by `endCombat` to auto-advance kill counters.
 */
export function killObjectives(log: QuestLog, enemySlug: string): Array<{
    questName: QuestName;
    objectiveId: string;
}> {
    const out: Array<{ questName: QuestName; objectiveId: string }> = [];
    for (const q of log.active) {
        for (const o of q.objectives) {
            if (o.type === 'kill' && o.target === enemySlug && o.currentCount < o.requiredCount) {
                out.push({ questName: q.name, objectiveId: o.id });
            }
        }
    }
    return out;
}

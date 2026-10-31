/**
 * The quest tracker's presenter (phase MQ1c): what the exploration screen
 * shows of the quests in the log. Pure: it words the log's own progress (the
 * counts `settleQuestLog`, `acceptQuestStep` and `turnInQuestStep` leave,
 * `carry` objectives included) and decides no rule. Also the two lookups the
 * quest screens share: the name of a `carry` item, and the quest holding a
 * shut road.
 */

import { listQuestlines } from '@mechanics';
import type { GameState, Quest, QuestObjective, Reward } from '@mechanics';
import {
    TRACKER_READY_LINE,
    questBringLine,
    questProgressShort,
} from './quest.copy';

/** The most rows the tracker draws before it folds the rest into `+n more`. */
export const TRACKER_MAX_ROWS = 3;

export interface QuestTrackerRow {
    /** Stable key: the active quest's name. */
    id: string;
    name: string;
    /** The next unmet objective in words (`Bring: Key` for a carry objective). */
    objective: string;
    /** "2/3"; empty when the quest is ready to turn in. */
    progress: string;
}

export interface QuestTrackerVM {
    rows: readonly QuestTrackerRow[];
    /** Quests beyond the drawn rows. */
    more: number;
}

const EMPTY_TRACKER: QuestTrackerVM = Object.freeze({ rows: Object.freeze([]), more: 0 });

/** The item a reward puts in the satchel, when it is one. */
export function rewardItem(reward: Reward): { id: string; name: string } | null {
    if (typeof reward === 'string') return null;
    if ('kind' in reward) return reward.kind === 'item' ? reward.item : null;
    return reward;
}

/** The display name of the item a reward puts in the satchel, else null. */
export function rewardItemName(reward: Reward): string | null {
    return rewardItem(reward)?.name ?? null;
}

/**
 * The display name of the item a `carry` objective asks for: found among the
 * rewards of the registered questlines (the step that pays the key), else the
 * item id itself.
 */
export function carryItemName(target: string | undefined): string {
    if (target === undefined) return '';
    for (const line of listQuestlines()) {
        for (const step of line.steps) {
            for (const reward of step.rewards) {
                const item = rewardItem(reward);
                if (item && item.id === target) return item.name;
            }
        }
    }
    return target;
}

/** One objective as the tracker and the quest screen word it. */
export function objectiveText(o: QuestObjective): string {
    return o.type === 'carry' ? questBringLine(carryItemName(o.target)) : o.description;
}

/**
 * The name of the quest whose step holds the road between `a` and `b` on map
 * `mapName` (a `gatesPast` gate or an `opensOnReady` lock, either direction),
 * or null.
 */
export function questHoldingRoad(mapName: string, a: string, b: string): string | null {
    const same = (r: { from: string; to: string }) => (r.from === a && r.to === b) || (r.from === b && r.to === a);
    for (const line of listQuestlines()) {
        if (line.mapName !== mapName) continue;
        for (const step of line.steps) {
            if ((step.gatesPast ?? []).some(same) || (step.opensOnReady ?? []).some(same)) return step.quest.name;
        }
    }
    return null;
}

function rowOf(quest: Quest): QuestTrackerRow {
    const next = quest.objectives.find(o => o.currentCount < o.requiredCount);
    if (!next) return { id: quest.name, name: quest.name, objective: TRACKER_READY_LINE, progress: '' };
    return {
        id: quest.name,
        name: quest.name,
        objective: objectiveText(next),
        progress: questProgressShort(next.currentCount, next.requiredCount),
    };
}

/** Every active quest, three rows then `+n more`; an empty log gives no rows. */
export function selectQuestTrackerVM(state: { quests?: GameState['quests'] | null }): QuestTrackerVM {
    const active = state.quests?.active ?? [];
    if (active.length === 0) return EMPTY_TRACKER;
    return {
        rows: active.slice(0, TRACKER_MAX_ROWS).map(rowOf),
        more: Math.max(0, active.length - TRACKER_MAX_ROWS),
    };
}

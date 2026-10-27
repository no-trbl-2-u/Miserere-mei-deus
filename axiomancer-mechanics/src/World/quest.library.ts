/**
 * The quest library: the quests the game hands out (phase LR1f).
 *
 * `QuestName` names a quest-LOG quest — the objective-tracking quests
 * consumed by `quest.engine.ts`, dialogue gating
 * (`DialogueChoice.requires.quest`) and reach objectives.
 *
 * Only Chapter 1, the Breakwater, carries a quest so far (T, 2026-10-27:
 * "only Chapter 1 is focused on. We haven't really discussed what quests
 * look like yet"). It is on its map's `quests`, is started by a choice in
 * its giver's narration (`MapEvents/content.ts`), is finished by an
 * objective the engine counts (`kill`, `reach`, `collect`) and pays its
 * relic through the one reward door (`payCompletedQuests`):
 *
 *   The Watchtower Lamp      breakwater     giver bw-12  kill The Death Beholder   Ruby Signet
 *
 * Chapters 2-4 carry no quest until T and the loop settle what a quest is.
 * No quest pays an elite-only relic: those drop only from elites.
 * The name, description and objective line are plain placeholders,
 * [content] for T to rewrite.
 */

import type { Quest, QuestObjective } from './types';
import type { MapName } from './map.library';
import { cloneRelic, getRelicById } from '../Items/relic.library';

export type QuestName = string;

/** A quest's relic reward, cloned from the library entry so the quest never aliases it. */
function relicReward(relicId: string): Quest['reward'] {
    const relic = getRelicById(relicId);
    if (!relic) throw new Error(`quest.library: no relic '${relicId}' in relicLibrary`);
    return { kind: 'item', item: cloneRelic(relic) };
}

function laneRelicQuest(
    name: QuestName,
    description: string,
    mapName: MapName,
    objective: Omit<QuestObjective, 'currentCount'>,
    relicId: string,
): Quest {
    return {
        name, description, mapName,
        objectives: [{ ...objective, currentCount: 0 }],
        reward: relicReward(relicId),
        status: 'available',
    };
}

/** The Breakwater's quest: put out the watchtower's lamp. Pays the Ruby Signet. */
export const WATCHTOWER_LAMP_QUEST: Quest = laneRelicQuest(
    'The Watchtower Lamp',
    'A smuggler in the sea cave wants the thing at the watchtower dead.',
    'breakwater',
    { id: 'kill-door', type: 'kill', description: 'Kill the Death Beholder at the watchtower.', target: 'The Death Beholder', requiredCount: 1 },
    'relic-ruby-signet',
);

/** Every authored quest, in Act 1 order. */
export const QUEST_LIBRARY: readonly Quest[] = [WATCHTOWER_LAMP_QUEST];

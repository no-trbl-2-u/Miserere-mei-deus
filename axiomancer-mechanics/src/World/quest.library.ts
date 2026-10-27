/**
 * The quest library: the quests Act 1 hands out (phase LR1f).
 *
 * `QuestName` names a quest-LOG quest — the objective-tracking quests
 * consumed by `quest.engine.ts`, dialogue gating
 * (`DialogueChoice.requires.quest`) and reach objectives.
 *
 * Act 1 carries four quests, one per region and one per quest relic. Each is
 * on its map's `quests`, is started by a choice in its giver's narration
 * (`MapEvents/content.ts`), is finished by an objective the engine counts
 * (`kill`, `reach`, `collect`) and pays its relic through the one reward door
 * (`payCompletedQuests`):
 *
 *   The Watchtower Lamp      breakwater     giver bw-12  kill The Death Beholder   Ruby Signet
 *   Moonbells for the Tower  charcoal-wood  giver cw-2   collect Moonbell Petals   Bleeding Signet
 *   Word to the Mountain Inn beacon-crags   giver bc-3   reach bc-14               Elementalist's Brooch
 *   Iron for the Lanterns    lantern-deep   giver ld-4   collect Iron Ore          Elementalist's Belt
 *
 * No quest pays an elite-only relic: those drop only from elites.
 * Names, descriptions and objective lines are plain placeholders,
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

/** The Charcoal Wood's quest: moonbells from the great tree. Pays the Bleeding Signet. */
export const MOONBELLS_QUEST: Quest = laneRelicQuest(
    'Moonbells for the Tower',
    'The woman at the ruined tower wants moonbells from the great tree.',
    'charcoal-wood',
    { id: 'collect-moonbells', type: 'collect', description: 'Gather Moonbell Petals at the great tree.', target: 'moonbell-petals', requiredCount: 1 },
    'relic-bleeding-signet',
);

/** The Beacon Crags' quest: carry word to the mountain inn. Pays the Elementalist's Brooch. */
export const MOUNTAIN_INN_QUEST: Quest = laneRelicQuest(
    'Word to the Mountain Inn',
    'A shepherd at the hanging lake asks you to carry word to the mountain inn.',
    'beacon-crags',
    { id: 'reach-inn', type: 'reach', description: 'Reach the mountain inn.', target: 'bc-14', requiredCount: 1 },
    'relic-elementalist-brooch',
);

/** The Lantern Deep's quest: iron for the lamplighter. Pays the Elementalist's Belt. */
export const LANTERN_IRON_QUEST: Quest = laneRelicQuest(
    'Iron for the Lanterns',
    'The lamplighter on the north aqueduct needs iron from the crystal grotto.',
    'lantern-deep',
    { id: 'collect-iron', type: 'collect', description: 'Gather Iron Ore in the crystal grotto.', target: 'iron-ore', requiredCount: 1 },
    'relic-elementalist-belt',
);

/** Every authored quest, in Act 1 order. */
export const QUEST_LIBRARY: readonly Quest[] = [
    WATCHTOWER_LAMP_QUEST, MOONBELLS_QUEST, MOUNTAIN_INN_QUEST, LANTERN_IRON_QUEST,
];

/**
 * Chapter 1's quest chain on the rebuilt Breakwater (phase BW1a; A2 of the
 * BW1 brief): one questline, four steps, on MQ1's rules.
 *
 *   1  given by the windmill's arrival cutscene (`bw-w1`): find the
 *      fishermen; met on reaching their camp (`bw-c2`), turned in there
 *   2  taken at the camp: reach the lighthouse (`bw-l5`); paid on arrival
 *      (`settle: 'on-arrival'`), the keep key among its rewards
 *   3  taken at the lighthouse: `carry` the key to the keep gate (`bw-k1`),
 *      turned in there (the key is used up); opens the keep gate
 *   4  taken at the keep gate: beat the chapter boss at the sea keep
 *      (`bw-k2`); turned in at the river bridge (`bw-b1`); opens the bridge
 *
 * Every step pays XP and one relic (T: "every completed quest will offer a
 * new relic"). The relics are placeholders from the relic library until T
 * names them (BW1d, BW1e); step 4 pays the Crimson Circlet, a relic the elite
 * drop also draws, because no relic is elite-only any more (A12). Every line
 * is `[content]`.
 *
 * Registered only by `registerBreakwaterChapter()` (tests only until BW1b).
 */

import type { Questline } from './questline';
import type { Quest, QuestObjective, Reward } from './types';
import type { QuestItem } from '../Items/types';
import { getRelicById } from '../Items/relic.library';
import { BREAKWATER_CHAPTER_GATES } from './Continents/Coastal-Village/breakwater-chapter';

/** The chain's questline id: its quest nodes and the windmill's cutscene name it. */
export const BREAKWATER_CHAPTER_QUESTLINE_ID = 'breakwater-chapter-1';

/** The four steps' quest names (the quest log's keys). */
export const BREAKWATER_CHAPTER_STEPS = {
    fishermen:  '[content] Chapter 1: the capsized boat',
    lighthouse: '[content] Chapter 1: the lighthouse',
    keep:       '[content] Chapter 1: the keep key',
    boss:       '[content] Chapter 1: the sea keep',
} as const;

/** The keep key: step 2 pays it, step 3 carries it to the keep gate. */
export const BREAKWATER_KEEP_KEY: QuestItem = {
    id: 'bw-keep-key',
    name: '[content] Keep key',
    description: '[content] An iron key from the lighthouse. It opens the keep gate.',
    category: 'quest-item',
    questId: BREAKWATER_CHAPTER_STEPS.keep,
};

/** The relic each step pays: placeholders until T names them (BW1d). */
export const BREAKWATER_CHAPTER_RELICS = {
    1: 'relic-ruby-signet',
    2: 'relic-elementalist-brooch',
    3: 'relic-mirror-brooch',
    4: 'relic-crimson-circlet',
} as const;

const STEP_XP = 40;

function relicReward(step: keyof typeof BREAKWATER_CHAPTER_RELICS): Reward {
    const id = BREAKWATER_CHAPTER_RELICS[step];
    const relic = getRelicById(id);
    if (!relic) throw new Error(`breakwater-chapter: no relic '${id}'.`);
    return { kind: 'item', item: relic };
}

function quest(name: string, description: string, objective: Omit<QuestObjective, 'requiredCount' | 'currentCount'>): Quest {
    return {
        name,
        description,
        mapName: 'breakwater',
        objectives: [{ ...objective, requiredCount: 1, currentCount: 0 }],
        reward: 'quest',
        status: 'available',
    };
}

/** The chain: the four steps of the file header. */
export const BREAKWATER_CHAPTER_QUESTLINE: Questline = {
    id: BREAKWATER_CHAPTER_QUESTLINE_ID,
    name: '[content] Chapter 1',
    mapName: 'breakwater',
    steps: [
        {
            step: 1,
            nodeId: 'bw-w1',
            quest: quest(BREAKWATER_CHAPTER_STEPS.fishermen, '[content] Find the fishermen whose boat capsized.', {
                id: 'camp', type: 'reach', target: 'bw-c2', description: '[content] Find the fishermen.',
            }),
            rewards: [{ kind: 'experience', amount: STEP_XP }, relicReward(1)],
            settle: 'turn-in',
        },
        {
            step: 2,
            nodeId: 'bw-c2',
            quest: quest(BREAKWATER_CHAPTER_STEPS.lighthouse, '[content] Climb to the lighthouse.', {
                id: 'lighthouse', type: 'reach', target: 'bw-l5', description: '[content] Reach the lighthouse.',
            }),
            rewards: [{ kind: 'experience', amount: STEP_XP }, BREAKWATER_KEEP_KEY, relicReward(2)],
            settle: 'on-arrival',
        },
        {
            step: 3,
            nodeId: 'bw-l5',
            quest: quest(BREAKWATER_CHAPTER_STEPS.keep, '[content] Bring the key to the keep gate.', {
                id: 'key', type: 'carry', target: BREAKWATER_KEEP_KEY.id, description: '[content] Bring the keep key.',
            }),
            rewards: [{ kind: 'experience', amount: STEP_XP }, relicReward(3)],
            settle: 'turn-in',
            gatesPast: [BREAKWATER_CHAPTER_GATES.pastKeep],
        },
        {
            step: 4,
            nodeId: 'bw-k1',
            quest: quest(BREAKWATER_CHAPTER_STEPS.boss, '[content] Beat what holds the sea keep, then cross the bridge.', {
                id: 'boss', type: 'kill', foeClass: 'boss', description: '[content] Beat the sea keep\'s master.',
            }),
            rewards: [{ kind: 'experience', amount: STEP_XP }, relicReward(4)],
            settle: 'turn-in',
            turnInAt: 'bw-b1',
            gatesPast: [BREAKWATER_CHAPTER_GATES.pastBridge],
        },
    ],
};

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
 * Every step pays XP and one reward, and the rewards alternate (T, 2026-11-01:
 * "one quest is a relic, another is a weapon, etc."): steps 1 and 3 pay a
 * relic, step 2 pays a weapon and step 4 an armor of the lane of the relic the
 * step before paid. The relics are placeholders from the relic library until
 * T names them (BW1d, BW1e). Every line is `[content]`.
 *
 * Registered on load by `quest.library.ts` (`AUTHORED_QUESTLINES`).
 */

import type { Questline } from './questline';
import type { Quest, QuestObjective, Reward } from './types';
import type { QuestItem } from '../Items/types';
import { getRelicById } from '../Items/relic.library';
import { equipmentLibrary, EQUIPMENT_LANE } from '../Items/equipment.library';
import type { EquipmentSlot } from '../Items/types';
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

/** The relic steps 1 and 3 pay: placeholders until T names them (BW1d). */
export const BREAKWATER_CHAPTER_RELICS = {
    1: 'relic-ruby-signet',
    3: 'relic-mirror-brooch',
} as const;

/**
 * The lane piece a step pays: the weapon or armor of the lane of the relic the
 * step before paid (`EQUIPMENT_LANE`).
 */
function lanePieceId(relicStep: keyof typeof BREAKWATER_CHAPTER_RELICS, slot: EquipmentSlot): string {
    const relic = getRelicById(BREAKWATER_CHAPTER_RELICS[relicStep]);
    const piece = equipmentLibrary.find(p => p.slot === slot && EQUIPMENT_LANE[p.id] === relic?.laneId);
    if (!piece) throw new Error(`breakwater-chapter: no ${slot} for the lane of '${BREAKWATER_CHAPTER_RELICS[relicStep]}'.`);
    return piece.id;
}

/**
 * The pieces steps 2 (a weapon) and 4 (an armor) pay: the lane of the relic
 * before each (Blood Price after the Ruby Signet, Defender after the Mirror
 * Brooch).
 */
export const BREAKWATER_CHAPTER_PIECES = {
    2: lanePieceId(1, 'weapon'),
    4: lanePieceId(3, 'armor'),
} as const;

const STEP_XP = 40;

function relicReward(step: keyof typeof BREAKWATER_CHAPTER_RELICS): Reward {
    const id = BREAKWATER_CHAPTER_RELICS[step];
    const relic = getRelicById(id);
    if (!relic) throw new Error(`breakwater-chapter: no relic '${id}'.`);
    return { kind: 'item', item: relic };
}

function pieceReward(step: keyof typeof BREAKWATER_CHAPTER_PIECES): Reward {
    const id = BREAKWATER_CHAPTER_PIECES[step];
    const piece = equipmentLibrary.find(p => p.id === id);
    if (!piece) throw new Error(`breakwater-chapter: no piece '${id}'.`);
    return { kind: 'item', item: piece };
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
            rewards: [{ kind: 'experience', amount: STEP_XP }, BREAKWATER_KEEP_KEY, pieceReward(2)],
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
            rewards: [{ kind: 'experience', amount: STEP_XP }, pieceReward(4)],
            settle: 'turn-in',
            turnInAt: 'bw-b1',
            gatesPast: [BREAKWATER_CHAPTER_GATES.pastBridge],
        },
    ],
};

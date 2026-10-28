/**
 * QuestName names a quest-LOG quest — the objective-tracking quests consumed
 * by `quest.engine.ts`, dialogue gating (`DialogueChoice.requires.quest`) and
 * reach objectives.
 *
 * The authored questlines live here too. This file side-effects on import:
 * it registers every authored questline (`registerQuestline`), and
 * `src/World/index.ts` imports it for that effect beside the map-event pools,
 * so a quest node of an authored line reads its steps. An unregistered line
 * reads node 1 as `offer` and every later node as `locked`.
 */

import type { Questline } from './questline';
import { registerQuestline } from './questline';
import { getConsumableById } from '../Items/consumable.library';
import { getRelicById } from '../Items/relic.library';

export type QuestName = string;

/** The Breakwater questline's id: its quest nodes' payloads name it. */
export const BREAKWATER_QUESTLINE_ID = 'breakwater-questline';

function mustConsumable(id: string) {
    const item = getConsumableById(id);
    if (!item) throw new Error(`quest.library: no consumable '${id}'.`);
    return item;
}

function mustRelic(id: string) {
    const relic = getRelicById(id);
    if (!relic) throw new Error(`quest.library: no relic '${id}'.`);
    return relic;
}

/**
 * The Breakwater's questline (Chapter 1): four steps on four quest nodes,
 * bw-19..bw-22. Steps 1-3 are turned in at the next quest node; step 4 is
 * beating the watchtower boss and pays on that victory, the Elementalist's
 * Belt included. Each step's foes and hazards sit in a pocket behind its own
 * marker (`breakwater.ts`), and each step's `opensOnReady` opens the roads
 * into the next marker when its last objective fills.
 *
 * Every line, count, XP figure and extra is a `[content]` placeholder until
 * T's sitting (QL1e); only the boss requirement and the Belt are fixed.
 */
export const BREAKWATER_QUESTLINE: Questline = {
    id: BREAKWATER_QUESTLINE_ID,
    name: '[content] The Breakwater Line',
    mapName: 'breakwater',
    steps: [
        {
            step: 1,
            nodeId: 'bw-19',
            quest: {
                name: '[content] Breakwater step one',
                description: '[content] Cross a hazard behind this marker.',
                mapName: 'breakwater',
                objectives: [{
                    id: 'hazards', type: 'hazard',
                    description: '[content] Cross a hazard.', requiredCount: 1, currentCount: 0,
                }],
                reward: 'quest',
                status: 'available',
            },
            rewards: [{ kind: 'experience', amount: 40 }, { kind: 'currency', amount: 10 }],
            settle: 'turn-in',
            opensOnReady: [{ from: 'bw-9', to: 'bw-20' }],
        },
        {
            step: 2,
            nodeId: 'bw-20',
            quest: {
                name: '[content] Breakwater step two',
                description: '[content] Win fights behind this marker.',
                mapName: 'breakwater',
                objectives: [{
                    id: 'fights', type: 'kill', foeClass: 'any',
                    description: '[content] Win fights.', requiredCount: 2, currentCount: 0,
                }],
                reward: 'quest',
                status: 'available',
            },
            rewards: [
                { kind: 'experience', amount: 40 },
                { kind: 'item', item: mustConsumable('minor-healing-potion') },
            ],
            settle: 'turn-in',
            opensOnReady: [{ from: 'bw-7', to: 'bw-21' }],
        },
        {
            step: 3,
            nodeId: 'bw-21',
            quest: {
                name: '[content] Breakwater step three',
                description: '[content] Beat the elite behind this marker.',
                mapName: 'breakwater',
                objectives: [{
                    id: 'elites', type: 'kill', foeClass: 'elite',
                    description: '[content] Beat an elite.', requiredCount: 1, currentCount: 0,
                }],
                reward: 'quest',
                status: 'available',
            },
            rewards: [{ kind: 'experience', amount: 40 }, { kind: 'card-pick', count: 3 }],
            settle: 'turn-in',
            opensOnReady: [{ from: 'bw-15', to: 'bw-22' }, { from: 'bw-16', to: 'bw-22' }],
        },
        {
            step: 4,
            nodeId: 'bw-22',
            quest: {
                name: '[content] Breakwater step four',
                description: '[content] Beat the watchtower boss.',
                mapName: 'breakwater',
                objectives: [{
                    id: 'boss', type: 'kill', foeClass: 'boss',
                    description: '[content] Beat the watchtower boss.', requiredCount: 1, currentCount: 0,
                }],
                reward: 'quest',
                status: 'available',
            },
            rewards: [
                { kind: 'experience', amount: 40 },
                { kind: 'currency', amount: 15 },
                { kind: 'item', item: mustRelic('relic-elementalist-belt') },
            ],
            settle: 'on-victory',
        },
    ],
};

/** Every authored questline, in registration order. */
export const AUTHORED_QUESTLINES: readonly Questline[] = [BREAKWATER_QUESTLINE];

for (const questline of AUTHORED_QUESTLINES) registerQuestline(questline);

/**
 * Hermetic test helper - a staged four-step questline on the Breakwater's
 * first nodes (phase QL1c). The Breakwater's own chain lives on bw-w1,
 * bw-c2, bw-l5, bw-k1 and bw-b1 (`breakwater-chapter.questline.ts`); the quest screen and its payout are
 * proven hermetically on this one, the way fixtures stage an NPC.
 *
 *   step 1  cross 1 hazard           pays XP + shillings        (node 1, bw-w2)
 *   step 2  win 2 fights             pays XP + a card pick      (node 2, bw-w3)
 *   step 3  beat 1 elite             pays XP + a potion         (node 3, bw-w4)
 *   step 4  beat the boss            pays XP + shillings + Belt (node 4, bw-w5)
 *
 * Steps 1-3 settle by turn-in; step 4 settles on the boss victory.
 */

import { getConsumableById, getRelicById, progressQuest, registerQuestline, startQuest } from '@mechanics';
import type { GameState, Quest, QuestObjective, Questline, QuestlineStep, Reward } from '@mechanics';
import { _unregisterQuestline } from '@mechanics/World/questline';

import type { AppStore } from '@/state/store';

export const FIXTURE_LINE = 'ql1c-line';
export const FIXTURE_LINE_NAME = 'The Fixture Line';
export const FIXTURE_NODES = ['bw-w2', 'bw-w3', 'bw-w4', 'bw-w5'] as const;

export const XP: Reward = { kind: 'experience', amount: 40 };
export const SHILLINGS_10: Reward = { kind: 'currency', amount: 10 };
export const SHILLINGS_15: Reward = { kind: 'currency', amount: 15 };
export const CARD_PICK: Reward = { kind: 'card-pick', count: 3 };

function objective(o: Partial<QuestObjective>): QuestObjective {
    return { id: 'goal', type: 'kill', description: 'fixture goal', requiredCount: 1, currentCount: 0, ...o };
}

function questOf(step: number, name: string, description: string, objectives: QuestObjective[]): Quest {
    return { name, description, mapName: 'breakwater', objectives, reward: 'quest', status: 'available' };
}

function step(
    n: number,
    quest: Quest,
    rewards: Reward[],
    extra: Partial<QuestlineStep> = {},
): QuestlineStep {
    return { step: n, nodeId: FIXTURE_NODES[n - 1]!, quest, rewards, settle: 'turn-in', ...extra };
}

export function fixtureQuestline(): Questline {
    const potion = getConsumableById('minor-healing-potion')!;
    const belt = getRelicById('relic-elementalist-belt')!;
    return {
        id: FIXTURE_LINE,
        name: FIXTURE_LINE_NAME,
        mapName: 'breakwater',
        steps: [
            step(1, questOf(1, 'Cross the Gallows', 'Step 1.', [objective({ type: 'hazard', description: 'Cross a hazard' })]), [XP, SHILLINGS_10]),
            step(2, questOf(2, 'Thin the Quay', 'Step 2.', [objective({ foeClass: 'any', requiredCount: 2, description: 'Win fights' })]), [XP, CARD_PICK]),
            step(3, questOf(3, 'Break the Elite', 'Step 3.', [objective({ foeClass: 'elite', description: 'Beat an elite' })]), [XP, { kind: 'item', item: potion }]),
            step(4, questOf(4, 'Fell the Warden', 'Step 4.', [objective({ foeClass: 'boss', description: 'Beat the boss' })]), [XP, SHILLINGS_15, { kind: 'item', item: belt }], { settle: 'on-victory' }),
        ],
    };
}

/** Registers the fixture questline; pair with `unregisterFixtureQuestline` in `afterAll`. */
export function registerFixtureQuestline(): Questline {
    const line = fixtureQuestline();
    registerQuestline(line);
    return line;
}

export function unregisterFixtureQuestline(): void {
    _unregisterQuestline(FIXTURE_LINE);
}

/** Puts `step` of the fixture questline in the log as active, every count 0. */
export function startFixtureStep(state: GameState, stepNumber: number): GameState['quests'] {
    const line = fixtureQuestline();
    const target = line.steps[stepNumber - 1]!;
    const quest: Quest = {
        ...target.quest,
        mapName: line.mapName,
        questline: line.id,
        step: target.step,
        reward: target.rewards[0]!,
        rewards: target.rewards.slice(1),
        holdForTurnIn: target.settle === 'turn-in',
        status: 'available',
    };
    return startQuest(state.quests, quest);
}

/** Fills step `stepNumber`'s objective in the store's log (the step becomes ready). */
export function fillFixtureStep(store: AppStore, stepNumber: number): void {
    const state = store.getState() as unknown as GameState;
    const target = fixtureQuestline().steps[stepNumber - 1]!;
    let log = state.quests;
    for (let i = 0; i < target.quest.objectives[0]!.requiredCount; i += 1) {
        log = progressQuest(log, target.quest.name, 'goal').log;
    }
    store.setState({ quests: log } as never);
}

/** Starts step `stepNumber` in the store's log. */
export function acceptFixtureStep(store: AppStore, stepNumber: number): void {
    const state = store.getState() as unknown as GameState;
    store.setState({ quests: startFixtureStep(state, stepNumber) } as never);
}

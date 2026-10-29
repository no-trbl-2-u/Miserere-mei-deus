/**
 * Quest screen presenter (phase QL1c). Maps the engine's resolved quest node
 * (`resolveQuestNodeEvent` over the live quest log) onto a render-ready
 * view-model. Pure: no store writes, no rolls, no rule decisions. The stage,
 * the step views and their progress are the engine's; this module only words
 * them. The map shows none of this (T: progress shows on the quest screen
 * only).
 */

import { getCardById, getQuestline, questNodeStage, questStepState, questlineStep, resolveQuestNodeEvent } from '@mechanics';
import type { Quest, QuestNodeStage, Reward } from '@mechanics';
import type { AppStoreState, MobileQuestPaid } from '@/state/store';
import { objectiveText, rewardItemName } from './quest-tracker.engine';
import {
    QUEST_GIVER_FALLBACK,
    questCardLine,
    questCardPickLine,
    questProgressLine,
    questShillingsLine,
    questStepEyebrow,
    questXpLine,
} from './quest.copy';

export interface QuestObjectiveVM {
    id: string;
    description: string;
    /** "1 of 2". */
    progress: string;
    done: boolean;
}

export interface QuestStepVM {
    step: number;
    name: string;
    objectives: readonly QuestObjectiveVM[];
    /** One line per reward, in the order the engine pays them. */
    rewards: readonly string[];
    /** Where the step stands in the log. */
    status: 'unaccepted' | 'active' | 'ready' | 'completed';
}

export interface QuestVM {
    active: boolean;
    stage: QuestNodeStage;
    /** "STEP 2 OF 4". */
    eyebrow: string;
    /** The giver's line (the node's authored line, else a placeholder). */
    giverLine: string;
    /** The step this node turns in (node 2-4). */
    behind: QuestStepVM | null;
    /** The step this node offers. */
    ahead: QuestStepVM | null;
    canAccept: boolean;
    canTurnIn: boolean;
    /** The last turn-in's ledger, kept on screen above the next offer. */
    paid: MobileQuestPaid | null;
    /** The card ids a `card-pick` reward rolled, waiting on the spoils tiles. */
    cardOffers: readonly string[];
}

const EMPTY_VM: QuestVM = Object.freeze({
    active: false,
    stage: 'locked',
    eyebrow: '',
    giverLine: '',
    behind: null,
    ahead: null,
    canAccept: false,
    canTurnIn: false,
    paid: null,
    cardOffers: Object.freeze([]),
});

/** True while the quest screen has a node open or a card pick to settle. */
export function selectHasActiveQuest(state: Pick<AppStoreState, 'quest'>): boolean {
    const slice = state.quest;
    return slice != null && (slice.open != null || slice.cardOffers.length > 0);
}

/** One reward as a line of words. */
export function questRewardLine(reward: Reward): string | null {
    if (typeof reward === 'string') return null;
    if ('kind' in reward) {
        switch (reward.kind) {
            case 'experience': return questXpLine(reward.amount);
            case 'currency': return questShillingsLine(reward.amount);
            case 'card': return questCardLine(getCardById(reward.cardId)?.name ?? reward.cardId);
            case 'card-pick': return questCardPickLine(reward.count);
            case 'item': return reward.item.name;
            default: return null;
        }
    }
    return reward.name;
}

function rewardLines(quest: Quest): string[] {
    const lines: string[] = [];
    for (const reward of [quest.reward, ...(quest.rewards ?? [])]) {
        const line = questRewardLine(reward);
        if (line) lines.push(line);
    }
    return lines;
}

function stepVM(
    quest: Quest,
    step: number,
    status: QuestStepVM['status'],
): QuestStepVM {
    return {
        step,
        name: quest.name,
        objectives: quest.objectives.map(o => ({
            id: o.id,
            description: objectiveText(o),
            progress: questProgressLine(o.currentCount, o.requiredCount),
            done: o.currentCount >= o.requiredCount,
        })),
        rewards: rewardLines(quest),
        status,
    };
}

export function selectQuestVM(state: Pick<AppStoreState, 'quest' | 'quests'>): QuestVM {
    const open = state.quest?.open ?? null;
    const cardOffers = state.quest?.cardOffers ?? [];
    if (!open || !state.quests) return cardOffers.length > 0 ? { ...EMPTY_VM, cardOffers } : EMPTY_VM;

    const questline = getQuestline(open.questline);
    const event = resolveQuestNodeEvent(state.quests, {
        kind: 'quest',
        questline: open.questline,
        node: open.node,
        description: open.description,
    });
    const stage = questNodeStage(state.quests, open.questline, open.node);
    const stepStatus = (n: number): QuestStepVM['status'] => {
        const s = questline ? questlineStep(questline, n) : undefined;
        return s ? questStepState(state.quests, s) : 'unaccepted';
    };
    const behind = event.behind && event.behind.step !== undefined
        ? stepVM(event.behind, event.behind.step, stepStatus(event.behind.step))
        : null;
    const ahead = event.ahead && event.ahead.step !== undefined
        ? stepVM(event.ahead, event.ahead.step, stepStatus(event.ahead.step))
        : null;
    const total = questline?.steps.length ?? open.node;
    // A step paid on ARRIVAL has no turn-in to leave a ledger: the node that
    // offers the next step shows what the arrival paid, from the step's own
    // rewards (the settle seam paid exactly these).
    const arrivalStep = questline ? questlineStep(questline, open.node - 1) : undefined;
    const arrivalPaid: MobileQuestPaid | null =
        stage === 'offer' && arrivalStep?.settle === 'on-arrival' && questStepState(state.quests, arrivalStep) === 'completed'
            ? {
                step: arrivalStep.step,
                questName: arrivalStep.quest.name,
                experience: arrivalStep.rewards.reduce((n, r) => n + (typeof r !== 'string' && 'kind' in r && r.kind === 'experience' ? r.amount : 0), 0),
                currency: arrivalStep.rewards.reduce((n, r) => n + (typeof r !== 'string' && 'kind' in r && r.kind === 'currency' ? r.amount : 0), 0),
                itemNames: arrivalStep.rewards.flatMap(r => {
                    const name = rewardItemName(r);
                    return name === null ? [] : [name];
                }),
            }
            : null;
    return {
        active: true,
        stage,
        eyebrow: questStepEyebrow(open.node, total),
        giverLine: open.description ?? QUEST_GIVER_FALLBACK,
        behind,
        ahead,
        canAccept: stage === 'offer' && ahead?.status === 'unaccepted',
        canTurnIn: stage === 'turn-in',
        paid: state.quest?.paid ?? arrivalPaid,
        cardOffers,
    };
}

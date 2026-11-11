/**
 * Quest screen presenter (phase QL1c). Maps the engine's resolved quest node
 * (`resolveQuestNodeEvent` over the live quest log) onto a render-ready
 * view-model. Pure: no store writes, no rolls, no rule decisions. The stage,
 * the step views and their progress are the engine's; this module only words
 * them. The map shows none of this (T: progress shows on the quest screen
 * only).
 */

import { getCardById, getQuestline, questNodeStage, questStepState, questlineStep, resolveQuestNodeEvent } from '@mechanics';
import type { Item, Quest, QuestNodeStage, QuestlineStep, Reward } from '@mechanics';
import type { AppStoreState, MobileQuestPaid } from '@/state/store';
import { slotSubLabel } from './inventory.engine';
import { objectiveText, rewardItem, rewardItemName } from './quest-tracker.engine';
import {
    QUEST_GIVER_FALLBACK,
    QUEST_LOCKED_LINE,
    questCardLine,
    questCardPickLine,
    questCounterText,
    questShillingsLine,
    questStepEyebrow,
    questXpLine,
} from './quest.copy';

export interface QuestObjectiveVM {
    id: string;
    description: string;
    /** "1/2"; '' for a single-step objective (it has no counter). */
    progress: string;
    done: boolean;
}

export interface QuestStepVM {
    step: number;
    name: string;
    objectives: readonly QuestObjectiveVM[];
    /** Where the step stands in the log. */
    status: 'unaccepted' | 'active' | 'ready' | 'completed';
}

/** One item a step pays, with what `ItemGlyph` needs to draw its icon. */
export interface QuestPayItemVM {
    id: string;
    name: string;
    category: Item['category'];
    /** The slot label of a piece of equipment ('Weapon', 'Armor', 'Relic'), else null. */
    sub: string | null;
}

/** What a step pays: XP, shillings and each item, as the step's own `rewards` list them. */
export interface QuestPayVM {
    experience: number;
    currency: number;
    items: readonly QuestPayItemVM[];
}

/** One bead of the chain: a step of the questline. */
export interface QuestBeadVM {
    step: number;
    /** `current` is the step the card shows; the rest are done or ahead. */
    state: 'done' | 'current' | 'ahead';
    /** True when the step is turned in (the current bead too, at the chain's end). */
    done: boolean;
}

export interface QuestGiverVM {
    name: string;
    /** A portrait slug the screen resolves to art. */
    portrait: string;
}

export interface QuestVM {
    active: boolean;
    /** Who speaks the node's lines; null when the node names no giver. */
    giver: QuestGiverVM | null;
    /** The refusal line while the stage is `locked`: the node's own, else the shared one. */
    lockedLine: string;
    stage: QuestNodeStage;
    /** "STEP 2 OF 4". */
    eyebrow: string;
    /** The step the card shows: the one worked or turned in, else the one offered; null for no step. */
    card: QuestStepVM | null;
    /** The pay of the step the card shows; null when the card shows no step. */
    pay: QuestPayVM | null;
    /** One bead per step of the questline, the card's step marked current. */
    beads: readonly QuestBeadVM[];
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
    giver: null,
    lockedLine: QUEST_LOCKED_LINE,
    eyebrow: '',
    card: null,
    pay: null,
    beads: Object.freeze([]),
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

/** The pay of a questline step, read off its `rewards`. */
export function questStepPay(step: QuestlineStep): QuestPayVM {
    const items: QuestPayItemVM[] = [];
    let experience = 0;
    let currency = 0;
    for (const r of step.rewards) {
        if (typeof r !== 'string' && 'kind' in r && r.kind === 'experience') experience += r.amount;
        else if (typeof r !== 'string' && 'kind' in r && r.kind === 'currency') currency += r.amount;
        if (rewardItem(r) === null) continue;
        const full = (typeof r !== 'string' && 'kind' in r ? (r.kind === 'item' ? r.item : null) : r) as Item | null;
        if (full === null) continue;
        items.push({
            id: full.id,
            name: full.name,
            category: full.category,
            sub: full.category === 'equipment' ? slotSubLabel(full.slot) : null,
        });
    }
    return { experience, currency, items };
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
            progress: questCounterText(o.currentCount, o.requiredCount),
            done: o.currentCount >= o.requiredCount,
        })),
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
    // The card shows the step being worked or turned in (waiting, turn-in); on
    // an offer or a refusal it shows the step the node offers, and at the
    // chain's end (a turn-in with nothing after it) it stays on the last step.
    const card = stage === 'waiting' || stage === 'turn-in' ? (behind ?? ahead) : (ahead ?? behind);
    const cardStep = card && questline ? questlineStep(questline, card.step) : undefined;
    const beads: QuestBeadVM[] = (questline?.steps ?? []).map(s => {
        const done = questStepState(state.quests, s) === 'completed';
        return { step: s.step, state: card?.step === s.step ? 'current' : done ? 'done' : 'ahead', done };
    });
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
                itemIds: arrivalStep.rewards.flatMap(r => {
                    const item = rewardItem(r);
                    return item === null || item === undefined ? [] : [item.id];
                }),
            }
            : null;
    return {
        active: true,
        giver: open.giver ? { name: open.giver.name, portrait: open.giver.portrait } : null,
        lockedLine: open.lockedLine ?? QUEST_LOCKED_LINE,
        stage,
        eyebrow: questStepEyebrow(open.node, total),
        card,
        pay: cardStep ? questStepPay(cardStep) : null,
        beads,
        giverLine: open.description ?? QUEST_GIVER_FALLBACK,
        behind,
        ahead,
        canAccept: stage === 'offer' && ahead?.status === 'unaccepted',
        canTurnIn: stage === 'turn-in',
        paid: state.quest?.paid ?? arrivalPaid,
        cardOffers,
    };
}

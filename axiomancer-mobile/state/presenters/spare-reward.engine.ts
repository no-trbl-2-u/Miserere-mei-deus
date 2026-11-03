/**
 * The spared end screen's lines: the one table roll, named, and the journal
 * entry it opened. The roll itself is engine truth (`rollSpareReward`).
 */

import { getCard, type SpareReward } from '@mechanics';

import {
    spareCardValue, spareJournalLabel, spareRewardLabel, spareShillingsValue,
} from '@/state/presenters/mercy-check.copy';

/** One line on the end screen. */
export interface SpareSummaryLine {
    readonly key: string;
    readonly label: string;
    readonly value: string;
}

function cardName(cardId: string): string {
    return getCard(cardId)?.name ?? cardId;
}

/** What a rolled result reads as. */
export function spareRewardValue(reward: SpareReward): string {
    switch (reward.kind) {
        case 'shillings':
            return spareShillingsValue(reward.amount);
        case 'consumable':
        case 'gear':
        case 'relic':
            return reward.item.name;
        case 'upgrade':
        case 'transform':
            return spareCardValue(cardName(reward.fromCardId), cardName(reward.toCardId));
    }
}

/** The lines a spared fight adds to its end screen. */
export function spareSummaryLines(reward: SpareReward, journalTitle?: string): readonly SpareSummaryLine[] {
    const lines: SpareSummaryLine[] = [{ key: 'reward', label: spareRewardLabel, value: spareRewardValue(reward) }];
    if (journalTitle) lines.push({ key: 'journal', label: spareJournalLabel, value: journalTitle });
    return lines;
}

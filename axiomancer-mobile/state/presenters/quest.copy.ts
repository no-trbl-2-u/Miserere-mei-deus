/**
 * The quest screen's words (phase QL1c). [content] plain placeholder lines for
 * T to rewrite on the quest-line sitting; the giver's own lines live on the
 * node's payload (`MapEvents/content.ts`), not here.
 */

export const QUEST_EYEBROW = 'A QUEST';
export const QUEST_TITLE = 'The giver waits';

/** The giver's line when the node's payload carries none. */
export const QUEST_GIVER_FALLBACK = '[content] Someone here has work for the willing.';

/** "STEP 2 OF 4". */
export function questStepEyebrow(step: number, total: number): string {
    return `STEP ${step} OF ${total}`;
}

export const QUEST_LOCKED_LINE = '[content] Not yet. Finish the work you were given first.';
export const QUEST_WAITING_HEAD = 'YOUR WORK, SO FAR';
export const QUEST_TURN_IN_HEAD = 'THE WORK IS DONE';
export const QUEST_OFFER_HEAD = 'THE NEXT WORK';
export const QUEST_REWARDS_HEAD = 'THE PAY';
export const QUEST_ACCEPTED_LINE = 'Accepted. The count begins now.';
export const QUEST_DONE_LINE = 'Done and paid.';
export const QUEST_PAID_HEAD = 'PAID';

export const QUEST_ACCEPT_LABEL = 'ACCEPT';
export const QUEST_TURN_IN_LABEL = 'TURN IN';
export const QUEST_LEAVE_LABEL = 'LEAVE';

/** "1 of 2". */
export function questProgressLine(current: number, required: number): string {
    return `${Math.min(current, required)} of ${required}`;
}

export const QUEST_PAID_NOTHING = 'Nothing more is owed.';

export function questXpLine(amount: number): string {
    return `+${amount} XP`;
}

export function questShillingsLine(amount: number): string {
    return `+${amount} shillings`;
}

export function questCardPickLine(count: number): string {
    return count === 1 ? 'A card of your choosing' : `A pick of ${count} cards`;
}

export function questCardLine(name: string): string {
    return `The card ${name}`;
}

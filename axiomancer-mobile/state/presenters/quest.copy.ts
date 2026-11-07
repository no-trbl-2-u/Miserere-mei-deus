/**
 * The quest screen's words (phase QL1c). [content] plain placeholder lines for
 * T to rewrite on the quest-line sitting; the giver's own lines live on the
 * node's payload (`MapEvents/content.ts`), not here.
 */

export const QUEST_EYEBROW = 'A QUEST';
export const QUEST_TITLE = 'The giver waits';

/** The giver's line when the node's payload carries none. */
export const QUEST_GIVER_FALLBACK = '[content] Someone here has work for the willing.';

/**
 * "STEP 2 OF 4". The node past the last step (where it is turned in, or a
 * side quest's turn-in node) reads the last step, never "STEP 5 OF 4".
 */
export function questStepEyebrow(step: number, total: number): string {
    return `STEP ${Math.min(step, total)} OF ${total}`;
}

export const QUEST_LOCKED_LINE = '[content] Not yet. Finish the work you were given first.';
export const QUEST_WAITING_HEAD = 'YOUR WORK, SO FAR';
export const QUEST_TURN_IN_HEAD = 'THE WORK IS DONE';
export const QUEST_OFFER_HEAD = 'THE NEXT WORK';
export const QUEST_ACCEPTED_LINE = 'Accepted. The count begins now.';
export const QUEST_DONE_LINE = 'Done and paid.';
export const QUEST_PAID_HEAD = 'PAID';

export const QUEST_ACCEPT_LABEL = 'ACCEPT';
export const QUEST_TURN_IN_LABEL = 'TURN IN';
export const QUEST_LEAVE_LABEL = 'LEAVE';

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

/** "2/3": a tracker row's short count. */
export function questProgressShort(current: number, required: number): string {
    return `${Math.min(current, required)}/${required}`;
}

/** A `carry` objective's line. */
export function questBringLine(itemName: string): string {
    return `Bring: ${itemName}`;
}

/** The tracker row of a quest whose objectives are all filled. */
export const TRACKER_READY_LINE = 'Ready to turn in';

/**
 * A tracker row's counter ("2/3"), or '' when the objective has a single step
 * (it could only ever read 0/1 or 1/1). T, 2026-11-07: hide it for
 * single-step quests only. The one place this rule lives; the quest panel
 * (154.6) reuses it.
 */
export function questCounterText(current: number, required: number): string {
    return required <= 1 ? '' : questProgressShort(current, required);
}

/** "+2 more". */
export function trackerMoreLine(n: number): string {
    return `+${n} more`;
}

/** The node confirm panel's line over a shut road. */
export const SHUT_ROAD_HEAD = 'THE ROAD IS SHUT';

/** "Held by: <quest>". */
export function shutRoadQuestLine(questName: string): string {
    return `Held by: ${questName}`;
}

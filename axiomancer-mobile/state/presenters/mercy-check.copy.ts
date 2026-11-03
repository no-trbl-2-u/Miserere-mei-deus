/**
 * Player-facing strings for the mercy check: the prompt as a normal foe falls,
 * and what the spared end screen reveals. The prompt shows no reward and hints
 * at none.
 */

/** The prompt. Nothing here may name or suggest what either choice pays. */
export const MERCY_CHECK_PROMPT = {
    title: 'It lies still.',
    sub: 'It is yours to end.',
    spare: 'Spare',
    finish: 'Finish',
} as const;

/** The end-screen label beside the one table roll a spared foe paid. */
export const spareRewardLabel = 'Mercy pays:';

/** The end-screen label beside the journal entry a spared foe unlocked. */
export const spareJournalLabel = 'Journal:';

/** The shillings result: "+15 shillings". */
export function spareShillingsValue(amount: number): string {
    return `+${amount} shillings`;
}

/** An upgrade or transform result: "Thin Hymn becomes The Long Lent". */
export function spareCardValue(fromName: string, toName: string): string {
    return `${fromName} becomes ${toName}`;
}

/** Player-facing strings for the post-combat summary's purse line. */

export const summaryShillingsLabel = 'Shillings:';

/** The purse line's amount: "+15". */
export function summaryShillingsValue(shillings: number): string {
    return `+${shillings}`;
}

/**
 * Why a fight was lost, one line under "Defeat". Placeholder lines
 * marked `[content]` until T writes the real ones. The cause is read
 * from the final fight state by the engine (`defeatCause`), never stored.
 */
export const DEFEAT_CAUSE_LINES: Record<'vitae' | 'turn-limit', string> = {
    vitae: '[content] VITAE reached 0.',
    'turn-limit': '[content] The turn limit ran out.',
};

/** The line for a defeat's cause; '' when the summary names none (an older save, a test fixture). */
export function defeatCauseLine(cause: 'vitae' | 'turn-limit' | undefined): string {
    return cause ? DEFEAT_CAUSE_LINES[cause] : '';
}

/** CONTINUE on the defeat panel's brass plate. */
export const DEFEAT_CONTINUE_LABEL = 'CONTINUE';

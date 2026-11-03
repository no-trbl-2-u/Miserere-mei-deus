/** Player-facing strings for the post-combat summary's purse line. */

export const summaryShillingsLabel = 'Shillings:';

/** The purse line's amount: "+15". */
export function summaryShillingsValue(shillings: number): string {
    return `+${shillings}`;
}

/**
 * The map node panel's purse line (Phase TQ1). Shown on the node kinds that
 * can charge shillings, so a broke player reads it before the walk.
 */

/** The purse, as the panel prints it. */
export function nodePurseLine(purse: number): string {
    return `PURSE ${purse} SHILLINGS`;
}

/** Added to the purse line at the anvil when the purse cannot pay for any work. */
export function anvilShortLine(cheapestWork: number): string {
    return ` · the smith's cheapest work costs ${cheapestWork} SHILLINGS`;
}

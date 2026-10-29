/**
 * Village screen copy: the counter labels and their placeholder lines. The
 * `[content]` lines are placeholders until T writes the village's words; the
 * labels and the refusal reasons (the engine's, `World/Village`) are not.
 */

/** The paid rest counter. */
export const VILLAGE_REST_LABEL = 'A BED FOR THE NIGHT';
export const VILLAGE_REST_LINE = '[content] A room above the tavern, and the noise of it.';

/** The card shop counter. */
export const VILLAGE_CARD_SHOP_LABEL = 'THE CARD SHOP';
export const VILLAGE_CARD_SHOP_LINE = '[content] Three cards laid out on the counter. The same three, whenever you come.';
export const VILLAGE_CARD_BUY_LABEL = 'BUY';
export const VILLAGE_CARD_SOLD_LABEL = 'SOLD';

/** Card removal, the card shop's second service. */
export const VILLAGE_REMOVE_LABEL = 'REMOVE A CARD';
export const VILLAGE_REMOVE_LINE = 'One card, gone for the run. The price climbs every time.';
export const VILLAGE_REMOVE_PICK_HINT = 'Tap the card to remove it.';
export const VILLAGE_REMOVE_CANCEL_LABEL = 'KEEP THEM ALL';

/** The rest counter's effect line: what the shillings buy. */
export function villageRestEffect(heal: number): string {
    return heal > 0 ? `restores ${heal} VITAE` : 'restores nothing: VITAE is full';
}

/** The removal counter's price line, with the escalation preview. */
export function villageRemovePriceLine(price: number, nextPrice: number): string {
    return `${price} SHILLINGS, THE NEXT ${nextPrice}`;
}

/** The note a used counter leaves on the screen. */
export function villageCounterNote(what: string, spent: number): string {
    return `${what} for ${spent} shillings.`;
}

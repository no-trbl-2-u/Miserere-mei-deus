/**
 * Village screen copy: the counter labels and their placeholder lines. The
 * `[content]` lines are placeholders until T writes the village's words; the
 * labels and the refusal reasons (the engine's, `World/Village`) are not.
 */

/** The hub (V-02b): the settlement's heading, its host, and the way out. */
export const VILLAGE_SETTLEMENT_EYEBROW = 'SETTLEMENT';
export const VILLAGE_HOST_EYEBROW = 'THE HOST';
export const VILLAGE_HOST_LINE = '[content] Roofs and smoke, and shillings welcome. What will it be?';
export const VILLAGE_VOICES_LABEL = 'VOICES OF THE PLACE';
export const VILLAGE_LEAVE_LABEL = 'TAKE THE ROAD';

/** The hub's counter buttons, one per counter the village carries. */
export const VILLAGE_HUB_REST_LABEL = 'REST';
export const VILLAGE_HUB_SHOP_LABEL = 'SHOP';
export const VILLAGE_HUB_SMITH_LABEL = 'BLACKSMITH';

/** Leaving a counter's own screen returns to the hub. */
export const VILLAGE_BACK_LABEL = 'BACK TO THE VILLAGE';
export const VILLAGE_SHOP_LEAVE_LABEL = 'LEAVE THE SHOP';

/** The paid rest counter. */
export const VILLAGE_REST_LABEL = 'A BED FOR THE NIGHT';
export const VILLAGE_REST_LINE = '[content] A room above the tavern, and the noise of it.';
/** The innkeeper's spoken line on the paid rest's own screen. */
export const VILLAGE_INNKEEPER_EYEBROW = 'THE INNKEEPER';
export const VILLAGE_INNKEEPER_LINE = '[content] A bed, a bowl, and a door that bolts. Pay up front.';
export const VILLAGE_REST_BUY_LABEL = 'REST';

/** The shopkeeper on the Shop's own screen. */
export const VILLAGE_SHOP_TITLE = 'THE SHOP';
export const VILLAGE_SHOPKEEPER_EYEBROW = 'THE SHOPKEEPER';
export const VILLAGE_SHOPKEEPER_LINE = '[content] Look all you like. Touching is extra.';

/** The card shop counter. */
export const VILLAGE_CARD_SHOP_LABEL = 'THE CARD SHOP';
export const VILLAGE_CARD_SHOP_LINE = '[content] Five cards laid out on the counter. The same five, whenever you come.';
export const VILLAGE_CARD_BUY_LABEL = 'BUY';
export const VILLAGE_CARD_SOLD_LABEL = 'SOLD';

/** The equipment counter: weapons and armor. */
export const VILLAGE_EQUIPMENT_LABEL = 'WEAPONS AND ARMOR';
export const VILLAGE_EQUIPMENT_LINE = '[content] Gear laid out on the counter, whatever you do not already carry.';

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

/** The purse line every village screen prints: shillings and VITAE. */
export function villagePurseLine(currency: number, health: number, maxHealth: number): string {
    return `${currency} SHILLINGS · VITAE ${health}/${maxHealth}`;
}

/** The note a refused counter leaves: the engine's reason. */
export function villageRefusalNote(refusal: string): string {
    return `Refused: ${refusal}.`;
}

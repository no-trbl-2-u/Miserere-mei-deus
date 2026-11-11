/**
 * The anvil's card-upgrade copy (Phase UP1e). The die verbs' copy predates
 * this file and lives beside them in `blacksmith.engine.ts`; the shared
 * upgrade screen's own copy is `card-upgrade.copy.ts`.
 */

export const BLACKSMITH_CARD_SECTION_LABEL = 'YOUR CARDS';
export const BLACKSMITH_CARD_UPGRADE_LABEL = 'UPGRADE A CARD';
export const BLACKSMITH_CARD_UPGRADE_EFFECT = 'one card a visit, its numbers up';
export const BLACKSMITH_CARD_UPGRADE_BACK = 'NOT THIS ONE';

/** The anvil's price, shown above the shared upgrade screen's list. */
export function blacksmithCardUpgradePriceLine(price: number): string {
    return `The smith works one card a visit, for ${price} shillings.`;
}

/** The result chip and the ledger chip: the card before and after. */
export function blacksmithUpgradedChip(fromName: string, toName: string): string {
    return `UPGRADED: ${fromName} → ${toName}`;
}

/**
 * The smith's line over the buttons. The forge opens straight onto the work
 * screen (168.5), so this line stands where the intro step's speech stood.
 * Placeholder until T writes it.
 */
export const BLACKSMITH_SMITH_LINE = '[content] Set them on the anvil.';

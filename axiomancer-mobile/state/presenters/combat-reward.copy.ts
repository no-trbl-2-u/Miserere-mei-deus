/**
 * The post-combat draft's copy. The tile hint says how the tiles answer a
 * tap (Phase TQ1): the first tap chooses, a second reads the card in full.
 */

export const SPOILS_TILE_HINT = 'Tap to choose; tap again to read it in full';

/**
 * The elite reward's copy on the post-combat draft (Phase UP1f). The upgrade
 * itself reuses the shared card-upgrade screen and its copy
 * (`card-upgrade.copy.ts`); these lines only offer it and lead back.
 */

export const ELITE_UPGRADE_OPEN_LABEL = 'UPGRADE INSTEAD';
export const ELITE_UPGRADE_BACK_LABEL = 'BACK TO THE CARDS';

/** The note under the upgrade button: which owned card chance picked. */
export function eliteUpgradeNote(cardName: string): string {
    return `chance picked ${cardName}`;
}

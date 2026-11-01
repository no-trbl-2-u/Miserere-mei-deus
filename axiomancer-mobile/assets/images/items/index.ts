/**
 * Item sprites: T's own item sheets, cut by blob into one 256 px PNG per item
 * (`scripts/slice-item-sheet.mjs`). Metro needs static
 * require literals, so this map is the one place an item id meets a file;
 * `components/icons/item-sprites.ts` re-exports it. The ten weapons and
 * armors have a sprite ahead of their content.
 */

export const ITEM_SPRITE_FILES = {
    'weapon-opening-blade': require('./weapon-opening-blade.png'),
    'armor-bracing-coat': require('./armor-bracing-coat.png'),
    'weapon-siphoning-blade': require('./weapon-siphoning-blade.png'),
    'armor-bloodward-mail': require('./armor-bloodward-mail.png'),
    'weapon-stormcaller-staff': require('./weapon-stormcaller-staff.png'),
    'armor-flame-guard': require('./armor-flame-guard.png'),
    'weapon-bulwark-mace': require('./weapon-bulwark-mace.png'),
    'armor-scavengers-coat': require('./armor-scavengers-coat.png'),
    'weapon-humbling-rod': require('./weapon-humbling-rod.png'),
    'armor-mending-vestments': require('./armor-mending-vestments.png'),
    'relic-disarming-plea': require('./relic-disarming-plea.png'),
    'relic-crimson-circlet': require('./relic-crimson-circlet.png'),
    'relic-ruby-signet': require('./relic-ruby-signet.png'),
    'relic-bleeding-signet': require('./relic-bleeding-signet.png'),
    'relic-elementalist-signet': require('./relic-elementalist-signet.png'),
    'relic-elementalist-brooch': require('./relic-elementalist-brooch.png'),
    'relic-elementalist-belt': require('./relic-elementalist-belt.png'),
    'relic-thornback-signet': require('./relic-thornback-signet.png'),
    'relic-mirror-brooch': require('./relic-mirror-brooch.png'),
    'relic-carapace-belt': require('./relic-carapace-belt.png'),
    'minor-healing-potion': require('./minor-healing-potion.png'),
    'healing-potion': require('./healing-potion.png'),
    'greater-healing-potion': require('./greater-healing-potion.png'),
} as const;

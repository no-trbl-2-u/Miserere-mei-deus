/**
 * Neutral test fixtures for the plumbing with no authored content.
 *
 * Act 1 stages no NPC, shop or quest, so dialogue, shops and the quest engine
 * have no live carrier. These placeholders are their witnesses: suites and
 * state fixtures (`stagedEvent`) use them, the live world never registers
 * them, and their text is placeholder copy, not story.
 *
 * The fixture relics exist because the live library is the Suppliant's Ring
 * alone, so equip / unequip across every slot and the `maxHp` line are
 * witnessed here. They grant no signature (none can be authored).
 */

import type { NPC } from '../../NPCs/types';
import type { ShopInventory } from '../../Items/shop.types';
import type { Equipment } from '../../Items/types';
import type { MapEventPayload } from '../../World/MapEvents/types';
import type { Quest } from '../../World/types';

/** A quest with one `reach` objective on an Act 1 node. */
export const FIXTURE_QUEST: Quest = {
    name: 'fixture-quest',
    description: 'A placeholder quest.',
    mapName: 'breakwater',
    objectives: [{
        id: 'reach-bw-2',
        type: 'reach',
        description: 'Reach bw-2.',
        target: 'bw-2',
        requiredCount: 1,
        currentCount: 0,
    }],
    reward: { kind: 'currency', amount: 1 },
    status: 'available',
};

/** A two-node dialogue: one choice starts the fixture quest, one leaves. */
export const FIXTURE_NPC: NPC = {
    name: 'Fixture NPC',
    description: 'A placeholder speaker.',
    dialogueTree: {
        id: 'fixture-npc',
        rootId: 'start',
        nodes: {
            start: {
                id: 'start',
                text: 'A placeholder line.',
                choices: [
                    { text: 'Take the quest.', nextNodeId: 'end', effect: { startQuest: FIXTURE_QUEST.name } },
                    { text: 'Leave.' },
                ],
            },
            end: { id: 'end', text: 'A closing line.' },
        },
    },
};

/** A shop that sells the healing potion. */
export const FIXTURE_SHOP: ShopInventory = {
    wares: [{ itemId: 'minor-healing-potion', price: 12 }],
};

/** Staged events for the arrival state fixtures (`StateFixture.stagedEvent`). */
export const FIXTURE_DIALOGUE_EVENT: MapEventPayload = {
    kind: 'narration',
    dialogue: FIXTURE_NPC.dialogueTree!,
};

export const FIXTURE_VILLAGE_EVENT: MapEventPayload = {
    kind: 'village',
    villageName: 'Fixture Shop',
    merchants: [{ name: 'Fixture Shopkeeper', isShopkeeper: true }],
    shop: FIXTURE_SHOP,
};

export const FIXTURE_CUTSCENE_EVENT: MapEventPayload = {
    kind: 'cutscene',
    lines: ['A placeholder line.', 'A second placeholder line.'],
};

/** A weapon-slot fixture relic. */
export const FIXTURE_WEAPON: Equipment = {
    id: 'fixture-weapon',
    name: 'Fixture Weapon',
    description: 'A placeholder weapon.',
    category: 'equipment',
    slot: 'weapon',
    statModifiers: [],
};

/** An armor-slot fixture relic: +5 max VITAE, the `maxHp` line's witness. */
export const FIXTURE_ARMOR: Equipment = {
    id: 'fixture-armor',
    name: 'Fixture Armor',
    description: 'A placeholder armor.',
    category: 'equipment',
    slot: 'armor',
    statModifiers: [{ stat: 'maxHp', value: 5 }],
};

/** Three accessory-slot fixture relics, one per accessory seat. */
export const FIXTURE_TRINKETS: readonly Equipment[] = (['amulet', 'charm', 'head'] as const).map((kind, i) => ({
    id: `fixture-trinket-${i + 1}`,
    name: `Fixture Trinket ${i + 1}`,
    description: 'A placeholder trinket.',
    category: 'equipment',
    slot: 'accessory',
    accessoryKind: kind,
    statModifiers: [],
}));

/**
 * Two elite-only fixture relics (`relicSource: 'elite'`): the elite drop's
 * pool in tests, since no live relic is elite-only yet. Each carries a stat
 * line so it routes to the item-reward screen.
 */
export const FIXTURE_ELITE_RELICS: readonly Equipment[] = [1, 2].map(i => ({
    id: `fixture-elite-relic-${i}`,
    name: `Fixture Elite Relic ${i}`,
    description: 'A placeholder elite-only relic.',
    category: 'equipment',
    slot: 'accessory',
    accessoryKind: 'charm',
    statModifiers: [{ stat: 'maxHp', value: i }],
    relicSource: 'elite',
}));

/**
 * A quest fixture relic (`relicSource: 'quest'`): the fixture quest's relic
 * reward in tests (`{ ...FIXTURE_QUEST, reward: { kind: 'item', item } }`).
 */
export const FIXTURE_QUEST_RELIC: Equipment = {
    id: 'fixture-quest-relic',
    name: 'Fixture Quest Relic',
    description: 'A placeholder quest relic.',
    category: 'equipment',
    slot: 'accessory',
    accessoryKind: 'amulet',
    statModifiers: [{ stat: 'maxHp', value: 3 }],
    relicSource: 'quest',
};

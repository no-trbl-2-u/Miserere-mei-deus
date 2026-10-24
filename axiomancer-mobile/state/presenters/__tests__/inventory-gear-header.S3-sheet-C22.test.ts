/**
 * Hermetic presenter test — the equipment section heading (cluster
 * S3-sheet-C22, second half).
 *
 * The tab was renamed WORN -> GEAR so a filter would stop naming a state it
 * does not apply. The section heading the tab opens was left behind reading
 * '✠ WORN & WIELDED' over a list that includes every unworn piece carried —
 * the surviving half of the same lie. These cases pin both halves: no chrome
 * heading claims wornness, and each heading echoes the tab that opens it.
 */

import { describe, expect, it } from '@jest/globals';
import { createCharacter, type Equipment, type Item } from '@mechanics';

import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import {
    selectInventoryViewModel,
    type InventoryCategory,
} from '@/state/presenters/inventory.engine';

/**
 * Build one equipment item for the fixture.
 *
 * Inputs: `id` (item id), `name` (display name), `slot` (body position).
 * Output: an `Equipment` item, ring-kinded when it is an accessory.
 * Resolves: S3-sheet-C22 — fixture helper only, no production behaviour.
 */
function gear(id: string, name: string, slot: Equipment['slot']): Equipment {
    return {
        id,
        name,
        description: 'Iron, notched.',
        category: 'equipment',
        slot,
        ...(slot === 'accessory' ? { accessoryKind: 'ring' as const } : {}),
    };
}

/**
 * Fresh store carrying exactly `items` — no seeded signet relics.
 *
 * Inputs: `items` (the whole inventory the character should hold).
 * Output: an app store whose player carries those items and nothing else.
 * Resolves: S3-sheet-C22 — fixture helper only, no production behaviour.
 */
function makeStore(items: readonly Item[]) {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const state = store.getState();
    const clean = createCharacter({
        id: state.player.id,
        name: state.player.name,
        level: state.player.level,
        baseStats: state.player.baseStats,
        currency: state.player.currency,
        knownCards: state.player.knownCards,
        inventory: [...items],
        // Five on the body: one weapon, the armor, three trinkets.
        equipment: items.filter((i): i is Equipment => WORN_IDS.includes(i.id)),
    });
    store.setState({ player: { ...state.player, ...clean } });
    return store;
}

/** Eight pieces of equipment; slot capacity (1 weapon, 1 armor, 3 trinkets)
 *  lets five of them be worn (`WORN_IDS`) and leaves three in the sack. */
const WORN_IDS: readonly string[] = ['blade-a', 'mail-a', 'ring-a', 'ring-b', 'ring-c'];

const EIGHT_PIECES: readonly Item[] = [
    gear('blade-a', 'Long Blade', 'weapon'),
    gear('blade-b', 'Bone Dagger', 'weapon'),
    gear('mail-a', 'Rusted Mail', 'armor'),
    gear('ring-a', 'Iron Ring', 'accessory'),
    gear('ring-b', 'Copper Ring', 'accessory'),
    gear('ring-c', 'Bone Ring', 'accessory'),
    gear('ring-d', 'Glass Ring', 'accessory'),
    gear('ring-e', 'Ash Ring', 'accessory'),
];

const CATEGORIES: readonly InventoryCategory[] = [
    'equipment',
    'consumable',
    'material',
    'quest',
];

describe('selectInventoryViewModel: the equipment section heading (S3-sheet-C22)', () => {
    it('does not head the equipment list with a claim of wornness', () => {
        const vm = selectInventoryViewModel(makeStore(EIGHT_PIECES).getState(), {
            activeTab: 'equipment',
        });

        expect(vm.categoryHeaders.equipment).not.toContain('WORN');
        // … and the list under it is why: three of the eight are unworn.
        expect(vm.items).toHaveLength(8);
        expect(vm.items.filter((r) => !r.equipped)).toHaveLength(3);
    });

    it('echoes each tab label in the heading that tab opens', () => {
        const vm = selectInventoryViewModel(makeStore(EIGHT_PIECES).getState());

        for (const category of CATEGORIES) {
            const tab = vm.tabs.find((t) => t.key === category)!;
            expect(vm.categoryHeaders[category]).toContain(tab.label);
        }
    });
});

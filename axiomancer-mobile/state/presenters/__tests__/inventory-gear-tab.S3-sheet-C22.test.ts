/**
 * Hermetic presenter test — the equipment tab's badge (cluster S3-sheet-C22).
 *
 * The tab was labelled WORN and badged with the count of every equipment item
 * carried, so a sack holding eight pieces badged "8" while five sat on the
 * body. Every tab's badge counts the rows that tab lists (and this tab lists
 * all equipment, worn or not), so the count was honest and the word was not:
 * the label names the filter (GEAR) and the per-row WORN badge stays the only
 * claim about what is actually worn.
 */

import { describe, expect, it } from '@jest/globals';
import { createCharacter, type Equipment, type Item } from '@mechanics';

import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { selectInventoryViewModel } from '@/state/presenters/inventory.engine';

function gear(id: string, name: string, slot: Equipment['slot']): Equipment {
    return {
        id,
        name,
        description: 'Iron, notched.',
        category: 'equipment',
        slot,
    };
}

/** Fresh store carrying exactly `items` — no seeded signet relics. */
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
 *  lets five of them be worn (`WORN_IDS`). This is the reviewer's sack. */
const WORN_IDS: readonly string[] = ['blade-a', 'mail-a', 'ring-a', 'ring-b', 'ring-c'];

const EIGHT_PIECES: readonly Item[] = [
    gear('blade-a', 'Long Blade', 'weapon'),
    gear('blade-b', 'Bone Dagger', 'weapon'),
    gear('mail-a', 'Rusted Mail', 'armor'),
    gear('ring-a', 'Iron Ring', 'relic'),
    gear('ring-b', 'Copper Ring', 'relic'),
    gear('ring-c', 'Bone Ring', 'relic'),
    gear('ring-d', 'Glass Ring', 'relic'),
    gear('ring-e', 'Ash Ring', 'relic'),
];

describe('selectInventoryViewModel: the equipment tab badge (S3-sheet-C22)', () => {
    it('does not label a carried-equipment count WORN', () => {
        const vm = selectInventoryViewModel(makeStore(EIGHT_PIECES).getState());
        const tab = vm.tabs.find((t) => t.key === 'equipment')!;

        expect(tab.label).not.toBe('WORN');
        expect(tab.label).toBe('GEAR');
    });

    it('badges the number of rows the tab lists, which is not the worn count', () => {
        const state = makeStore(EIGHT_PIECES).getState();
        const vm = selectInventoryViewModel(state, { activeTab: 'equipment' });
        const tab = vm.tabs.find((t) => t.key === 'equipment')!;

        // The badge matches the list under it …
        expect(tab.count).toBe(8);
        expect(vm.items).toHaveLength(8);
        // … and the body carries fewer than that, which is why the badge must
        // not claim wornness.
        expect(vm.items.filter((r) => r.equipped)).toHaveLength(5);
        expect(vm.equipmentDock.slots.filter((s) => s.item !== null)).toHaveLength(5);
    });
});

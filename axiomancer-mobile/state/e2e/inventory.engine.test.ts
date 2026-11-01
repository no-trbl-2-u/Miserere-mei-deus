/**
 * Hermetic E2E Tests — Inventory screen presenter
 *
 * Drives `selectInventoryViewModel` and the inventory action layer
 * (useItem / equipItem / dropItem) end-to-end through the engine
 * store. Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { afterEach, describe, it, expect, jest } from '@jest/globals';
import {
    armorLibrary,
    createCharacter,
    createGameStore,
    GREY_ARMOR_ID,
    GREY_WEAPON_ID,
    weaponLibrary,
    getRelicById,
    type Consumable,
    type Equipment,
    type Item,
    type Material,
    type QuestItem,
} from '@mechanics';

import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { createAppActions, parseHealAmount } from '@/state/actions';
import { createAppStore } from '@/state/store';
import {
    selectInventoryViewModel,
    type InventoryViewModel,
} from '@/state/presenters/inventory.engine';
import { selectItemModalViewModel } from '@/state/presenters/inventory.modal.engine';

afterEach(() => {
    jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function potion(id = 'potion-of-heart', heal = 6, qty = 1): Consumable {
    return {
        id,
        name: 'Potion of Heart',
        description: 'A small phial of ruby liquor.',
        category: 'consumable',
        healAmount: heal,
        quantity: qty,
    };
}

function sword(id = 'long-blade'): Equipment {
    return {
        id,
        name: 'Long Blade',
        description: 'Iron, notched. Drinks blood.',
        category: 'equipment',
        slot: 'weapon',
        
        
    };
}

function dagger(id = 'bone-dagger'): Equipment {
    return {
        id,
        name: 'Bone Dagger',
        description: 'Whittled from a saint\'s rib.',
        category: 'equipment',
        slot: 'weapon',


    };
}

function trinket(id: string, name = 'Iron Ring'): Equipment {
    return {
        id,
        name,
        description: 'A small worn thing.',
        category: 'equipment',
        slot: 'relic',
    };
}

function ash(id = 'ash', qty = 1): Material {
    return {
        id,
        name: 'Ash',
        description: 'For warding lines.',
        category: 'material',
        quantity: qty,
    };
}

function tooth(): QuestItem {
    return {
        id: 'hierophants-tooth',
        name: "Hierophant's Tooth",
        description: 'Reek of incense.',
        category: 'quest-item',
        questId: 'quest-priest',
    };
}

/**
 * A clean player carrying `items` and wearing `worn` in `player.equipment`,
 * the one record of what is worn (inventory order means nothing).
 */
function makeStore(items: readonly Item[], worn: readonly Equipment[] = []) {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const state = store.getState();
    // Rebuild a clean, unequipped player (no signet relics) so the worn window
    // and equip-delta computations reflect exactly the provided items. A stale
    // relic loadout/derivedStats would skew the deltas.
    const clean = createCharacter({
        id: state.player.id,
        name: state.player.name,
        level: state.player.level,
        baseStats: state.player.baseStats,
        currency: state.player.currency,
        knownCards: state.player.knownCards,
        inventory: [...items],
        equipment: [...worn],
    });
    store.setState({ player: { ...state.player, ...clean } });
    return store;
}

// ---------------------------------------------------------------------------
// Signet relic granted-signature label surfacing
// ---------------------------------------------------------------------------

describe('selectInventoryViewModel: signet relic granted signature (Phase 19)', () => {
    it('surfaces the granted signature name on a signet relic row', () => {
        const relic = getRelicById('relic-disarming-plea')!;
        const vm = selectInventoryViewModel(makeStore([relic]).getState());
        const row = vm.items.find((r) => r.id === 'relic-disarming-plea');
        expect(row?.grantsSignature).toBe('The Open Hand');
    });

    it('leaves non-relic equipment without a granted signature', () => {
        const vm = selectInventoryViewModel(makeStore([sword()]).getState());
        const row = vm.items.find((r) => r.id === 'long-blade');
        expect(row?.grantsSignature ?? null).toBeNull();
    });

    it('threads the granted signature into the worn equipment dock', () => {
        const relic = getRelicById('relic-disarming-plea')!;
        const vm = selectInventoryViewModel(makeStore([relic], [relic]).getState());
        const ringSlot = vm.equipmentDock.slots.find((s) => s.item?.id === 'relic-disarming-plea');
        // A lone worn trinket relic surfaces its signature in the dock slot.
        expect(ringSlot?.item?.grantsSignature).toBe('The Open Hand');
    });
});

// ---------------------------------------------------------------------------
// Shape contract — preserved from the stub
// ---------------------------------------------------------------------------

describe('selectInventoryViewModel: shape contract', () => {
    it('returns a totally-shaped InventoryViewModel for a fresh game', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm: InventoryViewModel = selectInventoryViewModel(store.getState());

        expect(Array.isArray(vm.tabs)).toBe(true);
        expect(Array.isArray(vm.items)).toBe(true);
        expect(typeof vm.shilling).toBe('number');
        expect(typeof vm.burden).toBe('number');
        expect(typeof vm.burdenMax).toBe('number');
        expect(typeof vm.isEmpty).toBe('boolean');
        expect(typeof vm.emptyMessage).toBe('string');
        expect(['all', 'equipment', 'consumable', 'material', 'quest']).toContain(vm.activeTab);
    });

    it('exposes the five canonical tab keys in display order', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm = selectInventoryViewModel(store.getState());

        expect(vm.tabs.map((t) => t.key)).toEqual([
            'all',
            'equipment',
            'consumable',
            'material',
            'quest',
        ]);
        for (const tab of vm.tabs) {
            expect(typeof tab.label).toBe('string');
            expect(typeof tab.count).toBe('number');
        }
    });
});

// ---------------------------------------------------------------------------
// localUi argument — drives activeTab + expansion
// ---------------------------------------------------------------------------

describe('selectInventoryViewModel: localUi argument', () => {
    it('defaults activeTab to "all" when no localUi is provided', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm = selectInventoryViewModel(store.getState());

        expect(vm.activeTab).toBe('all');
        expect(vm.expandedItemId).toBeNull();
    });

    it('respects an injected activeTab', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm = selectInventoryViewModel(store.getState(), {
            activeTab: 'consumable',
        });

        expect(vm.activeTab).toBe('consumable');
    });

    it('respects an injected expandedItemId', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm = selectInventoryViewModel(store.getState(), {
            expandedItemId: 'long-blade',
        });

        expect(vm.expandedItemId).toBe('long-blade');
    });
});

// ---------------------------------------------------------------------------
// Empty state (Q4=A)
// ---------------------------------------------------------------------------

describe('selectInventoryViewModel: empty state', () => {
    it('reports isEmpty=true and an empty-state message for a fresh character', () => {
        // Force a genuinely empty inventory to exercise the empty-state branch.
        const store = makeStore([]);

        const vm = selectInventoryViewModel(store.getState());

        expect(vm.isEmpty).toBe(true);
        expect(vm.items).toHaveLength(0);
        expect(vm.emptyMessage).toMatch(/nothing|empty/i);
    });

    it('every tab count is 0 when inventory is empty', () => {
        const store = makeStore([]);

        const vm = selectInventoryViewModel(store.getState());

        for (const tab of vm.tabs) expect(tab.count).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Happy path — engine inventory reflected in VM
// ---------------------------------------------------------------------------

describe('selectInventoryViewModel: engine read', () => {
    it('renders one row per unique item id with name + description', () => {
        const store = makeStore([sword(), potion()]);

        const vm = selectInventoryViewModel(store.getState());

        expect(vm.items).toHaveLength(2);
        const byId = Object.fromEntries(vm.items.map((i) => [i.id, i]));
        expect(byId['long-blade'].name).toBe('Long Blade');
        expect(byId['potion-of-heart'].description).toMatch(/phial/);
        expect(vm.isEmpty).toBe(false);
    });

    it('maps engine category "quest-item" to presenter "quest"', () => {
        const store = makeStore([tooth()]);

        const vm = selectInventoryViewModel(store.getState());

        expect(vm.items[0].category).toBe('quest');
    });

    it('exposes equipment slot label as the `sub` field', () => {
        const store = makeStore([sword()]);

        const vm = selectInventoryViewModel(store.getState());

        expect(vm.items[0].sub).toBe('Weapon');
    });

    it('Phase 23 — the rarity model is retired; equipment rows carry no rarity', () => {
        const store = makeStore([sword('relic')]);

        const vm = selectInventoryViewModel(store.getState());

        expect(vm.items[0].rarity ?? null).toBeNull();
    });

    it('leaves `rarity` null on non-equipment rows (Phase 135)', () => {
        const store = makeStore([potion(), tooth(), ash()]);

        const vm = selectInventoryViewModel(store.getState());

        for (const row of vm.items) {
            expect(row.rarity).toBeNull();
        }
    });

    it('marks consumables as canUse and canDiscard', () => {
        const store = makeStore([potion()]);

        const vm = selectInventoryViewModel(store.getState());

        expect(vm.items[0].canUse).toBe(true);
        expect(vm.items[0].canDiscard).toBe(true);
    });

    it('marks quest items as !canDiscard', () => {
        const store = makeStore([tooth()]);

        const vm = selectInventoryViewModel(store.getState());

        expect(vm.items[0].canDiscard).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Stacking (Q3=A — single row with count)
// ---------------------------------------------------------------------------

describe('selectInventoryViewModel: stacking', () => {
    it('three potions of the same id collapse into a single row with quantity=3', () => {
        const store = makeStore([potion('phial', 4, 3)]);

        const vm = selectInventoryViewModel(store.getState());

        expect(vm.items).toHaveLength(1);
        expect(vm.items[0].id).toBe('phial');
        expect(vm.items[0].quantity).toBe(3);
    });

    it('combines duplicate ids that arrive as separate inventory entries', () => {
        const store = makeStore([potion('phial', 4, 2), potion('phial', 4, 1)]);

        const vm = selectInventoryViewModel(store.getState());

        expect(vm.items).toHaveLength(1);
        expect(vm.items[0].quantity).toBe(3);
    });

    it('surfaces a second relic instance added by id after POPULATE has already added the base registry item', () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        const actions = createAppActions(store);

        actions.populateAllItems();
        // The dev item picker grants a fresh relic instance (its own instance
        // id), so it surfaces as a distinct row from the populated base.
        const result = actions.addItemById('relic-disarming-plea');

        expect(result.added).toBe(true);
        expect(result.name).not.toBeNull();
        const vm = selectInventoryViewModel(store.getState());
        expect(vm.items.some((i) => i.name === result.name)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Categories (Q1=A — group by category in the VM via tab counts)
// ---------------------------------------------------------------------------

describe('selectInventoryViewModel: categories', () => {
    it('tab counts reflect items per category', () => {
        const store = makeStore([sword(), potion('phial-a', 4, 2), ash('ash', 3), tooth()]);

        const vm = selectInventoryViewModel(store.getState());

        const counts = Object.fromEntries(vm.tabs.map((t) => [t.key, t.count]));
        expect(counts.equipment).toBe(1);
        expect(counts.consumable).toBe(2);
        expect(counts.material).toBe(3);
        expect(counts.quest).toBe(1);
        expect(counts.all).toBe(1 + 2 + 3 + 1);
    });

    it('filters items to the active tab', () => {
        const store = makeStore([sword(), potion()]);

        const vm = selectInventoryViewModel(store.getState(), { activeTab: 'consumable' });

        expect(vm.items.map((i) => i.id)).toEqual(['potion-of-heart']);
    });
});

// ---------------------------------------------------------------------------
// Equipped flag — first item per slot
// ---------------------------------------------------------------------------

describe('selectInventoryViewModel: equipped flag (EQ1 A1)', () => {
    it('marks the pieces player.equipment wears, wherever they sit in the inventory', () => {
        const store = makeStore([sword('a'), dagger('b')], [dagger('b')]);

        const vm = selectInventoryViewModel(store.getState());

        expect(vm.items.find((i) => i.id === 'a')!.equipped).toBe(false);
        expect(vm.items.find((i) => i.id === 'b')!.equipped).toBe(true);
    });

    it('marks nothing worn when the loadout is empty, however much is carried', () => {
        const store = makeStore([sword('a'), trinket('r1'), trinket('r2')]);

        const vm = selectInventoryViewModel(store.getState());

        expect(vm.items.filter((i) => i.equipped)).toHaveLength(0);
        expect(vm.equipmentDock.slots.every((s) => s.item === null)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Invariants + lifecycle
// ---------------------------------------------------------------------------

describe('selectInventoryViewModel: invariants', () => {
    it('burden is non-negative on a fresh game (and within capacity)', () => {
        // Fresh game starts well below burdenMax; the looser
        // invariant (just >= 0) leaves room for overflow without
        // breaking on a starting inventory.
        const store = createGameStore(createMemoryAdapter());

        const vm = selectInventoryViewModel(store.getState());

        expect(vm.burden).toBeGreaterThanOrEqual(0);
        expect(vm.burdenMax).toBeGreaterThan(0);
    });

    it('burden is UNCAPPED — exceeds burdenMax when inventory carries more than capacity (mechanics-ui audit [3.0] fix)', () => {
        // Pre-fix `computeBurden` clamped to `Math.min(BURDEN_MAX,
        // total)`; a player carrying 60 items read "50/50" — chrome
        // lied. Post-fix the bar text reads "60/50" honestly. The
        // StatBar fill still clamps at 100% internally (correct —
        // a bar can't visualize "more than full").
        const store = createGameStore(createMemoryAdapter());
        // Synthesize an inventory with > BURDEN_MAX (=50) consumable
        // entries so total > capacity. Items must be distinct ids so
        // the presenter's stacking pass doesn't collapse them into
        // one row.
        const inventory = Array.from({ length: 60 }, (_, i) => ({
            id: `phial-${i}`,
            name: `Phial ${i}`,
            category: 'consumable',
            description: '',
            // Type assertion for test mock data - partial Item properties
        })) as unknown as Item[];
        store.setState({
            player: { ...store.getState().player, inventory },
        });

        const vm = selectInventoryViewModel(store.getState());
        expect(vm.burdenMax).toBe(50);
        expect(vm.burden).toBe(60);
        expect(vm.burden).toBeGreaterThan(vm.burdenMax);
    });

    it('the returned VM is deep-frozen', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm = selectInventoryViewModel(store.getState());

        expect(Object.isFrozen(vm)).toBe(true);
        expect(Object.isFrozen(vm.tabs)).toBe(true);
    });
});

describe('selectInventoryViewModel: store lifecycle', () => {
    it('selecting the VM does not call adapter.save', () => {
        const adapter = createMemoryAdapter();
        const store = createGameStore(adapter);
        const saveSpy = jest.spyOn(adapter, 'save');

        selectInventoryViewModel(store.getState());

        expect(saveSpy).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Action layer — useItem, equipItem, dropItem
// ---------------------------------------------------------------------------

describe('parseHealAmount', () => {
    it.each([
        ['Heal 6 HP', 6],
        ['Restore 4 HP', 4],
        ['+10 HP', 10],
        ['8 HP', 8],
        ['heal 12 hp', 12],
        ['', 0],
        ['+4 Mana', 0],
        ['Inflict BURN 3 to foe.', 0],
    ])('parses "%s" to %i', (input, expected) => {
        expect(parseHealAmount(input)).toBe(expected);
    });
});

describe('useItem action: HP delta + stack decrement', () => {
    it('heals the player by the parsed amount and decrements the stack', () => {
        const damagedPlayer = {
            ...createCharacter({
                name: 'Pilgrim',
                level: 1,
                baseStats: { heart: 4, body: 4, mind: 4 },
            }),
            health: 5,
            inventory: [potion('phial', 6, 3)],
        };
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { player: damagedPlayer } });
        const actions = createAppActions(store);

        const result = actions.useItem('phial');

        expect(result.applied).toBe(true);
        expect(result.healed).toBe(6);
        const after = store.getState().player;
        expect(after.health).toBe(11);
        const stack = (after.inventory as readonly Item[]).find((i: Item) => i.id === 'phial') as Consumable;
        expect(stack.quantity).toBe(2);
    });

    it('caps healing at the player\'s maxHealth', () => {
        const player = {
            ...createCharacter({
                name: 'Pilgrim',
                level: 1,
                baseStats: { heart: 4, body: 4, mind: 4 },
            }),
            inventory: [potion('phial', 100, 1)],
        };
        const fullHealth = player.maxHealth;
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { player } });
        const actions = createAppActions(store);

        actions.useItem('phial');

        expect(store.getState().player.health).toBe(fullHealth);
    });

    it('removes the item entirely when the last in the stack is used', () => {
        const player = {
            ...createCharacter({
                name: 'Pilgrim',
                level: 1,
                baseStats: { heart: 4, body: 4, mind: 4 },
            }),
            health: 4,
            inventory: [potion('phial', 3, 1)],
        };
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { player } });
        const actions = createAppActions(store);

        actions.useItem('phial');

        const finalInv = store.getState().player.inventory as readonly Item[];
        expect(finalInv.find((i: Item) => i.id === 'phial')).toBeUndefined();
    });

    it('no-ops when the item is missing or non-consumable', () => {
        const store = makeStore([sword()]);
        const actions = createAppActions(store);

        const a = actions.useItem('missing');
        const b = actions.useItem('long-blade');

        expect(a.applied).toBe(false);
        expect(b.applied).toBe(false);
    });
});

describe('equipItem action: wears the piece in player.equipment (EQ1 A3)', () => {
    it('wears an unworn weapon, replacing the worn one, without reordering the inventory', () => {
        const store = makeStore([sword('first'), dagger('second')], [sword('first')]);
        const before = store.getState().player.inventory.map((i: Item) => i.id);
        const actions = createAppActions(store);

        actions.equipItem('second');

        const player = store.getState().player;
        expect(player.equipment.weapon?.id).toBe('second');
        expect(player.inventory.map((i: Item) => i.id)).toEqual(before);
        const vm = selectInventoryViewModel(store.getState());
        expect(vm.items.find((i) => i.id === 'second')!.equipped).toBe(true);
        expect(vm.items.find((i) => i.id === 'first')!.equipped).toBe(false);
    });

    it('fills a free relic position', () => {
        const store = makeStore([trinket('r1'), trinket('r2')], [trinket('r1')]);
        createAppActions(store).equipItem('r2');
        expect(store.getState().player.equipment.relics.flatMap((a) => (a ? [a.id] : []))).toEqual(['r1', 'r2']);
    });

    it('on a full relic row takes off the last-worn piece, which stays in the satchel', () => {
        const worn = [trinket('r1'), trinket('r2'), trinket('r3')];
        const store = makeStore([...worn, trinket('r4')], worn);
        createAppActions(store).equipItem('r4');

        const player = store.getState().player;
        expect(player.equipment.relics.flatMap((a) => (a ? [a.id] : []))).toEqual(['r1', 'r2', 'r4']);
        expect(player.inventory.map((i: Item) => i.id)).toContain('r3');
    });

    it('no-ops when the item is missing, not equipment, or already worn', () => {
        const store = makeStore([potion('phial'), sword('worn')], [sword('worn')]);
        const before = store.getState().player;
        const actions = createAppActions(store);

        actions.equipItem('missing');
        actions.equipItem('phial');
        actions.equipItem('worn');

        expect(store.getState().player).toBe(before);
    });
});

describe('unequipItem action: leaves the position empty (EQ1 A2, A3)', () => {
    it('takes the sole worn piece off: the slot is bare and the item is still carried', () => {
        const store = makeStore([sword('alone')], [sword('alone')]);
        createAppActions(store).unequipItem('alone');

        const player = store.getState().player;
        expect(player.equipment.weapon).toBeNull();
        expect(player.inventory.map((i: Item) => i.id)).toEqual(['alone']);
        const vm = selectInventoryViewModel(store.getState());
        expect(vm.items.find((i) => i.id === 'alone')!.equipped).toBe(false);
        expect(vm.equipmentDock.slots.find((s) => s.key === 'weapon')!.item).toBeNull();
    });

    it('takes one relic off of two, wearing fewer than are carried', () => {
        const ring = getRelicById('relic-disarming-plea')!;
        const signet = getRelicById('relic-bleeding-signet')!;
        const store = makeStore([ring, signet], [ring, signet]);
        createAppActions(store).unequipItem(signet.id);

        const player = store.getState().player;
        expect(player.equipment.relics.flatMap((a) => (a ? [a.id] : []))).toEqual([ring.id]);
        expect(player.inventory.map((i: Item) => i.id)).toEqual([ring.id, signet.id]);
    });

    it('EQ3a: taking off RELIC I leaves RELIC II where it is, and the next relic fills the hole', () => {
        const ring = getRelicById('relic-disarming-plea')!;
        const signet = getRelicById('relic-bleeding-signet')!;
        const extra = { ...ring, id: 'r-extra', name: 'Extra' };
        const store = makeStore([ring, signet, extra], [ring, signet]);
        const actions = createAppActions(store);
        actions.unequipItem(ring.id);
        expect(store.getState().player.equipment.relics.map((a) => a?.id ?? null)).toEqual([null, signet.id, null]);
        actions.equipItem(extra.id);
        expect(store.getState().player.equipment.relics.map((a) => a?.id ?? null)).toEqual([extra.id, signet.id, null]);
    });

    it('wearing none is legal: both relics off leaves an empty loadout', () => {
        const ring = getRelicById('relic-disarming-plea')!;
        const signet = getRelicById('relic-bleeding-signet')!;
        const store = makeStore([ring, signet], [ring, signet]);
        const actions = createAppActions(store);
        actions.unequipItem(ring.id);
        actions.unequipItem(signet.id);

        expect(store.getState().player.equipment.relics).toEqual([null, null, null]);
    });

    it('no-ops when the item is missing, not equipment, or not worn', () => {
        const store = makeStore([potion('phial'), sword('carried')]);
        const before = store.getState().player;
        const actions = createAppActions(store);

        actions.unequipItem('missing');
        actions.unequipItem('phial');
        actions.unequipItem('carried');

        expect(store.getState().player).toBe(before);
    });
});

describe('the Crimson Circlet round trip (EQ1 A3; the Circlet carries the +max VITAE line since LR1d)', () => {
    it('equip then unequip returns maxHealth and the loadout to their starting values', () => {
        const signet = { ...getRelicById('relic-crimson-circlet')! };
        const store = makeStore([signet]);
        const start = store.getState().player;
        const maxHp = (signet.statModifiers ?? [])
            .filter((m) => m.stat === 'maxHp')
            .reduce((sum, m) => sum + m.value, 0);
        expect(maxHp).toBeGreaterThan(0);
        const actions = createAppActions(store);

        actions.equipItem(signet.id);
        expect(store.getState().player.maxHealth).toBe(start.maxHealth + maxHp);
        expect(store.getState().player.equipment.relics.flatMap((a) => (a ? [a.id] : []))).toEqual([signet.id]);

        actions.unequipItem(signet.id);
        const end = store.getState().player;
        expect(end.maxHealth).toBe(start.maxHealth);
        expect(end.equipment).toEqual(start.equipment);
        expect(end.inventory.map((i: Item) => i.id)).toEqual([signet.id]);
    });
});

describe('dropItem action: removes the item, except quest items', () => {
    it('removes a discardable item from inventory', () => {
        const store = makeStore([sword()]);
        const actions = createAppActions(store);

        actions.dropItem('long-blade');

        expect(store.getState().player.inventory).toHaveLength(0);
    });

    it('refuses to drop a quest item', () => {
        const store = makeStore([tooth()]);
        const actions = createAppActions(store);

        actions.dropItem('hierophants-tooth');

        expect(store.getState().player.inventory).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// Lifecycle: createGameStore → addItem → useConsumable → save
// ---------------------------------------------------------------------------

describe('inventory lifecycle: persistence hook', () => {
    it('an addItem → useItem sequence does not call save until explicit', () => {
        const adapter = createMemoryAdapter();
        // Mobile boundary: `createAppStore` wraps the adapter so the
        // engine's per-dispatch autosave (mechanics 0.5.0+) is gated,
        // and only `actions.save()` reaches AsyncStorage.
        const store = createAppStore({
            adapter,
            overrides: {
                player: {
                    ...createCharacter({
                        name: 'Pilgrim',
                        level: 1,
                        baseStats: { heart: 4, body: 4, mind: 4 },
                    }),
                    health: 4,
                },
            },
        });
        const actions = createAppActions(store);
        const saveSpy = jest.spyOn(adapter, 'save');

        actions.addItem(potion('phial', 4, 1));
        actions.useItem('phial');

        expect(saveSpy).not.toHaveBeenCalled();

        actions.save();
        expect(saveSpy).toHaveBeenCalledTimes(1);
    });
});

// ---------------------------------------------------------------------------
// Screen chrome moved to the VM (CRITIQUE [LOW] pass 5 — Hard Rule #8)
// ---------------------------------------------------------------------------

describe('selectInventoryViewModel: chrome strings', () => {
    it('exposes the section eyebrow and per-category headers on the VM', () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        const vm: InventoryViewModel = selectInventoryViewModel(store.getState());

        expect(vm.sectionHeader).toBe('SATCHEL · PURSE · BURDEN');
        expect(vm.categoryHeaders.equipment).toBe('✠ GEAR & GIRDING');
        expect(vm.categoryHeaders.consumable).toBe('✠ PHIALS & SOPS');
        expect(vm.categoryHeaders.material).toBe('✠ STUFF');
        expect(vm.categoryHeaders.quest).toBe('✠ SEALED');
    });
});

// ---------------------------------------------------------------------------
// Equipment Dock
// ---------------------------------------------------------------------------

describe('selectInventoryViewModel: equipmentDock', () => {
    // The dock renders the full loadout: Weapon, Armor, and the 3 interchangeable
    // relic positions (Trinket I/II/III). The three relic rows share
    // `key: 'relic'` and disambiguate via `relicIndex`.
    const expectedSlotOrder: ReadonlyArray<{
        key: string;
        label: string;
        relicIndex?: number;
    }> = [
        { key: 'weapon', label: 'WEAPON' },
        { key: 'armor', label: 'ARMOR' },
        { key: 'relic', label: 'RELIC I', relicIndex: 0 },
        { key: 'relic', label: 'RELIC II', relicIndex: 1 },
        { key: 'relic', label: 'RELIC III', relicIndex: 2 },
    ];

    it('ships 5 slots in the design grid order with chrome labels and null items by default', () => {
        // Force an empty inventory to exercise the bare-dock default.
        const store = makeStore([]);
        const vm: InventoryViewModel = selectInventoryViewModel(store.getState());

        expect(vm.equipmentDock.headerLabel).toBe('✠ WORN UPON THE BODY');
        // FE-027: the hint names the tap — the worn-vs-unworn comparison is not
        // on screen until a slot is tapped.
        expect(vm.equipmentDock.hintLabel).toBe('CHOOSE A SLOT TO SEE WHAT ELSE FITS');
        expect(vm.equipmentDock.bareLabel).toBe('— bare —');
        expect(vm.equipmentDock.slots).toHaveLength(5);
        vm.equipmentDock.slots.forEach((slot, i) => {
            expect(slot.key).toBe(expectedSlotOrder[i].key);
            expect(slot.label).toBe(expectedSlotOrder[i].label);
            expect(slot.relicIndex).toBe(expectedSlotOrder[i].relicIndex);
            expect(slot.item).toBeNull();
        });
    });

    it('fills all three relic positions with the worn relics in order', () => {
        const rings = [
            trinket('ring-1', 'Iron Ring'),
            trinket('ring-2', 'Bone Charm'),
            trinket('ring-3', 'Copper Band'),
        ];
        const store = makeStore(rings, rings);
        const vm: InventoryViewModel = selectInventoryViewModel(store.getState());

        const accessorySlots = vm.equipmentDock.slots.filter((s) => s.key === 'relic');
        expect(accessorySlots).toHaveLength(3);
        expect(accessorySlots.map((s) => s.item?.id)).toEqual(['ring-1', 'ring-2', 'ring-3']);
    });

    it('leaves later relic positions bare when fewer than three are worn', () => {
        const store = makeStore([trinket('ring-1', 'Iron Ring')], [trinket('ring-1', 'Iron Ring')]);
        const vm: InventoryViewModel = selectInventoryViewModel(store.getState());

        const accessorySlots = vm.equipmentDock.slots.filter((s) => s.key === 'relic');
        expect(accessorySlots.map((s) => s.item?.id ?? null)).toEqual(['ring-1', null, null]);
    });

    it('fills the weapon slot with the equipped weapon row when one is in inventory', () => {
        const store = makeStore([sword('long-blade-1')], [sword('long-blade-1')]);
        const vm: InventoryViewModel = selectInventoryViewModel(store.getState());

        const weaponSlot = vm.equipmentDock.slots.find((s) => s.key === 'weapon');
        expect(weaponSlot).toBeDefined();
        expect(weaponSlot!.item).toEqual({
            id: 'long-blade-1',
            name: 'Long Blade',
            sub: 'Weapon',
            grantsSignature: null, // non-relic gear grants no signature
            effectLine: null, // and this one carries no effect
        });
    });

    it('shows the worn weapon, not the first one carried (EQ1 A1)', () => {
        const store = makeStore([sword('long-blade-1'), dagger('bone-dagger-1')], [dagger('bone-dagger-1')]);
        const vm: InventoryViewModel = selectInventoryViewModel(store.getState());

        const weaponSlot = vm.equipmentDock.slots.find((s) => s.key === 'weapon');
        expect(weaponSlot!.item?.id).toBe('bone-dagger-1');
        expect(vm.items.find((i) => i.id === 'long-blade-1')!.equipped).toBe(false);
    });

    it('leaves slots null when the player carries no equipment in that slot', () => {
        const store = makeStore([potion('phial-1'), ash('ash-1', 3)]);
        const vm: InventoryViewModel = selectInventoryViewModel(store.getState());
        for (const slot of vm.equipmentDock.slots) {
            expect(slot.item).toBeNull();
        }
    });
});

// ---------------------------------------------------------------------------
// Equipment Dock slot-filter
// ---------------------------------------------------------------------------

describe('selectInventoryViewModel: equipmentDock slot-filter', () => {
    it('echoes the picked slot + emits the banner chrome strings when selectedRow is set', () => {
        const store = makeStore([sword('long-blade-1'), potion('phial-1')]);
        const vm: InventoryViewModel = selectInventoryViewModel(store.getState(), {
            selectedRow: 'weapon',
        });

        expect(vm.equipmentDock.selectedRow).toBe('weapon');
        expect(vm.equipmentDock.bannerEyebrow).toBe('FITTING SLOT');
        expect(vm.equipmentDock.bannerSlotLabel).toBe('WEAPON');
        expect(vm.equipmentDock.bannerClearLabel).toBe('CLEAR ✕');
    });

    it('null selectedRow ships empty bannerSlotLabel and null on the dock VM', () => {
        const store = createGameStore(createMemoryAdapter());
        const vm: InventoryViewModel = selectInventoryViewModel(store.getState());
        expect(vm.equipmentDock.selectedRow).toBeNull();
        expect(vm.equipmentDock.bannerSlotLabel).toBe('');
    });

    it('filters items to compatible equipment when selectedRow is set, overriding the tab pick', () => {
        const store = makeStore([
            sword('long-blade-1'),
            dagger('bone-dagger-1'),
            potion('phial-1', 6, 3),
            ash('ash-1', 5),
        ]);
        const vm: InventoryViewModel = selectInventoryViewModel(store.getState(), {
            activeTab: 'consumable', // would normally show only the potion
            selectedRow: 'weapon',
        });

        expect(vm.items).toHaveLength(2);
        expect(vm.items.every((r) => r.category === 'equipment')).toBe(true);
        expect(vm.items.every((r) => r.sub === 'Weapon')).toBe(true);
    });

    it('ships zero items when the slot is empty and no compatible equipment is carried', () => {
        const store = makeStore([sword('long-blade-1'), potion('phial-1')]);
        const vm: InventoryViewModel = selectInventoryViewModel(store.getState(), {
            selectedRow: 'armor', // no armor in inventory
        });
        expect(vm.items).toHaveLength(0);
    });

    it('falls back to tab filter when selectedRow is null', () => {
        const store = makeStore([sword('long-blade-1'), potion('phial-1', 6, 2)]);
        const vmAll: InventoryViewModel = selectInventoryViewModel(store.getState(), {
            activeTab: 'consumable',
            selectedRow: null,
        });
        expect(vmAll.items).toHaveLength(1);
        expect(vmAll.items[0].category).toBe('consumable');
    });
});

// ---------------------------------------------------------------------------
// Equip-preview stat deltas
// ---------------------------------------------------------------------------

function swordWithStats(
    id: string,
    name: string,
    stats: ReadonlyArray<{ stat: string; value: number }>,
): Equipment {
    return {
        id,
        name,
        description: 'A blade.',
        category: 'equipment',
        slot: 'weapon',
        
        
        // Test fixtures use synthetic stat names ('attack', 'stamina', etc.)
        // rather than the engine's tight `StatModifier` (`maxHp`-only) type. The
        // presenter under test only diffs by stat name, so the broader
        // type is safe here.
        statModifiers: stats.map((s) => ({ ...s })) as unknown as Equipment['statModifiers'],
    };
}

describe('selectInventoryViewModel: equip-preview replacePreview', () => {
    it('is null on non-equipment rows', () => {
        const store = makeStore([potion('phial-1', 6, 2), ash('ash-1', 3)]);
        const vm = selectInventoryViewModel(store.getState());
        for (const row of vm.items) {
            expect(row.replacePreview).toBeNull();
        }
    });

    it('is null on the equipped equipment row itself (no self-replacement preview)', () => {
        const store = makeStore([sword('long-blade-1')], [sword('long-blade-1')]);
        const vm = selectInventoryViewModel(store.getState());
        const row = vm.items.find((r) => r.id === 'long-blade-1')!;
        expect(row.equipped).toBe(true);
        expect(row.replacePreview).toBeNull();
    });

    it('is null on non-equipped equipment when the slot is empty (no equipped sibling)', () => {
        // A carried, unworn armor in an empty armor slot.
        const armor: Equipment = {
            id: 'cuirass',
            name: 'Brass Cuirass',
            description: 'Heavy.',
            category: 'equipment',
            slot: 'armor',
            
            
        };
        const store = makeStore([armor]);
        const vm = selectInventoryViewModel(store.getState());
        const row = vm.items.find((r) => r.id === 'cuirass')!;
        expect(row.equipped).toBe(false);
        expect(row.replacePreview).toBeNull();
    });

    it('computes signed net deltas vs the equipped sibling in the same slot', () => {
        // Two weapons: long-blade equipped (+4 attack, -1 stamina);
        // steel-edge in inventory (+5 attack, +1 stamina, +2 defense).
        const equipped = swordWithStats('long-blade', 'Long Blade', [
            { stat: 'attack', value: 4 },
            { stat: 'stamina', value: -1 },
        ]);
        const replacer = swordWithStats('steel-edge', 'Steel Edge', [
            { stat: 'attack', value: 5 },
            { stat: 'stamina', value: 1 },
            { stat: 'defense', value: 2 },
        ]);
        const store = makeStore([equipped, replacer], [equipped]);
        const vm = selectInventoryViewModel(store.getState());

        const replacerRow = vm.items.find((r) => r.id === 'steel-edge')!;
        expect(replacerRow.equipped).toBe(false);
        expect(replacerRow.replacePreview).not.toBeNull();
        expect(replacerRow.replacePreview!.replacing).toEqual({
            id: 'long-blade',
            name: 'Long Blade',
        });

        // Sort deltas for deterministic comparison.
        const sorted = [...replacerRow.replacePreview!.deltas].sort((a, b) =>
            a.stat.localeCompare(b.stat),
        );
        expect(sorted).toEqual([
            { stat: 'attack', delta: 1 },   // 5 - 4
            { stat: 'defense', delta: 2 },  // 2 - 0
            { stat: 'stamina', delta: 2 },  // 1 - (-1)
        ]);
    });

    it('drops zero-delta entries from the preview', () => {
        const equipped = swordWithStats('long-blade', 'Long Blade', [
            { stat: 'attack', value: 4 },
        ]);
        const replacer = swordWithStats('iron-edge', 'Iron Edge', [
            { stat: 'attack', value: 4 }, // identical → delta 0, should be dropped
            { stat: 'reach', value: 1 },  // new stat → delta +1
        ]);
        const store = makeStore([equipped, replacer], [equipped]);
        const vm = selectInventoryViewModel(store.getState());

        const row = vm.items.find((r) => r.id === 'iron-edge')!;
        expect(row.replacePreview).not.toBeNull();
        expect(row.replacePreview!.deltas).toHaveLength(1);
        expect(row.replacePreview!.deltas[0]).toEqual({ stat: 'reach', delta: 1 });
    });
});

describe('selectInventoryViewModel: equipDelta surface (Phase 133)', () => {
    it('is null on non-equipment rows', () => {
        const store = makeStore([potion('phial-1', 6, 2), ash('ash-1', 3)]);
        const vm = selectInventoryViewModel(store.getState());
        for (const row of vm.items) {
            expect(row.equipDelta).toBeNull();
        }
    });

    it('is unequip mode (lost only) on the lone worn item', () => {
        const equipped = swordWithStats('long-blade', 'Long Blade', [
            { stat: 'attack', value: 4 },
        ]);
        const store = makeStore([equipped], [equipped]);
        const vm = selectInventoryViewModel(store.getState());
        const row = vm.items.find((r) => r.id === 'long-blade')!;
        expect(row.equipDelta).not.toBeNull();
        expect(row.equipDelta!.mode).toBe('unequip');
        expect(row.equipDelta!.stats).toEqual([{ stat: 'attack', delta: -4 }]);
    });

    it('is equip mode (gained only) on a carried, unworn item in an empty slot', () => {
        const carried = swordWithStats('long-blade', 'Long Blade', [
            { stat: 'attack', value: 4 },
        ]);
        const store = makeStore([carried]);
        const row = selectInventoryViewModel(store.getState()).items.find((r) => r.id === 'long-blade')!;
        expect(row.equipDelta!.mode).toBe('equip');
        expect(row.equipDelta!.stats).toEqual([{ stat: 'attack', delta: 4 }]);
    });

    it('is swap mode with gained/lost split for a non-equipped sibling', () => {
        const equipped = swordWithStats('long-blade', 'Long Blade', [
            { stat: 'attack', value: 4 },
            { stat: 'stamina', value: -1 },
        ]);
        const replacer = swordWithStats('steel-edge', 'Steel Edge', [
            { stat: 'attack', value: 5 },
            { stat: 'defense', value: 2 },
        ]);
        const store = makeStore([equipped, replacer], [equipped]);
        const vm = selectInventoryViewModel(store.getState());
        const row = vm.items.find((r) => r.id === 'steel-edge')!;
        expect(row.equipDelta).not.toBeNull();
        expect(row.equipDelta!.mode).toBe('swap');
        expect(row.equipDelta!.against).toEqual({ id: 'long-blade', name: 'Long Blade' });
        const sorted = [...row.equipDelta!.stats].sort((a, b) => a.stat.localeCompare(b.stat));
        expect(sorted).toEqual([
            { stat: 'attack', delta: 1 },
            { stat: 'defense', delta: 2 },
            { stat: 'stamina', delta: 1 },
        ]);
    });

    // Equipment carries no passive effects; the equip-delta surfaces
    // stat + signature changes only. A plain-gear swap surfaces just the stat diff.
    it('surfaces the stat diff on a plain-gear swap', () => {
        const store = makeStore([sword('worn-blade'), dagger('new-fang')], [sword('worn-blade')]);
        const vm = selectInventoryViewModel(store.getState());
        const row = vm.items.find((r) => r.id === 'new-fang')!;
        expect(row.equipDelta!.mode).toBe('swap');
        expect(row.equipDelta!.signatures.gained).toEqual([]);
        expect(row.equipDelta!.signatures.lost).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// A loaded save (EQ1 A5)
// ---------------------------------------------------------------------------

describe('a save carrying a relic the loadout lacks (EQ1 A5)', () => {
    it('shows it unworn with EQUIP offered, and wearing it folds its +max VITAE in once', () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        const actions = createAppActions(store);
        const signet = { ...getRelicById('relic-crimson-circlet')! };
        const player = store.getState().player;
        // The old dock drew the first trinkets carried as worn; the loadout,
        // which combat used, never wore it. Nothing rewrites the loadout.
        store.setState({ player: { ...player, inventory: [signet, ...player.inventory] } });
        expect(store.getState().player.equipment).toEqual(player.equipment);

        const row = selectInventoryViewModel(store.getState()).items.find((r) => r.id === signet.id)!;
        expect(row.equipped).toBe(false);
        expect(selectItemModalViewModel(store.getState(), signet.id)!.mode).toBe('equip');

        actions.equipItem(signet.id);
        const after = store.getState().player;
        expect(after.equipment.relics.filter((a) => a?.id === signet.id)).toHaveLength(1);
        expect(after.maxHealth).toBe(player.maxHealth + 20);

        actions.equipItem(signet.id);
        expect(store.getState().player.equipment.relics.filter((a) => a?.id === signet.id)).toHaveLength(1);
        expect(store.getState().player.maxHealth).toBe(player.maxHealth + 20);
    });
});

describe('selectInventoryViewModel: what a piece does (EQ3 A15)', () => {
    const blade = weaponLibrary.find((w) => w.id === GREY_WEAPON_ID)!;
    const coat = armorLibrary.find((a) => a.id === GREY_ARMOR_ID)!;

    it('a satchel row and a dock row for the grey pair carry the same effect line', () => {
        const vm = selectInventoryViewModel(makeStore([blade, coat], [blade, coat]).getState());
        expect(vm.items.find((r) => r.id === blade.id)?.effectLine).toBe('First DEAL +2 · Special: +2 Conviction');
        expect(vm.items.find((r) => r.id === coat.id)?.effectLine).toBe('First GUARD: GUARD 2 · Gold die: +1 hit');
        const weapon = vm.equipmentDock.slots.find((d) => d.key === 'weapon')!;
        const armor = vm.equipmentDock.slots.find((d) => d.key === 'armor')!;
        expect(weapon.item?.effectLine).toBe(vm.items.find((r) => r.id === blade.id)?.effectLine);
        expect(armor.item?.effectLine).toBe(vm.items.find((r) => r.id === coat.id)?.effectLine);
    });

    it('a piece with no effect, a relic and a consumable have a null line', () => {
        const relic = getRelicById('relic-disarming-plea')!;
        const vm = selectInventoryViewModel(makeStore([sword(), relic, potion()], [relic]).getState());
        expect(vm.items.find((r) => r.id === 'long-blade')?.effectLine).toBeNull();
        expect(vm.items.find((r) => r.id === relic.id)?.effectLine).toBeNull();
        expect(vm.items.find((r) => r.id === 'potion-of-heart')?.effectLine).toBeNull();
    });
});

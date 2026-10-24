/**
 * Hermetic E2E — the item-reward screen's store flow and presenter
 * (rules D5 / D6 / D7).
 *
 * Drives the reward through its public entry points: offer -> VM -> commit.
 * The load-bearing assertions are the two SILENT failures, because both read as success from the outside:
 *
 *   - `equipItem` drops the worn weapon/armor on the floor unless the caller
 *     rescues it first;
 *   - `equipItem` on a FULL accessory row is a guarded no-op that returns the
 *     SAME character reference, so a shallow equality check calls it done.
 *
 * Seeded; no timers, no network, no rendering.
 */

import { describe, expect, it } from '@jest/globals';
import {
    createCharacter,
    getConsumableById,
    getRelicById,
    FIRST_NODE_RELIC_FLAG,
    FIRST_NODE_RELIC_ID,
    FIXTURE_ARMOR,
    FIXTURE_TRINKETS,
    FIXTURE_WEAPON,
    SLOT_CAPACITY,
} from '@mechanics';
import type { Character, Equipment, GameState, Item } from '@mechanics';

import {
    confirmItemRewardAction,
    dismissItemRewardAction,
    equipItemRewardAction,
    offerFirstNodeRelicAction,
    offerItemRewardAction,
} from '@/state/item-reward/store-actions';
import {
    selectFirstNodeRelicMoment,
    selectHasPendingItemReward,
    selectItemRewardVM,
    ITEM_REWARD_FREE_SLOT_NOTE,
} from '@/state/presenters/item-reward.engine';
import { selectInventoryViewModel } from '@/state/presenters/inventory.engine';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

/**
 * A store whose player wears the fixture relics on every slot, the ring not
 * yet granted. A real fresh run wears NOTHING (THE VERY START), so the swap /
 * displacement cases seed a loadout explicitly: a full accessory row is what
 * makes EQUIP a swap rather than a free fill.
 */
function makeStore(): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const kit = [FIXTURE_WEAPON, FIXTURE_ARMOR, ...FIXTURE_TRINKETS];
    store.setState({
        player: createCharacter({
            name: 'Kitted', level: 1, baseStats: { heart: 5, body: 5, mind: 5 },
            inventory: [...kit], equipment: [...kit],
        }),
    } as never);
    return store;
}

function gameState(store: AppStore): GameState {
    return store.getState() as unknown as GameState;
}

function player(store: AppStore): Character {
    return gameState(store).player;
}

function vmOf(store: AppStore) {
    const s = store.getState();
    return selectItemRewardVM({ itemReward: s.itemReward, player: s.player });
}

function relic(id: string): Equipment {
    const found = getRelicById(id);
    if (!found) throw new Error(`test fixture missing relic ${id}`);
    return found;
}

/** A relic the seeded character is guaranteed NOT to be wearing: the ring. */
const BENCHED_ACCESSORY = FIRST_NODE_RELIC_ID;

/** A second armor piece; its +max VITAE line earns it the screen under D5. */
const SPARE_ARMOR: Equipment = { ...FIXTURE_ARMOR, id: 'fixture-armor-2' };

/** Force a known loadout so the swap assertions are not at the mercy of seeding. */
function setLoadout(store: AppStore, patch: Partial<Character['equipment']>): void {
    const p = player(store);
    store.setState({ player: { ...p, equipment: { ...p.equipment, ...patch } } } as never);
}

// ---------------------------------------------------------------------------
// D5 — which grants earn the screen
// ---------------------------------------------------------------------------

describe('D5 — the reward-screen trigger', () => {
    it('queues a signet relic and leaves a consumable to the inline grant', () => {
        const store = makeStore();
        const potion = getConsumableById('healing-potion') as Item;

        const result = offerItemRewardAction(store, [relic(BENCHED_ACCESSORY), potion]);

        expect(result.queued.map((i) => i.id)).toEqual([BENCHED_ACCESSORY]);
        expect(result.inline.map((i) => i.id)).toEqual(['healing-potion']);
        expect(selectHasPendingItemReward(store.getState())).toBe(true);
        expect(store.getState().itemReward.queue).toHaveLength(1);
    });

    it('offering only non-qualifying items opens no screen', () => {
        const store = makeStore();
        const result = offerItemRewardAction(store, getConsumableById('healing-potion') as Item);

        expect(result.queued).toHaveLength(0);
        expect(selectHasPendingItemReward(store.getState())).toBe(false);
    });

    it('does not grant anything on offer — the commit is the grant', () => {
        const store = makeStore();
        const before = player(store).inventory.length;
        offerItemRewardAction(store, relic(BENCHED_ACCESSORY));
        expect(player(store).inventory).toHaveLength(before);
    });
});

// ---------------------------------------------------------------------------
// The view-model
// ---------------------------------------------------------------------------

describe('item-reward view model', () => {
    it('carries the engine signature copy, the stat block, and the flavour', () => {
        const store = makeStore();
        offerItemRewardAction(store, relic(FIRST_NODE_RELIC_ID), { source: 'A first waypoint' });
        const vm = vmOf(store);

        expect(vm.active).toBe(true);
        expect(vm.eyebrow).toBe('A first waypoint');
        expect(vm.name).toBe("Suppliant's Ring");
        expect(vm.slotLabel).toBe('Trinket');
        expect(vm.canEquip).toBe(true);
        // Straight from `SIGNATURE_SKILLS` — never re-authored on the screen.
        expect(vm.signature?.name).toBe('The Open Hand');
        expect(vm.signature?.cost).toBeGreaterThan(0);
        expect(vm.signature?.description.length).toBeGreaterThan(0);
        // The ring grants ONLY its signature — no stat line.
        expect(vm.statLines).toHaveLength(0);
        expect(vm.flavor.length).toBeGreaterThan(0);
    });

    it('D6 — names the piece EQUIP would push out, and the signature gained', () => {
        const store = makeStore();
        // A full accessory row is the case that must never swap blind.
        expect(player(store).equipment.accessories).toHaveLength(SLOT_CAPACITY.accessory);
        const worn = player(store).equipment.accessories[SLOT_CAPACITY.accessory - 1]!;

        offerItemRewardAction(store, relic(BENCHED_ACCESSORY));
        const vm = vmOf(store);

        expect(vm.trade?.name).toBe(worn.name);
        expect(vm.trade?.note).toContain(worn.name);
        expect(vm.trade?.note).toContain('satchel');
        expect(vm.delta?.mode).toBe('swap');
        expect(vm.delta?.signatures.gained.map((s) => s.id)).toContain('sig-disarming-plea');
    });

    it('D6 — names the signature a swap loses', () => {
        const store = makeStore();
        // The ring sits in the seat EQUIP would displace.
        const ring = relic(FIRST_NODE_RELIC_ID);
        setLoadout(store, { accessories: [FIXTURE_TRINKETS[0]!, FIXTURE_TRINKETS[1]!, ring] });

        offerItemRewardAction(store, FIXTURE_TRINKETS[2]!, { includeInline: true });
        const vm = vmOf(store);

        expect(vm.trade?.name).toBe(ring.name);
        expect(vm.delta?.mode).toBe('swap');
        expect(vm.delta?.signatures.lost.map((s) => s.id)).toContain('sig-disarming-plea');
    });

    it('a free slot trades nothing away', () => {
        const store = makeStore();
        setLoadout(store, { accessories: [] });
        offerItemRewardAction(store, relic(BENCHED_ACCESSORY));
        const vm = vmOf(store);

        expect(vm.trade?.name).toBeNull();
        expect(vm.trade?.note).toBe(ITEM_REWARD_FREE_SLOT_NOTE);
        expect(vm.delta?.mode).toBe('equip');
    });

    it('hides EQUIP for an item that cannot be worn', () => {
        const store = makeStore();
        offerItemRewardAction(store, getConsumableById('healing-potion') as Item, {
            includeInline: true,
        });
        const vm = vmOf(store);

        expect(vm.active).toBe(true);
        expect(vm.canEquip).toBe(false);
        expect(vm.trade).toBeNull();
        expect(vm.delta).toBeNull();
    });

    it('is inactive when nothing is pending', () => {
        expect(vmOf(makeStore()).active).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// CONFIRM / EQUIP
// ---------------------------------------------------------------------------

describe('committing the reward', () => {
    it('CONFIRM puts it in the satchel and leaves the loadout alone', () => {
        const store = makeStore();
        const before = player(store).equipment;

        offerItemRewardAction(store, relic(BENCHED_ACCESSORY));
        const result = confirmItemRewardAction(store);

        expect(result.applied).toBe(true);
        expect(result.outcome).toBe('inventory');
        expect(result.displaced).toBeNull();
        expect(player(store).inventory.map((i) => i.id)).toContain(BENCHED_ACCESSORY);
        expect(player(store).equipment.accessories.map((a) => a.id))
            .toEqual(before.accessories.map((a) => a.id));
        expect(selectHasPendingItemReward(store.getState())).toBe(false);
    });

    it('EQUIP puts it in the satchel AND on the body, swapping rather than no-oping', () => {
        const store = makeStore();
        expect(player(store).equipment.accessories).toHaveLength(SLOT_CAPACITY.accessory);
        const displacedBefore = player(store).equipment.accessories[SLOT_CAPACITY.accessory - 1]!;
        const characterBefore = player(store);

        offerItemRewardAction(store, relic(BENCHED_ACCESSORY));
        const result = equipItemRewardAction(store);

        expect(result.applied).toBe(true);
        expect(result.outcome).toBe('swapped');
        // The guarded no-op returns the SAME reference — a shallow check would
        // have read that as success, so assert the reference actually moved.
        expect(player(store)).not.toBe(characterBefore);

        const after = player(store);
        expect(after.equipment.accessories.map((a) => a.id)).toContain(BENCHED_ACCESSORY);
        expect(after.equipment.accessories).toHaveLength(SLOT_CAPACITY.accessory);
        expect(after.inventory.map((i) => i.id)).toContain(BENCHED_ACCESSORY);

        // Nothing is ever destroyed: the displaced relic is still owned.
        expect(result.displaced?.id).toBe(displacedBefore.id);
        expect(after.inventory.map((i) => i.id)).toContain(displacedBefore.id);
    });

    it('EQUIP: the satchel shows exactly what the engine loadout wears', () => {
        const store = makeStore();
        const displaced = player(store).equipment.accessories[SLOT_CAPACITY.accessory - 1]!;
        offerItemRewardAction(store, relic(BENCHED_ACCESSORY));
        equipItemRewardAction(store);

        const after = player(store);
        const satchel = selectInventoryViewModel(store.getState(), {});
        const wornRows = satchel.items
            .filter((r) => r.category === 'equipment' && r.equipped)
            .map((r) => r.id);
        const loadoutIds = [
            after.equipment.weapon?.id,
            after.equipment.armor?.id,
            ...after.equipment.accessories.map((a) => a.id),
        ].filter((id): id is string => typeof id === 'string');
        expect([...wornRows].sort()).toEqual([...loadoutIds].sort());
        expect(wornRows).toContain(BENCHED_ACCESSORY);
        // The SATCHEL must not draw the displaced piece as still worn.
        expect(satchel.items.find((r) => r.id === displaced.id)?.equipped).toBe(false);
    });

    it('CONFIRM: the item arrives carried and unworn, and the satchel shows it unworn', () => {
        const store = makeStore();
        offerItemRewardAction(store, relic(BENCHED_ACCESSORY));
        confirmItemRewardAction(store);

        const after = player(store);
        expect(after.equipment.accessories.map((a) => a.id)).not.toContain(BENCHED_ACCESSORY);
        const row = selectInventoryViewModel(store.getState(), {}).items.find((r) => r.id === BENCHED_ACCESSORY);
        expect(row?.equipped).toBe(false);
    });

    it('EQUIP on a weapon swap returns the old weapon to the satchel instead of dropping it', () => {
        const store = makeStore();
        const oldWeapon = player(store).equipment.weapon;
        expect(oldWeapon).not.toBeNull();

        const candidate: Equipment = { ...FIXTURE_WEAPON, id: 'fixture-weapon-2' };

        // A bare fixture weapon fails D5 on its own; the flag queues it anyway.
        offerItemRewardAction(store, candidate, { includeInline: true });
        const result = equipItemRewardAction(store);

        const after = player(store);
        expect(after.equipment.weapon?.id).toBe(candidate.id);
        expect(result.displaced?.id).toBe(oldWeapon!.id);
        expect(after.inventory.map((i) => i.id)).toContain(oldWeapon!.id);
    });

    it('works through a queued batch, one item at a time', () => {
        const store = makeStore();
        offerItemRewardAction(store, [relic(BENCHED_ACCESSORY), SPARE_ARMOR]);

        expect(vmOf(store).remaining).toBe(1);
        expect(vmOf(store).remainingNote).not.toBeNull();

        confirmItemRewardAction(store);
        expect(vmOf(store).itemId).toBe(SPARE_ARMOR.id);
        expect(vmOf(store).remaining).toBe(0);

        confirmItemRewardAction(store);
        expect(selectHasPendingItemReward(store.getState())).toBe(false);
    });

    it('committing with an empty queue is a no-op', () => {
        const store = makeStore();
        expect(confirmItemRewardAction(store).applied).toBe(false);
        expect(equipItemRewardAction(store).applied).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// D7 — dismissal is CONFIRM
// ---------------------------------------------------------------------------

describe('D7 — leaving the screen keeps the item', () => {
    it('dismissal grants every queued item to the satchel and wears none', () => {
        const store = makeStore();
        const wornBefore = player(store).equipment.accessories.map((a) => a.id);
        offerItemRewardAction(store, [relic(BENCHED_ACCESSORY), SPARE_ARMOR]);

        const result = dismissItemRewardAction(store);

        expect(result.applied).toBe(true);
        const after = player(store);
        expect(after.inventory.map((i) => i.id)).toContain(BENCHED_ACCESSORY);
        expect(after.inventory.map((i) => i.id)).toContain(SPARE_ARMOR.id);
        expect(after.equipment.accessories.map((a) => a.id)).toEqual(wornBefore);
        expect(selectHasPendingItemReward(store.getState())).toBe(false);
    });

    it('dismissing an empty queue is harmless', () => {
        const store = makeStore();
        expect(dismissItemRewardAction(store).applied).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// The first-node hand-over (W1's grant, given its ceremony)
// ---------------------------------------------------------------------------

describe('the first-node Suppliant\'s Ring', () => {
    it('a fresh run owes the ring, and offering it opens the screen', () => {
        const store = makeStore();
        expect(player(store).inventory.map((i) => i.id)).not.toContain(FIRST_NODE_RELIC_ID);

        expect(offerFirstNodeRelicAction(store)).toBe(true);
        expect(vmOf(store).name).toBe("Suppliant's Ring");
        // A second call must not stack a duplicate hand-over.
        expect(offerFirstNodeRelicAction(store)).toBe(false);
        expect(store.getState().itemReward.queue).toHaveLength(1);
    });

    it('EQUIP hands it over, displaces the last worn trinket, and settles the grant flag', () => {
        const store = makeStore();
        expect(player(store).equipment.accessories).toHaveLength(SLOT_CAPACITY.accessory);
        const lastWorn = player(store).equipment.accessories[SLOT_CAPACITY.accessory - 1]!.id;

        offerFirstNodeRelicAction(store);
        const result = equipItemRewardAction(store);

        const after = player(store);
        expect(after.equipment.accessories.map((a) => a.id)).toContain(FIRST_NODE_RELIC_ID);
        expect(after.inventory.map((i) => i.id)).toContain(FIRST_NODE_RELIC_ID);
        // The displaced trinket goes back to the bench, not the bin.
        expect(result.displaced?.id).toBe(lastWorn);
        expect(after.inventory.map((i) => i.id)).toContain(lastWorn);

        expect(gameState(store).flags).toContain(FIRST_NODE_RELIC_FLAG);
        expect(offerFirstNodeRelicAction(store)).toBe(false);
    });

    it('CONFIRM also settles the grant — the ring is owned, just not worn', () => {
        const store = makeStore();
        offerFirstNodeRelicAction(store);
        confirmItemRewardAction(store);

        expect(player(store).inventory.map((i) => i.id)).toContain(FIRST_NODE_RELIC_ID);
        expect(gameState(store).flags).toContain(FIRST_NODE_RELIC_FLAG);
        expect(offerFirstNodeRelicAction(store)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// The gate's quiet-moment guard
// ---------------------------------------------------------------------------

describe('when the first-node hand-over is armed', () => {
    /** Mark a node resolved so the run counts as past its first node. */
    function resolveANode(store: AppStore): void {
        const w = store.getState().world;
        store.setState({
            world: {
                ...w,
                currentMap: { ...w.currentMap, completedNodes: [w.currentMap.currentNode] },
            },
        } as never);
    }

    it('holds off until the player has actually resolved a node', () => {
        const store = makeStore();
        expect(selectFirstNodeRelicMoment(store.getState())).toBe(false);
        resolveANode(store);
        expect(selectFirstNodeRelicMoment(store.getState())).toBe(true);
    });

    it('never paints over another full-screen surface', () => {
        const store = makeStore();
        resolveANode(store);
        store.setState({ cache: { session: {} } } as never);
        expect(selectFirstNodeRelicMoment(store.getState())).toBe(false);
    });

    it('stands down once the grant is settled', () => {
        const store = makeStore();
        resolveANode(store);
        offerFirstNodeRelicAction(store);
        // Already queued — do not arm a second time.
        expect(selectFirstNodeRelicMoment(store.getState())).toBe(false);
        confirmItemRewardAction(store);
        expect(selectFirstNodeRelicMoment(store.getState())).toBe(false);
    });
});

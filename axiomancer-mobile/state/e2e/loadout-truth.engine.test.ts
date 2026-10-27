/**
 * Hermetic E2E — what you wear is what you fight with (phase EQ1a, A4).
 *
 * The live fight route (`app/combat-encounter/index.tsx`) hands the store's
 * `player` to `<CombatEncounterPanel>` as `bootstrapPlayer`, and the panel's
 * mount calls `initializeCombatEncounter(bootstrapPlayer, …)`, which takes the
 * signatures from `player.equipment` once. These cases start each fight the
 * same way, from the store's player after the satchel's own actions, so the
 * column a fight carries is exactly the relics worn.
 *
 * Every grant path that wears a relic is pinned to wear it in
 * `player.equipment`; the item-reward CONFIRM carries it unworn.
 */

import { describe, expect, it } from '@jest/globals';
import {
    getRelicById,
    initializeCombatEncounter,
    type Character,
    type Enemy,
    type Item,
} from '@mechanics';

import { createAppActions } from '@/state/actions';
import { equipItemRewardAction, confirmItemRewardAction, offerItemRewardAction } from '@/state/item-reward/store-actions';
import { selectInventoryViewModel } from '@/state/presenters/inventory.engine';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { startRealFight } from '@/test-utils/realFight';

const RING = 'relic-disarming-plea';
const SIGNET = 'relic-bleeding-signet';

function relic(id: string): Item {
    const r = getRelicById(id);
    if (!r) throw new Error(`missing relic ${id}`);
    return { ...r, statModifiers: (r.statModifiers ?? []).map((m) => ({ ...m })) };
}

/** A fight started the way the route starts it: from the store's player. */
function fightFrom(store: AppStore, enemy: Enemy) {
    return initializeCombatEncounter(store.getState().player as Character, enemy, ['grey-strike'], 1);
}

/** The real-fight store, carrying the Ring and the Signet, wearing nothing. */
function carryingBoth() {
    const fight = startRealFight();
    const { store } = fight;
    const player = store.getState().player;
    store.setState({
        player: {
            ...player,
            inventory: [...player.inventory.filter((i: Item) => i.id !== RING && i.id !== SIGNET), relic(RING), relic(SIGNET)],
            equipment: { weapon: null, armor: null, relics: [] },
        },
    });
    return { store, enemy: fight.enemy, actions: createAppActions(store) };
}

describe('the fight carries exactly the worn relics (EQ1 A4)', () => {
    it('wearing the Ring and the Signet puts both signatures in the fight', () => {
        const { store, enemy, actions } = carryingBoth();
        actions.equipItem(RING);
        actions.equipItem(SIGNET);

        const signatures = fightFrom(store, enemy).signatures;
        expect(signatures).toContain('sig-disarming-plea');
        expect(signatures).toContain('sig-bleeding-signet');
    });

    it('taking the Signet off leaves the next fight only the Ring', () => {
        const { store, enemy, actions } = carryingBoth();
        actions.equipItem(RING);
        actions.equipItem(SIGNET);
        actions.unequipItem(SIGNET);

        expect(fightFrom(store, enemy).signatures).toEqual(['sig-disarming-plea']);
        // Still carried, shown unworn.
        const row = selectInventoryViewModel(store.getState(), {}).items.find((r) => r.id === SIGNET);
        expect(row?.equipped).toBe(false);
    });

    it('wearing nothing starts a fight with no signatures', () => {
        const { store, enemy } = carryingBoth();
        expect(fightFrom(store, enemy).signatures).toEqual([]);
    });
});

describe('every wearing grant wears into player.equipment (EQ1 A4)', () => {
    function bareStore(): AppStore {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        const player = store.getState().player;
        store.setState({
            player: { ...player, inventory: [], equipment: { weapon: null, armor: null, relics: [] } },
        });
        return store;
    }

    it('GET ALL RELICS wears each relic while a position is free', () => {
        const store = bareStore();
        const result = createAppActions(store).grantAllRelics();
        const worn = store.getState().player.equipment.relics.map((a) => a.id);
        expect(worn).toEqual(result.worn);
        expect(worn).toContain(RING);
        expect(worn).toContain('relic-crimson-circlet');
    });

    it('a dev relic chip (add item by id) arrives worn', () => {
        const store = bareStore();
        createAppActions(store).addItemById(SIGNET);
        expect(store.getState().player.equipment.relics.map((a) => a.id)).toEqual([SIGNET]);
        expect(selectInventoryViewModel(store.getState(), {}).items.find((r) => r.id === SIGNET)?.equipped)
            .toBe(true);
    });

    it('an item-reward EQUIP arrives worn, and a CONFIRM arrives carried and unworn', () => {
        const equipped = bareStore();
        offerItemRewardAction(equipped, relic(SIGNET));
        equipItemRewardAction(equipped);
        expect(equipped.getState().player.equipment.relics.map((a) => a.id)).toEqual([SIGNET]);

        const confirmed = bareStore();
        offerItemRewardAction(confirmed, relic(SIGNET));
        confirmItemRewardAction(confirmed);
        const player = confirmed.getState().player;
        expect(player.equipment.relics).toEqual([]);
        expect(player.inventory.map((i: Item) => i.id)).toEqual([SIGNET]);
        expect(selectInventoryViewModel(confirmed.getState(), {}).items.find((r) => r.id === SIGNET)?.equipped)
            .toBe(false);
    });
});

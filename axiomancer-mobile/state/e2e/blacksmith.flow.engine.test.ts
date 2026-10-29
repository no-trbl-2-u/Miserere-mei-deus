/**
 * Hermetic E2E — Blacksmith encounter ("The Anvil") store flow + map
 * interception. Drives the anvil
 * through the store action layer: begin → intro → forging (hone / temper /
 * swap) → card → outcome → claim, and verifies:
 *   - a village's Anvil counter launches the session (the village screen's
 *     button), not a paced /event card;
 *   - HONE / TEMPER / SWAP drive the engine;
 *   - a cap OR afford refusal surfaces the reason LOUDLY and no-ops the
 *     rail + budget;
 *   - claim writes `outcome.rail` to `Character.dieGear` and deducts
 *     `outcome.spent` from the wallet.
 *
 * Seeded; no timers, no network. The upgrade transitions are
 * deterministic, so no roll pinning is needed.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
    createMapState,
    getMapDefinition,
    getNodePrimaryEventKind,
    concreteDefaultRail,
    HEART_RICH_PAYLOAD_VARIANT,
    type GameState,
    type BlacksmithSession,
} from '@mechanics';

import { createAppActions, type AppActions } from '@/state/actions';
import { createAppStore, type AppStore } from '@/state/store';
import { selectHasActiveBlacksmith, selectBlacksmithVM } from '@/state/presenters/blacksmith.engine';
import { selectPacedEventRoute } from '@/state/presenters/event.engine';
import { selectVillageVM } from '@/state/presenters/village.engine';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

afterEach(() => {
    jest.restoreAllMocks();
});

function makeStoreAndActions(): { store: AppStore; actions: AppActions } {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    return { store, actions: createAppActions(store) };
}

function session(store: AppStore): BlacksmithSession {
    const s = store.getState().blacksmith.session;
    if (!s) throw new Error('expected an active blacksmith session');
    return s;
}

/** Give the player a known wallet so affordability + claim are deterministic. */
function setCurrency(store: AppStore, currency: number): void {
    const state = store.getState() as unknown as GameState;
    store.setState({ player: { ...state.player, currency } } as never);
}

/** Seat the player on `nodeId` of the Breakwater, mirroring a reachable tap. */
function seatAt(store: AppStore, nodeId: string): void {
    const base = store.getState() as unknown as GameState;
    const map = createMapState(getMapDefinition('coastal-continent', 'breakwater'));
    store.setState({
        world: { ...base.world, currentMap: { ...map, currentNode: nodeId } },
    } as never);
}

function firstBlacksmithNode(): string {
    const def = getMapDefinition('coastal-continent', 'breakwater');
    const node = def.nodes.find(
        (n) => getNodePrimaryEventKind('coastal-continent', 'breakwater', n.id) === 'village',
    );
    if (!node) throw new Error('no village node on the Breakwater');
    return node.id;
}

describe('the village Anvil counter', () => {
    it('the authored Breakwater village (bw-16) opens "The Anvil" from its counter', () => {
        const { store, actions } = makeStoreAndActions();
        expect(firstBlacksmithNode()).toBe('bw-16');
        seatAt(store, firstBlacksmithNode());

        // The node resolves to a village hub; no anvil session opens by itself.
        expect(actions.resolveCurrentMapEvent('village')).toBe(true);
        expect(selectHasActiveBlacksmith(store.getState())).toBe(false);
        const vm = selectVillageVM(store.getState());
        expect(vm.active).toBe(true);
        expect(vm.anvil).not.toBeNull();

        // The counter's button hands the payload's variants to the session.
        expect(actions.beginBlacksmith({ variants: vm.anvil?.variants })).toBe(true);
        expect(selectHasActiveBlacksmith(store.getState())).toBe(true);
        // The hub stays up underneath; the anvil is a counter, not a second event.
        expect(selectPacedEventRoute(store.getState())).toBe('/village');
        // The witness swap variant rides the payload through to the session.
        expect(session(store).variants.map((v) => v.id)).toContain(HEART_RICH_PAYLOAD_VARIANT.id);
    });

    it('there is exactly ONE village on the first map (no invented cadence)', () => {
        const def = getMapDefinition('coastal-continent', 'breakwater');
        const count = def.nodes.filter(
            (n) => getNodePrimaryEventKind('coastal-continent', 'breakwater', n.id) === 'village',
        ).length;
        expect(count).toBe(1);
    });
});

describe('blacksmith forging drives the engine', () => {
    it('HONE adds a mana face to the target die', () => {
        const { store, actions } = makeStoreAndActions();
        setCurrency(store, 100);
        expect(actions.beginBlacksmith()).toBe(true);
        expect(actions.beginBlacksmith()).toBe(false); // one anvil at a time
        actions.startBlacksmithForging();
        expect(session(store).phase).toBe('forging');

        const before = session(store).rail.heart.manaFaces;
        actions.honeBlacksmith('heart');
        expect(session(store).phase).toBe('card');
        expect(session(store).card?.refused).toBe(false);
        expect(session(store).rail.heart.manaFaces).toBe(before + 1);

        actions.continueBlacksmithCard();
        expect(session(store).phase).toBe('forging');
    });

    it('TEMPER trades a mana face for a special face', () => {
        const { store, actions } = makeStoreAndActions();
        setCurrency(store, 100);
        actions.beginBlacksmith();
        actions.startBlacksmithForging();

        const gear = session(store).rail.heart;
        expect(gear.manaFaces).toBeGreaterThanOrEqual(1); // default heart has a mana face
        actions.temperBlacksmith('heart');
        expect(session(store).card?.refused).toBe(false);
        expect(session(store).rail.heart.specialFaces).toBe(gear.specialFaces + 1);
        expect(session(store).rail.heart.manaFaces).toBe(gear.manaFaces - 1);
    });

    it('SWAP installs an offered variant gear piece', () => {
        const { store, actions } = makeStoreAndActions();
        setCurrency(store, 100);
        actions.beginBlacksmith({ variants: [HEART_RICH_PAYLOAD_VARIANT] });
        actions.startBlacksmithForging();

        actions.swapBlacksmith(HEART_RICH_PAYLOAD_VARIANT.id);
        expect(session(store).card?.refused).toBe(false);
        expect(session(store).rail.heart.specialConviction).toBe(
            HEART_RICH_PAYLOAD_VARIANT.gear.specialConviction,
        );
    });
});

describe('blacksmith refusals are loud and no-op', () => {
    it('an unaffordable HONE refuses with a reason and leaves rail + budget untouched', () => {
        const { store, actions } = makeStoreAndActions();
        setCurrency(store, 100);
        actions.beginBlacksmith({ budget: 1 }); // hone costs 3
        actions.startBlacksmithForging();

        const railBefore = JSON.stringify(session(store).rail);
        const budgetBefore = session(store).budget;

        actions.honeBlacksmith('heart');
        expect(session(store).phase).toBe('card');
        expect(session(store).card?.refused).toBe(true);
        expect(session(store).card?.reason).not.toBe('');
        expect(session(store).budget).toBe(budgetBefore); // no charge
        expect(JSON.stringify(session(store).rail)).toBe(railBefore); // no change
    });

    it('a cap-violating HONE (past the 1-miss floor) refuses loudly', () => {
        const { store, actions } = makeStoreAndActions();
        setCurrency(store, 100);
        actions.beginBlacksmith({ budget: 100 });
        actions.startBlacksmithForging();

        // Heart default 1 special / 2 mana / 3 miss. Two hones → 4 mana / 1
        // miss (legal). The third would erase the last miss face → refused.
        actions.honeBlacksmith('heart');
        actions.continueBlacksmithCard();
        actions.honeBlacksmith('heart');
        actions.continueBlacksmithCard();
        const railBefore = JSON.stringify(session(store).rail);
        actions.honeBlacksmith('heart');
        expect(session(store).card?.refused).toBe(true);
        expect(session(store).card?.reason).toMatch(/miss face/i);
        expect(JSON.stringify(session(store).rail)).toBe(railBefore);
    });

    it('the presenter greys the same offer with the same reason', () => {
        const { store, actions } = makeStoreAndActions();
        setCurrency(store, 100);
        actions.beginBlacksmith({ budget: 1 });
        actions.startBlacksmithForging();

        const vm = selectBlacksmithVM(store.getState());
        const heart = vm.dice.find((d) => d.color === 'heart')!;
        expect(heart.hone.enabled).toBe(false);
        expect(heart.hone.reason).toMatch(/cover/i);
    });
});

describe('blacksmith claim applies the outcome to the player', () => {
    it('writes the upgraded rail to dieGear and deducts the spend from the wallet', () => {
        const { store, actions } = makeStoreAndActions();
        setCurrency(store, 100);
        const heartBefore = concreteDefaultRail().heart.manaFaces;

        actions.beginBlacksmith(); // budget defaults to the 100 wallet
        actions.startBlacksmithForging();
        actions.honeBlacksmith('heart');
        const spent = session(store).spent;
        expect(spent).toBeGreaterThan(0);
        actions.continueBlacksmithCard();
        actions.leaveBlacksmith();
        expect(session(store).phase).toBe('outcome');

        const result = actions.claimBlacksmithOutcome();
        expect(result.applied).toBe(true);
        expect(result.honed).toBe(1);

        const state = store.getState() as unknown as GameState;
        expect(state.player.dieGear?.heart?.manaFaces).toBe(heartBefore + 1);
        expect(state.player.currency).toBe(100 - spent);
        // Slice cleared → the gate unmounts the screen.
        expect(selectHasActiveBlacksmith(store.getState())).toBe(false);
    });

    it('abandon clears the anvil without touching the player', () => {
        const { store, actions } = makeStoreAndActions();
        setCurrency(store, 100);
        actions.beginBlacksmith();
        actions.startBlacksmithForging();
        actions.honeBlacksmith('heart');
        actions.abandonBlacksmith();

        expect(selectHasActiveBlacksmith(store.getState())).toBe(false);
        const state = store.getState() as unknown as GameState;
        expect(state.player.currency).toBe(100); // no charge on abandon
    });
});

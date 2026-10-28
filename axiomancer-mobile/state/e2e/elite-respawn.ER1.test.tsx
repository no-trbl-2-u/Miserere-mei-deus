/**
 * Elites come back after a night's rest (phase ER1, the store halves of A4,
 * A5, A6, A8, A9, A10 and A11).
 *
 * Every fight here is the real path the combat panel takes: walk onto the
 * Green Jelly's node, resolve the arrival, enter the fight
 * (`beginHazardEncounter`), finish it through `applyHazardOutcome` (the elite
 * relic roll first, then the engine's `endCombat`) and open the reward
 * (`rollCombatRewardAction`). A rest is the rest screen's actions: begin,
 * choose REST, claim.
 *
 * `Math.random` is pinned per fight: 0 forces the elite relic drop (the
 * fixture elite relics stand in for the live pool, which has none yet), 0.99
 * forces a miss.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import {
    FIXTURE_ELITE_RELICS,
    createStartingWorld,
    initializeCombatEncounter,
    getMapDefinition,
    moveToNode,
    placeOnNode,
    type CombatOutcome,
    type GameState,
    type MapName,
    type WorldState,
} from '@mechanics';

import RestScreen from '@/app/rest/index';
import { applyHazardOutcome } from '@/components/combat/encounter/CombatEncounterPanel';
import { createAppActions } from '@/state/actions';
import {
    claimCombatRewardAction,
    claimCombatUpgradeAction,
    resetCombatRewardAction,
    rollCombatRewardAction,
} from '@/state/combat/store-actions';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import {
    beginRestAction,
    chooseRestChoiceOfferAction,
    claimRestChoiceOutcomeAction,
} from '@/state/rest/store-actions';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter, type MemoryAdapter } from '@/test-utils/memoryAdapter';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

afterEach(() => {
    jest.restoreAllMocks();
});

const GREY = ['grey-strike', 'grey-strike', 'grey-strike', 'grey-ward', 'grey-ward', 'grey-word', 'grey-word'];
/** The Green Jelly at level 3 (`DEFAULT_XP_BY_DIFFICULTY.elite` 50 a level). */
const ELITE_XP = 150;

function gs(store: AppStore): GameState {
    return store.getState() as unknown as GameState;
}

/** A store on `map`, the grey deck, an empty satchel and no level-up in reach. */
function makeStore(map: MapName = 'breakwater', adapter: MemoryAdapter = createMemoryAdapter()): AppStore {
    const store = createAppStore({ adapter });
    const { player } = gs(store);
    store.setState({
        world: createStartingWorld(map),
        player: {
            ...player,
            knownCards: [...GREY],
            combatRewardCards: [],
            inventory: [],
            experience: 0,
            experienceToNextLevel: 1_000_000,
        },
        flags: [],
    } as never);
    return store;
}

function spent(world: WorldState, node: string): boolean {
    return world.currentMap.consumedNodes.includes(node) || world.currentMap.completedNodes.includes(node);
}

/** Stand beside `node` (the approach spent, as a walked route would leave it), then walk on. */
function walkOnto(store: AppStore, node: string): void {
    const world = gs(store).world;
    const def = getMapDefinition(world.currentMap.continent, world.currentMap.name);
    const approach = def.nodes.find(n => n.connectedNodes.includes(node))!.id;
    const placed = placeOnNode(world, approach);
    const approached: WorldState = {
        ...placed,
        currentMap: { ...placed.currentMap, consumedNodes: [...placed.currentMap.consumedNodes, approach] },
    };
    store.setState({ world: moveToNode(approached, node) } as never);
}

/**
 * Fight the elite on `node` to a win, as the panel does, and open its reward.
 * `drop` pins the relic roll.
 */
function winElite(store: AppStore, node: string, drop: boolean): { xp: number; offers: readonly string[] } {
    resetCombatRewardAction(store);
    walkOnto(store, node);
    const actions = createAppActions(store);
    expect(actions.resolveCurrentMapEvent()).toBe(true);
    const enemy = actions.beginHazardEncounter();
    if (!enemy) throw new Error(`no fight at ${node}`);
    expect(enemy.difficulty).toBe('elite');
    const finalState = initializeCombatEncounter(gs(store).player, enemy, ['grey-strike'], 7);
    const before = gs(store).player.experience;
    jest.spyOn(Math, 'random').mockReturnValue(drop ? 0 : 0.99);
    applyHazardOutcome(store, 'victory' as CombatOutcome, finalState, enemy, FIXTURE_ELITE_RELICS);
    const offers = rollCombatRewardAction(store, enemy);
    jest.restoreAllMocks();
    expect(spent(gs(store).world, node)).toBe(true);
    return { xp: gs(store).player.experience - before, offers };
}

/** Rest at the map's first rest node: arrive, begin, choose REST. Returns the store. */
function arriveAtRest(store: AppStore): void {
    const world = gs(store).world;
    const restNode = world.currentMap.name === 'breakwater' ? 'bw-9' : 'cw-9';
    const placed = placeOnNode(world, restNode);
    store.setState({
        world: { ...placed, currentMap: { ...placed.currentMap, consumedNodes: [...placed.currentMap.consumedNodes, restNode] } },
    } as never);
    expect(beginRestAction(store, { seed: 7, shelter: 'camp' })).toBe(true);
    chooseRestChoiceOfferAction(store, 'rest');
}

function restAndClaim(store: AppStore) {
    arriveAtRest(store);
    return claimRestChoiceOutcomeAction(store);
}

describe('claiming a rest brings the elite back (A4)', () => {
    it('the claim respawns in its one save; arriving alone does not', () => {
        const adapter = createMemoryAdapter();
        const store = makeStore('breakwater', adapter);
        winElite(store, 'bw-8', false);
        claimCombatRewardAction(store, null);

        arriveAtRest(store);
        // Arrived, not claimed: the elite is still spent.
        expect(spent(gs(store).world, 'bw-8')).toBe(true);

        const saves = adapter.saveCount;
        const claim = claimRestChoiceOutcomeAction(store);
        expect(claim.applied).toBe(true);
        expect(claim.respawnedElites).toEqual([{ map: 'breakwater', node: 'bw-8' }]);
        expect(adapter.saveCount).toBe(saves + 1);
        expect(spent(gs(store).world, 'bw-8')).toBe(false);
        expect(spent(adapter.load()!.world, 'bw-8')).toBe(false);
        // The rest node itself stays used up.
        expect(spent(gs(store).world, 'bw-9')).toBe(true);
    });
});

describe('XP and cards on every win (A6)', () => {
    it('fight, win, rest, claim, fight again, win: XP and the card offer both times', () => {
        const store = makeStore();
        const first = winElite(store, 'bw-8', false);
        expect(first.xp).toBe(ELITE_XP);
        expect(first.offers).toHaveLength(3);
        claimCombatRewardAction(store, first.offers[0]!);

        restAndClaim(store);
        const second = winElite(store, 'bw-8', false);
        expect(second.xp).toBe(ELITE_XP);
        expect(second.offers).toHaveLength(3);
        expect(gs(store).player.experience).toBe(2 * ELITE_XP);
    });
});

describe('a relic drop is the whole reward, and retires the elite (A9, A11)', () => {
    it('a forced drop: the relic queued, no XP, no reward screen; the elite never returns, through a save', () => {
        const adapter = createMemoryAdapter();
        const store = makeStore('breakwater', adapter);
        const won = winElite(store, 'bw-8', true);
        expect(won.xp).toBe(0);
        expect(won.offers).toEqual([]);
        expect(store.getState().combatReward.claimed).toBe(true);
        expect(store.getState().combatReward.upgrade).toBeNull();
        expect(store.getState().itemReward.queue.map(e => e.item.id)).toEqual([FIXTURE_ELITE_RELICS[0]!.id]);
        expect(gs(store).world.currentMap.retiredEliteNodes).toEqual(['bw-8']);

        arriveAtRest(store);
        const r = render(
            <GameStoreProvider store={store}>
                <RestScreen />
            </GameStoreProvider>,
        );
        expect(r.queryByTestId('rest-elite-respawn')).toBeNull();
        const claim = claimRestChoiceOutcomeAction(store);
        expect(claim.respawnedElites).toEqual([]);
        expect(spent(gs(store).world, 'bw-8')).toBe(true);

        // Save round-trip: the retirement rides the save.
        const saved = JSON.parse(JSON.stringify(adapter.load())) as GameState;
        expect(saved.world.currentMap.retiredEliteNodes).toEqual(['bw-8']);
        const reloaded = createAppStore({ adapter: createMemoryAdapter(saved) });
        expect(restAndClaim(reloaded).respawnedElites).toEqual([]);
    });

    it('a forced miss: XP and the elite reward as usual, nothing retired', () => {
        const store = makeStore();
        const won = winElite(store, 'bw-8', false);
        expect(won.xp).toBe(ELITE_XP);
        expect(won.offers).toHaveLength(3);
        expect(store.getState().itemReward.queue).toHaveLength(0);
        expect(gs(store).world.currentMap.retiredEliteNodes ?? []).toEqual([]);
    });

    it('a flee or a spare retires nothing either', () => {
        for (const outcome of ['flee', 'mercy'] as const) {
            const store = makeStore();
            walkOnto(store, 'bw-8');
            const actions = createAppActions(store);
            actions.resolveCurrentMapEvent();
            const enemy = actions.beginHazardEncounter()!;
            const finalState = initializeCombatEncounter(gs(store).player, enemy, ['grey-strike'], 7);
            jest.spyOn(Math, 'random').mockReturnValue(0);
            applyHazardOutcome(store, outcome as CombatOutcome, finalState, enemy, FIXTURE_ELITE_RELICS);
            jest.restoreAllMocks();
            expect(store.getState().itemReward.queue).toHaveLength(0);
            expect(gs(store).world.currentMap.retiredEliteNodes ?? []).toEqual([]);
            if (outcome === 'flee') {
                // A fled fight leaves its node unspent (phase QL1b): the
                // elite is still there, so the rest has nothing to bring back.
                expect(gs(store).world.currentMap.consumedNodes).not.toContain('bw-8');
                expect(restAndClaim(store).respawnedElites).toEqual([]);
            } else {
                // A spare is a won fight (friendship): the node is spent, and
                // the rest brings the elite back.
                expect(restAndClaim(store).respawnedElites).toEqual([{ map: 'breakwater', node: 'bw-8' }]);
            }
        }
    });
});

describe('the upgrade, once per elite (A10)', () => {
    it('taken over bw-8, a repeat win there offers cards only', () => {
        const store = makeStore();
        const first = winElite(store, 'bw-8', false);
        const upgrade = store.getState().combatReward.upgrade;
        expect(upgrade).not.toBeNull();
        claimCombatUpgradeAction(store, upgrade!.fromCardId);
        expect(gs(store).world.currentMap.eliteUpgradeTakenNodes).toEqual(['bw-8']);
        expect(first.offers).toHaveLength(3);

        restAndClaim(store);
        const second = winElite(store, 'bw-8', false);
        expect(second.offers).toHaveLength(3);
        expect(store.getState().combatReward.upgrade).toBeNull();
    });

    it('another elite still offers its own upgrade', () => {
        const store = makeStore('charcoal-wood');
        winElite(store, 'cw-12', false);
        expect(store.getState().combatReward.upgrade).not.toBeNull();
    });

    it('taking the cards leaves the upgrade on offer next time', () => {
        const store = makeStore();
        const first = winElite(store, 'bw-8', false);
        expect(store.getState().combatReward.upgrade).not.toBeNull();
        claimCombatRewardAction(store, first.offers[0]!);
        expect(gs(store).world.currentMap.eliteUpgradeTakenNodes ?? []).toEqual([]);

        restAndClaim(store);
        winElite(store, 'bw-8', false);
        expect(store.getState().combatReward.upgrade).not.toBeNull();
    });
});

describe('an old save respawns at its next claim (A8)', () => {
    it('a save from before ER1 loads with no migration, and the claim brings the elite back with its upgrade', () => {
        const adapter = createMemoryAdapter();
        const store = makeStore('breakwater', adapter);
        winElite(store, 'bw-8', false);
        claimCombatRewardAction(store, null);
        store.getState().save();

        // Strip the two ER1 fields, as a save written before ER1 would lack them.
        const old = JSON.parse(JSON.stringify(adapter.load())) as GameState;
        delete (old.world.currentMap as { retiredEliteNodes?: unknown }).retiredEliteNodes;
        delete (old.world.currentMap as { eliteUpgradeTakenNodes?: unknown }).eliteUpgradeTakenNodes;
        expect(spent(old.world, 'bw-8')).toBe(true);

        const reloaded = createAppStore({ adapter: createMemoryAdapter(old) });
        expect(restAndClaim(reloaded).respawnedElites).toEqual([{ map: 'breakwater', node: 'bw-8' }]);
        winElite(reloaded, 'bw-8', false);
        expect(reloaded.getState().combatReward.upgrade).not.toBeNull();
    });
});

describe('the rest screen names each returning foe (A5)', () => {
    it('one line per elite, current region first', () => {
        const store = makeStore();
        winElite(store, 'bw-8', false);
        claimCombatRewardAction(store, null);
        // A departed Charcoal Wood whose elite was fought.
        const cw = createStartingWorld('charcoal-wood').currentMap;
        const world = gs(store).world;
        store.setState({
            world: {
                ...world,
                mapStates: { ...world.mapStates, 'charcoal-wood': { ...cw, consumedNodes: ['cw-12'] } },
            },
        } as never);
        arriveAtRest(store);
        const r = render(
            <GameStoreProvider store={store}>
                <RestScreen />
            </GameStoreProvider>,
        );
        const lines = r.getAllByTestId('rest-elite-respawn').map(n => String(n.props.children));
        expect(lines).toEqual([
            'The Green Jelly is back at The North Pier.',
            'The Green Jelly is back at The Root Graveyard.',
        ]);
        fireEvent.press(r.getByTestId('rest-claim'));
        expect(spent(gs(store).world, 'bw-8')).toBe(false);
    });

    it('no line when nothing will return', () => {
        const store = makeStore();
        arriveAtRest(store);
        const r = render(
            <GameStoreProvider store={store}>
                <RestScreen />
            </GameStoreProvider>,
        );
        expect(r.getByTestId('rest-outcome')).toBeTruthy();
        expect(r.queryByTestId('rest-elite-respawn')).toBeNull();
    });
});

/**
 * Hermetic E2E Tests — Exploration screen presenter
 *
 * Drives `selectExplorationViewModel` and the world action layer
 * (moveTo / changeMap) end-to-end through the engine store. Hermetic =
 * self-contained + deterministic + isolated. See docs/testing.md for
 * the full standard.
 */

import { afterEach, describe, it, expect, jest } from '@jest/globals';
import {
    createMapState, getMapDefinition, getNodeEventPool, createStartingWorld, settleArrival, settleQuestNodes,
    syncMoveLists,
    type GameState, type WorldState,
} from '@mechanics';

import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { createAppActions } from '@/state/actions';
import { createAppStore, type AppStore } from '@/state/store';

/**
 * A new Breakwater with its quest nodes settled (test-only): the markers
 * spent and their locks open, so these walks reach the pockets' fights
 * without playing the questline.
 */
function bwWorld(): WorldState {
    const w = createStartingWorld('breakwater');
    return { ...w, currentMap: settleQuestNodes(w.currentMap) };
}

/**
 * `bwWorld()` with the player standing on `nodeId` (a settled marker, so its
 * pocket's fights are a road away). The player walks the roads: a pocket
 * fight is a legal move only from its marker.
 */
function bwWorldOn(nodeId: string): WorldState {
    const w = bwWorld();
    return { ...w, currentMap: syncMoveLists({ ...w.currentMap, currentNode: nodeId }) };
}

/**
 * The fight on the node underfoot ends. A fight's node stays owed,
 * with its way on shut, until the fight settles; in play the engine's
 * `END_COMBAT` does this, and these walks stand in for it.
 */
function fightOut(store: AppStore): void {
    store.setState({ world: settleArrival(store.getState() as unknown as GameState).world });
}
import { jumpToNode } from '@/state/dev/world-travel';
// Side-effect: registers exploration map event pools so resolveMapEvent
// produces real events in the travel-to-event path tests below.
import {
    selectExplorationViewModel,
    type ExplorationViewModel,
} from '@/state/presenters/exploration.engine';

afterEach(() => {
    jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Shape contract
// ---------------------------------------------------------------------------

describe('selectExplorationViewModel: shape contract', () => {
    it('returns a totally-shaped ExplorationViewModel for a fresh game', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });

        const vm: ExplorationViewModel = selectExplorationViewModel(store.getState());

        expect(typeof vm.continent).toBe('string');
        expect(typeof vm.region).toBe('string');
        expect(typeof vm.regionProgress).toBe('string');
        expect(typeof vm.mapId).toBe('string');
        expect(typeof vm.currentNodeId).toBe('string');
        expect(Array.isArray(vm.nodes)).toBe(true);
        expect(Array.isArray(vm.edges)).toBe(true);
        expect(Array.isArray(vm.actions)).toBe(true);
        expect(Array.isArray(vm.options)).toBe(true);
        expect(typeof vm.legend.left).toBe('string');
        expect(typeof vm.legend.right).toBe('string');
    });

    it('eventCallout is either null or a {title, iconKey} object', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });

        const vm = selectExplorationViewModel(store.getState());

        if (vm.eventCallout !== null) {
            expect(typeof vm.eventCallout.title).toBe('string');
            expect(typeof vm.eventCallout.iconKey).toBe('string');
        } else {
            expect(vm.eventCallout).toBeNull();
        }
    });
});

describe('selectExplorationViewModel: invariants', () => {
    it('the returned VM is deep-frozen', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });

        const vm = selectExplorationViewModel(store.getState());

        expect(Object.isFrozen(vm)).toBe(true);
        expect(Object.isFrozen(vm.nodes)).toBe(true);
        expect(Object.isFrozen(vm.edges)).toBe(true);
        expect(Object.isFrozen(vm.legend)).toBe(true);
    });
});

describe('selectExplorationViewModel: store lifecycle', () => {
    it('selecting the VM does not call adapter.save', () => {
        const adapter = createMemoryAdapter();
        const store = createAppStore({ adapter, overrides: { world: bwWorld() } });
        const saveSpy = jest.spyOn(adapter, 'save');

        selectExplorationViewModel(store.getState());

        expect(saveSpy).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Engine reads — fresh game state
// ---------------------------------------------------------------------------

describe('selectExplorationViewModel: engine reads', () => {
    it('classifies the starting node as `current` and seeds available/locked', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: createStartingWorld('breakwater') } });

        const vm = selectExplorationViewModel(store.getState());

        expect(vm.mapId).toBe('breakwater');
        expect(vm.currentNodeId).toBe('bw-1');

        const byId = Object.fromEntries(vm.nodes.map((n) => [n.id, n]));
        expect(byId['bw-1'].kind).toBe('current');
        expect(byId['bw-4'].kind).toBe('available');
        // The customs-house rest (column 2), a pocket's fight (behind its
        // quest marker) and the river-bridge door are beyond the first ring.
        expect(byId['bw-9'].kind).toBe('locked');
        expect(byId['bw-2'].kind).toBe('locked');
        expect(byId['bw-18'].kind).toBe('locked');
    });

    it('exposes options for each currently available node with a thematic description', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: createStartingWorld('breakwater') } });

        const vm = selectExplorationViewModel(store.getState());

        // The windmill (bw-1) opens on the whole first ring: the first quest
        // marker, the foothill pass and smugglers' cove.
        expect(vm.options.map((o) => o.nodeId).sort()).toEqual(['bw-19', 'bw-4', 'bw-5'].sort());
        for (const opt of vm.options) {
            expect(opt.description.length).toBeGreaterThan(0);
        }
    });

    it('marks available encounter nodes as triggersCombat; rest nodes do not', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorldOn('bw-20') } });

        // With the quest nodes settled and the player on marker 2, the crane
        // quay bw-2 (an `encounter` in its pocket) is available and a combat
        // trigger.
        const vm = selectExplorationViewModel(store.getState());
        const bw2 = vm.nodes.find((n) => n.id === 'bw-2')!;
        expect(bw2.kind).toBe('available');
        expect(bw2.type).toBe('encounter');
        expect(bw2.triggersCombat).toBe(true);

        // On a new game the lighthouse bw-14 is an encounter too, but it sits
        // behind its quest marker: locked, so not a combat trigger.
        const fresh = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: createStartingWorld('breakwater') } });
        const bw14 = selectExplorationViewModel(fresh.getState()).nodes.find((n) => n.id === 'bw-14')!;
        expect(bw14.type).toBe('encounter');
        expect(bw14.kind).not.toBe('available');
        expect(bw14.triggersCombat).toBe(false);

        // The customs-house rest bw-9: available, and never a combat trigger.
        createAppActions(fresh).moveTo('bw-4');
        const vm2 = selectExplorationViewModel(fresh.getState());
        const bw9 = vm2.nodes.find((n) => n.id === 'bw-9')!;
        expect(bw9.kind).toBe('available');
        expect(bw9.type).toBe('rest');
        expect(bw9.triggersCombat).toBe(false);
    });

    it('encounter step-card icon is "sword", NOT "flee" — exploration-audit [3.5] DRIFT fix', () => {
        // Pre-fix the encounter step-card's iconKey was 'flee' (the
        // same glyph the combat modal uses for the FLEE button),
        // surfacing as "this step lets you flee" rather than
        // "this step starts combat". Pin the new mapping so a
        // future refactor doesn't silently revert.
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorldOn('bw-20') } });
        // The crane quay bw-2 (encounter) is a road away from marker 2 once
        // the quest nodes are settled.

        const vm = selectExplorationViewModel(store.getState());
        const encounterOption = vm.options.find((o) => o.nodeId === 'bw-2');
        expect(encounterOption).toBeDefined();
        // actions[i] mirrors options[i] order; find the matching action.
        const idx = vm.options.findIndex((o) => o.nodeId === 'bw-2');
        const encounterAction = vm.actions[idx];
        expect(encounterAction.iconKey).toBe('sword');
        expect(encounterAction.iconKey).not.toBe('flee');
    });
});

// ---------------------------------------------------------------------------
// moveTo action — happy path
// ---------------------------------------------------------------------------

describe('moveTo action: happy path', () => {
    it('marks the target completed, advances currentNodeId, and unlocks connected nodes', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: createStartingWorld('breakwater') } });
        const actions = createAppActions(store);

        const result = actions.moveTo('bw-4');

        expect(result).toEqual({ moved: true, currentNodeId: 'bw-4', locked: false });

        const vm = selectExplorationViewModel(store.getState());
        expect(vm.currentNodeId).toBe('bw-4');
        const byId = Object.fromEntries(vm.nodes.map((n) => [n.id, n]));
        expect(byId['bw-4'].kind).toBe('current');
        expect(store.getState().world.currentMap.completedNodes).toContain('bw-4');
        // The foothill pass's forward fan (bw-7 / bw-9) opens; the third
        // ring (bw-13) opens only once the player stands on the customs house.
        expect(byId['bw-7'].kind).toBe('available');
        expect(byId['bw-9'].kind).toBe('available');
        expect(byId['bw-13'].kind).toBe('locked');

        actions.moveTo('bw-9');
        const after = selectExplorationViewModel(store.getState());
        const byId2 = Object.fromEntries(after.nodes.map((n) => [n.id, n]));
        expect(byId2['bw-13'].kind).toBe('available');
        // The customs house's road to the second quest marker is the step-1
        // lock: standing there opens it in no list, and the tap is refused.
        expect(byId2['bw-20'].kind).toBe('locked');
        expect(store.getState().world.currentMap.availableNodes).not.toContain('bw-20');
        expect(actions.moveTo('bw-20').moved).toBe(false);
    });

    it('refreshes the options drawer with the new available nodes after a move', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: createStartingWorld('breakwater') } });
        const actions = createAppActions(store);

        actions.moveTo('bw-4'); // the foothill pass — gathering, completed on entry
        actions.moveTo('bw-9'); // the customs house — a rest, completed on entry

        const vm = selectExplorationViewModel(store.getState());
        const optionIds = vm.options.map((o) => o.nodeId).sort();
        // The road rule: the drawer offers the NEW nodes a road away from the
        // customs house. The pass behind it is walked (a road back, not an
        // option) and the road to marker 2 is still locked.
        expect(optionIds).toEqual(['bw-13']);
    });
});

// ---------------------------------------------------------------------------
// moveTo action — locked / invalid targets (Q5=B no-op)
// ---------------------------------------------------------------------------

describe('moveTo action: locked / invalid targets', () => {
    it('refuses to move to a locked node and leaves state untouched', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: createStartingWorld('breakwater') } });
        const actions = createAppActions(store);
        const before = store.getState();

        // The watchtower bw-17 is the last ring before the door — locked
        // from the windmill.
        const result = actions.moveTo('bw-17');

        expect(result.moved).toBe(false);
        expect(result.locked).toBe(true);
        expect(result.currentNodeId).toBe('bw-1');

        // The world slice is unchanged on a refused move.
        expect(store.getState().world).toBe(before.world);
    });

    it('refuses to move to a non-existent node', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        const actions = createAppActions(store);

        const result = actions.moveTo('not-a-real-node');

        expect(result.moved).toBe(false);
    });

    it('allows re-entering a reusable encounter node (gauntlet re-fight)', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorldOn('bw-21') } });
        const actions = createAppActions(store);

        // The sea fort bw-6 resolves to an engine `encounter` kind (in the
        // third step's pocket, the quest nodes settled), so it is not
        // completed on entry: walked off and back, it is owed again.
        actions.moveTo('bw-6');
        expect(actions.moveTo('bw-21').moved).toBe(true);
        const result = actions.moveTo('bw-6');

        expect(result.moved).toBe(true);
        expect(store.getState().world.currentMap.completedNodes).not.toContain('bw-6');
        expect(store.getState().world.currentMap.pendingArrival).toBe('bw-6');
    });

    it('exposes locked nodes through the VM so the screen can desaturate them', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });

        const vm = selectExplorationViewModel(store.getState());

        const locked = vm.nodes.filter((n) => n.kind === 'locked').map((n) => n.id);
        expect(locked.length).toBeGreaterThan(0);
        // Locked nodes never trigger combat — taps are a no-op (Q5=B).
        for (const n of vm.nodes) {
            if (n.kind === 'locked') expect(n.triggersCombat).toBe(false);
        }
    });
});

// ---------------------------------------------------------------------------
// Map transition
// ---------------------------------------------------------------------------

describe('changeMap action: map transition', () => {
    it('swaps the engine currentMap and resets currentNodeId to the new startingNode', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        const actions = createAppActions(store);

        actions.changeMap('charcoal-wood');

        const vm = selectExplorationViewModel(store.getState());
        expect(vm.mapId).toBe('charcoal-wood');
        expect(vm.currentNodeId).toBe('cw-1');
        expect(store.getState().world.currentMap.name).toBe('charcoal-wood');
    });

    it('loads the new layout fixture so node positions and labels update', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        const actions = createAppActions(store);

        actions.changeMap('charcoal-wood');

        const vm = selectExplorationViewModel(store.getState());
        const ids = vm.nodes.map((n) => n.id);
        expect(ids).toEqual(expect.arrayContaining(['cw-1', 'cw-2', 'cw-3']));
        expect(ids.every((id) => id.startsWith('cw-'))).toBe(true);
    });

    it('also accepts the MapState built from getMapDefinition+createMapState as a sanity hint', () => {
        // The action accepts a MapName string; this assertion proves the
        // engine still ships the expected map under that name. The
        // canonical build path is
        // `createMapState(getMapDefinition(continent, name))`; the returned
        // `MapState` carries the definition's `startingNode.id` as
        // `currentNode` on a fresh map.
        const map = createMapState(getMapDefinition('coastal-continent', 'charcoal-wood'));
        expect(map.name).toBe('charcoal-wood');
        expect(map.currentNode).toBe('cw-1');
    });
});

// ---------------------------------------------------------------------------
// Lifecycle — multi-step navigation
// ---------------------------------------------------------------------------

describe('exploration lifecycle: multi-step navigation', () => {
    it('encounter nodes stay reusable and unlock their engine neighbours', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorldOn('bw-21') } });
        const actions = createAppActions(store);

        actions.moveTo('bw-6'); // the sea fort — encounter, reusable, not completed
        fightOut(store);
        actions.moveTo('bw-21'); // marker 3, walked back across
        actions.moveTo('bw-7'); // the south pier — loot-cache, completed on entry

        const completed = store.getState().world.currentMap.completedNodes;
        // bw-6 is an engine `encounter` kind, so it does not complete on
        // entry (the fight settles it); the loot-cache bw-7 is a one-shot.
        expect(completed).not.toContain('bw-6');
        expect(completed).toContain('bw-7');

        const vm = selectExplorationViewModel(store.getState());
        const byId = Object.fromEntries(vm.nodes.map((n) => [n.id, n]));
        expect(byId['bw-7'].kind).toBe('current');
        // The shipwreck (bw-11) is the south pier's neighbour in the ENGINE
        // graph; the bridge sits behind the watchtower, which holds it until
        // the boss falls.
        expect(byId['bw-11'].kind).toBe('available');
        expect(byId['bw-18'].kind).toBe('locked');
    });

    /**
     * A move is a save checkpoint.
     *
     * Save granularity is a curated `DURABLE_ACTIONS` allowlist, and
     * `MOVE_TO_NODE` is ON it (`axiomancer-mechanics/src/Game/store.ts`). But
     * the engine allowlist is inert on mobile: `wrapDeflectingAdapter`
     * (`state/store.ts`) swallows EVERY engine autosave — durable ones
     * included — unless it is inside the explicit `store.save()` passthrough.
     * Mobile owns save timing, and a move is a checkpoint because
     * `moveToAction` (`state/actions.ts`) takes an explicit save. That
     * ownership is itself guarded by the case below.
     *
     * Without that checkpoint, a player who walked two nodes and reloaded is
     * put back where they started, with the walk and the opening quest gone.
     *
     * UI-tier actions still never write through; the UI-tier case further
     * below pins that.
     */
    it('a move IS a save checkpoint — mobile policy, at the Spec 09 Q4 / Phase 51 granularity', () => {
        const adapter = createMemoryAdapter();
        const store = createAppStore({ adapter, overrides: { world: bwWorldOn('bw-20') } });
        const actions = createAppActions(store);
        const saveSpy = jest.spyOn(adapter, 'save');

        actions.moveTo('bw-2');

        // Movement is hard-won progress. The write comes from the explicit
        // checkpoint in `moveToAction` (`state/actions.ts`) — NOT from
        // `MOVE_TO_NODE` being a DURABLE_ACTION, which mobile deflects.
        expect(saveSpy).toHaveBeenCalledTimes(1);

        // An explicit save still writes, and is not swallowed or coalesced away.
        actions.save();
        expect(saveSpy).toHaveBeenCalledTimes(2);
    });

    /**
     * The OWNERSHIP guard.
     *
     * The engine's `DURABLE_ACTIONS` allowlist does not reach
     * mobile at all: `wrapDeflectingAdapter` (`state/store.ts`) swallows
     * EVERY engine autosave, durable ones included, unless the wrapper is
     * inside the `store.save()` passthrough. Mobile owns save timing.
     *
     * Two directions this must stay red against, both of which are the
     * false belief becoming code:
     *   (a) drop the deflecting wrapper so the engine allowlist really does
     *       own mobile persistence — arm A starts writing;
     *   (b) drop the explicit save in `moveToAction` on the belief that
     *       `MOVE_TO_NODE` being on the allowlist already covers the walk —
     *       arm B stops writing, and a reload loses the walk.
     */
    it('mobile owns save timing: a DURABLE engine action is deflected, the explicit checkpoint writes', () => {
        // Arm A — the engine verb, straight through the engine reducer.
        // `MOVE_TO_NODE` IS on the engine's DURABLE_ACTIONS allowlist, so a
        // bare engine store would write here. On mobile it must not.
        const engineArm = createMemoryAdapter();
        const engineStore = createAppStore({ adapter: engineArm, overrides: { world: bwWorldOn('bw-20') } });
        const engineSpy = jest.spyOn(engineArm, 'save');

        engineStore.getState().moveToNode('bw-2');

        expect(engineSpy).not.toHaveBeenCalled();

        // Arm B — the mobile verb. The save a walk actually gets is the
        // explicit checkpoint `moveToAction` takes (`state/actions.ts`),
        // which is mobile policy, not the engine allowlist.
        const mobileArm = createMemoryAdapter();
        const mobileStore = createAppStore({ adapter: mobileArm, overrides: { world: bwWorldOn('bw-20') } });
        const mobileSpy = jest.spyOn(mobileArm, 'save');

        createAppActions(mobileStore).moveTo('bw-2');

        expect(mobileSpy).toHaveBeenCalledTimes(1);
    });

    it('a UI-tier action still does NOT write through (Spec 09 Path B)', () => {
        const adapter = createMemoryAdapter();
        const store = createAppStore({ adapter, overrides: { world: bwWorld() } });
        const actions = createAppActions(store);
        const saveSpy = jest.spyOn(adapter, 'save');

        // Dismissing an event card is presentation, not progress: this class
        // never reaches the disk.
        actions.dismissEvent();

        expect(saveSpy).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Engine parallel data-model (discoveredNodes / consumedNodes)
// ---------------------------------------------------------------------------

describe('moveTo action: engine discoveredNodes population (Phase 27)', () => {
    it('populates discoveredNodes with the moved-to node’s neighbours per engine MapDefinition', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        const actions = createAppActions(store);

        actions.moveTo('bw-2');

        const map = store.getState().world.currentMap;
        // discoveredNodes is the engine's new parallel field
        // populated via revealAdjacent. The engine reads neighbours
        // from getMapDefinition; bw-2's connected nodes per the
        // registered map should land here.
        expect(map.discoveredNodes.length).toBeGreaterThan(0);
        // availableNodes is populated too, for the screen.
        expect(map.availableNodes.length).toBeGreaterThan(0);
    });

    it('revealing the same neighbours twice is idempotent', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        const actions = createAppActions(store);

        actions.moveTo('bw-2');
        const after1 = [...store.getState().world.currentMap.discoveredNodes];
        // bw-3 is bw-2's lateral neighbour; both open the customs house bw-9.
        actions.moveTo('bw-3');
        const after2 = store.getState().world.currentMap.discoveredNodes;

        // discoveredNodes only grows; no duplicates after a second
        // move whose neighbours overlap the first move's neighbours.
        const unique = new Set(after2);
        expect(unique.size).toBe(after2.length);
        // The first set should be a subset of the second (or equal).
        for (const n of after1) {
            expect(after2).toContain(n);
        }
    });
});

describe('resolveCurrentMapEvent: engine consumedNodes population (Phase 27)', () => {
    it('marks the current node consumed when a non-none event resolves', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        const actions = createAppActions(store);
        // Walk to a node before resolving — the starting node may be a
        // 'none' kind in some fixtures. bw-5 is a loot cache: a fight would
        // stay unconsumed until it settles (the twin below).
        actions.moveTo('bw-5');
        const before = store.getState().world.currentMap.consumedNodes.length;

        const produced = actions.resolveCurrentMapEvent();

        const after = store.getState().world.currentMap.consumedNodes;
        // If an event was produced, consumedNodes grew by 1; if 'none'
        // (no event), it should NOT have grown.
        if (produced) {
            expect(after.length).toBe(before + 1);
            expect(after).toContain(store.getState().world.currentMap.currentNode);
        } else {
            expect(after.length).toBe(before);
        }
    });

    it('does NOT mark consumed when event.kind is “none”', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        const actions = createAppActions(store);
        // The starting node may or may not have an event pool. The
        // assertion is robust either way: if the produced-true branch
        // fires above, this second test re-runs with a different
        // node and checks the negative branch's invariant.
        const before = store.getState().world.currentMap.consumedNodes.length;
        const produced = actions.resolveCurrentMapEvent();
        const after = store.getState().world.currentMap.consumedNodes;
        if (!produced) {
            expect(after.length).toBe(before);
        }
    });

    it('leaves a fight\'s node unconsumed until the fight settles (R9a)', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorldOn('bw-20') } });
        const actions = createAppActions(store);
        actions.moveTo('bw-2');

        expect(actions.resolveCurrentMapEvent()).toBe(true);
        expect(store.getState().world.currentMap.consumedNodes).not.toContain('bw-2');

        actions.beginHazardEncounter();
        store.getState().endCombat('victory');

        expect(store.getState().world.currentMap.consumedNodes).toContain('bw-2');
        expect(store.getState().world.currentMap.availableNodes).toContain('bw-20');
    });
});

// ---------------------------------------------------------------------------
// Drawer copy moved to the VM (CRITIQUE [MED] pass 5 — Hard Rule #8)
// ---------------------------------------------------------------------------

describe('selectExplorationViewModel: drawer copy', () => {
    it('exposes a lowercase-ritual empty-state and swipe hint on the VM', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        const vm = selectExplorationViewModel(store.getState());

        expect(vm.drawerCopy.emptyMessage).toBe('walk the roads from where you stand — choose a glowing node, or tap a trodden one to walk back.');
        // CRITIQUE pass 8 MED drain: section title + LEAGUES column
        // label are presenter-sourced, not view-layer literals.
        expect(vm.drawerCopy.title).toBe('✠ WHITHER, PILGRIM?');
        expect(vm.drawerCopy.leaguesLabel).toBe('LEAGUES');
    });

    it('drops the prior sentence-case empty literal that mismatched the screen voice', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        const vm = selectExplorationViewModel(store.getState());

        // The empty message starts with neither a capital nor an article.
        expect(vm.drawerCopy.emptyMessage).not.toMatch(/^[A-Z]/);
        expect(vm.drawerCopy.emptyMessage).not.toContain('No paths remain');
    });
});

// ---------------------------------------------------------------------------
// LEAGUES bucket
//
// Each
// available next-step option carries a `leagues: 'I' | 'II' | 'III'`
// bucket derived from Euclidean distance on the canonical 360×400
// viewBox between the current node and the option node. Cutoffs:
// ≤80 = I, ≤160 = II, >160 = III.
// ---------------------------------------------------------------------------

describe('selectExplorationViewModel: LEAGUES bucket', () => {
    it('populates a non-empty leagues value (I | II | III) on every option', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        const vm = selectExplorationViewModel(store.getState());

        expect(vm.options.length).toBeGreaterThan(0);
        for (const opt of vm.options) {
            expect(['I', 'II', 'III']).toContain(opt.leagues);
        }
    });

    it('buckets options monotonically by distance from the current node', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        const vm = selectExplorationViewModel(store.getState());

        if (vm.options.length < 2) return;

        const current = vm.nodes.find((n) => n.id === vm.currentNodeId);
        expect(current).toBeDefined();
        if (!current) return;

        const distances = vm.options.map((opt) => {
            const node = vm.nodes.find((n) => n.id === opt.nodeId);
            return node ? Math.hypot(node.x - current.x, node.y - current.y) : 0;
        });

        // A smaller distance never gets a HIGHER league bucket than
        // a larger distance.
        const order: Record<'I' | 'II' | 'III', number> = { I: 1, II: 2, III: 3 };
        for (let i = 0; i < vm.options.length; i++) {
            for (let j = 0; j < vm.options.length; j++) {
                if (i === j) continue;
                if (distances[i] < distances[j]) {
                    expect(order[vm.options[i].leagues]).toBeLessThanOrEqual(
                        order[vm.options[j].leagues],
                    );
                }
            }
        }
    });

    it('respects the documented thresholds (≤80=I, ≤160=II, >160=III)', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        const vm = selectExplorationViewModel(store.getState());

        const current = vm.nodes.find((n) => n.id === vm.currentNodeId);
        if (!current) return;

        for (const opt of vm.options) {
            const node = vm.nodes.find((n) => n.id === opt.nodeId);
            if (!node) continue;
            const d = Math.hypot(node.x - current.x, node.y - current.y);
            if (d <= 80) expect(opt.leagues).toBe('I');
            else if (d <= 160) expect(opt.leagues).toBe('II');
            else expect(opt.leagues).toBe('III');
        }
    });
});

// ---------------------------------------------------------------------------
// Encounter seam
//
// Tapping an
// encounter / boss node populates the engine's pending event slice;
// <CombatGate> engages it when that slice carries
// `kind === 'combat-prelude'`. These tests pin the presenter-level
// behaviour the gate depends on.
// ---------------------------------------------------------------------------

import {
    selectEventViewModel,
    selectHasActiveEvent,
    selectHasActivePacedEvent,
    selectHasActiveCombatPrelude,
} from '@/state/presenters/event.engine';

describe('encounter seam (Tick D)', () => {
    function moveToFirstEncounter(): {
        store: ReturnType<typeof createAppStore>;
        actions: ReturnType<typeof createAppActions>;
        encounterNodeId: string | null;
    } {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        const actions = createAppActions(store);
        const vm = selectExplorationViewModel(store.getState());
        // Find the first available encounter / boss node in the starting
        // map. The seam fires the same way for both kinds; the test
        // doesn't depend on which.
        const target = vm.nodes.find(
            (n) => n.kind === 'available' && (n.type === 'encounter' || n.type === 'boss'),
        );
        if (target === undefined) {
            return { store, actions, encounterNodeId: null };
        }
        actions.moveTo(target.id);
        return { store, actions, encounterNodeId: target.id };
    }

    it('populates a combat-prelude event when the player arrives at an encounter node + resolves it', () => {
        const { store, actions, encounterNodeId } = moveToFirstEncounter();
        if (encounterNodeId === null) return; // map has no encounter; skip silently

        // Pre-resolve: pending event slice may or may not exist; the
        // contract is that AFTER resolveCurrentMapEvent fires, the
        // event VM kind is 'combat-prelude' for an encounter node.
        actions.resolveCurrentMapEvent();
        const state = store.getState();
        const hasEvent = selectHasActiveEvent(state as never);
        const vm = selectEventViewModel(state as never);

        expect(hasEvent).toBe(true);
        expect(vm.kind).toBe('combat-prelude');
        // Overlay mount condition lives on the screen
        // (`hasEvent && vm.kind === 'combat-prelude'`); pin both halves
        // so a future presenter rename of either symbol breaks the test
        // rather than silently un-mounting the overlay.
        expect(vm.preludeChrome).not.toBeNull();
    });

    it('fight choice dispatches startCombat + clears the pending event slice', () => {
        const { store, actions, encounterNodeId } = moveToFirstEncounter();
        if (encounterNodeId === null) return;
        actions.resolveCurrentMapEvent();

        expect(selectHasActiveEvent(store.getState() as never)).toBe(true);
        // The engine records the fight via `currentEncounter`.
        expect(store.getState().currentEncounter).toBeUndefined();

        actions.pickEventChoice('fight');

        // After fight: the engine records the encounter, pending event slice cleared.
        const after = store.getState();
        expect(after.currentEncounter).not.toBeUndefined();
        expect(selectHasActiveEvent(after as never)).toBe(false);
    });

    it('flee choice clears the pending event slice without entering combat', () => {
        const { store, actions, encounterNodeId } = moveToFirstEncounter();
        if (encounterNodeId === null) return;
        actions.resolveCurrentMapEvent();

        const vm = selectEventViewModel(store.getState() as never);
        const fleeChoice = vm.choices.find((c) => c.id === 'flee');
        if (fleeChoice === undefined || !fleeChoice.enabled) return; // boss-only path

        actions.pickEventChoice('flee');

        const after = store.getState();
        expect(after.currentEncounter).toBeUndefined();
        expect(selectHasActiveEvent(after as never)).toBe(false);
    });

    it('overlay mount condition is false when combat is already active (seam never re-opens mid-fight)', () => {
        const { store, actions, encounterNodeId } = moveToFirstEncounter();
        if (encounterNodeId === null) return;
        actions.resolveCurrentMapEvent();
        actions.pickEventChoice('fight');

        // After fight commits, `pickEventChoice('fight')` has cleared the
        // pending event slice, so `selectHasActiveEvent` is false and the
        // overlay never re-mounts.
        expect(selectHasActiveEvent(store.getState() as never)).toBe(false);
    });
});

/**
 * FE-008 — the map legend must use the same word for a locked node as the
 * counter beside it, the tap-tip, and the node's accessible name. It said
 * SHUT while everything else said sealed.
 */
describe('FE-008: legend and counter agree on SEALED', () => {
    it('uses one word for the locked state across the legend strip', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        const vm = selectExplorationViewModel(store.getState());
        expect(vm.legend.left).toContain('SEALED');
        expect(vm.legend.left).not.toContain('SHUT');
        expect(vm.legend.right).toMatch(/sealed/);
    });
});

/**
 * BUG-01 — the legend must count the same set of nodes the map draws.
 *
 * The PIPS come from `classifyNode`; `world.currentMap.lockedNodes` is a
 * different source. The start node is where they part — it is never in
 * `lockedNodes` (you begin standing on it), but once you walk away it is
 * neither `reachable` nor `completed`, so the renderer calls it sealed while
 * the engine's lock list does not. These cases pin label against pips
 * directly rather than against either source.
 */
describe('BUG-01: the legend counts the nodes the map actually draws', () => {
    /** Pull the two numbers out of "N nodes · M sealed". */
    const readCounter = (right: string) => {
        const m = /^(\d+) nodes · (\d+) sealed$/.exec(right);
        if (!m) throw new Error(`legend counter not in the expected shape: ${right}`);
        return { nodes: Number(m[1]), sealed: Number(m[2]) };
    };

    it('agrees with the pips on a fresh map', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        const vm = selectExplorationViewModel(store.getState());
        const counter = readCounter(vm.legend.right);

        expect(counter.nodes).toBe(vm.nodes.length);
        expect(counter.sealed).toBe(vm.nodes.filter((n) => n.kind === 'locked').length);
    });

    it('still agrees after the player walks away from the start node', () => {
        // THE REGRESSION: this is the step that splits the two sources. The
        // start node stops being reachable, was never completed, and was never
        // in `lockedNodes` — so it is a sealed pip the lock list misses.
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        const actions = createAppActions(store);
        actions.moveTo('bw-2');

        const vm = selectExplorationViewModel(store.getState());
        const counter = readCounter(vm.legend.right);

        expect(counter.nodes).toBe(vm.nodes.length);
        expect(counter.sealed).toBe(vm.nodes.filter((n) => n.kind === 'locked').length);
    });

    it('agrees again after a second move', () => {
        // Cheap insurance that the agreement is structural, not a coincidence
        // that happens to hold at one position.
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        const actions = createAppActions(store);
        actions.moveTo('bw-2');
        actions.moveTo('bw-9'); // the customs house, one of bw-2's forward fan

        const vm = selectExplorationViewModel(store.getState());
        const counter = readCounter(vm.legend.right);

        expect(counter.nodes).toBe(vm.nodes.length);
        expect(counter.sealed).toBe(vm.nodes.filter((n) => n.kind === 'locked').length);
    });
});

// ---------------------------------------------------------------------------
// The arrival the map still owes you
// ---------------------------------------------------------------------------

describe('selectExplorationViewModel: arrivalPending', () => {
    it('still owes an encounter arrival that the player never answered', () => {
        // A move checkpoints BEFORE its arrival resolves (`moveToAction`
        // saves, then the screen calls `resolveCurrentMapEvent`), so a reload
        // taken during the prelude rebuilds the app standing on the node with
        // the fight unanswered. The move recorded the debt as `pendingArrival`
        // and that record rides the save — this flag is how the screen reads
        // it back.
        const adapter = createMemoryAdapter();
        const store = createAppStore({ adapter, overrides: { world: bwWorldOn('bw-21') } });
        const actions = createAppActions(store);
        actions.moveTo('bw-6'); // engine kind `encounter`

        const reloaded = createAppStore({ adapter });

        expect(reloaded.getState().world.currentMap.currentNode).toBe('bw-6');
        expect(selectExplorationViewModel(reloaded.getState()).arrivalPending).toBe(true);
    });

    it('owes nothing once the arrival has been answered', () => {
        // The negative twin: answering clears `pendingArrival`, so an
        // answered arrival is never re-offered, here or after a reload. For
        // a fight the answer is the fight's end, not the resolve.
        const adapter = createMemoryAdapter();
        const store = createAppStore({ adapter, overrides: { world: bwWorldOn('bw-21') } });
        const actions = createAppActions(store);
        actions.moveTo('bw-6');
        actions.resolveCurrentMapEvent();
        expect(selectExplorationViewModel(store.getState()).arrivalPending).toBe(true);
        actions.beginHazardEncounter();
        store.getState().endCombat('victory');
        actions.save();

        expect(store.getState().world.currentMap.consumedNodes).toContain('bw-6');
        expect(selectExplorationViewModel(store.getState()).arrivalPending).toBe(false);
        expect(selectExplorationViewModel(createAppStore({ adapter }).getState()).arrivalPending)
            .toBe(false);
    });

    it('owes nothing for a node the player was PLACED on', () => {
        // Row 3.1 follow-up, and the defect that shipped with row 3.1: being
        // placed on a node is not the same as arriving at it. `placeOnNode`
        // (state fixtures, `/dev` JUMP) stands the player anywhere and
        // deliberately UN-consumes the node so its content stays live — so
        // "the node under the player is unconsumed and has a pool" read every
        // placement as an unanswered arrival. The map screen paid it on
        // mount, and `/exploration?fixture=sage-bw-door-gate` engaged the
        // boss fight instead of drawing the map. A placement writes no debt.
        // Stage: the Breakwater's door fight at the watchtower (bw-17).
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        expect(jumpToNode(store, 'bw-17')).toBe(true);

        const vm = selectExplorationViewModel(store.getState());
        const map = store.getState().world.currentMap;

        expect(vm.currentNodeId).toBe('bw-17');
        // The conditions the old inference fired on are all still true ...
        expect(map.consumedNodes).not.toContain('bw-17');
        expect(getNodeEventPool(map.continent, map.name, 'bw-17')).not.toBeUndefined();
        // ... and nothing is owed, because nobody walked here.
        expect(vm.arrivalPending).toBe(false);
        expect(vm.startNodePending).toBe(false);
    });

    it('owes a travel door the player walked onto, and the crossing answers it', () => {
        // A door is deliberately never consumed ("a door is repeatable" —
        // `resolve-map-event.ts`), so consumption cannot say whether it has
        // been answered. The record can: walking onto the door owes it (a
        // reload here should still cross, not strand the player standing on
        // a door), and resolving it clears the debt on the map being LEFT,
        // before the crossing files that map away — otherwise returning
        // through the door would cross again with no input.
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: bwWorld() } });
        const actions = createAppActions(store);
        const world = store.getState().world;
        // bw-18 (the river bridge) is the Charcoal Wood door. Walk onto it
        // from its neighbour, the watchtower bw-17, rather than jumping, so
        // this is a real arrival.
        store.setState({
            world: {
                ...world,
                currentMap: {
                    ...world.currentMap,
                    currentNode: 'bw-17',
                    // The watchtower beaten: it holds the bridge until then.
                    consumedNodes: [...world.currentMap.consumedNodes, 'bw-17'],
                },
            },
        });
        expect(actions.moveTo('bw-18').moved).toBe(true);

        expect(selectExplorationViewModel(store.getState()).arrivalPending).toBe(true);

        actions.resolveCurrentMapEvent();

        // The crossing happened, and the departed map no longer owes the door.
        const after = store.getState().world;
        expect(after.currentMap.name).not.toBe('breakwater');
        expect(after.mapStates?.['breakwater']?.pendingArrival ?? null).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Walking the roads (phase WR1a): the engine's legal moves gate the map
// ---------------------------------------------------------------------------

describe('walking the roads: the map offers the open roads out of the node underfoot', () => {
    it('marks only the road neighbours available; a node across the map draws locked', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: createStartingWorld('breakwater') } });
        const actions = createAppActions(store);
        actions.moveTo('bw-4');
        actions.moveTo('bw-9');
        const byId = Object.fromEntries(selectExplorationViewModel(store.getState()).nodes.map((n) => [n.id, n]));
        // bw-5 and bw-7 touch walked nodes but not the customs house.
        expect(byId['bw-13'].kind).toBe('available');
        expect(byId['bw-5'].kind).toBe('locked');
        expect(byId['bw-7'].kind).toBe('locked');
        expect(byId['bw-5'].walkable).toBe(false);
    });

    it('moveTo refuses a node off the roads, even one a frontier-era list still names', () => {
        const fresh = createStartingWorld('breakwater');
        const stale: WorldState = {
            ...fresh,
            currentMap: { ...fresh.currentMap, availableNodes: [...fresh.currentMap.availableNodes, 'bw-7', 'bw-9'] },
        };
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: stale } });
        const before = store.getState().world;
        expect(createAppActions(store).moveTo('bw-7').moved).toBe(false);
        expect(store.getState().world).toBe(before);
    });

    it('a walked neighbour stays drawn walked, is marked walkable, and moves the player back with nothing offered', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: createStartingWorld('breakwater') } });
        const actions = createAppActions(store);
        actions.moveTo('bw-4');
        actions.resolveCurrentMapEvent();
        actions.moveTo('bw-9');
        const vm = selectExplorationViewModel(store.getState());
        const bw4 = vm.nodes.find((n) => n.id === 'bw-4')!;
        expect(bw4.kind).toBe('completed');
        expect(bw4.walkable).toBe(true);
        // A walk back is not a confirm-panel option.
        expect(vm.options.map((o) => o.nodeId)).not.toContain('bw-4');

        expect(actions.moveTo('bw-4').moved).toBe(true);
        expect(store.getState().world.currentMap.currentNode).toBe('bw-4');
        expect(store.getState().world.currentMap.availableNodes).toEqual(['bw-1', 'bw-5', 'bw-7', 'bw-9']);
    });
});

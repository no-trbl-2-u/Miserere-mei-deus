/**
 * Hermetic E2E Tests — THE APORIA (W-01) labyrinth store flow.
 *
 * Drives the labyrinth through the store action layer against the
 * real engine content: enter → arrival narration → walk → inspect
 * (fragments, secrets, baited clues) → gate refusal/assent → hints
 * and debt → waystone/ejection → the naming rite → exit restore.
 *
 * Arrival events roll the act's weighted pool through the GLOBAL rng;
 * tests that walk rooms first quiet the house (pre-consume every room
 * — "solved space is solved") so no random minigame launches muddy
 * the assertions. Baited clues and authored overrides (entrances,
 * the Oubliette) are deterministic and stay live.
 */

import { describe, expect, it } from '@jest/globals';
import type { GameState } from '@mechanics';
import { debtPoints, getAporiaAct } from '@mechanics';

import { createAppActions, type AppActions } from '@/state/actions';
import { labyrinthProgressOf } from '@/state/labyrinth/store-actions';
import {
    buildFogMap,
    selectLabyrinthFinaleViewModel,
    selectLabyrinthViewModel,
} from '@/state/presenters/labyrinth.engine';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

function makeStoreAndActions(): { store: AppStore; actions: AppActions } {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    return { store, actions: createAppActions(store) };
}

function gs(store: AppStore): GameState {
    return store.getState() as unknown as GameState;
}

function currentNode(store: AppStore): string {
    return store.getState().world.currentMap.currentNode;
}

/** Pre-consume every room so arrivals resolve to `none` (solved space). */
function quietHouse(store: AppStore): void {
    const session = store.getState().labyrinthUi.session;
    if (!session) throw new Error('quietHouse needs an active labyrinth session');
    const act = getAporiaAct(session.actId);
    const world = store.getState().world;
    store.setState({
        world: {
            ...world,
            currentMap: {
                ...world.currentMap,
                consumedNodes: [
                    ...new Set([
                        ...world.currentMap.consumedNodes,
                        ...act.rooms.map((r) => r.nodeId),
                    ]),
                ],
            },
        },
        event: { pending: null, dialogueCursor: null, history: [], sourceNodeType: null },
    } as never);
}

describe('labyrinth store flow — enter / walk / exit', () => {
    it('enter swaps to the act map, resolves the entrance line, and exit restores the overworld', () => {
        const { store, actions } = makeStoreAndActions();
        const overworldMap = store.getState().world.currentMap.name;

        actions.enterLabyrinth('act1');
        expect(store.getState().world.currentMap.name).toBe('aporia-colonnade');
        expect(currentNode(store)).toBe('ap1-1');
        // Entrances play a one-line cutscene (authored override) → paced event pending.
        expect(store.getState().event.pending?.event.kind).toBe('cutscene');
        // The entry room is solved on arrival.
        expect(store.getState().world.currentMap.consumedNodes).toContain('ap1-1');

        actions.exitLabyrinth();
        expect(store.getState().world.currentMap.name).toBe(overworldMap);
        expect(store.getState().labyrinthUi.session).toBeNull();
    });

    it('walking records the directed edge and refuses non-doors', () => {
        const { store, actions } = makeStoreAndActions();
        actions.enterLabyrinth('act1');
        quietHouse(store);

        expect(actions.labyrinthMove('ap1-2')).toBe(true);
        expect(currentNode(store)).toBe('ap1-2');
        expect(labyrinthProgressOf(gs(store)).walkedEdges).toContain('ap1-1->ap1-2');

        // The boss antechamber is not adjacent to ap1-2.
        expect(actions.labyrinthMove('ap1-15')).toBe(false);
        expect(currentNode(store)).toBe('ap1-2');
    });
});

describe('labyrinth store flow — inspection', () => {
    it('a fragment POI yields its word once (pocket + one-shot)', () => {
        const { store, actions } = makeStoreAndActions();
        actions.enterLabyrinth('act1');
        quietHouse(store);
        actions.labyrinthMove('ap1-2');

        const first = actions.labyrinthInspect('strapped-column');
        expect(first?.fragmentWord).toBe('THE');
        expect(labyrinthProgressOf(gs(store)).pocket.map((f) => f.word)).toContain('THE');

        const again = actions.labyrinthInspect('strapped-column');
        expect(again?.fragmentWord).toBeNull();
        expect(labyrinthProgressOf(gs(store)).pocket).toHaveLength(1);
    });

    it('a baited clue (encounter) seeds the combat-prelude event once', () => {
        const { store, actions } = makeStoreAndActions();
        actions.enterLabyrinth('act1');
        quietHouse(store);
        actions.labyrinthMove('ap1-9'); // the fountain court (loop realm)

        const outcome = actions.labyrinthInspect('fountain');
        expect(outcome?.trap).toBe('encounter');
        const pending = store.getState().event.pending;
        expect(pending?.event.kind).toBe('encounter');
        if (pending?.event.kind === 'encounter') {
            expect(pending.event.encounter.enemies.length).toBeGreaterThan(0);
            expect(pending.event.isBoss).toBe(false);
        }
        expect(store.getState().event.sourceNodeType).toBe('labyrinth-trap');

        // One-shot: re-inspection is just the remark.
        store.setState({
            event: { pending: null, dialogueCursor: null, history: [], sourceNodeType: null },
        } as never);
        const again = actions.labyrinthInspect('fountain');
        expect(again?.trap).toBeNull();
        expect(store.getState().event.pending).toBeNull();
    });

    it('a baited clue (hazard) launches the hazard minigame', () => {
        const { store, actions } = makeStoreAndActions();
        actions.enterLabyrinth('act1');
        quietHouse(store);
        actions.labyrinthMove('ap1-9');
        actions.labyrinthMove('ap1-12'); // the cistern walk (black water)

        expect(store.getState().hazard.session).toBeNull();
        const outcome = actions.labyrinthInspect('black-water');
        expect(outcome?.trap).toBe('hazard');
        expect(store.getState().hazard.session).not.toBeNull();
    });

    it('a secret-door POI reveals the walkable edge', () => {
        const { store, actions } = makeStoreAndActions();
        actions.enterLabyrinth('act1');
        quietHouse(store);
        actions.labyrinthMove('ap1-2');
        actions.labyrinthMove('ap1-3');
        actions.labyrinthMove('ap1-4');

        // The secret door to ap1-5 is invisible until revealed.
        expect(actions.labyrinthMove('ap1-5')).toBe(false);
        const revealed = actions.labyrinthInspect('relief-of-a-stair');
        expect(revealed?.revealedDisplay).toBe('17');
        expect(actions.labyrinthMove('ap1-5')).toBe(true);
    });
});

describe('labyrinth store flow — the gate and the ledger', () => {
    it('refuses a wrong order (ledgered), opens on the honest words', () => {
        const { store, actions } = makeStoreAndActions();
        actions.enterLabyrinth('act1');
        quietHouse(store);

        // Collect the four honest words along the true path:
        // THE (ap1-2), ONE (ap1-3), YOU (ap1-5, behind the secret), WALK (ap1-7).
        actions.labyrinthMove('ap1-2');
        actions.labyrinthInspect('strapped-column');
        actions.labyrinthMove('ap1-3');
        actions.labyrinthInspect('intact-plinth');
        actions.labyrinthMove('ap1-4');
        actions.labyrinthInspect('relief-of-a-stair');
        actions.labyrinthMove('ap1-5');
        actions.labyrinthInspect('clouded-mirror');
        actions.labyrinthMove('ap1-7');
        actions.labyrinthInspect('worn-boots');
        actions.labyrinthMove('ap1-5');
        actions.labyrinthMove('ap1-6'); // the Gate of Assent

        const vm = selectLabyrinthViewModel(store.getState());
        expect(vm.kind).toBe('room');
        if (vm.kind !== 'room') return;
        expect(vm.room.gate?.socketCount).toBe(4);
        expect(vm.room.pocket.map((c) => c.word)).toEqual(['THE', 'ONE', 'YOU', 'WALK']);

        // Gated door refuses before assent.
        expect(actions.labyrinthMove('ap1-8')).toBe(false);

        const before = debtPoints(labyrinthProgressOf(gs(store)));
        const wrong = actions.labyrinthSubmitGate(['WALK', 'YOU', 'ONE', 'THE']);
        expect(wrong?.ok).toBe(false);
        expect(debtPoints(labyrinthProgressOf(gs(store)))).toBe(before + 1);

        const right = actions.labyrinthSubmitGate(['THE', 'ONE', 'YOU', 'WALK']);
        expect(right?.ok).toBe(true);
        expect(actions.labyrinthMove('ap1-8')).toBe(true);
    });
});

describe('labyrinth store flow — hints and debt', () => {
    it('charges coin at engine prices and refuses when broke', () => {
        const { store, actions } = makeStoreAndActions();
        actions.enterLabyrinth('act1');
        const state = gs(store);
        store.setState({ player: { ...state.player, currency: 12 } } as never);

        const bought = actions.labyrinthBuyHint(1); // tier 1 base price 10
        expect(bought).not.toBeNull();
        expect(gs(store).player.currency).toBe(2);
        expect(debtPoints(labyrinthProgressOf(gs(store)))).toBe(1);

        // Second nudge costs 20 — unaffordable at 2 coin.
        expect(actions.labyrinthBuyHint(1)).toBeNull();
        expect(gs(store).player.currency).toBe(2);
    });
});

describe('labyrinth store flow — act III arrivals', () => {
    it('activates the entry waystone before the arrival event', () => {
        const { store, actions } = makeStoreAndActions();
        actions.enterLabyrinth('act3');
        expect(labyrinthProgressOf(gs(store)).waystones).toContain('ap3-1');
        expect(store.getState().labyrinthUi.session?.arrivalNote).toBe('waystone');
    });

    it('the Oubliette ejects back to the last waystone', () => {
        const { store, actions } = makeStoreAndActions();
        actions.enterLabyrinth('act3');
        const act = getAporiaAct('act3');
        const oubliette = act.rooms.find((r) => r.eject)!;
        const anteRoom = act.rooms.find((r) =>
            r.doors.some((d) => !d.secret && d.to === oubliette.nodeId))!;
        // Stand in the ante-room (walk history irrelevant here), then
        // take the real door so arrival rules fire.
        const world = store.getState().world;
        store.setState({
            world: {
                ...world,
                currentMap: { ...world.currentMap, currentNode: anteRoom.nodeId },
            },
        } as never);
        expect(actions.labyrinthMove(oubliette.nodeId)).toBe(true);
        // Ejected: back at the last waystone (the entry stone).
        expect(currentNode(store)).toBe('ap3-1');
        expect(store.getState().labyrinthUi.session?.arrivalNote).toBe('ejected');
    });
});

describe('labyrinth store flow — the naming rite', () => {
    it('a wrong name is refused; the true name spares and completes the maze', () => {
        const { store, actions } = makeStoreAndActions();
        actions.enterLabyrinth('act3');
        // Stand in the boss room (the finale panel gates the fight).
        const act = getAporiaAct('act3');
        const world = store.getState().world;
        store.setState({
            world: {
                ...world,
                currentMap: { ...world.currentMap, currentNode: act.bossRoom },
            },
        } as never);

        const finale = selectLabyrinthFinaleViewModel(store.getState());
        expect(finale?.isFinale).toBe(true);
        expect(finale?.namingOpen).toBe(true);

        expect(actions.labyrinthSpeakName('FURNITURE')).toBe(false);
        expect(actions.labyrinthSpeakName('protas')).toBe(true);

        const progress = labyrinthProgressOf(gs(store));
        expect(progress.bossOutcomes.act3).toBe('spared');
        expect(progress.completed).toBe(true);
        expect(selectLabyrinthViewModel(store.getState()).kind).toBe('complete');
    });
});

describe('fog-of-war map layout', () => {
    it('lays rooms from walk history only, edges directed as walked', () => {
        const { store, actions } = makeStoreAndActions();
        actions.enterLabyrinth('act1');
        quietHouse(store);
        actions.labyrinthMove('ap1-2');
        actions.labyrinthMove('ap1-1'); // walk back — reverse edge
        actions.labyrinthMove('ap1-9');

        const act = getAporiaAct('act1');
        const map = buildFogMap(act, labyrinthProgressOf(gs(store)), currentNode(store));
        expect(map.rooms.map((r) => r.nodeId).sort()).toEqual(['ap1-1', 'ap1-2', 'ap1-9']);
        // Three directed edges walked (1→2, 2→1, 1→9).
        expect(map.edges).toHaveLength(3);
        expect(map.rooms.find((r) => r.current)?.nodeId).toBe('ap1-9');
    });
});

/**
 * Hermetic E2E — the main-menu store actions (`state/menu/store-actions.ts`)
 * over the in-memory slot store: NEW GAME, LOAD GAME, CONTINUE and the
 * store hydration they share.
 */

import { describe, expect, it } from '@jest/globals';
import {
    CHARACTER_GREY_DECK, createNewGameState, getEquippedItems, getRng,
    type CharacterDefinition, type GameState,
} from '@mechanics';

import {
    continueGameAction,
    hydrateStoreWithGameState,
    loadGameAction,
    returnToTitleAction,
    startNewGameAction,
} from '@/state/menu/store-actions';
import { createMemorySlotStore } from '@/state/persistence/memorySlotStore';
import { EMPTY_HAZARD_SLICE, createAppStore, type AppStore } from '@/state/store';

function savedState(name: string, level = 1, rngState = 7): GameState {
    const s = createNewGameState({ characterId: 'the-chosen' });
    return { ...s, rngState, player: { ...s.player, name, level } };
}

function makeStore(adapter = createMemorySlotStore()): AppStore {
    return createAppStore({ adapter });
}

describe('hydrateStoreWithGameState', () => {
    it('swaps the engine state in and resets every mobile slice', () => {
        const store = makeStore();
        // Dirty a mobile slice and an optional engine field first.
        store.setState({
            hazard: { session: { fake: true } as never },
            currentEncounter: { enemies: [] } as never,
            _recentEvents: [{ type: 'x' } as never],
        });

        const next = savedState('Loaded', 4);
        hydrateStoreWithGameState(store, next);

        const state = store.getState();
        expect(state.player.name).toBe('Loaded');
        expect(state.player.level).toBe(4);
        expect(state.runId).toBe(next.runId);
        expect(state.hazard).toBe(EMPTY_HAZARD_SLICE);
        expect(state.currentEncounter).toBeUndefined();
        expect(state._recentEvents).toEqual([]);
        // The store's own verbs survive the swap.
        expect(typeof state.save).toBe('function');
    });

    it('restores the engine RNG from the loaded state', () => {
        const store = makeStore();
        hydrateStoreWithGameState(store, savedState('Seeded', 1, 123456));
        expect(getRng().getState()).toBe(123456);
    });
});

describe('startNewGameAction — NEW GAME', () => {
    it('selects the slot, seeds THE VERY START, and saves at once', () => {
        const slots = createMemorySlotStore();
        const store = makeStore(slots);
        store.setState({ player: { ...store.getState().player, name: 'Stale', level: 9 } });

        const fresh = startNewGameAction(store, slots, 2, undefined, 'the-chosen');

        expect(slots.getActiveSlot()).toBe(2);
        expect(slots.saveCount).toBe(1);
        expect(slots.readSlot(2)?.runId).toBe(fresh.runId);
        const player = store.getState().player;
        expect(player.level).toBe(1);
        expect(player.inventory.map(i => i.id)).toEqual(['weapon-opening-blade', 'armor-bracing-coat']);
        expect(player.currency).toBe(0);
        expect(player.experience).toBe(0);
        expect(slots.listSlots()[1]?.status).toBe('saved');
    });

    it('two new games get distinct runs', () => {
        const slots = createMemorySlotStore();
        const store = makeStore(slots);
        const a = startNewGameAction(store, slots, 1, undefined, 'the-chosen');
        const b = startNewGameAction(store, slots, 3, undefined, 'the-chosen');
        expect(a.runId).not.toBe(b.runId);
        expect(slots.readSlot(1)?.runId).toBe(a.runId);
        expect(slots.readSlot(3)?.runId).toBe(b.runId);
    });

    it('with a character, writes that character\'s run to the slot', () => {
        const fixture: CharacterDefinition = {
            id: 'fixture-knight',
            name: 'Fixture Knight',
            portraitKey: 'portrait-1',
            startingRelicId: 'relic-bleeding-signet',
            baseStats: { heart: 5, body: 7, mind: 3 },
            startingLaneIds: ['lane-x', 'lane-y'],
            startingCardIds: ['card-x', 'card-y', 'card-z'],
            playstyle: 'Bleeds to win.',
        };
        const slots = createMemorySlotStore();
        const store = makeStore(slots);

        startNewGameAction(store, slots, 2, undefined, fixture.id, [fixture]);

        const saved = slots.readSlot(2)?.player;
        expect(saved?.characterId).toBe('fixture-knight');
        expect(saved?.startingLaneIds).toEqual(['lane-x', 'lane-y']);
        expect(saved?.baseStats).toEqual({ heart: 5, body: 7, mind: 3 });
        expect(getEquippedItems(saved!.equipment).map(p => p.id)).toEqual(['weapon-opening-blade', 'armor-bracing-coat', 'relic-bleeding-signet']);
        expect(saved?.knownCards).toEqual([...CHARACTER_GREY_DECK, 'card-x', 'card-y', 'card-z']);
        expect(store.getState().player.characterId).toBe('fixture-knight');
    });

    it('without a character it throws and writes nothing', () => {
        const slots = createMemorySlotStore();
        const store = makeStore(slots);
        expect(() => startNewGameAction(store, slots, 1)).toThrow(/characterId/);
        expect(slots.readSlot(1)).toBeNull();
    });

    it('the Chosen starts with a reward pool that is not empty', () => {
        const slots = createMemorySlotStore();
        const store = makeStore(slots);
        startNewGameAction(store, slots, 1, undefined, 'the-chosen');
        const saved = slots.readSlot(1)!.player;
        expect(saved.characterId).toBe('the-chosen');
        expect(saved.startingLaneIds).toEqual(['defender', 'blood-price']);
        expect(getEquippedItems(saved.equipment).map(p => p.id)).toEqual(['weapon-opening-blade', 'armor-bracing-coat', 'relic-disarming-plea']);
    });

    it('a save made before characters is never loaded or continued', () => {
        const old = createNewGameState();
        const legacy = { ...old, player: { ...old.player, characterId: undefined } } as GameState;
        const slots = createMemorySlotStore({ initial: { 2: { state: legacy, savedAt: 99 } } });
        const store = makeStore(slots);
        expect(loadGameAction(store, slots, 2)).toBe(false);
        expect(continueGameAction(store, slots)).toBe(false);
    });
});

describe('loadGameAction — LOAD GAME', () => {
    it('loads a saved slot into the store and makes it active', () => {
        const slots = createMemorySlotStore({
            initial: { 3: { state: savedState('Third', 5), savedAt: 10 } },
        });
        const store = makeStore(slots);

        expect(loadGameAction(store, slots, 3)).toBe(true);
        expect(slots.getActiveSlot()).toBe(3);
        expect(store.getState().player.name).toBe('Third');
        expect(store.getState().player.level).toBe(5);
    });

    it('refuses an empty slot and changes nothing', () => {
        const slots = createMemorySlotStore({ activeSlot: 1 });
        const store = makeStore(slots);
        const before = store.getState().player;

        expect(loadGameAction(store, slots, 2)).toBe(false);
        expect(slots.getActiveSlot()).toBe(1);
        expect(store.getState().player).toBe(before);
    });
});

describe('continueGameAction — CONTINUE', () => {
    it('resumes the most recently written slot', () => {
        const slots = createMemorySlotStore({
            initial: {
                1: { state: savedState('Old', 2), savedAt: 100 },
                2: { state: savedState('Newest', 3), savedAt: 300 },
                3: { state: savedState('Middle', 4), savedAt: 200 },
            },
        });
        const store = makeStore(slots);

        expect(continueGameAction(store, slots)).toBe(true);
        expect(slots.getActiveSlot()).toBe(2);
        expect(store.getState().player.name).toBe('Newest');
    });

    it('is false with nothing saved', () => {
        const slots = createMemorySlotStore();
        const store = makeStore(slots);
        expect(continueGameAction(store, slots)).toBe(false);
        expect(slots.getActiveSlot()).toBeNull();
    });
});

describe('returnToTitleAction', () => {
    it('saves into the active slot and flushes', async () => {
        const slots = createMemorySlotStore({ activeSlot: 1 });
        let flushed = 0;
        const withFlush = { ...slots, flush: async () => { flushed += 1; } };
        const store = makeStore(slots);
        store.setState({ player: { ...store.getState().player, name: 'Leaving' } });

        await returnToTitleAction(store, withFlush);

        expect(slots.readSlot(1)?.player.name).toBe('Leaving');
        expect(flushed).toBe(1);
    });
});

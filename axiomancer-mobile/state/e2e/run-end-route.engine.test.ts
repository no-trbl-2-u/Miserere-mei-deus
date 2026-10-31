/**
 * Hermetic E2E — a run end opens character select for the slot (phase CH1i):
 * the run-over state the store holds after a second death or a Labyrinth
 * defeat, its route, the save that survives a reload, and CONFIRM's codex carry.
 */

import { describe, expect, it } from '@jest/globals';
import { createNewGameState } from '@mechanics';

import { createAppActions } from '@/state/actions';
import { loadGameAction, startNewGameAction } from '@/state/menu/store-actions';
import { createMemorySlotStore } from '@/state/persistence/memorySlotStore';
import { entryRoute, isRunOver, runEndRoute } from '@/state/run-end';
import { createAppStore } from '@/state/store';

function startedRun() {
    const slots = createMemorySlotStore();
    const store = createAppStore({ adapter: slots });
    startNewGameAction(store, slots, 1, undefined, 'the-chosen');
    return { slots, store, actions: createAppActions(store) };
}

describe('run-end routes', () => {
    it('names character select for the slot, or the slot list with no slot', () => {
        expect(runEndRoute(2)).toBe('/character-select?slot=2&runEnd=1');
        expect(runEndRoute(null)).toBe('/saves?mode=new');
    });

    it('entryRoute sends a run-over state to character select and any other to the fallback', () => {
        const run = createNewGameState({ characterId: 'the-chosen' });
        expect(entryRoute(run, 1, '/exploration')).toBe('/exploration');
        expect(entryRoute({ runOver: true }, 1, '/exploration')).toBe(runEndRoute(1));
        expect(isRunOver(run)).toBe(false);
    });
});

describe('a run end in the app store', () => {
    it('a second death leaves the run-over state, saved to the slot', () => {
        const { slots, store, actions } = startedRun();
        expect(actions.playerDied('fight')).toBe('revived');
        expect(store.getState().runOver).toBeUndefined();
        expect(actions.playerDied('fight')).toBe('run-over');

        expect(store.getState().runOver).toBe(true);
        expect(store.getState().player.characterId).toBeUndefined();
        expect(slots.readSlot(1)?.runOver).toBe(true);
        expect(slots.listSlots()[0].runOver).toBe(true);
    });

    it('a Labyrinth defeat (resetRun without keeping the character) is the same run end', () => {
        const { store, actions } = startedRun();
        actions.enterLabyrinth('act1');
        actions.resetRun({ keepCharacter: false });
        expect(store.getState().runOver).toBe(true);
        expect(store.getState().player.characterId).toBeUndefined();
        expect(store.getState().labyrinthUi?.session ?? null).toBeNull();
    });

    it('a reload loads the run-over slot, and starting the Chosen from it keeps the codex and clears the marker', () => {
        const { slots, store, actions } = startedRun();
        store.setState({ codex: { unlockedEntries: ['seen-it'] } } as never);
        actions.playerDied('fight');
        actions.playerDied('fight');
        store.getState().save();

        const reloaded = createAppStore({ adapter: slots });
        expect(loadGameAction(reloaded, slots, 1)).toBe(true);
        expect(reloaded.getState().runOver).toBe(true);

        const finished = slots.readSlot(1);
        expect(finished?.codex.unlockedEntries).toContain('seen-it');
        startNewGameAction(reloaded, slots, 1, undefined, 'the-chosen', undefined, finished?.codex);

        const next = reloaded.getState();
        expect(next.runOver).toBeUndefined();
        expect(next.player.characterId).toBe('the-chosen');
        expect(next.player.level).toBe(1);
        expect(next.codex.unlockedEntries).toContain('seen-it');
        expect(slots.readSlot(1)?.runOver).toBeUndefined();
    });
});

/**
 * Hermetic E2E - the crossing out of the Breakwater stops at the chapter
 * complete screen (phase CE1b, acceptance A2).
 *
 * Pinned: YES on the far bank (bw-b2) opens the screen's slice, moves no one,
 * makes no toast and no save, and closes the run once; CONTINUE takes the
 * crossing with the save and no toast; the sea cave (a same-map passage) and a
 * later crossing (cw-20) open no such screen.
 */

import { describe, expect, it } from '@jest/globals';

import { createFixtureStore } from '@/test-utils/fixtureStore';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { selectHasActiveTravel } from '@/state/presenters/travel.engine';
import { resolvePastScene } from '../../test-utils/pastScene';

function seatAt(map: 'breakwater' | 'charcoal-wood', node: string, adapter = createMemoryAdapter()) {
    return createFixtureStore(
        { id: `ce1b-${node}`, seed: `ce1b-${node}`, world: { continent: 'coastal-continent', map, node } },
        { adapter },
    );
}

describe('the far bank opens the chapter complete screen', () => {
    it('YES holds the crossing: the slice flags the screen, no one moves, no toast, no save', () => {
        const adapter = createMemoryAdapter();
        const { store, actions } = seatAt('breakwater', 'bw-b2', adapter);
        resolvePastScene(store, actions, 'travel');
        const saves = adapter.saveCount;

        expect(actions.takeTravel()).toBe(true);

        const s = store.getState();
        expect(s.travel?.chapterComplete).toBe(true);
        expect(selectHasActiveTravel(s)).toBe(true);
        expect(s.world.currentMap.name).toBe('breakwater');
        expect(s.notifications?.toast?.text ?? null).toBeNull();
        expect(adapter.saveCount).toBe(saves);
        // A second YES while the screen stands does nothing.
        expect(actions.takeTravel()).toBe(false);
    });

    it('CONTINUE crosses into the Charcoal Wood with the save made and no toast', () => {
        const adapter = createMemoryAdapter();
        const { store, actions } = seatAt('breakwater', 'bw-b2', adapter);
        resolvePastScene(store, actions, 'travel');
        actions.takeTravel();
        const saves = adapter.saveCount;

        expect(actions.continueChapter()).toBe(true);

        const s = store.getState();
        expect(s.world.currentMap.name).toBe('charcoal-wood');
        expect(selectHasActiveTravel(s)).toBe(false);
        expect(s.travel?.chapterComplete ?? false).toBe(false);
        expect(s.notifications?.toast?.text ?? null).toBeNull();
        expect(adapter.saveCount).toBe(saves + 1);
    });

    it('CONTINUE with no screen open does nothing', () => {
        const { store, actions } = seatAt('breakwater', 'bw-b2');
        resolvePastScene(store, actions, 'travel');
        expect(actions.continueChapter()).toBe(false);
        expect(store.getState().world.currentMap.name).toBe('breakwater');
    });

    it('the sea cave shortcut opens no screen', () => {
        const { store, actions } = seatAt('breakwater', 'bw-h6');
        resolvePastScene(store, actions, 'travel');
        expect(actions.takeTravel()).toBe(true);
        expect(store.getState().travel?.chapterComplete ?? false).toBe(false);
        expect(store.getState().world.currentMap.name).toBe('breakwater');
    });

    it('a later crossing (the stair cave) opens no screen', () => {
        const { store, actions } = seatAt('charcoal-wood', 'cw-20');
        resolvePastScene(store, actions, 'travel');
        expect(actions.takeTravel()).toBe(true);
        expect(store.getState().travel?.chapterComplete ?? false).toBe(false);
        expect(store.getState().world.currentMap.name).toBe('beacon-crags');
    });
});

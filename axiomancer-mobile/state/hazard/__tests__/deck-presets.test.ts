import { describe, expect, it } from '@jest/globals';
import { decodeAcquiredCards, getHazardCardDef, hazardLiveDeck } from '@mechanics';

import {
    applyHazardDeckPresetAction,
    HAZARD_DECK_PRESETS,
    randomizeHazardDeckAction,
} from '@/state/hazard/store-actions';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

const expectedPresetIds = ['starter-baseline', 'straightforward', 'utility'];

function makeStore() {
    return createAppStore({ adapter: createMemoryAdapter() });
}

describe('Hazard deck presets', () => {
    it('exposes the three core-deck playtest presets in stable order', () => {
        expect(HAZARD_DECK_PRESETS.map((preset) => preset.id)).toEqual(expectedPresetIds);
    });

    it('baseline clears acquired hazard cards and leaves other flags intact', () => {
        const store = makeStore();
        store.setState({ flags: ['hazard-card:grip:1', 'night-keepsake:kept'] } as never);

        const result = applyHazardDeckPresetAction(store, 'starter-baseline');

        expect(result.presetId).toBe('starter-baseline');
        expect(result.cardIds).toEqual([]);
        expect(store.getState().flags).toEqual(['night-keepsake:kept']);
    });

    it('straightforward grants the number cards and utility the utility cards, deterministically', () => {
        const straight = makeStore();
        const straightResult = applyHazardDeckPresetAction(straight, 'straightforward');
        const straightAgain = applyHazardDeckPresetAction(makeStore(), 'straightforward');
        const utility = makeStore();
        const utilityResult = applyHazardDeckPresetAction(utility, 'utility');

        expect(straightResult.cardIds).toEqual(straightAgain.cardIds);
        for (const id of straightResult.cardIds) expect(getHazardCardDef(id).effect).toBeUndefined();
        for (const id of utilityResult.cardIds) expect(getHazardCardDef(id).effect).toBeDefined();
        expect(straightResult.cardIds.length + utilityResult.cardIds.length).toBe(hazardLiveDeck().length);
        for (const id of [...straightResult.cardIds, ...utilityResult.cardIds]) expect(getHazardCardDef(id).puzzleOnly).toBeFalsy();
        expect(decodeAcquiredCards(straight.getState().flags)).toEqual(straightResult.cardIds);
        expect(decodeAcquiredCards(utility.getState().flags)).toEqual(utilityResult.cardIds);
    });

    it('randomizer still writes acquired hazard-card flags', () => {
        const store = makeStore();
        const granted = randomizeHazardDeckAction(store);

        expect(granted.length).toBeGreaterThan(0);
        // 0.36.0 seeds a curated combat-loadout flag in fresh state, so not every
        // flag is a hazard-card flag. Assert the randomizer recorded an acquired
        // hazard-card flag for each granted card (the test's actual intent).
        const acquired = decodeAcquiredCards(store.getState().flags);
        for (const id of granted) expect(acquired).toContain(id);
        for (const id of granted) expect(getHazardCardDef(id).puzzleOnly).toBeFalsy();
    });
});

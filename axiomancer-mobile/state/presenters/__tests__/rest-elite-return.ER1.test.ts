/**
 * The rest screen's return lines (phase ER1, A5): one line per elite a claim
 * will bring back, current region first, derived from the world through
 * `settledEliteNodes`. No line when none will return, and never one for a
 * retired elite.
 */

import { describe, expect, it } from '@jest/globals';

import { createStartingWorld, retireEliteNode, type MapState, type WorldState } from '@mechanics';

import { eliteReturnLines } from '@/state/presenters/rest.engine';
import { restEliteReturnLine } from '@/state/presenters/rest.copy';

function consumed(map: MapState, ...nodes: string[]): MapState {
    return { ...map, consumedNodes: [...map.consumedNodes, ...nodes] };
}

/** On the Beacon Crags, its elite fought, with the coast's two maps departed and fought. */
function actWorld(): WorldState {
    const here = createStartingWorld('beacon-crags');
    return {
        ...here,
        currentMap: consumed(here.currentMap, 'bc-8'),
        mapStates: {
            breakwater: consumed(createStartingWorld('breakwater').currentMap, 'bw-8'),
            'charcoal-wood': consumed(createStartingWorld('charcoal-wood').currentMap, 'cw-12'),
        },
    };
}

describe('eliteReturnLines (A5)', () => {
    it('names the foe and the place as the map screen names it, current region first', () => {
        expect(eliteReturnLines(actWorld())).toEqual([
            'The Green Jelly is back at The Ruined Chapel.',
            'The Green Jelly is back at The North Pier.',
            'The Green Jelly is back at The Root Graveyard.',
        ]);
    });

    it('no line when nothing will return, and none for a retired elite', () => {
        expect(eliteReturnLines(createStartingWorld('breakwater'))).toEqual([]);
        expect(eliteReturnLines(null)).toEqual([]);
        const retired = retireEliteNode(actWorld(), 'bc-8');
        expect(eliteReturnLines(retired)).toEqual([
            'The Green Jelly is back at The North Pier.',
            'The Green Jelly is back at The Root Graveyard.',
        ]);
    });

    it('the copy line', () => {
        expect(restEliteReturnLine('Green Jelly', 'The North Pier')).toBe('The Green Jelly is back at The North Pier.');
    });
});

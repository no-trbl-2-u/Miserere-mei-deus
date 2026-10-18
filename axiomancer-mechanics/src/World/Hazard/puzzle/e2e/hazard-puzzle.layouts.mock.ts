/**
 * Test-only hazard puzzle layouts. Not library content: the demo puzzles
 * ship in the puzzle library.
 */

import type { HazardPuzzleLayout, HazardPuzzleUnlock } from '../hazard-puzzle.types';

function layout(over: Partial<HazardPuzzleLayout> & Pick<HazardPuzzleLayout, 'id'>): HazardPuzzleLayout {
    return {
        title: over.id,
        act: 1,
        hazardId: 'cracked-cliff',
        region: 'breakwater',
        hand: [],
        reserve: [],
        dice: [],
        goals: { safe: 1, risk: [1, 1] },
        bands: { safe: 'easy', risk: 'easy' },
        unlocks: [],
        ...over,
    };
}

/**
 * The only way to the goal draws the reserve card. SURE FOOTING pays 2/2
 * and, applied unpowered, draws one card: IRON GRIP (5 force).
 * Footing + grip = 7 force, 2 escape = 9 combined. Without the draw the
 * best is footing alone (4), or its salvage (1).
 */
export const DRAW_ONLY_LAYOUT = layout({
    id: 'test-draw-only',
    hand: ['footing'],
    reserve: ['grip'],
    goals: { safe: 9, risk: [7, 2] },
});

/**
 * A board exercising every move kind: stage, power, apply (convert and
 * draw), and a reserve deeper than one draw.
 */
export const MIXED_LAYOUT = layout({
    id: 'test-mixed',
    hand: ['haul', 'scram', 'windread', 'oath'],
    reserve: ['grip', 'leap', 'footing'],
    dice: ['red', 'blue', 'hex', 'gold'],
    goals: { safe: 30, risk: [20, 9] },
});

/**
 * The fixture library the library test runs on until the demo puzzles
 * ship. One hand and one set of dice at three goals, so the goal alone
 * sets the band. Counts are the solver's, recorded when the goals were
 * set, with no bin: easy 69 safe / 47 risk, medium 9 / 11, hard 2 / 3. Each
 * declares stat unlocks so the library test's subset check has something to
 * check; `fixture-blank` adds a blank die and a `blankReroll` (8 / 8, medium).
 */
const BAND_HAND = ['leap', 'leap', 'windread', 'haul', 'runner'];
const BAND_DICE: HazardPuzzleLayout['dice'] = ['red', 'red', 'blue', 'blue'];
const BODY_DIE: HazardPuzzleUnlock = { stat: 'body', min: 3, kind: 'extraDie' };
const HEART_DIE: HazardPuzzleUnlock = { stat: 'heart', min: 3, kind: 'extraDie' };
const MIND_CARD: HazardPuzzleUnlock = { stat: 'mind', min: 3, kind: 'extraCard', cardId: 'scram' };

/**
 * A blank die and READ THE WIND, whose convert turns a blank die gold.
 * Turning the blank gold up front keeps every line open (9 -> 20 safe);
 * turning it red would close some (9 -> 7), which the subset check refuses.
 */
export const BLANK_HAND = ['windread', 'grip', 'scram', 'haul'];
export const BLANK_DICE: HazardPuzzleLayout['dice'] = ['hex', 'red', 'blue'];

export const FIXTURE_LIBRARY: readonly HazardPuzzleLayout[] = [
    layout({
        id: 'fixture-easy',
        hand: BAND_HAND,
        dice: BAND_DICE,
        goals: { safe: 14, risk: [5, 5] },
        bands: { safe: 'easy', risk: 'easy' },
        unlocks: [BODY_DIE, MIND_CARD],
    }),
    layout({
        id: 'fixture-medium',
        hand: BAND_HAND,
        dice: BAND_DICE,
        goals: { safe: 26, risk: [7, 12] },
        bands: { safe: 'medium', risk: 'medium' },
        unlocks: [HEART_DIE],
    }),
    layout({
        id: 'fixture-hard',
        hand: BAND_HAND,
        dice: BAND_DICE,
        goals: { safe: 30, risk: [8, 20] },
        bands: { safe: 'hard', risk: 'hard' },
        unlocks: [HEART_DIE, MIND_CARD],
    }),
    layout({
        id: 'fixture-blank',
        hand: BLANK_HAND,
        dice: BLANK_DICE,
        goals: { safe: 20, risk: [12, 6] },
        bands: { safe: 'medium', risk: 'medium' },
        unlocks: [{ stat: 'mind', min: 2, kind: 'blankReroll', face: 'gold' }],
    }),
];

export function testLayout(over: Partial<HazardPuzzleLayout> & Pick<HazardPuzzleLayout, 'id'>): HazardPuzzleLayout {
    return layout(over);
}

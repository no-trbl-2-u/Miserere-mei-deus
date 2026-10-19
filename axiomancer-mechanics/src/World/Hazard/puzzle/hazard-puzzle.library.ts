/**
 * Hazard puzzle — the demo library. Three demo puzzles, one per band on the
 * risk route, played from the dev menu until Act 1's rollout. Every puzzle
 * is Act 1 only.
 *
 * Each was authored backward with the solver: the intended line first, then
 * the goals set to what that line reaches. The counts in each comment are
 * the solver's, with no bin (a hand card is staged or held), and the library
 * test holds every layout in its declared band. Titles and route names come from the live hazard each one reuses;
 * no story text is written here.
 */

import { getHazardDef } from '../hazard.content';
import type { HazardPuzzleLayout } from './hazard-puzzle.types';

/**
 * Easy: the cliff path on the Beacon Crags. Risk [5, 8]: 44 ways through;
 * safe 17: 32. A Mind of 3 adds a second blue die for the ESCAPE cards.
 * The reserve's second SCRAMBLE was CLIFFRUNNER until the card pool cut
 * it (it plays the same); the goals came down a step to stay easy.
 */
const CLIFF_EASY: HazardPuzzleLayout = {
    id: 'demo-cliff-easy',
    title: getHazardDef('cracked-cliff').title,
    act: 1,
    hazardId: 'cracked-cliff',
    region: 'beacon-crags',
    hand: ['leap', 'haul', 'footing', 'scram'],
    reserve: ['scram'],
    dice: ['red', 'blue', 'purple'],
    goals: { safe: 17, risk: [5, 8] },
    bands: { safe: 'easy', risk: 'easy' },
    unlocks: [{ stat: 'mind', min: 3, kind: 'extraDie' }],
};

/**
 * Medium: the ash crossing in the Charcoal Wood. Risk [7, 9]: 7 ways; safe
 * 16: 17. Neither route clears without SURE FOOTING drawing IRON GRIP from
 * the reserve; READ THE WIND can turn the blank die gold to power it. A Mind
 * of 3 turns the blank gold up front; a Heart of 3 adds a purple die.
 */
const ASHFALL_MEDIUM: HazardPuzzleLayout = {
    id: 'demo-ashfall-medium',
    title: getHazardDef('ashfall-crossing').title,
    act: 1,
    hazardId: 'ashfall-crossing',
    region: 'charcoal-wood',
    hand: ['footing', 'windread', 'scram'],
    reserve: ['grip'],
    dice: ['hex', 'blue', 'red'],
    goals: { safe: 16, risk: [7, 9] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [
        { stat: 'mind', min: 3, kind: 'blankReroll', face: 'gold' },
        { stat: 'heart', min: 3, kind: 'extraDie' },
    ],
};

/**
 * Hard: the flooded undercroft in the Lantern Deep. Risk [13, 14]: 2 ways,
 * each clearing with nothing to spare; safe 24: 10. Neither route clears
 * without SURE FOOTING drawing from the reserve (IRON GRIP, then FAITH LEAP).
 * A Mind of 3 puts a second SCRAMBLE in the hand.
 */
const UNDERCROFT_HARD: HazardPuzzleLayout = {
    id: 'demo-undercroft-hard',
    title: getHazardDef('flooded-undercroft').title,
    act: 1,
    hazardId: 'flooded-undercroft',
    region: 'lantern-deep',
    hand: ['footing', 'haul', 'scram'],
    reserve: ['grip', 'leap'],
    dice: ['purple', 'red', 'blue'],
    goals: { safe: 24, risk: [13, 14] },
    bands: { safe: 'medium', risk: 'hard' },
    unlocks: [{ stat: 'mind', min: 3, kind: 'extraCard', cardId: 'scram' }],
};

/** The demo puzzles, easy to hard. */
export const HAZARD_PUZZLE_LIBRARY: readonly HazardPuzzleLayout[] = [CLIFF_EASY, ASHFALL_MEDIUM, UNDERCROFT_HARD];

/** A demo puzzle by id; throws on an unknown id. */
export function getHazardPuzzleLayout(id: string): HazardPuzzleLayout {
    const layout = HAZARD_PUZZLE_LIBRARY.find((l) => l.id === id);
    if (!layout) throw new Error(`Unknown hazard puzzle id: ${id}`);
    return layout;
}

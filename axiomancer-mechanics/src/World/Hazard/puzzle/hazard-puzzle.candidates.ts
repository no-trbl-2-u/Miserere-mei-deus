/**
 * Hazard puzzle — the candidate set. Ten labelled hard puzzles, authored
 * for T to play once and rule keep or cut (the easy and medium ten were
 * deleted to make room for cost-card puzzles). They are kept out of
 * `HAZARD_PUZZLE_LIBRARY` on purpose: the library test holds
 * every library layout to the band its solver count gives, and that count
 * is the definition of difficulty the candidates exist to test. A candidate
 * is held to `auditHazardPuzzleCandidate` instead: valid, pool cards only,
 * solvable on its route and inside the solver budget.
 *
 * Each was authored against its decision pressure on the nominated route
 * (`hazardPuzzleCardReport`): no route is `forced` (every card required) or
 * `free` (every first play still wins), so every candidate has at least one
 * first play that loses. In practice that play is a die placed on the wrong
 * card: the wild gold die on a card that does not need it, a blue die on
 * SCRAMBLE where FAITH LEAP wanted it, a red on DEAD-MAN HAUL where IRON GRIP
 * wanted it, or the purple die on SURE FOOTING where READ THE WIND wanted it.
 * The intended band reads the report's numbers: hard is 1 to 4 ways
 * through, best surplus 1 or less and a shortest winning line of at least
 * five moves.
 * The comment over each gives its numbers on the nominated route. `bands`
 * records what the solver count gives on each route, as on the demos; the
 * off route's goal is set to a count the band check can read. The label
 * names the layout's shape, never its answer.
 *
 * Every candidate reuses a live hazard's copy through `hazardId`; no card,
 * keyword or story text is written here.
 */

import { getHazardDef } from '../hazard.content';
import type { HazardPuzzleCandidate } from './hazard-puzzle.types';

/** Risk [7, 21]: 4 ways, best surplus 0; 1 optional of 4 cards; 4 of 12 first plays lose. */
const HARD_01: HazardPuzzleCandidate = {
    id: 'cand-hard-01',
    label: 'every die has a wrong card',
    intendedBand: 'hard',
    route: 'risk',
    title: getHazardDef('flooded-undercroft').title,
    act: 1,
    hazardId: 'flooded-undercroft',
    region: 'lantern-deep',
    hand: ['grip', 'haul', 'leap', 'leap', 'scram'],
    reserve: [],
    dice: ['red', 'gold', 'blue'],
    goals: { safe: 29, risk: [7, 21] },
    bands: { safe: 'medium', risk: 'hard' },
    unlocks: [],
};

/** Risk [21, 3]: 3 ways, best surplus 0; 2 optional of 5 cards; 1 of 6 first plays lose. */
const HARD_02: HazardPuzzleCandidate = {
    id: 'cand-hard-02',
    label: 'two reds, force to the brim',
    intendedBand: 'hard',
    route: 'risk',
    title: getHazardDef('bandit-hunt').title,
    act: 1,
    hazardId: 'bandit-hunt',
    region: 'breakwater',
    hand: ['haul', 'leap', 'grip', 'oath'],
    reserve: ['grip', 'scram'],
    dice: ['purple', 'red', 'purple', 'red'],
    goals: { safe: 22, risk: [21, 3] },
    bands: { safe: 'medium', risk: 'hard' },
    unlocks: [],
};

/** Risk [3, 19]: 3 ways, best surplus 0; 1 optional of 6 cards; 1 of 7 first plays lose. */
const HARD_03: HazardPuzzleCandidate = {
    id: 'cand-hard-03',
    label: 'a blank die and two purples',
    intendedBand: 'hard',
    route: 'risk',
    title: getHazardDef('fever-rot').title,
    act: 1,
    hazardId: 'fever-rot',
    region: 'charcoal-wood',
    hand: ['footing', 'windread', 'leap', 'grip'],
    reserve: ['scram', 'haul'],
    dice: ['red', 'hex', 'purple'],
    goals: { safe: 30, risk: [3, 19] },
    bands: { safe: 'medium', risk: 'hard' },
    unlocks: [],
};

/** Safe 28: 2 ways, best surplus 0; 1 optional of 5 cards; 1 of 8 first plays lose. */
const HARD_04: HazardPuzzleCandidate = {
    id: 'cand-hard-04',
    label: 'four dice, three cards, exact',
    intendedBand: 'hard',
    route: 'safe',
    title: getHazardDef('famine-march').title,
    act: 1,
    hazardId: 'famine-march',
    region: 'breakwater',
    hand: ['footing', 'leap', 'grip'],
    reserve: ['haul', 'scram'],
    dice: ['blue', 'hex', 'gold', 'red'],
    goals: { safe: 28, risk: [6, 12] },
    bands: { safe: 'hard', risk: 'medium' },
    unlocks: [],
};

/** Risk [3, 15]: 3 ways, best surplus 0; 2 optional of 4 cards; 1 of 6 first plays lose. */
const HARD_05: HazardPuzzleCandidate = {
    id: 'cand-hard-05',
    label: 'one blue die, three blue cards',
    intendedBand: 'hard',
    route: 'risk',
    title: getHazardDef('cracked-cliff').title,
    act: 1,
    hazardId: 'cracked-cliff',
    region: 'beacon-crags',
    hand: ['grip', 'leap', 'scram', 'haul', 'scram'],
    reserve: [],
    dice: ['blue', 'hex'],
    goals: { safe: 17, risk: [3, 15] },
    bands: { safe: 'medium', risk: 'hard' },
    unlocks: [],
};

/** Risk [3, 17]: 3 ways, best surplus 0; 2 optional of 4 cards; 3 of 9 first plays lose. */
const HARD_06: HazardPuzzleCandidate = {
    id: 'cand-hard-06',
    label: 'wild die, three wrong homes',
    intendedBand: 'hard',
    route: 'risk',
    title: getHazardDef('ashfall-crossing').title,
    act: 1,
    hazardId: 'ashfall-crossing',
    region: 'charcoal-wood',
    hand: ['haul', 'grip', 'scram', 'scram', 'footing'],
    reserve: ['scram'],
    dice: ['gold', 'blue'],
    goals: { safe: 23, risk: [3, 17] },
    bands: { safe: 'medium', risk: 'hard' },
    unlocks: [],
};

/** Safe 31: 3 ways, best surplus 0; 1 optional of 6 cards; 2 of 9 first plays lose. */
const HARD_07: HazardPuzzleCandidate = {
    id: 'cand-hard-07',
    label: 'two colour traps, exact sum',
    intendedBand: 'hard',
    route: 'safe',
    title: getHazardDef('flooded-undercroft').title,
    act: 1,
    hazardId: 'flooded-undercroft',
    region: 'lantern-deep',
    hand: ['scram', 'footing', 'haul', 'oath', 'leap'],
    reserve: ['grip', 'haul'],
    dice: ['blue', 'purple', 'purple', 'red'],
    goals: { safe: 31, risk: [15, 13] },
    bands: { safe: 'hard', risk: 'medium' },
    unlocks: [],
};

/** Risk [18, 10]: 3 ways, best surplus 1; 1 optional of 5 cards; 1 of 8 first plays lose. */
const HARD_08: HazardPuzzleCandidate = {
    id: 'cand-hard-08',
    label: 'an oath without gold, one purple',
    intendedBand: 'hard',
    route: 'risk',
    title: getHazardDef('bandit-hunt').title,
    act: 1,
    hazardId: 'bandit-hunt',
    region: 'breakwater',
    hand: ['windread', 'scram', 'haul', 'footing', 'oath'],
    reserve: ['scram', 'haul'],
    dice: ['purple', 'red'],
    goals: { safe: 27, risk: [18, 10] },
    bands: { safe: 'medium', risk: 'hard' },
    unlocks: [],
};

/** Risk [14, 5]: 3 ways, best surplus 0; 2 optional of 5 cards; 1 of 6 first plays lose. */
const HARD_09: HazardPuzzleCandidate = {
    id: 'cand-hard-09',
    label: 'two blanks and one red',
    intendedBand: 'hard',
    route: 'risk',
    title: getHazardDef('fever-rot').title,
    act: 1,
    hazardId: 'fever-rot',
    region: 'charcoal-wood',
    hand: ['haul', 'footing', 'grip', 'leap'],
    reserve: ['scram'],
    dice: ['red', 'hex', 'hex'],
    goals: { safe: 17, risk: [14, 5] },
    bands: { safe: 'medium', risk: 'hard' },
    unlocks: [],
};

/** Risk [18, 4]: 3 ways, best surplus 1; 1 optional of 5 cards; 1 of 6 first plays lose. */
const HARD_10: HazardPuzzleCandidate = {
    id: 'cand-hard-10',
    label: 'a blank, a purple, two purple cards',
    intendedBand: 'hard',
    route: 'risk',
    title: getHazardDef('famine-march').title,
    act: 1,
    hazardId: 'famine-march',
    region: 'breakwater',
    hand: ['haul', 'footing', 'windread', 'grip'],
    reserve: ['scram'],
    dice: ['blue', 'purple', 'hex'],
    goals: { safe: 24, risk: [18, 4] },
    bands: { safe: 'medium', risk: 'hard' },
    unlocks: [],
};

/** The candidate puzzles: the ten hard. */
export const HAZARD_PUZZLE_CANDIDATES: readonly HazardPuzzleCandidate[] = [
    HARD_01, HARD_02, HARD_03, HARD_04, HARD_05, HARD_06, HARD_07, HARD_08, HARD_09, HARD_10,
];

/** A candidate by id; throws on an unknown id. */
export function getHazardPuzzleCandidate(
    id: string,
    candidates: readonly HazardPuzzleCandidate[] = HAZARD_PUZZLE_CANDIDATES,
): HazardPuzzleCandidate {
    const candidate = candidates.find((c) => c.id === id);
    if (!candidate) throw new Error(`Unknown hazard puzzle candidate id: ${id}`);
    return candidate;
}

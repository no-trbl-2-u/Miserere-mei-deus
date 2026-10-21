/**
 * Hazard puzzle — the candidate set. Thirty labelled puzzles, ten per
 * intended band, authored for T to play once and rule keep or cut. They are
 * kept out of `HAZARD_PUZZLE_LIBRARY` on purpose: the library test holds
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
 * The intended band reads the report's numbers:
 *  - easy: at least 8 ways through, best surplus 3 or more, and at least
 *    three in four first plays still win;
 *  - medium: 5 to 12 ways through and best surplus 2 or less;
 *  - hard: 1 to 4 ways through, best surplus 1 or less and a shortest
 *    winning line of at least five moves.
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

/** Risk [3, 9]: 9 ways, best surplus 3; 3 optional of 4 cards; 2 of 8 first plays lose. */
const EASY_01: HazardPuzzleCandidate = {
    id: 'cand-easy-01',
    label: 'one wild die, a dead purple',
    intendedBand: 'easy',
    route: 'risk',
    title: getHazardDef('cracked-cliff').title,
    act: 1,
    hazardId: 'cracked-cliff',
    region: 'beacon-crags',
    hand: ['leap', 'haul', 'scram', 'grip'],
    reserve: [],
    dice: ['purple', 'gold'],
    goals: { safe: 15, risk: [3, 9] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Safe 22: 12 ways, best surplus 11; 4 optional of 5 cards; 1 of 6 first plays lose. */
const EASY_02: HazardPuzzleCandidate = {
    id: 'cand-easy-02',
    label: 'two purples want one die',
    intendedBand: 'easy',
    route: 'safe',
    title: getHazardDef('ashfall-crossing').title,
    act: 1,
    hazardId: 'ashfall-crossing',
    region: 'charcoal-wood',
    hand: ['footing', 'grip', 'oath', 'windread'],
    reserve: ['grip', 'haul'],
    dice: ['blue', 'purple'],
    goals: { safe: 22, risk: [2, 5] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [6, 9]: 11 ways, best surplus 3; 2 optional of 3 cards; 2 of 8 first plays lose. */
const EASY_03: HazardPuzzleCandidate = {
    id: 'cand-easy-03',
    label: 'spare blues, one red card',
    intendedBand: 'easy',
    route: 'risk',
    title: getHazardDef('flooded-undercroft').title,
    act: 1,
    hazardId: 'flooded-undercroft',
    region: 'lantern-deep',
    hand: ['leap', 'scram', 'scram', 'grip'],
    reserve: [],
    dice: ['purple', 'blue', 'gold', 'blue'],
    goals: { safe: 21, risk: [6, 9] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [3, 22]: 9 ways, best surplus 3; 2 optional of 5 cards; 2 of 10 first plays lose. */
const EASY_04: HazardPuzzleCandidate = {
    id: 'cand-easy-04',
    label: 'escape-heavy goal, two purples',
    intendedBand: 'easy',
    route: 'risk',
    title: getHazardDef('bandit-hunt').title,
    act: 1,
    hazardId: 'bandit-hunt',
    region: 'breakwater',
    hand: ['footing', 'windread', 'leap', 'scram'],
    reserve: ['haul', 'leap'],
    dice: ['purple', 'gold', 'purple', 'red'],
    goals: { safe: 30, risk: [3, 22] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [6, 3]: 10 ways, best surplus 4; 5 optional of 5 cards; 1 of 6 first plays lose. */
const EASY_05: HazardPuzzleCandidate = {
    id: 'cand-easy-05',
    label: 'a blank die and a wild one',
    intendedBand: 'easy',
    route: 'risk',
    title: getHazardDef('fever-rot').title,
    act: 1,
    hazardId: 'fever-rot',
    region: 'charcoal-wood',
    hand: ['scram', 'haul', 'footing'],
    reserve: ['leap', 'grip'],
    dice: ['hex', 'gold'],
    goals: { safe: 15, risk: [6, 3] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Safe 27: 8 ways, best surplus 3; 1 optional of 4 cards; 1 of 11 first plays lose. */
const EASY_06: HazardPuzzleCandidate = {
    id: 'cand-easy-06',
    label: 'draw into a second grip',
    intendedBand: 'easy',
    route: 'safe',
    title: getHazardDef('famine-march').title,
    act: 1,
    hazardId: 'famine-march',
    region: 'breakwater',
    hand: ['grip', 'scram', 'leap', 'footing'],
    reserve: ['grip'],
    dice: ['purple', 'purple', 'gold', 'blue'],
    goals: { safe: 27, risk: [13, 6] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Safe 25: 11 ways, best surplus 4; 2 optional of 5 cards; 1 of 7 first plays lose. */
const EASY_07: HazardPuzzleCandidate = {
    id: 'cand-easy-07',
    label: 'three cards, a two-card reserve',
    intendedBand: 'easy',
    route: 'safe',
    title: getHazardDef('cracked-cliff').title,
    act: 1,
    hazardId: 'cracked-cliff',
    region: 'beacon-crags',
    hand: ['windread', 'haul', 'footing'],
    reserve: ['leap', 'grip'],
    dice: ['blue', 'red', 'gold'],
    goals: { safe: 25, risk: [15, 2] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [6, 7]: 10 ways, best surplus 4; 3 optional of 4 cards; 1 of 6 first plays lose. */
const EASY_08: HazardPuzzleCandidate = {
    id: 'cand-easy-08',
    label: 'twin leaps and a wild die',
    intendedBand: 'easy',
    route: 'risk',
    title: getHazardDef('ashfall-crossing').title,
    act: 1,
    hazardId: 'ashfall-crossing',
    region: 'charcoal-wood',
    hand: ['leap', 'leap', 'footing', 'haul'],
    reserve: ['leap', 'grip'],
    dice: ['hex', 'gold'],
    goals: { safe: 19, risk: [6, 7] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [8, 9]: 9 ways, best surplus 3; 1 optional of 3 cards; 1 of 7 first plays lose. */
const EASY_09: HazardPuzzleCandidate = {
    id: 'cand-easy-09',
    label: 'twin grips, one red die',
    intendedBand: 'easy',
    route: 'risk',
    title: getHazardDef('flooded-undercroft').title,
    act: 1,
    hazardId: 'flooded-undercroft',
    region: 'lantern-deep',
    hand: ['scram', 'grip', 'grip', 'leap'],
    reserve: [],
    dice: ['red', 'purple', 'gold', 'hex'],
    goals: { safe: 20, risk: [8, 9] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [13, 4]: 9 ways, best surplus 3; 2 optional of 5 cards; 1 of 7 first plays lose. */
const EASY_10: HazardPuzzleCandidate = {
    id: 'cand-easy-10',
    label: 'force-heavy goal, one purple die',
    intendedBand: 'easy',
    route: 'risk',
    title: getHazardDef('bandit-hunt').title,
    act: 1,
    hazardId: 'bandit-hunt',
    region: 'breakwater',
    hand: ['leap', 'windread', 'grip', 'footing'],
    reserve: ['haul', 'leap'],
    dice: ['purple', 'blue'],
    goals: { safe: 26, risk: [13, 4] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [8, 17]: 12 ways, best surplus 2; 3 optional of 6 cards; 5 of 12 first plays lose. */
const MEDIUM_01: HazardPuzzleCandidate = {
    id: 'cand-medium-01',
    label: 'the oath and two dice',
    intendedBand: 'medium',
    route: 'risk',
    title: getHazardDef('fever-rot').title,
    act: 1,
    hazardId: 'fever-rot',
    region: 'charcoal-wood',
    hand: ['oath', 'footing', 'haul', 'grip', 'windread'],
    reserve: ['haul', 'leap'],
    dice: ['gold', 'purple'],
    goals: { safe: 36, risk: [8, 17] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [12, 13]: 8 ways, best surplus 2; 1 optional of 5 cards; 3 of 11 first plays lose. */
const MEDIUM_02: HazardPuzzleCandidate = {
    id: 'cand-medium-02',
    label: 'three purples, one wild',
    intendedBand: 'medium',
    route: 'risk',
    title: getHazardDef('famine-march').title,
    act: 1,
    hazardId: 'famine-march',
    region: 'breakwater',
    hand: ['footing', 'scram', 'grip', 'haul', 'leap'],
    reserve: ['leap', 'leap'],
    dice: ['gold', 'purple', 'purple', 'purple'],
    goals: { safe: 30, risk: [12, 13] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [4, 12]: 12 ways, best surplus 0; 2 optional of 5 cards; 1 of 5 first plays lose. */
const MEDIUM_03: HazardPuzzleCandidate = {
    id: 'cand-medium-03',
    label: 'two oaths, no gold die',
    intendedBand: 'medium',
    route: 'risk',
    title: getHazardDef('cracked-cliff').title,
    act: 1,
    hazardId: 'cracked-cliff',
    region: 'beacon-crags',
    hand: ['haul', 'oath', 'scram', 'oath'],
    reserve: ['grip', 'leap'],
    dice: ['hex', 'purple', 'blue', 'red'],
    goals: { safe: 21, risk: [4, 12] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [12, 3]: 5 ways, best surplus 0; 2 optional of 4 cards; 1 of 6 first plays lose. */
const MEDIUM_04: HazardPuzzleCandidate = {
    id: 'cand-medium-04',
    label: 'one red die, two red cards',
    intendedBand: 'medium',
    route: 'risk',
    title: getHazardDef('ashfall-crossing').title,
    act: 1,
    hazardId: 'ashfall-crossing',
    region: 'charcoal-wood',
    hand: ['leap', 'scram', 'haul', 'leap', 'grip'],
    reserve: [],
    dice: ['hex', 'red'],
    goals: { safe: 18, risk: [12, 3] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [3, 10]: 6 ways, best surplus 2; 1 optional of 4 cards; 1 of 5 first plays lose. */
const MEDIUM_05: HazardPuzzleCandidate = {
    id: 'cand-medium-05',
    label: 'twin footings, one purple die',
    intendedBand: 'medium',
    route: 'risk',
    title: getHazardDef('flooded-undercroft').title,
    act: 1,
    hazardId: 'flooded-undercroft',
    region: 'lantern-deep',
    hand: ['windread', 'footing', 'footing', 'scram'],
    reserve: ['haul'],
    dice: ['red', 'red', 'purple'],
    goals: { safe: 19, risk: [3, 10] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [4, 10]: 6 ways, best surplus 2; 2 optional of 3 cards; 2 of 8 first plays lose. */
const MEDIUM_06: HazardPuzzleCandidate = {
    id: 'cand-medium-06',
    label: 'three scrambles and a wild die',
    intendedBand: 'medium',
    route: 'risk',
    title: getHazardDef('bandit-hunt').title,
    act: 1,
    hazardId: 'bandit-hunt',
    region: 'breakwater',
    hand: ['scram', 'scram', 'scram', 'grip', 'haul'],
    reserve: [],
    dice: ['red', 'gold', 'purple'],
    goals: { safe: 19, risk: [4, 10] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [6, 3]: 8 ways, best surplus 0; 2 optional of 3 cards; 2 of 8 first plays lose. */
const MEDIUM_07: HazardPuzzleCandidate = {
    id: 'cand-medium-07',
    label: 'two blue dice, a wild, three cards',
    intendedBand: 'medium',
    route: 'risk',
    title: getHazardDef('fever-rot').title,
    act: 1,
    hazardId: 'fever-rot',
    region: 'charcoal-wood',
    hand: ['scram', 'haul', 'leap'],
    reserve: [],
    dice: ['blue', 'gold', 'blue', 'purple'],
    goals: { safe: 13, risk: [6, 3] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [6, 12]: 6 ways, best surplus 0; 2 optional of 5 cards; 1 of 5 first plays lose. */
const MEDIUM_08: HazardPuzzleCandidate = {
    id: 'cand-medium-08',
    label: 'an oath with no gold to feed it',
    intendedBand: 'medium',
    route: 'risk',
    title: getHazardDef('famine-march').title,
    act: 1,
    hazardId: 'famine-march',
    region: 'breakwater',
    hand: ['scram', 'oath', 'grip'],
    reserve: ['leap', 'haul'],
    dice: ['hex', 'blue', 'red', 'red'],
    goals: { safe: 21, risk: [6, 12] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [17, 10]: 5 ways, best surplus 0; 1 optional of 6 cards; 1 of 6 first plays lose. */
const MEDIUM_09: HazardPuzzleCandidate = {
    id: 'cand-medium-09',
    label: 'twin hauls and a two-card reserve',
    intendedBand: 'medium',
    route: 'risk',
    title: getHazardDef('cracked-cliff').title,
    act: 1,
    hazardId: 'cracked-cliff',
    region: 'beacon-crags',
    hand: ['oath', 'haul', 'haul', 'footing', 'scram'],
    reserve: ['leap', 'grip'],
    dice: ['blue', 'red', 'blue'],
    goals: { safe: 29, risk: [17, 10] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [3, 17]: 5 ways, best surplus 0; 2 optional of 5 cards; 1 of 6 first plays lose. */
const MEDIUM_10: HazardPuzzleCandidate = {
    id: 'cand-medium-10',
    label: 'escape-heavy goal, one blue die',
    intendedBand: 'medium',
    route: 'risk',
    title: getHazardDef('ashfall-crossing').title,
    act: 1,
    hazardId: 'ashfall-crossing',
    region: 'charcoal-wood',
    hand: ['haul', 'oath', 'leap', 'scram', 'haul'],
    reserve: ['grip', 'leap'],
    dice: ['purple', 'blue'],
    goals: { safe: 22, risk: [3, 17] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

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

/** The candidate puzzles, ten per intended band: easy, medium, hard. */
export const HAZARD_PUZZLE_CANDIDATES: readonly HazardPuzzleCandidate[] = [
    EASY_01, EASY_02, EASY_03, EASY_04, EASY_05, EASY_06, EASY_07, EASY_08, EASY_09, EASY_10,
    MEDIUM_01, MEDIUM_02, MEDIUM_03, MEDIUM_04, MEDIUM_05, MEDIUM_06, MEDIUM_07, MEDIUM_08, MEDIUM_09, MEDIUM_10,
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

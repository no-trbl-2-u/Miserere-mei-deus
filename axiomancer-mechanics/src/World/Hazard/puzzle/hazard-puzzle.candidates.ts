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
 *
 * The twenty cost-card candidates (`cand-cost-medium-01..10`,
 * `cand-cost-hard-01..10`) are built on the five puzzle-only cost cards.
 * Each wins only exactly on its goal (best surplus 0), and none can be won
 * by staging the whole opening hand: a cost card held back is part of
 * every answer. Across the twenty each cost card is staged in a win in
 * some layouts and a trap (in hand, in no win) in others, and both its
 * free and its powered line are required somewhere. Medium is 5 to 29 ways
 * through, hard 1 or 2.
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

/** Safe 17: 6 ways, best surplus 0; 0 optional of 5 cards; 3 of 11 first plays lose. */
const COST_MEDIUM_01: HazardPuzzleCandidate = {
    id: 'cand-cost-medium-01',
    label: 'two pawns and a wild die',
    intendedBand: 'medium',
    route: 'safe',
    title: getHazardDef('cracked-cliff').title,
    act: 1,
    hazardId: 'cracked-cliff',
    region: 'beacon-crags',
    hand: ['breakneck', 'pawn', 'pawn', 'windread', 'footing'],
    reserve: ['scram'],
    dice: ['gold', 'purple', 'blue'],
    goals: { safe: 17, risk: [10, 7] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [10, 10]: 6 ways, best surplus 0; 2 optional of 6 cards; 5 of 11 first plays lose. */
const COST_MEDIUM_02: HazardPuzzleCandidate = {
    id: 'cand-cost-medium-02',
    label: 'an oath in the reserve, two faces to turn',
    intendedBand: 'medium',
    route: 'risk',
    title: getHazardDef('flooded-undercroft').title,
    act: 1,
    hazardId: 'flooded-undercroft',
    region: 'lantern-deep',
    hand: ['stones', 'footing', 'leap', 'scram', 'headlong'],
    reserve: ['oath'],
    dice: ['red', 'gold'],
    rerollFaces: ['gold', 'purple'],
    goals: { safe: 28, risk: [10, 10] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [15, 4]: 10 ways, best surplus 0; 1 optional of 6 cards; 4 of 9 first plays lose. */
const COST_MEDIUM_03: HazardPuzzleCandidate = {
    id: 'cand-cost-medium-03',
    label: 'two dives and a blank',
    intendedBand: 'medium',
    route: 'risk',
    title: getHazardDef('ashfall-crossing').title,
    act: 1,
    hazardId: 'ashfall-crossing',
    region: 'charcoal-wood',
    hand: ['pawn', 'headlong', 'scram', 'grip', 'headlong'],
    reserve: ['oath', 'windread'],
    dice: ['gold', 'hex', 'red'],
    rerollFaces: ['gold', 'gold'],
    goals: { safe: 31, risk: [15, 4] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [19, 1]: 5 ways, best surplus 0; 1 optional of 5 cards; 5 of 11 first plays lose. */
const COST_MEDIUM_04: HazardPuzzleCandidate = {
    id: 'cand-cost-medium-04',
    label: 'a tithe beside a sure footing',
    intendedBand: 'medium',
    route: 'risk',
    title: getHazardDef('famine-march').title,
    act: 1,
    hazardId: 'famine-march',
    region: 'breakwater',
    hand: ['footing', 'tithe', 'grip', 'scram', 'breakneck'],
    reserve: ['grip', 'scram'],
    dice: ['blue', 'gold'],
    goals: { safe: 25, risk: [19, 1] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [6, 12]: 6 ways, best surplus 0; 1 optional of 6 cards; 6 of 12 first plays lose. */
const COST_MEDIUM_05: HazardPuzzleCandidate = {
    id: 'cand-cost-medium-05',
    label: 'two tithes, one held back',
    intendedBand: 'medium',
    route: 'risk',
    title: getHazardDef('bandit-hunt').title,
    act: 1,
    hazardId: 'bandit-hunt',
    region: 'breakwater',
    hand: ['breakneck', 'windread', 'grip', 'footing', 'tithe'],
    reserve: ['tithe', 'leap'],
    dice: ['red', 'gold'],
    goals: { safe: 25, risk: [6, 12] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [15, 2]: 6 ways, best surplus 0; 1 optional of 6 cards; 4 of 10 first plays lose. */
const COST_MEDIUM_06: HazardPuzzleCandidate = {
    id: 'cand-cost-medium-06',
    label: 'two wild dice, a dive and a tithe',
    intendedBand: 'medium',
    route: 'risk',
    title: getHazardDef('fever-rot').title,
    act: 1,
    hazardId: 'fever-rot',
    region: 'charcoal-wood',
    hand: ['windread', 'grip', 'scram', 'headlong', 'tithe'],
    reserve: ['scram', 'oath'],
    dice: ['gold', 'gold'],
    rerollFaces: ['gold'],
    goals: { safe: 29, risk: [15, 2] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [15, 8]: 5 ways, best surplus 0; 1 optional of 6 cards; 5 of 12 first plays lose. */
const COST_MEDIUM_07: HazardPuzzleCandidate = {
    id: 'cand-cost-medium-07',
    label: 'an oath in hand, a pawn beside it',
    intendedBand: 'medium',
    route: 'risk',
    title: getHazardDef('cracked-cliff').title,
    act: 1,
    hazardId: 'cracked-cliff',
    region: 'beacon-crags',
    hand: ['windread', 'pawn', 'oath', 'stones', 'breakneck'],
    reserve: ['grip'],
    dice: ['gold', 'purple'],
    rerollFaces: ['red', 'gold'],
    goals: { safe: 26, risk: [15, 8] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Safe 29: 5 ways, best surplus 0; 0 optional of 4 cards; 3 of 9 first plays lose. */
const COST_MEDIUM_08: HazardPuzzleCandidate = {
    id: 'cand-cost-medium-08',
    label: 'two oaths, two tithes',
    intendedBand: 'medium',
    route: 'safe',
    title: getHazardDef('flooded-undercroft').title,
    act: 1,
    hazardId: 'flooded-undercroft',
    region: 'lantern-deep',
    hand: ['oath', 'tithe', 'tithe', 'windread', 'leap'],
    reserve: ['oath', 'windread'],
    dice: ['blue', 'gold'],
    goals: { safe: 29, risk: [10, 19] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Safe 13: 18 ways, best surplus 0; 0 optional of 5 cards; 2 of 11 first plays lose. */
const COST_MEDIUM_09: HazardPuzzleCandidate = {
    id: 'cand-cost-medium-09',
    label: 'four costs and a wind',
    intendedBand: 'medium',
    route: 'safe',
    title: getHazardDef('ashfall-crossing').title,
    act: 1,
    hazardId: 'ashfall-crossing',
    region: 'charcoal-wood',
    hand: ['stones', 'breakneck', 'windread', 'headlong', 'pawn'],
    reserve: [],
    dice: ['hex', 'blue', 'gold'],
    rerollFaces: ['purple', 'gold'],
    goals: { safe: 13, risk: [9, 2] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Safe 15: 5 ways, best surplus 0; 0 optional of 4 cards; 3 of 8 first plays lose. */
const COST_MEDIUM_10: HazardPuzzleCandidate = {
    id: 'cand-cost-medium-10',
    label: 'pawns and footings, paired',
    intendedBand: 'medium',
    route: 'safe',
    title: getHazardDef('famine-march').title,
    act: 1,
    hazardId: 'famine-march',
    region: 'breakwater',
    hand: ['pawn', 'footing', 'pawn', 'breakneck', 'footing'],
    reserve: ['windread'],
    dice: ['purple', 'gold'],
    goals: { safe: 15, risk: [12, 3] },
    bands: { safe: 'medium', risk: 'medium' },
    unlocks: [],
};

/** Risk [8, 14]: 1 way, best surplus 0; 0 optional of 6 cards; 7 of 11 first plays lose. */
const COST_HARD_01: HazardPuzzleCandidate = {
    id: 'cand-cost-hard-01',
    label: 'four costs, one blank die',
    intendedBand: 'hard',
    route: 'risk',
    title: getHazardDef('bandit-hunt').title,
    act: 1,
    hazardId: 'bandit-hunt',
    region: 'breakwater',
    hand: ['tithe', 'breakneck', 'headlong', 'pawn', 'footing'],
    reserve: ['oath'],
    dice: ['blue', 'hex', 'gold'],
    rerollFaces: ['red'],
    goals: { safe: 20, risk: [8, 14] },
    bands: { safe: 'medium', risk: 'hard' },
    unlocks: [],
};

/** Risk [12, 2]: 2 ways, best surplus 0; 0 optional of 6 cards; 5 of 10 first plays lose. */
const COST_HARD_02: HazardPuzzleCandidate = {
    id: 'cand-cost-hard-02',
    label: 'a breakneck in the reserve',
    intendedBand: 'hard',
    route: 'risk',
    title: getHazardDef('fever-rot').title,
    act: 1,
    hazardId: 'fever-rot',
    region: 'charcoal-wood',
    hand: ['tithe', 'pawn', 'haul', 'leap', 'footing'],
    reserve: ['breakneck'],
    dice: ['gold', 'hex'],
    goals: { safe: 17, risk: [12, 2] },
    bands: { safe: 'medium', risk: 'hard' },
    unlocks: [],
};

/** Safe 10: 1 way, best surplus 0; 0 optional of 5 cards; 5 of 8 first plays lose. */
const COST_HARD_03: HazardPuzzleCandidate = {
    id: 'cand-cost-hard-03',
    label: 'two stones, one face',
    intendedBand: 'hard',
    route: 'safe',
    title: getHazardDef('cracked-cliff').title,
    act: 1,
    hazardId: 'cracked-cliff',
    region: 'beacon-crags',
    hand: ['stones', 'tithe', 'pawn', 'stones', 'scram'],
    reserve: ['pawn', 'windread'],
    dice: ['gold', 'hex'],
    rerollFaces: ['red'],
    goals: { safe: 10, risk: [4, 3] },
    bands: { safe: 'hard', risk: 'medium' },
    unlocks: [],
};

/** Risk [4, 22]: 1 way, best surplus 0; 0 optional of 5 cards; 6 of 10 first plays lose. */
const COST_HARD_04: HazardPuzzleCandidate = {
    id: 'cand-cost-hard-04',
    label: 'an oath to power, a long escape',
    intendedBand: 'hard',
    route: 'risk',
    title: getHazardDef('flooded-undercroft').title,
    act: 1,
    hazardId: 'flooded-undercroft',
    region: 'lantern-deep',
    hand: ['headlong', 'footing', 'oath', 'tithe', 'tithe'],
    reserve: ['footing', 'leap'],
    dice: ['purple', 'gold'],
    rerollFaces: ['blue', 'gold'],
    goals: { safe: 27, risk: [4, 22] },
    bands: { safe: 'medium', risk: 'hard' },
    unlocks: [],
};

/** Risk [1, 17]: 1 way, best surplus 0; 0 optional of 4 cards; 5 of 9 first plays lose. */
const COST_HARD_05: HazardPuzzleCandidate = {
    id: 'cand-cost-hard-05',
    label: 'two hauls that cost escape',
    intendedBand: 'hard',
    route: 'risk',
    title: getHazardDef('ashfall-crossing').title,
    act: 1,
    hazardId: 'ashfall-crossing',
    region: 'charcoal-wood',
    hand: ['scram', 'footing', 'breakneck', 'breakneck', 'headlong'],
    reserve: ['scram'],
    dice: ['gold', 'purple'],
    rerollFaces: ['gold', 'purple'],
    goals: { safe: 22, risk: [1, 17] },
    bands: { safe: 'medium', risk: 'hard' },
    unlocks: [],
};

/** Risk [19, 1]: 1 way, best surplus 0; 0 optional of 6 cards; 5 of 13 first plays lose. */
const COST_HARD_06: HazardPuzzleCandidate = {
    id: 'cand-cost-hard-06',
    label: 'three red cards, two red dice',
    intendedBand: 'hard',
    route: 'risk',
    title: getHazardDef('famine-march').title,
    act: 1,
    hazardId: 'famine-march',
    region: 'breakwater',
    hand: ['headlong', 'tithe', 'breakneck', 'grip', 'stones'],
    reserve: ['haul'],
    dice: ['red', 'gold', 'red'],
    rerollFaces: ['purple'],
    goals: { safe: 21, risk: [19, 1] },
    bands: { safe: 'medium', risk: 'hard' },
    unlocks: [],
};

/** Risk [20, 4]: 2 ways, best surplus 0; 0 optional of 5 cards; 6 of 12 first plays lose. */
const COST_HARD_07: HazardPuzzleCandidate = {
    id: 'cand-cost-hard-07',
    label: 'both overdrives, one wild die',
    intendedBand: 'hard',
    route: 'risk',
    title: getHazardDef('bandit-hunt').title,
    act: 1,
    hazardId: 'bandit-hunt',
    region: 'breakwater',
    hand: ['pawn', 'grip', 'headlong', 'breakneck', 'scram'],
    reserve: ['grip'],
    dice: ['gold', 'red'],
    rerollFaces: ['red'],
    goals: { safe: 24, risk: [20, 4] },
    bands: { safe: 'medium', risk: 'hard' },
    unlocks: [],
};

/** Safe 19: 1 way, best surplus 0; 0 optional of 5 cards; 5 of 10 first plays lose. */
const COST_HARD_08: HazardPuzzleCandidate = {
    id: 'cand-cost-hard-08',
    label: 'the stones wait in reserve',
    intendedBand: 'hard',
    route: 'safe',
    title: getHazardDef('fever-rot').title,
    act: 1,
    hazardId: 'fever-rot',
    region: 'charcoal-wood',
    hand: ['breakneck', 'pawn', 'grip', 'breakneck', 'footing'],
    reserve: ['stones'],
    dice: ['red', 'gold'],
    rerollFaces: ['blue'],
    goals: { safe: 19, risk: [13, 1] },
    bands: { safe: 'hard', risk: 'medium' },
    unlocks: [],
};

/** Safe 20: 1 way, best surplus 0; 0 optional of 5 cards; 5 of 10 first plays lose. */
const COST_HARD_09: HazardPuzzleCandidate = {
    id: 'cand-cost-hard-09',
    label: 'one gold die, one oath',
    intendedBand: 'hard',
    route: 'safe',
    title: getHazardDef('cracked-cliff').title,
    act: 1,
    hazardId: 'cracked-cliff',
    region: 'beacon-crags',
    hand: ['tithe', 'oath', 'stones', 'footing', 'haul'],
    reserve: [],
    dice: ['blue', 'gold'],
    rerollFaces: ['red', 'purple'],
    goals: { safe: 20, risk: [10, 2] },
    bands: { safe: 'hard', risk: 'medium' },
    unlocks: [],
};

/** Safe 27: 2 ways, best surplus 0; 0 optional of 6 cards; 7 of 12 first plays lose. */
const COST_HARD_10: HazardPuzzleCandidate = {
    id: 'cand-cost-hard-10',
    label: 'one wild, one red, an oath',
    intendedBand: 'hard',
    route: 'safe',
    title: getHazardDef('flooded-undercroft').title,
    act: 1,
    hazardId: 'flooded-undercroft',
    region: 'lantern-deep',
    hand: ['headlong', 'tithe', 'oath', 'grip', 'stones'],
    reserve: ['footing'],
    dice: ['gold', 'red'],
    rerollFaces: ['red', 'purple'],
    goals: { safe: 27, risk: [15, 8] },
    bands: { safe: 'hard', risk: 'medium' },
    unlocks: [],
};


/** The candidate puzzles: the ten hard, then the twenty cost-card candidates (ten medium, ten hard). */
export const HAZARD_PUZZLE_CANDIDATES: readonly HazardPuzzleCandidate[] = [
    HARD_01, HARD_02, HARD_03, HARD_04, HARD_05, HARD_06, HARD_07, HARD_08, HARD_09, HARD_10,
    COST_MEDIUM_01, COST_MEDIUM_02, COST_MEDIUM_03, COST_MEDIUM_04, COST_MEDIUM_05,
    COST_MEDIUM_06, COST_MEDIUM_07, COST_MEDIUM_08, COST_MEDIUM_09, COST_MEDIUM_10,
    COST_HARD_01, COST_HARD_02, COST_HARD_03, COST_HARD_04, COST_HARD_05,
    COST_HARD_06, COST_HARD_07, COST_HARD_08, COST_HARD_09, COST_HARD_10,
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

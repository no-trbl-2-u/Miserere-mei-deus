/**
 * A hand-built candidate set for the HAZARD PUZZLES list tests (HP4d): four
 * candidates made from the three demo layouts, authored out of band order
 * so a test can see the grouping put them back in it. Passed to the
 * presenter and the board as a prop; the engine's own candidate set is
 * never touched.
 */

import { getHazardPuzzleLayout, type HazardPuzzleCandidate } from '@mechanics';

const CLIFF = getHazardPuzzleLayout('demo-cliff-easy');
const ASHFALL = getHazardPuzzleLayout('demo-ashfall-medium');
const UNDERCROFT = getHazardPuzzleLayout('demo-undercroft-hard');

export const CANDIDATE_FIXTURE: readonly HazardPuzzleCandidate[] = [
    { ...CLIFF, id: 'cand-easy-a', label: 'one trap, two decoys', intendedBand: 'easy', route: 'safe' },
    // Measured easy on its safe route, authored hard: its clock is the hard one.
    { ...CLIFF, id: 'cand-hard-a', label: 'the long way round', intendedBand: 'hard', route: 'safe' },
    { ...ASHFALL, id: 'cand-medium-a', label: 'draw before you power', intendedBand: 'medium', route: 'risk' },
    { ...UNDERCROFT, id: 'cand-easy-b', label: 'spend the gold first', intendedBand: 'easy', route: 'risk' },
];

/**
 * Hazard puzzle board presenter (A14, A15, A18, A19, A21): the demo list, the
 * live route-select and board view models fed from a puzzle (one round), the
 * strip's clock and reserve count, the stat-unlock line, the clock
 * arithmetic and the outcome panel.
 */

import { describe, expect, it } from '@jest/globals';

import {
    confirmHazardPuzzle,
    createHazardPuzzleSession,
    getHazardPuzzleLayout,
    HAZARD_PUZZLE_CLOCK_SECONDS,
    hazardPuzzleOutcome,
    stageHazardPuzzleCard,
    type HazardPuzzleUnlock,
} from '@mechanics';

import {
    formatHazardPuzzleClock,
    hazardPuzzleClockExpired,
    hazardPuzzleClockFor,
    selectHazardPuzzleListVM,
    selectHazardPuzzleOutcomeVM,
    selectHazardPuzzleRouteSelectVM,
    selectHazardPuzzleStripVM,
    selectHazardPuzzleUnlockLine,
    selectHazardPuzzleViewModel,
    tickHazardPuzzleClock,
} from '../hazard-puzzle.engine';

const HARD = getHazardPuzzleLayout('demo-undercroft-hard');

describe('the demo list', () => {
    it('lists the three demos with their risk band', () => {
        expect(selectHazardPuzzleListVM().map((i) => [i.id, i.title, i.bandChip])).toEqual([
            ['demo-cliff-easy', 'CRACKED CLIFF PATH', 'EASY ON THE RISK ROUTE'],
            ['demo-ashfall-medium', 'ASHFALL CROSSING', 'MEDIUM ON THE RISK ROUTE'],
            ['demo-undercroft-hard', 'FLOODED UNDERCROFT', 'HARD ON THE RISK ROUTE'],
        ]);
    });
});

describe('the route pick on the live RouteSelect (A19)', () => {
    it('feeds both routes from the live hazard, with the layout goal, band and clock', () => {
        const vm = selectHazardPuzzleRouteSelectVM(HARD, []);
        expect(vm.phase).toBe('route-select');
        expect(vm.totalRounds).toBe(1);
        expect(vm.title).toBe('FLOODED UNDERCROFT');
        expect(vm.routeChoices.map((r) => [r.key, r.name, r.badge, r.dual])).toEqual([
            ['safe', 'THE LONG GALLERY', 'MEDIUM · 75 S', false],
            ['risk', 'THE DROWNED DOOR', 'HARD · 60 S', true],
        ]);
        expect(vm.routeChoices[0].ladder).toEqual([{ key: 'passage', label: 'PASS', values: [26] }]);
        expect(vm.routeChoices[1].ladder).toEqual([
            { key: 'force', label: 'FOR', values: [13] },
            { key: 'escape', label: 'ESC', values: [14] },
        ]);
        expect(vm.routeChoices.map((r) => [r.rewardLabel, r.penaltyLabel])).toEqual([
            ['XP and a find; clear it for +12 shillings', 'up to −6♥'],
            ['XP and a find; clear it for +32 shillings', 'up to −12♥'],
        ]);
        expect(vm.routeChoices[1].ctaLabel).toBe('TAKE THE DROWNED DOOR ›');
    });

    it('previews the opening hand with the stat unlocks granted', () => {
        const unlocks: HazardPuzzleUnlock[] = [{ stat: 'mind', min: 3, kind: 'extraCard', cardId: 'runner' }];
        expect(selectHazardPuzzleRouteSelectVM(HARD, []).hand.map((c) => c.cardId)).toEqual(['footing', 'haul', 'scram']);
        expect(selectHazardPuzzleRouteSelectVM(HARD, unlocks).hand.map((c) => c.cardId)).toEqual([
            'footing',
            'haul',
            'scram',
            'runner',
        ]);
    });
});

describe('the clock (A15)', () => {
    it('takes the clock from the band of the route played', () => {
        expect(HAZARD_PUZZLE_CLOCK_SECONDS).toEqual({ easy: 90, medium: 75, hard: 60 });
        expect(hazardPuzzleClockFor(HARD, 'risk')).toBe(60);
        expect(hazardPuzzleClockFor(HARD, 'safe')).toBe(75);
    });

    it('ticks a second at a time, stops at zero, and expires there', () => {
        expect(tickHazardPuzzleClock(60)).toBe(59);
        expect(tickHazardPuzzleClock(0)).toBe(0);
        expect(hazardPuzzleClockExpired(1)).toBe(false);
        expect(hazardPuzzleClockExpired(0)).toBe(true);
        expect(formatHazardPuzzleClock(75)).toBe('1:15');
        expect(formatHazardPuzzleClock(9)).toBe('0:09');
    });
});

describe('the stat-unlock line', () => {
    it('names each unlock the stats met, or says none', () => {
        const unlocks: HazardPuzzleUnlock[] = [
            { stat: 'heart', min: 3, kind: 'extraDie' },
            { stat: 'mind', min: 3, kind: 'extraCard', cardId: 'runner' },
            { stat: 'mind', min: 2, kind: 'blankReroll', face: 'gold' },
        ];
        expect(selectHazardPuzzleUnlockLine(unlocks)).toBe(
            'Your stats unlock: +1 PURPLE die (HEART 3); CLIFFRUNNER joins the hand (MIND 3); blank dice turn YELLOW (MIND 2).',
        );
        expect(selectHazardPuzzleUnlockLine([])).toBe('Your stats unlock nothing here.');
    });
});

describe('the board as the live hazard view model (A18, A21)', () => {
    it('shows one round: the hand, dice, goal meters and a CONFIRM resolve', () => {
        const vm = selectHazardPuzzleViewModel(HARD, createHazardPuzzleSession(HARD, 'risk'));
        expect(vm.phase).toBe('playing');
        expect(vm.title).toBe('FLOODED UNDERCROFT');
        expect(vm.routeKey).toBe('risk');
        expect(vm.hand.map((c) => c.cardId)).toEqual(['footing', 'haul', 'scram']);
        expect(vm.dice.map((d) => d.kind)).toEqual(['purple', 'red', 'blue']);
        expect(vm.meters.map((m) => [m.key, m.value, m.need])).toEqual([
            ['force', 0, 13],
            ['escape', 0, 14],
        ]);
        expect(vm.bothRequired).toBe(true);
        // One round: one ledger mark, no momentum, a one-value ladder.
        expect(vm.totalRounds).toBe(1);
        expect(vm.roundLabel).toBe('ROUND I / I');
        expect(vm.marks).toEqual(['pending']);
        expect(vm.momentumNote).toBeNull();
        expect(vm.thresholdLadder).toEqual([
            { key: 'force', label: 'FOR', values: [13] },
            { key: 'escape', label: 'ESC', values: [14] },
        ]);
        // The reserve is the deck the live board counts.
        expect(vm.deckCount).toBe(2);
        expect(vm.resolveLabel).toBe('CONFIRM');
        expect(vm.resolveEnabled).toBe(true);
        expect(vm.resolveFlash).toBeNull();
        expect(vm.outcome).toBeNull();
        expect(vm.rewards).toBeNull();
    });

    it('reads the safe goal on the combined PASSAGE meter', () => {
        const vm = selectHazardPuzzleViewModel(HARD, createHazardPuzzleSession(HARD, 'safe'));
        expect(vm.meters.map((m) => [m.key, m.need])).toEqual([['passage', 26]]);
        expect(vm.bothRequired).toBe(false);
    });

    it('moves a staged card into the play area and onto the meters', () => {
        const vm = selectHazardPuzzleViewModel(HARD, stageHazardPuzzleCard(createHazardPuzzleSession(HARD, 'risk'), 'c1'));
        expect(vm.play.map((c) => c.uid)).toEqual(['c1']);
        expect(vm.hand).toHaveLength(2);
        expect(vm.meters.map((m) => m.value)).toEqual([2, 2]);
    });

    it('locks the board once resolved', () => {
        const vm = selectHazardPuzzleViewModel(HARD, confirmHazardPuzzle(createHazardPuzzleSession(HARD, 'risk')));
        expect(vm.resolveEnabled).toBe(false);
        expect(vm.phase).toBe('outcome');
        expect(vm.marks).toEqual(['X']);
    });
});

describe('the puzzle strip (A21)', () => {
    it('shows the clock face and the reserve count, urgent under ten seconds', () => {
        const session = createHazardPuzzleSession(HARD, 'risk');
        expect(selectHazardPuzzleStripVM(session, 60)).toEqual({
            clockLabel: '1:00',
            clockUrgent: false,
            reserveLabel: '2 CARDS IN RESERVE',
        });
        expect(selectHazardPuzzleStripVM(session, 9).clockUrgent).toBe(true);
    });
});

describe('the outcome panel', () => {
    it('lists the rewards and the penalty of a short resolve', () => {
        const result = { force: 0, escape: 0, goal: [13, 14] as [number, number], p: 0, cleared: false };
        const outcome = hazardPuzzleOutcome({ route: 'risk', result, playerLevel: 2, region: 'lantern-deep', seed: 3 });
        const vm = selectHazardPuzzleOutcomeVM(result, outcome, true);
        expect(vm.headline).toBe('TIME RAN OUT');
        expect(vm.cleared).toBe(false);
        expect(vm.mark).toBe('X');
        expect(vm.reachedLabel).toBe('0% OF THE GOAL');
        expect(vm.rewards[0]).toBe('+20 XP');
        expect(vm.penalties).toEqual(['-12 VITAE', 'SCARRED: -5 MAX VITAE UNTIL YOU REST']);
    });

    it('prints the penalty the claim applied, not the nominal one the floors softened', () => {
        // A 4/7 VITAE player failing risk at p = 0: nominally -12 VITAE and -5 max, applied -3 and -2.
        const result = { force: 0, escape: 0, goal: [13, 14] as [number, number], p: 0, cleared: false };
        const outcome = hazardPuzzleOutcome({ route: 'risk', result, playerLevel: 1, region: 'lantern-deep', seed: 3 });
        const vm = selectHazardPuzzleOutcomeVM(result, outcome, false, { vitaeLost: 3, scarApplied: 2 });
        expect(vm.penalties).toEqual(['-3 VITAE', 'SCARRED: -2 MAX VITAE UNTIL YOU REST']);
    });

    it('never reads 100% on a short resolve', () => {
        const result = { force: 199, escape: 0, goal: 200, p: 199 / 200, cleared: false };
        const outcome = hazardPuzzleOutcome({ route: 'safe', result, playerLevel: 1, region: 'lantern-deep', seed: 3 });
        expect(selectHazardPuzzleOutcomeVM(result, outcome, false).reachedLabel).toBe('99% OF THE GOAL');
    });

    it('a clear pays the purse and loses nothing', () => {
        const result = { force: 13, escape: 14, goal: [13, 14] as [number, number], p: 1, cleared: true };
        const outcome = hazardPuzzleOutcome({ route: 'risk', result, playerLevel: 2, region: 'lantern-deep', seed: 3 });
        const vm = selectHazardPuzzleOutcomeVM(result, outcome, false);
        expect(vm.headline).toBe('CLEARED');
        expect(vm.mark).toBe('O');
        expect(vm.rewards).toContain('+32 SHILLINGS');
        expect(vm.penalties).toEqual(['Nothing lost.']);
    });
});

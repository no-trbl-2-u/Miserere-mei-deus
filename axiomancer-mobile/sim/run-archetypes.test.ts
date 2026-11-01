/**
 * The archetype bots do what their names say (phase SM1f, A12): each plays
 * ten whole Breakwater runs through the app's store actions, and the test
 * checks the bot, never the game. It asserts no win rate, no VITAE and no
 * count of fights won.
 *
 * - Every run opens at character select as the roster character the lane
 *   rule picks (T, 2026-10-31: characters only, the run a player plays).
 * - Where that character opens the bot's lane (a starting lane, or the
 *   starting relic's lane), every end deck holds more cards of the lane than
 *   of any other card lane. The grey office is not a lane a bot builds: it is
 *   the dealt starting deck and is never offered, so it is not counted. A
 *   lane no roster character opens skips this check until one does.
 * - The Merciful ends at least one fight by befriending.
 * - No run sticks: a stuck step throws out of `playRun`.
 */

import {
    ARCHETYPE_POLICIES,
    CHARACTER_ROSTER,
    MERCIFUL_POLICY,
    characterForLane,
    characterOpensLane,
    type RunPolicy,
} from '@mechanics';

import { playRun, type RunResult } from './run-driver';

const SEEDS = Array.from({ length: 10 }, (_, i) => i + 1);

/** The other card lanes the end deck holds more of than any, the grey office aside. */
function rivals(run: RunResult, laneId: string): [string, number][] {
    return Object.entries(run.deckByLane).filter(([lane]) => lane !== laneId && lane !== 'grey' && lane !== 'none');
}

describe.each(ARCHETYPE_POLICIES.map((p) => [p.id, p] as [string, RunPolicy]))('the %s bot', (laneId, policy) => {
    const character = characterForLane(CHARACTER_ROSTER, laneId);
    const inLane = characterOpensLane(character, laneId);
    let runs: RunResult[] = [];

    beforeAll(() => {
        runs = SEEDS.map((seed) => playRun({ policy, seed }));
    }, 5 * 60 * 1000);

    it('plays every seed to a run end as the character its lane picks', () => {
        expect(runs).toHaveLength(SEEDS.length);
        for (const run of runs) {
            expect(['run-over', 'chapter-clear']).toContain(run.outcome);
            expect(run.characterId).toBe(character.id);
        }
    });

    // The Merciful once never drafted its lane (a befriend paid shillings or a
    // potion and no card draft; phase BUG1j). The Chosen now starts with a
    // merciful card of its own (SD1a), so the Merciful's end deck leads again.
    const leadCheck = !inLane ? it.skip : it;
    leadCheck(`ends every run with more ${laneId} cards than of any other card lane (it starts in-lane)`, () => {
        for (const run of runs) {
            const own = run.deckByLane[laneId] ?? 0;
            for (const [lane, n] of rivals(run, laneId)) {
                if (own <= n) throw new Error(`seed ${run.seed}: ${laneId}=${own} does not lead ${lane}=${n}`);
            }
            expect(own).toBeGreaterThan(0);
        }
    });

    if (policy === MERCIFUL_POLICY) {
        it('ends at least one fight by befriending', () => {
            expect(runs.reduce((sum, run) => sum + run.fights.spared, 0)).toBeGreaterThan(0);
        });
    }
});

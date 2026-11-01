/**
 * The headless run driver (phase SM1e, A9): a whole Breakwater run through
 * the app's store actions, every node kind resolved through its screen's
 * action, the same seed giving the same run, and a step with no legal move
 * throwing with the node. Nothing here asserts a sim number (a measurement, never a bar): the tests
 * check the driver, never the game's balance.
 */

import {
    CHARACTER_ROSTER,
    WANDERER_POLICY,
    characterDeck,
    type RunPolicy,
} from '@mechanics';

import { playRun, type PlayRunOptions } from './run-driver';
import { describeScreen, RunStuckError } from './run-stuck';
import { playRuns } from './sim-runs';

/** A wanderer that records every seam it was asked. */
function spying(base: RunPolicy = WANDERER_POLICY): { policy: RunPolicy; asked: Map<string, number> } {
    const asked = new Map<string, number>();
    const policy = { ...base } as Record<string, unknown>;
    for (const [key, value] of Object.entries(base)) {
        if (typeof value !== 'function') continue;
        policy[key] = (...args: unknown[]) => {
            asked.set(key, (asked.get(key) ?? 0) + 1);
            return (value as (...a: unknown[]) => unknown)(...args);
        };
    }
    return { policy: policy as unknown as RunPolicy, asked };
}

/** Play one run, recording each distinct screen the driver answered. */
function tracedRun(options: Omit<PlayRunOptions, 'onStep'>) {
    const screens = new Set<string>();
    const result = playRun({
        ...options,
        onStep: (store) => {
            screens.add(describeScreen(store.getState()).split(':')[0]!);
            const kind = store.getState().event?.pending?.event.kind;
            if (kind) screens.add(`event:${kind}`);
        },
    });
    return { result, screens };
}

describe('the headless run driver', () => {
    let fetchSpy: jest.SpyInstance | null = null;
    beforeEach(() => {
        if (typeof globalThis.fetch === 'function') fetchSpy = jest.spyOn(globalThis, 'fetch');
    });
    afterEach(() => {
        fetchSpy?.mockRestore();
        fetchSpy = null;
    });

    it('plays a new game as a roster character to a run end, through every Breakwater node kind', () => {
        const { policy, asked } = spying();
        const { result, screens } = tracedRun({ policy, seed: 8 });
        expect(['run-over', 'chapter-clear']).toContain(result.outcome);
        expect(result.characterId).toBe(CHARACTER_ROSTER[0]!.id);
        expect(result.runId).toMatch(/^[0-9a-f]{16}$/);
        // The node kinds the Breakwater carries, each answered on its own screen.
        for (const screen of ['event:cutscene', 'event:encounter', 'event:village', 'rest', 'cache', 'hazard', 'quest', 'travel', 'item-reward']) {
            expect(screens).toContain(screen);
        }
        // The seams a player is asked on the way.
        for (const seam of ['chooseCharacter', 'chooseRoad', 'takeTravel', 'pickReward', 'chooseRest', 'chooseCacheOffer', 'visitVillage', 'hazardPolicy', 'fightPolicy', 'flee', 'raiseStat', 'takeItem']) {
            expect(asked.get(seam) ?? 0).toBeGreaterThan(0);
        }
        // The deck carried from node to node: the character's ten cards are still in it.
        const dealt = characterDeck(CHARACTER_ROSTER[0]!).length;
        expect(Object.values(result.deckByLane).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(dealt);
        // It posts nothing: the play-log gate is shut under the driver.
        expect(fetchSpy?.mock.calls.length ?? 0).toBe(0);
    });

    it('gives the same run for the same seed and policy', () => {
        expect(playRun({ policy: WANDERER_POLICY, seed: 2 })).toEqual(playRun({ policy: WANDERER_POLICY, seed: 2 }));
    });

    it('runs the death rule: a dying player who loses the first fight ends the run', () => {
        const result = playRun({
            policy: WANDERER_POLICY,
            seed: 3,
            onStart: (store) => store.setState({ player: { ...store.getState().player, health: 1 }, dying: true } as never),
        });
        expect(result.outcome).toBe('run-over');
        expect(result.fights.lost).toBe(1);
        expect(result.vitae).toBe(0);
    });

    it('throws, naming the node and the state, when a step has no legal move', () => {
        const lost: RunPolicy = { ...WANDERER_POLICY, chooseRoad: () => null };
        expect(() => playRun({ policy: lost, seed: 1 })).toThrow(RunStuckError);
        try {
            playRun({ policy: lost, seed: 1 });
        } catch (error) {
            const stuck = error as RunStuckError;
            expect(stuck.node).toBe('bw-w1');
            expect(stuck.message).toMatch(/run stuck at breakwater\/bw-w1 .*screen map.*no road leads to anything unfinished/);
        }
    });

    it('counts each node\'s withdrawals, so a policy can walk away once and fight the next time', () => {
        const seen: number[] = [];
        const shy: RunPolicy = {
            ...WANDERER_POLICY,
            flee: (ctx) => {
                seen.push(ctx.fledHere);
                return ctx.fledHere === 0;
            },
        };
        const result = playRun({ policy: shy, seed: 1 });
        expect(['run-over', 'chapter-clear']).toContain(result.outcome);
        expect(result.fights.fled).toBeGreaterThan(0);
        expect(seen).toContain(1);
        expect(Math.max(...seen)).toBe(1);
    });

    it('tells the road seam what each road leads to, and the travel seam the work left in reach', () => {
        const roads: { elite: boolean; story: boolean; distanceToExit: number | null; distanceToStory: number | null }[] = [];
        const trips: number[] = [];
        const reading: RunPolicy = {
            ...WANDERER_POLICY,
            chooseRoad: (ctx) => {
                roads.push(...ctx.options);
                return WANDERER_POLICY.chooseRoad(ctx);
            },
            takeTravel: (ctx) => {
                trips.push(ctx.unfinishedReachable);
                return WANDERER_POLICY.takeTravel(ctx);
            },
        };
        playRun({ policy: reading, seed: 8 });
        // Filled from the map, the pools and the chapter questline at every step.
        expect(roads.some((o) => o.elite)).toBe(true);
        expect(roads.some((o) => o.story)).toBe(true);
        expect(roads.some((o) => o.distanceToStory !== null)).toBe(true);
        expect(roads.every((o) => o.distanceToExit === null || o.distanceToExit >= 0)).toBe(true);
        expect(trips.length).toBeGreaterThan(0);
        expect(trips.every((n) => Number.isInteger(n) && n >= 0)).toBe(true);
    });

    it('throws when the policy names a road that is not legal', () => {
        const wrong: RunPolicy = { ...WANDERER_POLICY, chooseRoad: () => 'bw-k2' };
        expect(() => playRun({ policy: wrong, seed: 1 })).toThrow(/'bw-k2', which is not a legal road/);
    });

    it('calls a run stuck past its step budget', () => {
        expect(() => playRun({ policy: WANDERER_POLICY, seed: 1, maxSteps: 5 })).toThrow(/no run end in 5 steps/);
    });

    it('records a stuck run in a batch and plays the rest', () => {
        const runs = playRuns(WANDERER_POLICY, { runs: 2, seed: 1 }, (options) =>
            options.seed === 1 ? playRun({ ...options, maxSteps: 3 }) : playRun(options));
        // Three steps: the windmill's cutscene, its dismissal, the road to the first fight.
        expect(runs[0]).toMatchObject({ policy: 'wanderer', seed: 1, stuck: true, node: 'bw-w2' });
        expect(runs[1]).toMatchObject({ policy: 'wanderer', seed: 2 });
        expect('stuck' in runs[1]!).toBe(false);
    });
});

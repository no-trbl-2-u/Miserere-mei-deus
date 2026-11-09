/**
 * The sim batch's breaks (phase SM2d, A9): a crash, a stuck run and a stuck
 * fight each become a recorded break with a key and a state summary while the
 * batch goes on; the end-of-run checks come back as findings, never thrown.
 * Nothing here asserts a sim number.
 */

import { WANDERER_POLICY, type RunPolicy } from '@mechanics';

import { breakKey } from './run-breaks';
import { playRun } from './run-driver';
import { RunCrashError, RunStuckError } from './run-stuck';
import { breaksOf, playRuns } from './sim-runs';

describe('the break key', () => {
    it('is persona, map, node and kind', () => {
        expect(breakKey('rusher', 'breakwater', 'bw-t3', 'stuck')).toBe('rusher:breakwater/bw-t3:stuck');
    });
});

describe('breaks in the batch', () => {
    it('records a stuck run as a break with its state summary and plays the next seed', () => {
        const lost: RunPolicy = { ...WANDERER_POLICY, chooseRoad: () => null };
        const runs = playRuns(lost, { runs: 2, seed: 1, build: 'abc' }, (options) => playRun(options));
        expect(runs).toHaveLength(2);
        const breaks = breaksOf(runs, 'abc');
        expect(breaks).toHaveLength(2);
        expect(breaks[0]).toMatchObject({
            key: 'wanderer:breakwater/bw-w1:stuck',
            kind: 'stuck',
            persona: 'wanderer',
            seed: 1,
            build: 'abc',
            state: { map: 'breakwater', node: 'bw-w1', screen: 'map' },
        });
        expect(breaks[0]!.state.deckSize).toBeGreaterThan(0);
        expect(Array.isArray(breaks[0]!.state.lastEvents)).toBe(true);
    });

    it('records an exception out of a step as a crash', () => {
        const boom: RunPolicy = { ...WANDERER_POLICY, chooseRoad: () => { throw new Error('boom'); } };
        const [run] = playRuns(boom, { runs: 1, seed: 1 }, (options) => playRun(options));
        expect(run).toMatchObject({ stuck: true, kind: 'crash', node: 'bw-w1' });
        expect((run as { break: { message: string } }).break.message).toMatch(/boom/);
        expect(() => playRun({ policy: boom, seed: 1 })).toThrow(RunCrashError);
    });

    it('records a stuck fight as fight-stuck', () => {
        const [run] = playRuns(WANDERER_POLICY, { runs: 1, seed: 1 }, () => {
            throw Object.assign(new RunStuckError('fight did not end', {
                map: 'breakwater', node: 'bw-w2', health: 1, maxHealth: 2, level: 1, screen: 'fight', step: 4,
            }), { kind: 'fight-stuck' as const });
        });
        expect(run).toMatchObject({ stuck: true, kind: 'fight-stuck', node: 'bw-w2' });
    });

    it('lets an error the driver does not throw through', () => {
        expect(() => playRuns(WANDERER_POLICY, { runs: 1, seed: 1 }, () => { throw new TypeError('not a break'); })).toThrow(TypeError);
    });

    it('finds no break in a run that plays through (the end-of-run checks stay quiet)', () => {
        const result = playRun({ policy: WANDERER_POLICY, seed: 2 });
        expect(result.findings).toEqual([]);
        expect(breaksOf([result], null)).toEqual([]);
    });
});

/**
 * A batch of runs (phase SM1e): seeds `seed`, `seed + 1`, … one run each,
 * a stuck run recorded as its error rather than ending the batch.
 */

import type { RunPolicy } from '@mechanics';

import type { PlayRunOptions, RunResult } from './run-driver';
import { RunStuckError } from './run-stuck';

/** What `npm run sim:run` asks for. */
export interface SimRunRequest {
    readonly policy: string;
    readonly runs: number;
    readonly seed: number;
}

/** A run that stuck: its seed, the node and the error's words. */
export interface StuckRun {
    readonly policy: string;
    readonly seed: number;
    readonly stuck: true;
    readonly node: string;
    readonly error: string;
}

export type SimRunEntry = RunResult | StuckRun;

/**
 * Play `request.runs` runs of `policy`, one seed each.
 *
 * @param policy  - The run policy.
 * @param request - The run count and the first seed.
 * @param play    - The driver (injected so tests can stub it).
 */
export function playRuns(
    policy: RunPolicy,
    request: Pick<SimRunRequest, 'runs' | 'seed'>,
    play: (options: PlayRunOptions) => RunResult,
): SimRunEntry[] {
    const out: SimRunEntry[] = [];
    for (let i = 0; i < request.runs; i++) {
        const seed = request.seed + i;
        try {
            out.push(play({ policy, seed }));
        } catch (error) {
            if (!(error instanceof RunStuckError)) throw error;
            out.push({ policy: policy.id, seed, stuck: true, node: error.node, error: error.message });
        }
    }
    return out;
}

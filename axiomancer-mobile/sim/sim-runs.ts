/**
 * A batch of runs (phase SM1e): seeds `seed`, `seed + 1`, … one run each,
 * a stuck run recorded as its error rather than ending the batch.
 */

import type { RunPolicy } from '@mechanics';

import type { PlayRunOptions, RunResult } from './run-driver';
import { playRunPosted, type PostedRun, type SimPostContext } from './run-post';
import { RunStuckError } from './run-stuck';

/** What `npm run sim:run` asks for. */
export interface SimRunRequest {
    readonly policy: string;
    readonly runs: number;
    readonly seed: number;
    /** Present with `--post` (phase SM1g): the batch and build the rows are stamped with. */
    readonly post?: SimPostContext;
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

/**
 * `playRuns` with the app's posters collecting each finished run's requests
 * (phase SM1g). A stuck run is recorded as its error and posts nothing.
 *
 * @param policy  - The run policy.
 * @param request - The run count and the first seed.
 * @param context - The batch and the build the rows are stamped with.
 * @param play    - The driver (injected so tests can stub it).
 */
export async function playRunsPosted(
    policy: RunPolicy,
    request: Pick<SimRunRequest, 'runs' | 'seed'>,
    context: SimPostContext,
    play: (options: PlayRunOptions) => RunResult,
): Promise<{ runs: SimRunEntry[]; posts: PostedRun[] }> {
    const runs: SimRunEntry[] = [];
    const posts: PostedRun[] = [];
    for (let i = 0; i < request.runs; i++) {
        const seed = request.seed + i;
        try {
            const played = await playRunPosted({ policy, seed }, context, play);
            runs.push(played.result);
            posts.push(played.run);
        } catch (error) {
            if (!(error instanceof RunStuckError)) throw error;
            runs.push({ policy: policy.id, seed, stuck: true, node: error.node, error: error.message });
        }
    }
    return { runs, posts };
}

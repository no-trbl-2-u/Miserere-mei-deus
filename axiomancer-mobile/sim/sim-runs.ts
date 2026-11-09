/**
 * A batch of runs (phase SM1e): seeds `seed`, `seed + 1`, … one run each,
 * a broken run (stuck, fight-stuck or crashed) recorded as its break rather
 * than ending the batch (phase SM2d).
 */

import { CHARACTER_ROSTER, type RunPolicy } from '@mechanics';

import type { PlayRunOptions, RunResult } from './run-driver';
import { playRunPosted, type PostedRun, type SimPostContext } from './run-post';
import { breakKindOf, toRunBreak, type BreakKind, type RunBreak } from './run-breaks';

/** What `npm run sim:run` asks for. */
export interface SimRunRequest {
    readonly policy: string;
    readonly runs: number;
    readonly seed: number;
    /** Present with `--post` (phase SM1g): the batch and build the rows are stamped with. */
    readonly post?: SimPostContext;
    /** The checked-out commit the breaks name (phase SM2d); null or absent when none is known. */
    readonly build?: string | null;
}

/** A run that broke and ended: its seed, the kind, the node and the error's words. */
export interface StuckRun {
    readonly policy: string;
    readonly seed: number;
    readonly stuck: true;
    readonly kind: 'crash' | 'stuck' | 'fight-stuck';
    readonly node: string;
    readonly error: string;
    readonly break: RunBreak;
}

/** Turns a thrown error into a recorded run, or rethrows what the driver does not throw. */
function recordBreak(policy: RunPolicy, seed: number, build: string | null, error: unknown): StuckRun {
    const found = breakKindOf(error);
    if (found === null) throw error;
    const e = found.error;
    const kind = found.kind as StuckRun['kind'];
    const characterId = policy.chooseCharacter(CHARACTER_ROSTER) ?? null;
    return {
        policy: policy.id,
        seed,
        stuck: true,
        kind,
        node: e.node,
        error: e.message,
        break: toRunBreak(kind, e.message, e.state, e.detail, { persona: policy.id, characterId, seed, build }),
    };
}

/** Every break a batch found: the runs that ended in one, and the end-of-run checks of the runs that finished. */
export function breaksOf(runs: readonly SimRunEntry[], build: string | null): RunBreak[] {
    const out: RunBreak[] = [];
    for (const run of runs) {
        if ('stuck' in run) {
            out.push(run.break);
            continue;
        }
        for (const f of run.findings) {
            out.push(toRunBreak(f.kind as BreakKind, f.message, f.state, f.detail, {
                persona: run.policy, characterId: run.characterId, seed: run.seed, build,
            }));
        }
    }
    return out;
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
    request: Pick<SimRunRequest, 'runs' | 'seed' | 'build'>,
    play: (options: PlayRunOptions) => RunResult,
): SimRunEntry[] {
    const out: SimRunEntry[] = [];
    for (let i = 0; i < request.runs; i++) {
        const seed = request.seed + i;
        try {
            out.push(play({ policy, seed }));
        } catch (error) {
            out.push(recordBreak(policy, seed, request.build ?? null, error));
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
    request: Pick<SimRunRequest, 'runs' | 'seed' | 'build'>,
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
            runs.push(recordBreak(policy, seed, request.build ?? null, error));
        }
    }
    return { runs, posts };
}

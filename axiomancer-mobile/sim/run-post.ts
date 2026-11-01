/**
 * The run driver's posts (phase SM1g, A13): a run played through the app's own
 * posters, its requests collected instead of sent.
 *
 * The app posts a run through three module-level posters (`lib/fightRecorder`,
 * `lib/deckEvents`, `lib/runLog`), each behind the play-log gate. While a run
 * is played here, the gate's override (`setPlayLogOverride`) opens it with the
 * `sim` stamps (the policy as solver, the batch as session, the checked-out
 * sha as build) and a fetcher that records each request. The run log gets a
 * fresh poster per run, with the policy as `policyId`, so one run's closed-run
 * record never reaches the next. `scripts/sim-run.mjs` sends what was
 * collected, once the run is over, in an order the Worker can read: the
 * `play_runs` open first (a fight's report needs its run), the rows next, the
 * close last.
 *
 * Two things are fixed up on the way out. The engine's run id comes from the
 * seeded RNG, so two batches (or two policies on one seed) can share one: every
 * collected request is renamed to a run id unique to the batch, the policy and
 * the seed. And the close is the driver's own: the run's outcome, level, VITAE,
 * nodes resolved and end deck, snapshotted before the death rule or a hazard
 * reward reset the run. The app's own closes, which read the same state through
 * the same posters, are dropped for it: one close per run, and it is the run
 * the `sim:run` line printed.
 */

import {
    PLAY_RUNS_PATH,
    playRunEndPath,
    type PlayRunEndPost,
    type RunPolicy,
} from '@mechanics';

import { puzzleAppBuild, type PuzzleApiConfig, type PuzzleFetch } from '@/lib/puzzleAttempts';
import { setPlayLogOverride, type PlayLogStamps } from '@/lib/playLog';
import { createRunLogPoster, replaceRunLogPoster } from '@/lib/runLog';

import { playRun, type PlayRunOptions, type RunResult } from './run-driver';

/** Where a batch of sim runs is posted from. */
export interface SimPostContext {
    /** The batch: `GITHUB_RUN_ID` (with its attempt), or a local id. It is the rows' session id. */
    readonly batchId: string;
    /** The checked-out commit, or null when none is known. */
    readonly buildCommit: string | null;
}

/** One request a run would make. */
export interface CollectedPost {
    /** The path under the Worker's origin (`/v1/fights`, `/v1/play-runs/<id>/end`, ...). */
    readonly path: string;
    /** The JSON body, as the poster serialized it. */
    readonly body: string;
}

/** A played run and the requests it made, in the order they should be sent. */
export interface PostedRun {
    readonly policy: string;
    readonly seed: number;
    /** The run id every request carries: unique to the batch, the policy and the seed. */
    readonly runKey: string;
    readonly posts: readonly CollectedPost[];
}

/** The placeholder origin the collected requests are made against; it is cut from each path. */
const CAPTURE_ORIGIN = 'sim://capture';
const CAPTURE_CONFIG: PuzzleApiConfig = { url: CAPTURE_ORIGIN, token: 'sim-capture' };

/** The run id a run is posted under: unique to its batch, its policy and its seed. */
export function simRunKey(batchId: string, policyId: string, seed: number): string {
    return `sim-${batchId}-${policyId}-${seed}`;
}

/** The `play_runs` close the driver posts for a run it finished. */
export function runEndOf(result: RunResult): PlayRunEndPost {
    return {
        outcome: result.outcome,
        endNodeId: result.endNodeId,
        level: result.level,
        vitaeEnd: result.vitae,
        nodesResolved: result.nodesResolved,
        endDeck: [...result.endDeck],
    };
}

/** Rewrites the engine's run id to the batch's in one request. */
function renamed(post: CollectedPost, from: string, to: string): CollectedPost {
    const body = JSON.parse(post.body) as { runId?: unknown };
    if (body.runId !== from) return post;
    return { path: post.path, body: JSON.stringify({ ...body, runId: to }) };
}

const isOpen = (p: CollectedPost): boolean => p.path === PLAY_RUNS_PATH;
const isEnd = (p: CollectedPost): boolean => p.path.startsWith(`${PLAY_RUNS_PATH}/`);

/** Open first, close last, everything else as it was made. */
function inSendOrder(posts: readonly CollectedPost[]): CollectedPost[] {
    return [...posts.filter(isOpen), ...posts.filter((p) => !isOpen(p) && !isEnd(p)), ...posts.filter(isEnd)];
}

/**
 * Play one run with the app's posters collecting what they would send.
 *
 * @param options - The run (policy, seed, test seams).
 * @param context - The batch and the build.
 * @param play    - The driver (injected so tests can stub it).
 * @returns The run's summary and its collected requests.
 * @throws whatever the driver throws (a stuck run posts nothing).
 */
export async function playRunPosted(
    options: PlayRunOptions,
    context: SimPostContext,
    play: (options: PlayRunOptions) => RunResult = playRun,
): Promise<{ result: RunResult; run: PostedRun }> {
    const policy: RunPolicy = options.policy;
    const collected: CollectedPost[] = [];
    const fetcher: PuzzleFetch = async (url, init) => {
        collected.push({ path: url.slice(CAPTURE_ORIGIN.length), body: init.body });
        return { ok: true, status: 200 };
    };
    // Read when a request is made, never at the module's load: the stamps differ per policy and batch.
    const source = (): PlayLogStamps => ({
        solver: policy.id,
        sessionId: context.batchId,
        buildCommit: context.buildCommit,
        appBuild: puzzleAppBuild(),
        source: 'sim',
    });
    const poster = createRunLogPoster({ config: () => CAPTURE_CONFIG, source, fetcher, policyId: () => policy.id });
    const previousPoster = replaceRunLogPoster(poster);
    const previousOverride = setPlayLogOverride({ config: CAPTURE_CONFIG, source, fetcher });
    try {
        const result = play(options);
        // The app's own closes (its death rule, its travel off the map) are dropped: the driver's
        // snapshot is the one close, and it is the run the `sim:run` line printed. The Worker
        // stamps `ended_at`, so nothing here reads a clock.
        await poster.settled();
        const runKey = simRunKey(context.batchId, policy.id, options.seed);
        const rows = collected.filter((p) => !isEnd(p)).map((p) => renamed(p, result.runId, runKey));
        const close: CollectedPost = { path: playRunEndPath(runKey), body: JSON.stringify(runEndOf(result)) };
        return { result, run: { policy: policy.id, seed: options.seed, runKey, posts: inSendOrder([...rows, close]) } };
    } finally {
        setPlayLogOverride(previousOverride);
        replaceRunLogPoster(previousPoster);
    }
}

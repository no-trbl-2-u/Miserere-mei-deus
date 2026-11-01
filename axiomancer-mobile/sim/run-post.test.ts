/**
 * The run driver posts its own data (phase SM1g, A13): a run played through
 * the app's posters comes back as the requests it made, stamped `sim`, under a
 * run id of its own, the open first and the driver's close last. Nothing here
 * asserts a sim number: it checks what is posted and how, never how the bot
 * played.
 */

import {
    WANDERER_POLICY,
    PLAY_LOG_FIGHTS_PATH,
    PLAY_LOG_DECK_EVENTS_PATH,
    PLAY_RUNS_PATH,
    RUN_EVENTS_PATH,
    playRunEndPath,
    validateFightPost,
    validateDeckEventPost,
    validatePlayRunPost,
    validatePlayRunEndPost,
    validateRunEventsPost,
    type RunPolicy,
} from '@mechanics';

import { playLogConfig, playLogSource } from '@/lib/playLog';
import { runLogPoster } from '@/lib/runLog';

import { playRun, type PlayRunOptions } from './run-driver';
import { playRunPosted, runEndOf, simRunKey, type CollectedPost, type SimPostContext } from './run-post';
import { RunStuckError } from './run-stuck';
import { playRunsPosted } from './sim-runs';

const CONTEXT: SimPostContext = { batchId: '555-1', buildCommit: 'a'.repeat(40) };

/** A wanderer that starts one hit from death, so the run is a short one. */
const SHORT: Pick<PlayRunOptions, 'onStart'> = {
    onStart: (store) => store.setState({ player: { ...store.getState().player, health: 1 }, dying: true } as never),
};

const bodyOf = (post: CollectedPost): Record<string, unknown> => JSON.parse(post.body) as Record<string, unknown>;

describe('a run posted by the driver', () => {
    let fetchSpy: jest.SpyInstance | null = null;
    beforeEach(() => {
        if (typeof globalThis.fetch === 'function') fetchSpy = jest.spyOn(globalThis, 'fetch');
    });
    afterEach(() => {
        fetchSpy?.mockRestore();
        fetchSpy = null;
    });

    it('collects every request, stamped sim, under one run id of its own', async () => {
        const { result, run } = await playRunPosted({ policy: WANDERER_POLICY, seed: 3, ...SHORT }, CONTEXT);
        expect(run.runKey).toBe(simRunKey('555-1', 'wanderer', 3));
        expect(run.runKey).not.toBe(result.runId);
        const paths = new Set(run.posts.map((p) => p.path));
        expect([...paths]).toEqual(expect.arrayContaining([PLAY_RUNS_PATH, PLAY_LOG_FIGHTS_PATH, RUN_EVENTS_PATH, playRunEndPath(run.runKey)]));
        for (const post of run.posts.filter((p) => p.path !== playRunEndPath(run.runKey))) {
            const body = bodyOf(post);
            expect(body.source).toBe('sim');
            expect(body.runId).toBe(run.runKey);
            // A run-events batch carries the source and the run only; the open names the rest.
            if (post.path === RUN_EVENTS_PATH) continue;
            expect(body.solver).toBe('wanderer');
            expect(body.sessionId).toBe('555-1');
            expect(body.buildCommit).toBe(CONTEXT.buildCommit);
        }
        // Nothing was sent: the posts were collected.
        expect(fetchSpy?.mock.calls.length ?? 0).toBe(0);
    });

    it('opens the run before its fights and closes it last, with the policy on the open', async () => {
        const { run } = await playRunPosted({ policy: WANDERER_POLICY, seed: 3, ...SHORT }, CONTEXT);
        expect(run.posts[0]!.path).toBe(PLAY_RUNS_PATH);
        expect(bodyOf(run.posts[0]!)).toMatchObject({ policyId: 'wanderer', source: 'sim', runId: run.runKey });
        expect(run.posts.filter((p) => p.path === PLAY_RUNS_PATH)).toHaveLength(1);
        expect(run.posts.findIndex((p) => p.path === PLAY_LOG_FIGHTS_PATH)).toBeGreaterThan(0);
        expect(run.posts[run.posts.length - 1]!.path).toBe(playRunEndPath(run.runKey));
        expect(run.posts.filter((p) => p.path.endsWith('/end'))).toHaveLength(1);
    });

    it('closes the row with the driver outcome, snapshotted before the death rule reset the run', async () => {
        const { result, run } = await playRunPosted({ policy: WANDERER_POLICY, seed: 3, ...SHORT }, CONTEXT);
        expect(result.outcome).toBe('run-over');
        const close = bodyOf(run.posts[run.posts.length - 1]!);
        expect(close).toEqual({ ...runEndOf(result) });
        expect(close).toMatchObject({ outcome: 'run-over', endNodeId: result.endNodeId, level: result.level, vitaeEnd: 0, nodesResolved: result.nodesResolved });
        expect((close.endDeck as string[]).length).toBeGreaterThan(0);
    });

    it('posts bodies the Worker accepts, events in rising seq', async () => {
        const { run } = await playRunPosted({ policy: WANDERER_POLICY, seed: 3, ...SHORT }, CONTEXT);
        let lastSeq = -1;
        for (const post of run.posts) {
            const body = bodyOf(post);
            if (post.path === PLAY_RUNS_PATH) expect(validatePlayRunPost(body).ok).toBe(true);
            else if (post.path === PLAY_LOG_FIGHTS_PATH) expect(validateFightPost(body).ok).toBe(true);
            else if (post.path === PLAY_LOG_DECK_EVENTS_PATH) expect(validateDeckEventPost(body).ok).toBe(true);
            else if (post.path === RUN_EVENTS_PATH) {
                expect(validateRunEventsPost(body).ok).toBe(true);
                for (const event of body.events as { seq: number }[]) {
                    expect(event.seq).toBeGreaterThan(lastSeq);
                    lastSeq = event.seq;
                }
            } else expect(validatePlayRunEndPost(body).ok).toBe(true);
        }
        expect(lastSeq).toBeGreaterThanOrEqual(0);
    });

    it('gives each batch, policy and seed a run id of its own, though the engine repeats its own', async () => {
        const a = await playRunPosted({ policy: WANDERER_POLICY, seed: 3, ...SHORT }, CONTEXT);
        const b = await playRunPosted({ policy: WANDERER_POLICY, seed: 3, ...SHORT }, { ...CONTEXT, batchId: '556-1' });
        const other: RunPolicy = { ...WANDERER_POLICY, id: 'wanderer-twin' };
        const c = await playRunPosted({ policy: other, seed: 3, ...SHORT }, CONTEXT);
        expect(a.result.runId).toBe(b.result.runId);
        expect(new Set([a.run.runKey, b.run.runKey, c.run.runKey]).size).toBe(3);
        // The twin's rows are the twin's: its second run is not dropped as a repeat of the first.
        expect(c.run.posts.length).toBe(a.run.posts.length);
        expect(bodyOf(c.run.posts[0]!)).toMatchObject({ policyId: 'wanderer-twin', solver: 'wanderer-twin' });
    });

    it('puts the app back as it found it: the gate shut, the poster its own', async () => {
        await playRunPosted({ policy: WANDERER_POLICY, seed: 3, ...SHORT }, CONTEXT);
        expect(playLogConfig()).toBeNull();
        expect(playLogSource().source).toBe('harness');
        runLogPoster.event('x', 'xp-gained', { amount: 1, from: 'fight' });
        await runLogPoster.settled();
        expect(fetchSpy?.mock.calls.length ?? 0).toBe(0);
    });

    it('puts the app back after a stuck run, and a stuck run posts nothing', async () => {
        const lost: RunPolicy = { ...WANDERER_POLICY, chooseRoad: () => null };
        await expect(playRunPosted({ policy: lost, seed: 1 }, CONTEXT)).rejects.toBeInstanceOf(RunStuckError);
        expect(playLogConfig()).toBeNull();
        const batch = await playRunsPosted(lost, { runs: 2, seed: 1 }, CONTEXT, playRun);
        expect(batch.posts).toEqual([]);
        expect(batch.runs.every((r) => 'stuck' in r)).toBe(true);
    });

    it('gives the same collected posts for the same seed, batch and policy', async () => {
        const a = await playRunPosted({ policy: WANDERER_POLICY, seed: 3, ...SHORT }, CONTEXT);
        const b = await playRunPosted({ policy: WANDERER_POLICY, seed: 3, ...SHORT }, CONTEXT);
        // The fights' `ms` stamps are real elapsed time; the rest of a run is the seed's.
        const strip = (posts: readonly CollectedPost[]) => posts.map((p) => ({ path: p.path, body: p.body.replace(/"ms":\d+/g, '"ms":0') }));
        expect(strip(a.run.posts)).toEqual(strip(b.run.posts));
    });

    it('leaves a whole run to its end with its deck events and fights posted too', async () => {
        const { result, run } = await playRunPosted({ policy: WANDERER_POLICY, seed: 2 }, CONTEXT);
        expect(['run-over', 'chapter-clear']).toContain(result.outcome);
        const fights = run.posts.filter((p) => p.path === PLAY_LOG_FIGHTS_PATH);
        expect(fights.length).toBeGreaterThanOrEqual(result.fights.won + result.fights.lost + result.fights.spared);
        expect(run.posts.some((p) => p.path === PLAY_LOG_DECK_EVENTS_PATH)).toBe(true);
        expect(run.posts.filter((p) => p.path === PLAY_RUNS_PATH)).toHaveLength(1);
    });
});

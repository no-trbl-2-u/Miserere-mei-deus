/**
 * The run-log poster (phase SM1d, acceptance A8): the whole run, posted through
 * the same gate as the fight recorder and the deck-event poster.
 *
 * A run is three kinds of post, in this order: a `play_runs` open when the run
 * starts (`open`), batches of its events while it is played (`event`, then
 * `flush`), and a close when it ends (`close`). Events are buffered per run and
 * numbered with a per-run `seq`; the call sites flush the previous node's
 * batch when the next node is entered, and the close flushes the last one, so
 * a batch is one node's events. A batch is also cut at the Worker's caps (200
 * events, 256 KiB). Posts go out one after another in the order they were
 * made, so an open always lands before its events and its close.
 *
 * With the gate shut (`playLogConfig()` is null) nothing is buffered and no
 * request is made. A failed post warns and is dropped (BE1): no retry, no
 * queue that survives the process. The per-run `seq` and the closed-run
 * record live in memory, so a run continued after an app restart numbers its
 * events from 0 again and may be closed only once per launch.
 *
 * Functions:
 *   createRunLogPoster(deps)   open / event / flush / close / settled
 *   runLogPoster               the app-wide instance
 */

import {
    PLAY_LOG_LIMITS,
    PLAY_RUNS_PATH,
    RUN_EVENTS_PATH,
    playRunEndPath,
    type PlayRunEndPost,
    type PlayRunPost,
    type RunEvent,
    type RunEventKind,
    type RunEventPayloads,
    type RunEventsPost,
} from '@mechanics';

import { playLogConfig, playLogSource, postPlayLog, type PlayLogStamps } from '@/lib/playLog';
import type { PuzzleApiConfig, PuzzleFetch } from '@/lib/puzzleAttempts';

/** What a run opens with: the run, the character it opened as and the deck it began with. */
export interface RunOpening {
    runId: string;
    characterId: string | null;
    startDeck: string[];
}

export interface RunLogPoster {
    /** Posts the `play_runs` open for a run (once per run per launch). */
    open(run: RunOpening): void;
    /** Buffers one event of a run, numbered in order. */
    event<K extends RunEventKind>(runId: string, kind: K, payload: RunEventPayloads[K]): void;
    /** Posts a run's buffered events now (a batch per cap), in order. */
    flush(runId: string): void;
    /** Posts the last events and the close of a run, once. */
    close(runId: string, end: PlayRunEndPost): void;
    /** Resolves when every post made so far has finished (a test seam). */
    settled(): Promise<void>;
}

export interface RunLogPosterDeps {
    config?: () => PuzzleApiConfig | null;
    source?: () => PlayLogStamps;
    fetcher?: PuzzleFetch;
}

interface RunBuffer {
    seq: number;
    events: RunEvent[];
}

/** Room kept under the byte cap for the batch's own envelope. */
const BATCH_ENVELOPE_BYTES = 1024;

/** Splits events into batches that each fit the Worker's count and byte caps. */
function chunkEvents(events: readonly RunEvent[]): RunEvent[][] {
    const batches: RunEvent[][] = [];
    let current: RunEvent[] = [];
    let bytes = 0;
    for (const event of events) {
        const size = JSON.stringify(event).length + 1;
        const full = current.length >= PLAY_LOG_LIMITS.runEvents
            || (current.length > 0 && bytes + size > PLAY_LOG_LIMITS.runEventBytes - BATCH_ENVELOPE_BYTES);
        if (full) {
            batches.push(current);
            current = [];
            bytes = 0;
        }
        current.push(event);
        bytes += size;
    }
    if (current.length > 0) batches.push(current);
    return batches;
}

export function createRunLogPoster(deps: RunLogPosterDeps = {}): RunLogPoster {
    const config = deps.config ?? (() => playLogConfig());
    const source = deps.source ?? playLogSource;
    const runs = new Map<string, RunBuffer>();
    const opened = new Set<string>();
    const closed = new Set<string>();
    let tail: Promise<unknown> = Promise.resolve();

    /** Runs a post after every earlier one has finished. A post never throws. */
    function enqueue(job: () => Promise<boolean>): void {
        tail = tail.then(job, job);
    }

    function bufferOf(runId: string): RunBuffer {
        let run = runs.get(runId);
        if (run === undefined) {
            run = { seq: 0, events: [] };
            runs.set(runId, run);
        }
        return run;
    }

    function flush(runId: string): void {
        const run = runs.get(runId);
        if (run === undefined || run.events.length === 0) return;
        const events = run.events;
        run.events = [];
        const cfg = config();
        if (cfg === null) return;
        const stamps = source();
        for (const batch of chunkEvents(events)) {
            const body: RunEventsPost = { runId, source: stamps.source, events: batch };
            enqueue(() => postPlayLog(RUN_EVENTS_PATH, body, cfg, deps.fetcher));
        }
    }

    return {
        open(run) {
            const cfg = config();
            if (cfg === null || opened.has(run.runId)) return;
            opened.add(run.runId);
            const body: PlayRunPost = {
                ...source(),
                runId: run.runId,
                characterId: run.characterId,
                policyId: null,
                startDeck: run.startDeck,
            };
            enqueue(() => postPlayLog(PLAY_RUNS_PATH, body, cfg, deps.fetcher));
        },
        event(runId, kind, payload) {
            if (config() === null || closed.has(runId)) return;
            const run = bufferOf(runId);
            run.events.push({ seq: run.seq, kind, payload } as RunEvent);
            run.seq += 1;
            if (run.events.length >= PLAY_LOG_LIMITS.runEvents) flush(runId);
        },
        flush,
        close(runId, end) {
            if (closed.has(runId)) return;
            closed.add(runId);
            flush(runId);
            runs.delete(runId);
            const cfg = config();
            if (cfg === null) return;
            enqueue(() => postPlayLog(playRunEndPath(runId), end, cfg, deps.fetcher));
        },
        settled: () => tail.then(() => undefined),
    };
}

/** The app's one poster: the run start, every node and the run end post through it. */
export const runLogPoster: RunLogPoster = createRunLogPoster();

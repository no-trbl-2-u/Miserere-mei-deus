/**
 * Retention (chunk 135.7, SM2g): a `sim` or `harness` row older than 14 days leaves D1;
 * a `human` row never does, and `ballot_verdicts` is never read.
 *
 * A run's age is its `play_runs.started_at`. An old run goes whole, in one `db.batch`: every
 * `run_events`, `fights`, `deck_events` and `puzzle_attempts` row of its `run_id`, then its
 * `play_runs` row last, so a run is never left part-deleted. Run-less and orphan rows (no
 * `play_runs` row for their `run_id`) go by `received_at`. The cutoff is an ISO string the shape
 * of the stored timestamps (`toISOString()`), never SQL `datetime()`, so the comparison is text
 * against text. Work is capped (runs and rows per batch, batches per run); what is left waits
 * for the next night, and the cron's log line says how much went.
 */

import type { PlayLogSourceKind } from './contract';

/** The window: a `sim` or `harness` row older than this many days is deleted. */
export const RETENTION_DAYS = 14;

/** The sources the cron may delete. `human` is never in this list. */
export const RETENTION_SOURCES: readonly PlayLogSourceKind[] = ['sim', 'harness'];

export interface RetentionLimits {
    /** Runs deleted by one batch. */
    maxRuns: number;
    /** Rows (a run's children plus its own row) deleted by one batch; a lone run over it still goes whole. */
    maxRows: number;
    /** Batches in one cron run, both phases together. */
    maxBatches: number;
}

export const RETENTION_LIMITS: RetentionLimits = { maxRuns: 200, maxRows: 1000, maxBatches: 25 };

/** The tables that hold a run's rows, children before `play_runs`. */
const RUN_CHILD_TABLES = ['run_events', 'fights', 'deck_events', 'puzzle_attempts'] as const;
type RunChildTable = (typeof RUN_CHILD_TABLES)[number];

export interface RetentionCounts {
    runs: number;
    run_events: number;
    fights: number;
    deck_events: number;
    puzzle_attempts: number;
}

export interface RetentionResult {
    /** The ISO cutoff: rows with a timestamp before it were old. */
    cutoff: string;
    deleted: RetentionCounts;
    batches: number;
    /** True when the batch cap stopped the sweep before it ran dry. */
    capped: boolean;
}

const SOURCES_SQL = RETENTION_SOURCES.map((s) => `'${s}'`).join(', ');

/** The ISO cutoff for a clock reading: `windowDays` before `now`, in `toISOString()` shape. */
export function retentionCutoff(now: Date, windowDays: number = RETENTION_DAYS): string {
    return new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString();
}

interface RunCandidate {
    run_id: string;
    started_at: string;
    rows: number;
}

const emptyCounts = (): RetentionCounts => ({ runs: 0, run_events: 0, fights: 0, deck_events: 0, puzzle_attempts: 0 });

/** Old runs, oldest first, each with how many rows it takes with it (itself included). */
async function oldRuns(db: D1Database, cutoff: string, limit: number): Promise<RunCandidate[]> {
    const childCounts = RUN_CHILD_TABLES.map(
        (table) => `(SELECT COUNT(*) FROM ${table} c WHERE c.run_id = p.run_id AND c.source IN (${SOURCES_SQL}))`,
    ).join(' + ');
    const { results } = await db
        .prepare(
            `SELECT p.run_id AS run_id, p.started_at AS started_at, 1 + ${childCounts} AS rows
             FROM play_runs p
             WHERE p.source IN (${SOURCES_SQL}) AND p.started_at < ?
             ORDER BY p.started_at, p.run_id
             LIMIT ?`,
        )
        .bind(cutoff, limit)
        .all<RunCandidate>();
    return results;
}

/** One batch of whole old runs, up to the limits. Returns what it deleted (all zero when no run is old). */
async function deleteRunBatch(db: D1Database, cutoff: string, limits: RetentionLimits): Promise<RetentionCounts> {
    const candidates = await oldRuns(db, cutoff, limits.maxRuns);
    if (candidates.length === 0) return emptyCounts();
    // Take runs oldest first while the row budget holds; the first run always goes, however big.
    let rows = 0;
    let last = candidates[0];
    for (const candidate of candidates) {
        if (rows > 0 && rows + candidate.rows > limits.maxRows) break;
        rows += candidate.rows;
        last = candidate;
    }
    // The batch is every old run up to and including `last` in (started_at, run_id) order, so the
    // statements bind two values however many runs there are (D1 caps bound parameters at 100).
    const upTo = `(SELECT run_id FROM play_runs WHERE source IN (${SOURCES_SQL}) AND (started_at, run_id) <= (?, ?))`;
    const statements = [
        ...RUN_CHILD_TABLES.map((table) =>
            db.prepare(`DELETE FROM ${table} WHERE source IN (${SOURCES_SQL}) AND run_id IN ${upTo}`).bind(last.started_at, last.run_id),
        ),
        db
            .prepare(`DELETE FROM play_runs WHERE source IN (${SOURCES_SQL}) AND (started_at, run_id) <= (?, ?)`)
            .bind(last.started_at, last.run_id),
    ];
    const results = await db.batch(statements);
    const changes = (index: number): number => results[index].meta.changes;
    const counts = emptyCounts();
    RUN_CHILD_TABLES.forEach((table, index) => {
        counts[table] = changes(index);
    });
    counts.runs = changes(RUN_CHILD_TABLES.length);
    return counts;
}

/** One batch of run-less and orphan rows from `table`, old by `received_at`. Returns how many went. */
async function deleteLooseBatch(db: D1Database, table: RunChildTable, cutoff: string, maxRows: number): Promise<number> {
    const result = await db
        .prepare(
            `DELETE FROM ${table} WHERE id IN (
                 SELECT id FROM ${table}
                 WHERE source IN (${SOURCES_SQL}) AND received_at < ?
                   AND (run_id IS NULL OR run_id NOT IN (SELECT run_id FROM play_runs))
                 ORDER BY received_at, id
                 LIMIT ?
             )`,
        )
        .bind(cutoff, maxRows)
        .run();
    return result.meta.changes;
}

/**
 * Sweeps old `sim` and `harness` rows. Whole old runs first, then the loose rows of each table;
 * a second run right after finds nothing. `limits` is injectable so a test can make batches tiny.
 */
export async function runRetention(
    db: D1Database,
    now: Date,
    limits: RetentionLimits = RETENTION_LIMITS,
    windowDays: number = RETENTION_DAYS,
): Promise<RetentionResult> {
    const cutoff = retentionCutoff(now, windowDays);
    const deleted = emptyCounts();
    let batches = 0;
    let capped = false;

    while (true) {
        if (batches >= limits.maxBatches) {
            capped = true;
            break;
        }
        const counts = await deleteRunBatch(db, cutoff, limits);
        if (counts.runs === 0) break;
        batches += 1;
        for (const key of Object.keys(deleted) as (keyof RetentionCounts)[]) deleted[key] += counts[key];
    }

    for (const table of RUN_CHILD_TABLES) {
        while (!capped) {
            if (batches >= limits.maxBatches) {
                capped = true;
                break;
            }
            const count = await deleteLooseBatch(db, table, cutoff, limits.maxRows);
            if (count === 0) break;
            batches += 1;
            deleted[table] += count;
            if (count < limits.maxRows) break;
        }
    }
    return { cutoff, deleted, batches, capped };
}

/** The one log line a cron run writes. */
export function retentionLogLine(result: RetentionResult): string {
    const { deleted } = result;
    return (
        `retention: cutoff=${result.cutoff} runs=${deleted.runs} run_events=${deleted.run_events} fights=${deleted.fights} ` +
        `deck_events=${deleted.deck_events} puzzle_attempts=${deleted.puzzle_attempts} batches=${result.batches} capped=${result.capped}`
    );
}

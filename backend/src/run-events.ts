/**
 * The `run_events` table: one thing that happened in a run per row
 * (`migrations/0007_play_runs.sql`). A batch is stored in one D1 batch, so it
 * lands whole or not at all. Rows map to the contract's shape here and
 * nowhere else.
 */

import type { PlayLogSourceKind, RunEventRow, RunEventsPost } from './contract';

interface RunEventRecord {
    id: number;
    received_at: string;
    run_id: string;
    source: PlayLogSourceKind;
    seq: number;
    kind: RunEventRow['kind'];
    payload_json: string;
}

function toRow(record: RunEventRecord): RunEventRow {
    return {
        id: record.id,
        receivedAt: record.received_at,
        runId: record.run_id,
        source: record.source,
        seq: record.seq,
        kind: record.kind,
        payload: JSON.parse(record.payload_json),
    } as RunEventRow;
}

/** Stores one validated batch; the Worker stamps `received_at`. Returns how many events landed. */
export async function insertRunEvents(db: D1Database, batch: RunEventsPost, receivedAt: string): Promise<number> {
    const statement = db.prepare(
        'INSERT INTO run_events (received_at, run_id, source, seq, kind, payload_json) VALUES (?, ?, ?, ?, ?, ?)',
    );
    await db.batch(
        batch.events.map(event =>
            statement.bind(receivedAt, batch.runId, batch.source ?? 'human', event.seq, event.kind, JSON.stringify(event.payload)),
        ),
    );
    return batch.events.length;
}

/** Stored events in run then `seq` order; `runId` narrows to one run and `source` to one source (null: every source). */
export async function listRunEvents(db: D1Database, runId?: string, source: PlayLogSourceKind | null = null): Promise<RunEventRow[]> {
    const { results } = await db
        .prepare('SELECT * FROM run_events WHERE (?1 IS NULL OR run_id = ?1) AND (?2 IS NULL OR source = ?2) ORDER BY run_id, seq, id')
        .bind(runId ?? null, source)
        .all<RunEventRecord>();
    return results.map(toRow);
}

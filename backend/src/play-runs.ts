/**
 * The `play_runs` table: one run per row, opened when the run starts and
 * closed once when it ends (`migrations/0007_play_runs.sql`). Rows map to the
 * contract's camelCase shape here and nowhere else.
 */

import type { PlayLogSourceKind, PlayRunClosed, PlayRunEndPost, PlayRunOpened, PlayRunOutcome, PlayRunPost, PlayRunRow } from './contract';

interface PlayRunRecord {
    id: number;
    run_id: string;
    source: PlayLogSourceKind;
    solver: string;
    session_id: string;
    build_commit: string | null;
    app_build: string;
    character_id: string | null;
    policy_id: string | null;
    start_deck_json: string;
    started_at: string;
    ended_at: string | null;
    outcome: PlayRunOutcome | null;
    end_node_id: string | null;
    level: number | null;
    vitae_end: number | null;
    nodes_resolved: number | null;
    end_deck_json: string | null;
}

function toRow(record: PlayRunRecord): PlayRunRow {
    return {
        id: record.id,
        runId: record.run_id,
        source: record.source,
        solver: record.solver,
        sessionId: record.session_id,
        buildCommit: record.build_commit,
        appBuild: record.app_build,
        characterId: record.character_id,
        policyId: record.policy_id,
        startDeck: JSON.parse(record.start_deck_json) as string[],
        startedAt: record.started_at,
        endedAt: record.ended_at,
        outcome: record.outcome,
        endNodeId: record.end_node_id,
        level: record.level,
        vitaeEnd: record.vitae_end,
        nodesResolved: record.nodes_resolved,
        endDeck: record.end_deck_json === null ? null : (JSON.parse(record.end_deck_json) as string[]),
    };
}

/**
 * Opens a run, idempotent on its run id: the first open stores the row
 * (`created`), a later one for the same id changes nothing and returns the
 * stored run's id and start. The Worker stamps `started_at`.
 */
export async function openPlayRun(
    db: D1Database,
    run: PlayRunPost,
    startedAt: string,
): Promise<{ created: boolean; run: PlayRunOpened }> {
    const inserted = await db
        .prepare(
            `INSERT INTO play_runs
                (run_id, source, solver, session_id, build_commit, app_build, character_id, policy_id, start_deck_json, started_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (run_id) DO NOTHING
             RETURNING id, started_at`,
        )
        .bind(
            run.runId,
            run.source ?? 'human',
            run.solver,
            run.sessionId,
            run.buildCommit,
            run.appBuild,
            run.characterId,
            run.policyId,
            JSON.stringify(run.startDeck),
            startedAt,
        )
        .first<{ id: number; started_at: string }>();
    if (inserted) return { created: true, run: { id: inserted.id, startedAt: inserted.started_at } };
    const existing = await db
        .prepare('SELECT id, started_at FROM play_runs WHERE run_id = ?')
        .bind(run.runId)
        .first<{ id: number; started_at: string }>();
    if (!existing) throw new Error('play run vanished between insert and read');
    return { created: false, run: { id: existing.id, startedAt: existing.started_at } };
}

/**
 * Closes a run once. `closed` carries the run; `already-closed` means a close
 * landed first (409); `unknown` means no run was opened under that id (404).
 */
export async function closePlayRun(
    db: D1Database,
    runId: string,
    end: PlayRunEndPost,
    endedAt: string,
): Promise<{ result: 'closed'; run: PlayRunClosed } | { result: 'already-closed' | 'unknown' }> {
    const updated = await db
        .prepare(
            `UPDATE play_runs
                SET ended_at = ?, outcome = ?, end_node_id = ?, level = ?, vitae_end = ?, nodes_resolved = ?, end_deck_json = ?
              WHERE run_id = ? AND ended_at IS NULL
          RETURNING id`,
        )
        .bind(endedAt, end.outcome, end.endNodeId, end.level, end.vitaeEnd, end.nodesResolved, JSON.stringify(end.endDeck), runId)
        .first<{ id: number }>();
    if (updated) return { result: 'closed', run: { id: updated.id, endedAt } };
    const exists = await db.prepare('SELECT 1 AS one FROM play_runs WHERE run_id = ?').bind(runId).first();
    return { result: exists ? 'already-closed' : 'unknown' };
}

/** Every stored run, newest first; `source` narrows to one source (null: every source). */
export async function listPlayRuns(db: D1Database, source: PlayLogSourceKind | null = null): Promise<PlayRunRow[]> {
    const { results } = await db
        .prepare('SELECT * FROM play_runs WHERE (?1 IS NULL OR source = ?1) ORDER BY id DESC')
        .bind(source)
        .all<PlayRunRecord>();
    return results.map(toRow);
}

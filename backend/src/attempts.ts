/**
 * The `puzzle_attempts` table: one ended `/devpuzzle` attempt per row
 * (`migrations/0001_puzzle_attempts.sql`). Rows map to the contract's
 * camelCase shape here and nowhere else.
 */

import type { PlayLogSourceKind, PuzzleAttemptMove, PuzzleAttemptPost, PuzzleAttemptRow } from './contract';

interface AttemptRecord {
    id: number;
    received_at: string;
    solver: string;
    layout_id: string;
    route: PuzzleAttemptRow['route'];
    intended_band: PuzzleAttemptRow['intendedBand'];
    end_kind: PuzzleAttemptRow['endKind'];
    end_ms: number;
    cleared: number;
    moves_json: string;
    app_build: string;
    source: PlayLogSourceKind;
    run_id: string | null;
}

function toRow(record: AttemptRecord): PuzzleAttemptRow {
    return {
        id: record.id,
        receivedAt: record.received_at,
        solver: record.solver,
        layoutId: record.layout_id,
        route: record.route,
        intendedBand: record.intended_band,
        moves: JSON.parse(record.moves_json) as PuzzleAttemptMove[],
        endKind: record.end_kind,
        endMs: record.end_ms,
        cleared: record.cleared === 1,
        appBuild: record.app_build,
        source: record.source,
        runId: record.run_id,
    };
}

/** Stores one validated attempt; the Worker stamps `received_at`. */
export async function insertAttempt(
    db: D1Database,
    attempt: PuzzleAttemptPost,
    receivedAt: string,
): Promise<{ id: number; receivedAt: string }> {
    const result = await db
        .prepare(
            `INSERT INTO puzzle_attempts
                (received_at, solver, layout_id, route, intended_band, end_kind, end_ms, cleared, moves_json, app_build, source, run_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING id`,
        )
        .bind(
            receivedAt,
            attempt.solver,
            attempt.layoutId,
            attempt.route,
            attempt.intendedBand,
            attempt.endKind,
            attempt.endMs,
            attempt.cleared ? 1 : 0,
            JSON.stringify(attempt.moves),
            attempt.appBuild,
            attempt.source ?? 'human',
            attempt.runId ?? null,
        )
        .first<{ id: number }>();
    if (!result) throw new Error('insert returned no id');
    return { id: result.id, receivedAt };
}

/** Every stored attempt, newest first; `layoutId` narrows to one layout and `source` to one source (null: every source). */
export async function listAttempts(db: D1Database, layoutId?: string, source: PlayLogSourceKind | null = null): Promise<PuzzleAttemptRow[]> {
    const statement = db
        .prepare('SELECT * FROM puzzle_attempts WHERE (?1 IS NULL OR layout_id = ?1) AND (?2 IS NULL OR source = ?2) ORDER BY id DESC')
        .bind(layoutId ?? null, source);
    const { results } = await statement.all<AttemptRecord>();
    return results.map(toRow);
}

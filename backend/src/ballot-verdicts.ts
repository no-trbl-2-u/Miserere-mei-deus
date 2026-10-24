/**
 * The `ballot_verdicts` table: one saved or submitted ballot per row
 * (`migrations/0003_ballot_verdicts.sql`, `status` from `0004`). Rows map to the contract's
 * camelCase shape here and nowhere else.
 */

import type { BallotVerdictPost, BallotVerdictRow, BallotVerdictStatus } from './ballot';

interface BallotVerdictRecord {
    id: number;
    received_at: string;
    ballot_id: string;
    verdict_text: string;
    kept_json: string;
    notes_json: string;
    general: string | null;
    client: string | null;
    status: BallotVerdictStatus;
}

function toRow(record: BallotVerdictRecord): BallotVerdictRow {
    return {
        id: record.id,
        receivedAt: record.received_at,
        ballotId: record.ballot_id,
        verdictText: record.verdict_text,
        kept: JSON.parse(record.kept_json) as string[],
        notes: JSON.parse(record.notes_json) as Record<string, string>,
        general: record.general,
        client: record.client,
        status: record.status,
    };
}

/** Stores one validated verdict as a new row; the Worker stamps `received_at`. */
export async function insertBallotVerdict(
    db: D1Database,
    verdict: BallotVerdictPost,
    receivedAt: string,
): Promise<{ id: number; receivedAt: string }> {
    const result = await db
        .prepare(
            `INSERT INTO ballot_verdicts
                (received_at, ballot_id, verdict_text, kept_json, notes_json, general, client, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING id`,
        )
        .bind(
            receivedAt,
            verdict.ballotId,
            verdict.verdictText,
            JSON.stringify(verdict.kept),
            JSON.stringify(verdict.notes),
            verdict.general,
            verdict.client,
            verdict.status,
        )
        .first<{ id: number }>();
    if (!result) throw new Error('insert returned no id');
    return { id: result.id, receivedAt };
}

export interface BallotVerdictFilter {
    /** One ballot, exactly. */
    ballotId?: string;
    /** One status, exactly. */
    status?: BallotVerdictStatus;
}

/** Every stored verdict, newest first, narrowed by each filter given. */
export async function listBallotVerdicts(db: D1Database, filter: BallotVerdictFilter = {}): Promise<BallotVerdictRow[]> {
    const clauses: string[] = [];
    const values: string[] = [];
    if (filter.ballotId !== undefined) {
        clauses.push('ballot_id = ?');
        values.push(filter.ballotId);
    }
    if (filter.status !== undefined) {
        clauses.push('status = ?');
        values.push(filter.status);
    }
    const where = clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '';
    const { results } = await db
        .prepare(`SELECT * FROM ballot_verdicts${where} ORDER BY id DESC`)
        .bind(...values)
        .all<BallotVerdictRecord>();
    return results.map(toRow);
}

/**
 * The `ballot_verdicts` table: one submitted ballot per row
 * (`migrations/0003_ballot_verdicts.sql`). Rows map to the contract's
 * camelCase shape here and nowhere else.
 */

import type { BallotVerdictPost, BallotVerdictRow } from './ballot';

interface BallotVerdictRecord {
    id: number;
    received_at: string;
    ballot_id: string;
    verdict_text: string;
    kept_json: string;
    notes_json: string;
    general: string | null;
    client: string | null;
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
                (received_at, ballot_id, verdict_text, kept_json, notes_json, general, client)
             VALUES (?, ?, ?, ?, ?, ?, ?)
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
        )
        .first<{ id: number }>();
    if (!result) throw new Error('insert returned no id');
    return { id: result.id, receivedAt };
}

/** Every stored verdict, newest first; `ballotId` narrows to one ballot exactly. */
export async function listBallotVerdicts(db: D1Database, ballotId?: string): Promise<BallotVerdictRow[]> {
    const statement = ballotId === undefined
        ? db.prepare('SELECT * FROM ballot_verdicts ORDER BY id DESC')
        : db.prepare('SELECT * FROM ballot_verdicts WHERE ballot_id = ? ORDER BY id DESC').bind(ballotId);
    const { results } = await statement.all<BallotVerdictRecord>();
    return results.map(toRow);
}

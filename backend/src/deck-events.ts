/**
 * The `deck_events` table: one change to a run's deck per row
 * (`migrations/0002_play_log.sql`). Rows map to the contract's camelCase
 * shape here and nowhere else.
 */

import type { DeckEventPost, DeckEventRow } from './contract';

interface DeckEventRecord {
    id: number;
    received_at: string;
    solver: string;
    session_id: string;
    build_commit: string | null;
    app_build: string;
    kind: DeckEventRow['kind'];
    card_id: string | null;
    offered_json: string | null;
    deck_json: string;
    where_json: string;
}

function toRow(record: DeckEventRecord): DeckEventRow {
    return {
        id: record.id,
        receivedAt: record.received_at,
        solver: record.solver,
        sessionId: record.session_id,
        buildCommit: record.build_commit,
        appBuild: record.app_build,
        kind: record.kind,
        cardId: record.card_id,
        offered: record.offered_json === null ? null : (JSON.parse(record.offered_json) as string[]),
        deck: JSON.parse(record.deck_json) as string[],
        where: JSON.parse(record.where_json) as DeckEventRow['where'],
    };
}

/** Stores one validated deck change; the Worker stamps `received_at`. */
export async function insertDeckEvent(
    db: D1Database,
    deckEvent: DeckEventPost,
    receivedAt: string,
): Promise<{ id: number; receivedAt: string }> {
    const result = await db
        .prepare(
            `INSERT INTO deck_events
                (received_at, solver, session_id, build_commit, app_build, kind, card_id, offered_json, deck_json, where_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING id`,
        )
        .bind(
            receivedAt,
            deckEvent.solver,
            deckEvent.sessionId,
            deckEvent.buildCommit,
            deckEvent.appBuild,
            deckEvent.kind,
            deckEvent.cardId,
            deckEvent.offered === null ? null : JSON.stringify(deckEvent.offered),
            JSON.stringify(deckEvent.deck),
            JSON.stringify(deckEvent.where),
        )
        .first<{ id: number }>();
    if (!result) throw new Error('insert returned no id');
    return { id: result.id, receivedAt };
}

/** Every stored deck change, newest first; `cardId` narrows to one card picked or removed. */
export async function listDeckEvents(db: D1Database, cardId?: string): Promise<DeckEventRow[]> {
    const statement = cardId === undefined
        ? db.prepare('SELECT * FROM deck_events ORDER BY id DESC')
        : db.prepare('SELECT * FROM deck_events WHERE card_id = ? ORDER BY id DESC').bind(cardId);
    const { results } = await statement.all<DeckEventRecord>();
    return results.map(toRow);
}

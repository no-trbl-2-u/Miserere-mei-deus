/**
 * The `deck_events` table: one change to a run's deck per row
 * (`migrations/0002_play_log.sql`). Rows map to the contract's camelCase
 * shape here and nowhere else.
 */

import type { DeckEventPost, DeckEventRow, PlayLogSourceKind } from './contract';

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
    source: PlayLogSourceKind;
    run_id: string | null;
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
        source: record.source,
        runId: record.run_id,
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
                (received_at, solver, session_id, build_commit, app_build, kind, card_id, offered_json, deck_json, where_json, source, run_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            deckEvent.source ?? 'human',
            deckEvent.runId ?? null,
        )
        .first<{ id: number }>();
    if (!result) throw new Error('insert returned no id');
    return { id: result.id, receivedAt };
}

/** Every stored deck change, newest first; `cardId` narrows to one card picked or removed and `source` to one source (null: every source). */
export async function listDeckEvents(db: D1Database, cardId?: string, source: PlayLogSourceKind | null = null): Promise<DeckEventRow[]> {
    const statement = db
        .prepare('SELECT * FROM deck_events WHERE (?1 IS NULL OR card_id = ?1) AND (?2 IS NULL OR source = ?2) ORDER BY id DESC')
        .bind(cardId ?? null, source);
    const { results } = await statement.all<DeckEventRecord>();
    return results.map(toRow);
}

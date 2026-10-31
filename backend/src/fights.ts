/**
 * The `fights` table: one ended fight per row (`migrations/0002_play_log.sql`).
 * Rows map to the contract's camelCase shape here and nowhere else.
 */

import type { FightPost, FightRow, PlayLogEvent, PlayLogSourceKind } from './contract';

interface FightRecord {
    id: number;
    received_at: string;
    solver: string;
    session_id: string;
    build_commit: string | null;
    app_build: string;
    enemy_id: string;
    player_level: number;
    enemy_hp_multiplier: number;
    outcome: FightRow['outcome'];
    turns: number;
    vitae_start: number;
    vitae_end: number;
    vitae_low: number;
    deck_json: string;
    relics_json: string;
    signatures_json: string;
    events_json: string;
    source: PlayLogSourceKind;
    run_id: string | null;
}

function toRow(record: FightRecord): FightRow {
    return {
        id: record.id,
        receivedAt: record.received_at,
        solver: record.solver,
        sessionId: record.session_id,
        buildCommit: record.build_commit,
        appBuild: record.app_build,
        enemyId: record.enemy_id,
        playerLevel: record.player_level,
        enemyHpMultiplier: record.enemy_hp_multiplier,
        outcome: record.outcome,
        turns: record.turns,
        vitaeStart: record.vitae_start,
        vitaeEnd: record.vitae_end,
        vitaeLow: record.vitae_low,
        deck: JSON.parse(record.deck_json) as string[],
        relics: JSON.parse(record.relics_json) as string[],
        signatures: JSON.parse(record.signatures_json) as string[],
        events: JSON.parse(record.events_json) as PlayLogEvent[],
        source: record.source,
        runId: record.run_id,
    };
}

/** Stores one validated fight; the Worker stamps `received_at`. */
export async function insertFight(
    db: D1Database,
    fight: FightPost,
    receivedAt: string,
): Promise<{ id: number; receivedAt: string }> {
    const result = await db
        .prepare(
            `INSERT INTO fights
                (received_at, solver, session_id, build_commit, app_build, enemy_id, player_level,
                 enemy_hp_multiplier, outcome, turns, vitae_start, vitae_end, vitae_low, deck_json, relics_json, signatures_json, events_json, source, run_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING id`,
        )
        .bind(
            receivedAt,
            fight.solver,
            fight.sessionId,
            fight.buildCommit,
            fight.appBuild,
            fight.enemyId,
            fight.playerLevel,
            fight.enemyHpMultiplier,
            fight.outcome,
            fight.turns,
            fight.vitaeStart,
            fight.vitaeEnd,
            fight.vitaeLow,
            JSON.stringify(fight.deck),
            JSON.stringify(fight.relics ?? []),
            JSON.stringify(fight.signatures ?? []),
            JSON.stringify(fight.events),
            fight.source ?? 'human',
            fight.runId ?? null,
        )
        .first<{ id: number }>();
    if (!result) throw new Error('insert returned no id');
    return { id: result.id, receivedAt };
}

/** Every stored fight, newest first; `enemyId` narrows to one foe and `source` to one source (null: every source). */
export async function listFights(db: D1Database, enemyId?: string, source: PlayLogSourceKind | null = null): Promise<FightRow[]> {
    const statement = db
        .prepare('SELECT * FROM fights WHERE (?1 IS NULL OR enemy_id = ?1) AND (?2 IS NULL OR source = ?2) ORDER BY id DESC')
        .bind(enemyId ?? null, source);
    const { results } = await statement.all<FightRecord>();
    return results.map(toRow);
}

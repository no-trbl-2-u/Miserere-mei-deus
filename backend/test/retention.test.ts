/**
 * SM2g A16 and A17: the nightly `scheduled` handler deletes every `sim` and `harness` row older
 * than 14 days from the five play-log tables, whole runs first (`play_runs` last), run-less and
 * orphan rows by `received_at`; a `human` row, a young row and `ballot_verdicts` stay; a small
 * injected batch still empties the old rows; a second run deletes nothing.
 */

import { createExecutionContext, createScheduledController, env, waitOnExecutionContext } from 'cloudflare:test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import worker from '../src/index';
import { RETENTION_DAYS, RETENTION_LIMITS, retentionCutoff, retentionLogLine, runRetention } from '../src/retention';

// Tonight's cron: cutoff is 2026-11-01T05:17:00.000Z.
const NOW = new Date('2026-11-15T05:17:00.000Z');
const OLD = '2026-10-20T12:00:00.000Z';
const YOUNG = '2026-11-10T12:00:00.000Z';

type Source = 'human' | 'harness' | 'sim';
const SOURCES: Source[] = ['human', 'harness', 'sim'];
const CHILD_TABLES = ['run_events', 'fights', 'deck_events', 'puzzle_attempts'] as const;
const ALL_TABLES = [...CHILD_TABLES, 'play_runs'] as const;

async function insertRun(runId: string, source: Source, startedAt: string): Promise<void> {
    await env.DB.prepare(
        `INSERT INTO play_runs (run_id, source, solver, session_id, app_build, start_deck_json, started_at)
         VALUES (?, ?, 'bot', 's', 'b', '[]', ?)`,
    ).bind(runId, source, startedAt).run();
}

/** One row in `table` for `runId` (null: a run-less row). */
async function insertChild(table: (typeof CHILD_TABLES)[number], source: Source, runId: string | null, receivedAt: string): Promise<void> {
    const sql: Record<(typeof CHILD_TABLES)[number], string> = {
        run_events: `INSERT INTO run_events (received_at, run_id, source, seq, kind, payload_json) VALUES (?1, ?3, ?2, 0, 'xp-gained', '{}')`,
        fights: `INSERT INTO fights (received_at, solver, session_id, app_build, enemy_id, player_level, enemy_hp_multiplier, outcome, turns,
                     vitae_start, vitae_end, vitae_low, deck_json, events_json, source, run_id)
                 VALUES (?1, 'bot', 's', 'b', 'gull', 1, 1, 'victory', 3, 10, 8, 6, '[]', '[]', ?2, ?3)`,
        deck_events: `INSERT INTO deck_events (received_at, solver, session_id, app_build, kind, deck_json, where_json, source, run_id)
                      VALUES (?1, 'bot', 's', 'b', 'reward', '[]', '{}', ?2, ?3)`,
        puzzle_attempts: `INSERT INTO puzzle_attempts (received_at, solver, layout_id, route, end_kind, end_ms, cleared, moves_json, app_build, source, run_id)
                          VALUES (?1, 'bot', 'l', 'r', 'cleared', 100, 1, '[]', 'b', ?2, ?3)`,
    };
    if (table === 'run_events' && runId === null) throw new Error('run_events always carry a run id');
    await env.DB.prepare(sql[table]).bind(receivedAt, source, runId).run();
}

/** A run with one row in every child table, all stamped `at`. */
async function seedRun(runId: string, source: Source, at: string): Promise<void> {
    await insertRun(runId, source, at);
    for (const table of CHILD_TABLES) await insertChild(table, source, runId, at);
}

async function count(table: string, where = '1 = 1'): Promise<number> {
    const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`).first<{ n: number }>();
    return row?.n ?? 0;
}

/** Rows across the five tables; `where` may use STAMP for each table's own timestamp column. */
async function total(where: string): Promise<number> {
    let sum = 0;
    for (const table of ALL_TABLES) sum += await count(table, where.replaceAll('STAMP', table === 'play_runs' ? 'started_at' : 'received_at'));
    return sum;
}

const OLD_BOT = `source IN ('sim', 'harness')`;

beforeEach(async () => {
    for (const table of [...ALL_TABLES, 'ballot_verdicts']) await env.DB.prepare(`DELETE FROM ${table}`).run();
});

/** Old and young rows of all three sources: whole runs, run-less rows and orphans. */
async function seedMixed(): Promise<void> {
    for (const source of SOURCES) {
        await seedRun(`old-${source}`, source, OLD);
        await seedRun(`young-${source}`, source, YOUNG);
        for (const table of ['fights', 'deck_events', 'puzzle_attempts'] as const) {
            await insertChild(table, source, null, OLD); // old run-less
            await insertChild(table, source, null, YOUNG); // young run-less
            await insertChild(table, source, `ghost-${source}`, OLD); // old orphan
        }
        await insertChild('run_events', source, `ghost-${source}`, OLD); // old orphan event
    }
    // An old run still open (never closed) goes too; its age is its start.
    await seedRun('old-open-sim', 'sim', OLD);
}

describe('the cutoff', () => {
    it('is 14 days back, in the shape of the stored timestamps', () => {
        expect(RETENTION_DAYS).toBe(14);
        expect(retentionCutoff(NOW)).toBe('2026-11-01T05:17:00.000Z');
        expect(retentionCutoff(NOW)).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
    });
});

describe('runRetention', () => {
    it('leaves no old sim or harness row, and every human and young row', async () => {
        await seedMixed();
        const humanBefore = await total(`source = 'human'`);
        const youngBefore = await total(`source IN ('sim', 'harness') AND STAMP >= '${retentionCutoff(NOW)}'`);

        const result = await runRetention(env.DB, NOW);

        for (const table of CHILD_TABLES) expect(await count(table, `${OLD_BOT} AND received_at < '${result.cutoff}'`), table).toBe(0);
        expect(await count('play_runs', `${OLD_BOT} AND started_at < '${result.cutoff}'`)).toBe(0);
        expect(await total(`source = 'human'`)).toBe(humanBefore);
        expect(await total(`source IN ('sim', 'harness') AND STAMP >= '${result.cutoff}'`)).toBe(youngBefore);
        expect(result.capped).toBe(false);
        // 3 old runs (sim, harness, open sim) x 4 children, 2 old bot orphan runs' worth of loose rows.
        expect(result.deleted.runs).toBe(3);
        expect(result.deleted.run_events).toBe(3 + 2);
        expect(result.deleted.fights).toBe(3 + 2 * 2);
    });

    it('leaves no run part-deleted', async () => {
        await seedMixed();
        await runRetention(env.DB, NOW);
        const runs = await env.DB.prepare('SELECT run_id FROM play_runs').all<{ run_id: string }>();
        expect(runs.results.map((r) => r.run_id).sort()).toEqual(['old-human', 'young-harness', 'young-human', 'young-sim']);
        for (const { run_id } of runs.results) {
            for (const table of CHILD_TABLES) expect(await count(table, `run_id = '${run_id}'`), `${run_id} ${table}`).toBe(1);
        }
        // Every deleted run left nothing behind.
        for (const table of CHILD_TABLES) expect(await count(table, `run_id IN ('old-sim', 'old-harness', 'old-open-sim')`)).toBe(0);
    });

    it('never reads ballot_verdicts', async () => {
        await env.DB.prepare(
            `INSERT INTO ballot_verdicts (received_at, ballot_id, verdict_text, kept_json, notes_json) VALUES (?, 'b', 'v', '[]', '[]')`,
        ).bind('2020-01-01T00:00:00.000Z').run();
        await runRetention(env.DB, NOW);
        expect(await count('ballot_verdicts')).toBe(1);
    });

    it('a second run deletes nothing', async () => {
        await seedMixed();
        await runRetention(env.DB, NOW);
        const again = await runRetention(env.DB, NOW);
        expect(again.deleted).toEqual({ runs: 0, run_events: 0, fights: 0, deck_events: 0, puzzle_attempts: 0 });
        expect(again.batches).toBe(0);
    });

    it('a small injected batch still empties the old rows', async () => {
        await seedMixed();
        for (let i = 0; i < 6; i += 1) await seedRun(`bulk-${i}`, i % 2 ? 'sim' : 'harness', `2026-10-1${i}T00:00:00.000Z`);
        for (let i = 0; i < 7; i += 1) await insertChild('fights', 'sim', null, OLD);
        const humanBefore = await total(`source = 'human'`);

        const result = await runRetention(env.DB, NOW, { maxRuns: 2, maxRows: 4, maxBatches: 100 });

        expect(result.capped).toBe(false);
        expect(result.batches).toBeGreaterThan(3);
        expect(await total(`${OLD_BOT} AND STAMP < '${result.cutoff}'`)).toBe(0);
        expect(await total(`source = 'human'`)).toBe(humanBefore);
        expect(await count('play_runs', `run_id LIKE 'bulk-%'`)).toBe(0);
        for (const table of CHILD_TABLES) expect(await count(table, `run_id LIKE 'bulk-%'`)).toBe(0);
    });

    it('a run bigger than the row budget still goes whole', async () => {
        await seedRun('big', 'sim', OLD);
        for (let i = 0; i < 9; i += 1) await insertChild('fights', 'sim', 'big', OLD);
        await runRetention(env.DB, NOW, { maxRuns: 5, maxRows: 3, maxBatches: 10 });
        expect(await count('play_runs', `run_id = 'big'`)).toBe(0);
        expect(await count('fights', `run_id = 'big'`)).toBe(0);
    });

    it('runs that share a start time split across batches cleanly', async () => {
        for (const id of ['tie-a', 'tie-b', 'tie-c']) await seedRun(id, 'sim', OLD);
        await runRetention(env.DB, NOW, { maxRuns: 1, maxRows: 1000, maxBatches: 10 });
        expect(await total(`${OLD_BOT}`)).toBe(0);
    });

    it('the batch cap leaves whole runs for the next night', async () => {
        for (let i = 0; i < 5; i += 1) await seedRun(`night-${i}`, 'sim', `2026-10-0${i + 1}T00:00:00.000Z`);
        const first = await runRetention(env.DB, NOW, { maxRuns: 1, maxRows: 1000, maxBatches: 2 });
        expect(first.capped).toBe(true);
        expect(first.deleted.runs).toBe(2);
        // The oldest two went, with their children; the rest are untouched, not half-deleted.
        expect(await count('play_runs')).toBe(3);
        for (const table of CHILD_TABLES) expect(await count(table)).toBe(3);
        const second = await runRetention(env.DB, NOW, { maxRuns: 1, maxRows: 1000, maxBatches: 10 });
        expect(second.capped).toBe(false);
        expect(await total('1 = 1')).toBe(0);
    });

    it('keeps the production caps in the spec', () => {
        expect(RETENTION_LIMITS).toEqual({ maxRuns: 200, maxRows: 1000, maxBatches: 25 });
    });
});

describe('scheduled', () => {
    it('runs the sweep at the cron time and logs one line of counts', async () => {
        await seedMixed();
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        const controller = createScheduledController({ scheduledTime: NOW.getTime(), cron: '17 5 * * *' });
        const ctx = createExecutionContext();
        await worker.scheduled(controller, env);
        await waitOnExecutionContext(ctx);
        const lines = log.mock.calls.map((call) => String(call[0])).filter((line) => line.startsWith('retention:'));
        log.mockRestore();

        expect(lines).toHaveLength(1);
        expect(lines[0]).toContain('runs=3');
        expect(lines[0]).toContain('cutoff=2026-11-01T05:17:00.000Z');
        expect(await count('play_runs', `${OLD_BOT} AND started_at < '2026-11-01T05:17:00.000Z'`)).toBe(0);
        expect(await count('play_runs', `source = 'human'`)).toBe(2);
    });

    it('logs the counts in one line', () => {
        const line = retentionLogLine({
            cutoff: 'c', batches: 2, capped: false,
            deleted: { runs: 1, run_events: 2, fights: 3, deck_events: 4, puzzle_attempts: 5 },
        });
        expect(line).toBe('retention: cutoff=c runs=1 run_events=2 fights=3 deck_events=4 puzzle_attempts=5 batches=2 capped=false');
        expect(line).not.toContain('\n');
    });
});

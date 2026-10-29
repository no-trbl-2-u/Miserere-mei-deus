/**
 * Process-level smoke — real `ts-node` command startup for the two
 * player-facing entrypoints (`npm run combat`, `npm run game -- --route`).
 *
 * The hermetic e2e suites (`combat.cli.engine.test.ts`,
 * `game.cli.route-hazard.engine.test.ts`) call `runCombatCli` /
 * `runGameCli` in-process, which proves the store/event wiring but never
 * exercises the actual `require.main === module` bootstrap, npm's argv
 * forwarding, or `ts-node`'s own module resolution. This suite spawns the
 * real commands as child processes so a broken script, a `ts-node`
 * transpile failure, or an argv-forwarding regression fails here instead
 * of at runtime after merge.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';

const PACKAGE_ROOT = path.resolve(__dirname, '../../..');

// Windows: `npx` is a .cmd shim — Node's execFileSync can't resolve or spawn
// it without a shell (spawnSync npx ENOENT / the .cmd CVE-2024-27980 guard).
// No argument here contains spaces, so shell quoting is safe.
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const SPAWN_OPTS = { cwd: PACKAGE_ROOT, stdio: 'pipe' as const, timeout: 60_000, shell: process.platform === 'win32' };

const tmpFiles: string[] = [];
function tmpPath(suffix: string): string {
    const p = path.join(os.tmpdir(), `axiomancer-cli-smoke-${suffix}-${randomUUID()}.jsonl`);
    tmpFiles.push(p);
    return p;
}

function readLog(p: string): Array<Record<string, unknown>> {
    return fs.readFileSync(p, 'utf-8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
}

afterEach(() => {
    tmpFiles.forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
    tmpFiles.length = 0;
});

describe('CLI process-level smoke (real ts-node startup)', () => {
    it('runs the standalone combat CLI as a real process', () => {
        const logPath = tmpPath('combat');

        execFileSync(
            NPX,
            [
                'ts-node', 'src/CLI/game.cli.ts', 'combat',
                '--auto', '--policy', 'status', '--enemy', 'float-eye',
                '--seed', '42', '--max-turns', '12',
                '--json-events', '--state-log', logPath,
            ],
            SPAWN_OPTS,
        );

        const actions = readLog(logPath).map(r => r.action);
        expect(actions).toContain('hazardCombat:start');
        expect(actions).toContain('hazardCombat:autoPhase');
        expect(actions).toContain('hazardCombat:end');
    }, 60_000);

    it('runs the playtest sweep CLI with an AXM Log replay index', () => {
        const logPath = tmpPath('playtest');

        const stdout = execFileSync(
            NPX,
            [
                'ts-node', 'src/CLI/combat-playtest.cli.ts',
                '--stage=early', '--policy=greedy', '--runs=2', '--seed=7',
                '--json', `--log-file=${logPath}`,
            ],
            SPAWN_OPTS,
        ).toString();

        // --json purity survives the log flags: stdout is the report and
        // nothing else (file sink only; no [axm] lines on stdout).
        const report = JSON.parse(stdout) as { cells: unknown[] };
        expect(report.cells.length).toBeGreaterThan(0);

        // The JSONL is a replay index: per-run seed-set entries plus one
        // playtest-cell summary per cell, at the --log-file default (info).
        const entries = readLog(logPath);
        const kinds = entries.map(e => e.kind);
        expect(kinds).toContain('seed-set');
        expect(kinds.filter(k => k === 'playtest-cell')).toHaveLength(report.cells.length);
        const cell = entries.find(e => e.kind === 'playtest-cell') as {
            data: { stage: string; seed: number; runs: number; winRate: number };
        };
        expect(cell.data.stage).toBe('early');
        expect(cell.data.seed).toBe(7);
        expect(cell.data.runs).toBe(2);
        expect(typeof cell.data.winRate).toBe('number');
    }, 60_000);

    it('runs the route-to-Hazard game CLI as a real process', () => {
        const logPath = tmpPath('route');

        execFileSync(
            NPX,
            [
                'ts-node', 'src/CLI/game.cli.ts',
                // bw-w2 is a Float-Eye encounter, a road from the windmill start.
                '--start-map', 'breakwater', '--resolve-start', '--route', 'bw-w2', '--auto-combat',
                '--combat-policy', 'status', '--combat-seed', '42',
                '--combat-max-turns', '12',
                '--json-events', '--state-log', logPath,
            ],
            SPAWN_OPTS,
        );

        const actions = readLog(logPath).map(r => r.action);
        expect(actions).toContain('moveToNode');
        expect(actions).toContain('resolveMapEvent');
        expect(actions).toContain('hazardCombat:start');
        expect(actions).toContain('hazardCombat:autoPhase');
        expect(actions).toContain('hazardCombat:end');
    }, 60_000);
});

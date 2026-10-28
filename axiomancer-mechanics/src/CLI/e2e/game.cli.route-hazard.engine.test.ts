import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';

import { runGameCli } from '../game.cli';
import { setStateLogPath, setOutputMode } from '../io';

const tmpFiles: string[] = [];
function tmpPath(suffix: string): string {
    const p = path.join(os.tmpdir(), `axiomancer-game-cli-route-${suffix}-${randomUUID()}.jsonl`);
    tmpFiles.push(p);
    return p;
}

function readLog(p: string): Array<Record<string, unknown>> {
    return fs.readFileSync(p, 'utf-8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
}

afterEach(() => {
    tmpFiles.forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
    tmpFiles.length = 0;
    setStateLogPath(null);
    setOutputMode('human');
});

describe('Game CLI route walkthrough → Hazard-Pattern combat', () => {
    it('walks the Breakwater to its first encounter and runs Hazard combat', async () => {
        const logPath = tmpPath('bw-encounter');

        // bw-2 is a Float-Eye encounter in the second step's pocket: the
        // walk plays step one (bw-19, the bw-3 hazard), turns it in at bw-20
        // and accepts step two to reach it.
        await runGameCli([
            '--start-map', 'breakwater', '--resolve-start', '--route', 'bw-19,bw-3,bw-4,bw-9,bw-20,bw-2',
            '--auto-combat',
            '--combat-policy', 'status',
            '--combat-seed', '42',
            '--combat-max-turns', '12',
            '--state-log', logPath,
        ]);

        const logs = readLog(logPath);
        const actions = logs.map(r => r.action);
        expect(actions).toContain('moveToNode');
        expect(actions).toContain('resolveMapEvent');
        expect(actions).toContain('hazardCombat:start');
        expect(actions).toContain('hazardCombat:autoPhase');
        expect(actions).toContain('hazardCombat:end');

        const encounterEvent = logs
            .filter(r => r.action === 'resolveMapEvent')
            .map(r => r.event as { kind?: string; encounter?: { enemies?: Array<{ name?: string }> } })
            .find(event => event.kind === 'encounter');
        // bw-2's encounter pool is the Float-Eye (R2 roster reset).
        expect(encounterEvent?.encounter?.enemies?.[0]?.name).toBe('Float-Eye');

        const end = logs.find(r => r.action === 'hazardCombat:end');
        expect((end?.event as { outcome?: string })?.outcome).toMatch(/victory|defeat|mercy|retreat/);
    });
});

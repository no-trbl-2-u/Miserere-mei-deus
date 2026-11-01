/**
 * SM2e A12: `run-ends`, `run-pacing` and `coverage` in the Workers runtime against a local D1, over fixture rows of
 * all three sources. Rows go in through the real POST routes (so they are young: the retention cron keeps them); every
 * count is worked out by hand in the comments. Nothing here grades the game: the numbers are the fixtures'.
 */

import { SELF } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

import type { FightPost, PlayLogSourceKind, PlayRunEndPost, PlayRunPost, RunEvent, RunEventsPost } from '../src/contract';
import type { CoverageReport, RunEndsReport, RunPacingReport } from '../src/reports';

const BASE = 'https://miserere-api.test';
const AUTH = { Authorization: 'Bearer test-token' };
const B = 'sm2e01';
const OTHER = 'sm2e02';

async function post(path: string, body: unknown): Promise<void> {
    const res = await SELF.fetch(`${BASE}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...AUTH }, body: JSON.stringify(body),
    });
    expect([200, 201]).toContain(res.status);
}

async function report<T>(path: string): Promise<T> {
    const res = await SELF.fetch(`${BASE}${path}`, { headers: AUTH });
    expect(res.status).toBe(200);
    return res.json<T>();
}

async function run(
    runId: string, source: PlayLogSourceKind, policyId: string | null, end?: Partial<PlayRunEndPost>, over: Partial<PlayRunPost> = {},
): Promise<void> {
    await post('/v1/play-runs', {
        solver: source === 'sim' ? 'bot' : 'T', sessionId: 's-1', buildCommit: B, appBuild: '1.4.0 preview', runId,
        characterId: 'the-chosen', policyId, startDeck: ['strike'], source, ...over,
    } satisfies PlayRunPost);
    if (end) {
        await post(`/v1/play-runs/${encodeURIComponent(runId)}/end`, {
            outcome: 'run-over', endNodeId: 'n-a', level: 1, vitaeEnd: 0, nodesResolved: 1, endDeck: ['strike'], ...end,
        } satisfies PlayRunEndPost);
    }
}

const entered = (seq: number, nodeId: string): RunEvent => ({ seq, kind: 'node-entered', payload: { map: 'breakwater', nodeId, nodeKind: null } });
const resolved = (seq: number, nodeId: string, choice: string, level?: number, vitae?: number): RunEvent => ({
    seq, kind: 'node-resolved', payload: { nodeId, nodeKind: null, choice, ...(level === undefined ? {} : { level }), ...(vitae === undefined ? {} : { vitae }) },
});
const hazard = (seq: number, hazardId: string, cleared: boolean): RunEvent => ({
    seq, kind: 'hazard-ended', payload: { hazardId, cleared, vitaeBefore: 20, vitaeAfter: 15 },
});
const item = (seq: number, itemId: string): RunEvent => ({ seq, kind: 'item-gained', payload: { itemId, slot: 'relic', from: 'cache' } });
const quest = (seq: number, questId: string, stepId: string | null, action: 'accept' | 'turn-in' | 'complete'): RunEvent => ({
    seq, kind: 'quest-step', payload: { questId, stepId, action },
});

async function events(runId: string, source: PlayLogSourceKind, list: RunEvent[]): Promise<void> {
    await post('/v1/run-events', { runId, source, events: list } satisfies RunEventsPost);
}

async function fight(runId: string, source: PlayLogSourceKind, enemyId: string, outcome: FightPost['outcome']): Promise<void> {
    await post('/v1/fights', {
        solver: 'bot', sessionId: 's-1', buildCommit: B, appBuild: '1.4.0 preview', enemyId, playerLevel: 1, enemyHpMultiplier: 1, outcome,
        turns: 1, vitaeStart: 30, vitaeEnd: 30, vitaeLow: 30, deck: [], events: [], source, runId,
    } satisfies FightPost);
}

beforeAll(async () => {
    // Cautious c1 (closed, chapter-clear at n-c) and c2 (closed, run-over at n-b; an older build: no level or VITAE).
    await run('sm2e-c1', 'sim', 'cautious', { outcome: 'chapter-clear', endNodeId: 'n-c', level: 3, vitaeEnd: 25 });
    await run('sm2e-c2', 'sim', 'cautious', { outcome: 'run-over', endNodeId: 'n-b', level: 1, vitaeEnd: 0 });
    await run('sm2e-r1', 'sim', 'rusher', { outcome: 'run-over', endNodeId: 'n-b', level: 4, vitaeEnd: 0 });
    await run('sm2e-h1', 'human', null, { outcome: 'chapter-clear', endNodeId: 'n-a', level: 5, vitaeEnd: 40 });
    await run('sm2e-x1', 'harness', null, { outcome: 'run-over', endNodeId: 'n-x', level: 3, vitaeEnd: 0 });
    await run('sm2e-h2', 'human', null, undefined, { buildCommit: OTHER });

    await events('sm2e-c1', 'sim', [
        entered(0, 'n-a'), resolved(1, 'n-a', 'fight', 1, 20),
        entered(2, 'n-b'), resolved(3, 'n-b', 'rest', 2, 30),
        entered(4, 'n-c'), hazard(5, 'h-1', true), resolved(6, 'n-c', 'hazard-cleared', 2, 25),
        quest(7, 'breakwater-line', '1', 'accept'), item(8, 'relic-a'),
        entered(9, 'n-b'), resolved(10, 'n-b', 'rest', 3, 28),
    ]);
    await events('sm2e-c2', 'sim', [entered(0, 'n-a'), resolved(1, 'n-a', 'flee'), entered(2, 'n-b')]);
    await events('sm2e-r1', 'sim', [
        entered(0, 'n-b'), resolved(1, 'n-b', 'fight', 4, 10),
        quest(2, 'breakwater-line', '1', 'turn-in'), quest(3, 'a-side-job', null, 'complete'),
        hazard(4, 'h-1', false), item(5, 'relic-a'),
    ]);
    await events('sm2e-h1', 'human', [entered(0, 'n-a'), resolved(1, 'n-a', 'fight', 5, 40)]);

    await fight('sm2e-c1', 'sim', 'gutter-wretch', 'victory');
    await fight('sm2e-c2', 'sim', 'gutter-wretch', 'defeat');
    await fight('sm2e-r1', 'sim', 'brine-hound', 'victory');
    await fight('sm2e-h1', 'human', 'gutter-wretch', 'victory');
});

describe('run-ends', () => {
    it('counts the closed runs per source, policy and end node, most first', async () => {
        const body = await report<RunEndsReport>(`/v1/reports/run-ends?build=${B}`);
        expect(body).toMatchObject({ report: 'run-ends', build: B, source: 'all', runs: 5 });
        expect(body.ends).toEqual([
            { source: 'human', policyId: null, endNodeId: 'n-a', runs: 1, runOver: 0, chapterClear: 1, avgLevel: 5, avgVitaeEnd: 40 },
            { source: 'harness', policyId: null, endNodeId: 'n-x', runs: 1, runOver: 1, chapterClear: 0, avgLevel: 3, avgVitaeEnd: 0 },
            { source: 'sim', policyId: 'cautious', endNodeId: 'n-b', runs: 1, runOver: 1, chapterClear: 0, avgLevel: 1, avgVitaeEnd: 0 },
            { source: 'sim', policyId: 'cautious', endNodeId: 'n-c', runs: 1, runOver: 0, chapterClear: 1, avgLevel: 3, avgVitaeEnd: 25 },
            { source: 'sim', policyId: 'rusher', endNodeId: 'n-b', runs: 1, runOver: 1, chapterClear: 0, avgLevel: 4, avgVitaeEnd: 0 },
        ]);
    });

    it('?source= narrows, and ?build= narrows to a build whose only run is still open', async () => {
        const sim = await report<RunEndsReport>(`/v1/reports/run-ends?build=${B}&source=sim`);
        expect(sim).toMatchObject({ source: 'sim', runs: 3 });
        expect(sim.ends.map(r => [r.policyId, r.endNodeId])).toEqual([['cautious', 'n-b'], ['cautious', 'n-c'], ['rusher', 'n-b']]);
        const open = await report<RunEndsReport>(`/v1/reports/run-ends?build=${OTHER}`);
        expect(open).toMatchObject({ runs: 0, ends: [] });
    });

    it('is empty for a build with no run, and 400s on a bad source', async () => {
        expect(await report<RunEndsReport>('/v1/reports/run-ends?build=nobuild')).toMatchObject({ runs: 0, ends: [] });
        const bad = await SELF.fetch(`${BASE}/v1/reports/run-ends?source=bot`, { headers: AUTH });
        expect(bad.status).toBe(400);
    });
});

describe('run-pacing', () => {
    it('gives, per node, the runs that entered it, the nodes resolved before it, level and VITAE after it, rests and withdrawals', async () => {
        const body = await report<RunPacingReport>(`/v1/reports/run-pacing?build=${B}&source=sim`);
        expect(body).toMatchObject({ report: 'run-pacing', build: B, source: 'sim', runs: 3 });
        expect(body.pacing).toEqual([
            // n-a: both runs entered it first (0 resolved before). c1 resolved it at level 1 / VITAE 20; c2 fled and
            // its older build posted neither, so the averages are c1's alone.
            { source: 'sim', policyId: 'cautious', nodeId: 'n-a', runs: 2, avgResolvedBefore: 0, avgLevel: 1, avgVitae: 20, rests: 0, withdrawals: 1 },
            // n-b: c1 and c2 each had 1 resolved before the FIRST entry (c1 enters it again at seq 9: not counted).
            // c1 rested twice, at level 2 / VITAE 30 and level 3 / VITAE 28.
            { source: 'sim', policyId: 'cautious', nodeId: 'n-b', runs: 2, avgResolvedBefore: 1, avgLevel: 2.5, avgVitae: 29, rests: 2, withdrawals: 0 },
            // n-c: c1 had resolved n-a and n-b (2) before it.
            { source: 'sim', policyId: 'cautious', nodeId: 'n-c', runs: 1, avgResolvedBefore: 2, avgLevel: 2, avgVitae: 25, rests: 0, withdrawals: 0 },
            { source: 'sim', policyId: 'rusher', nodeId: 'n-b', runs: 1, avgResolvedBefore: 0, avgLevel: 4, avgVitae: 10, rests: 0, withdrawals: 0 },
        ]);
    });

    it('reads every source with no ?source=, and a build whose only run is open has runs but no rows', async () => {
        const all = await report<RunPacingReport>(`/v1/reports/run-pacing?build=${B}`);
        expect(all).toMatchObject({ source: 'all', runs: 5 });
        expect(all.pacing[0]).toEqual({ source: 'human', policyId: null, nodeId: 'n-a', runs: 1, avgResolvedBefore: 0, avgLevel: 5, avgVitae: 40, rests: 0, withdrawals: 0 });
        const human = await report<RunPacingReport>(`/v1/reports/run-pacing?build=${OTHER}`);
        expect(human).toMatchObject({ runs: 1, pacing: [] });
    });

    it('is empty for a build with no run', async () => {
        expect(await report<RunPacingReport>('/v1/reports/run-pacing?build=nobuild')).toMatchObject({ runs: 0, pacing: [] });
    });
});

describe('coverage', () => {
    const row = (policyId: string, kind: string, id: string, runs: number, count: number, cleared: number | null) => (
        { source: 'sim', policyId, kind, id, runs, count, cleared }
    );

    it('counts nodes, quest steps, enemies, hazards and items by their raw ids, per policy', async () => {
        const body = await report<CoverageReport>(`/v1/reports/coverage?build=${B}&source=sim`);
        expect(body).toMatchObject({ report: 'coverage', build: B, source: 'sim', runs: 3 });
        expect(body.coverage).toEqual([
            // n-b: entered 3 times (c1 twice, c2 once) by 2 runs, resolved twice (c1 both times; c2 never resolved it).
            row('cautious', 'node', 'n-b', 2, 3, 2),
            row('cautious', 'node', 'n-a', 2, 2, 2),
            row('cautious', 'node', 'n-c', 1, 1, 1),
            row('cautious', 'quest-step', 'breakwater-line/1', 1, 1, 0),
            row('cautious', 'enemy', 'gutter-wretch', 2, 2, 1),
            row('cautious', 'hazard', 'h-1', 1, 1, 1),
            row('cautious', 'item', 'relic-a', 1, 1, null),
            row('rusher', 'node', 'n-b', 1, 1, 1),
            // A step ids as questId/stepId; a quest with no step (outside a questline) is its bare name.
            row('rusher', 'quest-step', 'a-side-job', 1, 1, 1),
            row('rusher', 'quest-step', 'breakwater-line/1', 1, 1, 1),
            row('rusher', 'enemy', 'brine-hound', 1, 1, 1),
            row('rusher', 'hazard', 'h-1', 1, 1, 0),
            row('rusher', 'item', 'relic-a', 1, 1, null),
        ]);
    });

    it('?source= and ?build= narrow, and an absent ?source= reads every source', async () => {
        const human = await report<CoverageReport>(`/v1/reports/coverage?build=${B}&source=human`);
        expect(human.coverage).toEqual([
            { source: 'human', policyId: null, kind: 'node', id: 'n-a', runs: 1, count: 1, cleared: 1 },
            { source: 'human', policyId: null, kind: 'enemy', id: 'gutter-wretch', runs: 1, count: 1, cleared: 1 },
        ]);
        const all = await report<CoverageReport>(`/v1/reports/coverage?build=${B}`);
        expect(all.source).toBe('all');
        expect(new Set(all.coverage.map(r => r.source))).toEqual(new Set(['human', 'sim']));
    });

    it('is empty for a build with no run, and 400s on a bad source', async () => {
        expect(await report<CoverageReport>('/v1/reports/coverage?build=nobuild')).toMatchObject({ runs: 0, coverage: [] });
        const bad = await SELF.fetch(`${BASE}/v1/reports/coverage?source=bot`, { headers: AUTH });
        expect(bad.status).toBe(400);
    });
});

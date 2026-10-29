import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';

import { runGameCli } from '../game.cli';
import { setStateLogPath, setOutputMode } from '../io';
import { ENEMY_REGISTRY, DeathBeholder } from '../../Enemy/enemy.library';
import { scaleEnemyToLevel } from '../../World/encounter';

const tmpFiles: string[] = [];
function tmpPath(suffix: string): string {
    const p = path.join(os.tmpdir(), `axiomancer-game-cli-route-audit-${suffix}-${randomUUID()}.jsonl`);
    tmpFiles.push(p);
    return p;
}

function readLog(p: string): Array<Record<string, unknown>> {
    return fs.readFileSync(p, 'utf-8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
}

function routeEnd(logPath: string): Record<string, unknown> {
    const logs = readLog(logPath);
    const end = logs.find(r => r.action === 'route:end');
    expect(end, 'expected a route:end summary record').toBeDefined();
    return end!.event as Record<string, unknown>;
}

afterEach(() => {
    tmpFiles.forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
    tmpFiles.length = 0;
    setStateLogPath(null);
    setOutputMode('human');
});

describe('Phase 14 — route survivorship vs coverage-audit classification', () => {
    it('--route-audit reports all 22 Breakwater nodes without mutating a single life', async () => {
        const logPath = tmpPath('coverage');

        await runGameCli(['--route-audit', 'breakwater', '--state-log', logPath]);

        const summary = routeEnd(logPath);
        expect(summary.classification).toBe('coverage-audit');
        expect(summary.survived).toBe(true);
        expect(summary.unvisitedNodeIds).toEqual([]);
        expect((summary.visitedNodeIds as string[]).length).toBe(22);
        expect((summary.resolvedNodeIds as string[]).length).toBe(22);
        expect(summary.combatOutcomes).toEqual({});

        // bw-17 is the Death Beholder's door fight; bw-1 is the arrival cutscene
        // — the audit inspects wiring, it never fights anyone. bw-18 is the
        // door to charcoal-wood — the read-only audit sees its kind without
        // walking through it. bw-16 is the region's Anvil.
        const eventKinds = summary.eventKinds as Record<string, string>;
        expect(eventKinds['bw-1']).toBe('cutscene');
        expect(eventKinds['bw-17']).toBe('encounter');
        expect(eventKinds['bw-18']).toBe('travel');
        expect(eventKinds['bw-16']).toBe('village');
        // bw-19..bw-22 are the questline's four quest nodes.
        for (const id of ['bw-19', 'bw-20', 'bw-21', 'bw-22']) expect(eventKinds[id]).toBe('quest');

        const actions = readLog(logPath).map(r => r.action);
        expect(actions).not.toContain('hazardCombat:start');
    });

    it('a scripted route stops at a combat defeat and downgrades to "blocked" — never reports post-defeat traversal as survivorship', async () => {
        const logPath = tmpPath('defeat-stop');

        // The bw-10 combat (the Walled Manor, in the second step's pocket)
        // is forced against a ceiling enemy — a test-only registry entry:
        // the Death Beholder scaled to L110 — so it is a DETERMINISTIC defeat
        // regardless of card balance. The impossible enemy decouples this
        // classifier test from balance for good. The walk plays step one
        // (bw-19, the bw-3 hazard) and turns it in at bw-20 to reach the
        // pocket.
        //
        // The intermediate encounter is decoupled from balance too:
        // `--combat-max-turns 2` is chosen so the bw-2 fodder fight
        // (Float-Eye) hits the turn cap UNRESOLVED (outcome null — not a
        // defeat, so the route continues), while the L110 ceiling at bw-10
        // still kills within the cap. Only a real `defeat` blocks the route;
        // a capped, undecided combat must not. bw-14 is a route target but
        // must never be reached once bw-10 ends in defeat.
        const registry = ENEMY_REGISTRY as Record<string, unknown>;
        registry['test-ceiling'] = scaleEnemyToLevel(DeathBeholder, 110);
        try {
            await runGameCli([
                '--start-map', 'breakwater', '--resolve-start', '--route', 'bw-19,bw-3,bw-4,bw-9,bw-20,bw-2,bw-10,bw-14',
                '--auto-combat',
                '--combat-policy', 'naive',
                '--combat-seed', '1',
                '--combat-max-turns', '2',
                '--combat-enemy', 'test-ceiling',
                '--combat-enemy-node', 'bw-10',
                '--state-log', logPath,
            ]);
        } finally {
            delete registry['test-ceiling'];
        }

        const summary = routeEnd(logPath);
        expect(summary.classification).toBe('blocked');
        expect(summary.survived).toBe(false);
        expect(summary.blockedAtNodeId).toBe('bw-10');
        expect(summary.blockerReason).toBe('combat defeat');
        expect((summary.combatOutcomes as Record<string, string>)['bw-10']).toBe('defeat');
        // The capped bw-2 combat resolved to no outcome — it must be
        // recorded as neither a defeat nor a phantom victory.
        expect(summary.combatOutcomes as Record<string, string>).not.toHaveProperty('bw-2');
        expect(summary.visitedNodeIds).not.toContain('bw-14');
        expect(summary.unvisitedNodeIds).toContain('bw-14');
    });

    it('a lost CLI fight is a death: back on the node walked from, 1 VITAE, dying, the fight node unspent', async () => {
        const logPath = tmpPath('defeat-death');
        const registry = ENEMY_REGISTRY as Record<string, unknown>;
        registry['test-ceiling'] = scaleEnemyToLevel(DeathBeholder, 110);
        try {
            await runGameCli([
                '--start-map', 'breakwater', '--resolve-start', '--route', 'bw-19,bw-3,bw-4,bw-9,bw-20,bw-2,bw-10,bw-14',
                '--auto-combat',
                '--combat-policy', 'naive',
                '--combat-seed', '1',
                '--combat-max-turns', '2',
                '--combat-enemy', 'test-ceiling',
                '--combat-enemy-node', 'bw-10',
                '--state-log', logPath,
            ]);
        } finally {
            delete registry['test-ceiling'];
        }

        const end = readLog(logPath).find(r => r.action === 'route:end')!;
        const after = end.after as {
            dying?: boolean;
            player: { health: number };
            world: { currentMap: { currentNode: string; consumedNodes: string[]; completedNodes: string[]; pendingArrival?: string | null } };
        };
        const map = after.world.currentMap;
        expect(after.dying).toBe(true);
        expect(after.player.health).toBe(1);
        expect(map.currentNode).toBe('bw-2');
        expect(map.pendingArrival ?? null).toBeNull();
        expect(map.consumedNodes).not.toContain('bw-10');
        expect(map.completedNodes).not.toContain('bw-10');
        // The walker's evidence contract is unchanged: it still stops as blocked.
        expect((end.event as Record<string, unknown>).classification).toBe('blocked');
    });

    it('--resolve-start resolves bw-1\'s own arrival cutscene before walking the route; without it, the start node is explicitly unresolved', async () => {
        const withFlag = tmpPath('resolve-start-on');
        await runGameCli([
            '--start-map', 'breakwater', '--route', 'bw-4',
            '--resolve-start',
            '--auto-combat',
            '--combat-policy', 'status',
            '--combat-seed', '1',
            '--combat-max-turns', '12',
            '--state-log', withFlag,
        ]);
        const onSummary = routeEnd(withFlag);
        expect(onSummary.startNode).toMatchObject({ nodeId: 'bw-1', resolved: true });
        expect(onSummary.resolvedNodeIds).toContain('bw-1');

        // bw-1 is the Breakwater's arrival cutscene — the start node holds a
        // kind that is safe to fire the moment the map opens (events fire on
        // ARRIVAL, and the map places the player ON bw-1).
        const onLogs = readLog(withFlag);
        const bw1Event = onLogs
            .filter(r => r.action === 'resolveMapEvent')
            .map(r => r.event as { kind?: string; lines?: readonly string[] })
            .find(e => e.kind === 'cutscene');
        expect(bw1Event).toBeDefined();
        expect(bw1Event?.lines?.length ?? 0).toBeGreaterThan(0);

        const withoutFlag = tmpPath('resolve-start-off');
        await runGameCli([
            '--start-map', 'breakwater', '--route', 'bw-4',
            '--auto-combat',
            '--combat-policy', 'status',
            '--combat-seed', '1',
            '--combat-max-turns', '12',
            '--state-log', withoutFlag,
        ]);
        const offSummary = routeEnd(withoutFlag);
        expect(offSummary.startNode).toMatchObject({ nodeId: 'bw-1', resolved: false });
        expect(offSummary.resolvedNodeIds).not.toContain('bw-1');
    });

    it('reports the exact unvisited nodes for a partial legal route', async () => {
        const logPath = tmpPath('partial');

        // This test proves the visited/unvisited ACCOUNTING, not combat
        // strength: the open fan (bw-4, bw-9) holds no fight, and
        // `--combat-max-turns 4` would keep any balance-independent.
        await runGameCli([
            '--start-map', 'breakwater', '--route', 'bw-4,bw-9',
            '--auto-combat',
            '--combat-policy', 'status',
            '--combat-seed', '42',
            '--combat-max-turns', '4',
            '--state-log', logPath,
        ]);

        const summary = routeEnd(logPath);
        expect(summary.classification).toBe('survivorship');
        expect(summary.survived).toBe(true);
        expect(summary.visitedNodeIds).toEqual(['bw-1', 'bw-4', 'bw-9']);
        const unvisited = summary.unvisitedNodeIds as string[];
        expect(unvisited).toContain('bw-18');
        expect(unvisited.length).toBe(19); // 22 nodes − the 3 visited
    });
});

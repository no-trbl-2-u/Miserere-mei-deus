/**
 * SM1h A15: `card-vs-bot` and `run-summary` in the Workers runtime against a local D1, over fixture rows of all
 * three sources. Rows go in through the real POST routes; every count is worked out by hand in the comments.
 */

import { SELF } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

import type { DeckEventPost, FightPost, PlayLogEvent, PlayLogSourceKind, PlayRunEndPost, PlayRunPost } from '../src/contract';
import type { CardVsBotReport, RunSummaryReport } from '../src/reports';

const BASE = 'https://miserere-api.test';
const AUTH = { Authorization: 'Bearer test-token' };
const OLD = 'vsbot00';
const NEW = 'vsbot01';
const HUMAN_ONLY = 'vsbot02';

const stamp = (events: object[]): PlayLogEvent[] => events.map((e, i) => ({ ...e, ms: i, vitae: 30 }) as PlayLogEvent);
const played = (cardId: string) => ({ kind: 'card-played', cardId, useBottom: false, dieId: null });
const drawn = (...cards: string[]) => ({ kind: 'hand-drawn', cards });

function fight(over: Partial<FightPost>): FightPost {
    return {
        solver: 'T', sessionId: 's-1', buildCommit: NEW, appBuild: '1.4.0 preview', enemyId: 'gutter-wretch',
        playerLevel: 1, enemyHpMultiplier: 2, outcome: 'victory', turns: 1, vitaeStart: 30, vitaeEnd: 30, vitaeLow: 30,
        deck: [], events: [], source: 'human', ...over,
    };
}

function reward(over: Partial<DeckEventPost>): DeckEventPost {
    return {
        solver: 'T', sessionId: 's-1', buildCommit: NEW, appBuild: '1.4.0 preview', kind: 'reward', cardId: null,
        offered: null, deck: [], where: { nodeId: 'n-1', screen: 'combat-reward' }, source: 'human', ...over,
    };
}

function runOpen(runId: string, source: PlayLogSourceKind, over: Partial<PlayRunPost> = {}): PlayRunPost {
    return {
        solver: source === 'sim' ? 'bot' : 'T', sessionId: 's-1', buildCommit: 'runsum1', appBuild: '1.4.0 preview', runId,
        characterId: 'the-chosen', policyId: null, startDeck: ['strike'], source, ...over,
    };
}

const runEnd = (over: Partial<PlayRunEndPost>): PlayRunEndPost => ({
    outcome: 'run-over', endNodeId: 'bw-a', level: 1, vitaeEnd: 0, nodesResolved: 1, endDeck: ['strike'], ...over,
});

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

/** Opens a run and, when `end` is given, closes it. */
async function playRun(runId: string, source: PlayLogSourceKind, over: Partial<PlayRunPost>, end?: Partial<PlayRunEndPost>): Promise<void> {
    await post('/v1/play-runs', runOpen(runId, source, over));
    if (end) await post(`/v1/play-runs/${encodeURIComponent(runId)}/end`, runEnd(end));
}

beforeAll(async () => {
    // An older build with both sources; the newer one below wins the default.
    await post('/v1/fights', fight({ buildCommit: OLD, deck: ['old-card'], events: stamp([played('old-card')]) }));
    await post('/v1/fights', fight({ buildCommit: OLD, solver: 'defender', source: 'sim', deck: ['old-card'], events: stamp([played('old-card')]) }));

    // NEW build. Defender is named by its run's policy (the solver says otherwise); merciful only by its solver.
    await playRun('run-d', 'sim', { buildCommit: NEW, policyId: 'defender' });
    // Human: 2 fights. Fight 1: deck strike, guard; strike drawn, strike and guard played. Fight 2: deck strike; strike played.
    await post('/v1/fights', fight({ deck: ['strike', 'guard'], events: stamp([drawn('strike'), played('strike'), played('guard')]) }));
    await post('/v1/fights', fight({ deck: ['strike'], events: stamp([played('strike')]) }));
    // Defender: 1 fight, guard twice in the deck (one fight), played twice.
    await post('/v1/fights', fight({
        solver: 'ignored-by-policy', source: 'sim', runId: 'run-d', deck: ['guard', 'guard'], events: stamp([played('guard'), played('guard')]),
    }));
    // Merciful: 1 fight, strike drawn twice and played once.
    await post('/v1/fights', fight({ solver: 'merciful', source: 'sim', deck: ['strike'], events: stamp([drawn('strike', 'strike'), played('strike')]) }));
    // A harness fight is read by neither column.
    await post('/v1/fights', fight({ source: 'harness', solver: 'harness', deck: ['ghost'], events: stamp([played('ghost')]) }));

    await post('/v1/deck-events', reward({ cardId: 'ember', offered: ['spark', 'ember', 'guard'] }));
    await post('/v1/deck-events', reward({ cardId: null, offered: ['spark', 'ember'] }));
    await post('/v1/deck-events', reward({ source: 'sim', solver: 'bot', runId: 'run-d', cardId: 'guard', offered: ['guard', 'spark'] }));
    await post('/v1/deck-events', reward({ source: 'sim', solver: 'merciful', cardId: null, offered: ['ember'] }));
    await post('/v1/deck-events', reward({ source: 'harness', solver: 'harness', cardId: 'ghost', offered: ['ghost'] }));

    // The newest build by row, but T alone played it.
    await post('/v1/fights', fight({ buildCommit: HUMAN_ONLY, deck: ['solo'], events: stamp([played('solo')]) }));

    // Runs at build runsum1.
    await playRun('rs-h1', 'human', {}, { outcome: 'chapter-clear', endNodeId: 'bw-exit', level: 5, vitaeEnd: 20, nodesResolved: 30 });
    await playRun('rs-x1', 'harness', {}, { outcome: 'run-over', endNodeId: 'bw-x', level: 3, vitaeEnd: 0, nodesResolved: 6 });
    await playRun('rs-d1', 'sim', { policyId: 'defender' }, { outcome: 'run-over', endNodeId: 'bw-k2', level: 4, vitaeEnd: 0, nodesResolved: 10 });
    await playRun('rs-d2', 'sim', { policyId: 'defender' }, { outcome: 'chapter-clear', endNodeId: 'bw-exit', level: 8, vitaeEnd: 100, nodesResolved: 25 });
    await playRun('rs-d3', 'sim', { policyId: 'defender' });
    await playRun('rs-m1', 'sim', { policyId: 'merciful' }, { outcome: 'run-over', endNodeId: 'bw-a', level: 2, vitaeEnd: 0, nodesResolved: 3 });
    await playRun('rs-h2', 'human', { buildCommit: 'runsum2' });
});

const ZERO = { fightsInDeck: 0, drawn: 0, played: 0, offered: 0, picked: 0, skipped: 0 };
const NO_RATES = { inDeckPerFight: null, drawnPerFight: null, playedPerFight: null, pickedPerOffer: null, skippedPerOffer: null };

describe('card-vs-bot', () => {
    it('sets T\'s column beside each sim policy\'s at the newest build holding both, and names the build', async () => {
        const body = await report<CardVsBotReport>('/v1/reports/card-vs-bot');
        expect(body).toMatchObject({ report: 'card-vs-bot', build: NEW, buildDefaulted: true, sources: ['human', 'sim'] });
        expect(body.columns).toEqual([
            { column: 'human', source: 'human', fights: 2 },
            { column: 'defender', source: 'sim', fights: 1 },
            { column: 'merciful', source: 'sim', fights: 1 },
        ]);
        expect(body.cards.map(c => c.cardId)).toEqual(['strike', 'guard', 'ember', 'spark']);
    });

    it('counts per column and gives each rate per fight or per offer', async () => {
        const { cards } = await report<CardVsBotReport>(`/v1/reports/card-vs-bot?build=${NEW}`);
        const card = (id: string) => cards.find(c => c.cardId === id)!.columns;

        expect(card('strike')).toEqual({
            human: { ...ZERO, fightsInDeck: 2, drawn: 1, played: 2, inDeckPerFight: 1, drawnPerFight: 0.5, playedPerFight: 1, pickedPerOffer: null, skippedPerOffer: null },
            defender: { ...ZERO, ...NO_RATES, inDeckPerFight: 0, drawnPerFight: 0, playedPerFight: 0 },
            merciful: { ...ZERO, fightsInDeck: 1, drawn: 2, played: 1, inDeckPerFight: 1, drawnPerFight: 2, playedPerFight: 1, pickedPerOffer: null, skippedPerOffer: null },
        });
        // Offered once to T and skipped; the defender's policy came from its run, so its 2 copies are one fight.
        expect(card('guard').human).toMatchObject({ fightsInDeck: 1, played: 1, offered: 1, skipped: 1, picked: 0, skippedPerOffer: 1, pickedPerOffer: 0 });
        expect(card('guard').defender).toMatchObject({ fightsInDeck: 1, played: 2, offered: 1, picked: 1, playedPerFight: 2, pickedPerOffer: 1 });
        // Ember: T was offered it twice and took it once; the merciful bot was offered it and took nothing.
        expect(card('ember').human).toMatchObject({ offered: 2, picked: 1, skipped: 1, pickedPerOffer: 0.5, skippedPerOffer: 0.5 });
        expect(card('ember').merciful).toMatchObject({ offered: 1, picked: 0, skipped: 1, skippedPerOffer: 1 });
        expect(card('spark').defender).toMatchObject({ offered: 1, skipped: 1 });
    });

    it('never reads a harness row', async () => {
        const { cards } = await report<CardVsBotReport>(`/v1/reports/card-vs-bot?build=${NEW}`);
        expect(cards.map(c => c.cardId)).not.toContain('ghost');
    });

    it('?build= narrows to one build, and ?source= and ?card= do not apply', async () => {
        const old = await report<CardVsBotReport>(`/v1/reports/card-vs-bot?build=${OLD}&source=harness&card=strike`);
        expect(old).toMatchObject({ build: OLD, buildDefaulted: false });
        expect(old.columns).toEqual([{ column: 'human', source: 'human', fights: 1 }, { column: 'defender', source: 'sim', fights: 1 }]);
        expect(old.cards.map(c => c.cardId)).toEqual(['old-card']);
    });

    it('lists only T\'s column at a build no bot played, and no rows at a build nobody played', async () => {
        const solo = await report<CardVsBotReport>(`/v1/reports/card-vs-bot?build=${HUMAN_ONLY}`);
        expect(solo.columns).toEqual([{ column: 'human', source: 'human', fights: 1 }]);
        expect(solo.cards.map(c => c.cardId)).toEqual(['solo']);
        const none = await report<CardVsBotReport>('/v1/reports/card-vs-bot?build=nobuild');
        expect(none).toMatchObject({ build: 'nobuild', columns: [], cards: [] });
    });
});

describe('run-summary', () => {
    const base = { avgLevel: null, maxLevel: null, avgVitaeEnd: null, avgNodesResolved: null, maxNodesResolved: null, furthestNodeId: null };

    it('lists every source, and each sim policy, with no ?source=', async () => {
        const body = await report<RunSummaryReport>('/v1/reports/run-summary?build=runsum1');
        expect(body).toMatchObject({ report: 'run-summary', build: 'runsum1', source: 'all', runs: 6 });
        expect(body.summary).toEqual([
            { source: 'human', policyId: null, runs: 1, open: 0, runOver: 0, chapterClear: 1, reset: 0, avgLevel: 5, maxLevel: 5, avgVitaeEnd: 20, avgNodesResolved: 30, maxNodesResolved: 30, furthestNodeId: 'bw-exit' },
            { source: 'harness', policyId: null, runs: 1, open: 0, runOver: 1, chapterClear: 0, reset: 0, avgLevel: 3, maxLevel: 3, avgVitaeEnd: 0, avgNodesResolved: 6, maxNodesResolved: 6, furthestNodeId: 'bw-x' },
            // Two closed (levels 4 and 8, VITAE 0 and 100, nodes 10 and 25) and one still open.
            { source: 'sim', policyId: 'defender', runs: 3, open: 1, runOver: 1, chapterClear: 1, reset: 0, avgLevel: 6, maxLevel: 8, avgVitaeEnd: 50, avgNodesResolved: 17.5, maxNodesResolved: 25, furthestNodeId: 'bw-exit' },
            { source: 'sim', policyId: 'merciful', runs: 1, open: 0, runOver: 1, chapterClear: 0, reset: 0, avgLevel: 2, maxLevel: 2, avgVitaeEnd: 0, avgNodesResolved: 3, maxNodesResolved: 3, furthestNodeId: 'bw-a' },
        ]);
    });

    it('?source= narrows to one source', async () => {
        const sim = await report<RunSummaryReport>('/v1/reports/run-summary?build=runsum1&source=sim');
        expect(sim.source).toBe('sim');
        expect(sim.summary.map(r => [r.source, r.policyId])).toEqual([['sim', 'defender'], ['sim', 'merciful']]);
        const human = await report<RunSummaryReport>('/v1/reports/run-summary?build=runsum1&source=human');
        expect(human.summary.map(r => r.source)).toEqual(['human']);
        expect(human.runs).toBe(1);
    });

    it('?build= narrows to one build, and an open run has no end fields', async () => {
        const body = await report<RunSummaryReport>('/v1/reports/run-summary?build=runsum2');
        expect(body.summary).toEqual([{ source: 'human', policyId: null, runs: 1, open: 1, runOver: 0, chapterClear: 0, reset: 0, ...base }]);
    });

    it('is empty for a build with no run, and 400s on a bad source', async () => {
        const none = await report<RunSummaryReport>('/v1/reports/run-summary?build=nobuild');
        expect(none).toMatchObject({ runs: 0, summary: [] });
        const bad = await SELF.fetch(`${BASE}/v1/reports/run-summary?source=bot`, { headers: AUTH });
        expect(bad.status).toBe(400);
    });
});

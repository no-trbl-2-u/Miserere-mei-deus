/**
 * SM1a A2 and A3: every fight, deck event and puzzle attempt says who played
 * it. A post without a source is stored `human` (an older APK); a bad source
 * is a 400; migration 0006 relabels the rows stored before it; every list
 * takes `?source=`; and every report reads `human` unless told otherwise and
 * names the source it read.
 */

import { env, SELF } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

import { PLAY_LOG_SOURCES } from '../src/contract';
import type {
    DeckEventList,
    DeckEventPost,
    FightList,
    FightPost,
    PlayLogError,
    PlayLogSourceKind,
    PuzzleAttemptList,
    PuzzleAttemptPost,
} from '../src/contract';
import type { CardGapsReport, CardUsageReport, SignatureUsageReport } from '../src/reports';

const BASE = 'https://miserere-api.test';
const AUTH = { Authorization: 'Bearer test-token' };
const BUILD = 'src1234';

function fight(over: Partial<FightPost> = {}): FightPost {
    return {
        solver: 'T', sessionId: 's-1', buildCommit: BUILD, appBuild: '1.4.0 preview', enemyId: 'gutter-wretch',
        playerLevel: 1, enemyHpMultiplier: 2, outcome: 'victory', turns: 1, vitaeStart: 30, vitaeEnd: 30, vitaeLow: 30,
        deck: ['strike'], relics: ['relic-a'], signatures: ['sig-a'],
        events: [
            { kind: 'card-played', cardId: 'strike', useBottom: false, dieId: null, ms: 1, vitae: 30 },
            { kind: 'signature-cast', signatureId: 'sig-a', name: 'sig-a', cost: 4, ms: 2, vitae: 30 },
            { kind: 'combat-ended', outcome: 'victory', ms: 3, vitae: 30 },
        ] as never,
        ...over,
    };
}

function deckEvent(over: Partial<DeckEventPost> = {}): DeckEventPost {
    return {
        solver: 'T', sessionId: 's-1', buildCommit: BUILD, appBuild: '1.4.0 preview', kind: 'reward',
        cardId: 'strike', offered: ['strike', 'guard'], deck: ['strike'], where: { nodeId: 'n-1', screen: 'combat-reward' },
        ...over,
    };
}

function attempt(over: Partial<PuzzleAttemptPost> = {}): PuzzleAttemptPost {
    return {
        solver: 'T', layoutId: 'cand-easy-01', route: 'risk', intendedBand: 'easy', moves: [], endKind: 'confirm',
        endMs: 9100, cleared: true, appBuild: '1.4.0 preview', ...over,
    };
}

function post(path: string, body: unknown): Promise<Response> {
    return SELF.fetch(`${BASE}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...AUTH }, body: JSON.stringify(body),
    });
}

function get(path: string): Promise<Response> {
    return SELF.fetch(`${BASE}${path}`, { headers: AUTH });
}

async function stored(path: string, body: unknown): Promise<void> {
    expect((await post(path, body)).status).toBe(201);
}

const fights = async (query = '') => (await (await get(`/v1/fights${query}`)).json<FightList>()).fights;
const deckEvents = async (query = '') => (await (await get(`/v1/deck-events${query}`)).json<DeckEventList>()).deckEvents;
const attempts = async (query = '') => (await (await get(`/v1/puzzle-attempts${query}`)).json<PuzzleAttemptList>()).attempts;

describe('the source on a post', () => {
    it('stores each source and the run id, and an absent source as human with a null run id', async () => {
        for (const source of PLAY_LOG_SOURCES) {
            await stored('/v1/fights', fight({ source, runId: `run-${source}`, sessionId: `own-${source}` }));
            await stored('/v1/deck-events', deckEvent({ source, runId: `run-${source}`, sessionId: `own-${source}` }));
            await stored('/v1/puzzle-attempts', attempt({ source, runId: `run-${source}`, layoutId: `own-${source}` }));
        }
        await stored('/v1/fights', fight({ sessionId: 'own-old' }));
        await stored('/v1/deck-events', deckEvent({ sessionId: 'own-old' }));
        await stored('/v1/puzzle-attempts', attempt({ layoutId: 'own-old', runId: null }));

        const mine = (await fights()).filter(f => f.sessionId.startsWith('own-'));
        expect(mine.map(f => [f.sessionId, f.source, f.runId]).sort()).toEqual([
            ['own-harness', 'harness', 'run-harness'],
            ['own-human', 'human', 'run-human'],
            ['own-old', 'human', null],
            ['own-sim', 'sim', 'run-sim'],
        ]);
        const deck = (await deckEvents()).filter(d => d.sessionId.startsWith('own-'));
        expect(deck.map(d => [d.sessionId, d.source, d.runId]).sort()).toEqual([
            ['own-harness', 'harness', 'run-harness'],
            ['own-human', 'human', 'run-human'],
            ['own-old', 'human', null],
            ['own-sim', 'sim', 'run-sim'],
        ]);
        const puzzles = (await attempts()).filter(a => a.layoutId.startsWith('own-'));
        expect(puzzles.map(a => [a.layoutId, a.source, a.runId]).sort()).toEqual([
            ['own-harness', 'harness', 'run-harness'],
            ['own-human', 'human', 'run-human'],
            ['own-old', 'human', null],
            ['own-sim', 'sim', 'run-sim'],
        ]);
    });

    it('refuses an unknown source and an empty run id on every route, naming the field', async () => {
        const before = [(await fights()).length, (await deckEvents()).length, (await attempts()).length];
        for (const [path, body] of [
            ['/v1/fights', fight({ source: 'bot' as PlayLogSourceKind })],
            ['/v1/deck-events', deckEvent({ source: 'bot' as PlayLogSourceKind })],
            ['/v1/puzzle-attempts', attempt({ source: 'bot' as PlayLogSourceKind })],
        ] as const) {
            const response = await post(path, body);
            expect(response.status).toBe(400);
            expect((await response.json<PlayLogError>()).reasons).toEqual(['source: expected one of human, harness, sim']);
        }
        const emptyRun = await post('/v1/fights', fight({ runId: '' }));
        expect(emptyRun.status).toBe(400);
        expect((await emptyRun.json<PlayLogError>()).reasons).toEqual(['runId: must not be empty']);
        expect([(await fights()).length, (await deckEvents()).length, (await attempts()).length]).toEqual(before);
    });
});

describe('migration 0006', () => {
    it('relabels every stored fight and deck event harness and leaves puzzle attempts human', async () => {
        const migration = env.TEST_MIGRATIONS.find(m => m.name.startsWith('0006_'));
        expect(migration).toBeDefined();
        // The columns exist already (the suite applied every migration to an empty
        // database); re-run only the relabel, over rows stored with the default.
        const relabel = migration!.queries.filter(q => /^\s*UPDATE\b/i.test(q));
        expect(relabel).toHaveLength(2);

        await stored('/v1/fights', fight({ sessionId: 'mig-old', buildCommit: 'abc9999' }));
        await stored('/v1/fights', fight({ sessionId: 'mig-null', buildCommit: null }));
        await stored('/v1/deck-events', deckEvent({ sessionId: 'mig-old', buildCommit: 'abc9999' }));
        await stored('/v1/deck-events', deckEvent({ sessionId: 'mig-null', buildCommit: null }));
        await stored('/v1/puzzle-attempts', attempt({ layoutId: 'mig-old' }));
        expect((await fights('?source=human')).length).toBeGreaterThanOrEqual(2);

        await env.DB.batch(relabel.map(q => env.DB.prepare(q)));

        expect(await fights('?source=human')).toEqual([]);
        expect((await fights()).find(f => f.sessionId === 'mig-old')?.source).toBe('harness');
        expect((await fights()).find(f => f.sessionId === 'mig-null')?.source).toBe('harness');
        expect(await deckEvents('?source=human')).toEqual([]);
        expect((await deckEvents()).find(d => d.sessionId === 'mig-old')?.source).toBe('harness');
        expect((await attempts('?source=human')).find(a => a.layoutId === 'mig-old')?.source).toBe('human');
    });
});

describe('?source= on the list routes', () => {
    it('narrows each list to one source, reads every source for all or none, and 400s on an unknown one', async () => {
        const lists = [fights, deckEvents, attempts] as const;
        for (const list of lists) {
            const every = await list();
            expect((await list('?source=all')).length).toBe(every.length);
            for (const source of PLAY_LOG_SOURCES) {
                const some = await list(`?source=${source}`);
                expect(some.every(row => row.source === source)).toBe(true);
            }
            const total = PLAY_LOG_SOURCES.reduce(async (sum, source) => (await sum) + (await list(`?source=${source}`)).length, Promise.resolve(0));
            expect(await total).toBe(every.length);
        }
        for (const path of ['/v1/fights', '/v1/deck-events', '/v1/puzzle-attempts']) {
            const bad = await get(`${path}?source=bot`);
            expect(bad.status).toBe(400);
            expect(await bad.json<PlayLogError>()).toEqual({
                error: 'invalid query',
                reasons: ['source: expected one of human, harness, sim, all, got "bot"'],
            });
        }
    });

    it('combines with the route\'s own filter', async () => {
        await stored('/v1/fights', fight({ source: 'sim', enemyId: 'only-sim-foe', sessionId: 'combo' }));
        await stored('/v1/fights', fight({ source: 'human', enemyId: 'only-sim-foe', sessionId: 'combo-h' }));
        expect((await fights('?enemy=only-sim-foe&source=sim')).map(f => f.sessionId)).toEqual(['combo']);
        expect((await fights('?enemy=only-sim-foe')).map(f => f.sessionId).sort()).toEqual(['combo', 'combo-h']);
    });
});

describe('?source= on the reports', () => {
    // Under its own build: two human fights, one harness fight, three sim fights, and a deck event of each.
    const REPORT_BUILD = 'rpt0001';

    beforeAll(async () => {
        for (const [source, count] of [['human', 2], ['harness', 1], ['sim', 3]] as const) {
            for (let i = 0; i < count; i++) {
                await stored('/v1/fights', fight({ source, buildCommit: REPORT_BUILD, deck: [`${source}-card`] }));
            }
            await stored('/v1/deck-events', deckEvent({
                source, buildCommit: REPORT_BUILD, cardId: `${source}-card`, offered: [`${source}-card`, 'skipped-card'],
            }));
        }
    });

    it('reads human when ?source= is absent, each source when named, every source for all', async () => {
        const read = async (query: string) => {
            const body = await (await get(`/v1/reports/card-usage?build=${REPORT_BUILD}${query}`)).json<CardUsageReport>();
            return { source: body.source, fights: body.fights, cards: body.cards.map(c => c.cardId).sort() };
        };
        expect(await read('')).toEqual({ source: 'human', fights: 2, cards: ['human-card', 'skipped-card', 'strike'] });
        expect(await read('&source=human')).toEqual({ source: 'human', fights: 2, cards: ['human-card', 'skipped-card', 'strike'] });
        expect(await read('&source=harness')).toEqual({ source: 'harness', fights: 1, cards: ['harness-card', 'skipped-card', 'strike'] });
        expect(await read('&source=sim')).toEqual({ source: 'sim', fights: 3, cards: ['sim-card', 'skipped-card', 'strike'] });
        expect(await read('&source=all')).toEqual({
            source: 'all', fights: 6, cards: ['harness-card', 'human-card', 'sim-card', 'skipped-card', 'strike'],
        });
    });

    it('applies the same filter to card-gaps and signature-usage and names the source in each body', async () => {
        const gaps = await (await get(`/v1/reports/card-gaps?build=${REPORT_BUILD}&source=sim`)).json<CardGapsReport>();
        expect(gaps).toMatchObject({ report: 'card-gaps', source: 'sim', fights: 3 });
        const gapsDefault = await (await get(`/v1/reports/card-gaps?build=${REPORT_BUILD}`)).json<CardGapsReport>();
        expect(gapsDefault).toMatchObject({ source: 'human', fights: 2 });

        const sigs = await (await get(`/v1/reports/signature-usage?build=${REPORT_BUILD}&source=sim`)).json<SignatureUsageReport>();
        expect(sigs).toMatchObject({ report: 'signature-usage', source: 'sim', fights: 3 });
        expect(sigs.signatures).toEqual([{ signatureId: 'sig-a', fightsWorn: 3, fightsCast: 3, casts: 3, castsPerFight: 1, refused: 0 }]);
        const sigsAll = await (await get(`/v1/reports/signature-usage?build=${REPORT_BUILD}&source=all`)).json<SignatureUsageReport>();
        expect(sigsAll.signatures[0]).toMatchObject({ fightsWorn: 6, casts: 6 });
        const sigsHuman = await (await get(`/v1/reports/signature-usage?build=${REPORT_BUILD}`)).json<SignatureUsageReport>();
        expect(sigsHuman.signatures[0]).toMatchObject({ fightsWorn: 2, casts: 2 });
    });

    it('answers an unknown source with a 400 on every report', async () => {
        for (const name of ['card-usage', 'card-gaps', 'signature-usage']) {
            const bad = await get(`/v1/reports/${name}?source=bot`);
            expect(bad.status).toBe(400);
            expect(await bad.json<PlayLogError>()).toEqual({
                error: 'invalid query',
                reasons: ['source: expected one of human, harness, sim, all, got "bot"'],
            });
        }
    });
});

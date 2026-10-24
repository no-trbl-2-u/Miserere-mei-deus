/**
 * BE2 A9: the two fixed reports in the Workers runtime against a local D1.
 * Fixture rows go in through the real POST routes under one build, a stray
 * row under another build shows `?build=` narrowing, and every count below is
 * worked out by hand from the fixture in the comments.
 */

import { SELF } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

import type { DeckEventPost, FightPost, PlayLogEvent } from '../src/contract';
import type { CardGapsReport, CardUsageReport } from '../src/reports';

const BASE = 'https://miserere-api.test';
const AUTH = { Authorization: 'Bearer test-token' };
const BUILD = 'rep1234';
const OTHER = 'other99';

const die = (id: string, color: string, state = 'available', face = 'mana') => ({ id, color, state, face, temporary: false });

// Turn 1: STRIKE paid (die-0 spent, one effect fizzles), GUARD free, die-1
// banked, die-2 a miss, die-3 left. Gnaw fires: turn end 1. SPARK and a
// second STRIKE drawn; turn 2: that STRIKE played free, die-0 and die-1 left;
// the phase is hindered: turn end 2. A Bleed tick, turn 3 rolls (never ends),
// Maul fires and the fight is lost.
const LONG_FIGHT: Omit<PlayLogEvent, 'ms' | 'vitae'>[] = [
    { kind: 'turn-dice-rolled', turn: 1, dice: [die('die-0', 'heart'), die('die-1', 'body'), die('die-2', 'mind', 'locked', 'miss'), die('die-3', 'wild', 'available', 'special')] },
    { kind: 'card-played', cardId: 'strike', useBottom: true, dieId: 'die-0' },
    { kind: 'die-spent', dieId: 'die-0', color: 'heart' },
    { kind: 'effect-fizzled', cardId: 'strike', effectId: 'e1', message: 'no target' },
    { kind: 'card-played', cardId: 'guard', useBottom: false, dieId: null },
    { kind: 'die-banked', dieId: 'die-1', color: 'body', pips: 0 },
    { kind: 'threat-fired', phaseIndex: 0, description: 'Gnaw', effects: [] },
    { kind: 'phase-resolved', phaseIndex: 0, mark: 'overwhelmed' },
    { kind: 'hand-drawn', cards: ['spark', 'strike'] },
    { kind: 'turn-dice-rolled', turn: 2, dice: [die('die-0', 'heart'), die('die-1', 'body')] },
    { kind: 'card-played', cardId: 'strike', useBottom: false, dieId: null },
    { kind: 'phase-resolved', phaseIndex: 1, mark: 'clear' },
    { kind: 'hand-drawn', cards: [] },
    { kind: 'dot-tick', effectId: 'bleed', label: 'Bleed', amount: 2, target: 'self' },
    { kind: 'turn-dice-rolled', turn: 3, dice: [die('die-0', 'heart')] },
    { kind: 'threat-fired', phaseIndex: 2, description: 'Maul', effects: [] },
    { kind: 'combat-ended', outcome: 'defeat' },
] as never;

function fight(over: Partial<FightPost>): FightPost {
    return {
        solver: 'T', sessionId: 's-1', buildCommit: BUILD, appBuild: '1.4.0 preview', enemyId: 'gutter-wretch',
        playerLevel: 1, enemyHpMultiplier: 2, outcome: 'defeat', turns: 3, vitaeStart: 30, vitaeEnd: 0, vitaeLow: 0,
        deck: [], events: [], ...over,
    };
}

function deckEvent(over: Partial<DeckEventPost>): DeckEventPost {
    return {
        solver: 'T', sessionId: 's-1', buildCommit: BUILD, appBuild: '1.4.0 preview', kind: 'reward',
        cardId: null, offered: null, deck: [], where: { nodeId: 'n-1', screen: 'combat-reward' }, ...over,
    };
}

const stamp = (events: Omit<PlayLogEvent, 'ms' | 'vitae'>[]): PlayLogEvent[] =>
    events.map((e, i) => ({ ...e, ms: i * 1000, vitae: 30 }) as PlayLogEvent);

async function post(path: string, body: unknown): Promise<void> {
    const res = await SELF.fetch(`${BASE}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...AUTH }, body: JSON.stringify(body),
    });
    expect(res.status).toBe(201);
}

function get(path: string, headers: Record<string, string> = AUTH): Promise<Response> {
    return SELF.fetch(`${BASE}${path}`, { headers });
}

async function report<T>(path: string): Promise<T> {
    const res = await get(path);
    expect(res.status).toBe(200);
    return res.json<T>();
}

beforeAll(async () => {
    // STRIKE twice in the deck: a fight counts once per card.
    await post('/v1/fights', fight({ deck: ['strike', 'guard', 'strike', 'spark'], events: stamp(LONG_FIGHT) }));
    await post('/v1/fights', fight({
        deck: ['strike'], turns: 1,
        events: stamp([
            { kind: 'dot-tick', effectId: 'poison', label: 'Poison', amount: 3, target: 'self' },
            { kind: 'combat-ended', outcome: 'defeat' },
        ] as never),
    }));
    await post('/v1/fights', fight({ buildCommit: OTHER, deck: ['other-card'], outcome: 'victory' }));

    await post('/v1/deck-events', deckEvent({ cardId: 'ember', offered: ['spark', 'ember', 'guard'] }));
    await post('/v1/deck-events', deckEvent({ cardId: null, offered: ['spark', 'ember'] }));
    await post('/v1/deck-events', deckEvent({ kind: 'remove', cardId: 'guard' }));
    await post('/v1/deck-events', deckEvent({ kind: 'cache-reward', cardId: 'ash', offered: ['ash'] }));
    await post('/v1/deck-events', deckEvent({ buildCommit: OTHER, kind: 'remove', cardId: 'strike' }));
});

describe('the reports route', () => {
    it('needs the token', async () => {
        expect((await get('/v1/reports/card-usage', {})).status).toBe(401);
        expect((await get('/v1/reports/card-gaps', { Authorization: 'Bearer nope' })).status).toBe(401);
    });

    it('serves only the two named reports, and only to GET', async () => {
        const unknown = await get('/v1/reports/everything');
        expect(unknown.status).toBe(404);
        const posted = await SELF.fetch(`${BASE}/v1/reports/card-usage`, { method: 'POST', headers: AUTH, body: '{}' });
        expect(posted.status).toBe(405);
    });
});

describe('card-usage', () => {
    it('counts each card across the build\'s fights and deck events', async () => {
        const body = await report<CardUsageReport>(`/v1/reports/card-usage?build=${BUILD}`);
        expect(body).toMatchObject({ report: 'card-usage', build: BUILD, card: null, fights: 2 });
        const zero = { drawn: 0, played: 0, free: 0, paid: 0, held: 0, fizzled: 0, offered: 0, picked: 0, skipped: 0, removed: 0 };
        expect(body.cards).toEqual([
            // Played from the opening hand, then drawn and played the turn it came: never held.
            { ...zero, cardId: 'strike', fightsInDeck: 2, drawn: 1, played: 2, free: 1, paid: 1, fizzled: 1 },
            { ...zero, cardId: 'guard', fightsInDeck: 1, played: 1, free: 1, offered: 1, skipped: 1, removed: 1 },
            // Drawn after turn end 1, never played: sat through turn end 2.
            { ...zero, cardId: 'spark', fightsInDeck: 1, drawn: 1, held: 1, offered: 2, skipped: 2 },
            { ...zero, cardId: 'ash', fightsInDeck: 0, offered: 1, picked: 1 },
            { ...zero, cardId: 'ember', fightsInDeck: 0, offered: 2, picked: 1, skipped: 1 },
        ]);
    });

    it('narrows to one card with ?card=', async () => {
        const body = await report<CardUsageReport>(`/v1/reports/card-usage?build=${BUILD}&card=spark`);
        expect(body.card).toBe('spark');
        expect(body.cards.map(c => c.cardId)).toEqual(['spark']);
    });

    it('reads every build without ?build=', async () => {
        const body = await report<CardUsageReport>('/v1/reports/card-usage');
        expect(body.build).toBeNull();
        expect(body.fights).toBeGreaterThanOrEqual(3);
        const strike = body.cards.find(c => c.cardId === 'strike');
        expect(strike?.removed).toBeGreaterThanOrEqual(1);
        expect(body.cards.some(c => c.cardId === 'other-card')).toBe(true);
    });
});

describe('card-gaps', () => {
    it('names overwhelming threats, unspent live dice by colour and what ended each lost fight', async () => {
        const body = await report<CardGapsReport>(`/v1/reports/card-gaps?build=${BUILD}`);
        expect(body).toMatchObject({ report: 'card-gaps', build: BUILD, fights: 2 });
        expect(body.threats).toEqual([{ enemyId: 'gutter-wretch', threat: 'Gnaw', overwhelmed: 1, fights: 1 }]);
        // Turns 1 and 2 ended; turn 3 did not and the miss is not a live die.
        expect(body.unspentDice).toEqual([
            { enemyId: 'gutter-wretch', color: 'body', rolled: 2, unspent: 1 },
            { enemyId: 'gutter-wretch', color: 'heart', rolled: 2, unspent: 1 },
            { enemyId: 'gutter-wretch', color: 'wild', rolled: 1, unspent: 1 },
        ]);
        expect(body.defeats).toEqual([
            { enemyId: 'gutter-wretch', cause: 'DoT: Poison', fights: 1 },
            { enemyId: 'gutter-wretch', cause: 'Maul', fights: 1 },
        ]);
    });

    it('is empty for a build with no lost fight', async () => {
        const body = await report<CardGapsReport>(`/v1/reports/card-gaps?build=${OTHER}`);
        expect(body).toMatchObject({ fights: 1, threats: [], unspentDice: [], defeats: [] });
    });
});

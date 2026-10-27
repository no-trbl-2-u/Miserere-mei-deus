/**
 * Play-log API contract (BE2 A1): the validators the preview app and the
 * Worker share accept a well-formed fight and deck change and name what is
 * wrong with anything else, and `COMBAT_EVENT_KINDS` is every kind the engine
 * emits, so a real fight is never refused for a kind the list forgot.
 */

import { describe, expect, it } from 'vitest';

import type { CombatEvent } from '../combat.encounter.types';
import {
    COMBAT_EVENT_KINDS,
    PLAY_LOG_LIMITS,
    validateDeckEventPost,
    validateFightPost,
    type CombatEventKind,
    type DeckEventPost,
    type FightPost,
} from '../combat.play-log-contract';
import * as barrel from '../../index';

// Type-level: a kind added to `CombatEvent` and missing from the list makes
// `MissingKinds` that kind, and this line stops compiling under
// `type-check:tests`. The list's own `satisfies` clause covers the other way.
type MissingKinds = Exclude<CombatEvent['kind'], CombatEventKind>;
const noKindMissing: [MissingKinds] extends [never] ? true : MissingKinds = true;

function fight(over: Partial<Record<keyof FightPost, unknown>> = {}): Record<string, unknown> {
    return {
        solver: 'T',
        sessionId: 's-1',
        buildCommit: 'abc1234',
        appBuild: '1.4.0 preview',
        enemyId: 'gutter-wretch',
        playerLevel: 1,
        enemyHpMultiplier: 2,
        outcome: 'victory',
        turns: 4,
        vitaeStart: 30,
        vitaeEnd: 22,
        vitaeLow: 18,
        deck: ['card-1', 'card-h+'],
        events: [
            { kind: 'hand-drawn', cards: ['card-1'], ms: 0, vitae: 30 },
            { kind: 'ui-staged', cardId: 'card-1', ms: 1500, vitae: 30 },
            { kind: 'card-played', cardId: 'card-1', useBottom: true, dieId: 'd1', ms: 2100, vitae: 30 },
            { kind: 'combat-ended', outcome: 'victory', ms: 60000, vitae: 22 },
        ],
        ...over,
    };
}

function deckEvent(over: Partial<Record<keyof DeckEventPost, unknown>> = {}): Record<string, unknown> {
    return {
        solver: 'T',
        sessionId: 's-1',
        buildCommit: null,
        appBuild: '1.4.0 preview',
        kind: 'reward',
        cardId: 'card-2',
        offered: ['card-2', 'card-3', 'card-4'],
        deck: ['card-1', 'card-2'],
        where: { nodeId: 'n-3', screen: 'combat-reward' },
        ...over,
    };
}

function fightReasons(body: unknown): string[] {
    const result = validateFightPost(body);
    return result.ok ? [] : result.reasons;
}

function deckReasons(body: unknown): string[] {
    const result = validateDeckEventPost(body);
    return result.ok ? [] : result.reasons;
}

describe('COMBAT_EVENT_KINDS', () => {
    it('is every engine kind, once', () => {
        expect(noKindMissing).toBe(true);
        expect(new Set(COMBAT_EVENT_KINDS).size).toBe(COMBAT_EVENT_KINDS.length);
    });

    it('is exported through the barrel with both validators', () => {
        expect(barrel.COMBAT_EVENT_KINDS).toBe(COMBAT_EVENT_KINDS);
        expect(barrel.validateFightPost).toBe(validateFightPost);
        expect(barrel.validateDeckEventPost).toBe(validateDeckEventPost);
        expect(barrel.PLAY_LOG_FIGHTS_PATH).toBe('/v1/fights');
        expect(barrel.PLAY_LOG_DECK_EVENTS_PATH).toBe('/v1/deck-events');
    });
});

describe('validateFightPost', () => {
    it('accepts an ended fight and returns it unchanged', () => {
        const result = validateFightPost(fight());
        expect(result.ok).toBe(true);
        // A post with no relics or signatures (a build from before LR1g) reads as empty lists.
        if (result.ok) expect(result.fight).toEqual({ ...fight(), relics: [], signatures: [] });
    });

    it('accepts a null build commit and an empty event stream', () => {
        expect(fightReasons(fight({ buildCommit: null, events: [] }))).toEqual([]);
    });

    it('drops unknown top-level keys and screen-event extras, keeps engine payloads whole', () => {
        const result = validateFightPost({
            ...fight({
                events: [
                    { kind: 'ui-detail-opened', cardId: 'card-1', ms: 5, vitae: 30, extra: 1 },
                    { kind: 'effect-fizzled', cardId: 'card-1', effectId: 'e', message: 'no target', ms: 9, vitae: 30 },
                ],
            }),
            deviceId: 'abc',
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.fight).not.toHaveProperty('deviceId');
            expect(result.fight.events).toEqual([
                { kind: 'ui-detail-opened', cardId: 'card-1', ms: 5, vitae: 30 },
                { kind: 'effect-fizzled', cardId: 'card-1', effectId: 'e', message: 'no target', ms: 9, vitae: 30 },
            ]);
        }
    });

    it('names each missing field', () => {
        const { enemyId: _e, sessionId: _s, deck: _d, ...rest } = fight();
        expect(fightReasons(rest)).toEqual([
            'sessionId: expected a string',
            'enemyId: expected a string',
            'deck: expected an array',
        ]);
    });

    it('names each wrong type', () => {
        expect(fightReasons(fight({
            playerLevel: 0, enemyHpMultiplier: 0, outcome: 'fled', turns: 1.5, vitaeLow: '18',
        }))).toEqual([
            'playerLevel: expected a whole number of at least 1',
            'enemyHpMultiplier: expected a number above 0',
            'outcome: expected one of victory, mercy, defeat, retreat',
            'turns: expected a whole number of at least 0',
            'vitaeLow: expected a number',
        ]);
        expect(fightReasons([])).toEqual(['body: expected a JSON object']);
    });

    it('refuses an unknown event kind and a bad stamp', () => {
        expect(fightReasons(fight({
            events: [
                { kind: 'card-burned', ms: 0, vitae: 30 },
                { kind: 'ui-staged', ms: -1, vitae: null },
            ],
        }))).toEqual([
            'events[0].kind: unknown event kind "card-burned"',
            'events[1].cardId: expected a string',
            'events[1].ms: expected whole milliseconds of at least 0',
            'events[1].vitae: expected a number',
        ]);
    });

    it('LR1g: relics and signatures are optional, kept when sent and defaulted to empty', () => {
        const old = validateFightPost(fight());
        expect(old.ok && old.fight.relics).toEqual([]);
        expect(old.ok && old.fight.signatures).toEqual([]);
        const worn = validateFightPost(fight({ relics: ['relic-bleeding-signet'], signatures: ['sig-crimson-covenant'] }));
        expect(worn.ok && worn.fight.relics).toEqual(['relic-bleeding-signet']);
        expect(worn.ok && worn.fight.signatures).toEqual(['sig-crimson-covenant']);
        expect(fightReasons(fight({ relics: 'x', signatures: [1] }))).toEqual([
            'relics: expected an array',
            'signatures[0]: expected a string',
        ]);
        expect(fightReasons(fight({ relics: Array.from({ length: PLAY_LOG_LIMITS.worn + 1 }, () => 'r') }))).toEqual([
            `relics: more than ${PLAY_LOG_LIMITS.worn} entries`,
        ]);
    });

    it('LR1g: a refused signature tap needs a signature id and a reason, and keeps only its own keys', () => {
        const tap = { kind: 'ui-signature-refused', signatureId: 'sig-crimson-covenant', reason: 'Need 4 Conviction', ms: 5, vitae: 30 };
        expect(fightReasons(fight({ events: [tap] }))).toEqual([]);
        const kept = validateFightPost(fight({ events: [{ ...tap, extra: 1 }] }));
        expect(kept.ok && kept.fight.events).toEqual([tap]);
        expect(fightReasons(fight({ events: [{ kind: 'ui-signature-refused', ms: 5, vitae: 30 }] }))).toEqual([
            'events[0].signatureId: expected a string',
            'events[0].reason: expected a string',
        ]);
    });

    it('refuses more events than the cap', () => {
        const events = Array.from({ length: PLAY_LOG_LIMITS.events + 1 }, (_, ms) => ({ kind: 'die-spent', ms, vitae: 1 }));
        expect(fightReasons(fight({ events }))).toEqual([`events: more than ${PLAY_LOG_LIMITS.events} entries`]);
    });
});

describe('validateDeckEventPost', () => {
    it('accepts each kind in its own shape', () => {
        expect(deckReasons(deckEvent())).toEqual([]);
        expect(deckReasons(deckEvent({ cardId: null }))).toEqual([]);
        expect(deckReasons(deckEvent({ kind: 'cache-reward', where: { nodeId: null, screen: 'cache' } }))).toEqual([]);
        expect(deckReasons(deckEvent({ kind: 'remove', offered: null }))).toEqual([]);
        expect(deckReasons(deckEvent({ kind: 'run-end', cardId: null, offered: null }))).toEqual([]);
    });

    it('returns only the contract keys', () => {
        const result = validateDeckEventPost({ ...deckEvent({ where: { nodeId: 'n', screen: 's', x: 1 } }), y: 2 });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.deckEvent).not.toHaveProperty('y');
            expect(result.deckEvent.where).toEqual({ nodeId: 'n', screen: 's' });
        }
    });

    it('names a card that was not offered, an empty offer and a reserved kind', () => {
        expect(deckReasons(deckEvent({ cardId: 'card-9' }))).toEqual(['cardId: expected one of the offered cards']);
        expect(deckReasons(deckEvent({ cardId: null, offered: [] }))).toEqual(['offered: expected at least one card']);
        expect(deckReasons(deckEvent({ kind: 'upgrade' }))).toEqual([
            'kind: expected one of reward, cache-reward, remove, run-end',
        ]);
    });

    it('holds a removal and a run end to their shapes', () => {
        expect(deckReasons(deckEvent({ kind: 'remove', cardId: null, offered: null }))).toEqual([
            'cardId: expected a string',
        ]);
        expect(deckReasons(deckEvent({ kind: 'run-end' }))).toEqual([
            'cardId: expected null for run-end',
            'offered: expected null for run-end',
        ]);
    });

    it('names a missing where and a wrong-typed deck', () => {
        const { where: _w, ...rest } = deckEvent({ deck: 'card-1' });
        expect(deckReasons(rest)).toEqual(['deck: expected an array', 'where: expected an object']);
    });
});

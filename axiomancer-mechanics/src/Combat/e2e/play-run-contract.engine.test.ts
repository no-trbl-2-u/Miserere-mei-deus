/**
 * SM1c A6 and A7: the whole-run play-log contract. A run opens and closes in
 * the shapes the app, the driver and the Worker share, and every run event
 * kind has a payload and a checker, so a kind added without either fails here
 * rather than at the first post.
 */

import { describe, expect, it } from 'vitest';

import { PLAY_LOG_LIMITS, PLAY_LOG_SOURCES } from '../combat.play-log-contract';
import {
    PLAY_RUN_OUTCOMES,
    PLAY_RUNS_PATH,
    RUN_EVENTS_PATH,
    RUN_EVENT_KINDS,
    playRunEndPath,
    validatePlayRunEndPost,
    validatePlayRunPost,
    validateRunEventsPost,
    type RunEventKind,
    type RunEventPayloads,
} from '../combat.play-run-contract';
import * as barrel from '../../index';

// Type-level: a payload type added to `RunEventPayloads` with no kind in the list makes
// `MissingKinds` that kind, and this line stops compiling under `type-check:tests`.
type MissingKinds = Exclude<keyof RunEventPayloads, RunEventKind>;
const noKindMissing: [MissingKinds] extends [never] ? true : MissingKinds = true;

function open(over: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        solver: 'T', sessionId: 's-1', buildCommit: 'abc1234', appBuild: '1.4.0 preview', runId: 'run-1',
        characterId: 'the-chosen', policyId: null, startDeck: ['card-1', 'card-2'],
        ...over,
    };
}

function end(over: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        outcome: 'run-over', endNodeId: 'n-9', level: 4, vitaeEnd: 0, nodesResolved: 11, endDeck: ['card-1', 'card-2+'],
        ...over,
    };
}

/** One valid payload per kind. */
const PAYLOADS: { [K in RunEventKind]: RunEventPayloads[K] } = {
    'node-entered': { map: 'breakwater', nodeId: 'n-1', nodeKind: 'encounter' },
    'node-resolved': { nodeId: 'n-1', nodeKind: 'rest', choice: 'upgrade' },
    'hazard-ended': { hazardId: 'tide-pool', cleared: true, vitaeBefore: 20, vitaeAfter: 17 },
    'xp-gained': { amount: 30, from: 'fight' },
    'level-up': { level: 2, stat: 'might' },
    'item-gained': { itemId: 'relic-a', slot: 'relic', from: 'cache' },
};

function event(kind: RunEventKind, seq: number, over: Record<string, unknown> = {}): Record<string, unknown> {
    return { seq, kind, payload: { ...PAYLOADS[kind] }, ...over };
}

function batch(over: Record<string, unknown> = {}): Record<string, unknown> {
    return { runId: 'run-1', events: RUN_EVENT_KINDS.map((kind, seq) => event(kind, seq)), ...over };
}

const openReasons = (body: unknown): string[] => {
    const result = validatePlayRunPost(body);
    return result.ok ? [] : result.reasons;
};
const endReasons = (body: unknown): string[] => {
    const result = validatePlayRunEndPost(body);
    return result.ok ? [] : result.reasons;
};
const batchReasons = (body: unknown): string[] => {
    const result = validateRunEventsPost(body);
    return result.ok ? [] : result.reasons;
};

describe('the run routes and kinds', () => {
    it('names the routes, the outcomes and six event kinds, through the barrel', () => {
        expect(noKindMissing).toBe(true);
        expect(PLAY_RUNS_PATH).toBe('/v1/play-runs');
        expect(RUN_EVENTS_PATH).toBe('/v1/run-events');
        expect(playRunEndPath('run 1/x')).toBe('/v1/play-runs/run%201%2Fx/end');
        expect(PLAY_RUN_OUTCOMES).toEqual(['run-over', 'chapter-clear', 'reset']);
        expect(RUN_EVENT_KINDS).toEqual(['node-entered', 'node-resolved', 'hazard-ended', 'xp-gained', 'level-up', 'item-gained']);
        expect(new Set(RUN_EVENT_KINDS).size).toBe(RUN_EVENT_KINDS.length);
        expect(barrel.RUN_EVENT_KINDS).toBe(RUN_EVENT_KINDS);
        expect(barrel.PLAY_RUNS_PATH).toBe(PLAY_RUNS_PATH);
        expect(barrel.validatePlayRunPost).toBe(validatePlayRunPost);
        expect(barrel.validatePlayRunEndPost).toBe(validatePlayRunEndPost);
        expect(barrel.validateRunEventsPost).toBe(validateRunEventsPost);
    });

    it('caps a batch at 200 events and 256 KiB and a run body at 64 KiB', () => {
        expect(PLAY_LOG_LIMITS.runEvents).toBe(200);
        expect(PLAY_LOG_LIMITS.runEventBytes).toBe(256 * 1024);
        expect(PLAY_LOG_LIMITS.playRunBytes).toBe(64 * 1024);
    });
});

describe('every validator success carries no reasons, and the shared source fields are checked', () => {
    it('returns an empty reasons list on success', () => {
        expect(validatePlayRunPost(open()).reasons).toEqual([]);
        expect(validatePlayRunEndPost(end()).reasons).toEqual([]);
        expect(validateRunEventsPost(batch()).reasons).toEqual([]);
    });

    it('names a missing solver, session or build on an opening', () => {
        const { solver: _s, sessionId: _i, appBuild: _a, ...rest } = open();
        expect(openReasons(rest)).toEqual([
            'solver: expected a string', 'sessionId: expected a string', 'appBuild: expected a string',
        ]);
    });

    it('refuses an empty string in every text field of every kind, naming it', () => {
        for (const kind of RUN_EVENT_KINDS) {
            const fields = Object.entries(PAYLOADS[kind]).filter(([, v]) => typeof v === 'string').map(([k]) => k);
            expect(fields.length).toBeGreaterThan(0);
            for (const field of fields) {
                const payload = { ...PAYLOADS[kind], [field]: '' };
                expect(batchReasons(batch({ events: [{ seq: 0, kind, payload }] }))).toEqual([
                    `events[0].payload.${field}: must not be empty`,
                ]);
            }
        }
    });

    it('wants a boolean cleared on a hazard and refuses a non-number VITAE', () => {
        for (const cleared of [1, 'true', null]) {
            expect(batchReasons(batch({ events: [{ seq: 0, kind: 'hazard-ended', payload: { ...PAYLOADS['hazard-ended'], cleared } }] })))
                .toEqual(['events[0].payload.cleared: expected true or false']);
        }
        expect(batchReasons(batch({ events: [{ seq: 0, kind: 'hazard-ended', payload: { ...PAYLOADS['hazard-ended'], cleared: false, vitaeAfter: -4 } }] })))
            .toEqual([]);
    });
});

describe('validatePlayRunPost', () => {
    it('accepts an opening and returns it unchanged, with no source key when the body left it out', () => {
        const result = validatePlayRunPost(open());
        expect(result.ok && result.playRun).toEqual(open());
        expect(result.ok && result.playRun).not.toHaveProperty('source');
    });

    it('accepts each source, a policy id, and a run with no character', () => {
        for (const source of PLAY_LOG_SOURCES) {
            const result = validatePlayRunPost(open({ source, policyId: 'defender', characterId: null }));
            expect(result.ok && result.playRun).toMatchObject({ source, policyId: 'defender', characterId: null });
        }
    });

    it('drops unknown keys', () => {
        const result = validatePlayRunPost({ ...open(), deviceId: 'x' });
        expect(result.ok && result.playRun).not.toHaveProperty('deviceId');
    });

    it('names each missing or wrong field', () => {
        expect(openReasons([])).toEqual(['body: expected a JSON object']);
        const { runId: _r, startDeck: _d, ...rest } = open();
        expect(openReasons(rest)).toEqual(['runId: expected a string', 'startDeck: expected an array']);
        expect(openReasons(open({ source: 'bot', runId: '', characterId: 3, policyId: '' }))).toEqual([
            'source: expected one of human, harness, sim',
            'runId: must not be empty',
            'characterId: expected a string',
            'policyId: must not be empty',
        ]);
        expect(openReasons(open({ characterId: undefined }))).toEqual(['characterId: expected a string']);
        expect(openReasons(open({ startDeck: Array.from({ length: PLAY_LOG_LIMITS.deck + 1 }, () => 'c') }))).toEqual([
            `startDeck: more than ${PLAY_LOG_LIMITS.deck} entries`,
        ]);
    });
});

describe('validatePlayRunEndPost', () => {
    it('accepts each outcome and a run that ended off the map', () => {
        for (const outcome of PLAY_RUN_OUTCOMES) {
            expect(endReasons(end({ outcome }))).toEqual([]);
        }
        expect(endReasons(end({ endNodeId: null }))).toEqual([]);
        const result = validatePlayRunEndPost({ ...end(), extra: 1 });
        expect(result.ok && result.end).toEqual(end());
    });

    it('names each wrong field', () => {
        expect(endReasons(end({ outcome: 'won', level: 0, vitaeEnd: '3', nodesResolved: -1, endDeck: 'x', endNodeId: '' }))).toEqual([
            'outcome: expected one of run-over, chapter-clear, reset',
            'endNodeId: must not be empty',
            'level: expected a whole number of at least 1',
            'vitaeEnd: expected a number',
            'nodesResolved: expected a whole number of at least 0',
            'endDeck: expected an array',
        ]);
        expect(endReasons('x')).toEqual(['body: expected a JSON object']);
    });
});

describe('validateRunEventsPost', () => {
    it('accepts one event of each kind and returns the batch unchanged', () => {
        const result = validateRunEventsPost(batch());
        expect(result.ok && result.batch).toEqual(batch());
        expect(result.ok && result.batch.events.map(e => e.kind)).toEqual([...RUN_EVENT_KINDS]);
    });

    it('keeps a source when sent, and no key when not', () => {
        const sent = validateRunEventsPost(batch({ source: 'sim' }));
        expect(sent.ok && sent.batch.source).toBe('sim');
        const none = validateRunEventsPost(batch());
        expect(none.ok && none.batch).not.toHaveProperty('source');
    });

    it('keeps only the keys each kind names', () => {
        const result = validateRunEventsPost(batch({
            events: [event('xp-gained', 0, { payload: { amount: 1, from: 'fight', extra: 1 }, extra: 2 })],
        }));
        expect(result.ok && result.batch.events).toEqual([{ seq: 0, kind: 'xp-gained', payload: { amount: 1, from: 'fight' } }]);
    });

    it('accepts a null node kind and a null stat', () => {
        const events = [
            event('node-entered', 0, { payload: { map: 'm', nodeId: 'n', nodeKind: null } }),
            event('level-up', 1, { payload: { level: 3, stat: null } }),
        ];
        expect(batchReasons(batch({ events }))).toEqual([]);
    });

    it('refuses an unknown kind, a missing payload and a bad seq, naming each', () => {
        expect(batchReasons(batch({
            events: [
                { seq: 0, kind: 'gold-gained', payload: {} },
                { seq: 1.5, kind: 'xp-gained', payload: PAYLOADS['xp-gained'] },
                { seq: 2, kind: 'level-up' },
            ],
        }))).toEqual([
            'events[0].kind: unknown run event kind "gold-gained"',
            'events[1].seq: expected a whole number of at least 0',
            'events[2].payload: expected an object',
        ]);
        expect(batchReasons(batch({ events: ['x'] }))).toEqual(['events[0]: expected an object']);
    });

    it('names each wrong payload field of each kind', () => {
        const cases: [RunEventKind, Record<string, unknown>, string[]][] = [
            ['node-entered', { map: '', nodeId: 1, nodeKind: 2 }, [
                'events[0].payload.map: must not be empty', 'events[0].payload.nodeId: expected a string', 'events[0].payload.nodeKind: expected a string',
            ]],
            ['node-resolved', { nodeId: 'n', nodeKind: null }, ['events[0].payload.choice: expected a string']],
            ['hazard-ended', { hazardId: 'h', cleared: 'yes', vitaeBefore: 1 }, [
                'events[0].payload.cleared: expected true or false', 'events[0].payload.vitaeAfter: expected a number',
            ]],
            ['xp-gained', { amount: -1, from: '' }, [
                'events[0].payload.amount: expected a whole number of at least 0', 'events[0].payload.from: must not be empty',
            ]],
            ['level-up', { level: 0, stat: 5 }, [
                'events[0].payload.level: expected a whole number of at least 1', 'events[0].payload.stat: expected a string',
            ]],
            ['item-gained', { itemId: 'i' }, ['events[0].payload.slot: expected a string', 'events[0].payload.from: expected a string']],
        ];
        expect(cases.map(([kind]) => kind).sort()).toEqual([...RUN_EVENT_KINDS].sort());
        for (const [kind, payload, expected] of cases) {
            expect(batchReasons(batch({ events: [{ seq: 0, kind, payload }] }))).toEqual(expected);
        }
    });

    it('wants a run id, at least one event, at most 200, and a seq that rises', () => {
        expect(batchReasons(batch({ runId: '' }))).toEqual(['runId: must not be empty']);
        expect(batchReasons(batch({ events: [] }))).toEqual(['events: expected at least one event']);
        expect(batchReasons(batch({ events: 'x' }))).toEqual(['events: expected an array']);
        const full = Array.from({ length: PLAY_LOG_LIMITS.runEvents }, (_, seq) => event('xp-gained', seq));
        expect(batchReasons(batch({ events: full }))).toEqual([]);
        expect(batchReasons(batch({ events: [...full, event('xp-gained', 200)] }))).toEqual([
            `events: more than ${PLAY_LOG_LIMITS.runEvents} entries`,
        ]);
        expect(batchReasons(batch({ events: [event('xp-gained', 4), event('xp-gained', 4), event('xp-gained', 3)] }))).toEqual([
            'events[1].seq: expected a number above 4',
            'events[2].seq: expected a number above 4',
        ]);
        expect(batchReasons('x')).toEqual(['body: expected a JSON object']);
    });
});

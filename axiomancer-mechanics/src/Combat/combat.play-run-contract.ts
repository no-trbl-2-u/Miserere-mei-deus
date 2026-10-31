/**
 * Combat — the whole-run play-log contract (phase SM1c).
 *
 * `combat.play-log-contract.ts` carries one fight and one deck change. This
 * module carries the run around them: `POST /v1/play-runs` opens a run,
 * `POST /v1/play-runs/<runId>/end` closes it, and `POST /v1/run-events` posts
 * the batches of what happened between (a node entered and resolved, a hazard
 * ended, XP, a level, an item). The run id is the save's `GameState.runId`, so
 * a run row, its events, its fights and its deck changes all share one id.
 *
 * Like the play-log contract it is pure types and pure validators, shared by
 * the app, the headless driver and the Worker. Every number a run posts is a
 * measurement for T to read; nothing grades the game from it. The API is
 * versioned under `/v1/` and additive only.
 */

import {
    PLAY_LOG_LIMITS,
    PLAY_LOG_SOURCES,
    checkCardIds,
    checkOneOf,
    checkSource,
    checkText,
    isFiniteNumber,
    isRecord,
    isWhole,
} from './combat.play-log-contract';
import type { PlayLogSource, PlayLogSourceKind } from './combat.play-log-contract';

/** The routes both sides use, under their API version. */
export const PLAY_RUNS_PATH = '/v1/play-runs';
export const RUN_EVENTS_PATH = '/v1/run-events';

/** The close route of one run: `POST /v1/play-runs/<runId>/end`. */
export function playRunEndPath(runId: string): string {
    return `${PLAY_RUNS_PATH}/${encodeURIComponent(runId)}/end`;
}

/**
 * How a run ended: the player died (`run-over`), the Breakwater boss was beaten
 * and its exit reached (`chapter-clear`), or the save was reset mid-run (`reset`).
 */
export const PLAY_RUN_OUTCOMES = ['run-over', 'chapter-clear', 'reset'] as const;
export type PlayRunOutcome = (typeof PLAY_RUN_OUTCOMES)[number];

/** The payload each run event carries, by kind. */
export interface RunEventPayloads {
    /** A node was stepped onto: the map, the node and its authored event kind (null when it has none). */
    'node-entered': { map: string; nodeId: string; nodeKind: string | null };
    /** A node was resolved, and the choice taken: the rest option, the cache offer, the quest step, `flee` or `fight`. */
    'node-resolved': { nodeId: string; nodeKind: string | null; choice: string };
    /** A hazard ended: whether it was cleared, and the player's VITAE on either side of it. */
    'hazard-ended': { hazardId: string; cleared: boolean; vitaeBefore: number; vitaeAfter: number };
    /** Experience gained, and from what (a fight, a quest, a cache). */
    'xp-gained': { amount: number; from: string };
    /** A level was reached, and the stat the point went to (null when none was spent). */
    'level-up': { level: number; stat: string | null };
    /** An item came into the pack: its id, the slot it fills, and from what. */
    'item-gained': { itemId: string; slot: string; from: string };
}

/**
 * Every run event kind. The `satisfies` clause rejects a kind with no payload
 * type; the contract test rejects a payload type whose kind is missing here.
 */
export const RUN_EVENT_KINDS = [
    'node-entered', 'node-resolved', 'hazard-ended', 'xp-gained', 'level-up', 'item-gained',
] as const satisfies readonly (keyof RunEventPayloads)[];

export type RunEventKind = (typeof RUN_EVENT_KINDS)[number];

/** One run event as posted: its place in the run, its kind, and that kind's payload. */
export type RunEvent = {
    [K in RunEventKind]: { seq: number; kind: K; payload: RunEventPayloads[K] };
}[RunEventKind];

/** The body of `POST /v1/play-runs`: a run opening. The Worker stamps `startedAt`. */
export interface PlayRunPost extends PlayLogSource {
    /** Absent from an older build; stored `human`. */
    source?: PlayLogSourceKind;
    /** The save's `GameState.runId`; the open is idempotent on it. */
    runId: string;
    /** The character the run opened as; null for a run that did not open as one. */
    characterId: string | null;
    /** The bot policy playing it; null for `human` and `harness` runs. */
    policyId: string | null;
    /** The deck the run began with. */
    startDeck: string[];
}

/** The body of `POST /v1/play-runs/<runId>/end`: how the run finished. The Worker stamps `endedAt`. */
export interface PlayRunEndPost {
    outcome: PlayRunOutcome;
    /** The node the run ended on; null when it ended off the map. */
    endNodeId: string | null;
    level: number;
    vitaeEnd: number;
    nodesResolved: number;
    endDeck: string[];
}

/** The body of `POST /v1/run-events`: one batch of a run's events, in `seq` order. */
export interface RunEventsPost {
    runId: string;
    /** Absent from an older build; stored `human`. */
    source?: PlayLogSourceKind;
    events: RunEvent[];
}

/** One stored run, as `GET /v1/play-runs` returns it; the close fields are null while it is open. */
export interface PlayRunRow extends Omit<PlayRunPost, 'source'> {
    id: number;
    source: PlayLogSourceKind;
    startedAt: string;
    endedAt: string | null;
    outcome: PlayRunOutcome | null;
    endNodeId: string | null;
    level: number | null;
    vitaeEnd: number | null;
    nodesResolved: number | null;
    endDeck: string[] | null;
}

/** One stored run event, as `GET /v1/run-events` returns it. */
export type RunEventRow = RunEvent & {
    id: number;
    runId: string;
    source: PlayLogSourceKind;
    receivedAt: string;
};

/** The body of `GET /v1/play-runs`, newest first. */
export interface PlayRunList {
    playRuns: PlayRunRow[];
}

/** The body of `GET /v1/run-events`, in run then `seq` order. */
export interface RunEventList {
    runEvents: RunEventRow[];
}

/** The body of a 201 (a run opened) or a 200 (it was already open) from `POST /v1/play-runs`. */
export interface PlayRunOpened {
    id: number;
    /** When the run was first opened. */
    startedAt: string;
}

/** The body of a 200 from `POST /v1/play-runs/<runId>/end`. */
export interface PlayRunClosed {
    id: number;
    endedAt: string;
}

/** The body of a 201 from `POST /v1/run-events`. */
export interface RunEventsCreated {
    count: number;
    receivedAt: string;
}

export type PlayRunValidation =
    | { ok: true; playRun: PlayRunPost; reasons: [] }
    | { ok: false; reasons: string[] };

export type PlayRunEndValidation =
    | { ok: true; end: PlayRunEndPost; reasons: [] }
    | { ok: false; reasons: string[] };

export type RunEventsValidation =
    | { ok: true; batch: RunEventsPost; reasons: [] }
    | { ok: false; reasons: string[] };

const PLAY_RUN_KEYS = ['solver', 'sessionId', 'buildCommit', 'appBuild', 'source', 'runId', 'characterId', 'policyId', 'startDeck'] as const;

const PLAY_RUN_END_KEYS = ['outcome', 'endNodeId', 'level', 'vitaeEnd', 'nodesResolved', 'endDeck'] as const;

function checkOptionalSource(body: Record<string, unknown>, reasons: string[]): void {
    if (body.source !== undefined) checkOneOf(body.source, PLAY_LOG_SOURCES, 'source', reasons);
}

function checkNullableText(value: unknown, field: string, reasons: string[]): void {
    if (value !== null) checkText(value, field, reasons, false);
}

function pickKeys(body: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
    return Object.fromEntries(keys.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
}

/**
 * Checks an untrusted `POST /v1/play-runs` body. On success the returned
 * `playRun` carries only the contract's keys, and no `source` key when the
 * body left it out (an older build).
 */
export function validatePlayRunPost(body: unknown): PlayRunValidation {
    if (!isRecord(body)) return { ok: false, reasons: ['body: expected a JSON object'] };
    const reasons: string[] = [];

    checkSource(body, reasons);
    checkOptionalSource(body, reasons);
    checkText(body.runId, 'runId', reasons, false);
    checkNullableText(body.characterId, 'characterId', reasons);
    checkNullableText(body.policyId, 'policyId', reasons);
    checkCardIds(body.startDeck, 'startDeck', PLAY_LOG_LIMITS.deck, reasons);

    if (reasons.length > 0) return { ok: false, reasons };
    return { ok: true, playRun: pickKeys(body, PLAY_RUN_KEYS) as unknown as PlayRunPost, reasons: [] };
}

/** Checks an untrusted `POST /v1/play-runs/<runId>/end` body. */
export function validatePlayRunEndPost(body: unknown): PlayRunEndValidation {
    if (!isRecord(body)) return { ok: false, reasons: ['body: expected a JSON object'] };
    const reasons: string[] = [];

    checkOneOf(body.outcome, PLAY_RUN_OUTCOMES, 'outcome', reasons);
    checkNullableText(body.endNodeId, 'endNodeId', reasons);
    if (!isWhole(body.level, 1)) reasons.push('level: expected a whole number of at least 1');
    if (!isFiniteNumber(body.vitaeEnd)) reasons.push('vitaeEnd: expected a number');
    if (!isWhole(body.nodesResolved, 0)) reasons.push('nodesResolved: expected a whole number of at least 0');
    checkCardIds(body.endDeck, 'endDeck', PLAY_LOG_LIMITS.deck, reasons);

    if (reasons.length > 0) return { ok: false, reasons };
    return { ok: true, end: pickKeys(body, PLAY_RUN_END_KEYS) as unknown as PlayRunEndPost, reasons: [] };
}

function checkAmount(value: unknown, field: string, reasons: string[]): void {
    if (!isWhole(value, 0)) reasons.push(`${field}: expected a whole number of at least 0`);
}

function checkNumber(value: unknown, field: string, reasons: string[]): void {
    if (!isFiniteNumber(value)) reasons.push(`${field}: expected a number`);
}

/** What each kind's payload must hold, and the keys it keeps. A kind with no entry fails to compile. */
const PAYLOAD_CHECKS: {
    [K in RunEventKind]: { keys: readonly (keyof RunEventPayloads[K])[]; check(payload: Record<string, unknown>, at: string, reasons: string[]): void };
} = {
    'node-entered': {
        keys: ['map', 'nodeId', 'nodeKind'],
        check(p, at, reasons) {
            checkText(p.map, `${at}.map`, reasons, false);
            checkText(p.nodeId, `${at}.nodeId`, reasons, false);
            checkNullableText(p.nodeKind, `${at}.nodeKind`, reasons);
        },
    },
    'node-resolved': {
        keys: ['nodeId', 'nodeKind', 'choice'],
        check(p, at, reasons) {
            checkText(p.nodeId, `${at}.nodeId`, reasons, false);
            checkNullableText(p.nodeKind, `${at}.nodeKind`, reasons);
            checkText(p.choice, `${at}.choice`, reasons, false);
        },
    },
    'hazard-ended': {
        keys: ['hazardId', 'cleared', 'vitaeBefore', 'vitaeAfter'],
        check(p, at, reasons) {
            checkText(p.hazardId, `${at}.hazardId`, reasons, false);
            if (typeof p.cleared !== 'boolean') reasons.push(`${at}.cleared: expected true or false`);
            checkNumber(p.vitaeBefore, `${at}.vitaeBefore`, reasons);
            checkNumber(p.vitaeAfter, `${at}.vitaeAfter`, reasons);
        },
    },
    'xp-gained': {
        keys: ['amount', 'from'],
        check(p, at, reasons) {
            checkAmount(p.amount, `${at}.amount`, reasons);
            checkText(p.from, `${at}.from`, reasons, false);
        },
    },
    'level-up': {
        keys: ['level', 'stat'],
        check(p, at, reasons) {
            if (!isWhole(p.level, 1)) reasons.push(`${at}.level: expected a whole number of at least 1`);
            checkNullableText(p.stat, `${at}.stat`, reasons);
        },
    },
    'item-gained': {
        keys: ['itemId', 'slot', 'from'],
        check(p, at, reasons) {
            checkText(p.itemId, `${at}.itemId`, reasons, false);
            checkText(p.slot, `${at}.slot`, reasons, false);
            checkText(p.from, `${at}.from`, reasons, false);
        },
    },
};

const RUN_EVENT_KIND_SET: ReadonlySet<string> = new Set(RUN_EVENT_KINDS);

/** Checks one event; returns its `seq` when it is whole, so the batch can check the order. */
function checkRunEvent(event: unknown, i: number, reasons: string[]): number | null {
    const at = `events[${i}]`;
    if (!isRecord(event)) {
        reasons.push(`${at}: expected an object`);
        return null;
    }
    const seq = isWhole(event.seq, 0) ? event.seq : null;
    if (seq === null) reasons.push(`${at}.seq: expected a whole number of at least 0`);
    if (typeof event.kind !== 'string' || !RUN_EVENT_KIND_SET.has(event.kind)) {
        reasons.push(`${at}.kind: unknown run event kind ${JSON.stringify(event.kind)}`);
    } else if (!isRecord(event.payload)) {
        reasons.push(`${at}.payload: expected an object`);
    } else {
        PAYLOAD_CHECKS[event.kind as RunEventKind].check(event.payload, `${at}.payload`, reasons);
    }
    return seq;
}

/** An event keeps its `seq`, kind and the payload keys its kind names. */
function pickRunEvent(event: Record<string, unknown>): RunEvent {
    const kind = event.kind as RunEventKind;
    const payload = event.payload as Record<string, unknown>;
    return { seq: event.seq, kind, payload: pickKeys(payload, PAYLOAD_CHECKS[kind].keys as readonly string[]) } as unknown as RunEvent;
}

/**
 * Checks an untrusted `POST /v1/run-events` body: a run id, an optional
 * source, and between one and `PLAY_LOG_LIMITS.runEvents` events whose `seq`
 * rises strictly from the first to the last.
 */
export function validateRunEventsPost(body: unknown): RunEventsValidation {
    if (!isRecord(body)) return { ok: false, reasons: ['body: expected a JSON object'] };
    const reasons: string[] = [];

    checkText(body.runId, 'runId', reasons, false);
    checkOptionalSource(body, reasons);

    if (!Array.isArray(body.events)) {
        reasons.push('events: expected an array');
    } else if (body.events.length === 0) {
        reasons.push('events: expected at least one event');
    } else if (body.events.length > PLAY_LOG_LIMITS.runEvents) {
        reasons.push(`events: more than ${PLAY_LOG_LIMITS.runEvents} entries`);
    } else {
        let last = -1;
        body.events.forEach((event, i) => {
            const seq = checkRunEvent(event, i, reasons);
            if (seq === null) return;
            if (seq <= last) reasons.push(`events[${i}].seq: expected a number above ${last}`);
            last = Math.max(last, seq);
        });
    }

    if (reasons.length > 0) return { ok: false, reasons };
    const batch: RunEventsPost = {
        runId: body.runId as string,
        ...(body.source === undefined ? {} : { source: body.source as PlayLogSourceKind }),
        events: (body.events as Record<string, unknown>[]).map(pickRunEvent),
    };
    return { ok: true, batch, reasons: [] };
}

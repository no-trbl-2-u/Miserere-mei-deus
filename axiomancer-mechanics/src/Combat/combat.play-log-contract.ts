/**
 * Combat — the play-log API contract (phase BE2a).
 *
 * One ended fight and one deck change, as the preview app posts them and the
 * `miserere-api` Worker stores and returns them. The app and the Worker both
 * import this module, so the request shapes and the validators cannot drift
 * between them. Pure types and pure validators: no I/O, no engine imports
 * beyond types, so the Worker bundle stays small.
 *
 * A fight's events are the engine's `CombatEvent` stream unchanged, each
 * stamped with milliseconds since the fight began and the player's VITAE at
 * that moment, plus three screen events the panel records. Every number here
 * is a measurement for T to read; nothing grades the game from it.
 *
 * The API is versioned under `/v1/`. An installed preview APK keeps posting
 * these shapes forever, so a breaking change is a new path, never an edit here.
 */

import type { CombatEvent, CombatOutcome } from './combat.encounter.types';

/** The two routes both sides use, under their API version. */
export const PLAY_LOG_FIGHTS_PATH = '/v1/fights';
export const PLAY_LOG_DECK_EVENTS_PATH = '/v1/deck-events';

/**
 * Every `CombatEvent['kind']`. The `satisfies` clause rejects a kind the
 * engine does not emit; the contract test rejects a kind the engine emits and
 * this list lacks, so the validator never refuses a real fight.
 */
export const COMBAT_EVENT_KINDS = [
    'dice-rolled', 'turn-dice-rolled', 'turn-law-blocked', 'conviction-gained', 'signature-cast',
    'card-played', 'effect-landed', 'effect-fizzled', 'damage-dealt', 'vitae-sacrificed', 'player-healed',
    'global-entered', 'global-left', 'card-exiled', 'curse-added', 'die-refreshed', 'die-spent', 'dot-tick',
    'weather-changed', 'blizzard-softened', 'spikes-changed', 'spike-struck', 'cards-discarded', 'cards-retrieved', 'card-unexiled',
    'barrier-absorbed', 'riposte-fired', 'die-banked', 'die-ripened', 'resonance-gained', 'pips-cashed',
    'floating-die-spent', 'soul-gained', 'stage-entered', 'enemy-healed', 'dots-boosted', 'phase-resolved',
    'threat-fired', 'threat-branch', 'threat-cleansed', 'hand-drawn', 'mercy-opened', 'momentum-advanced',
    'momentum-broken', 'momentum-surged', 'special-fired', 'die-overflowed', 'die-cracked',
    'coveted-die-stolen', 'combat-ended',
] as const satisfies readonly CombatEvent['kind'][];

/**
 * The screen events the combat panel adds to a fight's stream. The first three
 * name a card; `ui-signature-refused` (phase LR1g) is a tap on a signature the
 * engine would not cast, with the refusal's reason.
 */
export const PLAY_LOG_UI_EVENT_KINDS = ['ui-staged', 'ui-unstaged', 'ui-detail-opened', 'ui-signature-refused'] as const;

export const PLAY_LOG_FIGHT_OUTCOMES = ['victory', 'mercy', 'defeat', 'retreat'] as const satisfies readonly CombatOutcome[];

/** What changed the deck. `upgrade` is reserved for when the upgrade actions reach the app. */
export const DECK_EVENT_KINDS = ['reward', 'cache-reward', 'remove', 'run-end'] as const;

/**
 * Upper bounds that keep one malformed or hostile post from filling a table.
 * The byte caps are the Worker's (a 413); the counts are the validator's.
 */
export const PLAY_LOG_LIMITS = {
    text: 200,
    events: 5000,
    deck: 500,
    /** Worn relics and signatures per fight (a loadout holds a handful). */
    worn: 50,
    offered: 20,
    fightBytes: 1024 * 1024,
    deckEventBytes: 64 * 1024,
} as const;

export type CombatEventKind = (typeof COMBAT_EVENT_KINDS)[number];
export type PlayLogUiEventKind = (typeof PLAY_LOG_UI_EVENT_KINDS)[number];
export type DeckEventKind = (typeof DECK_EVENT_KINDS)[number];

/** When an event happened: ms since the fight began, and the player's VITAE then. */
export interface PlayLogStamp {
    ms: number;
    vitae: number;
}

/** An engine event, unchanged, with its stamp. */
export type PlayLogCombatEvent = CombatEvent & PlayLogStamp;

/** A screen event: a card staged, unstaged before it was played, or its detail popup opened. */
export interface PlayLogCardUiEvent extends PlayLogStamp {
    kind: Exclude<PlayLogUiEventKind, 'ui-signature-refused'>;
    cardId: string;
}

/** A tap on a signature the engine refused (LR1g): which one, and `signatureCastBlock`'s reason. */
export interface PlayLogSignatureRefusedEvent extends PlayLogStamp {
    kind: 'ui-signature-refused';
    signatureId: string;
    reason: string;
}

export type PlayLogUiEvent = PlayLogCardUiEvent | PlayLogSignatureRefusedEvent;

export type PlayLogEvent = PlayLogCombatEvent | PlayLogUiEvent;

/** Who posted, from which build. Shared by both bodies. */
export interface PlayLogSource {
    /** The name the dev tools already use. */
    solver: string;
    /** Minted once per app launch. */
    sessionId: string;
    /** The commit the build was made from; null when a local dev session does not know it. */
    buildCommit: string | null;
    /** Which build posted it (version and profile), for telling APKs apart. */
    appBuild: string;
}

/** The body of `POST /v1/fights`: one ended fight. */
export interface FightPost extends PlayLogSource {
    enemyId: string;
    playerLevel: number;
    /** The live HP multiplier the fight ran under, so its length compares to the measured report. */
    enemyHpMultiplier: number;
    outcome: CombatOutcome;
    turns: number;
    vitaeStart: number;
    vitaeEnd: number;
    vitaeLow: number;
    /** The deck at the fight's start; an upgraded card keeps its `+` id. */
    deck: string[];
    /** The relic ids worn at the fight's start (LR1g); stored empty when absent. */
    relics?: string[];
    /** The signature ids those relics grant (LR1g); stored empty when absent. */
    signatures?: string[];
    events: PlayLogEvent[];
}

/** Where a deck change happened. */
export interface DeckEventWhere {
    nodeId: string | null;
    screen: string;
}

/** The body of `POST /v1/deck-events`: one change to the run's deck. */
export interface DeckEventPost extends PlayLogSource {
    kind: DeckEventKind;
    /** The card picked or removed; null for a skipped reward or a run's end. */
    cardId: string | null;
    /** The cards a reward showed; null for a removal or a run's end. */
    offered: string[] | null;
    /** The deck after the change. */
    deck: string[];
    where: DeckEventWhere;
}

/** One stored fight, as `GET /v1/fights` returns it. */
export interface FightRow extends FightPost {
    id: number;
    /** ISO instant the Worker stored it. */
    receivedAt: string;
}

/** One stored deck change, as `GET /v1/deck-events` returns it. */
export interface DeckEventRow extends DeckEventPost {
    id: number;
    receivedAt: string;
}

/** The body of `GET /v1/fights`, newest first. */
export interface FightList {
    fights: FightRow[];
}

/** The body of `GET /v1/deck-events`, newest first. */
export interface DeckEventList {
    deckEvents: DeckEventRow[];
}

/** The body of a 201 from either POST. */
export interface PlayLogCreated {
    id: number;
    receivedAt: string;
}

/** The body of every 4xx: what was wrong, one line per problem. */
export interface PlayLogError {
    error: string;
    reasons?: string[];
}

export type FightValidation =
    | { ok: true; fight: FightPost; reasons: [] }
    | { ok: false; reasons: string[] };

export type DeckEventValidation =
    | { ok: true; deckEvent: DeckEventPost; reasons: [] }
    | { ok: false; reasons: string[] };

const SOURCE_KEYS: readonly (keyof PlayLogSource)[] = ['solver', 'sessionId', 'buildCommit', 'appBuild'];

const FIGHT_KEYS: readonly (keyof FightPost)[] = [
    ...SOURCE_KEYS, 'enemyId', 'playerLevel', 'enemyHpMultiplier', 'outcome', 'turns',
    'vitaeStart', 'vitaeEnd', 'vitaeLow', 'deck', 'relics', 'signatures', 'events',
];

const DECK_EVENT_KEYS: readonly (keyof DeckEventPost)[] = [
    ...SOURCE_KEYS, 'kind', 'cardId', 'offered', 'deck', 'where',
];

const COMBAT_KINDS: ReadonlySet<string> = new Set(COMBAT_EVENT_KINDS);
const UI_KINDS: ReadonlySet<string> = new Set(PLAY_LOG_UI_EVENT_KINDS);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWhole(value: unknown, min: number): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= min;
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function checkText(value: unknown, field: string, reasons: string[], allowEmpty: boolean): void {
    if (typeof value !== 'string') {
        reasons.push(`${field}: expected a string`);
    } else if (!allowEmpty && value.trim() === '') {
        reasons.push(`${field}: must not be empty`);
    } else if (value.length > PLAY_LOG_LIMITS.text) {
        reasons.push(`${field}: longer than ${PLAY_LOG_LIMITS.text} characters`);
    }
}

function checkOneOf(value: unknown, allowed: readonly string[], field: string, reasons: string[]): void {
    if (typeof value !== 'string' || !allowed.includes(value)) {
        reasons.push(`${field}: expected one of ${allowed.join(', ')}`);
    }
}

function checkCardIds(value: unknown, field: string, max: number, reasons: string[]): void {
    if (!Array.isArray(value)) {
        reasons.push(`${field}: expected an array`);
    } else if (value.length > max) {
        reasons.push(`${field}: more than ${max} entries`);
    } else {
        value.forEach((id, i) => checkText(id, `${field}[${i}]`, reasons, false));
    }
}

function checkSource(body: Record<string, unknown>, reasons: string[]): void {
    // The solver may be blank, as on a puzzle attempt; the session and build must be present.
    checkText(body.solver, 'solver', reasons, true);
    checkText(body.sessionId, 'sessionId', reasons, false);
    if (body.buildCommit !== null) checkText(body.buildCommit, 'buildCommit', reasons, false);
    checkText(body.appBuild, 'appBuild', reasons, false);
}

function checkEvent(event: unknown, i: number, reasons: string[]): void {
    const at = `events[${i}]`;
    if (!isRecord(event)) {
        reasons.push(`${at}: expected an object`);
        return;
    }
    if (typeof event.kind !== 'string' || !(COMBAT_KINDS.has(event.kind) || UI_KINDS.has(event.kind))) {
        reasons.push(`${at}.kind: unknown event kind ${JSON.stringify(event.kind)}`);
    } else if (event.kind === 'ui-signature-refused') {
        checkText(event.signatureId, `${at}.signatureId`, reasons, false);
        checkText(event.reason, `${at}.reason`, reasons, false);
    } else if (UI_KINDS.has(event.kind)) {
        checkText(event.cardId, `${at}.cardId`, reasons, false);
    }
    if (!isWhole(event.ms, 0)) reasons.push(`${at}.ms: expected whole milliseconds of at least 0`);
    if (!isFiniteNumber(event.vitae)) reasons.push(`${at}.vitae: expected a number`);
}

/** An engine event is kept whole; a screen event keeps only its own keys. */
function pickEvent(event: Record<string, unknown>): PlayLogEvent {
    if (event.kind === 'ui-signature-refused') {
        return {
            kind: event.kind, signatureId: event.signatureId, reason: event.reason, ms: event.ms, vitae: event.vitae,
        } as PlayLogSignatureRefusedEvent;
    }
    if (UI_KINDS.has(event.kind as string)) {
        return { kind: event.kind, cardId: event.cardId, ms: event.ms, vitae: event.vitae } as PlayLogUiEvent;
    }
    return event as unknown as PlayLogCombatEvent;
}

function pick<T>(body: Record<string, unknown>, keys: readonly (keyof T)[]): T {
    return Object.fromEntries(keys.map((key) => [key, body[key as string]])) as T;
}

/**
 * Checks an untrusted `POST /v1/fights` body. On success the returned `fight`
 * carries only the contract's keys, so an unknown top-level key is dropped
 * rather than stored. An engine event is stored as sent: its payload is the
 * engine's, and the kind list is what keeps a stray entry out.
 */
export function validateFightPost(body: unknown): FightValidation {
    if (!isRecord(body)) return { ok: false, reasons: ['body: expected a JSON object'] };
    const reasons: string[] = [];

    checkSource(body, reasons);
    checkText(body.enemyId, 'enemyId', reasons, false);
    if (!isWhole(body.playerLevel, 1)) reasons.push('playerLevel: expected a whole number of at least 1');
    if (!isFiniteNumber(body.enemyHpMultiplier) || body.enemyHpMultiplier <= 0) {
        reasons.push('enemyHpMultiplier: expected a number above 0');
    }
    checkOneOf(body.outcome, PLAY_LOG_FIGHT_OUTCOMES, 'outcome', reasons);
    if (!isWhole(body.turns, 0)) reasons.push('turns: expected a whole number of at least 0');
    for (const key of ['vitaeStart', 'vitaeEnd', 'vitaeLow'] as const) {
        if (!isFiniteNumber(body[key])) reasons.push(`${key}: expected a number`);
    }
    checkCardIds(body.deck, 'deck', PLAY_LOG_LIMITS.deck, reasons);
    // Optional on the wire: an installed build from before LR1g sends neither.
    for (const key of ['relics', 'signatures'] as const) {
        if (body[key] !== undefined) checkCardIds(body[key], key, PLAY_LOG_LIMITS.worn, reasons);
    }

    if (!Array.isArray(body.events)) {
        reasons.push('events: expected an array');
    } else if (body.events.length > PLAY_LOG_LIMITS.events) {
        reasons.push(`events: more than ${PLAY_LOG_LIMITS.events} entries`);
    } else {
        body.events.forEach((event, i) => checkEvent(event, i, reasons));
    }

    if (reasons.length > 0) return { ok: false, reasons };

    const fight = pick<FightPost>(body, FIGHT_KEYS);
    return {
        ok: true,
        fight: {
            ...fight,
            relics: (body.relics as string[] | undefined) ?? [],
            signatures: (body.signatures as string[] | undefined) ?? [],
            events: (body.events as Record<string, unknown>[]).map(pickEvent),
        },
        reasons: [],
    };
}

/** Which of `cardId` and `offered` each kind carries. */
const DECK_EVENT_SHAPE: Record<DeckEventKind, { card: 'required' | 'optional' | 'none'; offered: boolean }> = {
    'reward': { card: 'optional', offered: true },
    'cache-reward': { card: 'optional', offered: true },
    'remove': { card: 'required', offered: false },
    'run-end': { card: 'none', offered: false },
};

/**
 * Checks an untrusted `POST /v1/deck-events` body. A reward names what it
 * offered and the card picked from it (null for a skip); a removal names its
 * card and offers nothing; a run's end names neither.
 */
export function validateDeckEventPost(body: unknown): DeckEventValidation {
    if (!isRecord(body)) return { ok: false, reasons: ['body: expected a JSON object'] };
    const reasons: string[] = [];

    checkSource(body, reasons);
    checkOneOf(body.kind, DECK_EVENT_KINDS, 'kind', reasons);
    checkCardIds(body.deck, 'deck', PLAY_LOG_LIMITS.deck, reasons);

    if (!isRecord(body.where)) {
        reasons.push('where: expected an object');
    } else {
        if (body.where.nodeId !== null) checkText(body.where.nodeId, 'where.nodeId', reasons, false);
        checkText(body.where.screen, 'where.screen', reasons, false);
    }

    const shape = DECK_EVENT_SHAPE[body.kind as DeckEventKind];
    if (shape) {
        if (shape.card === 'none') {
            if (body.cardId !== null) reasons.push(`cardId: expected null for ${body.kind}`);
        } else if (body.cardId !== null || shape.card === 'required') {
            checkText(body.cardId, 'cardId', reasons, false);
        }
        if (!shape.offered) {
            if (body.offered !== null) reasons.push(`offered: expected null for ${body.kind}`);
        } else {
            checkCardIds(body.offered, 'offered', PLAY_LOG_LIMITS.offered, reasons);
            if (Array.isArray(body.offered) && body.offered.length === 0) {
                reasons.push('offered: expected at least one card');
            }
            if (typeof body.cardId === 'string' && Array.isArray(body.offered) && !body.offered.includes(body.cardId)) {
                reasons.push('cardId: expected one of the offered cards');
            }
        }
    }

    if (reasons.length > 0) return { ok: false, reasons };

    const deckEvent = pick<DeckEventPost>(body, DECK_EVENT_KEYS);
    const where = body.where as Record<string, unknown>;
    return {
        ok: true,
        deckEvent: { ...deckEvent, where: { nodeId: where.nodeId as string | null, screen: where.screen as string } },
        reasons: [],
    };
}

/**
 * The ballot-verdict contract (phase BV1a): one verdict as a ballot page
 * submits it and the Worker stores and returns it. Only the ballot pages and
 * this Worker speak it, so it lives here rather than in the engine.
 *
 * The API is versioned under `/v1/`; a breaking change is a new path.
 */

export const BALLOT_VERDICTS_PATH = '/v1/ballot-verdicts';

export const BALLOT_LIMITS = {
    /** The whole POST body, a 413 over it. */
    bodyBytes: 64 * 1024,
    /** The Generate text, in UTF-8 bytes. */
    verdictTextBytes: 32 * 1024,
    client: 500,
} as const;

/** A ballot's id, e.g. `elementalist-2026-10-22`. */
export const BALLOT_ID_PATTERN = /^[a-z0-9-]{3,64}$/;
/** A candidate card on a ballot, e.g. `P-01a`. */
export const BALLOT_CANDIDATE_PATTERN = /^[A-Z]-\d{2}[a-z]$/;
/** A slot on a ballot, e.g. `P-01`; the keys of `notes`. */
export const BALLOT_SLOT_PATTERN = /^[A-Z]-\d{2}$/;

/**
 * A row's standing (phase BV2a): `draft` is a Save, progress only; `final` is
 * a Submit. The verdict in force is the newest `final` row for a ballot.
 */
export const BALLOT_STATUSES = ['draft', 'final'] as const;
export type BallotVerdictStatus = (typeof BALLOT_STATUSES)[number];

export function isBallotVerdictStatus(value: unknown): value is BallotVerdictStatus {
    return typeof value === 'string' && (BALLOT_STATUSES as readonly string[]).includes(value);
}

export interface BallotVerdictPost {
    ballotId: string;
    /** The ballot's Generate text, verbatim. */
    verdictText: string;
    /** The kept candidate ids. */
    kept: string[];
    /** Slot id to that slot's note. */
    notes: Record<string, string>;
    general: string | null;
    /** The submitting browser's user agent. */
    client: string | null;
    /** Optional on the wire, `final` when absent; always set on a stored row. */
    status: BallotVerdictStatus;
}

export interface BallotVerdictRow extends BallotVerdictPost {
    id: number;
    receivedAt: string;
}

export interface BallotVerdictList {
    ballotVerdicts: BallotVerdictRow[];
}

export type BallotVerdictValidation =
    | { ok: true; verdict: BallotVerdictPost }
    | { ok: false; reasons: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkOptionalText(value: unknown, field: string, max: number | null, reasons: string[]): void {
    if (value === undefined || value === null) return;
    if (typeof value !== 'string') reasons.push(`${field}: expected a string or null`);
    else if (max !== null && value.length > max) reasons.push(`${field}: longer than ${max} characters`);
}

/** Every problem with a posted verdict, or the verdict with its optional fields made null. */
export function validateBallotVerdictPost(body: unknown): BallotVerdictValidation {
    if (!isRecord(body)) return { ok: false, reasons: ['body: expected an object'] };
    const reasons: string[] = [];

    if (typeof body.ballotId !== 'string' || !BALLOT_ID_PATTERN.test(body.ballotId)) {
        reasons.push('ballotId: expected 3 to 64 lowercase letters, digits or hyphens');
    }

    if (typeof body.verdictText !== 'string') reasons.push('verdictText: expected a string');
    else if (body.verdictText.trim() === '') reasons.push('verdictText: must not be empty');
    else if (new TextEncoder().encode(body.verdictText).length > BALLOT_LIMITS.verdictTextBytes) {
        reasons.push(`verdictText: over ${BALLOT_LIMITS.verdictTextBytes} bytes`);
    }

    if (!Array.isArray(body.kept)) reasons.push('kept: expected an array');
    else {
        body.kept.forEach((id, i) => {
            if (typeof id !== 'string' || !BALLOT_CANDIDATE_PATTERN.test(id)) {
                reasons.push(`kept[${i}]: expected a candidate id like P-01a`);
            }
        });
    }

    if (!isRecord(body.notes)) reasons.push('notes: expected an object');
    else {
        for (const [slot, note] of Object.entries(body.notes)) {
            if (!BALLOT_SLOT_PATTERN.test(slot)) reasons.push(`notes.${slot}: expected a slot id like P-01`);
            else if (typeof note !== 'string') reasons.push(`notes.${slot}: expected a string`);
        }
    }

    checkOptionalText(body.general, 'general', null, reasons);
    checkOptionalText(body.client, 'client', BALLOT_LIMITS.client, reasons);

    if (body.status !== undefined && !isBallotVerdictStatus(body.status)) {
        reasons.push(`status: expected draft or final, got ${JSON.stringify(body.status)}`);
    }

    if (reasons.length > 0) return { ok: false, reasons };
    return {
        ok: true,
        verdict: {
            ballotId: body.ballotId as string,
            verdictText: body.verdictText as string,
            kept: body.kept as string[],
            notes: body.notes as Record<string, string>,
            general: (body.general as string | undefined) ?? null,
            client: (body.client as string | undefined) ?? null,
            status: (body.status as BallotVerdictStatus | undefined) ?? 'final',
        },
    };
}

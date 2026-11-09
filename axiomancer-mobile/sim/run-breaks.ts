/**
 * What breaks in a sim run, and how it is written down (phase SM2d, A9).
 *
 * A break is a thing a bug did: a `crash` (an exception out of a step), `stuck`
 * (no legal move, or past the step cap), `fight-stuck` (a fight that does not
 * end), `quest-unfinishable` (at a chapter clear an accepted quest whose next
 * target no road reaches) and `node-unresolved` (a node entered with an event
 * the run left before resolving). The driver holds the live state, so it
 * detects them; the batch turns each into a `RunBreak` line for
 * `npm run sim:run -- --breaks <file>`, and `scripts/sim-breaks.mjs` files one
 * issue per key. Nothing here grades a number.
 */

import { unfinishableQuests, type GameState, type RunEventKind, type RunEventPayloads } from '@mechanics';

import { replaceRunLogPoster, type RunLogPoster } from '@/lib/runLog';
import type { AppStoreState } from '@/state/store';

import { RunCrashError, RunStuckError, stuckStateOf, type RunBreakDetail, type RunStuckState } from './run-stuck';

export type BreakKind = 'crash' | 'stuck' | 'fight-stuck' | 'quest-unfinishable' | 'node-unresolved';

/** The breaks that end a run and fail the batch step (as SM1g's stuck runs do). */
export const FATAL_BREAK_KINDS: readonly BreakKind[] = ['crash', 'stuck', 'fight-stuck'];

/** A break the end-of-run checks found in a run that finished. */
export interface RunFinding {
    readonly kind: 'quest-unfinishable' | 'node-unresolved';
    readonly node: string;
    readonly message: string;
    readonly state: RunStuckState;
    readonly detail: RunBreakDetail;
}

/** One line of the breaks file. */
export interface RunBreak {
    /** `<persona>:<map>/<node>:<kind>`. */
    readonly key: string;
    readonly kind: BreakKind;
    readonly persona: string;
    readonly characterId: string | null;
    readonly seed: number;
    readonly build: string | null;
    readonly message: string;
    readonly state: {
        readonly map: string;
        readonly node: string;
        readonly step: number;
        readonly screen: string;
        readonly level: number;
        readonly vitae: number;
        readonly maxVitae: number;
        readonly deckSize: number;
        readonly quests: readonly { readonly name: string; readonly next: string }[];
        readonly lastEvents: readonly string[];
    };
}

/** The break key: persona plus node plus kind. */
export function breakKey(persona: string, map: string, node: string, kind: BreakKind): string {
    return `${persona}:${map}/${node}:${kind}`;
}

/** Writes one break line from a stuck state, its detail and the run it came from. */
export function toRunBreak(
    kind: BreakKind,
    message: string,
    state: RunStuckState,
    detail: RunBreakDetail | undefined,
    run: { persona: string; characterId: string | null; seed: number; build: string | null },
): RunBreak {
    return {
        key: breakKey(run.persona, state.map, state.node, kind),
        kind,
        persona: run.persona,
        characterId: run.characterId,
        seed: run.seed,
        build: run.build,
        message,
        state: {
            map: state.map,
            node: state.node,
            step: state.step,
            screen: state.screen,
            level: state.level,
            vitae: state.health,
            maxVitae: state.maxHealth,
            deckSize: detail?.deckSize ?? 0,
            quests: detail?.quests ?? [],
            lastEvents: detail?.lastEvents ?? [],
        },
    };
}

/** The kind of break a thrown error is, or null when it is not one the driver throws. */
export function breakKindOf(error: unknown): { kind: BreakKind; error: RunStuckError | RunCrashError } | null {
    if (error instanceof RunStuckError) return { kind: error.kind, error };
    if (error instanceof RunCrashError) return { kind: 'crash', error };
    return null;
}

/** Records the last run events (kind and a short payload) that pass the run-log poster, whatever the play-log gate. */
export interface EventTap {
    readonly recent: string[];
    /** Called with each `node-resolved` node id. */
    onResolved: (nodeId: string) => void;
    restore: () => void;
}

const RECENT_EVENTS = 10;

function brief(kind: string, payload: unknown): string {
    const p = payload as Record<string, unknown>;
    const parts = ['nodeId', 'node', 'choice', 'id', 'amount', 'action', 'questId', 'level']
        .filter((k) => p[k] !== undefined)
        .map((k) => `${k}=${String(p[k])}`);
    return parts.length === 0 ? kind : `${kind} ${parts.join(' ')}`;
}

/** Wraps the app-wide run-log poster so the driver sees every event; call `restore` when the run ends. */
export function tapRunEvents(): EventTap {
    let inner: RunLogPoster | null = null;
    const tap: EventTap = { recent: [], onResolved: () => undefined, restore: () => undefined };
    const wrapper: RunLogPoster = {
        open: (run) => inner?.open(run),
        event: <K extends RunEventKind>(runId: string, kind: K, payload: RunEventPayloads[K]) => {
            tap.recent.push(brief(kind, payload));
            if (tap.recent.length > RECENT_EVENTS) tap.recent.shift();
            if (kind === 'node-resolved') tap.onResolved((payload as RunEventPayloads['node-resolved']).nodeId);
            inner?.event(runId, kind, payload);
        },
        flush: (runId) => inner?.flush(runId),
        close: (runId, end) => inner?.close(runId, end),
        settled: () => inner?.settled() ?? Promise.resolve(),
    };
    inner = replaceRunLogPoster(wrapper);
    tap.restore = () => {
        replaceRunLogPoster(inner as RunLogPoster);
    };
    return tap;
}

/** The deck size, the active quests' next steps and the last events, for a break's state summary. */
export function detailOf(state: AppStoreState, deckSize: number, recent: readonly string[]): RunBreakDetail {
    const game = state as unknown as GameState;
    const quests = (game.quests?.active ?? []).map((q) => {
        const open = q.objectives.find((o) => o.currentCount < o.requiredCount);
        const next = open === undefined ? 'turn in' : `${open.type} ${open.target ?? open.foeClass ?? ''} ${open.currentCount}/${open.requiredCount}`.replace(/\s+/g, ' ').trim();
        return { name: q.name, next };
    });
    return { deckSize, quests, lastEvents: [...recent] };
}

/**
 * The end-of-run check for stranded quests (a chapter clear only: mid-run the
 * gates are shut for good reason): each accepted quest whose next target no
 * road reaches from where the run last stood.
 */
export function questFindings(last: AppStoreState, step: number, detail: RunBreakDetail): RunFinding[] {
    const state = stuckStateOf(last, step);
    return unfinishableQuests(last as unknown as GameState).map((q) => ({
        kind: 'quest-unfinishable' as const,
        node: state.node,
        message: `quest '${q.questName}' needs ${q.targets.join(', ')}, which no road reaches from ${state.node}`,
        state,
        detail,
    }));
}

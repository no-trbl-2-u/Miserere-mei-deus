/**
 * The fight recorder (phase BE2c, acceptance A6): one live fight, stamped as
 * it is played and posted once when it ends.
 *
 * The `startCombat` and `beginHazardEncounter` bridges call `start` with what
 * the store knows before the first card (the foe, the player's level and
 * VITAE, the HP multiplier the foe was scaled by). The live fight then runs in
 * the combat panel's own state, so the panel hands each new state to
 * `observe`: every log entry it has not seen yet is stamped with milliseconds
 * since `start` and the player's VITAE at that moment, and the first state
 * gives the start deck. A state with a final outcome ends the fight; the
 * `endCombat` bridge ends one the panel never finished (a WITHDRAW). Either
 * way the `FightPost` goes out exactly once.
 *
 * The panel also reports three screen events (phase BE2d, A7) through
 * `screen`: a card staged, a card unstaged before it was played, and the card
 * detail popup opened. Each joins the same stream, stamped the same way, with
 * the VITAE last observed (a screen event changes no state).
 *
 * Nothing is recorded while the play-log gate is shut at `start`, and nothing
 * is posted when it has shut by the end. A failed post warns and is dropped
 * (BE1). Every number is a measurement for T; nothing here grades the game.
 *
 * Functions:
 *   endCombatOutcome(o)          the bridge's end outcome as the post's outcome
 *   createFightRecorder(deps)    start / observe / screen / end / isRecording
 *   fightRecorder                the app-wide instance
 */

import {
    PLAY_LOG_FIGHTS_PATH,
    type CombatEncounterState,
    type CombatOutcome,
    type FightPost,
    type PlayLogEvent,
    type PlayLogSource,
    type PlayLogUiEventKind,
} from '@mechanics';

import { playLogConfig, playLogSource, postPlayLog } from '@/lib/playLog';
import type { PuzzleApiConfig, PuzzleFetch } from '@/lib/puzzleAttempts';

/** What the bridge knows when the fight is staged. */
export interface FightStart {
    enemyId: string;
    playerLevel: number;
    enemyHpMultiplier: number;
    vitaeStart: number;
}

/** The slice of the panel's combat state the recorder reads. */
export type ObservedFight = Pick<CombatEncounterState, 'log' | 'player' | 'enemy' | 'deck' | 'turn' | 'finalOutcome'>;

/** The outcome the store's `endCombat` takes. */
export type EndCombatOutcome = 'victory' | 'defeat' | 'friendship' | 'flee';

export interface FightRecorder {
    /** Opens a recording (replacing any left open) when the gate is open; otherwise records nothing. */
    start(start: FightStart): void;
    /** Stamps the state's unseen log entries; a final outcome ends and posts the fight. */
    observe(state: ObservedFight): void;
    /** Adds a screen event for `cardId` to the open fight's stream; no-op when none is open. */
    screen(kind: PlayLogUiEventKind, cardId: string): void;
    /** Ends the open fight with `outcome` and posts it; resolves false when nothing was posted. */
    end(outcome: CombatOutcome): Promise<boolean>;
    isRecording(): boolean;
}

export interface FightRecorderDeps {
    now?: () => number;
    config?: () => PuzzleApiConfig | null;
    source?: () => PlayLogSource;
    fetcher?: PuzzleFetch;
}

/** The store's end outcome as a fight outcome: a befriending is mercy, a flee a retreat. */
export function endCombatOutcome(outcome: EndCombatOutcome): CombatOutcome {
    if (outcome === 'friendship') return 'mercy';
    if (outcome === 'flee') return 'retreat';
    return outcome;
}

interface Recording extends FightStart {
    startedAt: number;
    cursor: number;
    deck: string[] | null;
    turns: number;
    vitaeEnd: number;
    vitaeLow: number;
    events: PlayLogEvent[];
}

export function createFightRecorder(deps: FightRecorderDeps = {}): FightRecorder {
    const now = deps.now ?? Date.now;
    const config = deps.config ?? (() => playLogConfig());
    const source = deps.source ?? playLogSource;
    let open: Recording | null = null;

    const recorder: FightRecorder = {
        start(start) {
            open = config() === null
                ? null
                : { ...start, startedAt: now(), cursor: 0, deck: null, turns: 0, vitaeEnd: start.vitaeStart, vitaeLow: start.vitaeStart, events: [] };
        },

        observe(state) {
            const rec = open;
            // A fight this recording was not started for (a dev sandbox foe) is not ours.
            if (!rec || state.enemy.id !== rec.enemyId) return;
            rec.deck ??= [...state.deck];
            // The log only grows within a fight; a shorter one is the panel's fight begun again.
            if (state.log.length < rec.cursor) rec.cursor = 0;
            const vitae = state.player.health;
            const ms = Math.max(0, Math.round(now() - rec.startedAt));
            for (const event of state.log.slice(rec.cursor)) rec.events.push({ ...event, ms, vitae });
            rec.cursor = state.log.length;
            rec.turns = state.turn;
            rec.vitaeEnd = vitae;
            rec.vitaeLow = Math.min(rec.vitaeLow, vitae);
            if (state.finalOutcome) void recorder.end(state.finalOutcome);
        },

        screen(kind, cardId) {
            const rec = open;
            if (!rec) return;
            const ms = Math.max(0, Math.round(now() - rec.startedAt));
            rec.events.push({ kind, cardId, ms, vitae: rec.vitaeEnd });
        },

        async end(outcome) {
            const rec = open;
            open = null;
            if (!rec) return false;
            const cfg = config();
            if (cfg === null) return false;
            const post: FightPost = {
                ...source(),
                enemyId: rec.enemyId,
                playerLevel: rec.playerLevel,
                enemyHpMultiplier: rec.enemyHpMultiplier,
                outcome,
                turns: rec.turns,
                vitaeStart: rec.vitaeStart,
                vitaeEnd: rec.vitaeEnd,
                vitaeLow: rec.vitaeLow,
                deck: rec.deck ?? [],
                events: rec.events,
            };
            return postPlayLog(PLAY_LOG_FIGHTS_PATH, post, cfg, deps.fetcher);
        },

        isRecording() {
            return open !== null;
        },
    };
    return recorder;
}

/** The app's one recorder: the bridges start and end it, the combat panel feeds it. */
export const fightRecorder: FightRecorder = createFightRecorder();

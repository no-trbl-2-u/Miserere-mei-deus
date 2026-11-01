/**
 * The play log's gate and stamps (phase BE2b, acceptance A5). The fight
 * recorder and the deck-event poster (BE2c, BE2e) post only when
 * `playLogConfig()` returns a config, and stamp every post with
 * `getBuildCommit()` and `playSessionId()` (`playLogSource()`), through
 * `postPlayLog()`.
 *
 * Three conditions, all required: a dev-tools build, the BE1 API URL and
 * token baked in (`puzzleApiConfig()`, which already checks the first), and
 * the dev menu's "Card & combat logging" switch on. With any one false the
 * gate is shut: no request is made and nothing is buffered. The BE1 puzzle
 * poster keeps its own gate, untouched by the switch.
 */

import type {
    DeckEventPost,
    FightPost,
    PlayLogSource,
    PlayLogSourceKind,
    PlayRunEndPost,
    PlayRunPost,
    RunEventsPost,
} from '@mechanics';

import { puzzleApiConfig, puzzleAppBuild, type PuzzleApiConfig, type PuzzleFetch } from '@/lib/puzzleAttempts';
import { getBuildCommit, isDevToolsEnabled } from '@/lib/buildProfile';
import { devSettingsStore, type DevSettingsStore } from '@/state/dev/dev-settings';

/** Where and how to post the play log, or null when this build must send nothing. */
export function playLogConfig(store: DevSettingsStore = devSettingsStore): PuzzleApiConfig | null {
    if (!isDevToolsEnabled()) return null;
    if (!store.get().playLogging) return null;
    return puzzleApiConfig();
}

/** True only when a play-log post may be made right now. */
export function canSendPlayLog(store: DevSettingsStore = devSettingsStore): boolean {
    return playLogConfig(store) !== null;
}

/** A short random id: base-36 time plus random digits. Not a device id; it names one launch. */
export function mintSessionId(now: number = Date.now(), random: () => number = Math.random): string {
    const tail = Math.floor(random() * 36 ** 8).toString(36).padStart(8, '0');
    return `${now.toString(36)}-${tail}`;
}

let sessionId: string | null = null;

/** This launch's session id, minted on first read and the same for the life of the process. */
export function playSessionId(): string {
    sessionId ??= mintSessionId();
    return sessionId;
}

/** The stamps a play-log body carries: the build and session (`PlayLogSource`) plus who played it. */
export type PlayLogStamps = PlayLogSource & { source: PlayLogSourceKind };

/**
 * Who played this build (phase SM1b, acceptance A4): `human` only when the
 * build carries `EXPO_PUBLIC_PLAY_LOG_SOURCE=human`, which only the committed
 * `eas.json` preview profile sets; every other build (a web export, a dev
 * server T opens by hand, a jest run) is `harness`, so a forgotten harness can
 * never land in T's numbers. The app never sends `sim`: the headless run driver
 * stamps that itself. The name is written out in full because Expo inlines an
 * EXPO_PUBLIC_ value only where the literal `process.env.EXPO_PUBLIC_...` appears.
 */
export function playLogSourceKind(): PlayLogSourceKind {
    return process.env.EXPO_PUBLIC_PLAY_LOG_SOURCE?.trim() === 'human' ? 'human' : 'harness';
}

/**
 * Who is posting, from which build: the stamps every play-log body carries.
 * The solver is blank: no solver name is kept outside the puzzle screen. The
 * run id is not here: it is the save's, read from the store at each call site.
 */
export function playLogSource(): PlayLogStamps {
    return {
        solver: '',
        sessionId: playSessionId(),
        buildCommit: getBuildCommit(),
        appBuild: puzzleAppBuild(),
        source: playLogSourceKind(),
    };
}

function warnDropped(path: string, reason: string): void {
    // eslint-disable-next-line no-console
    console.warn(`[playLog] ${path} not posted (dropped): ${reason}`);
}

/**
 * Posts one play-log body (BE1's rule: no retry, no queue, no UI). Resolves
 * true on a 2xx; anything else warns and resolves false, never throws.
 */
export async function postPlayLog(
    path: string,
    body: FightPost | DeckEventPost | PlayRunPost | PlayRunEndPost | RunEventsPost,
    config: PuzzleApiConfig,
    fetcher: PuzzleFetch = fetch,
): Promise<boolean> {
    try {
        const res = await fetcher(`${config.url}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.token}` },
            body: JSON.stringify(body),
        });
        if (res.ok) return true;
        warnDropped(path, `HTTP ${res.status}`);
    } catch (err) {
        warnDropped(path, err instanceof Error ? err.message : String(err));
    }
    return false;
}

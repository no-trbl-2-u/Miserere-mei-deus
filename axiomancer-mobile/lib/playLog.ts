/**
 * The play log's gate and stamps (phase BE2b, acceptance A5). The fight
 * recorder and the deck-event poster (BE2c, BE2e) post only when
 * `playLogConfig()` returns a config, and stamp every post with
 * `getBuildCommit()` and `playSessionId()`.
 *
 * Three conditions, all required: a dev-tools build, the BE1 API URL and
 * token baked in (`puzzleApiConfig()`, which already checks the first), and
 * the dev menu's "Card & combat logging" switch on. With any one false the
 * gate is shut: no request is made and nothing is buffered. The BE1 puzzle
 * poster keeps its own gate, untouched by the switch.
 */

import { puzzleApiConfig, type PuzzleApiConfig } from '@/lib/puzzleAttempts';
import { isDevToolsEnabled } from '@/lib/buildProfile';
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

/**
 * The deck-event poster (phase BE2e, acceptance A8): one `DeckEventPost` for
 * each change to the run's deck.
 *
 * Four call sites post through it: the post-combat draft's claim (the cards
 * offered and the one picked, or a skip), the treasure cache's claim (its one
 * card, taken or passed over for the item haul), a removal at the rest site,
 * and the `resetRun` bridge (the deck the run ended with). Each body carries
 * the build commit and session id (`playLogSource()`), the deck after the
 * change and where it happened, and passes the play-log gate: with the gate
 * shut no request is made. A failed post warns and is dropped (BE1).
 *
 * Functions:
 *   runDeck(state)                 the deck the run would fight with now
 *   deckEventWhere(state, screen)  the node the player stands on, and the screen
 *   createDeckEventPoster(deps)    post(change)
 *   deckEventPoster                the app-wide instance
 */

import {
    buildCombatDeck,
    PLAY_LOG_DECK_EVENTS_PATH,
    type DeckEventPost,
    type DeckEventWhere,
    type GameState,
    type PlayLogSource,
} from '@mechanics';

import { playLogConfig, playLogSource, postPlayLog } from '@/lib/playLog';
import type { PuzzleApiConfig, PuzzleFetch } from '@/lib/puzzleAttempts';

/** One deck change, before the stamps. */
export type DeckChange = Omit<DeckEventPost, keyof PlayLogSource>;

/** The slice of the store a deck event reads. */
export type DeckEventState = Partial<Pick<GameState, 'player' | 'flags' | 'world'>>;

export interface DeckEventPoster {
    /** Posts one deck change; resolves false when the gate is shut or the post failed. */
    post(change: DeckChange): Promise<boolean>;
}

export interface DeckEventPosterDeps {
    config?: () => PuzzleApiConfig | null;
    source?: () => PlayLogSource;
    fetcher?: PuzzleFetch;
}

/** The deck the run would fight with now (the loadout, or every known card, plus rewards). */
export function runDeck(state: DeckEventState): string[] {
    return state.player ? buildCombatDeck(state.player, state.flags) : [];
}

/** Where a deck change happened: the node the player stands on (null off the map) and the screen. */
export function deckEventWhere(state: DeckEventState, screen: string): DeckEventWhere {
    const nodeId = state.world?.currentMap?.currentNode;
    return { nodeId: typeof nodeId === 'string' && nodeId.length > 0 ? nodeId : null, screen };
}

export function createDeckEventPoster(deps: DeckEventPosterDeps = {}): DeckEventPoster {
    const config = deps.config ?? (() => playLogConfig());
    const source = deps.source ?? playLogSource;
    return {
        async post(change) {
            const cfg = config();
            if (cfg === null) return false;
            return postPlayLog(PLAY_LOG_DECK_EVENTS_PATH, { ...source(), ...change }, cfg, deps.fetcher);
        },
    };
}

/** The app's one poster: the reward, cache, rest and run-reset call sites post through it. */
export const deckEventPoster: DeckEventPoster = createDeckEventPoster();

/**
 * The deck-event poster (phase BE2e, A8): each of the four call sites, the
 * combat draft's claim, the cache's claim, a card removed at a village and the
 * run reset,
 * posts one `DeckEventPost` the Worker's validator accepts, carrying the
 * build commit and session id and the deck after the change. A shut gate
 * makes no call; a failed post only warns.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
    COMBAT_REWARD_POOL,
    PLAY_LOG_DECK_EVENTS_PATH,
    validateDeckEventPost,
    type DeckEventPost,
    type GameState,
} from '@mechanics';

import { isDevToolsEnabled } from '@/lib/buildProfile';
import { createDeckEventPoster, deckEventRunId, deckEventWhere, runDeck, type DeckChange } from '@/lib/deckEvents';
import { playSessionId, type PlayLogStamps } from '@/lib/playLog';
import type { PuzzleApiConfig, PuzzleFetch } from '@/lib/puzzleAttempts';
import { createAppActions } from '@/state/actions';
import {
    beginLootCacheChoiceAction,
    chooseLootCacheChoiceOfferAction,
    claimLootCacheChoiceOutcomeAction,
} from '@/state/cache/store-actions';
import { claimCombatRewardAction, rollCombatRewardAction } from '@/state/combat/store-actions';
import { devSettingsStore } from '@/state/dev/dev-settings';
import {
    beginRestAction,
    chooseRestChoiceOfferAction,
    claimRestChoiceOutcomeAction,
} from '@/state/rest/store-actions';
import { createAppStore, EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';
import { removeVillageCardAction } from '@/state/village/store-actions';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

jest.mock('@/lib/buildProfile', () => ({
    isDevToolsEnabled: jest.fn(() => true),
    getBuildProfile: jest.fn(() => 'preview'),
    getBuildCommit: jest.fn(() => 'abc1234'),
}));

const devTools = isDevToolsEnabled as unknown as jest.Mock<() => boolean>;

const CONFIG: PuzzleApiConfig = { url: 'https://miserere-api.example.workers.dev', token: 'dev-token' };
const SOURCE: PlayLogStamps = { solver: '', sessionId: 'session-1', buildCommit: 'abc1234', appBuild: '1.0.0 preview', source: 'harness' };

type Call = { url: string; body: DeckEventPost };

let calls: Call[];
let fetchOk: boolean;
const realFetch = global.fetch;

function captureFetch(): PuzzleFetch {
    return async (url, init) => {
        calls.push({ url, body: JSON.parse(init.body) as DeckEventPost });
        return { ok: fetchOk, status: fetchOk ? 201 : 500 };
    };
}

/** Lets the call sites' un-awaited posts land. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const playerOf = (store: AppStore): NonNullable<GameState['player']> =>
    (store.getState() as unknown as GameState).player!;

/** A store with a twelve-card deck and coin enough for a cut. */
function storeWithDeck(): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const player = playerOf(store);
    store.setState({
        player: { ...player, knownCards: [...COMBAT_REWARD_POOL.slice(0, 12)], combatRewardCards: [], currency: 999 },
    } as never);
    return store;
}

/** The one deck event posted, checked against the Worker's validator. */
function onlyPost(): DeckEventPost {
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(`${CONFIG.url}${PLAY_LOG_DECK_EVENTS_PATH}`);
    const verdict = validateDeckEventPost(calls[0]!.body);
    expect(verdict.reasons).toEqual([]);
    expect(calls[0]!.body.buildCommit).toBe('abc1234');
    expect(calls[0]!.body.sessionId).toBe(playSessionId());
    // No jest run carries the human stamp (SM1b), so every call site posts as the harness.
    expect(calls[0]!.body.source).toBe('harness');
    return calls[0]!.body;
}

const runIdOf = (store: AppStore): string => (store.getState() as unknown as GameState).runId;

beforeEach(() => {
    calls = [];
    fetchOk = true;
    devTools.mockReturnValue(true);
    process.env.EXPO_PUBLIC_PUZZLE_API_URL = `${CONFIG.url}/`;
    process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN = CONFIG.token;
    global.fetch = captureFetch() as unknown as typeof fetch;
});

afterEach(() => {
    delete process.env.EXPO_PUBLIC_PUZZLE_API_URL;
    delete process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN;
    global.fetch = realFetch;
    jest.restoreAllMocks();
});

describe('createDeckEventPoster', () => {
    const change: DeckChange = {
        kind: 'remove', cardId: 'strike', offered: null, deck: ['guard'], where: { nodeId: 'n1', screen: 'rest' }, runId: 'run-1',
    };

    it('stamps the change with the source and posts it to /v1/deck-events', async () => {
        const poster = createDeckEventPoster({ config: () => CONFIG, source: () => SOURCE, fetcher: captureFetch() });
        await expect(poster.post(change)).resolves.toBe(true);
        expect(calls).toEqual([{ url: `${CONFIG.url}${PLAY_LOG_DECK_EVENTS_PATH}`, body: { ...SOURCE, ...change } }]);
    });

    it('makes no call when the gate is shut', async () => {
        const poster = createDeckEventPoster({ config: () => null, source: () => SOURCE, fetcher: captureFetch() });
        await expect(poster.post(change)).resolves.toBe(false);
        expect(calls).toEqual([]);
    });

    it('a failed post warns and resolves false, never throws', async () => {
        fetchOk = false;
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const poster = createDeckEventPoster({ config: () => CONFIG, source: () => SOURCE, fetcher: captureFetch() });
        await expect(poster.post(change)).resolves.toBe(false);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('dropped'));
    });
});

describe('runDeck and deckEventWhere', () => {
    it('read the run deck and the node the player stands on', () => {
        const state = storeWithDeck().getState() as unknown as GameState;
        expect(runDeck(state)).toEqual(COMBAT_REWARD_POOL.slice(0, 12));
        expect(deckEventWhere(state, 'rest')).toEqual({ nodeId: state.world.currentMap.currentNode, screen: 'rest' });
        expect(runDeck({})).toEqual([]);
        expect(deckEventWhere({}, 'cache')).toEqual({ nodeId: null, screen: 'cache' });
    });

    it('deckEventRunId reads the save run id, and is null when the state carries none', () => {
        const state = storeWithDeck().getState() as unknown as GameState;
        expect(deckEventRunId(state)).toBe(state.runId);
        expect(deckEventRunId({})).toBeNull();
        expect(deckEventRunId({ runId: '' })).toBeNull();
    });
});

describe('the run id on every call site (SM1b, A5)', () => {
    it('a reward and the cache claim after it share the store run id', async () => {
        const store = storeWithDeck();
        const runId = runIdOf(store);
        claimCombatRewardAction(store, rollCombatRewardAction(store)[0]!);
        beginLootCacheChoiceAction(store, { seed: 7 });
        chooseLootCacheChoiceOfferAction(store, 'card');
        claimLootCacheChoiceOutcomeAction(store);
        await flush();
        expect(calls.map((c) => c.body.runId)).toEqual([runId, runId]);
        expect(runId.length).toBeGreaterThan(0);
    });

    it('a village removal carries the run id', async () => {
        const store = storeWithDeck();
        store.setState({
            event: {
                ...EMPTY_EVENT_SLICE,
                pending: {
                    state: undefined as never,
                    event: { kind: 'village', villageName: 'V', merchants: [], cardShop: { cardIds: [], price: 6 } },
                },
            },
        });
        removeVillageCardAction(store, COMBAT_REWARD_POOL[0]!);
        await flush();
        expect(onlyPost().runId).toBe(runIdOf(store));
    });

    it('the run-end event carries the run that ended, and a reset then changes the id', async () => {
        const store = storeWithDeck();
        const before = runIdOf(store);
        createAppActions(store).resetRun({ keepCharacter: true });
        await flush();
        expect(onlyPost().runId).toBe(before);
        expect(runIdOf(store)).not.toBe(before);
    });
});

describe('the four call sites', () => {
    it('a combat reward pick posts the offer, the pick and the deck after it', async () => {
        const store = storeWithDeck();
        const offers = rollCombatRewardAction(store);
        claimCombatRewardAction(store, offers[1]!);
        await flush();
        const post = onlyPost();
        expect(post).toMatchObject({ kind: 'reward', cardId: offers[1], offered: [...offers] });
        expect(post.where.screen).toBe('combat-reward');
        expect(post.deck).toEqual([...COMBAT_REWARD_POOL.slice(0, 12), offers[1]]);
    });

    it('a combat reward skip posts the offer with no card, once', async () => {
        const store = storeWithDeck();
        const offers = rollCombatRewardAction(store);
        claimCombatRewardAction(store, null);
        claimCombatRewardAction(store, null);
        await flush();
        expect(onlyPost()).toMatchObject({ kind: 'reward', cardId: null, offered: [...offers] });
    });

    it('a cache card taken posts a cache reward with that card', async () => {
        const store = storeWithDeck();
        beginLootCacheChoiceAction(store, { seed: 7 });
        const candidate = store.getState().cache.session!.cardCandidate;
        chooseLootCacheChoiceOfferAction(store, 'card');
        expect(claimLootCacheChoiceOutcomeAction(store).applied).toBe(true);
        await flush();
        const post = onlyPost();
        expect(post).toMatchObject({ kind: 'cache-reward', cardId: candidate, offered: [candidate] });
        expect(post.deck).toContain(candidate);
        expect(post.where.screen).toBe('cache');
    });

    it('a cache card passed over for the items posts a skip', async () => {
        const store = storeWithDeck();
        beginLootCacheChoiceAction(store, { seed: 7 });
        const candidate = store.getState().cache.session!.cardCandidate;
        chooseLootCacheChoiceOfferAction(store, 'item');
        claimLootCacheChoiceOutcomeAction(store);
        await flush();
        expect(onlyPost()).toMatchObject({ kind: 'cache-reward', cardId: null, offered: [candidate] });
    });

    it('a card removed at a village posts the removed card and the smaller deck', async () => {
        const store = storeWithDeck();
        store.setState({
            event: {
                ...EMPTY_EVENT_SLICE,
                pending: {
                    state: undefined as never,
                    event: { kind: 'village', villageName: 'V', merchants: [], cardShop: { cardIds: [], price: 6 } },
                },
            },
        });
        const cut = COMBAT_REWARD_POOL[0]!;
        expect(removeVillageCardAction(store, cut).ok).toBe(true);
        await flush();
        const post = onlyPost();
        expect(post).toMatchObject({ kind: 'remove', cardId: cut, offered: null });
        expect(post.deck).toHaveLength(11);
        expect(post.where.screen).toBe('village');
    });

    it('a rest node posts nothing: it removes no card', async () => {
        const store = storeWithDeck();
        beginRestAction(store, { seed: 3 });
        chooseRestChoiceOfferAction(store, 'rest');
        claimRestChoiceOutcomeAction(store);
        await flush();
        expect(calls).toEqual([]);
    });

    it('a run reset posts the deck the run ended with', async () => {
        const store = storeWithDeck();
        createAppActions(store).resetRun({ keepCharacter: true });
        await flush();
        const post = onlyPost();
        expect(post).toMatchObject({ kind: 'run-end', cardId: null, offered: null });
        expect(post.deck).toEqual(COMBAT_REWARD_POOL.slice(0, 12));
        expect(post.where.screen).toBe('run-end');
    });

    it('a first death in a fight posts no run-end; the death while dying posts one', async () => {
        const store = storeWithDeck();
        const actions = createAppActions(store);
        actions.moveTo('bw-w2');
        expect(actions.playerDied('fight')).toBe('revived');
        await flush();
        expect(calls).toEqual([]);

        actions.moveTo('bw-w2');
        expect(actions.playerDied('fight')).toBe('run-over');
        await flush();
        const post = onlyPost();
        expect(post).toMatchObject({ kind: 'run-end', cardId: null, offered: null });
        expect(post.deck).toEqual(COMBAT_REWARD_POOL.slice(0, 12));
    });

    it('with the switch off, no call site makes a request', async () => {
        await devSettingsStore.set({ playLogging: false });
        try {
            const store = storeWithDeck();
            claimCombatRewardAction(store, rollCombatRewardAction(store)[0]!);
            createAppActions(store).resetRun({ keepCharacter: true });
            await flush();
            expect(calls).toEqual([]);
        } finally {
            await devSettingsStore.set({ playLogging: true });
        }
    });

    it('in a build without dev tools, no call site makes a request', async () => {
        devTools.mockReturnValue(false);
        const store = storeWithDeck();
        claimCombatRewardAction(store, rollCombatRewardAction(store)[0]!);
        await flush();
        expect(calls).toEqual([]);
    });
});

/**
 * The run log's call sites (phase SM1d, A8): a run start, a node entered, a
 * fight, a rest upgrade and a run end post the open, the events in `seq`
 * order, the `upgrade` deck event and the close under a mocked fetch. Each
 * site is pinned on its own; a shut gate makes no call and a failed post only
 * warns.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
    CHARACTER_ROSTER,
    getRng,
    getHazardPuzzleLayout,
    initializeCombatEncounter,
    COMBAT_REWARD_POOL,
    ENEMY_REGISTRY,
    HAZARD_CRACK_CARD,
    PLAY_LOG_DECK_EVENTS_PATH,
    PLAY_RUNS_PATH,
    RUN_EVENTS_PATH,
    legalMovesFrom,
    relicLibrary,
    playRunEndPath,
    validateDeckEventPost,
    validatePlayRunEndPost,
    validatePlayRunPost,
    validateRunEventsPost,
    type CombatOutcome,
    type DeckEventPost,
    type GameState,
    type HazardHandEntry,
    type PlayRunEndPost,
    type PlayRunPost,
    type RunEvent,
    type RunEventsPost,
} from '@mechanics';

import { isDevToolsEnabled } from '@/lib/buildProfile';
import { runLogPoster } from '@/lib/runLog';
import { applyHazardOutcome } from '@/components/combat/encounter/CombatEncounterPanel';
import { createAppActions, type AppActions } from '@/state/actions';
import { beginBlacksmithAction } from '@/state/blacksmith/store-actions';
import { beginLootCacheChoiceAction, chooseLootCacheChoiceOfferAction, claimLootCacheChoiceOutcomeAction } from '@/state/cache/store-actions';
import { claimCombatUpgradeAction } from '@/state/combat/store-actions';
import { offerItemRewardAction, confirmItemRewardAction } from '@/state/item-reward/store-actions';
import { startNewGameAction } from '@/state/menu/store-actions';
import { createMemorySlotStore } from '@/state/persistence/memorySlotStore';
import { offerCompletedQuestExtrasAction } from '@/state/quest/store-actions';
import { beginRestAction, chooseRestChoiceOfferAction, claimRestChoiceOutcomeAction, pickRestChoiceUpgradeAction } from '@/state/rest/store-actions';
import { createAppStore, type AppStore } from '@/state/store';
import { createFixtureStore } from '@/test-utils/fixtureStore';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { acceptFixtureStep, fillFixtureStep, registerFixtureQuestline, unregisterFixtureQuestline, FIXTURE_LINE, FIXTURE_NODES } from '@/test-utils/questlineFixture';
import { arriveAtRealFight, startRealFight } from '@/test-utils/realFight';
import { settledBreakwater } from '@/test-utils/settledBreakwater';

jest.mock('@/lib/buildProfile', () => ({
    isDevToolsEnabled: jest.fn(() => true),
    getBuildProfile: jest.fn(() => 'preview'),
    getBuildCommit: jest.fn(() => 'abc1234'),
}));

const devTools = isDevToolsEnabled as unknown as jest.Mock<() => boolean>;

const URL = 'https://miserere-api.example.workers.dev';

type Call = { url: string; body: unknown };

let calls: Call[];
let fetchOk: boolean;
const realFetch = global.fetch;

/** Run ids come from the engine's RNG, which fixtures reseed: give every test its own, so no two share a run. */
let rngSeed = 7000;

beforeEach(() => {
    getRng().setState(rngSeed++);
    calls = [];
    fetchOk = true;
    devTools.mockReturnValue(true);
    process.env.EXPO_PUBLIC_PUZZLE_API_URL = URL;
    process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN = 'dev-token';
    global.fetch = (async (url: string, init: { body: string }) => {
        calls.push({ url: url.replace(URL, ''), body: JSON.parse(init.body) });
        return { ok: fetchOk, status: fetchOk ? 201 : 500 };
    }) as unknown as typeof fetch;
});

afterEach(() => {
    delete process.env.EXPO_PUBLIC_PUZZLE_API_URL;
    delete process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN;
    global.fetch = realFetch;
    jest.restoreAllMocks();
});

/** Lets every un-awaited post land: the run log's own chain, then the deck-event poster's. */
async function landed(): Promise<void> {
    await runLogPoster.settled();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await runLogPoster.settled();
}

const gs = (store: AppStore): GameState => store.getState() as unknown as GameState;

const posts = <T,>(path: string): T[] => calls.filter((c) => c.url === path).map((c) => c.body as T);

/** Every event the run posted, flattened across batches in the order they landed. */
function events(): RunEvent[] {
    return posts<RunEventsPost>(RUN_EVENTS_PATH).flatMap((b) => b.events);
}

const kinds = (): string[] => events().map((e) => e.kind);

function eventsOf<K extends RunEvent['kind']>(kind: K): Extract<RunEvent, { kind: K }>[] {
    return events().filter((e): e is Extract<RunEvent, { kind: K }> => e.kind === kind);
}

/** A fresh app store with a twelve-card deck and coin to spend. */
function richStore(): { store: AppStore; actions: AppActions } {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const { player } = store.getState();
    store.setState({
        player: { ...player, knownCards: [...COMBAT_REWARD_POOL.slice(0, 12)], combatRewardCards: [], currency: 999 },
    } as never);
    return { store, actions: createAppActions(store) };
}

/** A new game as a roster character on an app store, as character select's CONFIRM starts one. */
function newGame(): { store: AppStore; actions: AppActions; runId: string } {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const characterId = CHARACTER_ROSTER[0]!.id;
    startNewGameAction(store, createMemorySlotStore(), 1, undefined, characterId, CHARACTER_ROSTER);
    return { store, actions: createAppActions(store), runId: gs(store).runId };
}

/** Walks to the first legal road out of the node underfoot. */
function walkOn(store: AppStore, actions: AppActions): string {
    const next = legalMovesFrom(gs(store).world.currentMap)[0]!;
    expect(actions.moveTo(next).moved).toBe(true);
    return next;
}

/** The foe and finished fight of the Breakwater's first encounter, to settle on another store. */
function firstFight() {
    const { enemy, combat } = startRealFight();
    return { enemy, combat };
}

describe('a run, from its start to its end', () => {
    it('posts the open, the events in seq order, the upgrade deck event and the close', async () => {
        const { store, actions, runId } = newGame();
        const first = walkOn(store, actions);
        const second = walkOn(store, actions);

        const { enemy, combat } = firstFight();
        actions.startCombat(enemy);
        applyHazardOutcome(store, 'victory' as CombatOutcome, combat, enemy);

        const player = gs(store).player;
        store.setState({ player: { ...player, knownCards: [...COMBAT_REWARD_POOL.slice(0, 12)], combatRewardCards: [] } } as never);
        expect(beginRestAction(store, { seed: 5 })).toBe(true);
        chooseRestChoiceOfferAction(store, 'upgrade');
        const target = store.getState().rest.session!.upgradableCardIds[0]!;
        pickRestChoiceUpgradeAction(store, target);
        const upgraded = claimRestChoiceOutcomeAction(store).upgradedToCardId!;

        const deckAtEnd = [...gs(store).player.knownCards];
        actions.resetRun({ keepCharacter: true });
        await landed();

        // The open: the run, the character it opened as and the deck it began with.
        const [open] = posts<PlayRunPost>(PLAY_RUNS_PATH);
        expect(posts(PLAY_RUNS_PATH)).toHaveLength(1);
        expect(validatePlayRunPost(open).reasons).toEqual([]);
        expect(open).toMatchObject({ runId, characterId: CHARACTER_ROSTER[0]!.id, policyId: null, source: 'harness' });
        expect(open!.startDeck.length).toBeGreaterThan(0);
        expect(calls.findIndex((c) => c.url === PLAY_RUNS_PATH)).toBeLessThan(calls.findIndex((c) => c.url === RUN_EVENTS_PATH));

        // The events: every batch validates, `seq` rises from 0 without a gap, in the order they happened.
        for (const batch of posts<RunEventsPost>(RUN_EVENTS_PATH)) {
            expect(validateRunEventsPost(batch).reasons).toEqual([]);
            expect(batch.runId).toBe(runId);
        }
        expect(events().map((e) => e.seq)).toEqual(events().map((_, i) => i));
        // The foe's drops depend on the roll; they are logged against the fight when there are any.
        expect(kinds().filter((k) => k !== 'item-gained')).toEqual([
            'node-entered', 'node-entered', 'node-resolved', 'xp-gained', 'node-resolved',
        ]);
        expect(eventsOf('item-gained').every((e) => e.payload.from === 'fight')).toBe(true);
        expect(eventsOf('node-entered').map((e) => e.payload.nodeId)).toEqual([first, second]);
        expect(eventsOf('node-resolved').map((e) => e.payload.choice)).toEqual(['fight', 'upgrade']);
        expect(eventsOf('xp-gained')[0]!.payload).toMatchObject({ from: 'fight' });
        expect(eventsOf('xp-gained')[0]!.payload.amount).toBeGreaterThan(0);

        // The upgrade deck event: the card before in cardId, the card after in offered.
        const upgrade = posts<DeckEventPost>(PLAY_LOG_DECK_EVENTS_PATH).find((d) => d.kind === 'upgrade')!;
        expect(validateDeckEventPost(upgrade).reasons).toEqual([]);
        expect(upgrade).toMatchObject({ cardId: target, offered: [upgraded], runId, where: { screen: 'rest' } });

        // The close: last, once, with the run as it stood before the reset.
        const closes = calls.filter((c) => c.url === playRunEndPath(runId));
        expect(closes).toHaveLength(1);
        expect(calls[calls.length - 1]).toBe(closes[0]);
        const end = closes[0]!.body as PlayRunEndPost;
        expect(validatePlayRunEndPost(end).reasons).toEqual([]);
        expect(end).toMatchObject({ outcome: 'reset', endNodeId: second, endDeck: deckAtEnd });
        expect(end.level).toBeGreaterThanOrEqual(1);
    });

    it('makes no call at all while the gate is shut', async () => {
        devTools.mockReturnValue(false);
        const { store, actions } = newGame();
        walkOn(store, actions);
        const { enemy, combat } = firstFight();
        actions.startCombat(enemy);
        applyHazardOutcome(store, 'victory' as CombatOutcome, combat, enemy);
        actions.resetRun({ keepCharacter: true });
        await landed();
        expect(calls).toEqual([]);
    });

    it('a failed post only warns, and the game goes on', async () => {
        fetchOk = false;
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const { store, actions } = newGame();
        walkOn(store, actions);
        walkOn(store, actions);
        actions.resetRun({ keepCharacter: true });
        await landed();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('dropped'));
        expect(gs(store).runId).toBeTruthy();
    });
});

describe('the run start (character select CONFIRM, a new game)', () => {
    it('opens the run as the chosen character with the deck it was dealt', async () => {
        const { store, runId } = newGame();
        await landed();
        const [open] = posts<PlayRunPost>(PLAY_RUNS_PATH);
        expect(open).toMatchObject({ runId, characterId: gs(store).player.characterId });
        expect(open!.startDeck).toEqual(gs(store).player.knownCards);
    });
});

describe('moveTo', () => {
    it('logs the node entered with its map and authored kind, one batch per node', async () => {
        const { store, actions } = newGame();
        const first = walkOn(store, actions);
        const second = walkOn(store, actions);
        await landed();
        // The first node's batch went out when the second was entered; the second waits for the next flush.
        expect(posts<RunEventsPost>(RUN_EVENTS_PATH).map((b) => b.events.map((e) => e.kind))).toEqual([['node-entered']]);
        const entered = eventsOf('node-entered')[0]!.payload;
        expect(entered).toMatchObject({ map: gs(store).world.currentMap.name, nodeId: first });
        expect(second).not.toBe(first);
    });

    it('logs nothing for a road that is not legal', async () => {
        const { actions } = newGame();
        expect(actions.moveTo('not-a-node').moved).toBe(false);
        await landed();
        expect(kinds()).toEqual([]);
    });
});

describe('the fight', () => {
    it('logs the node as fought and the XP the win paid, against the run', async () => {
        const { store, actions, runId } = newGame();
        walkOn(store, actions);
        const { enemy, combat } = firstFight();
        actions.startCombat(enemy);
        applyHazardOutcome(store, 'victory' as CombatOutcome, combat, enemy);
        const paid = gs(store).player.experience;
        actions.resetRun({ keepCharacter: true });
        await landed();
        expect(eventsOf('node-resolved').map((e) => e.payload.choice)).toEqual(['fight']);
        expect(eventsOf('xp-gained').map((e) => e.payload)).toEqual([{ amount: paid, from: 'fight' }]);
        expect(paid).toBeGreaterThan(0);
        // The node-resolved event carries the player after the node (SM2a).
        const { level, health } = gs(store).player;
        expect(eventsOf('node-resolved').map((e) => e.payload)).toEqual([
            expect.objectContaining({ choice: 'fight', level, vitae: health }),
        ]);
        expect(posts<RunEventsPost>(RUN_EVENTS_PATH).every((b) => b.runId === runId)).toBe(true);
    });

    it('logs a defeat as a fight with no XP', async () => {
        const { store, actions } = newGame();
        walkOn(store, actions);
        const { enemy, combat } = firstFight();
        actions.startCombat(enemy);
        applyHazardOutcome(store, 'defeat' as CombatOutcome, combat, enemy);
        actions.resetRun({ keepCharacter: true });
        await landed();
        expect(eventsOf('node-resolved').map((e) => e.payload.choice)).toEqual(['fight']);
        expect(eventsOf('xp-gained')).toEqual([]);
    });

    it('logs a withdrawal as a flee, not a fight', async () => {
        const { store, actions } = newGame();
        walkOn(store, actions);
        const { enemy } = firstFight();
        actions.startCombat(enemy);
        actions.fleeEncounter();
        actions.endCombat('flee');
        actions.resetRun({ keepCharacter: true });
        await landed();
        expect(eventsOf('node-resolved').map((e) => e.payload.choice)).toEqual(['flee']);
        expect(eventsOf('xp-gained')).toEqual([]);
    });

    it('logs the prelude flee as a flee on the node fled', async () => {
        const { actions, fixture } = arriveAtRealFight();
        actions.pickEventChoice('flee');
        actions.resetRun({ keepCharacter: true });
        await landed();
        expect(eventsOf('node-resolved').map((e) => e.payload)).toEqual([
            expect.objectContaining({ nodeId: 'bw-w2', choice: 'flee' }),
        ]);
        expect(fixture.id).toBe('real-fight-apprentice-bw-w2');
    });
});

describe('levels', () => {
    it('logs a level reached with no stat, then the stat each banked point goes to', async () => {
        const { store, actions } = newGame();
        const player = gs(store).player;
        store.setState({ player: { ...player, experience: player.experienceToNextLevel } } as never);
        actions.levelUp();
        const reached = gs(store).player.level;
        expect(reached).toBe(player.level + 1);
        expect(actions.allocateStatPoint('mind')).toBeGreaterThanOrEqual(0);
        actions.resetRun({ keepCharacter: true });
        await landed();
        expect(eventsOf('level-up').map((e) => e.payload)).toEqual([
            { level: reached, stat: null },
            { level: reached, stat: 'mind' },
        ]);
    });

    it('logs no level-up for a stat point that was not there to spend', async () => {
        const { store, actions } = newGame();
        const player = gs(store).player;
        store.setState({ player: { ...player, availableStatPoints: 0 } } as never);
        actions.allocateStatPoint('heart');
        actions.resetRun({ keepCharacter: true });
        await landed();
        expect(eventsOf('level-up')).toEqual([]);
    });
});

describe('the rest', () => {
    it('logs the rest option taken, and no upgrade for a plain rest', async () => {
        const { store, actions } = richStore();
        expect(beginRestAction(store, { seed: 5 })).toBe(true);
        chooseRestChoiceOfferAction(store, 'rest');
        claimRestChoiceOutcomeAction(store);
        actions.resetRun({ keepCharacter: true });
        await landed();
        expect(eventsOf('node-resolved').map((e) => e.payload.choice)).toEqual(['rest']);
        expect(posts<DeckEventPost>(PLAY_LOG_DECK_EVENTS_PATH).map((d) => d.kind)).toEqual(['run-end']);
    });
});

describe('the cache', () => {
    it('logs the offer taken and each item of the haul', async () => {
        const { store, actions } = richStore();
        beginLootCacheChoiceAction(store, { seed: 7 });
        chooseLootCacheChoiceOfferAction(store, 'item');
        const haul = claimLootCacheChoiceOutcomeAction(store).outcome!.items;
        actions.resetRun({ keepCharacter: true });
        await landed();
        expect(eventsOf('node-resolved').map((e) => e.payload.choice)).toEqual(['item']);
        const gained = eventsOf('item-gained').map((e) => e.payload);
        expect(gained.map((g) => g.itemId)).toEqual(haul.map((i) => i.id));
        expect(gained.every((g) => g.from === 'cache' && g.slot.length > 0)).toBe(true);
    });

    it('logs the card offer as the offer taken, with no item', async () => {
        const { store, actions } = richStore();
        beginLootCacheChoiceAction(store, { seed: 7 });
        chooseLootCacheChoiceOfferAction(store, 'card');
        claimLootCacheChoiceOutcomeAction(store);
        actions.resetRun({ keepCharacter: true });
        await landed();
        expect(eventsOf('node-resolved').map((e) => e.payload.choice)).toEqual(['card']);
        expect(eventsOf('item-gained')).toEqual([]);
    });
});

describe('the blacksmith', () => {
    it('logs an upgrade as a deck change, the card before and the card after', async () => {
        const { store, actions } = richStore();
        expect(beginBlacksmithAction(store, { seed: 7 })).toBe(true);
        actions.startBlacksmithForging();
        actions.chooseBlacksmithCardUpgrade();
        const target = store.getState().blacksmith.session!.upgradableCardIds[0]!;
        actions.pickBlacksmithCardUpgrade(target);
        actions.continueBlacksmithCard();
        actions.leaveBlacksmith();
        const upgraded = actions.claimBlacksmithOutcome().upgradedToCardId!;
        actions.resetRun({ keepCharacter: true });
        await landed();
        expect(eventsOf('node-resolved').map((e) => e.payload.choice)).toEqual(['upgrade']);
        const upgrade = posts<DeckEventPost>(PLAY_LOG_DECK_EVENTS_PATH).find((d) => d.kind === 'upgrade')!;
        expect(upgrade).toMatchObject({ cardId: target, offered: [upgraded], where: { screen: 'blacksmith' } });
    });

    it('logs a visit that changed nothing as a leave', async () => {
        const { store, actions } = richStore();
        beginBlacksmithAction(store, { seed: 7 });
        actions.startBlacksmithForging();
        actions.leaveBlacksmith();
        actions.claimBlacksmithOutcome();
        actions.resetRun({ keepCharacter: true });
        await landed();
        expect(eventsOf('node-resolved').map((e) => e.payload.choice)).toEqual(['leave']);
        expect(posts<DeckEventPost>(PLAY_LOG_DECK_EVENTS_PATH).map((d) => d.kind)).toEqual(['run-end']);
    });
});

describe('the elite upgrade', () => {
    it('logs the upgrade taken instead of a card', async () => {
        const { store, actions } = richStore();
        const from = gs(store).player.knownCards[0]!;
        store.setState({ combatReward: { offers: [], claimed: false, upgrade: { fromCardId: from, toCardId: `${from}+` } } } as never);
        claimCombatUpgradeAction(store, from);
        actions.resetRun({ keepCharacter: true });
        await landed();
        const upgrade = posts<DeckEventPost>(PLAY_LOG_DECK_EVENTS_PATH).find((d) => d.kind === 'upgrade')!;
        expect(upgrade).toMatchObject({ cardId: from, offered: [`${from}+`], where: { screen: 'combat-reward' } });
    });
});

describe('the item reward', () => {
    it('logs the item that came into the pack, its slot, and what handed it over', async () => {
        const { store, actions } = richStore();
        const relic = relicLibrary[0]!;
        offerItemRewardAction(store, relic, { source: 'elite' });
        confirmItemRewardAction(store);
        actions.resetRun({ keepCharacter: true });
        await landed();
        expect(eventsOf('item-gained').map((e) => e.payload)).toEqual([{ itemId: relic.id, slot: relic.slot, from: 'elite' }]);
    });
});

describe('the hazard', () => {
    function driveFailingCrossing(store: AppStore, actions: AppActions): void {
        actions.beginHazard({ seed: 9, hazardId: 'cracked-cliff' });
        actions.selectHazardRoute('risk');
        actions.finishHazardRolling();
        for (let r = 0; r < 3; r++) {
            const s = store.getState().hazard.session!;
            const hand: HazardHandEntry[] = [{ uid: `t${s.round}-0`, cardId: HAZARD_CRACK_CARD.id, dieId: null }];
            store.setState({ hazard: { session: { ...s, hand, play: [] } } });
            for (const h of store.getState().hazard.session!.hand.slice()) actions.stageHazardCard(h.uid);
            actions.resolveHazardRound();
            actions.continueHazardAfterResolve();
        }
        actions.acknowledgeHazardOutcome();
    }

    function onHazardNode() {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: settledBreakwater('bw-w2') } });
        const actions = createAppActions(store);
        actions.moveTo('bw-w3');
        return { store, actions, runId: gs(store).runId };
    }

    it('logs a survived crossing with the VITAE either side of it', async () => {
        const { store, actions } = onHazardNode();
        const p = gs(store).player;
        store.setState({ player: { ...p, health: 40, maxHealth: 40 } } as never);
        driveFailingCrossing(store, actions);
        const claim = actions.claimHazardRewards(null);
        expect(claim.died).toBe(false);
        actions.resetRun({ keepCharacter: true });
        await landed();
        const ended = eventsOf('hazard-ended')[0]!.payload;
        expect(ended).toMatchObject({ hazardId: 'cracked-cliff', cleared: false, vitaeBefore: 40 });
        expect(ended.vitaeAfter).toBeLessThan(40);
        expect(eventsOf('node-resolved').map((e) => e.payload.choice)).toEqual(['hazard-failed']);
    });

    it('logs a fatal crossing against the run it killed, and a death while dying closes that run as run-over', async () => {
        const { store, actions, runId } = onHazardNode();
        const p = gs(store).player;
        store.setState({ player: { ...p, health: 15, maxHealth: 15 } } as never);
        driveFailingCrossing(store, actions);
        expect(actions.claimHazardRewards(null).outcome).toBe('revived');
        await landed();
        expect(calls.filter((c) => c.url === playRunEndPath(runId))).toHaveLength(0);

        actions.moveTo('bw-w3');
        driveFailingCrossing(store, actions);
        expect(actions.claimHazardRewards(null).outcome).toBe('run-over');
        await landed();

        const fatal = eventsOf('hazard-ended').map((e) => e.payload);
        expect(fatal).toHaveLength(2);
        expect(fatal.every((h) => h.cleared === false)).toBe(true);
        // The revive leaves the player at the VITAE the death rule gave; the run over leaves none.
        expect(fatal.map((h) => h.vitaeAfter)).toEqual([1, 0]);
        expect(posts<RunEventsPost>(RUN_EVENTS_PATH).every((b) => b.runId === runId)).toBe(true);
        const closes = calls.filter((c) => c.url === playRunEndPath(runId));
        expect(closes).toHaveLength(1);
        expect((closes[0]!.body as PlayRunEndPost).outcome).toBe('run-over');
        expect(gs(store).runId).not.toBe(runId);
    });
});

describe('the hazard puzzle', () => {
    const LAYOUT = getHazardPuzzleLayout('demo-cliff-easy');

    it('logs a completed puzzle: the VITAE either side of it, the clear and the loot', async () => {
        const { store, actions } = richStore();
        const p = gs(store).player;
        store.setState({ player: { ...p, health: 40, maxHealth: 40 } } as never);
        actions.claimHazardPuzzle(LAYOUT, 'safe', 1, 11);
        actions.resetRun({ keepCharacter: true });
        await landed();
        const ended = eventsOf('hazard-ended')[0]!.payload;
        expect(ended).toMatchObject({ hazardId: LAYOUT.id, cleared: true, vitaeBefore: 40, vitaeAfter: 40 });
        expect(eventsOf('node-resolved').map((e) => e.payload.choice)).toEqual(['hazard-cleared']);
        expect(eventsOf('item-gained').every((e) => e.payload.from === 'hazard')).toBe(true);
    });

    it('logs a short crossing: VITAE lost and the failed resolution', async () => {
        const { store, actions } = richStore();
        const p = gs(store).player;
        store.setState({ player: { ...p, health: 40, maxHealth: 40 } } as never);
        actions.claimHazardPuzzle(LAYOUT, 'safe', 0.2, 11);
        actions.resetRun({ keepCharacter: true });
        await landed();
        const ended = eventsOf('hazard-ended')[0]!.payload;
        expect(ended).toMatchObject({ hazardId: LAYOUT.id, cleared: false, vitaeBefore: 40 });
        expect(ended.vitaeAfter).toBeLessThan(40);
        expect(eventsOf('node-resolved').map((e) => e.payload.choice)).toEqual(['hazard-failed']);
    });
});

describe('the quest', () => {
    const fixtureOpen = (id: string, node: number) => {
        const handle = createFixtureStore({
            id, seed: id, world: { continent: 'coastal-continent', map: 'breakwater', node: FIXTURE_NODES[node - 1] ?? FIXTURE_NODES[0] },
        });
        handle.actions.resolveCurrentMapEvent(undefined, { kind: 'quest', questline: FIXTURE_LINE, node });
        return handle;
    };

    it('logs the step accepted on the quest node', async () => {
        registerFixtureQuestline();
        try {
            const { actions } = fixtureOpen('sm1d-quest-accept', 1);
            expect(actions.acceptQuestStep()).toBe(true);
            actions.resetRun({ keepCharacter: true });
            await landed();
            expect(eventsOf('node-resolved').map((e) => e.payload)).toEqual([
                expect.objectContaining({ nodeId: FIXTURE_NODES[0], choice: 'accept' }),
            ]);
            expect(eventsOf('quest-step').map((e) => e.payload)).toEqual([
                { questId: FIXTURE_LINE, stepId: '1', action: 'accept' },
            ]);
        } finally {
            unregisterFixtureQuestline();
        }
    });

    it('logs a turn-in with the XP it paid', async () => {
        registerFixtureQuestline();
        try {
            const { store, actions } = fixtureOpen('sm1d-quest-turn-in', 2);
            acceptFixtureStep(store, 1);
            fillFixtureStep(store, 1);
            actions.resolveCurrentMapEvent(undefined, { kind: 'quest', questline: FIXTURE_LINE, node: 2 });
            expect(actions.turnInQuestStep()).toBe(true);
            actions.resetRun({ keepCharacter: true });
            await landed();
            expect(eventsOf('node-resolved').map((e) => e.payload.choice)).toEqual(['turn-in']);
            expect(eventsOf('xp-gained').map((e) => e.payload)).toEqual([{ amount: 40, from: 'quest' }]);
            // The turn-in, then the quest it finished.
            expect(eventsOf('quest-step').map((e) => e.payload)).toEqual([
                { questId: FIXTURE_LINE, stepId: '1', action: 'turn-in' },
                { questId: FIXTURE_LINE, stepId: '1', action: 'complete' },
            ]);
        } finally {
            unregisterFixtureQuestline();
        }
    });

    /** The boss step accepted on its node, with no level-up in reach, and the boss staged. */
    const bossStep = (id: string) => {
        const { store, actions } = fixtureOpen(id, 4);
        acceptFixtureStep(store, 4);
        const { player } = gs(store);
        store.setState({ player: { ...player, experience: 0, experienceToNextLevel: 1_000_000 } } as never);
        const boss = { ...ENEMY_REGISTRY['death-beholder']!, difficulty: 'boss' as const };
        actions.startCombat(boss);
        return { store, actions, boss };
    };

    it('logs a kill that completes a quest as the foe\'s XP from the fight, then the quest\'s XP from the quest', async () => {
        registerFixtureQuestline();
        try {
            const { store, actions, boss } = bossStep('sm2a-quest-kill');
            const finalState = initializeCombatEncounter(gs(store).player, boss, ['grey-strike'], 7);
            applyHazardOutcome(store, 'victory' as CombatOutcome, finalState, boss);
            const paid = gs(store).player.experience;
            actions.resetRun({ keepCharacter: true });
            await landed();
            const xp = eventsOf('xp-gained').map((e) => e.payload);
            expect(xp).toHaveLength(2);
            expect(xp[0]).toMatchObject({ from: 'fight' });
            expect(xp[0]!.amount).toBeGreaterThan(0);
            expect(xp[1]).toEqual({ amount: 40, from: 'quest' });
            expect(xp[0]!.amount + xp[1]!.amount).toBe(paid);
            expect(eventsOf('quest-step').map((e) => e.payload)).toEqual([
                { questId: FIXTURE_LINE, stepId: '4', action: 'complete' },
            ]);
        } finally {
            unregisterFixtureQuestline();
        }
    });

    it('logs a befriend that completes a quest as the quest\'s XP alone', async () => {
        registerFixtureQuestline();
        try {
            const { store, actions } = bossStep('sm2a-quest-befriend');
            const report = actions.endCombat('friendship');
            expect(report?.xpGained).toBe(0);
            expect(gs(store).quests.completed).toContain('Fell the Warden');
            actions.resetRun({ keepCharacter: true });
            await landed();
            expect(eventsOf('xp-gained').map((e) => e.payload)).toEqual([{ amount: 40, from: 'quest' }]);
            expect(eventsOf('quest-step').map((e) => e.payload.action)).toEqual(['complete']);
        } finally {
            unregisterFixtureQuestline();
        }
    });

    it('logs a quest finished by a dialogue or cutscene effect, through the one completion door', async () => {
        registerFixtureQuestline();
        try {
            const { store, actions } = fixtureOpen('sm2a-quest-effect', 4);
            acceptFixtureStep(store, 4);
            const before = gs(store).quests;
            store.setState({ quests: { ...before, active: [], completed: [...before.completed, 'Fell the Warden'] } } as never);
            offerCompletedQuestExtrasAction(store, before);
            actions.resetRun({ keepCharacter: true });
            await landed();
            expect(eventsOf('quest-step').map((e) => e.payload)).toEqual([
                { questId: FIXTURE_LINE, stepId: '4', action: 'complete' },
            ]);
        } finally {
            unregisterFixtureQuestline();
        }
    });
});

describe('travel', () => {
    it('crossing out of the Breakwater resolves the door and closes the run as a chapter clear', async () => {
        const { store, actions } = createFixtureStore({
            id: 'sm1d-travel-chapter-clear', seed: 'sm1d-travel-chapter-clear',
            world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-b2' },
        });
        const runId = gs(store).runId;
        expect(actions.resolveCurrentMapEvent('travel')).toBe(true);
        expect(actions.takeTravel()).toBe(true);
        expect(gs(store).world.currentMap.name).not.toBe('breakwater');
        await landed();
        expect(eventsOf('node-resolved').map((e) => e.payload)).toEqual([
            expect.objectContaining({ nodeId: 'bw-b2', choice: 'travel' }),
        ]);
        const closes = calls.filter((c) => c.url === playRunEndPath(runId));
        expect(closes).toHaveLength(1);
        expect(closes[0]!.body).toMatchObject({ outcome: 'chapter-clear', endNodeId: 'bw-b2' });
        expect(validatePlayRunEndPost(closes[0]!.body).reasons).toEqual([]);
    });

    it('a chapter-cleared run keeps posting its events, and a later reset posts no second close', async () => {
        const { store, actions } = createFixtureStore({
            id: 'sm1d-travel-no-double-close', seed: 'sm1d-travel-no-double-close',
            world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-b2' },
        });
        const runId = gs(store).runId;
        actions.resolveCurrentMapEvent('travel');
        actions.takeTravel();
        walkOn(store, actions);
        actions.resetRun({ keepCharacter: true });
        await landed();
        expect(calls.filter((c) => c.url === playRunEndPath(runId))).toHaveLength(1);
        // The crossing's close ends the row, not the run: the node walked afterwards still posts.
        const entered = eventsOf('node-entered').map((e) => e.payload.map);
        expect(entered).toHaveLength(1);
        expect(entered[0]).not.toBe('breakwater');
    });
});

describe('the run end', () => {
    it('a reset in place closes the run with its level, VITAE, nodes resolved and deck', async () => {
        const { store, actions, runId } = newGame();
        const before = gs(store);
        actions.resetRun({ keepCharacter: true });
        await landed();
        const [close] = posts<PlayRunEndPost>(playRunEndPath(runId));
        expect(close).toEqual({
            outcome: 'reset',
            endNodeId: before.world.currentMap.currentNode,
            level: before.player.level,
            vitaeEnd: before.player.health,
            nodesResolved: before.world.currentMap.consumedNodes.length,
            endDeck: before.player.knownCards,
        });
    });

    it('a reset that drops the character (a Labyrinth defeat) closes the run as run-over', async () => {
        const { actions, runId } = newGame();
        actions.resetRun({ keepCharacter: false });
        await landed();
        expect(posts<PlayRunEndPost>(playRunEndPath(runId)).map((c) => c.outcome)).toEqual(['run-over']);
    });

    it('a first death revives and closes nothing; the second ends the run as run-over', async () => {
        const { store, actions, runId } = newGame();
        expect(actions.playerDied('fight')).toBe('revived');
        await landed();
        expect(calls.filter((c) => c.url === playRunEndPath(runId))).toHaveLength(0);
        expect(actions.playerDied('fight')).toBe('run-over');
        await landed();
        const closes = posts<PlayRunEndPost>(playRunEndPath(runId));
        expect(closes).toHaveLength(1);
        expect(closes[0]!.outcome).toBe('run-over');
        expect(gs(store).runId).not.toBe(runId);
    });
});

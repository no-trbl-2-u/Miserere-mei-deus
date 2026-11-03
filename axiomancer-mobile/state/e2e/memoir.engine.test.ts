/**
 * Hermetic E2E Tests — MEMOIR presenter.
 *
 * Pins the VM shape end-to-end, then the quest, chronicle and remains
 * section contents.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { afterEach, describe, it, expect, jest } from '@jest/globals';
import { createGameStore } from '@mechanics';

import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import {
    selectMemoirViewModel,
    type MemoirViewModel,
} from '@/state/presenters/memoir.engine';
import { createAppStore, getEmitterForStore, type AppStoreState } from '@/state/store';

afterEach(() => {
    jest.restoreAllMocks();
});

describe('selectMemoirViewModel: shape contract', () => {
    it('returns a fully-shaped MemoirViewModel for a fresh game', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm: MemoirViewModel = selectMemoirViewModel(store.getState());

        // Headers + section eyebrows — all sourced from the VM so the
        // screen carries no inline literals (Hard Rule #8).
        expect(typeof vm.headerEyebrow).toBe('string');
        expect(vm.headerEyebrow.length).toBeGreaterThan(0);
        expect(typeof vm.headerSubline).toBe('string');
        expect(vm.headerSubline.length).toBeGreaterThan(0);
        expect(vm.chronicleEyebrow).toBe('✠ A CHRONICLE');
        expect(vm.questsEyebrow).toBe('✠ ERRANDS');
        expect(vm.questsActiveEyebrow).toBe('✠ AT HAND');
        expect(vm.questsCompletedEyebrow).toBe('✠ COMPLETED');
        expect(vm.questsForgottenEyebrow).toBe('✠ FORGOTTEN');

        // Sections — a fresh game's chronicle is empty.
        expect(Array.isArray(vm.chronicle)).toBe(true);
        expect(vm.chronicle.length).toBe(0);
        expect(Array.isArray(vm.quests.active)).toBe(true);
        expect(Array.isArray(vm.quests.completed)).toBe(true);
        expect(Array.isArray(vm.quests.forgotten)).toBe(true);

        // The VM carries no MEASURE section (GRACE band + philosophical bent).
        expect(vm).not.toHaveProperty('measureEyebrow');
        expect(vm).not.toHaveProperty('moralAlignment');
        expect(vm).not.toHaveProperty('exemplarQuote');

        // Empty-state copy locked per the brief.
        expect(vm.emptyChronicle).toBe('the page is bare.');
        expect(vm.emptyQuests).toBe('no errands written here.');
    });

    it('substitutes the player name into the header sub-line when available', () => {
        const store = createGameStore(createMemoryAdapter());
        // Fresh-game player is created with a default name. Confirm the
        // sub-line picks that name up rather than falling back.
        const playerName = store.getState().player?.name ?? '';
        const vm = selectMemoirViewModel(store.getState());

        if (playerName.length > 0) {
            expect(vm.headerSubline).toContain(playerName);
            expect(vm.headerSubline.endsWith('pilgrim.')).toBe(true);
        }
    });

    it('returns a deep-frozen view model so callers cannot mutate it', () => {
        const store = createGameStore(createMemoryAdapter());
        const vm = selectMemoirViewModel(store.getState());

        expect(Object.isFrozen(vm)).toBe(true);
        expect(Object.isFrozen(vm.quests)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Quests section reads state.quests
// ---------------------------------------------------------------------------

/**
 * Build a synthetic `QuestLog`-shaped object and inject it via
 * `store.setState`. Cast through `any` because the engine's
 * `Quest` / `QuestLog` types pull from `./types` which the engine
 * dist currently doesn't emit (see engine-team handoff doc Issue 2).
 */
function setQuests(
    store: ReturnType<typeof createGameStore>,
    log: {
        available?: unknown[];
        active?: unknown[];
        completed?: unknown[];
    },
): void {
    // Type assertion needed for test mock data - setState expects AppStoreState partial
    store.setState({ quests: log } as unknown as Partial<AppStoreState>);
}

function makeQuest(
    name: string,
    objectives: Array<{
        id: string;
        type?: string;
        target?: string;
        text?: string;
        currentCount?: number;
        requiredCount?: number;
    }>,
    overrides: Record<string, unknown> = {},
): Record<string, unknown> {
    return {
        name,
        status: 'active',
        description: '',
        objectives: objectives.map((o) => ({
            id: o.id,
            type: o.type ?? 'reach',
            target: o.target ?? 'somewhere',
            text: o.text,
            currentCount: o.currentCount ?? 0,
            requiredCount: o.requiredCount ?? 1,
        })),
        ...overrides,
    };
}

describe('selectMemoirViewModel: quests section', () => {
    it('returns empty quest sections for a fresh game (engine creates an empty QuestLog)', () => {
        const store = createGameStore(createMemoryAdapter());

        const vm = selectMemoirViewModel(store.getState());

        expect(vm.quests.active).toEqual([]);
        expect(vm.quests.completed).toEqual([]);
        expect(vm.quests.forgotten).toEqual([]);
    });

    it('renders active quests with their objectives and a derived done flag', () => {
        const store = createGameStore(createMemoryAdapter());
        setQuests(store, {
            available: [],
            active: [
                makeQuest('Find the Lost Pilgrim', [
                    {
                        id: 'reach-cairn',
                        type: 'reach',
                        target: 'cairn-of-bone',
                        text: 'Reach the cairn of bone.',
                        currentCount: 1,
                        requiredCount: 1,
                    },
                    {
                        id: 'kill-watcher',
                        type: 'kill',
                        target: 'cairn-watcher',
                        currentCount: 0,
                        requiredCount: 2,
                    },
                ]),
            ],
            completed: [],
        });

        const vm = selectMemoirViewModel(store.getState());

        expect(vm.quests.active).toHaveLength(1);
        const quest = vm.quests.active[0];
        expect(quest.id).toBe('Find the Lost Pilgrim');
        expect(quest.name).toBe('Find the Lost Pilgrim');
        expect(quest.status).toBe('active');
        expect(quest.objectives).toHaveLength(2);

        // Objective with `text` uses it verbatim; the done flag derives
        // from currentCount >= requiredCount.
        expect(quest.objectives[0].text).toBe('Reach the cairn of bone.');
        expect(quest.objectives[0].done).toBe(true);

        // Objective without `text` falls back to a synthesized
        // `<type>: <target>` line; the kill is unfinished (0/2).
        expect(quest.objectives[1].text).toBe('kill: cairn-watcher');
        expect(quest.objectives[1].done).toBe(false);

        // CRITIQUE pass 7 HIGH drain: bullet glyph pinned on the VM
        // (`'✓'` for done, `'○'` for pending) so the screen carries
        // no display literals per Hard Rule #8.
        expect(quest.objectives[0].bullet).toBe('✓');
        expect(quest.objectives[1].bullet).toBe('○');
    });

    it('mirrors completed quest names as rows with no objectives (engine drops the Quest object on completion)', () => {
        const store = createGameStore(createMemoryAdapter());
        setQuests(store, {
            available: [],
            active: [],
            completed: ['Tend the Hearth', 'Read the Stars'],
        });

        const vm = selectMemoirViewModel(store.getState());

        expect(vm.quests.completed).toHaveLength(2);
        expect(vm.quests.completed[0].name).toBe('Tend the Hearth');
        expect(vm.quests.completed[0].status).toBe('completed');
        expect(vm.quests.completed[0].objectives).toEqual([]);
        expect(vm.quests.completed[1].name).toBe('Read the Stars');
    });

    it('keeps the forgotten section empty (engine has no failed-quest concept today)', () => {
        const store = createGameStore(createMemoryAdapter());
        // Even when arbitrary stuff lives elsewhere on the log, forgotten stays empty
        // because the mapper has no source for it.
        setQuests(store, {
            available: [makeQuest('Available Quest', [])],
            active: [makeQuest('Active Quest', [])],
            completed: ['Completed Quest'],
        });

        const vm = selectMemoirViewModel(store.getState());

        expect(vm.quests.forgotten).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Chronicle from _recentEvents (the engine's ring buffer)
//
// The mapper folds engine events into
// reverse-chronological ChronicleEntry rows. Combat outcomes →
// FELLED/ROUTED/FLED; levelups → ROSE TO N; world:moved (continent
// change only) → CROSSED INTO X; dialogue:applied (when NPC name
// extractable) → SPOKE WITH X. All other event kinds skipped.
// ---------------------------------------------------------------------------

type RecentEvent = {
    type: string;
    payload?: Record<string, unknown>;
};

/** `events` is newest-first, the order the live store keeps the buffer in. */
function setRecentEvents(
    store: ReturnType<typeof createGameStore>,
    events: RecentEvent[],
): void {
    // Type assertion needed for test mock data - setState expects AppStoreState partial
    store.setState({ _recentEvents: events } as unknown as Partial<AppStoreState>);
}

describe('selectMemoirViewModel: chronicle (Tick D)', () => {
    it('returns an empty chronicle when _recentEvents is empty', () => {
        const store = createGameStore(createMemoryAdapter());
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.chronicle).toEqual([]);
    });

    it('maps a combat:ended victory event to FELLED with xp body', () => {
        const store = createGameStore(createMemoryAdapter());
        setRecentEvents(store, [
            {
                type: 'combat:ended',
                payload: { report: { outcome: 'victory', xpGained: 7, loot: [] } },
            },
        ]);
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.chronicle).toHaveLength(1);
        expect(vm.chronicle[0]?.kind).toBe('combat:ended');
        expect(vm.chronicle[0]?.label).toBe('FELLED');
        expect(vm.chronicle[0]?.body).toBe('a foe falls. +7 xp.');
    });

    it('maps a combat:ended defeat event to ROUTED BY', () => {
        const store = createGameStore(createMemoryAdapter());
        setRecentEvents(store, [
            {
                type: 'combat:ended',
                payload: { report: { outcome: 'defeat', xpGained: 0, loot: [] } },
            },
        ]);
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.chronicle[0]?.label).toBe('ROUTED BY');
        expect(vm.chronicle[0]?.body).toBe('the path turns dark.');
    });

    it('maps a combat:ended flee event to FLED', () => {
        const store = createGameStore(createMemoryAdapter());
        setRecentEvents(store, [
            {
                type: 'combat:ended',
                payload: { report: { outcome: 'flee', xpGained: 0, loot: [] } },
            },
        ]);
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.chronicle[0]?.label).toBe('FLED');
        expect(vm.chronicle[0]?.body).toBe('the path bends away.');
    });

    it('maps a combat:ended spared victory to SPARED, not FELLED', () => {
        const store = createGameStore(createMemoryAdapter());
        setRecentEvents(store, [
            {
                type: 'combat:ended',
                payload: { report: { outcome: 'victory', spared: true, xpGained: 0, loot: [] } },
            },
        ]);
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.chronicle[0]?.label).toBe('SPARED');
        expect(vm.chronicle[0]?.body).toBe('mercy, and it was owed.');
    });

    it('maps a character:levelup event to ROSE TO <level>', () => {
        const store = createGameStore(createMemoryAdapter());
        setRecentEvents(store, [
            {
                type: 'character:levelup',
                payload: { state: { player: { level: 5 } } },
            },
        ]);
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.chronicle[0]?.kind).toBe('character:levelup');
        expect(vm.chronicle[0]?.label).toBe('ROSE TO 5');
    });

    it('emits world:moved only when the continent CHANGES', () => {
        // Engine `WorldState.currentContinent: Continent` is an
        // OBJECT with `.name`, not a string. Fixtures shape the
        // currentContinent as `{name: <string>}` to match the
        // engine type.
        const store = createGameStore(createMemoryAdapter());
        // Newest-first: Ash Marches, Ash Marches again, then Bell Vale.
        setRecentEvents(store, [
            {
                type: 'world:moved',
                payload: { state: { world: { currentContinent: { name: 'Bell Vale' } } } }, // change
            },
            {
                type: 'world:moved',
                payload: { state: { world: { currentContinent: { name: 'Ash Marches' } } } }, // same
            },
            {
                type: 'world:moved',
                payload: { state: { world: { currentContinent: { name: 'Ash Marches' } } } },
            },
        ]);
        const vm = selectMemoirViewModel(store.getState());
        // reverse-chronological output of two non-redundant crossings
        expect(vm.chronicle).toHaveLength(2);
        expect(vm.chronicle[0]?.label).toBe('CROSSED INTO BELL VALE');
        expect(vm.chronicle[1]?.label).toBe('CROSSED INTO ASH MARCHES');
    });

    it('maps a dialogue:applied event to SPOKE WITH <npc> when tree carries npcName', () => {
        // Engine `EnginePayload.action: GameAction` is a
        // discriminated union; the dialogue path narrows on
        // `action.type === 'APPLY_DIALOGUE'`. Fixtures must
        // include the discriminator. Memoir-audit [3.0] fix.
        const store = createGameStore(createMemoryAdapter());
        setRecentEvents(store, [
            {
                type: 'dialogue:applied',
                payload: {
                    action: {
                        type: 'APPLY_DIALOGUE',
                        payload: { tree: { npcName: 'Old Marrow' } },
                    },
                },
            },
        ]);
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.chronicle[0]?.kind).toBe('dialogue:applied');
        expect(vm.chronicle[0]?.label).toBe('SPOKE WITH OLD MARROW');
    });

    it('skips dialogue:applied events when no NPC name can be extracted', () => {
        const store = createGameStore(createMemoryAdapter());
        setRecentEvents(store, [
            {
                type: 'dialogue:applied',
                payload: {
                    action: {
                        type: 'APPLY_DIALOGUE',
                        payload: { tree: {} }, // no npcName / name
                    },
                },
            },
        ]);
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.chronicle).toEqual([]);
    });

    it('skips noise event kinds (inventory:changed, combat:round, game:saved)', () => {
        const store = createGameStore(createMemoryAdapter());
        setRecentEvents(store, [
            { type: 'inventory:changed', payload: { action: { type: 'ADD_ITEM' } } },
            { type: 'combat:round', payload: { state: {} } },
            { type: 'game:saved', payload: { state: {} } },
        ]);
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.chronicle).toEqual([]);
    });

    it('returns reverse-chronological entries and caps at 12 visible rows', () => {
        const store = createGameStore(createMemoryAdapter());
        // 15 levelups with rising levels, stored newest-first (15 down to 1).
        const events: RecentEvent[] = Array.from({ length: 15 }, (_, i) => ({
            type: 'character:levelup',
            payload: { state: { player: { level: 15 - i } } },
        }));
        setRecentEvents(store, events);
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.chronicle).toHaveLength(12);
        // Reverse-chronological: highest level appears first.
        expect(vm.chronicle[0]?.label).toBe('ROSE TO 15');
        expect(vm.chronicle[11]?.label).toBe('ROSE TO 4');
    });

    it('reads the buffer in the order the live store writes it', () => {
        // Feed events through the store's own emitter handler, not a
        // hand-built fixture, so the test breaks if the buffer's order
        // and the mapper's reading of it drift apart again.
        const store = createAppStore({ adapter: createMemoryAdapter() });
        const emitter = getEmitterForStore(store);
        expect(emitter).not.toBeNull();
        const moveTo = (name: string) =>
            emitter!.emit({
                type: 'world:moved',
                payload: { state: { world: { currentContinent: { name } } } } as never,
            });
        moveTo('Ash Marches');
        moveTo('Bell Vale');
        moveTo('Bell Vale');
        moveTo('Ash Marches');
        for (let level = 2; level <= 20; level++) {
            emitter!.emit({
                type: 'character:levelup',
                payload: { state: { player: { level } } } as never,
            });
        }

        // 23 events, capacity 20: the three oldest crossings fall out,
        // leaving the return to Ash Marches as the oldest buffered event.
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.chronicle).toHaveLength(12);
        expect(vm.chronicle[0]?.label).toBe('ROSE TO 20');
        expect(vm.chronicle[11]?.label).toBe('ROSE TO 9');
        expect(vm.chronicle.some((e) => e.kind === 'world:moved')).toBe(false);

        // With room to spare, the crossings read newest first and the
        // repeated Bell Vale move is not a crossing.
        const fresh = createAppStore({ adapter: createMemoryAdapter() });
        const freshEmitter = getEmitterForStore(fresh)!;
        for (const name of ['Ash Marches', 'Bell Vale', 'Bell Vale', 'Ash Marches']) {
            freshEmitter.emit({
                type: 'world:moved',
                payload: { state: { world: { currentContinent: { name } } } } as never,
            });
        }
        expect(selectMemoirViewModel(fresh.getState()).chronicle.map((e) => e.label)).toEqual([
            'CROSSED INTO ASH MARCHES',
            'CROSSED INTO BELL VALE',
            'CROSSED INTO ASH MARCHES',
        ]);
    });
});

// ---------------------------------------------------------------------------
// Remains section: death tally + keepsake read-back
// ---------------------------------------------------------------------------

function setFlags(store: ReturnType<typeof createGameStore>, flags: string[]): void {
    store.setState({ flags } as Partial<AppStoreState>);
}

describe('selectMemoirViewModel: remains (Phase 6)', () => {
    it('defaults to zero deaths and no keepsakes for a fresh game', () => {
        const store = createGameStore(createMemoryAdapter());
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.remainsEyebrow).toBe('✠ REMAINS');
        expect(vm.remainsKeepsakesEyebrow).toBe('✠ KEEPSAKES');
        expect(vm.remains.deathCount).toBe(0);
        expect(vm.remains.deathLine).toBe('you have not yet fallen.');
        expect(vm.remains.keepsakes).toEqual([]);
        expect(vm.emptyKeepsakes).toBe('nothing kept.');
    });

    it('counts hazard-death: flags via hazardDeathCount and pluralizes the line', () => {
        const store = createGameStore(createMemoryAdapter());
        setFlags(store, ['hazard-death:1000']);
        expect(selectMemoirViewModel(store.getState()).remains.deathLine).toBe(
            'you have fallen once.',
        );

        setFlags(store, ['hazard-death:1000', 'hazard-death:2000', 'hazard-death:3000']);
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.remains.deathCount).toBe(3);
        expect(vm.remains.deathLine).toBe('you have fallen 3 times.');
    });

    it('merges night-keepsake and cache-keepsake flags with the prefix stripped', () => {
        const store = createGameStore(createMemoryAdapter());
        setFlags(store, [
            'night-keepsake:An oar\'s rhythm, remembered wrong',
            'cache-keepsake:A dead stranger\'s luck, inherited',
        ]);
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.remains.keepsakes).toContain("An oar's rhythm, remembered wrong");
        expect(vm.remains.keepsakes).toContain("A dead stranger's luck, inherited");
        expect(vm.remains.keepsakes).toHaveLength(2);
    });

    it('returns keepsakes reverse-chronological (most recently banked first)', () => {
        const store = createGameStore(createMemoryAdapter());
        setFlags(store, [
            'night-keepsake:first kept',
            'cache-keepsake:second kept',
            'night-keepsake:third kept',
        ]);
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.remains.keepsakes).toEqual(['third kept', 'second kept', 'first kept']);
    });

    it('de-dupes a repeated keepsake label defensively', () => {
        const store = createGameStore(createMemoryAdapter());
        setFlags(store, ['night-keepsake:same label', 'night-keepsake:same label']);
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.remains.keepsakes).toEqual(['same label']);
    });

    it('ignores unrelated flags (hazard-scar:, gleaning-token-banked:)', () => {
        const store = createGameStore(createMemoryAdapter());
        setFlags(store, ['hazard-scar:5', 'gleaning-token-banked:some-token']);
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.remains.deathCount).toBe(0);
        expect(vm.remains.keepsakes).toEqual([]);
    });

    it('includes remains in the frozen view model', () => {
        const store = createGameStore(createMemoryAdapter());
        setFlags(store, ['hazard-death:1000', 'night-keepsake:kept']);
        const vm = selectMemoirViewModel(store.getState());
        expect(Object.isFrozen(vm.remains)).toBe(true);
        expect(Object.isFrozen(vm.remains.keepsakes)).toBe(true);
    });

    // Harvest's persistent Soul jar read-back.
    function setBankedSouls(store: ReturnType<typeof createGameStore>, bankedSouls: number): void {
        const player = store.getState().player;
        store.setState({ player: { ...player, bankedSouls } } as Partial<AppStoreState>);
    }

    it('defaults to an empty jar for a fresh game', () => {
        const store = createGameStore(createMemoryAdapter());
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.remains.bankedSouls).toBe(0);
        expect(vm.remains.soulsLine).toBe('the jar is empty.');
    });

    it('reads player.bankedSouls and pluralizes the line', () => {
        const store = createGameStore(createMemoryAdapter());
        setBankedSouls(store, 1);
        expect(selectMemoirViewModel(store.getState()).remains.soulsLine).toBe(
            'the jar holds a single soul.',
        );

        setBankedSouls(store, 7);
        const vm = selectMemoirViewModel(store.getState());
        expect(vm.remains.bankedSouls).toBe(7);
        expect(vm.remains.soulsLine).toBe('the jar holds 7 souls.');
    });

    it('floors a missing/non-finite bankedSouls to 0 defensively', () => {
        const store = createGameStore(createMemoryAdapter());
        const player = store.getState().player;
        store.setState({ player: { ...player, bankedSouls: Number.NaN } } as Partial<AppStoreState>);
        expect(selectMemoirViewModel(store.getState()).remains.bankedSouls).toBe(0);
    });

    // Milestone epithet layered onto the same line.
    it('stays plain below the lowest milestone tier', () => {
        const store = createGameStore(createMemoryAdapter());
        setBankedSouls(store, 9);
        expect(selectMemoirViewModel(store.getState()).remains.soulsLine).toBe(
            'the jar holds 9 souls.',
        );
    });

    it('appends the tier-10 epithet at the boundary', () => {
        const store = createGameStore(createMemoryAdapter());
        setBankedSouls(store, 10);
        expect(selectMemoirViewModel(store.getState()).remains.soulsLine).toBe(
            'the jar holds 10 souls. the harvest deepens.',
        );
    });

    it('appends the tier-25 epithet, superseding tier-10', () => {
        const store = createGameStore(createMemoryAdapter());
        setBankedSouls(store, 25);
        expect(selectMemoirViewModel(store.getState()).remains.soulsLine).toBe(
            'the jar holds 25 souls. the reaping is remembered.',
        );
    });

    it('appends the tier-50 epithet, superseding lower tiers', () => {
        const store = createGameStore(createMemoryAdapter());
        setBankedSouls(store, 50);
        expect(selectMemoirViewModel(store.getState()).remains.soulsLine).toBe(
            'the jar holds 50 souls. the harvest is legend.',
        );
    });
});

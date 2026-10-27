/**
 * Game Store
 *
 * A framework-agnostic Zustand vanilla store. Works in Node.js today and
 * in React Native via the `useStore` hook.
 *
 * ── Architectural rule ───────────────────────────────────────────────────────
 * Every state mutation flows through `gameReducer`. The store is
 * a thin Zustand wrapper that:
 *   1. Calls `gameReducer(get(), action)` to compute the next state.
 *   2. `set(...)` to publish it.
 *   3. Emits the corresponding `GameEvent` to any subscribed consumer.
 *   4. Autosaves through the provided `PersistenceAdapter`.
 *
 * Method-style actions (`startCombat`, `endCombat`, ...) are sugar over
 * `dispatch`.
 *
 * ── Usage (Node.js) ──────────────────────────────────────────────────────────
 *   import { createGameStore, createEventEmitter } from 'axiomancer-mechanics';
 *   import { createNodeAdapter } from 'axiomancer-mechanics/node';
 *
 *   const events = createEventEmitter();
 *   const store  = createGameStore(createNodeAdapter(), undefined, events);
 *   events.on('combat:started', e => console.log(e));
 *   store.getState().dispatch({ type: 'START_COMBAT', payload: { target: someEnemy } });
 *
 * ── Usage (React Native) ─────────────────────────────────────────────────────
 *   import { createGameStore } from 'axiomancer-mechanics';
 *   import { useStore } from 'zustand';
 *
 *   const store = createGameStore(asyncStorageAdapter);
 *   const player = useStore(store, s => s.player);
 */

import { createStore, StoreApi } from 'zustand/vanilla';
import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { Encounter } from '../World/types';
import {
    Item, Equipment, EquipmentSlot,
} from '../Items/types';
import { DialogueTree, DialogueChoice } from '../NPCs/types';
import { GameState } from './types';
import { GameAction } from './actions.types';
import { gameReducer, createNewGameState } from './game.reducer';
import { GameEventEmitter, GameEvent, GameEventType } from './events';
import { PersistenceAdapter } from './persistence/types';
import { rollEncounterLoot, totalEncounterXp } from './combat-grants';
import { getRng } from '../Utils/rng';
import { getLogger, isLoggingEnabled } from '../Log';
import { getAvailableCards } from '../Cards';
import {
    addItemStacking as addItemReducer,
    removeItem as removeItemReducer,
    stackItem as stackItemReducer,
} from '../Items/item.reducer';

/**
 * Curated set of action types that trigger an autosave through the
 * provided `PersistenceAdapter`.
 *
 * This is the ENGINE-ONLY save policy: the CLI and the hermetic tests run on
 * it. The mobile app owns its own save timing:
 * it wraps the adapter so this allowlist never writes, and saves at
 * hand-placed checkpoints instead (`axiomancer-mobile/state/store.ts`).
 *
 * UI-tier actions (`USE_ITEM`, `EQUIP_ITEM`, `ALLOCATE_STAT_POINT`,
 * `LEARN_CARD`, `START_COMBAT`, `PROCESS_NODE`, `LOAD_GAME`) are intentionally excluded —
 * they will save on the next durable transition or via an explicit
 * `SAVE_GAME` / `save()` call.
 */
const DURABLE_ACTIONS: ReadonlySet<GameAction['type']> = new Set<GameAction['type']>([
    'LEVEL_UP',
    'END_COMBAT',
    'MOVE_TO_NODE',
    'APPLY_DIALOGUE',
    'SAVE_GAME',
    'RESET_RUN', // Persist new runId + reset world immediately.
    'UNLOCK_CODEX_ENTRY', // Persist codex unlock immediately.
]);

/**
 * Summary of what an `endCombat` call granted to the player.
 *
 * Returned from `endCombat()` so the CLI / UI can render an after-action
 * report.
 *
 * - `outcome` — `'victory'` when the player killed the enemy, `'defeat'`
 *   when the player went down first, `'friendship'` when the
 *   friendship-counter capped (half XP),
 *   `'flee'` when combat ended without any of the above (manual escape).
 * - `xpGained` — flat XP added to `player.experience` this turn (enemy XP
 *   only; quest reward XP is folded directly into `player.experience`).
 *   Half-XP on `'friendship'`; full XP on `'victory'`; zero on `'defeat'` /
 *   `'flee'`.
 * - `loot` — items added to `player.inventory` (pre stack-merge). Granted
 *   on victory and friendship; empty on defeat / flee.
 */
export interface CombatEndReport {
    outcome: 'victory' | 'defeat' | 'friendship' | 'flee';
    xpGained: number;
    loot: Item[];
    /**
     * Per-enemy friendship-reward content. Only present on
     * `outcome === 'friendship'` when the befriended enemy carries a
     * `friendshipReward`. The engine has already applied the reward's
     * `items` to `loot` and `xpBonus` to `xpGained` by the time this
     * surfaces; `narrative` is here for the CLI / UI to render.
     */
    friendshipReward?: {
        narrative?: string;
        /**
         * When the befriended enemy carries a `journalEntry`
         * and the entry wasn't already unlocked, the engine appends its
         * id to `state.codex.unlockedEntries` and surfaces
         * `{ id, title }` here for the consumer's after-action UI
         * (mobile `<CombatFriendshipPanel>` NEW ENTRY card). Body is
         * recovered via lookup against the source `Enemy` (or a future
         * `CodexLibrary` registry).
         */
        codexEntryUnlocked?: { id: string; title: string };
    };
}

/**
 * Every operation that mutates the root GameState. Grouped by domain.
 *
 * The canonical entry point is `dispatch(action)`; the named methods below
 * are sugar that builds the action for you. New consumers should prefer
 * `dispatch` for forward compatibility.
 */
export interface GameActions {
    /** Generic dispatch — applies the action via `gameReducer`. */
    dispatch: (action: GameAction) => void;

    // ── Combat ───────────────────────────────────────────────────────────────
    /**
     * Stages an encounter for combat. Applies region-mercy
     * scaling to the lead enemy and writes the result to `currentEncounter`.
     * The fight itself is driven by the Hazard-Pattern engine outside the
     * store; call `endCombat` with the reported outcome to grant rewards.
     */
    startCombat: (target: Enemy | Encounter) => void;
    /**
     * Resolves the staged encounter. The Hazard-Pattern combat driver reports
     * the `outcome` and (optionally) the post-fight `finalPlayer` snapshot.
     * Grants loot / XP / quest progress / friendship rewards accordingly and
     * returns the after-action `CombatEndReport`. `options.withholdSpoils`
     * grants no XP and no loot (an elite whose relic dropped: the relic is
     * the whole reward); quest progress and the arrival still settle.
     */
    endCombat: (
        outcome: CombatEndReport['outcome'],
        finalPlayer?: Character,
        options?: { withholdSpoils?: boolean },
    ) => CombatEndReport;

    // ── World / dialogue ─────────────────────────────────────────────────────
    moveToNode: (nodeId: string) => void;
    processNode: () => void;
    applyDialogue: (tree: DialogueTree, choice: DialogueChoice) => void;

    // ── Inventory ────────────────────────────────────────────────────────────
    addItem: (item: Item) => void;
    removeItem: (itemId: string) => void;
    useConsumable: (itemId: string) => void;
    stackItem: (itemId: string, amount: number) => void;

    // ── Equipment ────────────────────────────────────────────────────────────
    equipItem: (item: Equipment, opts?: { replaceIndex?: number }) => void;
    /** For `slot === 'relic'`, `index` selects which of the ≤3 to remove. */
    unequipItem: (slot: EquipmentSlot, index?: number) => void;

    // ── Progression / persistence ────────────────────────────────────────────
    levelUp: () => void;
    allocateStatPoint: (stat: 'heart' | 'body' | 'mind') => void;
    learnCard: (cardId: string) => void;
    /** Swaps one owned copy of `cardId` for `withCardId` (`REPLACE_CARD`). */
    replaceCard: (cardId: string, withCardId: string) => void;
    save: () => void;
    // ── Run loop ─────────────────────────────────────────────────────────────
    /**
     * Resets the playthrough back to the starting hearth.
     * `keepCharacter: true` preserves the character ledger
     * (player + rngState + codex) and
     * refills HP; world / combat / quests / flags reset.
     * `keepCharacter: false` performs a full new-game reset. Every call
     * assigns a fresh `runId`. Dispatches `RESET_RUN`; persists via the
     * standard DURABLE_ACTIONS pipeline. Returns the post-reset GameState.
     */
    resetRun: (opts: { keepCharacter: boolean }) => GameState;
    // ── Codex ────────────────────────────────────────────────────────────────
    /**
     * Append a codex entry id to `state.codex.unlockedEntries`
     * (de-duped). Friendship outcomes auto-fire the
     * unlock when the befriended enemy carries a `journalEntry`; this
     * method exists so future dialogue / map-event content can grant
     * codex entries directly. Dispatches `UNLOCK_CODEX_ENTRY` through the
     * standard DURABLE_ACTIONS pipeline.
     */
    unlockCodexEntry: (entryId: string) => void;
}

/** Full store type — state + actions. */
export type GameStore = GameState & GameActions;

/**
 * Map a `GameAction` to the corresponding `GameEvent` (or null if the action
 * shouldn't broadcast). The reducer is pure, so the store is the right place
 * for these side-effecting notifications.
 */
/**
 * Compute the extra envelope fields that depend on the prev→next diff.
 * Today this is only the `unlockedCards` bag for level-ups —
 * the list of card ids that became eligible because the promotion
 * crossed a learning-requirement threshold.
 */
function enrichExtra(
    action: GameAction,
    prev: GameState,
    next: GameState,
    extra?: { report?: CombatEndReport },
): { report?: CombatEndReport; unlockedCards?: string[] } | undefined {
    if (action.type !== 'LEVEL_UP') return extra;
    if (next.player.level === prev.player.level) return extra; // No promotion → no diff.
    // Card availability has no level/stat/alignment gates, so a level-up
    // never changes the available set — this diff is always empty. Kept for
    // event-shape stability.
    const before = new Set(getAvailableCards(prev.player).map(s => s.id));
    const after = getAvailableCards(next.player).map(s => s.id);
    const unlockedCards = after.filter(id => !before.has(id));
    return { ...(extra ?? {}), unlockedCards };
}

function eventForAction(
    action: GameAction,
    nextState: GameState,
    extra?: { report?: CombatEndReport; unlockedCards?: string[] },
): GameEvent | null {
    const map: Partial<Record<GameAction['type'], GameEventType>> = {
        START_COMBAT:   'combat:started',
        END_COMBAT:     'combat:ended',
        MOVE_TO_NODE:   'world:moved',
        PROCESS_NODE:   'world:processed',
        APPLY_DIALOGUE: 'dialogue:applied',
        LEVEL_UP:       'character:levelup',
        USE_ITEM:       'inventory:changed',
        EQUIP_ITEM:     'inventory:changed',
        UNEQUIP_ITEM:   'inventory:changed',
        SAVE_GAME:      'game:saved',
        LOAD_GAME:      'game:loaded',
    };
    const type = map[action.type];
    if (!type) return null;
    return { type, payload: { action, state: nextState, ...(extra ?? {}) } };
}

/**
 * AXM Log tap: forwards every emitted GameEvent as a SANITIZED log entry.
 * The raw payload embeds the full `GameState` (`eventForAction` above) — a
 * buffer of those would pin hundreds of state copies, so we log only the
 * event type, the action type, and a few small derived scalars. Defensive
 * throughout: unknown payload shapes degrade to `{ type }`, never throw.
 */
function logGameEventSanitized(event: GameEvent): void {
    try {
        const p = (event.payload ?? {}) as {
            action?: { type?: string; payload?: { nodeId?: string } };
            state?: { player?: { level?: number; health?: number } };
            report?: { outcome?: string };
            unlockedCards?: string[];
            item?: { id?: string; name?: string };
        };
        const data: Record<string, unknown> = {};
        if (p.action?.type) data.action = p.action.type;
        if (p.action?.payload?.nodeId) data.nodeId = p.action.payload.nodeId;
        if (p.report?.outcome) data.outcome = p.report.outcome;
        if (p.unlockedCards?.length) data.unlockedCards = p.unlockedCards;
        if (p.item) data.item = p.item.id ?? p.item.name;
        if (event.type === 'character:levelup' && p.state?.player?.level !== undefined) {
            data.level = p.state.player.level;
        }
        getLogger().info('game', event.type, data);
    } catch { /* logging must never break the store */ }
}

/**
 * The part of the state a save writes: every durable `GameState` field, and
 * not the transient `currentEncounter` (encounters re-roll on load)
 * or the store's verbs. One list for the autosave and the explicit `save()`.
 * `labyrinth` is the Aporia's durable progress, and with it an open
 * visit's way back; it is absent until the player first
 * enters, so saves from before then are unchanged.
 */
function durableSlice(next: GameState): GameState {
    const {
        version, runId, player, world, quests, flags,
        rngState, codex, labyrinth,
    } = next;
    return {
        version, runId, player, world, quests, flags,
        rngState, codex,
        ...(labyrinth ? { labyrinth } : {}),
    };
}

/**
 * Constructs a Zustand vanilla store backed by `adapter`.
 *
 * @param adapter   - Persistence backend (Node fs, AsyncStorage, null for tests).
 * @param overrides - Optional partial state to merge over the loaded/default state.
 * @param emitter   - Optional event emitter; consumers subscribe to it to
 *                    learn about combat / world / progression transitions.
 *                    Kept outside `GameState` so handlers don't serialise.
 */
export function createGameStore(
    adapter: PersistenceAdapter,
    overrides?: Partial<GameState>,
    emitter?: GameEventEmitter,
): StoreApi<GameStore> {
    const saved   = adapter.load();
    const base    = saved ?? createNewGameState();
    const initial: GameState = { ...base, ...overrides };

    // AXM Log tap: one `onAny` subscription catches `eventForAction`
    // emissions AND the direct inventory/save emits below, all through the
    // sanitizer (raw payloads embed the full GameState — never buffer them).
    // The flag is checked per-event, not at creation, so consumers may
    // enable logging before OR after building the store.
    if (emitter) {
        emitter.onAny(e => { if (isLoggingEnabled()) logGameEventSanitized(e); });
    }

    // Restore RNG state from loaded save
    if (saved?.rngState !== undefined) {
        getRng().setState(saved.rngState);
        if (isLoggingEnabled()) {
            getLogger().info('rng', 'rng-state-restored', { rngState: saved.rngState });
        }
    }

    return createStore<GameStore>()((set, get) => {
        // Core dispatch: run reducer → set → emit → autosave (gated).
        // Autosave only fires for the curated
        // DURABLE_ACTIONS set; UI-tier actions never write through. The
        // direct `save()` verb below keeps its own unconditional write.
        function dispatch(action: GameAction, extra?: { report?: CombatEndReport }): GameState {
            if (isLoggingEnabled()) getLogger().debug('game', `action:${action.type}`);
            const prev = get();
            const next = gameReducer(prev, action);
            set(next);
            const enriched = enrichExtra(action, prev, next, extra);
            const event = eventForAction(action, next, enriched);
            if (event && emitter) emitter.emit(event);
            // Save excludes transient currentEncounter — encounters re-roll on
            // load.
            if (DURABLE_ACTIONS.has(action.type)) {
                adapter.save(durableSlice(next));
            }
            return next;
        }

        return {
            ...initial,

            dispatch(action) { dispatch(action); },

            // ── Combat ───────────────────────────────────────────────────────
            startCombat(target) {
                dispatch({ type: 'START_COMBAT', payload: { target } });
            },

            endCombat(outcome, finalPlayer, options) {
                const pre = get();
                const encounter = pre.currentEncounter;
                if (!encounter) {
                    return { outcome: 'flee', xpGained: 0, loot: [] };
                }
                const foe = encounter.enemies[0]!;

                let xpGained = 0;
                let loot: Item[] = [];
                if (outcome === 'victory') {
                    xpGained = totalEncounterXp(encounter);
                    loot = rollEncounterLoot(encounter, () => getRng().random());
                } else if (outcome === 'friendship') {
                    // Friendship grants half the kill-win XP and the
                    // full loot table (consistent with the reducer treating
                    // friendship as a peaceful resolution rather than a flee).
                    xpGained = Math.floor(totalEncounterXp(encounter) * 0.5);
                    loot = rollEncounterLoot(encounter, () => getRng().random());
                    // Per-enemy friendshipReward supplement. Items
                    // append to the weighted-loot roll; xpBonus adds on top of
                    // the half-XP base.
                    const fr = foe.friendshipReward;
                    if (fr) {
                        if (fr.items) loot = [...loot, ...fr.items];
                        if (fr.xpBonus) xpGained += fr.xpBonus;
                    }
                }

                if (options?.withholdSpoils) {
                    xpGained = 0;
                    loot = [];
                }

                const report: CombatEndReport = { outcome, xpGained, loot };
                // Surface the narrative on the report so the CLI /
                // UI can render it. Items + xpBonus already reach the consumer
                // through report.loot / report.xpGained.
                if (outcome === 'friendship') {
                    const fr = foe.friendshipReward;
                    const entry = foe.journalEntry;
                    const codexAlreadyKnown = entry
                        ? pre.codex.unlockedEntries.includes(entry.id)
                        : true;
                    const willUnlockCodex = entry && !codexAlreadyKnown;
                    if (fr?.narrative || willUnlockCodex) {
                        const friendshipReport: {
                            narrative?: string;
                            codexEntryUnlocked?: { id: string; title: string };
                        } = {};
                        if (fr?.narrative) friendshipReport.narrative = fr.narrative;
                        if (willUnlockCodex && entry) {
                            // Surface the unlocked entry's id +
                            // title on the report (the END_COMBAT reducer
                            // has appended the id to state.codex.unlockedEntries).
                            friendshipReport.codexEntryUnlocked = {
                                id: entry.id,
                                title: entry.title,
                            };
                        }
                        report.friendshipReward = friendshipReport;
                    }
                }
                dispatch(
                    {
                        type: 'END_COMBAT',
                        payload: { outcome, finalPlayer, grantedLoot: loot, grantedXp: xpGained },
                    },
                    { report },
                );
                return report;
            },

            // ── World / dialogue ─────────────────────────────────────────────
            moveToNode(nodeId) {
                dispatch({ type: 'MOVE_TO_NODE', payload: { nodeId } });
            },

            processNode() {
                dispatch({ type: 'PROCESS_NODE' });
            },

            applyDialogue(tree, choice) {
                dispatch({ type: 'APPLY_DIALOGUE', payload: { tree, choice } });
            },

            // ── Inventory ────────────────────────────────────────────────────
            addItem(item) {
                set(state => ({
                    player: { ...state.player, inventory: addItemReducer(state.player.inventory, item) },
                }));
                if (emitter) emitter.emit({ type: 'inventory:changed', payload: { item, state: get() } });
            },

            removeItem(itemId) {
                set(state => ({
                    player: { ...state.player, inventory: removeItemReducer(state.player.inventory, itemId) },
                }));
                if (emitter) emitter.emit({ type: 'inventory:changed', payload: { state: get() } });
            },

            useConsumable(itemId) {
                dispatch({ type: 'USE_ITEM', payload: { itemId } });
            },

            stackItem(itemId, amount) {
                set(state => ({
                    player: { ...state.player, inventory: stackItemReducer(state.player.inventory, itemId, amount) },
                }));
                if (emitter) emitter.emit({ type: 'inventory:changed', payload: { state: get() } });
            },

            // ── Equipment ────────────────────────────────────────────────────
            equipItem(item, opts) {
                dispatch({ type: 'EQUIP_ITEM', payload: { item, opts } });
            },

            unequipItem(slot, index) {
                dispatch({ type: 'UNEQUIP_ITEM', payload: { slot, index } });
            },

            // ── Progression / persistence ────────────────────────────────────
            levelUp() {
                dispatch({ type: 'LEVEL_UP' });
            },

            allocateStatPoint(stat) {
                dispatch({ type: 'ALLOCATE_STAT_POINT', payload: { stat } });
            },

            learnCard(cardId) {
                dispatch({ type: 'LEARN_CARD', payload: { cardId } });
            },

            replaceCard(cardId, withCardId) {
                dispatch({ type: 'REPLACE_CARD', payload: { cardId, withCardId } });
            },

            save() {
                const next = get();
                adapter.save(durableSlice(next));
                if (emitter) emitter.emit({ type: 'game:saved', payload: { state: next } });
            },

            // ── Run loop ─────────────────────────────────────────────────────
            resetRun(opts: { keepCharacter: boolean }) {
                return dispatch({ type: 'RESET_RUN', payload: opts });
            },

            // ── Codex ────────────────────────────────────────────────────────
            unlockCodexEntry(entryId: string) {
                dispatch({ type: 'UNLOCK_CODEX_ENTRY', payload: { entryId } });
            },
        };
    });
}

// ─── Selectors ────────────────────────────────────────────────────────────────

export type { StoreApi };

export const selectPlayer      = (s: GameStore): Character          => s.player;
/** True while an encounter is staged (combat is driven outside the store). */
export const selectIsInCombat  = (s: GameStore): boolean            => s.currentEncounter != null;
export const selectVersion     = (s: GameStore): number             => s.version;

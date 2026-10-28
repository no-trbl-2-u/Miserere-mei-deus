import {
    createEventEmitter,
    createGameStore,
    nullAdapter,
    type DialogueTree,
    type Equipment,
    type GameEvent,
    type GameEventEmitter,
    type GameState,
    type GameStore,
    type Item,
    type PersistenceAdapter,
    type ResolveMapEventResult,
    type StoreApi,
    type TypedGameEvent,
} from '@mechanics';

import type { HazardSessionState } from '@mechanics';
import type { BlacksmithSession, EliteRewardUpgrade, LootCacheChoiceSession, RestChoiceSession } from '@mechanics';
import type { LabyrinthActId, WorldState } from '@mechanics';

import { resumeLabyrinthSession } from './labyrinth/resume';

/**
 * Mobile-only state slice for the event modal. The engine returns
 * `ResolveMapEventResult` synchronously from `resolveMapEvent(state)`;
 * the store caches it so the screen can survive re-mounts and present
 * a skip affordance over long bodies. `dialogueCursor` advances as the
 * player walks an NPC `DialogueTree` via `applyDialogue`.
 */
export interface MobileEventSlice {
    pending: ResolveMapEventResult | null;
    dialogueCursor: { tree: DialogueTree; nodeId: string } | null;
    history: ReadonlyArray<{ nodeId: string; choiceId: string }>;
    /**
     * Map node type that triggered this event (e.g. 'quest', 'rest',
     * 'treasure'). Populated by `resolveCurrentMapEvent` so the modal
     * can apply quest-source visual treatment even when the engine
     * resolves to a generic kind (loot-cache, interaction, etc.).
     * `null` when the event was not triggered from exploration.
     */
    sourceNodeType: string | null;
}

/**
 * Mobile-only notifications slice. Tracks:
 *
 * - `levelUpAcknowledged` — has the player acknowledged the most
 *   recent level-up? Levelup tab badge clears when `true`. Engine
 *   `character:levelup` flips to `false`; character-screen mount
 *   flips back to `true`.
 * - `toast` — transient feedback string (e.g. inventory action
 *   confirmation). The `<ToastHost>` in `app/_layout.tsx` clears
 *   the field ~3 seconds after `id` changes. `id` increments per
 *   new toast so listeners can detect fresh dispatches even if
 *   `text` is identical.
 * - `questAcknowledged` — has the player visited Memoir since last
 *   accepting a quest? Mirrors `levelUpAcknowledged` exactly: engine
 *   `dialogue:applied` (with a `startQuest` effect on the applied
 *   choice) flips to `false`; Memoir-screen mount flips back to
 *   `true`. Drives the Memoir tab badge.
 */
export interface MobileNotificationsSlice {
    levelUpAcknowledged: boolean;
    questAcknowledged: boolean;
    toast: {
        text: string | null;
        id: number;
    };
}

/**
 * Mobile-only Hazard minigame slice. Holds the active hazard
 * session (engine: `axiomancer-mechanics` World/Hazard; mobile glue:
 * `state/hazard/store-actions.ts`) — `null` outside a hazard.
 * Sessions are transient by design: abandoning mid-hazard forfeits
 * progress. The persistent piece (the player's hazard action deck)
 * rides `GameState.flags` via the package's deck-flags codec.
 */
export interface MobileHazardSlice {
    session: HazardSessionState | null;
}

/**
 * Mobile-only Rest-choice slice. Holds the active
 * rest node's session (engine: World/RestChoice) — `null` outside a rest.
 * A node is one irreversible choice of `rest` / `cut`; the shelter class
 * rides on the session itself (`session.shelter`), not a
 * sibling slice field. The claim ledger (heal / spend / removed card)
 * applies to the player at claim.
 */
export interface MobileRestSlice {
    session: RestChoiceSession | null;
}

/**
 * What a turned-in questline step paid, for the quest screen's ledger. Built
 * from the engine's `PaidQuestReward` (the one reward door), never recomputed
 * by the presenter.
 */
export interface MobileQuestPaid {
    /** The step that was turned in (1-based). */
    step: number;
    questName: string;
    experience: number;
    currency: number;
    /** Display names of the items the step put in the satchel. */
    itemNames: readonly string[];
}

/**
 * Mobile-only quest-screen slice. `open` names the quest node the screen is
 * showing (the screen re-resolves its stage from the live quest log, so ACCEPT
 * and TURN IN need no copy of engine state here); `paid` is the ledger of the
 * last turn-in; `cardOffers` are the card ids a `card-pick` reward rolled,
 * shown on the spoils tiles until taken or skipped. `null` outside a quest node.
 */
export interface MobileQuestSlice {
    open: { questline: string; node: number; description?: string } | null;
    paid: MobileQuestPaid | null;
    cardOffers: readonly string[];
}

/**
 * Mobile-only Loot-cache-choice encounter slice ("The Reliquary"). Holds
 * the active two-offer session (engine: World/LootCacheChoice) — `null`
 * outside one. The engine deals in real `Item`s directly (no opaque-ref
 * indirection).
 */
export interface MobileCacheSlice {
    session: LootCacheChoiceSession | null;
}

/**
 * Mobile-only Blacksmith encounter slice ("The Anvil"). Holds the active die-gear upgrade session (engine:
 * World/Blacksmith) — `null` outside one. The engine NEVER reads
 * `GameState`; the slice seeds it from `player.dieGear` + the player's
 * spendable currency (the placeholder budget unit the host maps), and
 * at claim writes `outcome.rail` to `Character.dieGear` and deducts
 * `outcome.spent`.
 */
export interface MobileBlacksmithSlice {
    session: BlacksmithSession | null;
}

/**
 * Mobile-only Labyrinth (THE APORIA) session slice. Durable progress
 * lives on the ENGINE state (`GameState.labyrinth`, persisted with the
 * save); this slice holds only the transient visit: which act is open,
 * the overworld snapshot restored on exit (the dev-menu entry must
 * leave the exploration tab untouched), and the Sophist's last remark
 * (a one-shot UI signal). `null` outside the labyrinth.
 */
export interface MobileLabyrinthSlice {
    session: {
        actId: LabyrinthActId;
        /** Overworld `world` snapshot, restored by `exitLabyrinth`. */
        savedWorld: WorldState | null;
        /** Latest POI inspection echo (remark strip + pickup line). */
        lastRemark: {
            poiId: string;
            remark: string;
            fragmentWord: string | null;
            revealedDisplay: string | null;
            trap: 'encounter' | 'hazard' | null;
        } | null;
        /** One-shot arrival signals for toasts (waystone / ejection). */
        arrivalNote: 'waystone' | 'ejected' | null;
    } | null;
}

/**
 * Mobile-only post-combat CARD REWARD slice (the 1-of-3 theme-aware draft).
 *
 * Held in the store rather than `CombatEncounterPanel`'s own React state so
 * an unmount mid-draft (navigating away, a remount) does not throw away a
 * reward the player has already earned: the offer is rolled once per won
 * encounter, held until the player picks or skips, and cleared on claim.
 *
 * Transient by design — the CLAIM is what persists (`addRewardCard` onto
 * `Character.combatRewardCards`, followed by an explicit `save()`), not the
 * pending offer.
 */
export interface MobileCombatRewardSlice {
    /** Card ids offered by the current draft; empty when no draft is open. */
    offers: readonly string[];
    /** True once the player picked or skipped — the overlay must not re-open. */
    claimed: boolean;
    /**
     * After an elite fight, the other option: one upgrade of a random owned
     * card (`rollEliteReward`). Null after any other fight, and when nothing
     * owned can be upgraded, so the overlay hides the option.
     */
    upgrade: EliteRewardUpgrade | null;
    /**
     * After an elite fight, the elite-only relic it dropped
     * (`rollEliteRelicDrop`), queued on the item-reward screen once the draft
     * is claimed. Absent or null when nothing dropped.
     */
    relicDrop?: { item: Equipment; eliteName: string } | null;
}

/**
 * One item waiting on the player's CONFIRM / EQUIP at `/item-reward`.
 *
 * The item is NOT yet in the inventory: the grant is what CONFIRM and EQUIP
 * commit, both through the engine's single `grantItem` path. The screen is
 * dismissible, so every exit route (back, swipe, Android hardware-back)
 * drains the queue as CONFIRM — the item cannot be lost by leaving.
 */
export interface PendingItemReward {
    /** The item to hand over. Cloned again by `grantItem` on commit. */
    item: Item;
    /** Where it came from, for the screen's eyebrow. `null` shows the default. */
    source: string | null;
    /**
     * Flags stamped onto `GameState.flags` when this entry commits — how a
     * one-shot grant (the first-node Suppliant's Ring) records that it settled.
     */
    settleFlags: readonly string[];
    /**
     * Which relic position EQUIP should displace when the row is full.
     * Omitted means the engine default (the last worn relic).
     */
    replaceIndex?: number;
}

/**
 * Mobile-only ITEM REWARD slice.
 *
 * A FIFO queue so a batch grant (a gathering haul, a loot cache, an encounter's
 * drops) can present its qualifying items one after another — the head is the
 * item on screen. Empty means no reward screen is open.
 *
 * Transient by design: the COMMIT is what persists (the `grantItem` result
 * written onto `player`, followed by an explicit `save()`), never the pending
 * offer.
 */
export interface MobileItemRewardSlice {
    queue: readonly PendingItemReward[];
}

export type AppStoreState = GameStore & {
    event: MobileEventSlice;
    combatReward: MobileCombatRewardSlice;
    itemReward: MobileItemRewardSlice;
    hazard: MobileHazardSlice;
    rest: MobileRestSlice;
    quest: MobileQuestSlice;
    cache: MobileCacheSlice;
    blacksmith: MobileBlacksmithSlice;
    labyrinthUi: MobileLabyrinthSlice;
    notifications: MobileNotificationsSlice;
    /**
     * Mobile-private ring buffer of recent engine events. Populated by
     * the emitter wired in `createAppStore`. Capacity 20, newest-first.
     * Leading underscore signals "mobile-only, not engine state". Not
     * persisted (see `wrapDeflectingAdapter`).
     */
    _recentEvents: ReadonlyArray<TypedGameEvent>;
    /**
     * Mobile-private counter bumped by the dev-only skip action
     * (`state/dev/skip-event.ts`) each time it resolves something. The
     * exploration screen watches it to tear down the in-place combat
     * overlay — the one surface whose "in progress" state lives in React
     * rather than the store. Optional so no boot/reset path has to seed
     * it; absent reads as 0. Not persisted.
     */
    _devSkipSeq?: number;
};

export type AppStore = StoreApi<AppStoreState>;

export interface CreateAppStoreOptions {
    adapter?: PersistenceAdapter;
    overrides?: Partial<GameState>;
}

export const EMPTY_EVENT_SLICE: MobileEventSlice = Object.freeze({
    pending: null,
    dialogueCursor: null,
    history: Object.freeze([]),
    sourceNodeType: null,
});

export const EMPTY_COMBAT_REWARD_SLICE: MobileCombatRewardSlice = Object.freeze({
    offers: Object.freeze([]),
    claimed: false,
    upgrade: null,
});

export const EMPTY_ITEM_REWARD_SLICE: MobileItemRewardSlice = Object.freeze({
    queue: Object.freeze([]),
});

export const EMPTY_HAZARD_SLICE: MobileHazardSlice = Object.freeze({ session: null });

export const EMPTY_REST_SLICE: MobileRestSlice = Object.freeze({
    session: null,
});

export const EMPTY_QUEST_SLICE: MobileQuestSlice = Object.freeze({
    open: null,
    paid: null,
    cardOffers: Object.freeze([]),
});

export const EMPTY_CACHE_SLICE: MobileCacheSlice = Object.freeze({
    session: null,
});

export const EMPTY_BLACKSMITH_SLICE: MobileBlacksmithSlice = Object.freeze({
    session: null,
});

export const EMPTY_LABYRINTH_SLICE: MobileLabyrinthSlice = Object.freeze({ session: null });

/**
 * Default notifications slice. `levelUpAcknowledged: true` and
 * `questAcknowledged: true` because a fresh store has no pending
 * level-up or quest; the engine `character:levelup` / `dialogue:applied`
 * events flip them to `false`.
 */
export const DEFAULT_NOTIFICATIONS_SLICE: MobileNotificationsSlice = Object.freeze({
    levelUpAcknowledged: true,
    questAcknowledged: true,
    toast: Object.freeze({ text: null, id: 0 }),
});

/** Ring-buffer capacity for `_recentEvents`. Small enough not to bloat memory or save payloads. */
export const RECENT_EVENTS_CAPACITY = 20;

/**
 * On mobile we don't want the engine deciding when AsyncStorage is
 * touched — saves are explicit.
 *
 * The engine gates its own autosave to a curated `DURABLE_ACTIONS` set
 * (`axiomancer-mechanics/src/Game/store.ts`). Mobile does not merely
 * narrow that gate, it bypasses it entirely:
 * `wrapDeflectingAdapter` proxies `load()` straight through and swallows
 * `save()` — INCLUDING the engine's durable-action autosaves — unless the
 * wrapper is in "passthrough" mode, which we only engage for the duration
 * of an explicit `store.save()` call below. So the engine allowlist has no
 * effect here, and every checkpoint on mobile is a deliberate `save()`
 * call site. Guarded by `state/e2e/exploration.engine.test.ts` ("mobile
 * owns save timing").
 *
 * That is the rule, not an accident: mobile is the one owner of save timing
 * on the app, and the engine's allowlist is the engine-only path the CLI
 * and the hermetic tests run on. A checkpoint is safe to take at any moment,
 * mid-fight included, because the state says what the player still owes: a
 * fight's node stays owed (`pendingArrival`) until the fight settles, so a
 * reload re-offers the fight rather than landing past it.
 */
function wrapDeflectingAdapter(real: PersistenceAdapter) {
    let passthrough = false;
    const adapter: PersistenceAdapter = {
        load: () => real.load(),
        save: (state) => {
            if (passthrough) real.save(state);
        },
    };
    function withPassthrough<T>(fn: () => T): T {
        passthrough = true;
        try {
            return fn();
        } finally {
            passthrough = false;
        }
    }
    return { adapter, withPassthrough };
}

/**
 * Per-store emitter registry. The emitter instance is held outside the
 * store's serialized state (zustand setState would treat it as state
 * and serialize on every dispatch). Consumers that need the emitter
 * directly (e.g. the `useGameEvents` hook) look it
 * up here.
 */
const EMITTER_BY_STORE = new WeakMap<AppStore, GameEventEmitter>();

/** Test-and-dev escape hatch: return the emitter attached to this store, or `null` if none was wired. */
export function getEmitterForStore(store: AppStore): GameEventEmitter | null {
    return EMITTER_BY_STORE.get(store) ?? null;
}

export function createAppStore(options: CreateAppStoreOptions = {}): AppStore {
    const { adapter: real = nullAdapter, overrides } = options;
    const { adapter, withPassthrough } = wrapDeflectingAdapter(real);
    const emitter = createEventEmitter();
    const engineStore = createGameStore(adapter, overrides, emitter);
    const store = engineStore as unknown as AppStore;

    // Engine's `save()` writes through `adapter.save(...)`. Gate the
    // wrapped adapter so only this explicit path reaches the real one.
    const engineSave = engineStore.getState().save;
    // A save taken inside the Aporia boots back into it.
    const resumed = resumeLabyrinthSession(engineStore.getState());
    store.setState({
        save: () => withPassthrough(engineSave),
        event: EMPTY_EVENT_SLICE,
        combatReward: EMPTY_COMBAT_REWARD_SLICE,
        itemReward: EMPTY_ITEM_REWARD_SLICE,
        hazard: EMPTY_HAZARD_SLICE,
        rest: EMPTY_REST_SLICE,
        quest: EMPTY_QUEST_SLICE,
        cache: EMPTY_CACHE_SLICE,
        blacksmith: EMPTY_BLACKSMITH_SLICE,
        labyrinthUi: resumed ? { session: resumed } : EMPTY_LABYRINTH_SLICE,
        notifications: DEFAULT_NOTIFICATIONS_SLICE,
        _recentEvents: [],
    });

    // Subscribe AFTER initial setState so the empty buffer is the
    // starting state. Future engine dispatches push onto the buffer.
    emitter.onAny((event: GameEvent) => {
        const typed = event as TypedGameEvent;
        const prev = store.getState()._recentEvents;
        const next = [typed, ...prev].slice(0, RECENT_EVENTS_CAPACITY);
        store.setState({ _recentEvents: next });
    });

    // Flip `levelUpAcknowledged` to false when the
    // engine fires `character:levelup`. The badge re-arms; visiting
    // the character screen flips it back to true. See
    // `state/presenters/navigation.engine.ts` for the predicate.
    emitter.on('character:levelup', () => {
        const prev = store.getState().notifications ?? DEFAULT_NOTIFICATIONS_SLICE;
        store.setState({
            notifications: { ...prev, levelUpAcknowledged: false },
        });
    });

    // Flip `questAcknowledged` to false when the applied
    // dialogue choice granted a quest (`effect.startQuest`). Mirrors
    // the level-up handler above; the Memoir tab badge re-arms and
    // clears on Memoir-screen mount. Payload shape probed the same
    // way `app/dialogue/index.tsx`'s confirmation-flash listener
    // does — `eventForAction` ships `{action: {payload: {choice}}}`
    // for `dialogue:applied`, untyped at the emitter layer.
    emitter.on('dialogue:applied', (event) => {
        const payload = event.payload as unknown as {
            action?: { payload?: { choice?: { effect?: { startQuest?: unknown } } } };
        };
        const startQuest = payload?.action?.payload?.choice?.effect?.startQuest;
        if (typeof startQuest !== 'string' || startQuest.length === 0) return;
        const prev = store.getState().notifications ?? DEFAULT_NOTIFICATIONS_SLICE;
        store.setState({
            notifications: { ...prev, questAcknowledged: false },
        });
    });

    EMITTER_BY_STORE.set(store, emitter);

    return store;
}

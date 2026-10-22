/**
 * Game reducer — pure top-level dispatch.
 *
 * `gameReducer(state, action)` is the single dispatch spine. Every store
 * action goes through here; the store layer wraps it with side effects
 * (autosave, event emission). The reducer itself is pure — it returns a
 * fresh `GameState` and never touches disk or any module-level mutable.
 *
 * Save / load are intentionally NO-OPS at the reducer level: persistence is a
 * side effect owned by `createGameStore`. The reducer only describes what the
 * state would become; the store decides what to do with it.
 */

import { GameState } from './types';
import { GameAction } from './actions.types';
import { Character } from '../Character/types';
import { Encounter, QuestLog } from '../World/types';
import { Enemy } from '../Enemy/types';
import {
    useConsumable as useConsumableItem,
} from '../Items/item.reducer';
import { useConsumableEffect } from '../Items/equipment.engine';
import { isConsumable } from '../Items/types';
import { lookupEffect } from '../Effects/effects.library';
import {
    equipItem as equipItemReducer,
    unequipItem as unequipItemReducer,
    wornMaxHpBonus,
} from '../Character/equipment.reducer';
import { createCharacter, allocateStatPoint } from '../Character';
import {
    grantFirstNodeRelic, isFirstNodeRelicPending,
} from '../Character/first-node-grant';
import { learnCard } from '../Cards';
import { createStartingWorld, emptyQuestLog } from '../World';
import type { MapName } from '../World/map.library';
import { moveToNode as moveWorld } from '../World/world.reducer';
import { resolveMapEvent, settleArrival } from '../World';
import { applyDialogueChoice as applyDialogueRuntime } from '../World/dialogue.runtime';
import { killObjectives, progressQuest, findQuest } from '../World/quest.engine';
import { calculateMaxHealth } from '../Utils';
import { STAT_POINTS_PER_LEVEL } from './game-mechanics.constants';
import { experienceForLevel } from '../Character/experience';
import { addItemStacking, rollEncounterLoot, totalEncounterXp } from './combat-grants';
import { getRng } from '../Utils/rng';
import { generateRunId } from './run-loop';

/**
 * Increment when GameState's shape changes. Save loaders branch on this so
 * old saves can be migrated rather than corrupted.
 *
 * Every hop from v11 on lives in `game.migrate.ts`. What each version added:
 * - v6: the required `runId: string` field.
 * - v7: the required `codex: CodexState` slice (`migrateV6toV7` defaults it to
 *   `{ unlockedEntries: [] }`).
 * - v9: the `regionConsequences` slice; v10: the `factionReputations` slice.
 * - v11: `player.knownSkills` is renamed `knownCards`.
 * - v12: `player.equipment` moves from the 7-slot record to the 5-slot
 *   `EquipmentLoadout`; worn gear re-slots deterministically and
 *   accessory/body overflow returns to inventory.
 * - v13: the 8 signet relics are seeded onto the player (default 5 worn,
 *   displaced gear + other 3 relics to inventory); maxHealth is recomputed.
 * - v14: every non-relic `Equipment` is purged from the loadout + inventory;
 *   a stripped loadout slot is backfilled with the default relic.
 * - v15: the die-gear rail (`player.dieGear`) is backfilled with the concrete
 *   default 4-color loadout so upgrades write to a real per-save object and
 *   never mutate the frozen `DEFAULT_DIE_GEAR`.
 * - v16: the per-run counter `player.cardRemovals` (the escalating removal
 *   price reads it) is materialised to 0; the field stays sparse-optional on
 *   fresh characters, and `cardRemovalsOf` reads both shapes as 0.
 * - v17: the dead `night-watch-tutorial-done` flag and any rest-minigame
 *   session in `flags` / the raw payload's `rest` key (a mobile-only slice)
 *   are dropped, so a stale session never reaches the rest-choice
 *   presenter. `night-keepsake:*` flags are kept: `/memoir`'s REMAINS
 *   section reads them.
 * - v18: any quest-board session in the raw payload's `quest` key (a
 *   mobile-only slice) is dropped.
 * - v19: a stale mobile-only gathering session is dropped.
 * - v20: any loot-cache session in the raw payload's `cache` key is dropped
 *   (`World/LootCacheChoice`'s three-offer choice replaces it), and the
 *   required `mapGoodwill: Record<string, number>` slice defaults to `{}`.
 * - v21: inter-map travel. `createStartingWorld` populates the `world`
 *   continent catalogue and `WorldState` gains the optional `mapStates`
 *   record of departed maps; the hop seeds the catalogue, preserving
 *   `currentContinent` / `currentMap` and any completed / available state.
 * - v22: 3 signet relics for the `head`/`hands`/`feet` accessory kinds are
 *   appended (benched) to an inventory that lacks them; everything else
 *   passes through.
 * - v23: every `combat-loadout-card:` flag is stripped. `buildCombatDeck`
 *   deals a curated loadout INSTEAD of `knownCards` whenever one exists, so a
 *   seeded loadout shadowed the starter bundle: the deck sat at
 *   `MIN_COMBAT_DECK_SIZE` and every rest-node CUT was refused, and a card
 *   outside the bundle could be dealt and then rejected by `executeCard`'s
 *   `knownCards` ownership guard mid-combat. `knownCards` +
 *   `combatRewardCards` is the deck. The loadout codec stays (dev/e2e
 *   harnesses pin decks through it); it is never seeded.
 * - v24: the Suppliant's Ring is handed over at the run's first node, not in
 *   `createCharacter`. The hop stamps `first-node-relic-granted` on every
 *   existing save, which already owns the ring, so no save is offered it
 *   twice. (A fresh save seeds no relics at all, with empty inventory and
 *   loadout, zero coin and zero XP; that needs no version bump.)
 * - v25: derived stats, luck, the non-combat saves, every non-maxHp stat
 *   line on equipment and the write-only `factionReputations` slice are
 *   stripped.
 * - v26: the philosophical-alignment grid, its observer cache and the GRACE
 *   meter (`moralMeter`) are stripped, and a card's `philosophicalAspect` is
 *   renamed `color`.
 * - v27: the roster is three foes; a staged encounter's removed foe is
 *   re-pointed to Float-Eye and survivors' keywords are stripped.
 * - v28: the world is Act 1; a save standing off Act 1 moves onto the
 *   Lantern Deep.
 * - v29: fishing-village and the village goodwill system are dropped:
 *   `mapGoodwill`, the goodwill flags, fishing-village's map entries and its
 *   two quests.
 * - v30: items are the healing potions; other consumable stacks and their
 *   effects are dropped.
 * - v31: the Paradox Token and Hexed flags are dropped.
 * - v32: the hazard deck is the core ten; acquired deck cards that no longer
 *   exist are dropped.
 * - v33: the write-only `regionConsequences` slice is dropped.
 * - v34: a save on a deleted map moves onto the Lantern Deep, and the
 *   deleted maps, quests and story flags are dropped.
 * - v35: the relic library is the Suppliant's Ring alone; every other relic
 *   is dropped.
 * - v36: levels cost a rising `L × 250` XP; a save's progress is
 *   re-expressed on that curve.
 */
export const GAME_STATE_VERSION = 38;

/**
 * Builds a brand-new GameState with default player and world.
 *
 * `opts.startMap` places the new game on another campaign map instead of the
 * default start (`STARTING_MAP`, the Breakwater). Used by the dev
 * "start on any map" tools and by tests pinned to one map's content.
 */
export function createNewGameState(opts: { startMap?: MapName } = {}): GameState {
    // No curated-loadout seed (see v23 in the version log above):
    // the combat deck is `knownCards` + `combatRewardCards`, and the client
    // seeds `knownCards` from the chosen starter bundle (`ensureStarterCards`).
    // A loadout flag here would shadow that bundle for the whole run.
    const flags: string[] = [];
    return {
        version: GAME_STATE_VERSION,
        runId: generateRunId(() => getRng().random()),
        // A fresh player starts at the apprentice baseline ({5,5,5} → 75 HP),
        // not the {1,1,1}/15 HP placeholder — a 15 HP start is one-shot
        // territory for the early encounters. Starter cards are seeded by the
        // client on first combat (`ensureStarterCards`).
        //
        // A fresh run seeds NO items,
        // no equipment, no currency and no XP. `seedStartingRelics` is off, so
        // the inventory and the worn loadout are both empty. The one relic
        // the run owes the player, the Suppliant's Ring, is handed over
        // at the first node (`Character/first-node-grant.ts` — with an empty
        // accessory row it simply fills the first seat, displacing nothing).
        //
        // Presets, fixtures, mocks and sims still seed the starting relics via
        // `buildCharacterFromPreset` / `cloneStartingRelics`; only the
        // real-player origination point differs. (`withholdFirstNodeRelic` is
        // kept exported for callers that seed the kit themselves.)
        player: createCharacter({
            name: 'Player',
            level: 1,
            baseStats: { heart: 5, body: 5, mind: 5 },
            seedStartingRelics: false,
        }),
        world: createStartingWorld(opts.startMap),
        quests: emptyQuestLog(),
        flags,
        rngState: getRng().getState(),
        codex: { unlockedEntries: [] },
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Type-guard for the `Enemy | Encounter` startCombat overload. */
function isEncounter(target: Enemy | Encounter): target is Encounter {
    return Array.isArray((target as Encounter).enemies);
}

/**
 * Level-up step. While the player has accumulated enough XP for the next
 * level, increment `level`, recompute `maxHealth` (base-stat pool plus the worn
 * armor relics' bonus), raise the threshold, and bank stat points (spent later
 * via `ALLOCATE_STAT_POINT`). A level-up does not heal: `health` keeps its
 * value, clamped to the new `maxHealth`. Healing comes from rest and items.
 */
function applyLevelUps(player: Character): Character {
    let next = player;
    while (next.experience >= next.experienceToNextLevel) {
        const level = next.level + 1;
        // Keep the worn armor relics' bonus.
        const maxHealth = calculateMaxHealth(level, next.baseStats) + wornMaxHpBonus(next.equipment);
        next = {
            ...next,
            level,
            maxHealth,
            health: Math.min(next.health, maxHealth),
            experienceToNextLevel: experienceForLevel(level + 1),
            // Grant STAT_POINTS_PER_LEVEL on every promotion.
            // Multi-level cascades accumulate without merging.
            availableStatPoints: (next.availableStatPoints ?? 0) + STAT_POINTS_PER_LEVEL,
        };
    }
    return next;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

/**
 * Settle a still-pending first-node relic grant (the Suppliant's Ring) onto
 * `state`, returning the same reference when there was nothing to settle.
 *
 * This is the reducer's floor, not the ceremony. See
 * `Character/first-node-grant.ts` for why the grant exists and what the
 * client-side hand-over looks like.
 */
function settleFirstNodeRelic(state: GameState): GameState {
    if (!isFirstNodeRelicPending(state.player, state.flags)) return state;
    const result = grantFirstNodeRelic(state.player, state.flags);
    return { ...state, player: result.character, flags: [...result.flags] };
}

/**
 * Pure dispatch spine. Routes every `GameAction` to the corresponding sub-
 * reducer and returns the resulting `GameState`. Never throws on unknown
 * action types — instead returns state unchanged (caller is responsible for
 * type safety).
 *
 * Autosave policy lives in `store.ts`:
 * only the curated `DURABLE_ACTIONS` set triggers an `adapter.save` call.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'START_COMBAT': {
            // The first-node grant's hard floor: nobody fights without their
            // starting kit. The ceremony belongs to the first node (a client
            // calls `grantFirstNodeRelic` there and shows what arrived), but
            // if a run reaches a fight with the grant still pending, settle
            // it here rather than let the player swing without The Open Hand.
            // Idempotent — a settled grant is a no-op.
            const staged = settleFirstNodeRelic(state);

            const encounter: Encounter = isEncounter(action.payload.target)
                ? action.payload.target
                : { enemies: [action.payload.target] };
            if (encounter.enemies.length === 0) {
                throw new Error('START_COMBAT: encounter has no enemies.');
            }

            const scaledEnemy = { ...encounter.enemies[0]! };

            // The store does not drive combat — it only stages the
            // encounter. The Hazard-Pattern engine runs the fight outside the
            // store; `END_COMBAT` consumes `currentEncounter` to grant rewards.
            const scaledEncounter: Encounter = {
                ...encounter,
                enemies: [scaledEnemy, ...encounter.enemies.slice(1)],
            };
            return {
                ...staged,
                currentEncounter: scaledEncounter,
            };
        }

        case 'END_COMBAT': {
            const encounter = state.currentEncounter;
            if (!encounter) return state;

            // The Hazard-Pattern combat driver reports the outcome. Default to
            // `'flee'` (no grants) when the caller omits it.
            const outcome: 'victory' | 'defeat' | 'flee' | 'friendship' =
                action.payload?.outcome ?? 'flee';

            // The befriended / defeated foe is the encounter's lead enemy.
            const foe: Enemy = encounter.enemies[0]!;

            // Promote the driver's final player snapshot (post-fight HP /
            // effects) when provided; restore the root inventory on defeat /
            // flee so combat-side inventory mutations don't leak. When the
            // caller omits `finalPlayer`, the root player is left untouched.
            const finalPlayer = action.payload?.finalPlayer;
            let nextPlayer: Character = finalPlayer
                ? ((outcome === 'victory' || outcome === 'friendship')
                    ? finalPlayer
                    : { ...finalPlayer, inventory: state.player.inventory })
                : state.player;

            let nextQuests: QuestLog = state.quests;

            if (outcome === 'victory' || outcome === 'friendship') {
                const grantedLoot = action.payload?.grantedLoot
                    ?? rollEncounterLoot(encounter, () => getRng().random());
                const grantedXp = action.payload?.grantedXp
                    ?? totalEncounterXp(encounter);

                let nextInventory = nextPlayer.inventory;
                for (const drop of grantedLoot) {
                    nextInventory = addItemStacking(nextInventory, drop);
                }
                nextPlayer = {
                    ...nextPlayer,
                    experience: nextPlayer.experience + grantedXp,
                    inventory: nextInventory,
                };
                // Advance any active `kill` objectives whose target matches.
                for (const enemy of encounter.enemies) {
                    const kills = killObjectives(nextQuests, enemy.name);
                    for (const k of kills) {
                        const res = progressQuest(nextQuests, k.questName, k.objectiveId, 1);
                        nextQuests = res.log;
                        if (res.completedName) {
                            const q = findQuest(state.quests, res.completedName);
                            if (q && typeof q.reward !== 'string' && q.reward && 'kind' in q.reward) {
                                if (q.reward.kind === 'currency') {
                                    nextPlayer = { ...nextPlayer, currency: nextPlayer.currency + q.reward.amount };
                                } else if (q.reward.kind === 'experience') {
                                    nextPlayer = { ...nextPlayer, experience: nextPlayer.experience + q.reward.amount };
                                }
                            }
                        }
                    }
                }
            }

            // Friendship resolutions append the per-enemy
            // `flagSet` to state.flags (de-duped). Reuses the existing
            // requires.flag machinery so downstream dialogue / quest
            // content can gate on the flag without engine work.
            let nextFlags = state.flags;
            if (outcome === 'friendship') {
                const flag = foe.friendshipReward?.flagSet;
                if (flag && !nextFlags.includes(flag)) {
                    nextFlags = [...nextFlags, flag];
                }
            }

            // Friendship resolutions auto-fire the per-enemy
            // codex unlock. The entry's id is appended to
            // state.codex.unlockedEntries (de-duped); the store layer
            // surfaces { id, title } on
            // CombatEndReport.friendshipReward.codexEntryUnlocked.
            let nextCodex = state.codex;
            if (outcome === 'friendship') {
                const entry = foe.journalEntry;
                if (entry && !nextCodex.unlockedEntries.includes(entry.id)) {
                    nextCodex = {
                        ...nextCodex,
                        unlockedEntries: [...nextCodex.unlockedEntries, entry.id],
                    };
                }
            }

            // The fight is over, so the node it was fought on is settled,
            // whatever the outcome: `resolveMapEvent` left the
            // arrival owed so a save taken mid-fight re-offers it.
            return settleArrival({
                ...state,
                player: nextPlayer,
                quests: nextQuests,
                flags: nextFlags,
                codex: nextCodex,
                currentEncounter: undefined,
            });
        }

        case 'MOVE_TO_NODE': {
            // Deliberately does NOT settle the first-node relic grant. Moving
            // is a world-only transition — `game.loop.engine.test.ts` pins
            // `next.player === state.player` — and handing the player an item
            // for walking would be a side effect nothing asked for. The grant
            // settles where a node is RESOLVED (`PROCESS_NODE`, or a client
            // calling `grantFirstNodeRelic` with a screen to show it), with
            // `START_COMBAT` as the floor.
            return {
                ...state,
                world: moveWorld(state.world, action.payload.nodeId),
            };
        }

        case 'PROCESS_NODE': {
            // Resolving a node IS the first node happening. Clients with a
            // screen to show the hand-over on — mobile — call
            // `grantFirstNodeRelic` themselves and present the result; this
            // settles it for everyone else (the CLI, the engine store).
            return resolveMapEvent(settleFirstNodeRelic(state)).state;
        }

        case 'APPLY_DIALOGUE': {
            return applyDialogueRuntime(state, action.payload.tree, action.payload.choice).gameState;
        }

        case 'USE_ITEM': {
            const { player } = state;
            const item = player.inventory.find(i => i.id === action.payload.itemId);
            if (!item || !isConsumable(item)) return state;
            const { player: healed } = useConsumableEffect(player, item, 0, lookupEffect);
            const nextInventory = useConsumableItem(healed.inventory, action.payload.itemId);
            return { ...state, player: { ...healed, inventory: nextInventory } };
        }

        case 'EQUIP_ITEM': {
            return { ...state, player: equipItemReducer(state.player, action.payload.item, action.payload.opts) };
        }

        case 'UNEQUIP_ITEM': {
            return { ...state, player: unequipItemReducer(state.player, action.payload.slot, action.payload.index) };
        }

        case 'GRANT_XP': {
            const amount = Math.max(0, Math.floor(action.payload.amount));
            if (amount === 0) return state;
            return { ...state, player: { ...state.player, experience: state.player.experience + amount } };
        }

        case 'LEVEL_UP': {
            return { ...state, player: applyLevelUps(state.player) };
        }

        case 'ALLOCATE_STAT_POINT': {
            return { ...state, player: allocateStatPoint(state.player, action.payload.stat) };
        }

        case 'LEARN_CARD': {
            return {
                ...state,
                player: learnCard(
                    state.player,
                    action.payload.cardId,
                ),
            };
        }

        case 'SAVE_GAME': {
            return {
                ...state,
                rngState: getRng().getState(),
            };
        }

        case 'LOAD_GAME':
            // Side effects owned by the store layer; reducer is pure.
            return state;

        case 'RESET_RUN': {
            const { keepCharacter } = action.payload;
            const freshRunId = generateRunId(() => getRng().random());

            if (!keepCharacter) {
                // Full new-game reset; carry rngState forward (don't
                // reset the seed mid-session, that breaks deterministic
                // replay) and assign a fresh runId.
                const fresh = createNewGameState();
                return { ...fresh, runId: freshRunId, rngState: state.rngState };
            }

            // keepCharacter: true — preserve persistent character ledger
            // (player + rngState; codex too — codex unlocks are
            // character knowledge, carry across runs); reset run-scoped
            // state. HP refills to maxHealth; effects clears defensively
            // (already empty between combats).
            return {
                version: GAME_STATE_VERSION,
                runId: freshRunId,
                player: {
                    ...state.player,
                    health: state.player.maxHealth,
                    effects: [],
                },
                world: createStartingWorld(),
                quests: emptyQuestLog(),
                flags: [],
                rngState: state.rngState,
                codex: state.codex,
            };
        }

        case 'UNLOCK_CODEX_ENTRY': {
            const { entryId } = action.payload;
            if (state.codex.unlockedEntries.includes(entryId)) return state;
            return {
                ...state,
                codex: {
                    ...state.codex,
                    unlockedEntries: [...state.codex.unlockedEntries, entryId],
                },
            };
        }
    }
}

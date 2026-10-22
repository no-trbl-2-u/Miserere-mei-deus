/**
 * Save-state validation + migration.
 *
 * Save files are tagged with `version`. A save older than v11 is rejected so
 * the caller starts a fresh game. From v11 a targeted chain of hops brings a
 * save to the current version: v11 → v12 (re-slot equipment to the 5-slot
 * model), v12 → v13 (seed the signet relics), v13 → v14 (purge non-relic
 * equipment), v14 → v15 (backfill the die-gear rail), v15 → v16 (default
 * the per-run card-removal counter), v16 → v17 (drop the rest minigame),
 * v17 → v18 (drop the Quest Board minigame), v18 → v19 (drop the Gathering
 * minigame), v19 → v20 (drop the loot-cache Pick Pool minigame), v20 → v21
 * (inter-map travel, seed the continent catalogue), v21 → v22 (version
 * bump), v22 → v23 (strip the starting curated-loadout flags that shadowed
 * the starter bundle), v23 → v24 (stamp the first-node relic grant as
 * already settled — every existing save already wears the Suppliant's
 * Ring), v24 → v25 (strip the derived stats and non-maxHp stat lines),
 * v25 → v26 (strip the alignment grid and GRACE, rename a card's
 * `philosophicalAspect` to `color`), v26 → v27 (a staged encounter naming a
 * removed foe re-points to Float-Eye, and survivors lose their stripped
 * keywords), v27 → v28 (a save standing off Act 1 moves onto the Lantern
 * Deep), v28 → v29 (fishing-village purged), v29 → v30 (the deleted
 * consumables and their effects dropped), v30 → v31 (the hazard token and
 * hex flags dropped), v31 → v32 (hazard deck cards outside the core ten
 * dropped), v32 → v33 (the write-only `regionConsequences` slice dropped),
 * v33 → v34 (the parked world's maps, quests and flags dropped), v34 → v35
 * (every relic but the Suppliant's Ring dropped), v35 → v36 (XP
 * re-expressed on the rising level curve), v36 → v37 (XP re-expressed on
 * the level-20 curve) and v37 → v38 (the Brine Hag's befriend flag and codex
 * entry renamed to the Green Jelly's). The hops chain, so a v11 save lands at
 * v38 in one `migrate` call. Every other version mismatch rejects.
 */

import { GameState } from './types';
import type { Character, EquipmentLoadout } from '../Character/types';
import type { Equipment, Item } from '../Items/types';
import { isEquipment } from '../Items/types';
import { getEquippedItems, wornMaxHpBonus } from '../Character/equipment.reducer';
import { cloneStartingRelics, getRelicById } from '../Items/relic.library';
import { calculateMaxHealth } from '../Utils';
import { experienceForLevel } from '../Character/experience';
import { getCardById } from '../Cards/cards.library';
import { STARTING_CARD_IDS } from '../Combat/combat.rewards';
import { reslotLegacyLoadout, reslotLegacyEquipment, type LegacySlot } from './legacy-slots';
import { concreteDefaultRail } from '../Character/dieGear.reducer';
import { GAME_STATE_VERSION } from './game.reducer';
import { COMBAT_LOADOUT_FLAG_PREFIX } from '../Combat/combat.loadout';
import { FIRST_NODE_RELIC_FLAG } from '../Character/first-node-grant';
import { FloatEye, LIVE_ENEMY_IDS } from '../Enemy/enemy.library';
import type { Continent, MapState, QuestLog, WorldState } from '../World/types';
import type { MapName } from '../World/map.library';
import { createMapState, getMapDefinition } from '../World/map.registry';
import { changeContinent, changeMap, placeOnNode, unlockMap } from '../World/world.reducer';

/**
 * v11 → v12: fold the player's 7-slot equipment record into the
 * 5-slot `EquipmentLoadout`, re-slot every persisted inventory equipment
 * instance, return worn overflow (a displaced `body` piece, 4th+ accessories)
 * to inventory. Pure over a
 * raw (untyped) save payload — casts are expected for save-data plumbing.
 */
function migrateV11ToV12(raw: Record<string, unknown>): Record<string, unknown> {
    const player = raw.player as (Partial<Character> & {
        equipment?: Partial<Record<LegacySlot, Equipment>>;
        inventory?: Item[];
    }) | undefined;
    if (!player || typeof player !== 'object') {
        return { ...raw, version: 12 };
    }

    const { loadout, overflow } = reslotLegacyLoadout(player.equipment ?? {});
    const inventory: Item[] = Array.isArray(player.inventory)
        ? player.inventory.map(it => (isEquipment(it) ? reslotLegacyEquipment(it) : it))
        : [];

    const nextLoadout: EquipmentLoadout = loadout;
    const migratedPlayer: Character = {
        ...(player as Character),
        equipment: nextLoadout,
        inventory: [...inventory, ...overflow],
    };

    return { ...raw, player: migratedPlayer, version: 12 };
}

/**
 * v12 → v13: seed the 8 signet relics onto the player so a loaded
 * save derives a full signature kit from the worn loadout. The fixed default 5 relics become the worn loadout;
 * any previously-worn gear is displaced to inventory; the other 3 relics also go
 * to inventory. `maxHealth` is recomputed off the relic
 * loadout (the two armor relics fold a +5 maxHp bonus onto `maxHealth`), and
 * current `health` is clamped to the new ceiling. Pure over a raw save payload.
 */
function migrateV12ToV13(raw: Record<string, unknown>): Record<string, unknown> {
    const player = raw.player as (Partial<Character> & {
        equipment?: EquipmentLoadout;
        inventory?: Item[];
    }) | undefined;
    if (!player || typeof player !== 'object' || player.baseStats == null || typeof player.level !== 'number') {
        return { ...raw, version: 13 };
    }

    const worn = cloneStartingRelics();
    const relicLoadout: EquipmentLoadout = {
        weapon: worn.find(w => w.slot === 'weapon') ?? null,
        armor: worn.find(w => w.slot === 'armor') ?? null,
        accessories: worn.filter(w => w.slot === 'accessory'),
    };

    // The relics lead the inventory (worn-first per slot) so the presenter's
    // inventory-position worn convention agrees with the new loadout; the old
    // worn gear stays in inventory but is demoted out of the worn window.
    // Nothing is lost: any previously-worn piece not already present in
    // inventory (a pure-engine save with worn gear only in the loadout) is
    // re-appended.
    const oldInventory: Item[] = Array.isArray(player.inventory) ? player.inventory.slice() : [];
    const oldIds = new Set(oldInventory.map(i => i.id));
    const displaced: Equipment[] = player.equipment ? getEquippedItems(player.equipment) : [];
    const displacedMissing = displaced.filter(d => !oldIds.has(d.id));
    const inventory: Item[] = [...worn, ...oldInventory, ...displacedMissing];

    const baseMaxHealth = calculateMaxHealth(player.level, player.baseStats);
    const nextMaxHealth = baseMaxHealth + wornMaxHpBonus(relicLoadout);
    const priorHealth = typeof player.health === 'number' ? player.health : nextMaxHealth;

    const migratedPlayer: Character = {
        ...(player as Character),
        equipment: relicLoadout,
        inventory,
        maxHealth: nextMaxHealth,
        health: Math.max(0, Math.min(priorHealth, nextMaxHealth)),
    };

    return { ...raw, player: migratedPlayer, version: 13 };
}

/**
 * v13 → v14: the procedural equipment library + factory are gone, so any
 * non-relic `Equipment` in a save is unresolvable dead data. Strip every
 * non-relic equipment from the loadout and inventory (relics are the only
 * equipment that survives); if a loadout slot held procedural gear, backfill it
 * with the default relic for that slot so combat never begins signature-short.
 * Consumables/materials/quest items are untouched. Pure over a raw save payload.
 */
function migrateV13ToV14(raw: Record<string, unknown>): Record<string, unknown> {
    const player = raw.player as (Partial<Character> & {
        equipment?: EquipmentLoadout;
        inventory?: Item[];
    }) | undefined;
    if (!player || typeof player !== 'object' || player.baseStats == null || typeof player.level !== 'number') {
        return { ...raw, version: 14 };
    }

    const isRelic = (e: Equipment): boolean =>
        typeof e.grantsSignature === 'string' || e.id.startsWith('relic-');

    // Strip non-relic equipment from inventory (keep consumables/materials/quest
    // items and the relic equipment).
    const inventory: Item[] = (Array.isArray(player.inventory) ? player.inventory : [])
        .filter(it => !isEquipment(it) || isRelic(it));

    // Rebuild the loadout: keep worn relics, replace any non-relic worn piece
    // with the default relic for that slot, and backfill the accessory row to 3.
    // The starting relics are the ring alone, so a slot with no
    // default stays empty (the v35 hop drops the deleted relics anyway).
    const defaults = cloneStartingRelics();
    const loadout = player.equipment;
    const weapon = loadout?.weapon && isRelic(loadout.weapon)
        ? loadout.weapon : defaults.find(r => r.slot === 'weapon') ?? null;
    const armor = loadout?.armor && isRelic(loadout.armor)
        ? loadout.armor : defaults.find(r => r.slot === 'armor') ?? null;
    const accessories: Equipment[] = (loadout?.accessories ?? []).filter(isRelic).slice(0, 3);
    for (const d of defaults.filter(r => r.slot === 'accessory')) {
        if (accessories.length >= 3) break;
        if (!accessories.some(a => a.id === d.id)) accessories.push(d);
    }
    const relicLoadout: EquipmentLoadout = { weapon, armor, accessories };

    const baseMaxHealth = calculateMaxHealth(player.level, player.baseStats);
    const nextMaxHealth = baseMaxHealth + wornMaxHpBonus(relicLoadout);
    const priorHealth = typeof player.health === 'number' ? player.health : nextMaxHealth;

    const migratedPlayer: Character = {
        ...(player as Character),
        equipment: relicLoadout,
        inventory,
        maxHealth: nextMaxHealth,
        health: Math.max(0, Math.min(priorHealth, nextMaxHealth)),
    };

    return { ...raw, player: migratedPlayer, version: 14 };
}

/**
 * v14 → v15: backfill the die-gear rail. A v14 save has no `player.dieGear`; the combat engine already falls back to the frozen
 * `DEFAULT_DIE_GEAR`, but a persisted default rail is the floor the blacksmith
 * upgrades write into — so a loaded save carries a real per-save object rather
 * than upgrading the frozen default. Only the rail is added; every other field
 * passes through untouched. A save that somehow already carries a rail keeps
 * it. Pure over a raw save payload.
 */
function migrateV14ToV15(raw: Record<string, unknown>): Record<string, unknown> {
    const player = raw.player as (Partial<Character> & Record<string, unknown>) | undefined;
    if (!player || typeof player !== 'object') {
        return { ...raw, version: 15 };
    }
    return {
        ...raw,
        player: { ...player, dieGear: player.dieGear ?? concreteDefaultRail() },
        version: 15,
    };
}

/**
 * v15 → v16: default the per-run card-removal counter. A v15 save has no `player.cardRemovals`; the escalating removal price
 * (`cardRemovalPrice`) reads that counter, and `cardRemovalsOf` already treats
 * an absent field as 0, so this hop is a materialisation rather than a repair —
 * a loaded save carries the counter explicitly, exactly as the die-gear hop
 * makes the rail a real per-save object. A save that somehow already carries a
 * count keeps it (a negative or non-numeric value is normalised to 0). Only the
 * counter is added; every other field passes through untouched. Pure over a raw
 * save payload.
 */
function migrateV15ToV16(raw: Record<string, unknown>): Record<string, unknown> {
    const player = raw.player as (Partial<Character> & Record<string, unknown>) | undefined;
    if (!player || typeof player !== 'object') {
        return { ...raw, version: 16 };
    }
    const prior = player.cardRemovals;
    const carried = typeof prior === 'number' && Number.isFinite(prior) && prior > 0
        ? Math.floor(prior)
        : 0;
    return {
        ...raw,
        player: { ...player, cardRemovals: carried },
        version: 16,
    };
}

/**
 * v16 → v17: drop the rest minigame.
 * Drops the dead `night-watch-tutorial-done` tutorial flag (the tutorial
 * screen it gated is deleted). Clears a live rest-minigame session that
 * rode along in the raw payload's `rest` key — that key is a mobile-only
 * store slice, not a formal `GameState` field, so it is untyped here; a
 * player mid-night at update time simply lands with the node consumed and
 * no pending choice, same as `resolveMapEvent` already consuming the node
 * on entry. `night-keepsake:*` flags are LEFT ALONE — `/memoir`'s REMAINS
 * section reads them back, and they are the only trace of the rest
 * minigame a player should still see. Pure over a raw save payload.
 */
function migrateV16ToV17(raw: Record<string, unknown>): Record<string, unknown> {
    const flags = Array.isArray(raw.flags)
        ? (raw.flags as unknown[]).filter(f => f !== 'night-watch-tutorial-done')
        : raw.flags;
    const { rest: _staleRestSession, ...withoutRest } = raw;
    return {
        ...withoutRest,
        flags,
        version: 17,
    };
}

/**
 * v17 → v18: drop the Quest Board minigame ("The Boy's
 * Almanac"). Clears a live quest-board session that rode along in the
 * raw payload's `quest` key — that key is a mobile-only store slice, not
 * a formal `GameState` field, so it is untyped here; a player mid-board
 * at update time simply lands with the node consumed and no pending
 * board, same as `resolveMapEvent` already consuming the node on entry
 * (fv-15 is an encounter now, so there is no board to return to). Pure
 * over a raw save payload.
 */
function migrateV17ToV18(raw: Record<string, unknown>): Record<string, unknown> {
    const { quest: _staleQuestBoardSession, ...withoutQuest } = raw;
    return {
        ...withoutQuest,
        version: 18,
    };
}

/**
 * v18 → v19: drop the Gathering minigame ("The Gleaning").
 * Clears a live gathering session that rode along in the raw payload's
 * `gathering` key — that key is a mobile-only store slice, not a formal
 * `GameState` field, so it is untyped here; a player mid-gleaning at
 * update time simply lands with the node consumed and its items already
 * granted (the resolver's grant now stands on its own — no minigame
 * spoils step to return to). Pure over a raw save payload.
 */
function migrateV18ToV19(raw: Record<string, unknown>): Record<string, unknown> {
    const { gathering: _staleGatheringSession, ...withoutGathering } = raw;
    return {
        ...withoutGathering,
        version: 19,
    };
}

/**
 * v19 → v20: drop the loot-cache Pick Pool minigame ("The
 * Reliquary"), replaced by `World/LootCacheChoice`'s three-offer choice.
 * Clears a live cache session that rode along in the raw payload's `cache`
 * key — that key is a mobile-only store slice, not a formal `GameState`
 * field, so it is untyped here; a player mid-delve at update time simply
 * lands with the node consumed and no session to return to (same shape the
 * v18→v19 gathering hop uses). Also defaults the new required
 * `mapGoodwill: Record<string, number>` slice to `{}` for saves that
 * predate it. Pure over a raw save payload.
 */
function migrateV19ToV20(raw: Record<string, unknown>): Record<string, unknown> {
    const { cache: _staleLootCacheSession, ...withoutCache } = raw;
    return {
        ...withoutCache,
        mapGoodwill: (withoutCache.mapGoodwill && typeof withoutCache.mapGoodwill === 'object')
            ? withoutCache.mapGoodwill
            : {},
        version: 20,
    };
}

/**
 * v20 → v21: inter-map travel. Old saves carry `world: []` —
 * the continent catalogue was never populated, so `changeContinent` could
 * only no-op. Seed the new two-continent catalogue (coastal + northern,
 * matching `createStartingWorld`), REPLACING the seeded entry that matches
 * `currentContinent.name` with the save's own continent so any completed /
 * available map state it accumulated is preserved. `currentContinent` and
 * `currentMap` pass through untouched; `mapStates` (the record of departed
 * maps) defaults to `{}`. A save whose catalogue is somehow already
 * populated keeps it. Pure over a raw save payload.
 */
function migrateV20ToV21(raw: Record<string, unknown>): Record<string, unknown> {
    const world = raw.world as {
        world?: unknown[];
        currentContinent?: { name?: string };
        mapStates?: unknown;
    } | undefined;
    if (!world || typeof world !== 'object') {
        return { ...raw, version: 21 };
    }

    const seeded = [
        {
            name: 'coastal-continent',
            description: 'The coastal continent is a landmass bordered by the sea to the east and west. It is home to a variety of biomes, including forests, mountains, and plains.',
            availableMaps: ['fishing-village'],
            lockedMaps: ['northern-forest'],
            completedMaps: [],
        },
        {
            name: 'northern-continent',
            description: 'The northern continent begins underground. Iron caverns climb toward the first city; a river runs on from there. Nobody arrives by daylight.',
            availableMaps: [],
            // Kept in sync with `createStartingWorld`. An older v21 save
            // carries only 'caverns' here and needs NO new
            // migration hop: the locked-map ledger is informational, and
            // `unlockMap` admits any registered destination at travel time
            // (see the travel-kind e2e's v21-catalogue regression).
            lockedMaps: ['caverns', 'northern-city'],
            completedMaps: [],
        },
    ];

    const catalogue = Array.isArray(world.world) && world.world.length > 0
        ? world.world
        : seeded.map(c =>
            world.currentContinent && world.currentContinent.name === c.name
                ? world.currentContinent
                : c,
        );

    return {
        ...raw,
        world: {
            ...world,
            world: catalogue,
            mapStates: (world.mapStates && typeof world.mapStates === 'object')
                ? world.mapStates
                : {},
        },
        version: 21,
    };
}

/**
 * v21 → v22 only bumps the version: the three signet relics it once appended
 * no longer exist (the v34 → v35 hop drops any a save still holds).
 */
function migrateV21ToV22(raw: Record<string, unknown>): Record<string, unknown> {
    return { ...raw, version: 22 };
}

/**
 * v22 → v23: strip the STARTING-LOADOUT SEED.
 *
 * A v22 save carries one `combat-loadout-card:<id>:<n>` flag
 * per `STARTING_CARD_IDS` entry. `buildCombatDeck` deals a loadout INSTEAD of
 * `knownCards` whenever one exists, so that 4-card seed silently replaced the
 * 18+-card starter bundle the player chose for the entire run: rest-node
 * CUTs were refused `deck-at-floor` (4 + a few rewards = the 12-card floor),
 * and a seeded starter the chosen bundle did not contain (`thin-hymn` on a
 * non-Threadbare bundle) was dealt but failed `executeCard`'s `knownCards`
 * ownership guard — the "Card 'thin-hymn' is not known." crash.
 *
 * Drops every loadout flag. Nothing else is touched: `knownCards` and
 * `combatRewardCards` already hold the real deck, and `cardRemovals` (the
 * price counter) is per-run and unaffected. Idempotent — a save with no
 * loadout flags passes through with only its version stamped. Pure over a
 * raw save payload.
 */
function migrateV22ToV23(raw: Record<string, unknown>): Record<string, unknown> {
    const flags = Array.isArray(raw.flags) ? (raw.flags as unknown[]) : [];
    const kept = flags.filter(f => typeof f !== 'string' || !f.startsWith(COMBAT_LOADOUT_FLAG_PREFIX));
    return { ...raw, flags: kept, version: 23 };
}

/**
 * v23 → v24: the Suppliant's Ring is handed over at the run's first node, not
 * seeded silently.
 *
 * Every save written at v23 or earlier already OWNS the ring — it was folded
 * into the character by `createCharacter` at t=0. So this migration grants
 * nothing and takes nothing away. All it does is stamp
 * `first-node-relic-granted` so no first-node hook ever offers an existing
 * player a relic they are already wearing.
 *
 * The one save that could arrive here without the ring is a v23 save whose
 * player dropped or sold it — a legal thing to have done. Stamping the flag
 * for that save is deliberate: the first-node grant is a NEW-RUN ceremony,
 * not a restitution mechanism, and silently re-issuing a relic the player
 * chose to part with would be the engine overruling them.
 *
 * Idempotent (a save already carrying the flag passes through with only its
 * version stamped) and pure over a raw save payload.
 */
function migrateV23ToV24(raw: Record<string, unknown>): Record<string, unknown> {
    const flags = Array.isArray(raw.flags) ? (raw.flags as unknown[]) : [];
    const next = flags.includes(FIRST_NODE_RELIC_FLAG) ? flags : [...flags, FIRST_NODE_RELIC_FLAG];
    return { ...raw, flags: next, version: 24 };
}

/**
 * Drops every stat line an item may no longer carry: v25 items hold only
 * `{ stat: 'maxHp', value }`. Non-object entries pass through untouched.
 */
function stripRetiredStatLines(item: unknown): unknown {
    if (!item || typeof item !== 'object') return item;
    const it = item as Record<string, unknown>;
    if (!Array.isArray(it.statModifiers)) return item;
    const lines = (it.statModifiers as Record<string, unknown>[])
        .filter(m => m && m.stat === 'maxHp')
        .map(m => ({ stat: 'maxHp', value: m.value }));
    return { ...it, statModifiers: lines };
}

/**
 * v24 → v25: derived stats and Faction are stripped.
 *
 * The six derived attack/defence stats, luck and the six non-combat
 * saves/tests were display-only (combat read none of them), and the
 * body/mind/heart lines on relics were inert (VITAE reads raw base stats).
 * All were deleted from the engine. This hop strips what a v24 save still
 * carries:
 *
 * - `player.derivedStats` and `player.nonCombatStats`;
 * - `derivedStats` on any staged encounter enemy;
 * - every non-`maxHp` stat line (and the `isMultiplier` flag) on
 *   owned and worn equipment;
 * - the top-level `factionReputations` slice (the Faction system was
 *   write-only — only a dev inspector read it — and was deleted in the same
 *   pass).
 *
 * Nothing that still means something changes: base stats, `maxHealth`,
 * `health` and the loadout pass through (the stripped lines never touched
 * VITAE). Idempotent and pure over a raw save payload.
 */
function migrateV24ToV25(raw: Record<string, unknown>): Record<string, unknown> {
    const { factionReputations: _f, ...kept } = raw;
    const out: Record<string, unknown> = { ...kept, version: 25 };

    const player = raw.player as Record<string, unknown> | undefined;
    if (player && typeof player === 'object') {
        const { derivedStats: _d, nonCombatStats: _n, ...rest } = player;
        const next: Record<string, unknown> = { ...rest };
        if (Array.isArray(rest.inventory)) next.inventory = rest.inventory.map(stripRetiredStatLines);
        const eq = rest.equipment as Record<string, unknown> | undefined;
        if (eq && typeof eq === 'object') {
            next.equipment = {
                ...eq,
                weapon: stripRetiredStatLines(eq.weapon ?? null),
                armor: stripRetiredStatLines(eq.armor ?? null),
                accessories: Array.isArray(eq.accessories) ? eq.accessories.map(stripRetiredStatLines) : eq.accessories,
            };
        }
        out.player = next;
    }

    const enc = raw.currentEncounter as Record<string, unknown> | null | undefined;
    if (enc && typeof enc === 'object' && Array.isArray(enc.enemies)) {
        out.currentEncounter = {
            ...enc,
            enemies: (enc.enemies as unknown[]).map(e => {
                if (!e || typeof e !== 'object') return e;
                const { derivedStats: _d, ...rest } = e as Record<string, unknown>;
                return rest;
            }),
        };
    }
    return out;
}

/** Renames a card's `philosophicalAspect` to `color`, anywhere in the tree. */
function renameCardAspect(node: unknown): unknown {
    if (Array.isArray(node)) return node.map(renameCardAspect);
    if (!node || typeof node !== 'object') return node;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        out[k === 'philosophicalAspect' ? 'color' : k] = renameCardAspect(v);
    }
    return out;
}

/**
 * v25 → v26: the philosophical-alignment grid and the
 * GRACE meter are gone. Strips `moralMeter`, `philosophicalAlignment` and the
 * `lastSeenAlignmentCells` observer cache, and renames every card's
 * `philosophicalAspect` to `color` (a staged encounter's enemies carry their
 * cards whole). Idempotent and pure over a raw save payload.
 */
function migrateV25ToV26(raw: Record<string, unknown>): Record<string, unknown> {
    const {
        moralMeter: _m, philosophicalAlignment: _p, lastSeenAlignmentCells: _l, ...kept
    } = raw;
    return { ...(renameCardAspect(kept) as Record<string, unknown>), version: 26 };
}

/**
 * v26 → v27: the roster is three foes. A staged encounter carries its
 * enemies whole, so one naming a removed foe re-points to a fresh Float-Eye
 * (the reload lands on a live foe), and a surviving foe drops the stripped
 * keywords and stage `gain` lists. Befriend flags and codex entries for
 * removed foes stay as inert
 * strings. Idempotent and pure over a raw save payload.
 */
function migrateV26ToV27(raw: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = { ...raw, version: 27 };
    const enc = raw.currentEncounter as Record<string, unknown> | null | undefined;
    if (enc && typeof enc === 'object' && Array.isArray(enc.enemies)) {
        out.currentEncounter = {
            ...enc,
            enemies: (enc.enemies as unknown[]).map(e => {
                if (!e || typeof e !== 'object') return e;
                const enemy = e as Record<string, unknown>;
                if (typeof enemy.id !== 'string' || !LIVE_ENEMY_IDS.has(enemy.id)) {
                    return structuredClone(FloatEye);
                }
                const rest: Record<string, unknown> = { ...enemy, keywords: [] };
                if (!Array.isArray(rest.stages)) return rest;
                return {
                    ...rest,
                    stages: (rest.stages as unknown[]).map(st => {
                        if (!st || typeof st !== 'object') return st;
                        const { gain: _g, ...kept } = st as Record<string, unknown>;
                        return kept;
                    }),
                };
            }),
        };
    }
    return out;
}

/** The four Act 1 maps: the only world in play. */
const ACT1_MAPS: ReadonlySet<string> = new Set(['breakwater', 'charcoal-wood', 'beacon-crags', 'lantern-deep']);

/**
 * v27 → v28: the world is Act 1.
 * A save standing off Act 1 moves to the Lantern Deep: onto the sealed vault
 * door (`ld-15`) from inside the Labyrinth, onto the sealed deep stair
 * (`ld-18`) from fishing-village or a parked map. The save's own Lantern Deep
 * state is reused when it has one (from the Labyrinth's `returnWorld` first),
 * and the player is PLACED, not arrived. A staged encounter from the old map
 * is dropped. An Act 1 save passes through with only its version stamped.
 */
function migrateV27ToV28(raw: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = { ...raw, version: 28 };
    const world = raw.world as WorldState | undefined;
    const current = world?.currentMap;
    if (!world || !current || typeof current.name !== 'string' || ACT1_MAPS.has(current.name)) return out;

    const fromLabyrinth = current.continent === 'labyrinth-continent';
    const labyrinth = raw.labyrinth as { returnWorld?: WorldState } | undefined;
    const base = fromLabyrinth && labyrinth?.returnWorld?.currentMap ? labyrinth.returnWorld : world;
    const target = fromLabyrinth ? 'ld-15' : 'ld-18';

    let next: WorldState;
    if (base.currentMap.name === 'lantern-deep') {
        next = base;
    } else {
        const preserved: Partial<Record<MapName, MapState>> = { ...(base.mapStates ?? {}) };
        if (base.currentMap.continent !== 'labyrinth-continent') {
            preserved[base.currentMap.name] = base.currentMap;
        }
        const deep = preserved['lantern-deep']
            ?? createMapState(getMapDefinition('northern-continent', 'lantern-deep'));
        delete preserved['lantern-deep'];
        next = unlockMap(changeContinent(base, 'northern-continent'), 'lantern-deep');
        next = { ...changeMap(next, deep), mapStates: preserved };
    }
    out.world = placeOnNode(next, target);
    delete out.currentEncounter;
    if (labyrinth && typeof labyrinth === 'object' && 'returnWorld' in labyrinth) {
        const { returnWorld: _r, ...kept } = labyrinth;
        out.labyrinth = kept;
    }
    return out;
}

/** The fishing-village quests purged with the map. */
const PURGED_QUESTS: ReadonlySet<string> = new Set(['starting-quest', 'get-to-forest']);
const PURGED_MAP: string = 'fishing-village';
/** The one-time goodwill bonus flag prefix, purged with the system. */
const GOODWILL_FLAG_PREFIX = 'village-goodwill-bonus:';

/**
 * v28 → v29: fishing-village and the
 * village goodwill system are purged. Drops `mapGoodwill` and the goodwill
 * bonus flags, takes fishing-village out of every continent's map lists and
 * `mapStates`, and drops its two quests from the quest log. v28 already moved
 * every save off fishing-village, so no position changes. Idempotent and pure
 * over a raw save payload.
 */
function migrateV28ToV29(raw: Record<string, unknown>): Record<string, unknown> {
    const { mapGoodwill: _goodwill, ...rest } = raw;
    const out: Record<string, unknown> = { ...rest, version: 29 };
    if (Array.isArray(raw.flags)) {
        out.flags = (raw.flags as unknown[]).filter(f => !(typeof f === 'string' && f.startsWith(GOODWILL_FLAG_PREFIX)));
    }
    const world = raw.world as WorldState | undefined;
    if (world && typeof world === 'object') {
        const scrub = (c: Continent): Continent => ({
            ...c,
            availableMaps: (c.availableMaps ?? []).filter(m => m !== PURGED_MAP),
            lockedMaps: (c.lockedMaps ?? []).filter(m => m !== PURGED_MAP),
            completedMaps: (c.completedMaps ?? []).filter(m => m !== PURGED_MAP),
        });
        const next: WorldState = {
            ...world,
            world: Array.isArray(world.world) ? world.world.map(scrub) : world.world,
            currentContinent: world.currentContinent ? scrub(world.currentContinent) : world.currentContinent,
        };
        if (world.mapStates && typeof world.mapStates === 'object') {
            const states = { ...world.mapStates } as Record<string, MapState>;
            delete states[PURGED_MAP];
            next.mapStates = states as Partial<Record<MapName, MapState>>;
        }
        out.world = next;
    }
    const quests = raw.quests as QuestLog | undefined;
    if (quests && typeof quests === 'object') {
        out.quests = {
            ...quests,
            available: (quests.available ?? []).filter(q => !PURGED_QUESTS.has(q.name)),
            active: (quests.active ?? []).filter(q => !PURGED_QUESTS.has(q.name)),
            completed: (quests.completed ?? []).filter(n => !PURGED_QUESTS.has(n)),
        };
    }
    return out;
}

/** The nineteen deleted consumables: only the healing potions stay. */
const RETIRED_CONSUMABLE_IDS: ReadonlySet<string> = new Set([
    'antidote', 'clarity-serum', 'focus-vial', 'heart-draught', 'body-elixir',
    'berserker-brew', 'philosopher-tea', 'resonance-crystal', 'revive-crystal',
    'void-essence', 'supreme-healing-potion', 'regeneration-tonic',
    'iron-skin-draught', 'whetstone-oil', 'hunters-elixir', 'quicksilver-vial',
    'phoenix-tear', 'war-horn-draught', 'greater-resonance-crystal',
]);

/** The effects deleted with those consumables (and the applier-less curse). */
const RETIRED_EFFECT_IDS: ReadonlySet<string> = new Set([
    'buff_accuracy_up', 'buff_critical_rate_up', 'buff_critical_damage_up',
    'buff_haste', 'buff_haste_surge', 'buff_status_chance_up', 'buff_liars_gambit',
    'buff_abyssal_presence', 'buff_all_stats_up', 'buff_regeneration',
    'buff_damage_reduction', 'buff_invincibility', 'buff_phoenix_vigor',
    'buff_stoic_resolve', 'buff_cleanse', 'buff_cleanse_minor', 'debuff_curse',
]);

/**
 * v29 → v30: items are the healing potions.
 * Drops every inventory stack of a deleted consumable and every active effect
 * on the player whose definition was deleted with them. Nothing is refunded:
 * the deleted items were no-ops or had no target. Idempotent and pure over a
 * raw save payload.
 */
function migrateV29ToV30(raw: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = { ...raw, version: 30 };
    const player = raw.player as Record<string, unknown> | undefined;
    if (!player || typeof player !== 'object') return out;
    const next: Record<string, unknown> = { ...player };
    if (Array.isArray(player.inventory)) {
        next.inventory = (player.inventory as unknown[]).filter(item => {
            const id = (item as { id?: unknown } | null)?.id;
            return !(typeof id === 'string' && RETIRED_CONSUMABLE_IDS.has(id));
        });
    }
    if (Array.isArray(player.effects)) {
        next.effects = (player.effects as unknown[]).filter(effect => {
            const id = (effect as { effectId?: unknown } | null)?.effectId;
            return !(typeof id === 'string' && RETIRED_EFFECT_IDS.has(id));
        });
    }
    out.player = next;
    return out;
}

/** The flags deleted with the Paradox Token and Hexed hazard outcomes. */
const RETIRED_HAZARD_TOKEN_FLAG_PREFIX = 'hazard-token-banked:';
const RETIRED_HAZARD_HEXED_FLAG = 'hazard-hexed';

/**
 * v30 → v31: hazard rewards do what they
 * say. Drops every banked Paradox Token flag and the Hexed flag; nothing ever
 * read either. Idempotent and pure over a raw save payload.
 */
function migrateV30ToV31(raw: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = { ...raw, version: 31 };
    if (Array.isArray(raw.flags)) {
        out.flags = (raw.flags as unknown[]).filter(flag =>
            !(typeof flag === 'string' &&
                (flag.startsWith(RETIRED_HAZARD_TOKEN_FLAG_PREFIX) || flag === RETIRED_HAZARD_HEXED_FLAG)));
    }
    return out;
}

/**
 * The v32 hazard deck: the prototype's ten cards plus the CRACK a failed
 * crossing deals. Frozen here so the hop means the same thing when the live
 * deck changes.
 */
const R6B_HAZARD_CARD_IDS: ReadonlySet<string> = new Set([
    'haul', 'grip', 'scram', 'runner', 'leap',
    'footing', 'windread', 'pole', 'oath', 'blessing', 'crack',
]);
const HAZARD_CARD_FLAG = 'hazard-card:';

/**
 * v31 → v32: the hazard deck is the
 * minimal core. Drops every acquired-card flag (`hazard-card:<id>:<n>`) whose
 * card was deleted; no refund. Idempotent and pure over a raw save payload.
 */
function migrateV31ToV32(raw: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = { ...raw, version: 32 };
    if (Array.isArray(raw.flags)) {
        out.flags = (raw.flags as unknown[]).filter(flag => {
            if (typeof flag !== 'string' || !flag.startsWith(HAZARD_CARD_FLAG)) return true;
            const rest = flag.slice(HAZARD_CARD_FLAG.length);
            const sep = rest.lastIndexOf(':');
            return R6B_HAZARD_CARD_IDS.has(sep === -1 ? rest : rest.slice(0, sep));
        });
    }
    return out;
}

/**
 * v32 → v33: the alt-win systems are
 * gone. Drops the `regionConsequences` slice: nothing ever wrote a region into
 * it, and its only reader (the spared-region boss buff) is deleted.
 * Idempotent and pure over a raw save payload.
 */
function migrateV32ToV33(raw: Record<string, unknown>): Record<string, unknown> {
    const { regionConsequences: _dropped, ...rest } = raw;
    return { ...rest, version: 33 };
}

/** The six deleted parked maps. */
const R7E_DELETED_MAPS: ReadonlySet<string> = new Set([
    'northern-forest', 'caverns', 'northern-city', 'connecting-river', 'town-across-river', 'the-capital',
]);

/** Their nine quests. */
const R7E_DELETED_QUESTS: ReadonlySet<string> = new Set([
    'gather-wood', 'get-to-cave', 'gather-iron', 'get-to-northern-city', 'get-to-connecting-river',
    'find-islanders', 'join-islanders-for-ritual', 'get-to-town-across-river', 'get-to-the-capital',
]);

/** The story flags their dialogue trees set. */
const R7E_DELETED_FLAGS: ReadonlySet<string> = new Set([
    'boy-chased-the-rumor', 'boy-witnessed-the-crowning', 'boy-witnessed-the-river-ritual',
    'sweetheart-was-nominated', 'shrine_keeper_recognizes_seeker',
]);

/** A flag keyed to a node of a deleted map (`nf-3`, `ncy-12`, …). */
const R7E_NODE_FLAG = /(^|[^a-z])(nf|nc|ncy|cr|tar|cap)-\d+/;

/**
 * v33 → v34: the parked world's content is
 * deleted. A save standing on a deleted map (only dev travel reaches one since
 * v28) moves onto the Lantern Deep's sealed deep stair (`ld-18`) by the v28
 * move, dropping a staged encounter; a Labyrinth save is left alone. The
 * deleted maps leave every continent's lists and `mapStates` (the v29 scrub),
 * their quests leave the log and their story and node flags drop. Idempotent
 * and pure over a raw save payload.
 */
function migrateV33ToV34(raw: Record<string, unknown>): Record<string, unknown> {
    let out: Record<string, unknown> = { ...raw, version: 34 };
    const world = raw.world as WorldState | undefined;
    const current = world?.currentMap;
    if (world && current && typeof current.name === 'string' && R7E_DELETED_MAPS.has(current.name)) {
        // The v28 move. The save is not in the Labyrinth, so its Labyrinth
        // slice is kept out of the move and passes through untouched.
        const { labyrinth, ...rest } = raw;
        out = { ...migrateV27ToV28(rest), version: 34 };
        if (labyrinth !== undefined) out.labyrinth = labyrinth;
    }
    const moved = out.world as WorldState | undefined;
    if (moved && typeof moved === 'object') {
        const scrub = (c: Continent): Continent => ({
            ...c,
            availableMaps: (c.availableMaps ?? []).filter(m => !R7E_DELETED_MAPS.has(m)),
            lockedMaps: (c.lockedMaps ?? []).filter(m => !R7E_DELETED_MAPS.has(m)),
            completedMaps: (c.completedMaps ?? []).filter(m => !R7E_DELETED_MAPS.has(m)),
        });
        const next: WorldState = {
            ...moved,
            world: Array.isArray(moved.world) ? moved.world.map(scrub) : moved.world,
            currentContinent: moved.currentContinent ? scrub(moved.currentContinent) : moved.currentContinent,
        };
        if (moved.mapStates && typeof moved.mapStates === 'object') {
            const states = { ...moved.mapStates } as Record<string, MapState>;
            for (const m of R7E_DELETED_MAPS) delete states[m];
            next.mapStates = states as Partial<Record<MapName, MapState>>;
        }
        out.world = next;
    }
    const quests = raw.quests as QuestLog | undefined;
    if (quests && typeof quests === 'object') {
        out.quests = {
            ...quests,
            available: (quests.available ?? []).filter(q => !R7E_DELETED_QUESTS.has(q.name)),
            active: (quests.active ?? []).filter(q => !R7E_DELETED_QUESTS.has(q.name)),
            completed: (quests.completed ?? []).filter(n => !R7E_DELETED_QUESTS.has(n)),
        };
    }
    if (Array.isArray(raw.flags)) {
        out.flags = (raw.flags as unknown[]).filter(f =>
            !(typeof f === 'string' && (R7E_DELETED_FLAGS.has(f) || R7E_NODE_FLAG.test(f))));
    }
    return out;
}

/**
 * v34 → v35: the relic library is the
 * Suppliant's Ring alone. Every other `relic-` equipment leaves the inventory
 * and every loadout slot; `maxHealth` is recomputed from the worn bonus that
 * remains (the two deleted armor relics carried +5) and `health` clamped. The
 * ring and every non-relic item pass through. Idempotent and pure over a raw
 * save payload.
 */
function migrateV34ToV35(raw: Record<string, unknown>): Record<string, unknown> {
    const player = raw.player as (Partial<Character> & {
        equipment?: EquipmentLoadout;
        inventory?: Item[];
    }) | undefined;
    if (!player || typeof player !== 'object') return { ...raw, version: 35 };

    const deleted = (it: Item | null | undefined): boolean =>
        !!it && isEquipment(it) && it.id.startsWith('relic-') && !getRelicById(it.id);
    const inventory: Item[] = (Array.isArray(player.inventory) ? player.inventory : [])
        .filter(it => !deleted(it));
    const loadout = player.equipment;
    if (!loadout) return { ...raw, player: { ...player, inventory }, version: 35 };
    const equipment: EquipmentLoadout = {
        weapon: deleted(loadout.weapon) ? null : loadout.weapon,
        armor: deleted(loadout.armor) ? null : loadout.armor,
        accessories: (loadout.accessories ?? []).filter(a => !deleted(a)),
    };

    const next: Record<string, unknown> = { ...player, inventory, equipment };
    if (typeof player.maxHealth === 'number') {
        const maxHealth = player.maxHealth - wornMaxHpBonus(loadout) + wornMaxHpBonus(equipment);
        next.maxHealth = maxHealth;
        if (typeof player.health === 'number') next.health = Math.max(0, Math.min(player.health, maxHealth));
    }
    return { ...raw, player: next, version: 35 };
}

/** The flat level cost every save before v36 was written against. */
const V35_EXPERIENCE_PER_LEVEL = 1000;

/** The v36 curve's step: reaching level L+1 cost `L × 250` more XP. */
const V36_EXPERIENCE_STEP = 250;

/** Total XP at which a character became `level` on the v36 curve. */
function v36ExperienceForLevel(level: number): number {
    return (V36_EXPERIENCE_STEP * (level - 1) * level) / 2;
}

/**
 * v35 → v36: a v35 save was written against a flat 1,000 XP per level; a
 * v36 level costs `level × 250`. The hop keeps the
 * player's `level` and their progress through it: progress below 0 (a
 * malformed save) clamps to 0, and progress past 1 (a level-up the player
 * has not taken yet) carries over so it stays pending. Pure over a raw v35
 * save payload.
 */
function migrateV35ToV36(raw: Record<string, unknown>): Record<string, unknown> {
    const player = raw.player as Partial<Character> | undefined;
    if (!player || typeof player !== 'object' || typeof player.level !== 'number') {
        return { ...raw, version: 36 };
    }
    const level = Math.max(1, Math.floor(player.level));
    const oldExperience = typeof player.experience === 'number' ? player.experience : 0;
    const progress = Math.max(0, (oldExperience - (level - 1) * V35_EXPERIENCE_PER_LEVEL) / V35_EXPERIENCE_PER_LEVEL);
    const experience = Math.round(v36ExperienceForLevel(level) + progress * level * V36_EXPERIENCE_STEP);
    return {
        ...raw,
        player: { ...player, experience, experienceToNextLevel: v36ExperienceForLevel(level + 1) },
        version: 36,
    };
}

/**
 * v36 → v37: the level curve moves to base 70 rising 10% a level to 20 (the
 * level a full Act 1 clear ends at), 15% to 40 and 20% after. The hop keeps
 * the player's `level` and banked stat points, and their progress through
 * the level as a fraction of its step: below 0 (a malformed save) clamps to
 * 0, past 1 (a level-up the player has not taken yet) carries over so it
 * stays pending. Pure over a raw v36 save payload.
 */
function migrateV36ToV37(raw: Record<string, unknown>): Record<string, unknown> {
    const player = raw.player as Partial<Character> | undefined;
    if (!player || typeof player !== 'object' || typeof player.level !== 'number') {
        return { ...raw, version: 37 };
    }
    const level = Math.max(1, Math.floor(player.level));
    const oldExperience = typeof player.experience === 'number' ? player.experience : 0;
    const oldStep = level * V36_EXPERIENCE_STEP;
    const progress = Math.max(0, (oldExperience - v36ExperienceForLevel(level)) / oldStep);
    const newStep = experienceForLevel(level + 1) - experienceForLevel(level);
    const experience = Math.round(experienceForLevel(level) + progress * newStep);
    return {
        ...raw,
        player: { ...player, experience, experienceToNextLevel: experienceForLevel(level + 1) },
        version: 37,
    };
}

/**
 * The Brine Hag became the Green Jelly: the same fight under a new id. A save
 * that befriended her carries her flag and her codex entry; each is renamed so
 * the befriend stays recorded and the codex entry still resolves. Old id to
 * new id.
 */
const V37_RENAMED_FLAGS: Readonly<Record<string, string>> = {
    'befriended-brine-hag': 'befriended-green-jelly',
};
const V37_RENAMED_CODEX_ENTRIES: Readonly<Record<string, string>> = {
    'codex-brine-hag': 'codex-green-jelly',
};

/** Rename each id in `ids` per `renames`, dropping a duplicate the rename makes. */
function renameIds(ids: unknown, renames: Readonly<Record<string, string>>): unknown {
    if (!Array.isArray(ids)) return ids;
    return [...new Set(ids.map(id => (typeof id === 'string' ? renames[id] ?? id : id)))];
}

/**
 * v37 → v38: the Brine Hag's `befriended-` flag and `codex-` entry move to
 * the Green Jelly's ids. Nothing else in a save names an enemy: the staged
 * encounter is never persisted and map state holds no payloads. Pure over a
 * raw v37 save payload.
 */
function migrateV37ToV38(raw: Record<string, unknown>): Record<string, unknown> {
    const codex = raw.codex as { unlockedEntries?: unknown } | undefined;
    return {
        ...raw,
        ...(raw.flags !== undefined ? { flags: renameIds(raw.flags, V37_RENAMED_FLAGS) } : {}),
        ...(codex && typeof codex === 'object'
            ? { codex: { ...codex, unlockedEntries: renameIds(codex.unlockedEntries, V37_RENAMED_CODEX_ENTRIES) } }
            : {}),
        version: 38,
    };
}

/**
 * Narrow a raw save payload to the current `GameState`. Only the current
 * version is accepted; any other version throws (the caller resets to a new
 * game). The name/signature is kept so the persistence layer's call site is
 * unchanged.
 *
 * @param raw         - The deserialised JSON object pulled from persistence.
 * @param fromVersion - The `version` field of the saved payload.
 * @param toVersion   - The target schema version (defaults to current).
 * @throws If the payload is not an object, is not the current version, or is
 *   missing required `GameState` fields.
 */
export function migrate(
    raw: unknown,
    fromVersion: number,
    toVersion: number = GAME_STATE_VERSION,
): GameState {
    if (!raw || typeof raw !== 'object') {
        throw new Error(`migrate: invalid save payload (got ${typeof raw}).`);
    }

    let working = raw as Record<string, unknown>;
    let version = fromVersion;

    // Supported hops: v11 → v12 re-slots equipment to the 5-slot model; v12 →
    // v13 seeds the signet relics; v13 → v14 purges non-relic gear;
    // v14 → v15 backfills the die-gear rail; v15 → v16 defaults the card-removal
    // counter; v16 → v17 drops the rest minigame; v17 → v18 drops the
    // Quest Board minigame; v18 → v19 drops the Gathering minigame; v19 →
    // v20 drops the loot-cache Pick Pool minigame and adds `mapGoodwill`;
    // v20 → v21 seeds the continent catalogue for inter-map travel; v21 → v22
    // is a version bump; v22 →
    // v23 strips the curated-loadout seed flags; v23 → v24 stamps the
    // first-node relic grant settled; v24 → v25 strips the derived
    // stats and stat lines; v25 → v26 strips the alignment grid and GRACE;
    // v26 → v27 re-points removed foes in a staged encounter to Float-Eye;
    // v27 → v28 moves a save off Act 1 onto the Lantern Deep; v28 → v29
    // drops fishing-village, its quests and the goodwill tally; v29 → v30
    // drops the deleted consumables and their effects; v30 → v31 drops the
    // hazard token and hex flags; v31 → v32 drops deleted hazard deck cards;
    // v32 → v33 drops the write-only region-consequences slice; v33 → v34
    // drops the parked world's maps, quests and flags; v34 → v35 drops every
    // relic but the Suppliant's Ring; v35 → v36 re-expresses XP on the
    // rising level curve; v36 → v37 re-expresses it on the level-20 curve;
    // v37 → v38 renames the Brine Hag's flag and codex entry to the Green
    // Jelly's. Chained so a v11 save lands at v38 in one call.
    if (version === 11 && toVersion >= 12) {
        working = migrateV11ToV12(working);
        version = 12;
    }
    if (version === 12 && toVersion >= 13) {
        working = migrateV12ToV13(working);
        version = 13;
    }
    if (version === 13 && toVersion >= 14) {
        working = migrateV13ToV14(working);
        version = 14;
    }
    if (version === 14 && toVersion >= 15) {
        working = migrateV14ToV15(working);
        version = 15;
    }
    if (version === 15 && toVersion >= 16) {
        working = migrateV15ToV16(working);
        version = 16;
    }
    if (version === 16 && toVersion >= 17) {
        working = migrateV16ToV17(working);
        version = 17;
    }
    if (version === 17 && toVersion >= 18) {
        working = migrateV17ToV18(working);
        version = 18;
    }
    if (version === 18 && toVersion >= 19) {
        working = migrateV18ToV19(working);
        version = 19;
    }
    if (version === 19 && toVersion >= 20) {
        working = migrateV19ToV20(working);
        version = 20;
    }
    if (version === 20 && toVersion >= 21) {
        working = migrateV20ToV21(working);
        version = 21;
    }
    if (version === 21 && toVersion >= 22) {
        working = migrateV21ToV22(working);
        version = 22;
    }
    if (version === 22 && toVersion >= 23) {
        working = migrateV22ToV23(working);
        version = 23;
    }
    if (version === 23 && toVersion >= 24) {
        working = migrateV23ToV24(working);
        version = 24;
    }
    if (version === 24 && toVersion >= 25) {
        working = migrateV24ToV25(working);
        version = 25;
    }
    if (version === 25 && toVersion >= 26) {
        working = migrateV25ToV26(working);
        version = 26;
    }
    if (version === 26 && toVersion >= 27) {
        working = migrateV26ToV27(working);
        version = 27;
    }
    if (version === 27 && toVersion >= 28) {
        working = migrateV27ToV28(working);
        version = 28;
    }
    if (version === 28 && toVersion >= 29) {
        working = migrateV28ToV29(working);
        version = 29;
    }
    if (version === 29 && toVersion >= 30) {
        working = migrateV29ToV30(working);
        version = 30;
    }
    if (version === 30 && toVersion >= 31) {
        working = migrateV30ToV31(working);
        version = 31;
    }
    if (version === 31 && toVersion >= 32) {
        working = migrateV31ToV32(working);
        version = 32;
    }
    if (version === 32 && toVersion >= 33) {
        working = migrateV32ToV33(working);
        version = 33;
    }
    if (version === 33 && toVersion >= 34) {
        working = migrateV33ToV34(working);
        version = 34;
    }
    if (version === 34 && toVersion >= 35) {
        working = migrateV34ToV35(working);
        version = 35;
    }
    if (version === 35 && toVersion >= 36) {
        working = migrateV35ToV36(working);
        version = 36;
    }
    if (version === 36 && toVersion >= 37) {
        working = migrateV36ToV37(working);
        version = 37;
    }
    if (version === 37 && toVersion >= 38) {
        working = migrateV37ToV38(working);
        version = 38;
    }

    if (version !== toVersion) {
        throw new Error(
            `migrate: save version ${fromVersion} is not supported (runtime is ${toVersion}); ` +
            'old saves are no longer migrated — start a new game.',
        );
    }

    return assertGameState(working);
}

/**
 * Drop the player card ids the library no longer holds, on every load.
 *
 * A save can outlive the cards it names: the grey-card purge left old ids in
 * `knownCards` and `combatRewardCards`, and a trial set taken out of the
 * library would do the same. Dealing an unknown id throws in
 * `executeCard`. This is not a version hop: a save at the current version can
 * hold them too, so the load paths call it after `migrate`. A save whose
 * `knownCards` named cards and kept none falls back to the starting cards.
 * Returns `state` itself when nothing changes.
 */
export function dropUnknownCardIds(state: GameState): GameState {
    const player = state.player;
    if (!player || typeof player !== 'object') return state;
    const known = (id: string): boolean => getCardById(id) !== undefined;
    const knownCards = player.knownCards ?? [];
    const rewards = player.combatRewardCards;
    const keptKnown = knownCards.filter(known);
    const keptRewards = rewards?.filter(known);
    if (keptKnown.length === knownCards.length && keptRewards?.length === rewards?.length) {
        return state;
    }
    const nextKnown = keptKnown.length === 0 && knownCards.length > 0 ? [...STARTING_CARD_IDS] : keptKnown;
    return {
        ...state,
        player: {
            ...player,
            knownCards: nextKnown,
            ...(keptRewards !== undefined ? { combatRewardCards: keptRewards } : {}),
        },
    };
}

/** `GameState.flags` entries that no code reads; `dropRetiredFlags` removes them. */
const RETIRED_FLAGS: ReadonlySet<string> = new Set([
    'combat-tutorial-done',
    'hazard-tutorial-done',
    'blacksmith-tutorial-done',
    'night-watch-tutorial-done',
]);

/**
 * Drop the `RETIRED_FLAGS` entries from `state.flags`, on every load.
 *
 * Like `dropUnknownCardIds` this is not a version hop: a save at the current
 * version can still carry them, so the load paths call it after
 * `dropUnknownCardIds`. Returns `state` itself when nothing changes.
 */
export function dropRetiredFlags(state: GameState): GameState {
    const flags = state.flags;
    if (!Array.isArray(flags) || !flags.some(f => RETIRED_FLAGS.has(f))) return state;
    return { ...state, flags: flags.filter(f => !RETIRED_FLAGS.has(f)) };
}

/**
 * Narrow `raw` to a `GameState`. Only the top-level shape is checked — the
 * sub-modules trust their own invariants and the serialiser writes the full
 * shape. Adjust here as `GameState` gains required keys.
 */
function assertGameState(raw: unknown): GameState {
    const r = raw as Partial<GameState>;
    if (typeof r.version !== 'number'
        || typeof r.runId !== 'string'
        || r.player == null
        || r.world == null
        || r.quests == null
        || !Array.isArray(r.flags)
        || typeof r.rngState !== 'number'
        || r.codex == null
        || !Array.isArray(r.codex.unlockedEntries)
    ) {
        throw new Error('migrate: payload missing required GameState fields.');
    }
    return raw as GameState;
}

/**
 * Roster-health audit (Phase RH1).
 *
 * The retired stewards' audit half, as one pure engine module: every enemy,
 * consumable, relic, NPC, dialogue node and quest reference is checked for
 * being **dangling** (it names an id that does not exist) or **orphaned**
 * (nothing in play reaches it).
 *
 * - A dangling reference is a bug by any reading. The engine test
 *   (`e2e/roster-health.engine.test.ts`) asserts there are none; `/iterate`
 *   files each as a `gap` and fixes it by deleting or re-pointing the
 *   reference.
 * - An orphan is a design state. Staging, granting or retiring it changes
 *   what the game offers, which is content T decides, so the test pins the
 *   current list and `/iterate` files each as a `content` row for T.
 *
 * HARD RULE: this audit never edits a library, pool, roster or dialogue tree,
 * and a `gap` fix touches only the dangling reference. Nothing here stages,
 * grants or retires a roster entity.
 *
 * Cards and keywords are not lenses. A `teachCard` naming a missing
 * card is a dangling dialogue reference; the card library itself is not
 * audited. The dev dummy `Sandbag_01` and the dev menu's grants (GET ALL
 * RELICS) do not count as reachable: they exist for the dev menu, not play.
 *
 * Shops: stock rides on `VillagePayload.shop` (`Items/shop.types.ts`). Act 1
 * stages no village, so the shop lens reports nothing today; it reads
 * whatever wares a registered pool declares and invents no stock table.
 *
 * Composes `auditNarrativeReachability` for the map-NPC lenses rather than
 * replacing it. Like that audit it reads the live MapEvent pool registry; if
 * nothing is registered (a hermetic test cleared it) the default sources
 * replay `registerMapEventContent()` first.
 *
 * CLI: `npm run roster-health -w axiomancer-mechanics [-- --json]`.
 */

import type { Enemy } from '../Enemy/types';
import { ENEMY_REGISTRY, EnemiesByMap, EnemyLibrary } from '../Enemy/enemy.library';
import type { Equipment, Item } from '../Items/types';
import { consumableLibrary } from '../Items/consumable.library';
import { relicLibrary } from '../Items/relic.library';
import { SIGNATURE_SKILLS } from '../Combat/combat.signature';
import { getCardById } from '../Cards/cards.library';
import type { DialogueTree } from '../NPCs/types';
import { MAP_REGISTRY } from './map.registry';
import type { MapDefinition, Reward } from './types';
import type { MapEventPool } from './MapEvents/types';
import { listRegisteredMapEventPools } from './MapEvents/resolve-map-event';
import { registerMapEventContent } from './MapEvents/content';
import { auditNarrativeReachability } from './narrative-reachability';
import type { Questline } from './questline';
import { AUTHORED_QUESTLINES } from './quest.library';

// ─── Report shape ─────────────────────────────────────────────────────────────

export type RosterSubject = 'enemy' | 'consumable' | 'relic' | 'item' | 'npc' | 'dialogue' | 'quest';

export type RosterDanglingLens =
    | 'enemy-slug'
    | 'loot-item'
    | 'shop-ware'
    | 'relic-signature'
    | 'dialogue-next'
    | 'dialogue-quest'
    | 'dialogue-card'
    | 'map-npc';

export type RosterOrphanLens =
    | 'enemy-unpooled'
    | 'item-ungranted'
    | 'npc-unreached'
    | 'dialogue-node-unreached'
    | 'quest-unstarted';

export interface RosterFinding {
    lens: RosterDanglingLens | RosterOrphanLens;
    subject: RosterSubject;
    /** The id that dangles (what was named) or is orphaned (what nothing reaches). */
    id: string;
    /** Where the reference or definition lives (pool id, enemy id, map:node, tree). */
    where: string;
    detail: string;
}

export interface RosterHealthReport {
    dangling: RosterFinding[];
    orphans: RosterFinding[];
}

// ─── Sources ──────────────────────────────────────────────────────────────────

/**
 * Everything the lenses read, gathered once. The live tree comes from
 * {@link collectRosterSources}; tests pass small synthetic sources to prove
 * each lens fires.
 */
export interface RosterSources {
    /** Slug-keyed enemies that map events may name (`ENEMY_REGISTRY`). */
    enemyRegistry: Readonly<Record<string, Enemy>>;
    /** The production roster (`EnemyLibrary`). */
    enemyLibrary: readonly Enemy[];
    /** The encounter generator's per-map draw pools (`EnemiesByMap`). */
    enemiesByMap: Readonly<Record<string, readonly Enemy[]>>;
    /** Enemy ids that exist for the dev menu and tests, never for play. */
    devOnlyEnemyIds: readonly string[];
    /** Every registered MapEvent pool. */
    pools: readonly MapEventPool[];
    /** Every registered map definition. */
    maps: readonly MapDefinition[];
    consumables: readonly Item[];
    relics: readonly Equipment[];
    signatureIds: ReadonlySet<string>;
    cardExists: (id: string) => boolean;
    /** Item ids a new run hands over (none today). */
    startingItemIds: readonly string[];
    /** Item ids a loot cache tier can roll (`rollCacheReward`'s pool). */
    cacheItemIds: readonly string[];
    /** Every authored questline: its steps' rewards grant items. */
    questlines?: readonly Questline[];
}

/** The live tree's sources. Replays MapEvent registration if the registry is empty. */
export function collectRosterSources(): RosterSources {
    if (listRegisteredMapEventPools().length === 0) registerMapEventContent();
    const maps = Object.values(MAP_REGISTRY)
        .flatMap(byName => Object.values(byName))
        .filter((def): def is MapDefinition => def !== undefined);
    return {
        enemyRegistry: ENEMY_REGISTRY,
        enemyLibrary: EnemyLibrary,
        enemiesByMap: EnemiesByMap,
        devOnlyEnemyIds: [ENEMY_REGISTRY.sandbag.id],
        pools: listRegisteredMapEventPools(),
        maps,
        consumables: consumableLibrary,
        relics: relicLibrary,
        signatureIds: new Set(Object.keys(SIGNATURE_SKILLS)),
        cardExists: id => getCardById(id) !== undefined,
        // A run starts with no item and is handed none.
        startingItemIds: [],
        // `rollCacheReward` draws uniformly from the whole consumable library.
        cacheItemIds: consumableLibrary.map(c => c.id),
        questlines: AUTHORED_QUESTLINES,
    };
}

// ─── Shared walks ─────────────────────────────────────────────────────────────

/** A granted item reference: the item (or bare ware id) and where it is named. */
interface ItemRef {
    id: string;
    /** `consumable` / `relic` when the reference says so; `ware` for a bare shop id. */
    kind: 'consumable' | 'relic' | 'ware' | 'other';
    where: string;
    lens: 'loot-item' | 'shop-ware';
}

function isRelicItem(item: Item): boolean {
    return item.category === 'equipment'
        && (item.id.startsWith('relic-') || (item as Equipment).grantsSignature !== undefined);
}

function itemKind(item: Item): ItemRef['kind'] {
    if (item.category === 'consumable') return 'consumable';
    if (isRelicItem(item)) return 'relic';
    return 'other';
}

function rewardItem(reward: Reward): Item | undefined {
    if (typeof reward !== 'object') return undefined;
    if ('category' in reward) return reward;
    if (reward.kind === 'item') return reward.item;
    return undefined;
}

function playEnemies(src: RosterSources): Enemy[] {
    const dev = new Set(src.devOnlyEnemyIds);
    const seen = new Map<string, Enemy>();
    for (const e of [...src.enemyLibrary, ...Object.values(src.enemyRegistry)]) {
        if (!dev.has(e.id) && !seen.has(e.id)) seen.set(e.id, e);
    }
    return [...seen.values()];
}

/** Every place an item can be granted in play, with where it is named. */
function itemRefs(src: RosterSources): ItemRef[] {
    const refs: ItemRef[] = [];
    const push = (item: Item, where: string): void => {
        refs.push({ id: item.id, kind: itemKind(item), where, lens: 'loot-item' });
    };
    for (const enemy of playEnemies(src)) {
        for (const entry of enemy.loot ?? []) {
            if (entry.item) push(entry.item, `${enemy.id}.loot`);
        }
        for (const item of enemy.friendshipReward?.items ?? []) push(item, `${enemy.id}.friendshipReward`);
    }
    for (const pool of src.pools) {
        for (const { payload } of pool.entries) {
            if (payload.kind === 'loot-cache' || payload.kind === 'gathering') {
                for (const item of payload.items ?? []) push(item, pool.id);
            } else if (payload.kind === 'village') {
                for (const ware of payload.shop?.wares ?? []) {
                    refs.push({ id: ware.itemId, kind: 'ware', where: `${pool.id}.shop`, lens: 'shop-ware' });
                }
            }
        }
    }
    for (const def of src.maps) {
        for (const quest of def.quests ?? []) {
            const item = rewardItem(quest.reward);
            if (item) push(item, `${def.name}.quest:${quest.name}`);
        }
    }
    for (const line of src.questlines ?? []) {
        for (const step of line.steps) {
            for (const reward of step.rewards) {
                const item = rewardItem(reward);
                if (item) push(item, `${line.id}.step:${step.step}`);
            }
        }
    }
    return refs;
}

/** Every dialogue tree in play, labelled with where it lives. */
function dialogueTrees(src: RosterSources): Array<{ tree: DialogueTree; where: string }> {
    const out: Array<{ tree: DialogueTree; where: string }> = [];
    for (const def of src.maps) {
        for (const npc of def.npcs ?? []) {
            if (npc.dialogueTree) out.push({ tree: npc.dialogueTree, where: `${def.name}.npc:${npc.name}` });
        }
    }
    for (const pool of src.pools) {
        for (const { payload } of pool.entries) {
            if (payload.kind === 'narration') out.push({ tree: payload.dialogue, where: `${pool.id}.narration` });
            if (payload.kind === 'village') {
                for (const npc of payload.merchants ?? []) {
                    if (npc.dialogueTree) out.push({ tree: npc.dialogueTree, where: `${pool.id}.merchant:${npc.name}` });
                }
            }
        }
    }
    return out;
}

function definedQuestNames(src: RosterSources): Set<string> {
    return new Set(src.maps.flatMap(def => (def.quests ?? []).map(q => q.name)));
}

// ─── Dangling lenses ──────────────────────────────────────────────────────────

/** A map event naming an enemy slug not in `ENEMY_REGISTRY`. */
export function danglingEnemySlugs(src: RosterSources): RosterFinding[] {
    const out: RosterFinding[] = [];
    for (const pool of src.pools) {
        for (const { payload } of pool.entries) {
            if (payload.kind !== 'encounter' || payload.enemySlug === undefined) continue;
            if (!(payload.enemySlug in src.enemyRegistry)) {
                out.push({
                    lens: 'enemy-slug', subject: 'enemy', id: payload.enemySlug, where: pool.id,
                    detail: 'encounter names an enemy slug not in ENEMY_REGISTRY',
                });
            }
        }
    }
    return out;
}

/** A loot table, reward, cache or shop naming a consumable or relic id no library has. */
export function danglingItems(src: RosterSources): RosterFinding[] {
    const consumableIds = new Set(src.consumables.map(c => c.id));
    const relicIds = new Set(src.relics.map(r => r.id));
    const out: RosterFinding[] = [];
    for (const ref of itemRefs(src)) {
        if (ref.kind === 'consumable' && !consumableIds.has(ref.id)) {
            out.push({ lens: ref.lens, subject: 'consumable', id: ref.id, where: ref.where, detail: 'consumable id not in consumableLibrary' });
        } else if (ref.kind === 'relic' && !relicIds.has(ref.id)) {
            out.push({ lens: ref.lens, subject: 'relic', id: ref.id, where: ref.where, detail: 'relic id not in relicLibrary' });
        } else if (ref.kind === 'ware' && !consumableIds.has(ref.id) && !relicIds.has(ref.id)) {
            out.push({ lens: ref.lens, subject: 'item', id: ref.id, where: ref.where, detail: 'shop ware names an item no library has' });
        }
    }
    for (const id of [...src.startingItemIds, ...src.cacheItemIds]) {
        if (!consumableIds.has(id) && !relicIds.has(id)) {
            out.push({ lens: 'loot-item', subject: 'item', id, where: 'starting or cache grant', detail: 'granted id no library has' });
        }
    }
    return out;
}

/** A relic whose `grantsSignature` is not a registered signature. */
export function danglingRelicSignatures(src: RosterSources): RosterFinding[] {
    return src.relics
        .filter(r => r.grantsSignature !== undefined && !src.signatureIds.has(r.grantsSignature))
        .map(r => ({
            lens: 'relic-signature' as const, subject: 'relic' as const, id: r.grantsSignature!, where: r.id,
            detail: 'grantsSignature not in SIGNATURE_SKILLS',
        }));
}

/** Dialogue choices naming a missing node, quest or card. */
export function danglingDialogue(src: RosterSources): RosterFinding[] {
    const quests = definedQuestNames(src);
    const out: RosterFinding[] = [];
    for (const { tree, where } of dialogueTrees(src)) {
        if (!(tree.rootId in tree.nodes)) {
            out.push({ lens: 'dialogue-next', subject: 'dialogue', id: tree.rootId, where, detail: 'rootId is not a node of its tree' });
        }
        for (const node of Object.values(tree.nodes)) {
            for (const choice of node.choices ?? []) {
                const at = `${where}#${node.id}`;
                if (choice.nextNodeId !== undefined && !(choice.nextNodeId in tree.nodes)) {
                    out.push({ lens: 'dialogue-next', subject: 'dialogue', id: choice.nextNodeId, where: at, detail: 'nextNodeId is not a node of its tree' });
                }
                const named = [
                    choice.effect?.startQuest, choice.effect?.progressQuest?.name, choice.effect?.completeQuest,
                    choice.requires?.quest, choice.requires?.questCompleted,
                ].filter((q): q is string => q !== undefined);
                for (const q of named) {
                    if (!quests.has(q)) {
                        out.push({ lens: 'dialogue-quest', subject: 'quest', id: q, where: at, detail: 'choice names a quest no map defines' });
                    }
                }
                const card = choice.effect?.teachCard;
                if (card !== undefined && !src.cardExists(card)) {
                    out.push({ lens: 'dialogue-card', subject: 'dialogue', id: card, where: at, detail: 'teachCard names a card not in the library' });
                }
            }
        }
    }
    for (const def of src.maps) {
        for (const quest of def.quests ?? []) {
            if (quest.nextQuest !== undefined && !quests.has(quest.nextQuest)) {
                out.push({ lens: 'dialogue-quest', subject: 'quest', id: quest.nextQuest, where: `${def.name}.quest:${quest.name}`, detail: 'nextQuest names a quest no map defines' });
            }
        }
    }
    return out;
}

/** An interaction naming an NPC neither rostered nor declared unstaged. */
export function danglingMapNpcs(src: RosterSources): RosterFinding[] {
    return src.maps.flatMap(def => auditNarrativeReachability(def).sceneryAsPeople.map(u => ({
        lens: 'map-npc' as const, subject: 'npc' as const, id: u.npcName, where: `${def.name}:${u.nodeId}`,
        detail: 'interaction names an NPC not on the roster and not in unstagedNpcs',
    })));
}

// ─── Orphan lenses ────────────────────────────────────────────────────────────

/** A production enemy in no `EnemiesByMap` pool and no registered encounter. */
export function orphanEnemies(src: RosterSources): RosterFinding[] {
    const reached = new Set<string>();
    for (const pool of Object.values(src.enemiesByMap)) for (const e of pool) reached.add(e.id);
    for (const pool of src.pools) {
        for (const { payload } of pool.entries) {
            if (payload.kind !== 'encounter' || payload.enemySlug === undefined) continue;
            const e = src.enemyRegistry[payload.enemySlug];
            if (e) reached.add(e.id);
        }
    }
    const dev = new Set(src.devOnlyEnemyIds);
    return src.enemyLibrary
        .filter(e => !dev.has(e.id) && !reached.has(e.id))
        .map(e => ({
            lens: 'enemy-unpooled' as const, subject: 'enemy' as const, id: e.id, where: 'EnemyLibrary',
            detail: 'in no EnemiesByMap pool and no encounter pool',
        }));
}

/** A consumable or relic no cache, shop, loot table, starting loadout or reward grants. */
export function orphanItems(src: RosterSources): RosterFinding[] {
    const granted = new Set<string>([...src.startingItemIds, ...src.cacheItemIds, ...itemRefs(src).map(r => r.id)]);
    const out: RosterFinding[] = [];
    for (const c of src.consumables) {
        if (!granted.has(c.id)) {
            out.push({ lens: 'item-ungranted', subject: 'consumable', id: c.id, where: 'consumableLibrary', detail: 'no cache, shop, loot table, starting loadout or reward grants it' });
        }
    }
    for (const r of src.relics) {
        if (!granted.has(r.id)) {
            out.push({ lens: 'item-ungranted', subject: 'relic', id: r.id, where: 'relicLibrary', detail: 'no cache, shop, loot table, starting loadout or reward grants it' });
        }
    }
    return out;
}

/** A rostered NPC with a dialogue tree no interaction names. */
export function orphanNpcs(src: RosterSources): RosterFinding[] {
    return src.maps.flatMap(def => auditNarrativeReachability(def).unreachableNpcs.map(name => ({
        lens: 'npc-unreached' as const, subject: 'npc' as const, id: name, where: def.name,
        detail: 'carries a dialogueTree no interaction names',
    })));
}

/** A dialogue node neither the root nor any choice reaches. */
export function orphanDialogueNodes(src: RosterSources): RosterFinding[] {
    const out: RosterFinding[] = [];
    for (const { tree, where } of dialogueTrees(src)) {
        const reached = new Set<string>();
        const queue = [tree.rootId];
        while (queue.length > 0) {
            const id = queue.pop()!;
            if (reached.has(id)) continue;
            reached.add(id);
            for (const choice of tree.nodes[id]?.choices ?? []) {
                if (choice.nextNodeId !== undefined) queue.push(choice.nextNodeId);
            }
        }
        for (const id of Object.keys(tree.nodes)) {
            if (!reached.has(id)) {
                out.push({ lens: 'dialogue-node-unreached', subject: 'dialogue', id, where, detail: 'no choice and no entry point reaches this node' });
            }
        }
    }
    return out;
}

/** A quest no dialogue choice starts and no other quest chains into. */
export function orphanQuests(src: RosterSources): RosterFinding[] {
    const started = new Set<string>();
    for (const { tree } of dialogueTrees(src)) {
        for (const node of Object.values(tree.nodes)) {
            for (const choice of node.choices ?? []) {
                if (choice.effect?.startQuest) started.add(choice.effect.startQuest);
            }
        }
    }
    for (const def of src.maps) for (const q of def.quests ?? []) if (q.nextQuest) started.add(q.nextQuest);
    return src.maps.flatMap(def => (def.quests ?? [])
        .filter(q => !started.has(q.name))
        .map(q => ({
            lens: 'quest-unstarted' as const, subject: 'quest' as const, id: q.name, where: def.name,
            detail: 'no dialogue choice or map event starts it',
        })));
}

// ─── The audit ────────────────────────────────────────────────────────────────

/**
 * Runs every lens. Pure over `sources` (the live tree by default): reads,
 * never writes.
 */
export function auditRosterHealth(sources: RosterSources = collectRosterSources()): RosterHealthReport {
    return {
        dangling: [
            ...danglingEnemySlugs(sources),
            ...danglingItems(sources),
            ...danglingRelicSignatures(sources),
            ...danglingDialogue(sources),
            ...danglingMapNpcs(sources),
        ],
        orphans: [
            ...orphanEnemies(sources),
            ...orphanItems(sources),
            ...orphanNpcs(sources),
            ...orphanDialogueNodes(sources),
            ...orphanQuests(sources),
        ],
    };
}

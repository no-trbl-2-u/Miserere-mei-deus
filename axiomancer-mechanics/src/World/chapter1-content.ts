/**
 * Chapter 1's content, as data (phase SM2b, chunk 135.2; A5 of
 * `plan/135-sm2-sim-follow-ups.md`): every node of the chapter's map (its
 * kind, gate or not, story or side), its quests and their steps, the foes its
 * pools stage, the hazards a crossing can draw, the items its pools, caches,
 * villages and quests can pay, its gates in story order, and the regions those
 * gates cut it into.
 *
 * It is the universe the nightly sim report reads "never reached" against
 * (chunk 135.6) and the gate order that cuts the chapter into regions for
 * pacing. Everything is read from the map definition, the registered pools,
 * the registered questlines and the libraries, never a node or foe id in code:
 * `mapContent(def)` lists any map, `chapter1Content()` the map a new game
 * starts on (`createStartingWorld`).
 *
 * **Story order.** The main questline's steps are walked in order; each step
 * needs some nodes (`stepNodes`: its giver, its objectives' targets, its
 * turn-in), then the chapter's exit. The shortest walk from the start to each
 * (roads both ways, same-map passages, every gate open) crosses gates; a gate
 * takes its place the first time a walk crosses it. A gate no walk crosses
 * comes last, by depth.
 *
 * **Regions.** Region 0 is everything the start reaches crossing no gate;
 * region i (i >= 1) is what lies past gate i-1 of the story order and past no
 * later gate. A node's region is the latest gate its walk from the start
 * crosses. A gate's own node sits in the region it is reached from.
 *
 * Pure: no RNG, no state.
 */

// The authored pools and questlines register on load (as `World/index.ts` does).
import './MapEvents/content';
import './quest.library';
import { ENEMY_REGISTRY, type EnemySlug } from '../Enemy/enemy.library';
import type { EnemyDifficulty } from '../Enemy/types';
import { relicLibrary } from '../Items/relic.library';
import type { Item } from '../Items/types';
import { HAZARD_LIBRARY } from './Hazard/hazard.content';
import { getNodeEventPool, getNodePrimaryEventKind } from './MapEvents/resolve-map-event';
import type { MapEventKind } from './MapEvents/types';
import { payloadDifficulty } from './encounter-tier';
import { nodePlace } from './held-roads';
import { getMapDefinition } from './map.registry';
import { questGatesOn } from './quest-gates';
import { listQuestlines, turnInNodeOf, type Questline } from './questline';
import { mapPassages } from './road-reachability';
import { createStartingWorld } from './starting-world';
import type { MapDefinition, NodeId, Reward } from './types';
import {
    exitNodes, mainQuestline, nodeStagesBoss, nodeStagesElite, poolEncounters, questlinesOn, stepNodes,
} from './chapter-story';

/** One node of the chapter. */
export interface ChapterNode {
    readonly id: NodeId;
    /** The node's engine event kind, or null for an empty waypoint. */
    readonly kind: MapEventKind | null;
    /** The authored place name, when the node has one. */
    readonly place: string | null;
    /** True when the node holds a road on (a held node, or the near end of a quest gate). */
    readonly gate: boolean;
    /** `story` when the main questline needs it or it is a gate, the boss or the exit; else `side`. */
    readonly role: 'story' | 'side';
    readonly elite: boolean;
    readonly boss: boolean;
    /** True when the node's trip leaves the map (the chapter's exit). */
    readonly exit: boolean;
    /** The node's region (an index into `regions`). */
    readonly region: number;
}

/** One objective of a quest step, as authored. */
export interface ChapterObjective {
    readonly id: string;
    readonly type: string;
    readonly target: string | null;
    readonly foeClass: string | null;
}

/** One step of a questline. */
export interface ChapterQuestStep {
    readonly step: number;
    /** The quest log's name for the step (`Quest.name`). */
    readonly questName: string;
    /** The node that gives it. */
    readonly nodeId: NodeId;
    /** The node it is turned in at, or null when it settles where it is met. */
    readonly turnInNodeId: NodeId | null;
    readonly settle: string;
    readonly objectives: readonly ChapterObjective[];
}

/** One questline on the chapter's map. */
export interface ChapterQuest {
    readonly id: string;
    readonly name: string | null;
    /** True for the chapter's main questline (`mainQuestline`), false for a side quest. */
    readonly main: boolean;
    readonly steps: readonly ChapterQuestStep[];
}

/** One way a node stages a foe. */
export interface ChapterStaging {
    readonly nodeId: NodeId;
    readonly level: number | null;
    readonly difficulty: EnemyDifficulty | null;
    readonly boss: boolean;
}

/** One foe the chapter's pools stage, with every node that stages it. */
export interface ChapterEnemy {
    /** The foe's id, as the play log's `fights.enemy_id` records it. */
    readonly id: string;
    readonly slug: string;
    readonly name: string;
    readonly stagings: readonly ChapterStaging[];
}

/** One hazard a crossing on the chapter can draw. */
export interface ChapterHazard {
    /** The hazard's id, as the run log's `hazard-ended` records it. */
    readonly id: string;
    readonly title: string;
    /** The hazard nodes it can be crossed at (any hazard node draws any hazard). */
    readonly nodeIds: readonly NodeId[];
}

/** Where an item can come from. */
export type ChapterItemSource = 'loot-cache' | 'foe-drop' | 'elite-drop' | 'quest' | 'village';

/** One item the chapter can pay, with every source and node that pays it. */
export interface ChapterItem {
    /** The item's id, as the run log's `item-gained` records it. */
    readonly id: string;
    readonly name: string;
    readonly category: string;
    readonly sources: readonly ChapterItemSource[];
    readonly nodeIds: readonly NodeId[];
}

/** One gate, in story order. */
export interface ChapterGate {
    /** `held:<node>` for a held node, `quest:<from>><to>` for a quest gate. */
    readonly id: string;
    readonly kind: 'held' | 'quest';
    /** The node the gate stands on (the held node, or the quest gate's near end). */
    readonly nodeId: NodeId;
    /** The nodes the gate opens onto. */
    readonly opensTo: readonly NodeId[];
}

/** One region: the nodes between one gate and the next. */
export interface ChapterRegion {
    readonly index: number;
    /** The gate that opens it, or null for the start's region. */
    readonly gateId: string | null;
    readonly nodeIds: readonly NodeId[];
}

/** A chapter's content (see the file header). */
export interface ChapterContent {
    readonly continent: string;
    readonly map: string;
    readonly startNodeId: NodeId;
    readonly exitNodeIds: readonly NodeId[];
    readonly nodes: readonly ChapterNode[];
    readonly quests: readonly ChapterQuest[];
    readonly enemies: readonly ChapterEnemy[];
    readonly hazards: readonly ChapterHazard[];
    readonly items: readonly ChapterItem[];
    readonly gates: readonly ChapterGate[];
    readonly regions: readonly ChapterRegion[];
}

// ─── The walk ────────────────────────────────────────────────────────────────

/** Every node's neighbours: roads both ways, plus same-map passages. */
function neighbourMap(def: MapDefinition): Map<NodeId, NodeId[]> {
    const out = new Map<NodeId, NodeId[]>(def.nodes.map(n => [n.id, []]));
    const join = (a: NodeId, b: NodeId): void => {
        if (!out.has(a) || !out.has(b)) return;
        if (!out.get(a)!.includes(b)) out.get(a)!.push(b);
    };
    for (const n of def.nodes) for (const to of n.connectedNodes) { join(n.id, to); join(to, n.id); }
    for (const p of mapPassages(def)) { join(p.from, p.to); join(p.to, p.from); }
    return out;
}

/** The shortest walk from the start to every node, as each node's path (start first). */
function walksFromStart(def: MapDefinition): Map<NodeId, NodeId[]> {
    const neighbours = neighbourMap(def);
    const start = def.startingNode.id;
    const paths = new Map<NodeId, NodeId[]>([[start, [start]]]);
    const queue: NodeId[] = [start];
    while (queue.length > 0) {
        const at = queue.shift()!;
        for (const next of neighbours.get(at) ?? []) {
            if (paths.has(next)) continue;
            paths.set(next, [...paths.get(at)!, next]);
            queue.push(next);
        }
    }
    return paths;
}

/** Every gate on the map, unordered: held nodes in their list's order, then quest gates in step order. */
function mapGates(def: MapDefinition, questlines: readonly Questline[]): ChapterGate[] {
    const held = (def.holdRoadsUntilSettled ?? []).map((nodeId): ChapterGate => ({
        id: `held:${nodeId}`,
        kind: 'held',
        nodeId,
        opensTo: [...(def.nodes.find(n => n.id === nodeId)?.connectedNodes ?? [])],
    }));
    const quest = questGatesOn(def, questlines).map(({ road }): ChapterGate => ({
        id: `quest:${road.from}>${road.to}`,
        kind: 'quest',
        nodeId: road.from,
        opensTo: [road.to],
    }));
    return [...held, ...quest];
}

/** The gates a walk crosses, in the order it crosses them. */
function gatesCrossed(path: readonly NodeId[], gates: readonly ChapterGate[]): ChapterGate[] {
    const out: ChapterGate[] = [];
    for (let i = 0; i + 1 < path.length; i++) {
        for (const gate of gates) {
            if (gate.nodeId === path[i] && gate.opensTo.includes(path[i + 1]!) && !out.includes(gate)) out.push(gate);
        }
    }
    return out;
}

/** The nodes the story needs, in story order: each main step's nodes, then the exit. */
function storyWalkTargets(def: MapDefinition, main: Questline | null): NodeId[] {
    const out: NodeId[] = [];
    for (const step of main?.steps ?? []) for (const id of stepNodes(def, main!, step)) if (!out.includes(id)) out.push(id);
    for (const id of exitNodes(def)) if (!out.includes(id)) out.push(id);
    return out;
}

function depthOf(def: MapDefinition, nodeId: NodeId): number {
    return def.nodes.find(n => n.id === nodeId)?.location[0] ?? 0;
}

/** The gates in story order (see the file header). */
export function storyOrderedGates(def: MapDefinition, questlines: readonly Questline[] = listQuestlines()): ChapterGate[] {
    const gates = mapGates(def, questlines);
    const walks = walksFromStart(def);
    const ordered: ChapterGate[] = [];
    for (const target of storyWalkTargets(def, mainQuestline(def, questlines))) {
        for (const gate of gatesCrossed(walks.get(target) ?? [], gates)) if (!ordered.includes(gate)) ordered.push(gate);
    }
    const rest = gates.filter(g => !ordered.includes(g)).sort((a, b) => depthOf(def, a.nodeId) - depthOf(def, b.nodeId));
    return [...ordered, ...rest];
}

// ─── The listings ────────────────────────────────────────────────────────────

/** The item a reward pays, or null when it pays no item. */
function rewardItem(reward: Reward): Item | null {
    if (typeof reward !== 'object') return null;
    if ('kind' in reward) return reward.kind === 'item' ? reward.item : null;
    return reward;
}

function chapterQuests(def: MapDefinition, questlines: readonly Questline[]): ChapterQuest[] {
    const main = mainQuestline(def, questlines);
    return questlinesOn(def, questlines).map(line => ({
        id: line.id,
        name: line.name ?? null,
        main: line === main,
        steps: line.steps.map(step => ({
            step: step.step,
            questName: step.quest.name,
            nodeId: step.nodeId,
            turnInNodeId: step.settle === 'turn-in' ? turnInNodeOf(line, step) ?? null : null,
            settle: step.settle,
            objectives: step.quest.objectives.map(o => ({
                id: o.id, type: o.type, target: o.target ?? null, foeClass: o.foeClass ?? null,
            })),
        })),
    }));
}

function chapterEnemies(def: MapDefinition): ChapterEnemy[] {
    const bySlug = new Map<string, { slug: string; stagings: ChapterStaging[] }>();
    for (const n of def.nodes) {
        for (const p of poolEncounters(getNodeEventPool(def.continent, def.name, n.id))) {
            if (p.enemySlug === undefined) continue;
            const row = bySlug.get(p.enemySlug) ?? { slug: p.enemySlug, stagings: [] };
            row.stagings.push({
                nodeId: n.id,
                level: p.level ?? null,
                difficulty: payloadDifficulty(p) ?? null,
                boss: p.isBoss === true || payloadDifficulty(p) === 'boss',
            });
            bySlug.set(p.enemySlug, row);
        }
    }
    return [...bySlug.values()].map(row => {
        const foe = ENEMY_REGISTRY[row.slug as EnemySlug];
        return { id: foe?.id ?? row.slug, slug: row.slug, name: foe?.name ?? row.slug, stagings: row.stagings };
    });
}

function chapterHazards(def: MapDefinition): ChapterHazard[] {
    const nodeIds = def.nodes.filter(n => getNodePrimaryEventKind(def.continent, def.name, n.id) === 'hazard').map(n => n.id);
    if (nodeIds.length === 0) return [];
    return HAZARD_LIBRARY.map(h => ({ id: h.id, title: h.title, nodeIds }));
}

function chapterItems(def: MapDefinition, questlines: readonly Questline[]): ChapterItem[] {
    const byId = new Map<string, { item: { id: string; name: string; category: string }; sources: Set<ChapterItemSource>; nodeIds: Set<NodeId> }>();
    const add = (item: { id: string; name: string; category: string }, source: ChapterItemSource, nodeId: NodeId): void => {
        const row = byId.get(item.id) ?? { item: { id: item.id, name: item.name, category: item.category }, sources: new Set(), nodeIds: new Set() };
        row.sources.add(source);
        row.nodeIds.add(nodeId);
        byId.set(item.id, row);
    };
    const eliteRelics = relicLibrary.filter(r => r.relicSource === 'elite');
    for (const n of def.nodes) {
        const pool = getNodeEventPool(def.continent, def.name, n.id);
        for (const entry of pool?.entries ?? []) {
            const p = entry.payload;
            if (p.kind === 'loot-cache') for (const item of p.items ?? []) add(item, 'loot-cache', n.id);
            if (p.kind === 'village') for (const v of p.anvil?.variants ?? []) add({ id: v.id, name: v.name, category: 'die-gear' }, 'village', n.id);
            if (p.kind !== 'encounter') continue;
            const foe = p.enemySlug !== undefined ? ENEMY_REGISTRY[p.enemySlug as EnemySlug] : undefined;
            for (const drop of foe?.loot ?? []) if (drop.item) add(drop.item, 'foe-drop', n.id);
            if (payloadDifficulty(p) !== 'elite') continue;
            const relics = p.eliteRelicDrops
                ? relicLibrary.filter(r => p.eliteRelicDrops!.includes(r.id))
                : eliteRelics;
            for (const relic of relics) add(relic, 'elite-drop', n.id);
        }
    }
    for (const line of questlinesOn(def, questlines)) {
        for (const step of line.steps) {
            const at = turnInNodeOf(line, step) ?? step.nodeId;
            for (const reward of step.rewards) {
                const item = rewardItem(reward);
                if (item) add(item, 'quest', at);
            }
        }
    }
    return [...byId.values()].map(row => ({
        ...row.item,
        sources: [...row.sources],
        nodeIds: def.nodes.map(n => n.id).filter(id => row.nodeIds.has(id)),
    }));
}

/**
 * A map's content (see the file header).
 *
 * @param def - The map definition.
 * @param questlines - The questlines to read (the registered ones by default).
 */
export function mapContent(def: MapDefinition, questlines: readonly Questline[] = listQuestlines()): ChapterContent {
    const gates = storyOrderedGates(def, questlines);
    const walks = walksFromStart(def);
    const main = mainQuestline(def, questlines);
    const storyNodes = new Set(storyWalkTargets(def, main));
    const gateNodes = new Set(gates.map(g => g.nodeId));
    const regionOf = (nodeId: NodeId): number => {
        const crossed = gatesCrossed(walks.get(nodeId) ?? [], gates);
        return crossed.reduce((r, g) => Math.max(r, gates.indexOf(g) + 1), 0);
    };
    const nodes: ChapterNode[] = def.nodes.map(n => {
        const boss = nodeStagesBoss(def, n.id);
        const exit = exitNodes(def).includes(n.id);
        return {
            id: n.id,
            kind: getNodePrimaryEventKind(def.continent, def.name, n.id) ?? null,
            place: nodePlace(n.id),
            gate: gateNodes.has(n.id),
            role: storyNodes.has(n.id) || gateNodes.has(n.id) || boss || exit ? 'story' : 'side',
            elite: nodeStagesElite(def, n.id),
            boss,
            exit,
            region: regionOf(n.id),
        };
    });
    const regions: ChapterRegion[] = [null, ...gates].map((gate, index) => ({
        index,
        gateId: gate?.id ?? null,
        nodeIds: nodes.filter(n => n.region === index).map(n => n.id),
    }));
    return {
        continent: def.continent,
        map: def.name,
        startNodeId: def.startingNode.id,
        exitNodeIds: exitNodes(def),
        nodes,
        quests: chapterQuests(def, questlines),
        enemies: chapterEnemies(def),
        hazards: chapterHazards(def),
        items: chapterItems(def, questlines),
        gates,
        regions,
    };
}

/** Chapter 1's content: the map a new game starts on (`createStartingWorld`). */
export function chapter1Content(): ChapterContent {
    const map = createStartingWorld().currentMap;
    return mapContent(getMapDefinition(map.continent, map.name));
}

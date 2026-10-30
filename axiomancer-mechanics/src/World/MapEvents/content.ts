/**
 * MapEvent pool content for the Act 1 maps (breakwater, charcoal-wood,
 * beacon-crags, lantern-deep).
 *
 * Each authored node (bw-<code> / cw-N / bc-N / ld-N) gets a single-entry pool override
 * so the dispatcher reproduces (and extends) the authored events
 * `processNode` fires. Each later region's one village (`ACT1_ANVIL_NODES`)
 * carries the paid rest, the card shop and the Anvil; the Breakwater has two. A
 * node listed in `ACT1_WAYPOINT_NODES` gets no pool at all: it is an empty
 * waypoint, which reveals its roads and resolves to nothing.
 *
 * This file side-effects on import: `src/World/index.ts` imports it
 * for that side effect, so consumers of the package get the pools
 * registered automatically when they touch the world barrel.
 */

import {
    registerMapEventPool,
    setNodeEventPoolOverride,
} from './resolve-map-event';
import type { MapEventPayload, MapEventPool } from './types';
import type { EnemySlug } from '../../Enemy/enemy.library';
import type { EnemyDifficulty } from '../../Enemy/types';
import { BLACKSMITH_WITNESS_VARIANTS } from '../Blacksmith/blacksmith.content';
import { breakwaterChapter } from '../Continents/Coastal-Village/breakwater-chapter';
import { BREAKWATER_CHAPTER_QUESTLINE_ID } from '../breakwater-chapter.questline';

// ─── Shared builders (Act 1) ─────────────────────────────────────────────────
//
// The builders the Act 1 maps share.

export function hazardPool(nodeId: string, description: string): MapEventPool {
    return {
        id: `${nodeId}.hazard`,
        entries: [{ kind: 'hazard', weight: 1, payload: { kind: 'hazard', damage: 2, description } }],
    };
}

// Low-risk coastal scavenging — a few shillings the tide or a dead sailor left.
export const COAST_LOOT_CACHES: ReadonlyArray<{ currency: number; description: string }> = [
    { currency: 8,  description: 'A purse of shillings snagged in the netting, its owner long gone.' },
    { currency: 12, description: 'A waterlogged strongbox wedged under the pilings.' },
    { currency: 6,  description: 'Loose shillings spill from a cracked jar in the rocks.' },
];
export function lootCachePool(nodeId: string, cache: { currency: number; description: string }): MapEventPool {
    return {
        id: `${nodeId}.loot-cache`,
        entries: [{ kind: 'loot-cache', weight: 1, payload: { kind: 'loot-cache', currency: cache.currency, description: cache.description } }],
    };
}

// A village with all three counters: the paid rest, the card shop and the
// Anvil. The mobile village screen opens the Anvil from this payload and seeds the session from the player's live rail
// and wallet (`state/blacksmith/store-actions.ts`). The village name is a
// placeholder until T writes the places.
function anvilVillagePool(nodeId: string, description: string): MapEventPool {
    return villagePool(nodeId, ANVIL_VILLAGE_NAMES[nodeId] ?? 'The Smithy', description);
}

/** A village named `villageName` with all three counters (the paid rest, the card shop, the Anvil). */
export function villagePool(nodeId: string, villageName: string, description: string): MapEventPool {
    return {
        id: `${nodeId}.village`,
        entries: [{
            kind: 'village', weight: 1,
            payload: {
                kind: 'village',
                villageName,
                rest: true,
                cardShop: true,
                anvil: { variants: BLACKSMITH_WITNESS_VARIANTS },
                description,
            },
        }],
    };
}

export function campRestPool(nodeId: string, description: string): MapEventPool {
    return {
        id: `${nodeId}.rest`,
        entries: [{
            // A cavern camp is never an inn.
            kind: 'rest', weight: 1,
            payload: { kind: 'rest', shelter: 'camp', description },
        }],
    };
}

function damageHazardPool(nodeId: string, damage: number, description: string): MapEventPool {
    return {
        id: `${nodeId}.hazard`,
        entries: [{
            kind: 'hazard', weight: 1,
            payload: { kind: 'hazard', damage, description },
        }],
    };
}

function currencyLootPool(nodeId: string, currency: number, description: string): MapEventPool {
    return {
        id: `${nodeId}.loot-cache`,
        entries: [{
            kind: 'loot-cache', weight: 1,
            payload: { kind: 'loot-cache', currency, description },
        }],
    };
}

// ─── The Anvil, once per region ──────────────────────────────────────────────
//
// One village with an Anvil counter sits on one node near each later Act 1
// region's exit, a step from its door fight: the Charcoal Wood's well, the
// Beacon Crags' falls and the Lantern Deep's forge (column 4). The Breakwater
// has two, its harbour town and its walled manor (`BREAKWATER_ANVIL_NODES`).
// Same engine, budget, witness variants and line everywhere.
const ANVIL_LINE = 'A lean-to forge, coals still breathing. The smith looks up from the anvil and nods at your dice.';
export const ACT1_ANVIL_NODES: Readonly<Record<string, string>> = {
    'charcoal-wood': 'cw-18',
    'beacon-crags':  'bc-12',
    'lantern-deep':  'ld-14',
};
const ANVIL_VILLAGE_NAMES: Readonly<Record<string, string>> = {
    'cw-18': 'The Well',
    'bc-12': 'The Falls',
    'ld-14': 'The Forge',
};
const ANVIL_NODE_IDS: ReadonlySet<string> = new Set(Object.values(ACT1_ANVIL_NODES));

/** The Breakwater's two Anvil villages; every village on its node list is one of them. */
export const BREAKWATER_ANVIL_NODES: readonly string[] = ['bw-t4', 'bw-m5'];

// ─── Empty waypoints ─────────────────────────────────────────────────────────
//
// The nodes that held a gathering event until the kind was cut. They carry no
// pool: arriving reveals their roads and resolves to nothing, and the map
// draws them as a waypoint. The later chapters' plots re-author them. The
// Breakwater has none: every node on its list carries a pool
// (`BREAKWATER_CHAPTER_POOLS`).
export const ACT1_WAYPOINT_NODES: Readonly<Record<string, readonly string[]>> = {
    'charcoal-wood': ['cw-4', 'cw-8', 'cw-14'],
    'beacon-crags':  ['bc-7'],
    'lantern-deep':  ['ld-7'],
};
const WAYPOINT_NODE_IDS: ReadonlySet<string> = new Set(Object.values(ACT1_WAYPOINT_NODES).flat());

// ─── The Breakwater (Act 1, map 1) ───────────────────────────────────────────
//
// T's Chapter 1 map (`Continents/Coastal-Village/breakwater-chapter.ts`): 44
// nodes, one pool each, by the node list's board kind
// (`braindump/2026-10-28-breakwater-chapter-1-map.md`, "The node list").
//
// Each fight node binds one foe at one level (`BW_ENCOUNTER_FOES`, T's
// Breakwater table). Placeholders until T's sessions: the elites are the
// Green Jelly, the Death Beholder is the chapter boss at the door fight's
// level, and a fight whose foe has not landed yet is the Float-Eye at level 2;
// hazards are the shared damage hazard; rests, loot caches, villages and
// cutscenes come from the shared builders. Every new line is `[content]`.

/** The Breakwater's elite, pinned low like every Act 1 fight. */
export const BW_ELITE_LEVEL = 3;

/**
 * Each region's door sits one level under the player a full clear
 * brings to it (Breakwater 1, Charcoal Wood 2, Beacon Crags 3, Lantern Deep 4).
 */
export const BW_DOOR_LEVEL = 1;

/** A board kind: what each node of the node list is. */
export type BreakwaterChapterKind =
    | 'start' | 'village' | 'quest' | 'boss' | 'elite' | 'hazard'
    | 'fight' | 'rest' | 'loot' | 'cutscene' | 'travel';

/** Each node's board kind and place (the node list's Kind and Place columns). */
export const BREAKWATER_CHAPTER_KINDS: Readonly<Record<string, { kind: BreakwaterChapterKind; place: string }>> = {
    'bw-w1': { kind: 'start',    place: 'Windmill' },
    'bw-w2': { kind: 'fight',    place: 'Gallows crossroads' },
    'bw-w3': { kind: 'fight',    place: 'Field road' },
    'bw-w4': { kind: 'rest',     place: 'West cliff road' },
    'bw-w5': { kind: 'elite',    place: 'Keep causeway' },
    'bw-k1': { kind: 'quest',    place: 'Keep gate' },
    'bw-k2': { kind: 'boss',     place: 'Sea keep' },
    'bw-h1': { kind: 'fight',    place: 'Quay end' },
    'bw-h2': { kind: 'fight',    place: 'Crane quay' },
    'bw-h3': { kind: 'fight',    place: 'Harbour light pier' },
    'bw-h4': { kind: 'hazard',   place: 'The wreck' },
    'bw-h5': { kind: 'rest',     place: 'Moored ship' },
    'bw-h6': { kind: 'travel',   place: 'Sea cave mouth' },
    'bw-h7': { kind: 'fight',    place: 'Long pier' },
    'bw-h8': { kind: 'loot',     place: 'Pier end' },
    'bw-c0': { kind: 'travel',   place: 'Cave face' },
    'bw-c1': { kind: 'elite',    place: 'Sea cave' },
    'bw-c2': { kind: 'quest',    place: 'Fishermen\'s camp' },
    'bw-t1': { kind: 'fight',    place: 'Harbour steps' },
    'bw-t2': { kind: 'fight',    place: 'Bridge approach' },
    'bw-t3': { kind: 'fight',    place: 'Town gate' },
    'bw-t4': { kind: 'village',  place: 'Harbour town' },
    'bw-t5': { kind: 'hazard',   place: 'Back lanes' },
    'bw-t6': { kind: 'fight',    place: 'Upper town' },
    'bw-b1': { kind: 'quest',    place: 'River bridge' },
    'bw-b2': { kind: 'travel',   place: 'Far bank' },
    'bw-l1': { kind: 'fight',    place: 'Cliff crossroads' },
    'bw-l2': { kind: 'cutscene', place: 'Clifftop chapel' },
    'bw-l3': { kind: 'rest',     place: 'Cliff road' },
    'bw-l4': { kind: 'elite',    place: 'Lighthouse path' },
    'bw-l5': { kind: 'quest',    place: 'Lighthouse' },
    'bw-d1': { kind: 'fight',    place: 'Fishing hamlet' },
    'bw-d2': { kind: 'loot',     place: 'Boat sheds' },
    'bw-d3': { kind: 'fight',    place: 'Hamlet rise' },
    'bw-d4': { kind: 'hazard',   place: 'Tower switchbacks' },
    'bw-d5': { kind: 'cutscene', place: 'Old watchtower' },
    'bw-m1': { kind: 'fight',    place: 'South fork' },
    'bw-m2': { kind: 'hazard',   place: 'River meadow' },
    'bw-m3': { kind: 'loot',     place: 'Riverbank' },
    'bw-m4': { kind: 'hazard',   place: 'Manor road' },
    'bw-m5': { kind: 'village',  place: 'Walled manor' },
    'bw-p1': { kind: 'hazard',   place: 'Foothills' },
    'bw-p2': { kind: 'fight',    place: 'Mountain path' },
    'bw-p3': { kind: 'cutscene', place: 'High pass' },
};

/** The four quest nodes: their place in the chain and their refusal line. */
const QUEST_NODES: Readonly<Record<string, { node: number; description: string; lockedLine: string }>> = {
    'bw-c2': {
        node: 2,
        description: '[content] The fishermen huddle round a driftwood fire.',
        lockedLine: '[content] The fishermen do not know you. They keep to their fire.',
    },
    'bw-l5': {
        node: 3,
        description: '[content] The lighthouse door stands open.',
        lockedLine: '[content] The lighthouse keeper sends you back down the path. No one told him to expect you.',
    },
    'bw-k1': {
        node: 4,
        description: '[content] The keep gate, barred from the inside.',
        lockedLine: '[content] The keep gate does not open for strangers.',
    },
    'bw-b1': {
        node: 5,
        description: '[content] The river bridge. The far bank is close.',
        lockedLine: '[content] The bridge-keeper will not lift the bar while the sea keep stands.',
    },
};

/** The loot caches, as indexes into the shared coastal caches. */
const LOOT_NODES: Readonly<Record<string, number>> = { 'bw-h8': 0, 'bw-d2': 1, 'bw-m3': 2 };

/** The windmill's arrival: the scene, and the chain's first step given. */
const windmillArrival: MapEventPayload = {
    kind: 'cutscene',
    lines: [
        'A windmill on the headland, its sails lashed down. The sea is loud below it.',
        '[content] A fishing boat capsized off the harbour. Its crew never came home. Find them.',
    ],
    description: 'You set out along the coast.',
    effect: { giveQuestStep: { questline: BREAKWATER_CHAPTER_QUESTLINE_ID, step: 1 } },
};

/** The travel nodes: the sea cave passage both ways, and the far bank on to the Charcoal Wood. */
const TRAVEL: Readonly<Record<string, MapEventPayload>> = {
    'bw-h6': {
        kind: 'travel', destination: { node: 'bw-c0' },
        prompt: '[content] The sea cave runs under the cliff, down to a cove.',
    },
    'bw-c0': {
        kind: 'travel', destination: { node: 'bw-h6' },
        prompt: '[content] The cave runs back up toward the harbour.',
    },
    'bw-b2': {
        kind: 'travel', destination: { map: 'charcoal-wood', continent: 'coastal-continent' },
        prompt: 'The bridge has a toll-house and no keeper. Across it, the road runs into a wood full of smoke.',
    },
};

/** A Breakwater village: an Anvil village, refused for a node `BREAKWATER_ANVIL_NODES` does not name. */
export function breakwaterVillagePool(nodeId: string, place: string): MapEventPool {
    if (!BREAKWATER_ANVIL_NODES.includes(nodeId)) {
        throw new Error(`content: Breakwater village ${nodeId} is not in BREAKWATER_ANVIL_NODES`);
    }
    return villagePool(nodeId, place, ANVIL_LINE);
}

function single(nodeId: string, payload: MapEventPayload): MapEventPool {
    return { id: `${nodeId}.${payload.kind}`, entries: [{ kind: payload.kind, weight: 1, payload }] };
}

/**
 * The foe and level each Breakwater fight node binds (T's Breakwater table,
 * every foe under level 10; a zone's two foes alternate across its nodes).
 * Every `fight` node has a row, and so has the sea cave's elite `bw-c1`; the
 * Float-Eye at level 2 holds a node until its own foe lands.
 */
export const BW_ENCOUNTER_FOES: Readonly<Record<string, ActOneFoe>> = {
    // Fields & south road, level 2.
    'bw-w2': { slug: 'float-eye', level: 2 },
    'bw-w3': { slug: 'gallows-crow', level: 2 },
    'bw-m1': { slug: 'float-eye', level: 2 },
    'bw-p2': { slug: 'gallows-crow', level: 2 },
    // The quays, level 3.
    'bw-h1': { slug: 'net-mender', level: 3 },
    'bw-h2': { slug: 'crane-hook', level: 3 },
    'bw-h3': { slug: 'net-mender', level: 3 },
    // The long pier and harbour steps, level 4.
    'bw-h7': { slug: 'brine-widow', level: 4 },
    'bw-t1': { slug: 'lamprey-knot', level: 4 },
    // The town, level 5.
    'bw-t2': { slug: 'green-jelly', level: 5 },
    'bw-t3': { slug: 'curfew-ringer', level: 5 },
    'bw-t6': { slug: 'green-jelly', level: 5 },
    // The cliffs and the hamlet, level 6.
    'bw-l1': { slug: 'wreck-picker', level: 6 },
    'bw-d1': { slug: 'smokehouse-gutter', level: 6 },
    'bw-d3': { slug: 'wreck-picker', level: 6 },
    // The sea cave's elite, level 5.
    'bw-c1': { slug: 'tithe-collector', level: 5, difficulty: 'elite' },
};

/** The pool for one node of the new map, by its board kind. */
function poolFor(nodeId: string): MapEventPool {
    const { kind, place } = BREAKWATER_CHAPTER_KINDS[nodeId]!;
    switch (kind) {
        case 'start':    return single(nodeId, windmillArrival);
        case 'fight': {
            const foe = BW_ENCOUNTER_FOES[nodeId];
            if (!foe) throw new Error(`breakwater: fight ${nodeId} has no row in BW_ENCOUNTER_FOES`);
            return cwEncounterPool(nodeId, foe);
        }
        case 'elite':    return cwEncounterPool(nodeId, BW_ENCOUNTER_FOES[nodeId] ?? { slug: 'green-jelly', level: BW_ELITE_LEVEL, difficulty: 'elite' });
        case 'boss':     return cwEncounterPool(nodeId, { slug: 'death-beholder', level: BW_DOOR_LEVEL, isBoss: true });
        case 'hazard':   return hazardPool(nodeId, `[content] ${place}.`);
        case 'rest':     return campRestPool(nodeId, `[content] ${place}.`);
        case 'loot':     return lootCachePool(nodeId, COAST_LOOT_CACHES[LOOT_NODES[nodeId]!]!);
        case 'village':  return breakwaterVillagePool(nodeId, place);
        case 'cutscene': return single(nodeId, { kind: 'cutscene', lines: [`[content] ${place}.`] });
        case 'travel':   return single(nodeId, TRAVEL[nodeId]!);
        case 'quest': {
            const q = QUEST_NODES[nodeId]!;
            return single(nodeId, {
                kind: 'quest', questline: BREAKWATER_CHAPTER_QUESTLINE_ID,
                node: q.node, description: q.description, lockedLine: q.lockedLine,
            });
        }
    }
}

/** The 44 pools, in map-definition order. */
export const BREAKWATER_CHAPTER_POOLS: ReadonlyArray<{ nodeId: string; pool: MapEventPool }> =
    breakwaterChapter.nodes.map(n => ({ nodeId: n.id, pool: poolFor(n.id) }));

// ─── The Charcoal Wood (Act 1, map 2) ────────────────────────────────────────
//
// The Charcoal Wood uses the shared builders (hazard and loot, the caverns'
// camp) and the northern forest's roster. It
// adds no enemy, NPC, item or event kind of its own; the one-line
// descriptions and the two arrival lines sit on the plate's landmarks (see
// `Continents/Coastal-Village/charcoal-wood.ts`).
//
// Kind spread over 20 nodes: 7 encounter, 3 rest, 3 loot-cache,
// 3 empty waypoints, 1 hazard, 1 village (the Anvil, cw-18), 1 arrival
// cutscene, 1 travel. The northern forest's roster is level 9 and up, so
// every fight here is pinned to a low absolute level,
// ramping ring by ring from 2 to 3.

/**
 * One pinned Act 1 fight. Float-Eye takes the normal fights, the Green Jelly
 * one mid-region node, the Death Beholder every region's door fight. A node with
 * no line of its own falls back to the foe's own description.
 */
/**
 * One authored Act 1 fight. `eliteRelicDrops` is an elite's own relic drop
 * list; every Act 1 elite leaves it absent until T authors the lists, so each
 * draws from the whole elite-only pool.
 */
export interface ActOneFoe {
    slug: EnemySlug; level: number; description?: string; isBoss?: boolean; eliteRelicDrops?: string[];
    /** The tier the slot stages the foe at, when it is not the foe's own (an elite slot). */
    difficulty?: EnemyDifficulty;
}

const CW_FIGHT_LEVEL_EARLY = 2;
const CW_FIGHT_LEVEL_LATE = 3;
const CW_DOOR_LEVEL = 2;

/** Arrival over the river bridge from the Breakwater. */
const cwArrival: MapEventPool = {
    id: 'cw-1.cutscene',
    entries: [{
        kind: 'cutscene', weight: 1,
        payload: {
            kind: 'cutscene',
            lines: [
                'The bridge ends in pine. Smoke hangs under the branches and does not lift.',
                'Somewhere ahead, the burners are working the clearings.',
            ],
            description: 'You cross into the Charcoal Wood.',
        },
    }],
};

export function cwEncounterPool(nodeId: string, foe: ActOneFoe): MapEventPool {
    return {
        id: `${nodeId}.encounter`,
        entries: [{
            kind: 'encounter', weight: 1,
            payload: {
                kind: 'encounter', enemySlug: foe.slug, isBoss: foe.isBoss ?? false, level: foe.level, description: foe.description,
                ...(foe.eliteRelicDrops ? { eliteRelicDrops: [...foe.eliteRelicDrops] } : {}),
                ...(foe.difficulty ? { difficulty: foe.difficulty } : {}),
            },
        }],
    };
}

const CW_ENCOUNTER_FOES: Record<string, ActOneFoe> = {
    // c1 — the gibbet
    'cw-5':  { slug: 'float-eye', level: CW_FIGHT_LEVEL_EARLY },
    // c2 — the stone circle, the footbridge
    'cw-7':  { slug: 'float-eye', level: CW_FIGHT_LEVEL_EARLY },
    'cw-10': { slug: 'float-eye', level: CW_FIGHT_LEVEL_EARLY },
    // c3 — the root graveyard: the Green Jelly mid-region
    'cw-12': { slug: 'green-jelly', level: CW_FIGHT_LEVEL_LATE, difficulty: 'elite' },
    // c4 — the rock chapel, the wayside cross, the east cave
    'cw-16': { slug: 'float-eye', level: CW_FIGHT_LEVEL_LATE },
    // The door fight, alone in its column: the exit's only way in.
    'cw-17': { slug: 'death-beholder', level: CW_DOOR_LEVEL, isBoss: true },
    'cw-19': { slug: 'float-eye', level: CW_FIGHT_LEVEL_LATE },
};

/**
 * All three rests are CAMPS: inns live inside settlements, and the
 * wood has none (the hunting lodge is shut; you sleep on its porch).
 */
const CW_CAMP_NODES: Record<string, string> = {
    'cw-9':  'The hunting lodge is shut for the season. Its porch is dry, and nobody collects for it.',
    'cw-11': 'An empty cottage on stilts over the bog. The boardwalk is the only way in, and the only way out.',
    'cw-15': 'An open shelter over stacked logs. The fire is someone else\'s. You sit by it anyway.',
};

const CW_HAZARD_NODES: Record<string, string> = {
    'cw-3':  'The shrine floor is rotten over the crypt. It gives under you.',
};

const CW_LOOT_NODES: Record<string, { currency: number; description: string }> = {
    'cw-2':  { currency: 8,  description: 'A strongbox under the tower\'s fallen stair. The lock rusted before its owner came back.' },
    'cw-6':  { currency: 6,  description: 'Shillings in a niche at the cave mouth. Someone paid the dark and left.' },
    'cw-13': { currency: 12, description: 'The hermit is gone. His purse is under the hearthstone, where they all keep it.' },
};

/**
 * The stair cave — the Charcoal Wood's door, on to the Beacon Crags (Act 1,
 * map 3; re-pointed from fishing-village when the mountains shipped in M3c).
 * The first cross-continent step in Act 1: a plain travel event.
 */
const cwStairCave: MapEventPool = {
    id: 'cw-20.travel',
    entries: [{
        kind: 'travel', weight: 1,
        payload: {
            kind: 'travel',
            destination: { map: 'beacon-crags', continent: 'northern-continent' },
            prompt: 'A stair cut down into the cliff. It runs under the hills and comes up, a long way on, on a mountain road.',
        },
    }],
};

const CHARCOAL_WOOD_POOLS: ReadonlyArray<{ nodeId: string; pool: MapEventPool }> =
    (() => {
        const out: Array<{ nodeId: string; pool: MapEventPool }> = [];
        for (let i = 1; i <= 20; i++) {
            const nodeId = `cw-${i}`;
            if (nodeId === 'cw-1') {
                out.push({ nodeId, pool: cwArrival });
            } else if (nodeId === 'cw-20') {
                out.push({ nodeId, pool: cwStairCave });
            } else if (ANVIL_NODE_IDS.has(nodeId)) {
                out.push({ nodeId, pool: anvilVillagePool(nodeId, ANVIL_LINE) });
            } else if (CW_CAMP_NODES[nodeId]) {
                out.push({ nodeId, pool: campRestPool(nodeId, CW_CAMP_NODES[nodeId]!) });
            } else if (WAYPOINT_NODE_IDS.has(nodeId)) {
                continue;
            } else if (CW_HAZARD_NODES[nodeId]) {
                out.push({ nodeId, pool: hazardPool(nodeId, CW_HAZARD_NODES[nodeId]!) });
            } else if (CW_LOOT_NODES[nodeId]) {
                out.push({ nodeId, pool: lootCachePool(nodeId, CW_LOOT_NODES[nodeId]!) });
            } else {
                const foe = CW_ENCOUNTER_FOES[nodeId];
                if (!foe) throw new Error(`charcoal-wood: ${nodeId} has no authored event kind or foe.`);
                out.push({ nodeId, pool: cwEncounterPool(nodeId, foe) });
            }
        }
        return out;
    })();

// ─── The Beacon Crags (Act 1, map 3) ─────────────────────────────────────────
//
// The mountains use the caverns' roster and its camp, hazard and
// loot builders. They add no enemy, NPC, item or event kind of their own; the
// one-line descriptions and the two arrival lines sit on the plate's landmarks (see
// `Continents/Northern-Continent/beacon-crags.ts`).
//
// Kind spread over 17 nodes: 6 encounter, 3 rest, 2 loot-cache, 1 empty waypoint,
// 2 hazard, 1 village (the Anvil, bc-12), 1 arrival cutscene, 1 travel.
// The caverns' roster is level 13 and up, so every fight is pinned low, one
// step above the Charcoal Wood: 3 on the upper mountain, 4 below
// the gorge.

const BC_FIGHT_LEVEL_EARLY = 3;
const BC_FIGHT_LEVEL_LATE = 4;
const BC_DOOR_LEVEL = 3;

/** Arrival up the Charcoal Wood's stair, on the crag road. */
const bcArrival: MapEventPool = {
    id: 'bc-1.cutscene',
    entries: [{
        kind: 'cutscene', weight: 1,
        payload: {
            kind: 'cutscene',
            lines: [
                'The stair comes up into wind and snow, on a road over the crags.',
                'On the summit to the west, a fire is burning. Someone down in the valley can see it.',
            ],
            description: 'You come up into the Beacon Crags.',
        },
    }],
};

/** Every Beacon Crags fight, pinned (`cwEncounterPool` builds the pool). */
const BC_ENCOUNTER_FOES: Record<string, ActOneFoe> = {
    // c1 — the summit beacon
    'bc-2':  { slug: 'float-eye', level: BC_FIGHT_LEVEL_EARLY },
    // c3 — the ruined chapel (the Green Jelly mid-region), the toll gate
    'bc-8':  { slug: 'green-jelly', level: BC_FIGHT_LEVEL_EARLY, difficulty: 'elite' },
    'bc-10': { slug: 'float-eye', level: BC_FIGHT_LEVEL_EARLY },
    // c4 — the arch bridge, the quarry
    'bc-11': { slug: 'float-eye', level: BC_FIGHT_LEVEL_LATE },
    'bc-13': { slug: 'float-eye', level: BC_FIGHT_LEVEL_LATE },
    // c5 — the stone gate: the door fight, alone in its column: the exit's only way in
    'bc-15': { slug: 'death-beholder', level: BC_DOOR_LEVEL, isBoss: true },
};

/** All three rests are CAMPS: inns live inside settlements. */
const BC_CAMP_NODES: Record<string, string> = {
    'bc-4':  'The shepherds let you sleep in the fold. They charge for the straw, not the wind.',
    'bc-6':  'The monks sell a blanket and lend a bench. You take the bench.',
    'bc-14': 'The inn is shut and the cart outside it is not. You sleep in the cart.',
};

const BC_HAZARD_NODES: Record<string, { damage: number; description: string }> = {
    'bc-3':  { damage: 2, description: 'The spray from the falls freezes on the path. The lake is a long way down.' },
    'bc-9':  { damage: 3, description: 'The rope bridge charges for the crossing. Halfway over, a plank charges again.' },
};

const BC_LOOT_NODES: Record<string, { currency: number; description: string }> = {
    'bc-5':  { currency: 12, description: 'A strongbox in the castle gatehouse. The garrison left in a hurry and paid nobody.' },
    'bc-16': { currency: 14, description: 'A toll-box at the tunnel mouth, pried open. Whoever pried it did not come back out.' },
};

/**
 * The glacier shrine — the Beacon Crags' door. A stair down under the ice into
 * the Lantern Deep (M3d; it led to fishing-village until the underworld
 * shipped).
 */
const bcGlacierShrine: MapEventPool = {
    id: 'bc-17.travel',
    entries: [{
        kind: 'travel', weight: 1,
        payload: {
            kind: 'travel',
            destination: { map: 'lantern-deep', continent: 'northern-continent' },
            prompt: 'A stair goes down under the shrine, into the ice, and on below it. Someone has hung a lantern on every turn.',
        },
    }],
};

const BEACON_CRAGS_POOLS: ReadonlyArray<{ nodeId: string; pool: MapEventPool }> =
    (() => {
        const out: Array<{ nodeId: string; pool: MapEventPool }> = [];
        for (let i = 1; i <= 17; i++) {
            const nodeId = `bc-${i}`;
            if (nodeId === 'bc-1') {
                out.push({ nodeId, pool: bcArrival });
            } else if (nodeId === 'bc-17') {
                out.push({ nodeId, pool: bcGlacierShrine });
            } else if (ANVIL_NODE_IDS.has(nodeId)) {
                out.push({ nodeId, pool: anvilVillagePool(nodeId, ANVIL_LINE) });
            } else if (BC_CAMP_NODES[nodeId]) {
                out.push({ nodeId, pool: campRestPool(nodeId, BC_CAMP_NODES[nodeId]!) });
            } else if (WAYPOINT_NODE_IDS.has(nodeId)) {
                continue;
            } else if (BC_HAZARD_NODES[nodeId]) {
                const h = BC_HAZARD_NODES[nodeId]!;
                out.push({ nodeId, pool: damageHazardPool(nodeId, h.damage, h.description) });
            } else if (BC_LOOT_NODES[nodeId]) {
                const l = BC_LOOT_NODES[nodeId]!;
                out.push({ nodeId, pool: currencyLootPool(nodeId, l.currency, l.description) });
            } else {
                const foe = BC_ENCOUNTER_FOES[nodeId];
                if (!foe) throw new Error(`beacon-crags: ${nodeId} has no authored event kind or foe.`);
                out.push({ nodeId, pool: cwEncounterPool(nodeId, foe) });
            }
        }
        return out;
    })();

// ─── The Lantern Deep (Act 1, map 4) ─────────────────────────────────────────
//
// The underworld uses the caverns like the Beacon Crags do: the roster and the
// camp, hazard and loot builders. It adds no enemy, NPC, item or
// event kind of its own; the one-line descriptions and the two arrival lines
// sit on the plate's landmarks (see
// `Continents/Northern-Continent/lantern-deep.ts`).
//
// Kind spread over 18 nodes: 7 encounter, 3 rest, 1 loot-cache, 1 empty waypoint,
// 2 hazard, 1 village (the Anvil, ld-14), 1 arrival cutscene, 2 sealed
// doors (the vault door and the deep stair). No boss; one elite on the last
// fight column. Every fight pinned low, level with the Beacon Crags: 3 above
// the aqueducts, 4 below them.

const LD_FIGHT_LEVEL_EARLY = 3;
const LD_FIGHT_LEVEL_LATE = 4;
const LD_DOOR_LEVEL = 4;

/** Arrival down the Beacon Crags' stair, through the cavern roof. */
const ldArrival: MapEventPool = {
    id: 'ld-1.cutscene',
    entries: [{
        kind: 'cutscene', weight: 1,
        payload: {
            kind: 'cutscene',
            lines: [
                'The stair comes down out of the ice and through a hole in a cavern roof. The daylight stops at the last step.',
                'Below, a lake, and lanterns on the far shore. Somebody carried every one of them down.',
            ],
            description: 'You come down into the Lantern Deep.',
        },
    }],
};

/** Every Lantern Deep fight, pinned (`cwEncounterPool` builds the pool). */
const LD_ENCOUNTER_FOES: Record<string, ActOneFoe> = {
    // c1 — the drowned temple, the cathedral
    'ld-3':  { slug: 'float-eye', level: LD_FIGHT_LEVEL_EARLY },
    'ld-5':  { slug: 'float-eye', level: LD_FIGHT_LEVEL_EARLY },
    // c2 — the central aqueduct: the Green Jelly mid-region
    'ld-8':  { slug: 'green-jelly', level: LD_FIGHT_LEVEL_EARLY, difficulty: 'elite' },
    // c3 — the mushroom forest, the ossuary
    'ld-11': { slug: 'float-eye', level: LD_FIGHT_LEVEL_LATE },
    'ld-12': { slug: 'float-eye', level: LD_FIGHT_LEVEL_LATE },
    // c4 — the fortress gate
    'ld-13': { slug: 'float-eye', level: LD_FIGHT_LEVEL_LATE },
    // c5 — the ruined city: the door fight, on the last fight column
    'ld-16': { slug: 'death-beholder', level: LD_DOOR_LEVEL, isBoss: true },
};

/** All three rests are CAMPS: inns live inside settlements. */
const LD_CAMP_NODES: Record<string, string> = {
    'ld-2':  'The ferryman lets you sleep under his lantern. He charges for the oil, not the floor.',
    'ld-10': 'The traders let you sleep behind the stalls. They sell lamp oil by the drop.',
    'ld-17': 'A landing on the stairway, dry and out of the draught. Someone left a lantern. It is out.',
};

const LD_HAZARD_NODES: Record<string, { damage: number; description: string }> = {
    'ld-4':  { damage: 2, description: 'The aqueduct leaks. The walkway is slick, and the lake is a long way down.' },
    'ld-9':  { damage: 3, description: 'The giant turns in its sleep. The dais is not wide enough for the both of you.' },
};

const LD_LOOT_NODES: Record<string, { currency: number; description: string }> = {
    'ld-6':  { currency: 12, description: 'A torch-bearer\'s purse, dropped in the west tunnel. The torches are still lit.' },
};

/**
 * The vault door — the Labyrinth's. The Labyrinth is parked, so the door is
 * sealed scenery (a cutscene) and `LabyrinthGate` never opens in play.
 */
const ldVaultDoor: MapEventPool = {
    id: 'ld-15.cutscene',
    entries: [{
        kind: 'cutscene', weight: 1,
        payload: {
            kind: 'cutscene',
            lines: ['The round door is sealed.'],
            description: 'The sealed vault door.',
        },
    }],
};

/**
 * The deep stair — the Lantern Deep's door, sealed like the vault door. There
 * is no end-of-run state: the column is terminal.
 */
const ldDeepStair: MapEventPool = {
    id: 'ld-18.cutscene',
    entries: [{
        kind: 'cutscene', weight: 1,
        payload: {
            kind: 'cutscene',
            lines: ['The deep stair is sealed.'],
            description: 'The sealed deep stair.',
        },
    }],
};

const LANTERN_DEEP_POOLS: ReadonlyArray<{ nodeId: string; pool: MapEventPool }> =
    (() => {
        const out: Array<{ nodeId: string; pool: MapEventPool }> = [];
        for (let i = 1; i <= 18; i++) {
            const nodeId = `ld-${i}`;
            if (nodeId === 'ld-1') {
                out.push({ nodeId, pool: ldArrival });
            } else if (nodeId === 'ld-15') {
                out.push({ nodeId, pool: ldVaultDoor });
            } else if (nodeId === 'ld-18') {
                out.push({ nodeId, pool: ldDeepStair });
            } else if (ANVIL_NODE_IDS.has(nodeId)) {
                out.push({ nodeId, pool: anvilVillagePool(nodeId, ANVIL_LINE) });
            } else if (LD_CAMP_NODES[nodeId]) {
                out.push({ nodeId, pool: campRestPool(nodeId, LD_CAMP_NODES[nodeId]!) });
            } else if (WAYPOINT_NODE_IDS.has(nodeId)) {
                continue;
            } else if (LD_HAZARD_NODES[nodeId]) {
                const h = LD_HAZARD_NODES[nodeId]!;
                out.push({ nodeId, pool: damageHazardPool(nodeId, h.damage, h.description) });
            } else if (LD_LOOT_NODES[nodeId]) {
                const l = LD_LOOT_NODES[nodeId]!;
                out.push({ nodeId, pool: currencyLootPool(nodeId, l.currency, l.description) });
            } else {
                const foe = LD_ENCOUNTER_FOES[nodeId];
                if (!foe) throw new Error(`lantern-deep: ${nodeId} has no authored event kind or foe.`);
                out.push({ nodeId, pool: cwEncounterPool(nodeId, foe) });
            }
        }
        return out;
    })();

// ─── single registration entry point ─────────────────────────────────────────
//
// Every map registers through one idempotent function so the
// content-parity guard (`getShadowedNodeOverrideKeys`) can replay registration
// against a freshly-cleared registry deterministically. Every map has exactly
// one block. No node is authored twice.

/**
 * Registers every authored map-event pool + node override for the four
 * Act 1 maps. Self-invoked on import for the package's side-effect contract;
 * also exported so hermetic tests can replay it after
 * `_clearMapEventPoolRegistry()`.
 */
export function registerMapEventContent(): void {
    for (const { nodeId, pool } of BREAKWATER_CHAPTER_POOLS) {
        registerMapEventPool(pool);
        setNodeEventPoolOverride('coastal-continent', 'breakwater', nodeId, pool.id);
    }
    for (const { nodeId, pool } of CHARCOAL_WOOD_POOLS) {
        registerMapEventPool(pool);
        setNodeEventPoolOverride('coastal-continent', 'charcoal-wood', nodeId, pool.id);
    }
    for (const { nodeId, pool } of BEACON_CRAGS_POOLS) {
        registerMapEventPool(pool);
        setNodeEventPoolOverride('northern-continent', 'beacon-crags', nodeId, pool.id);
    }
    for (const { nodeId, pool } of LANTERN_DEEP_POOLS) {
        registerMapEventPool(pool);
        setNodeEventPoolOverride('northern-continent', 'lantern-deep', nodeId, pool.id);
    }
}

registerMapEventContent();

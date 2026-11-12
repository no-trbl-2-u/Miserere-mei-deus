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
    registerNodeScene,
    setNodeEventPoolOverride,
} from './resolve-map-event';
import { PLACEHOLDER_CACHE_ACTIONS } from './types';
import type { CutscenePayload, LootCacheActionLines, MapEventPayload, MapEventPool, NodeScene, QuestGiver } from './types';
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

/**
 * One cache's authored content: its one-liner, its currency and its two
 * action lines. A cache T has not written yet carries
 * `PLACEHOLDER_CACHE_ACTIONS` (`./types`) on both choices, never invented flavour;
 * `cache-action-lines.engine.test.ts` fails a cache carrying neither.
 */
export interface AuthoredLootCache {
    currency: number;
    description: string;
    actions: LootCacheActionLines;
}

/**
 * T's two action lines, for the cave cache (`cw-6`), verbatim (T, 2026-11-06).
 * The card choice reads the runes; the goods choice loots the dead.
 */
export const CAVE_CACHE_ACTIONS: LootCacheActionLines = Object.freeze({
    card: 'Read the runes inside the cave',
    item: 'Plunder the corpses left by the previous patrons',
});

// Low-risk coastal scavenging — a few shillings the tide or a dead sailor left.
export const COAST_LOOT_CACHES: ReadonlyArray<AuthoredLootCache> = [
    { currency: 8,  description: 'A purse of shillings snagged in the netting, its owner long gone.', actions: PLACEHOLDER_CACHE_ACTIONS },
    { currency: 12, description: 'A waterlogged strongbox wedged under the pilings.', actions: PLACEHOLDER_CACHE_ACTIONS },
    { currency: 6,  description: 'Loose shillings spill from a cracked jar in the rocks.', actions: PLACEHOLDER_CACHE_ACTIONS },
    // The old watchtower (level 6 country, as the strongbox) and the high pass
    // (level 2 country, as the cracked jar): placeholders until T's loot pass.
    { currency: 12, description: '[content] A coin box behind the watchtower\'s fallen stair.', actions: PLACEHOLDER_CACHE_ACTIONS },
    { currency: 6,  description: '[content] A traveller\'s purse caught in the rocks of the high pass.', actions: PLACEHOLDER_CACHE_ACTIONS },
];
export function lootCachePool(nodeId: string, cache: AuthoredLootCache): MapEventPool {
    return {
        id: `${nodeId}.loot-cache`,
        entries: [{
            kind: 'loot-cache', weight: 1,
            payload: { kind: 'loot-cache', currency: cache.currency, description: cache.description, actions: cache.actions },
        }],
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

export function campRestPool(nodeId: string, description: string, dream?: string): MapEventPool {
    return {
        id: `${nodeId}.rest`,
        entries: [{
            // A cavern camp is never an inn.
            kind: 'rest', weight: 1,
            payload: { kind: 'rest', shelter: 'camp', description, ...(dream ? { dream } : {}) },
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

function currencyLootPool(nodeId: string, currency: number, description: string, actions: LootCacheActionLines): MapEventPool {
    return {
        id: `${nodeId}.loot-cache`,
        entries: [{
            kind: 'loot-cache', weight: 1,
            payload: { kind: 'loot-cache', currency, description, actions },
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

/** One node's scene slot, keyed by its map: a row of `NODE_SCENES`. */
export interface NodeSceneEntry { continent: string; map: string; nodeId: string; scene: NodeScene }

// ─── The Breakwater (Act 1, map 1) ───────────────────────────────────────────
//
// T's Chapter 1 map (`Continents/Coastal-Village/breakwater-chapter.ts`): 43
// nodes, one pool each but the windmill, by the node list's board kind
// (`plan/116-bw1-breakwater-rebuild.md`).
//
// Each fight node binds one foe at one level (`BW_ENCOUNTER_FOES`, T's
// Breakwater table). Placeholders until T's sessions: the elites are the
// Green Jelly, the Saint Beneath is the chapter boss at the door fight's
// level (EN3b, 2026-11-07);
// hazards are the shared damage hazard; rests, loot caches and villages
// come from the shared builders, and the scenes sit in `BW_NODE_SCENES`.
// Every new line is `[content]`.

/** The Breakwater's elite, pinned low like every Act 1 fight. */
export const BW_ELITE_LEVEL = 3;

/**
 * The Saint Beneath's level at the Sea Keep. T wants the player at level
 * 8-10 on arrival, so the Saint fights at its full authored 320 VITAE
 * (no level scaling under 8).
 */
export const BW_DOOR_LEVEL = 8;

/** A board kind: what each node of the node list is. */
export type BreakwaterChapterKind =
    | 'start' | 'village' | 'quest' | 'boss' | 'elite' | 'hazard'
    | 'fight' | 'rest' | 'loot' | 'travel';

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
    'bw-l2': { kind: 'hazard',   place: 'Clifftop chapel' },
    'bw-l3': { kind: 'rest',     place: 'Cliff road' },
    'bw-l4': { kind: 'elite',    place: 'Lighthouse path' },
    'bw-l5': { kind: 'quest',    place: 'Lighthouse' },
    'bw-d1': { kind: 'fight',    place: 'Fishing hamlet' },
    'bw-d2': { kind: 'loot',     place: 'Boat sheds' },
    'bw-d3': { kind: 'fight',    place: 'Hamlet rise' },
    'bw-d4': { kind: 'hazard',   place: 'Tower switchbacks' },
    'bw-d5': { kind: 'loot',     place: 'Old watchtower' },
    'bw-m1': { kind: 'fight',    place: 'South fork' },
    'bw-m2': { kind: 'hazard',   place: 'River meadow' },
    'bw-m3': { kind: 'loot',     place: 'Riverbank' },
    'bw-m4': { kind: 'hazard',   place: 'Manor road' },
    'bw-m5': { kind: 'village',  place: 'Walled manor' },
    'bw-p1': { kind: 'hazard',   place: 'Foothills' },
    'bw-p3': { kind: 'loot',     place: 'High pass' },
};

/** The four quest nodes: their place in the chain and their refusal line. */
const QUEST_NODES: Readonly<Record<string, { node: number; description: string; turnInLine?: string; lockedLine: string; giver: QuestGiver }>> = {
    'bw-c2': {
        node: 2,
        description: 'Abel Corse says, Ask the man in the tower who lit it. The master would know that much.',
        turnInLine: 'Abel Corse says, Seven living. Tell her that her brother is one of the seven. Tell her the master is not.',
        lockedLine: 'The men by the fire look past you. You were not sent, and they have nothing for one who was not sent.',
        giver: { name: 'Abel Corse', portrait: 'fishermen-elder' },
    },
    'bw-l5': {
        node: 3,
        description: 'Enoch Marrable says, Take it. I will enter it as lost overboard.',
        turnInLine: 'Enoch Marrable says, Entered as lit. It was not lit. Your man saw the sea door under the keep, standing open, and the light of it laid along the head. They paid me a key when they took the lamp. I have not used it.',
        lockedLine: 'Enoch Marrable is at his log and does not lift his head. He has no word for one who brings him no question.',
        giver: { name: 'Enoch Marrable', portrait: 'lighthouse-keeper' },
    },
    'bw-k1': {
        node: 4,
        description: '[content] The keep gate, barred from the inside.',
        turnInLine: 'Serjeant Dunmore says, None to pass without the key. That is the key. Then those are the orders. If he knows you in there, tell him. No. Tell him nothing. Pass.',
        lockedLine: 'The serjeant does not move from the gate. None to pass without the key, he says, and you have no key.',
        giver: { name: 'Serjeant Dunmore', portrait: 'gate-warden' },
    },
    'bw-b1': {
        node: 5,
        description: '[content] The River Bridge.',
        turnInLine: 'Tolliver Pease says, Well. He is done, then. I heard it in the chain, it has gone slack as a widow\'s purse. Cross. No charge. There is no one left to charge it to.',
        lockedLine: 'Tolliver Pease pats the chain as he would a dog. Not while he sits in that house, he says, and offers you the stool.',
        giver: { name: 'Tolliver Pease', portrait: 'bridge-keeper' },
    },
};

/** The loot caches, as indexes into the shared coastal caches. */
const LOOT_NODES: Readonly<Record<string, number>> = { 'bw-h8': 0, 'bw-d2': 1, 'bw-m3': 2, 'bw-d5': 3, 'bw-p3': 4 };

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
 * Every `fight` node has a row; the sea cave's elite draws are in
 * `BW_ELITE_DRAWS`. EN3b (2026-11-07) recast the chapter: six new faces hold
 * six cut foes' nodes at their levels, and the five nodes of the four benched
 * with no face (Float-Eye, Gallows Crow, Curfew-Ringer, Smokehouse Gutter) are
 * refilled by duplication: `bw-t3` takes a Brine-Widow and `bw-d1` a
 * Net-Mender (keepers), while `bw-w2` and `bw-m1` take a Quay-Crab and
 * `bw-w3` a Coralback (repeats of new recast faces). The ten foes cut from the
 * chapter stay in the library but are placed in none of these tables (T,
 * 2026-11-06: "they're just not in chapter 1").
 */
export const BW_ENCOUNTER_FOES: Readonly<Record<string, ActOneFoe>> = {
    // Fields & south road, level 2.
    'bw-w2': { slug: 'quay-crab', level: 2 },
    'bw-w3': { slug: 'coralback', level: 2 },
    'bw-m1': { slug: 'quay-crab', level: 2 },
    // The quays, level 3.
    'bw-h1': { slug: 'net-mender', level: 3 },
    'bw-h2': { slug: 'quay-crab', level: 3 },
    'bw-h3': { slug: 'net-mender', level: 3 },
    // The long pier and harbour steps, level 4.
    'bw-h7': { slug: 'brine-widow', level: 4 },
    'bw-t1': { slug: 'coralback', level: 4 },
    // The town, level 5.
    'bw-t2': { slug: 'bilge-stalker', level: 5 },
    'bw-t3': { slug: 'brine-widow', level: 5 },
    'bw-t6': { slug: 'coralback', level: 5 },
    // The cliffs and the hamlet, level 6.
    'bw-l1': { slug: 'bilge-stalker', level: 6 },
    'bw-d1': { slug: 'net-mender', level: 6 },
    'bw-d3': { slug: 'bilge-stalker', level: 6 },
};

/**
 * The elite nodes' draws (phase EN1j): each elite node names one to three foes,
 * and with several the map's seeded pool roll (`rollPool`, run once on arrival
 * from the run's RNG) picks one with equal odds. Every elite node has its row now
 * (EN1j, EN1k, EN1l); one with no row would keep the Green Jelly staged as an
 * elite. Levels are T's Breakwater table, every foe under level 10.
 */
export const BW_ELITE_DRAWS: Readonly<Record<string, readonly ActOneFoe[]>> = {
    // The sea cave, level 5: the Cave Choir (EN1j), the Tithe-Collector (EN1h) or Saltwick Swarm (MV1d), a third each.
    'bw-c1': [
        { slug: 'cave-choir', level: 5 },
        { slug: 'tithe-collector', level: 5, difficulty: 'elite' },
        { slug: 'saltwick-swarm', level: 5 },
    ],
    // The lighthouse path, level 7: the Lamplighter or the Wrecker (EN1k).
    'bw-l4': [{ slug: 'lamplighter', level: 7 }, { slug: 'wrecker', level: 7 }],
    // The keep causeway, level 8 (phase EN1l): the Wreckmaster or the Tide-Gate.
    'bw-w5': [{ slug: 'wreckmaster', level: 8 }, { slug: 'tide-gate', level: 8 }],
};

/**
 * An elite node's pool: one `encounter` entry per foe, each `weight: 1`, so
 * the map's pool roll draws each with equal odds. One to three foes; any other
 * count is an authoring error.
 */
export function eliteDrawPool(nodeId: string, foes: readonly ActOneFoe[]): MapEventPool {
    if (foes.length < 1 || foes.length > 3) {
        throw new Error(`breakwater: elite ${nodeId} names ${foes.length} foes; an elite node draws one to three`);
    }
    return { id: `${nodeId}.encounter`, entries: foes.map(foe => cwEncounterPool(nodeId, foe).entries[0]!) };
}

/** The pool for one node of the new map, by its board kind; the start node has none. */
function poolFor(nodeId: string): MapEventPool | null {
    const { kind, place } = BREAKWATER_CHAPTER_KINDS[nodeId]!;
    switch (kind) {
        case 'start':    return null;
        case 'fight': {
            const foe = BW_ENCOUNTER_FOES[nodeId];
            if (!foe) throw new Error(`breakwater: fight ${nodeId} has no row in BW_ENCOUNTER_FOES`);
            return cwEncounterPool(nodeId, foe);
        }
        case 'elite': {
            const draw = BW_ELITE_DRAWS[nodeId];
            if (draw) return eliteDrawPool(nodeId, draw);
            return cwEncounterPool(nodeId, { slug: 'green-jelly', level: BW_ELITE_LEVEL, difficulty: 'elite' });
        }
        case 'boss':     return cwEncounterPool(nodeId, { slug: 'saint-beneath', level: BW_DOOR_LEVEL, isBoss: true });
        case 'hazard':   return hazardPool(nodeId, `[content] ${place}.`);
        case 'rest':     return campRestPool(nodeId, `[content] ${place}.`, BREAKWATER_REST_DREAMS[nodeId]);
        case 'loot':     return lootCachePool(nodeId, COAST_LOOT_CACHES[LOOT_NODES[nodeId]!]!);
        case 'village':  return breakwaterVillagePool(nodeId, place);
        case 'travel':   return single(nodeId, TRAVEL[nodeId]!);
        case 'quest': {
            const q = QUEST_NODES[nodeId]!;
            return single(nodeId, {
                kind: 'quest', questline: BREAKWATER_CHAPTER_QUESTLINE_ID,
                node: q.node, description: q.description, lockedLine: q.lockedLine, giver: q.giver,
                ...(q.turnInLine !== undefined ? { turnInLine: q.turnInLine } : {}),
            });
        }
    }
}

/**
 * The dream line each Breakwater rest shows while the night passes (ET1c).
 * `[content]` until T's sitting writes them; keyed by node id, one per rest.
 */
export const BREAKWATER_REST_DREAMS: Readonly<Record<string, string>> = Object.freeze({
    'bw-w4': '[content] A dream of the West cliff road.',
    'bw-h5': '[content] A dream of the Moored ship.',
    'bw-l3': '[content] A dream of the Cliff road.',
});

/** The 42 pools, in map-definition order: every node but the windmill, whose own event is none. */
export const BREAKWATER_CHAPTER_POOLS: ReadonlyArray<{ nodeId: string; pool: MapEventPool }> =
    breakwaterChapter.nodes.flatMap(n => {
        const pool = poolFor(n.id);
        return pool ? [{ nodeId: n.id, pool }] : [];
    });

/**
 * The Breakwater's scene slots, played once a run before each node's own
 * event: T's 22 approved Chapter 1 scenes, S-01 to S-22 of
 * `plan/ballots/narrator-chapter1.md`, one entry per scene, each panel one
 * line, copied as the ledger has it (`scripts/narrator-verdicts.test.mjs`
 * reads them back). The windmill opens the chapter and gives the chain's
 * first step. A scene with no picture of its own shows the picture of the
 * nearest scene that has one (fewest roads on the map, a tie to the first of
 * the windmill, the chapel, the watchtower, the pass) until T supplies art
 * (T to confirm). No scene has a `description`: the ledger has none.
 */
export const BW_NODE_SCENES: ReadonlyArray<NodeSceneEntry> = [
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-w1',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'windmill-headland',
                lines: [
                    'Before the roads there was one lamp over all this country. It hung from a chain of four hundred links and burned without oil or tending, and whatever stood beneath it cast no shadow, neither man nor beast nor standing stone. I know the count of the links. The shadows it forbade did not perish. They went into the sea, and the folk of this coast call them the Owed.',
                    'Then the lamp was let down and broken, and the pieces were carried off like the relics of a murdered saint to the houses of those who could pay. You come to the coast in the age that followed, on foot, through fields gone to thistle and dock and the grey stalks of a grain no one has sown in living memory. The sea beyond is black from shore to rim.',
                    'A windmill stands on the headland with its sails lashed and its stones still. Below it lies a walled harbour built against a reef that curves out of the surf pale and toothed, and on the far head a tower with no fire in it. A woman waits in the door of the mill.',
                    'Ann Greave says, You are going down. Am I wrong. I am not. A boat of ours did not come in last night and my brother is in her, and who in that town has an hour to walk the shore and look. No one. So it is you. She looks at your hands and then at the road. Find her men, she says, and she does not say it twice.',
                ],
                effect: { giveQuestStep: { questline: BREAKWATER_CHAPTER_QUESTLINE_ID, step: 1 } },
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-w2',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'windmill-headland',
                lines: [
                    'At the crossroads stands a frame of grey oak with an iron cresset hung from its arm, to bring walkers in off the heath. When the fires failed the walkers yet came, in snow and in fog, and they lie under the cairns along the ditch where the frost found them.',
                    'Their shadows did not lie down with them. On a clear night you may see those yet upon the heath, thirty one, walking in file toward a fire that is not there.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-h1',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'windmill-headland',
                lines: [
                    'After dusk the harbour goes on working. Men coil line by the feel of it and step from gunwale to gunwale with no lantern among them. You go down among the tarred hulls and the stacked creels and the nets hung like the cerements of some drowned order, and no one calls out. Beyond the mole the sea heaves under the stars and gives none of them back.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-h3',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'windmill-headland',
                lines: [
                    'On the pier stands an iron post with a fire pan at its head, where a flame was kindled each dusk from the lamp in the tower. Thirty years gone the council sat one evening and sold that lamp to the lord of the keep by a show of hands. Each house that raised a hand was paid in coin, and no word of it was sent to the ships.',
                    'That night the sea came up the harbour steps as far as the third stair and stood there until morning, black and without wave, and went down again.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-h4',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'windmill-headland',
                lines: [
                    'She lies on the outer reef with her back broken across it. At the ebb you can see the sockets, each wider than a well, and the boat lies in the gap where a tooth is gone, and the swell goes in and out of her like breath. Her nets are aboard and her oars are shipped and there is no one in her.',
                    'Whatever owned this jaw was dead before the sea was salt. The town calls it the Gape and fishes in its lee.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-h5',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'windmill-headland',
                lines: [
                    'A hulk lies chained at the inner mole and in her great cabin the town keeps its book. Each wreck has a page. The shares are set down by household, and the custom is written at the head of every leaf, that no swimmer is to be taken from the water until the cargo is in.',
                    'They hold to it. When the cargo is ashore the children are let down among the drowned before any grown man, that they may have first choice of the boots, and the mothers stand at the rail and call down which to take. The drowned, when the boots are off them, are rowed by night to the sea door of the keep. The book calls this the tithe and has a column for it.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-c0',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'windmill-headland',
                lines: [
                    'The cave lets you out beneath the cliff into a cove no boat could find. The water lies still as poured lead. Where the swell turns the weed a cold fire wakes in it and runs and goes out, green and without heat, and by that light you see your own shadow on the shingle. It lies as a shadow should. You stand a while and look at it.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-c2',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'windmill-headland',
                lines: [
                    'Seven men sit about a fire of wreckwood far back under the overhang, where the sea cannot see it, and the eighth sits apart with his back to it. That is Abel Corse, who was master of the boat. He does not turn.',
                    'Abel Corse says, Wind north and east, backing. Nine fathom on the lead and shoaling. Forty years the master has brought her in by the feel of the bottom. That night there was a light on the head, white, and nothing in the boat cast a shadow by it, and the master put the helm over and stood in for it like a man going home.',
                    'He says, The boy was in the bow to call the rocks. Eleven years old, the master\'s daughter\'s son. He called them. He called them twice. The master said, Hush, it is lit. The sea gave the boy back on the second tide and the men put him under stones above the wrack, and they keep a watch on the stones.',
                    'He has the boy\'s bow line in his lap. He has coiled it and shaken it out and coiled it again since they came ashore, and he is coiling it now.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-t2',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'windmill-headland',
                lines: [
                    'The river comes down to the sea east of the town and one bridge crosses it, with a chain drawn across at the height of your chest. On the far bank the country lies low and wooded and a smoke stands over it from end to end like a second and lower sky. No bird crosses in either direction. The water runs clear to midstream and beyond midstream it runs grey, and the two do not mingle.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-t4',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'clifftop-chapel',
                lines: [
                    'The herring did not come this year nor the year before. What the nets bring up now is black and boneless and is put back with a prayer. The town sits to its supper behind closed shutters, and the bowls are shallow and the children quiet, and the old go early to bed that they may be hungry in their sleep and not in company.',
                    'Hob Lathe keeps the inn. He says very low, You will want a bed. It is the quiet season. It has been the quiet season some while. He sets the bowl before you as if it might wake.',
                    'Verity Scole keeps the shop. She says, Salt, a peck, two shillings. Line, the fathom, a penny. Talk is a shilling the quarter hour and you have had a third of one. Across the lane Osric Kell stands at a cold forge and looks at the iron you carry. He says, Poor, and goes back in.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-t6',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'clifftop-chapel',
                lines: [
                    'Above the lanes the houses are tall and built of dressed stone. Every window in the street looks west along the shore toward the keep, and in each a chair is set, and at evening the chairs are filled. There is not one pane in all that hill of glass that faces the sea.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-l2',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'clifftop-chapel',
                lines: [
                    'The chapel on the cliff was built to face the rising sun. The town drew it round on rollers in one summer to look upon the keep. The priest who would not carry the altar across was put out on the cliff road in January, and the one who came after was paid.',
                    'Where the altar lamp hung they have hung a glass float filled with seawater from under the keep, and at night it is very faintly white. They kneel beneath it to the lord of that house and call him the Saint Beneath.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-l3',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'clifftop-chapel',
                lines: [
                    'The road runs along the cliff top through thrift and short grass and the wind comes clean off the water. Ahead the tower stands unlit against the sky. It is a single bone, hollowed, and the stair winds up inside it where the marrow was. Two hundred and six steps to the lamp room. You did not ask. The seventh from the top is loose and was loose before any lamp was carried up it.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-l5',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'clifftop-chapel',
                lines: [
                    'The warden of the tower is Enoch Marrable and he climbs it at dusk every night of the year. He trims no wick, for there is none. He stands his watch beside the empty mount and at dawn he comes down and writes in the log.',
                    'He turns the book that you may see it. Enoch Marrable says, Fourteenth of the month. Wind south west, fresh. Lit at the sixth hour, burned clear, doused at dawn. Thirty years and no entry missed. Remark the hand.',
                    'The town pays him four shillings a week to write it. Each quarter the log goes inland to the men who draw the charts, and the charts yet show a light on this head, and the masters of strange ships yet steer for it with their crews asleep below. He is proud of the hand.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-w5',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'windmill-headland',
                lines: [
                    'A causeway of fitted stone runs out to the keep and the tide covers it twice in a day. Along the wrack line the town has left what it leaves. Loaves gone green, a bell with no tongue, a comb, a christening spoon.',
                    'Beyond these the Owed stand in the shallows in their hundreds, in the shapes of men and of cattle, facing the keep, and the tide goes through them.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-k1',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'windmill-headland',
                lines: [
                    'The gate of the keep is oak banded in iron and a serjeant stands before it in a coat too heavy for the season. Serjeant Dunmore says, None to pass without the key. None to pass without the key. Those are the orders and I have them by heart.',
                    'There is a grate low in the gate. Each evening he kneels and puts bread through it and something on the other side takes the bread. His son went in at sixteen to serve the lord of the place. The boy\'s shadow came out again the same evening, alone, and it has stood at the foot of the serjeant\'s bed every night for four winters.',
                    'Dunmore says, He was a talker. You could not get your word in. None to pass without. He stops there. Behind the gate something breathes, slow and wet, and the serjeant brushes the crumbs from his knee.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-k2',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'windmill-headland',
                lines: [
                    'The stair goes down and not up. Under the keep is a round room with one door to the sea, shut now, and the lamp of the harbour burns on the bare floor, white and soundless. You look for your shadow and there is the floor and the light upon it.',
                    'The lord of the place sits beyond the lamp. Thirty years in that light have taken the edges from him, and he is grown pale and manifold as coral grows, branched and rebranched, and through him you can see the wall. About him on the floor lie the tithes of all those years, laid out in rows, and not one of them has been let to rot.',
                    'He turns toward you what serves him for a face. I have stood in that room. I will not tell you when.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-d5',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'old-watchtower',
                lines: [
                    'The tower on the north head was manned against a fleet that was said to be coming. Six men and stores for a season. The relief was to follow in the spring. The log is still on the table and the entries go on for three years in a smaller and smaller hand, and the last of them say only fog, and fog, and wind north, and fog.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-b1',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'windmill-headland',
                lines: [
                    'At the bridge head a small man sits on a stool beside the chain with a pot of something warm. Tolliver Pease says, Sit, sit. You want across. Everyone wants across. What will you give me to lift it. No, keep it, I cannot be bought. I have been bought already and the man was prompt.',
                    'He says, While he sits in that house the chain stays drawn, and I would not cross if I were you, and I am not, thank God. Look at that smoke. Does that look like a country. He laughs and the river goes on under him in its two colours, bearing nothing.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-p3',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'high-pass',
                lines: [
                    'The pass is the one road inland and there is a hut of stones at the top of it. In the hungry years families walked up from the coast with what they could carry. Men waited at the hut and asked a toll in coin of people who had only ever been paid in fish. Those who could not pay were relieved of their cooking pot. They turned back.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-m5',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'windmill-headland',
                lines: [
                    'The manor stands inside its own wall and there are candles in the windows, tallow, bought dear from inland. No one at the gate asks your name or your road. A fire is lit for you and you sit before it, and for one night the dark is a thing that stands outside a wall.',
                ],
            },
        },
    },
    {
        continent: 'coastal-continent', map: 'breakwater', nodeId: 'bw-b2',
        scene: {
            before: {
                kind: 'cutscene',
                scene: 'windmill-headland',
                lines: [
                    'From the far bank you look back. The keep is dark and the tower is dark. What you carried out of that room is a splinter no longer than your thumb, white and cold to hold. The town has watched you go.',
                    'At nightfall they come out along the cliff with timber and pitch. You watch them build the fire with their own hands on the head above the reef. Then they go down to the rail and stand in a row with their children before them and wait, and someone has brought the book. Beyond the reef the black water has begun to move toward the fire.',
                    'I have seen it done on other coasts. Inland a mountain you had taken for cloud shows one point of fire near its summit, and it was not there at dusk.',
                ],
            },
        },
    },
];

// ─── The Charcoal Wood (Act 1, map 2) ────────────────────────────────────────
//
// The Charcoal Wood uses the shared builders (hazard and loot, the caverns'
// camp) and the northern forest's roster. It
// adds no enemy, NPC, item or event kind of its own; the one-line
// descriptions and the two arrival lines sit on the plate's landmarks (see
// `Continents/Coastal-Village/charcoal-wood.ts`).
//
// Kind spread over 20 nodes: 7 encounter, 3 rest, 3 loot-cache,
// 3 empty waypoints, 1 hazard, 1 village (the Anvil, cw-18), 1 start node
// (an empty waypoint with an arrival scene in its slot), 1 travel. The northern forest's roster is level 9 and up, so
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
const cwArrival: CutscenePayload = {
    kind: 'cutscene',
    scene: 'charcoal-wood-arrival',
    lines: ['[content] The River Bridge.'],
    description: '[content] The River Bridge.',
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
    'cw-9':  '[content] The Hunting Lodge.',
    'cw-11': '[content] The Stilt Cottage.',
    'cw-15': '[content] The Woodcutters’ Camp.',
};

const CW_HAZARD_NODES: Record<string, string> = {
    'cw-3':  '[content] The Ruined Shrine.',
};

const CW_LOOT_NODES: Record<string, AuthoredLootCache> = {
    'cw-2':  { currency: 8,  description: '[content] The Ruined Tower.', actions: PLACEHOLDER_CACHE_ACTIONS },
    // The cave cache — the one cache whose action lines T has written.
    'cw-6':  { currency: 6,  description: '[content] The West Cave.', actions: CAVE_CACHE_ACTIONS },
    'cw-13': { currency: 12, description: '[content] The Hermit’s Hut.', actions: PLACEHOLDER_CACHE_ACTIONS },
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
            prompt: '[content] The Stair Cave.',
        },
    }],
};

const CHARCOAL_WOOD_POOLS: ReadonlyArray<{ nodeId: string; pool: MapEventPool }> =
    (() => {
        const out: Array<{ nodeId: string; pool: MapEventPool }> = [];
        for (let i = 1; i <= 20; i++) {
            const nodeId = `cw-${i}`;
            if (nodeId === 'cw-1') {
                continue;
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
// 2 hazard, 1 village (the Anvil, bc-12), 1 start node (an empty waypoint with
// an arrival scene in its slot), 1 travel.
// The caverns' roster is level 13 and up, so every fight is pinned low, one
// step above the Charcoal Wood: 3 on the upper mountain, 4 below
// the gorge.

const BC_FIGHT_LEVEL_EARLY = 3;
const BC_FIGHT_LEVEL_LATE = 4;
const BC_DOOR_LEVEL = 3;

/** Arrival up the Charcoal Wood's stair, on the crag road. */
const bcArrival: CutscenePayload = {
    kind: 'cutscene',
    lines: ['[content] The Top Pass.'],
    description: '[content] The Top Pass.',
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
    'bc-4':  '[content] The Shepherds’ Village.',
    'bc-6':  '[content] The Cliff Monastery.',
    'bc-14': '[content] The Mountain Inn.',
};

const BC_HAZARD_NODES: Record<string, { damage: number; description: string }> = {
    'bc-3':  { damage: 2, description: '[content] The Hanging Lake.' },
    'bc-9':  { damage: 3, description: '[content] The Rope Bridge.' },
};

const BC_LOOT_NODES: Record<string, AuthoredLootCache> = {
    'bc-5':  { currency: 12, description: '[content] The Crag Castle.', actions: PLACEHOLDER_CACHE_ACTIONS },
    'bc-16': { currency: 14, description: '[content] The Tunnel Bridge.', actions: PLACEHOLDER_CACHE_ACTIONS },
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
            prompt: '[content] The Glacier Shrine.',
        },
    }],
};

const BEACON_CRAGS_POOLS: ReadonlyArray<{ nodeId: string; pool: MapEventPool }> =
    (() => {
        const out: Array<{ nodeId: string; pool: MapEventPool }> = [];
        for (let i = 1; i <= 17; i++) {
            const nodeId = `bc-${i}`;
            if (nodeId === 'bc-1') {
                continue;
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
                out.push({ nodeId, pool: currencyLootPool(nodeId, l.currency, l.description, l.actions) });
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
// 2 hazard, 1 village (the Anvil, ld-14), 1 start node (an empty waypoint with
// an arrival scene in its slot), 2 sealed
// doors (the vault door and the deep stair). No boss; one elite on the last
// fight column. Every fight pinned low, level with the Beacon Crags: 3 above
// the aqueducts, 4 below them.

const LD_FIGHT_LEVEL_EARLY = 3;
const LD_FIGHT_LEVEL_LATE = 4;
const LD_DOOR_LEVEL = 4;

/** Arrival down the Beacon Crags' stair, through the cavern roof. */
const ldArrival: CutscenePayload = {
    kind: 'cutscene',
    lines: ['[content] The Surface Stair.'],
    description: '[content] The Surface Stair.',
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
    'ld-2':  '[content] The Ferry Landing.',
    'ld-10': '[content] The Market Grotto.',
    'ld-17': '[content] The East Stairs.',
};

const LD_HAZARD_NODES: Record<string, { damage: number; description: string }> = {
    'ld-4':  { damage: 2, description: '[content] The North Aqueduct.' },
    'ld-9':  { damage: 3, description: '[content] The Sleeping Giant.' },
};

const LD_LOOT_NODES: Record<string, AuthoredLootCache> = {
    'ld-6':  { currency: 12, description: '[content] The West Tunnel.', actions: PLACEHOLDER_CACHE_ACTIONS },
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
            lines: ['[content] The Vault Door.'],
            description: '[content] The Vault Door.',
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
            lines: ['[content] The Deep Stair.'],
            description: '[content] The Deep Stair.',
        },
    }],
};

const LANTERN_DEEP_POOLS: ReadonlyArray<{ nodeId: string; pool: MapEventPool }> =
    (() => {
        const out: Array<{ nodeId: string; pool: MapEventPool }> = [];
        for (let i = 1; i <= 18; i++) {
            const nodeId = `ld-${i}`;
            if (nodeId === 'ld-1') {
                continue;
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
                out.push({ nodeId, pool: currencyLootPool(nodeId, l.currency, l.description, l.actions) });
            } else {
                const foe = LD_ENCOUNTER_FOES[nodeId];
                if (!foe) throw new Error(`lantern-deep: ${nodeId} has no authored event kind or foe.`);
                out.push({ nodeId, pool: cwEncounterPool(nodeId, foe) });
            }
        }
        return out;
    })();

// ─── node scenes (the slot before a node's own event) ───────────────────────
//
// A scene is registered per (continent, map, node) and plays once a run before
// the node's own event. Every Act 1 map opens on one at its start node; those
// have no pool, so the scene is followed by an empty waypoint.
// Add a map's scenes as rows of this table: `registerMapEventContent` walks it.

const NODE_SCENES: ReadonlyArray<NodeSceneEntry> = [
    ...BW_NODE_SCENES,
    { continent: 'coastal-continent', map: 'charcoal-wood', nodeId: 'cw-1', scene: { before: cwArrival } },
    { continent: 'northern-continent', map: 'beacon-crags', nodeId: 'bc-1', scene: { before: bcArrival } },
    { continent: 'northern-continent', map: 'lantern-deep', nodeId: 'ld-1', scene: { before: ldArrival } },
];

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
    for (const { continent, map, nodeId, scene } of NODE_SCENES) {
        registerNodeScene(continent, map, nodeId, scene);
    }
}

registerMapEventContent();

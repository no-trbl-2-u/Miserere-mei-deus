/**
 * MapEvent pool content for the Act 1 maps (breakwater, charcoal-wood,
 * beacon-crags, lantern-deep).
 *
 * Each authored node (bw-N / cw-N / bc-N / ld-N) gets a single-entry pool override
 * so the dispatcher reproduces (and extends) the authored events
 * `processNode` fires. Act 1 stages no NPC, shop or narration, so
 * the `interaction`, `village` and `narration` kinds have no carrier here;
 * their witnesses are the neutral fixtures in `Game/fixtures/`.
 *
 * This file side-effects on import: `src/World/index.ts` imports it
 * for that side effect, so consumers of the package get the pools
 * registered automatically when they touch the world barrel.
 */

import {
    registerMapEventPool,
    setNodeEventPoolOverride,
} from './resolve-map-event';
import type { MapEventPool } from './types';
import type { EnemySlug } from '../../Enemy/enemy.library';
import { BLACKSMITH_WITNESS_VARIANTS } from '../Blacksmith/blacksmith.content';
import { BREAKWATER_QUESTLINE_ID } from '../quest.library';

// ─── Shared builders (Act 1) ─────────────────────────────────────────────────
//
// The builders the Act 1 maps share.

/**
 * Inn rests: tended, paid shelter inside a settlement.
 */
function innRestPool(nodeId: string, description: string): MapEventPool {
    return {
        id: `${nodeId}.rest`,
        entries: [{ kind: 'rest', weight: 1, payload: { kind: 'rest', shelter: 'inn', description } }],
    };
}

const COAST_GATHER_MATERIALS: ReadonlyArray<{ id: string; name: string; description: string }> = [
    { id: 'driftwood',  name: 'Driftwood',       description: 'Salt-bleached and brittle, but burns clean.' },
    { id: 'tide-shell', name: 'Tide Shell',      description: 'Spiral and chalk-pale; the inside still smells of salt.' },
    { id: 'salt-fish',  name: 'Salt-Fish Strip', description: 'Cured hard; chewy, salty, will keep for the road.' },
    { id: 'kelp-frond', name: 'Kelp Frond',      description: 'Rubbery and green-black; useful steeped or dried.' },
];
function gatheringPool(nodeId: string, mat: { id: string; name: string; description: string }, description: string): MapEventPool {
    return {
        id: `${nodeId}.gathering`,
        entries: [{
            kind: 'gathering', weight: 1,
            payload: {
                kind: 'gathering',
                items: [{ id: mat.id, name: mat.name, description: mat.description, category: 'material', quantity: 1 }],
                description,
            },
        }],
    };
}

function hazardPool(nodeId: string, description: string): MapEventPool {
    return {
        id: `${nodeId}.hazard`,
        entries: [{ kind: 'hazard', weight: 1, payload: { kind: 'hazard', damage: 2, description } }],
    };
}

// Low-risk coastal scavenging — a few shillings the tide or a dead sailor left.
const COAST_LOOT_CACHES: ReadonlyArray<{ currency: number; description: string }> = [
    { currency: 8,  description: 'A purse of shillings snagged in the netting, its owner long gone.' },
    { currency: 12, description: 'A waterlogged strongbox wedged under the pilings.' },
    { currency: 6,  description: 'Loose shillings spill from a cracked jar in the rocks.' },
];
function lootCachePool(nodeId: string, cache: { currency: number; description: string }): MapEventPool {
    return {
        id: `${nodeId}.loot-cache`,
        entries: [{ kind: 'loot-cache', weight: 1, payload: { kind: 'loot-cache', currency: cache.currency, description: cache.description } }],
    };
}

// The anvil's pool. Budget is a placeholder; the mobile
// interceptor re-derives the real spend cap from the player's wallet
// (`state/blacksmith/store-actions.ts`) the moment this event fires.
function blacksmithPool(nodeId: string, description: string): MapEventPool {
    return {
        id: `${nodeId}.blacksmith`,
        entries: [{
            kind: 'blacksmith', weight: 1,
            payload: { kind: 'blacksmith', budget: 12, variants: BLACKSMITH_WITNESS_VARIANTS, description },
        }],
    };
}

function ironVeinPool(nodeId: string, description: string): MapEventPool {
    return {
        id: `${nodeId}.gathering`,
        entries: [{
            kind: 'gathering', weight: 1,
            payload: {
                kind: 'gathering',
                items: [{
                    id: 'iron-ore', name: 'Iron Ore',
                    description: 'Heavy, honest, worth carrying.',
                    category: 'material', quantity: 1,
                }],
                description,
            },
        }],
    };
}

function campRestPool(nodeId: string, description: string): MapEventPool {
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
// One anvil sits on one node near each Act 1 region's exit, a step from its
// door fight: the Breakwater's fishing hamlet, the Charcoal Wood's well, the
// Beacon Crags' falls and the Lantern Deep's forge (column 4). Same engine,
// budget, witness variants and line everywhere.
const ANVIL_LINE = 'A lean-to forge, coals still breathing. The smith looks up from the anvil and nods at your dice.';
export const ACT1_ANVIL_NODES: Readonly<Record<string, string>> = {
    'breakwater':    'bw-16',
    'charcoal-wood': 'cw-18',
    'beacon-crags':  'bc-12',
    'lantern-deep':  'ld-14',
};
const ANVIL_NODE_IDS: ReadonlySet<string> = new Set(Object.values(ACT1_ANVIL_NODES));

// ─── The Breakwater (Act 1, map 1) ───────────────────────────────────────────
//
// The Breakwater is built from the shared builders above (inn rests, coast
// materials, hazard and loot caches); it adds no enemy, NPC or event kind of
// its own. The one-line descriptions sit on the plate's landmarks (see
// `Continents/Coastal-Village/breakwater.ts` for the node map).
//
// Kind spread over 22 nodes: 6 encounter, 2 rest, 3 loot-cache,
// 2 gathering, 2 hazard, 1 blacksmith (the Anvil, bw-16), 1 arrival
// cutscene, 1 travel, and the questline's 4 quest nodes (bw-19..bw-22). The
// watchtower (bw-17), the one node every run crosses before the door, holds
// the region's door fight.

/**
 * The windmill is where a new game starts. It opens on a short
 * arrival scene, like every other Act 1 map, not on a rest screen.
 */
const bwWindmillArrival: MapEventPool = {
    id: 'bw-1.cutscene',
    entries: [{
        kind: 'cutscene', weight: 1,
        payload: {
            kind: 'cutscene',
            lines: [
                'A windmill on the headland, its sails lashed down. The sea is loud below it.',
                'A road runs east along the breakwater, toward a watchtower with its lamp lit.',
            ],
            description: 'You set out along the coast.',
        },
    }],
};

/** The Breakwater's elite, pinned low like every Act 1 fight. */
const BW_ELITE_LEVEL = 3;

/** The Breakwater's Float-Eyes are pinned too, so its XP is fixed. */
const BW_FIGHT_LEVEL = 2;

/**
 * Each region's door sits one level under the player a full clear
 * brings to it (Breakwater 1, Charcoal Wood 2, Beacon Crags 3, Lantern Deep 4).
 */
const BW_DOOR_LEVEL = 1;

const BW_ENCOUNTER_FOES: Record<string, ActOneFoe> = {
    // c1 — the crane quay
    'bw-2':  { slug: 'float-eye', level: BW_FIGHT_LEVEL },
    // c2 — the sea fort, the north pier, the walled manor
    'bw-6':  { slug: 'float-eye', level: BW_FIGHT_LEVEL, description: 'A lidless thing hangs over the fort wall. It has already seen you.' },
    'bw-10': { slug: 'float-eye', level: BW_FIGHT_LEVEL },
    // c4 — the lighthouse
    'bw-14': { slug: 'float-eye', level: BW_FIGHT_LEVEL },
};

/** The Green Jelly, a rarer mid-region fight on the north pier. */
const BW_ELITE: ActOneFoe = { slug: 'green-jelly', level: BW_ELITE_LEVEL };

/** The watchtower, the chokepoint before the bridge, holds the door fight. */
const BW_DOOR: ActOneFoe = { slug: 'death-beholder', level: BW_DOOR_LEVEL, isBoss: true };

const BW_REST_NODES: Record<string, string> = {
    'bw-9':  'The customs house lets rooms by the night. The clerk takes shillings, not names.',
    'bw-13': 'An inn above the harbour. Warm, loud, and paid for in advance.',
};

/** Index into `COAST_GATHER_MATERIALS`, and the line said on arrival. */
const BW_GATHER_NODES: Record<string, { mat: number; description: string }> = {
    'bw-4':  { mat: 0, description: 'Storm wrack piles at the foot of the pass. Some of it burns.' },
    'bw-11': { mat: 3, description: 'Kelp has taken the wreck. You cut what you can carry.' },
};

const BW_HAZARD_NODES: Record<string, string> = {
    'bw-3':  'The gallows hill is loose shale. It gives under you.',
    'bw-12': 'The tide comes into the sea cave faster than you leave it.',
};

/** Index into `COAST_LOOT_CACHES`. */
const BW_LOOT_NODES: Record<string, number> = { 'bw-5': 1, 'bw-7': 2, 'bw-15': 0 };

/**
 * The river bridge — the Breakwater's door, on to the Charcoal Wood (Act 1,
 * map 2; re-pointed from fishing-village when the forest shipped in M3b).
 */
const bwRiverBridge: MapEventPool = {
    id: 'bw-18.travel',
    entries: [{
        kind: 'travel', weight: 1,
        payload: {
            kind: 'travel',
            destinationContinent: 'coastal-continent',
            destinationMap: 'charcoal-wood',
            description: 'The bridge has a toll-house and no keeper. Across it, the road runs into a wood full of smoke.',
        },
    }],
};

/**
 * The questline's four markers, bw-19..bw-22 (`quest.library.ts`): node k of
 * the Breakwater questline. Placeholder lines until T's sitting.
 */
const BW_QUEST_NODES: Record<string, { node: number; description: string }> = {
    'bw-19': { node: 1, description: '[content] A marker by the windmill. Someone has left word here.' },
    'bw-20': { node: 2, description: '[content] A marker by the customs house. The word goes on.' },
    'bw-21': { node: 3, description: '[content] A marker by the south pier. The word goes on.' },
    'bw-22': { node: 4, description: '[content] A marker on the chapel road. The watchtower is close.' },
};

function questPool(nodeId: string, node: number, description: string): MapEventPool {
    return {
        id: `${nodeId}.quest`,
        entries: [{
            kind: 'quest', weight: 1,
            payload: { kind: 'quest', questline: BREAKWATER_QUESTLINE_ID, node, description },
        }],
    };
}

const BREAKWATER_POOLS: ReadonlyArray<{ nodeId: string; pool: MapEventPool }> =
    (() => {
        const out: Array<{ nodeId: string; pool: MapEventPool }> = [];
        for (let i = 1; i <= 22; i++) {
            const nodeId = `bw-${i}`;
            if (nodeId === 'bw-1') {
                out.push({ nodeId, pool: bwWindmillArrival });
            } else if (nodeId === 'bw-8') {
                out.push({ nodeId, pool: cwEncounterPool(nodeId, BW_ELITE) });
            } else if (nodeId === 'bw-17') {
                out.push({ nodeId, pool: cwEncounterPool(nodeId, BW_DOOR) });
            } else if (nodeId === 'bw-18') {
                out.push({ nodeId, pool: bwRiverBridge });
            } else if (BW_QUEST_NODES[nodeId]) {
                const q = BW_QUEST_NODES[nodeId]!;
                out.push({ nodeId, pool: questPool(nodeId, q.node, q.description) });
            } else if (ANVIL_NODE_IDS.has(nodeId)) {
                out.push({ nodeId, pool: blacksmithPool(nodeId, ANVIL_LINE) });
            } else if (BW_REST_NODES[nodeId]) {
                out.push({ nodeId, pool: innRestPool(nodeId, BW_REST_NODES[nodeId]!) });
            } else if (BW_GATHER_NODES[nodeId]) {
                const g = BW_GATHER_NODES[nodeId]!;
                out.push({ nodeId, pool: gatheringPool(nodeId, COAST_GATHER_MATERIALS[g.mat]!, g.description) });
            } else if (BW_HAZARD_NODES[nodeId]) {
                out.push({ nodeId, pool: hazardPool(nodeId, BW_HAZARD_NODES[nodeId]!) });
            } else if (nodeId in BW_LOOT_NODES) {
                out.push({ nodeId, pool: lootCachePool(nodeId, COAST_LOOT_CACHES[BW_LOOT_NODES[nodeId]!]!) });
            } else {
                const foe = BW_ENCOUNTER_FOES[nodeId];
                if (!foe) throw new Error(`breakwater: ${nodeId} has no authored event kind or foe.`);
                out.push({ nodeId, pool: cwEncounterPool(nodeId, foe) });
            }
        }
        return out;
    })();

// ─── The Charcoal Wood (Act 1, map 2) ────────────────────────────────────────
//
// The Charcoal Wood uses the shared builders (gathering, hazard and loot, the
// caverns' camp), the northern forest's roster and its three materials. It
// adds no enemy, NPC, item or event kind of its own; the one-line
// descriptions and the two arrival lines sit on the plate's landmarks (see
// `Continents/Coastal-Village/charcoal-wood.ts`).
//
// Kind spread over 20 nodes: 7 encounter, 3 rest, 3 loot-cache,
// 3 gathering, 1 hazard, 1 blacksmith (the Anvil, cw-18), 1 arrival
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
interface ActOneFoe { slug: EnemySlug; level: number; description?: string; isBoss?: boolean; eliteRelicDrops?: string[] }

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

function cwEncounterPool(nodeId: string, foe: ActOneFoe): MapEventPool {
    return {
        id: `${nodeId}.encounter`,
        entries: [{
            kind: 'encounter', weight: 1,
            payload: {
                kind: 'encounter', enemySlug: foe.slug, isBoss: foe.isBoss ?? false, level: foe.level, description: foe.description,
                ...(foe.eliteRelicDrops ? { eliteRelicDrops: [...foe.eliteRelicDrops] } : {}),
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
    'cw-12': { slug: 'green-jelly', level: CW_FIGHT_LEVEL_LATE },
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

/** The wood's three materials. */
const CW_GATHER_NODES: Record<string, { mat: { id: string; name: string; description: string }; description: string }> = {
    'cw-4':  {
        mat: { id: 'dark-berries', name: 'Dark Berries', description: 'Plump and sweet, with a hint of bitterness.' },
        description: 'Bramble has taken the millrace. The berries on it are black, and free.',
    },
    'cw-8':  {
        mat: { id: 'moonbell-petals', name: 'Moonbell Petals', description: 'Silvery petals that glow with their own light.' },
        description: 'Moonbells grow in the great tree\'s shadow. Nobody has priced them yet.',
    },
    'cw-14': {
        mat: { id: 'oak-branch', name: 'Oak Branch', description: 'Sturdy, fresh-fallen.' },
        description: 'Oak waits by the mounds for the fire. The burners count the logs, not the branches.',
    },
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
            destinationContinent: 'northern-continent',
            destinationMap: 'beacon-crags',
            description: 'A stair cut down into the cliff. It runs under the hills and comes up, a long way on, on a mountain road.',
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
                out.push({ nodeId, pool: blacksmithPool(nodeId, ANVIL_LINE) });
            } else if (CW_CAMP_NODES[nodeId]) {
                out.push({ nodeId, pool: campRestPool(nodeId, CW_CAMP_NODES[nodeId]!) });
            } else if (CW_GATHER_NODES[nodeId]) {
                const g = CW_GATHER_NODES[nodeId]!;
                out.push({ nodeId, pool: gatheringPool(nodeId, g.mat, g.description) });
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
// The mountains use the caverns' roster, its iron, and its camp, hazard and
// loot builders. They add no enemy, NPC, item or event kind of their own; the
// one-line descriptions and the two arrival lines sit on the plate's landmarks (see
// `Continents/Northern-Continent/beacon-crags.ts`).
//
// Kind spread over 17 nodes: 6 encounter, 3 rest, 2 loot-cache, 1 gathering,
// 2 hazard, 1 blacksmith (the Anvil, bc-12), 1 arrival cutscene, 1 travel.
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
    'bc-8':  { slug: 'green-jelly', level: BC_FIGHT_LEVEL_EARLY },
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

/** The caverns' one material (`ironVeinPool`). */
const BC_GATHER_NODES: Record<string, string> = {
    'bc-7':  'The delvers left ore in the spoil heap. Nobody weighs the tailings.',
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
            destinationContinent: 'northern-continent',
            destinationMap: 'lantern-deep',
            description: 'A stair goes down under the shrine, into the ice, and on below it. Someone has hung a lantern on every turn.',
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
                out.push({ nodeId, pool: blacksmithPool(nodeId, ANVIL_LINE) });
            } else if (BC_CAMP_NODES[nodeId]) {
                out.push({ nodeId, pool: campRestPool(nodeId, BC_CAMP_NODES[nodeId]!) });
            } else if (BC_GATHER_NODES[nodeId]) {
                out.push({ nodeId, pool: ironVeinPool(nodeId, BC_GATHER_NODES[nodeId]!) });
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
// The underworld uses the caverns like the Beacon Crags do: the roster, the
// iron, and the camp, hazard and loot builders. It adds no enemy, NPC, item or
// event kind of its own; the one-line descriptions and the two arrival lines
// sit on the plate's landmarks (see
// `Continents/Northern-Continent/lantern-deep.ts`).
//
// Kind spread over 18 nodes: 7 encounter, 3 rest, 1 loot-cache, 1 gathering,
// 2 hazard, 1 blacksmith (the Anvil, ld-14), 1 arrival cutscene, 2 sealed
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
    'ld-8':  { slug: 'green-jelly', level: LD_FIGHT_LEVEL_EARLY },
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

/** The caverns' one material (`ironVeinPool`). */
const LD_GATHER_NODES: Record<string, string> = {
    'ld-7':  'Iron runs through the crystal. Up top the crystal is worth nothing. The iron is worth something.',
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
                out.push({ nodeId, pool: blacksmithPool(nodeId, ANVIL_LINE) });
            } else if (LD_CAMP_NODES[nodeId]) {
                out.push({ nodeId, pool: campRestPool(nodeId, LD_CAMP_NODES[nodeId]!) });
            } else if (LD_GATHER_NODES[nodeId]) {
                out.push({ nodeId, pool: ironVeinPool(nodeId, LD_GATHER_NODES[nodeId]!) });
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
    for (const { nodeId, pool } of BREAKWATER_POOLS) {
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

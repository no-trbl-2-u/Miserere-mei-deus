/**
 * The rebuilt Breakwater's 44 event pools (phase BW1a), one per node, each its
 * board kind (`braindump/2026-10-28-breakwater-chapter-1-map.md`, "The node
 * list"), and `registerBreakwaterChapter()`, which puts the new map, its pools
 * and its quest chain in the registries.
 *
 * TESTS ONLY until BW1b: nothing imports this file on load, so the live
 * Breakwater (`breakwater.ts`, `content.ts`) is what the game plays. The
 * register call replaces the registry's `breakwater` entry with the new map
 * (vitest isolates each file, so the swap stays in the test that made it).
 *
 * Placeholders (Decision 5 of the brief): fights are today's Act 1 foes at
 * today's pinned levels (the Float-Eye at each fight, the Green Jelly at each
 * elite, the Death Beholder as the chapter boss at the door fight's level);
 * hazards are the shared damage hazard; rests, loot caches, villages and
 * cutscenes come from the shared builders. Every new line is `[content]`.
 */

import type { MapEventPool, MapEventPayload } from './types';
import { registerMapEventPool, setNodeEventPoolOverride } from './resolve-map-event';
import {
    BW_DOOR_LEVEL, BW_ELITE_LEVEL, BW_FIGHT_LEVEL, COAST_LOOT_CACHES,
    campRestPool, cwEncounterPool, hazardPool, lootCachePool, villagePool,
} from './content';
import { MAP_REGISTRY } from '../map.registry';
import { registerQuestline } from '../questline';
import { breakwaterChapter } from '../Continents/Coastal-Village/breakwater-chapter';
import { BREAKWATER_CHAPTER_QUESTLINE, BREAKWATER_CHAPTER_QUESTLINE_ID } from '../breakwater-chapter.questline';

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

const ANVIL_LINE = 'A lean-to forge, coals still breathing. The smith looks up from the anvil and nods at your dice.';

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

function single(nodeId: string, payload: MapEventPayload): MapEventPool {
    return { id: `${nodeId}.${payload.kind}`, entries: [{ kind: payload.kind, weight: 1, payload }] };
}

/** The pool for one node of the new map, by its board kind. */
function poolFor(nodeId: string): MapEventPool {
    const { kind, place } = BREAKWATER_CHAPTER_KINDS[nodeId]!;
    switch (kind) {
        case 'start':    return single(nodeId, windmillArrival);
        case 'fight':    return cwEncounterPool(nodeId, { slug: 'float-eye', level: BW_FIGHT_LEVEL });
        case 'elite':    return cwEncounterPool(nodeId, { slug: 'green-jelly', level: BW_ELITE_LEVEL });
        case 'boss':     return cwEncounterPool(nodeId, { slug: 'death-beholder', level: BW_DOOR_LEVEL, isBoss: true });
        case 'hazard':   return hazardPool(nodeId, `[content] ${place}.`);
        case 'rest':     return campRestPool(nodeId, `[content] ${place}.`);
        case 'loot':     return lootCachePool(nodeId, COAST_LOOT_CACHES[LOOT_NODES[nodeId]!]!);
        case 'village':  return villagePool(nodeId, place, ANVIL_LINE);
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

/**
 * Registers the rebuilt Breakwater in place of the live one: the map
 * definition under `coastal-continent/breakwater`, its 44 pools and its quest
 * chain. Tests only until BW1b. Call it once per test file (a second call
 * re-registers each node override, which the shadowing guard counts).
 */
export function registerBreakwaterChapter(): void {
    MAP_REGISTRY['coastal-continent'].breakwater = breakwaterChapter;
    for (const { nodeId, pool } of BREAKWATER_CHAPTER_POOLS) {
        registerMapEventPool(pool);
        setNodeEventPoolOverride('coastal-continent', 'breakwater', nodeId, pool.id);
    }
    registerQuestline(BREAKWATER_CHAPTER_QUESTLINE);
}

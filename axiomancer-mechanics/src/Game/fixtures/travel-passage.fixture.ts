/**
 * Test-only: a small map with one same-map travel pair (phase NK1d), the
 * shape the rebuilt Breakwater's sea cave takes (its mouth and its face lead
 * to each other).
 *
 *   start ── trail ── mouth  ~~~~~  face ── ledge ── nook
 *     │                (travel)  (travel)
 *     └── ward ~~~> face          (shut until trail is spent)
 *
 * `~~~` is a passage, not a road: `mouth` and `face` name each other as their
 * destination, and nothing joins the two halves of the map by road. `ward`
 * also leads to `face`, but only once `trail` is spent (`opensAfter`). Copy is
 * placeholder (`[content]`). Registered only by the tests that call
 * `registerTravelPassageFixture` (vitest isolates each file; the mobile
 * suites register it per file too); the shipped registry never holds it.
 */

import type { MapDefinition, MapNode } from '../../World/types';
import type { MapName } from '../../World/map.library';
import type { MapEventPayload } from '../../World/MapEvents/types';
import { MAP_REGISTRY } from '../../World/map.registry';
import { registerMapEventPool, setNodeEventPoolOverride } from '../../World/MapEvents/resolve-map-event';

export const PASSAGE_CONTINENT = 'coastal-continent' as const;
export const PASSAGE_MAP = 'nk1d-passage' as MapName;

const NODES: MapNode[] = [
    { id: 'start', location: [0, 0], connectedNodes: ['trail', 'ward'] },
    { id: 'trail', location: [1, 0], connectedNodes: ['mouth'] },
    { id: 'mouth', location: [2, 0], connectedNodes: [] },
    { id: 'ward',  location: [1, 1], connectedNodes: [] },
    { id: 'face',  location: [4, 0], connectedNodes: ['ledge'] },
    { id: 'ledge', location: [5, 0], connectedNodes: ['nook'] },
    { id: 'nook',  location: [6, 0], connectedNodes: [] },
];

/** The map's definition: two halves no road joins. */
export const PASSAGE_DEF: MapDefinition = {
    name: PASSAGE_MAP,
    continent: PASSAGE_CONTINENT,
    description: '[content] The passage fixture map.',
    startingNode: NODES[0]!,
    nodes: NODES,
};

/** Each node's one event; `start`, `trail` and `nook` have none. */
export const PASSAGE_POOLS: Readonly<Record<string, MapEventPayload>> = {
    mouth: { kind: 'travel', destination: { node: 'face' }, prompt: '[content] The cave runs back under the cliff.' },
    face:  { kind: 'travel', destination: { node: 'mouth' }, prompt: '[content] The cave runs back toward the sea.', art: 'cutscene' },
    ward:  { kind: 'travel', destination: { node: 'face' }, prompt: '[content] A crack in the rock.', opensAfter: 'trail' },
    ledge: { kind: 'hazard', damage: 1, description: '[content] A loose ledge.' },
};

/** Registers the map and its pools. Idempotent. */
export function registerTravelPassageFixture(): void {
    MAP_REGISTRY[PASSAGE_CONTINENT][PASSAGE_MAP] = PASSAGE_DEF;
    for (const [nodeId, payload] of Object.entries(PASSAGE_POOLS)) {
        const id = `${PASSAGE_MAP}.${nodeId}`;
        registerMapEventPool({ id, entries: [{ kind: payload.kind, weight: 1, payload }] });
        setNodeEventPoolOverride(PASSAGE_CONTINENT, PASSAGE_MAP, nodeId, id);
    }
}

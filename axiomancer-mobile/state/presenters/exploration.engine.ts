/**
 * Screen-level presenter for `app/(tabs)/exploration/index.tsx`.
 *
 * Drives the exploration view-model from `state.world`. Node
 * positions, labels, types, and connectivity live in a per-map fixture
 * (`app/(tabs)/exploration/maps/<map-id>.layout.ts`, Q1=A); engine state
 * supplies the completed / available / locked buckets and the
 * presenter-tracked `currentNodeId`. Tapping a locked node is a no-op
 * (Q5=B) — the screen renders locked nodes desaturated to convey state.
 */

import type { GameStore, MapEventKind } from '@mechanics';
import { getMapDefinition, getNodePrimaryEventKind, getNodeEventPool, legalMovesFrom, forwardEdges, ANVIL_VERB_PRICING } from '@mechanics';

import { readCurrentNodeId } from '../actions';
import { getMapLayout } from '@/state/exploration-maps';
import type { MapSheet } from '@/state/exploration-maps';
import { FALLBACK_SHEET, LEGACY_SHEET_SIZE } from '@/state/exploration-maps/sheet';
import { freezeViewModel } from './freeze';
import { anvilShortLine, nodePurseLine } from './node-confirm.copy';

export type NodeKind = 'completed' | 'current' | 'available' | 'locked';
export type NodeType =
    | 'rest'
    | 'waypoint'
    | 'current'
    | 'encounter'
    | 'treasure'
    | 'boss'
    | 'quest'
    | 'story'
    | 'hazard'
    | 'blacksmith'
    | 'village'
    | 'door';

export interface ExplorationNode {
    /** Stable engine node ID. */
    id: string;
    /** Position on the map's sheet (`ExplorationViewModel.sheet`), in sheet units. */
    x: number;
    y: number;
    kind: NodeKind;
    label: string;
    type: NodeType;
    /** True when tapping the node should trigger combat. */
    triggersCombat: boolean;
    /**
     * For a locked node shut behind a BLOCKED ROAD from where the player has
     * been (a questline's lock on its next quest node), the road's one-line
     * reason; the tap on it says this instead of the bare "sealed". Absent
     * or null otherwise.
     */
    blockedReason?: string | null;
}

export interface ExplorationEdge {
    fromId: string;
    toId: string;
    /** True when the player has already traversed this edge. */
    traveled: boolean;
    /** True when either endpoint is locked. */
    locked: boolean;
    /**
     * True for a LATERAL LANE RIB — an edge that steps sideways between
     * two lanes of the same column instead of one column forward.
     *
     * The engine draws the distinction itself (`forwardEdges()` in
     * `world.reducer.ts`, which is what its own route audits walk), so the
     * presenter reads it rather than re-deriving it from coordinates. The
     * canvas draws ribs lighter than the forward roads so the progression
     * spine stays findable and the ribs read as "you may also step sideways
     * here".
     */
    lateral: boolean;
    /**
     * True when the road itself is blocked (`MapState.blockedRoutes`): a
     * questline's lock on its next quest node, opened when the step fills.
     * The canvas draws it closed (dotted), apart from a road that is merely
     * not reached yet.
     */
    blocked?: boolean;
}

export interface ExplorationAction {
    /** Stable action key (snake_case engine name). */
    key: string;
    /** Display label, may contain `\n` for two-line cards. */
    label: string;
    /** Icon key the screen maps to an `ActionIcon` kind. */
    iconKey: string;
    /** Sub-label tag (`'TRAVEL · 1 TURN'`). */
    tag: string;
    selected: boolean;
}

/**
 * League indicator for the WHITHER, PILGRIM? step-cards — three buckets
 * (I = closest, II = middle, III = farthest). Pure presenter derivation
 * from Euclidean distance between the current node and the option node
 * on the map's sheet, normalised to `LEGACY_SHEET_SIZE` units. Every
 * step-card carries a `leagues` glyph on its right.
 */
export type LeagueBucket = 'I' | 'II' | 'III';

export interface ExplorationOption {
    /** Engine node id the option moves the player to. */
    nodeId: string;
    label: string;
    type: NodeType;
    /** Thematic blurb sourced from the layout fixture. */
    description: string;
    /** Distance indicator for the step-card right column. */
    leagues: LeagueBucket;
    /** The player's shillings, for the node kinds that can charge them (rest,
     *  the anvil, the village); null elsewhere. */
    purse: number | null;
    /** The anvil's cheapest work in shillings (`ANVIL_VERB_PRICING.hone`);
     *  null on every other kind. */
    cheapestWork: number | null;
}

/** The node kinds whose confirm panel shows the purse: the ones that can charge. */
const PURSE_NODE_TYPES: ReadonlySet<NodeType> = new Set<NodeType>(['rest', 'blacksmith', 'village']);

/** An option's purse fields for a node of `type`, given the player's shillings. */
export function purseFieldsFor(type: NodeType, currency: number): Pick<ExplorationOption, 'purse' | 'cheapestWork'> {
    return {
        purse: PURSE_NODE_TYPES.has(type) ? currency : null,
        cheapestWork: type === 'blacksmith' ? ANVIL_VERB_PRICING.hone : null,
    };
}

export interface ExplorationViewModel {
    continent: string;
    region: string;
    /** Localised "Map ii of vii" string. */
    regionProgress: string;
    /** The sheet the map is drawn on: canvas size, scale and plate. */
    sheet: MapSheet;
    /** Engine map id (used to drive map transitions). */
    mapId: string;
    /** Engine node id of the player's current location. */
    currentNodeId: string;
    /**
     * True while the map's STARTING node still has an unresolved event.
     *
     * The ONE placement the game deliberately treats as an arrival. Events
     * fire on arrival, and the player never arrives at the node they are
     * placed on, so without this the start node's pool would be unreachable.
     * The exploration screen pays this on entry, as the CLI's
     * `--resolve-start` does
     * (`state/e2e/start-node-arrival.engine.test.tsx`).
     *
     * It is deliberately NOT the same sentence as `arrivalPending`: this one
     * is derived from the map's shape (you are on the start node, it carries
     * unconsumed content), because a placement leaves no record of itself.
     */
    startNodePending: boolean;
    /**
     * True while the node the player WALKED ONTO still owes them its arrival
     * event.
     *
     * Events fire on ARRIVAL, but a move checkpoints before the arrival
     * resolves: `moveToAction` saves, and only then does the screen call
     * `resolveCurrentMapEvent`. A player who reloads in between must still be
     * owed the arrival, or an encounter node's fight is silently skipped.
     *
     * This reads the engine's own record of the debt — `pendingArrival`,
     * written by the arrival verb and cleared by `resolveMapEvent` — rather
     * than inferring it from an unconsumed node, because BEING PLACED ON A
     * NODE IS NOT ARRIVING AT IT and only the record can tell the two apart.
     * `placeOnNode` (state fixtures, `/dev` JUMP) even un-consumes the node
     * it places you on, so an inference would read every placement as an
     * unanswered arrival and fire it on mount. The record rides the save, so
     * the debt is legible off the bytes on disk.
     */
    arrivalPending: boolean;
    /**
     * True when the node under the player is unspent and its arrival is
     * answered: a fled or lost fight, or a quest node whose step was not
     * accepted. Tapping it tries it again (the engine's `moveToNode` onto the
     * node the player stands on re-owes its arrival).
     */
    retryable: boolean;
    nodes: readonly ExplorationNode[];
    edges: readonly ExplorationEdge[];
    actions: readonly ExplorationAction[];
    /** Next-step picker shown beneath the map (Q6). */
    options: readonly ExplorationOption[];
    /**
     * Drawer-strip copy. Lowercase ritual register where narrative;
     * uppercase chrome where chrome. The screen renders every field
     * verbatim so view-layer code carries no display literals
     * (Hard Rule #8). `emptyMessage` shows when `options` is empty;
     * `title` is the section eyebrow above the step-card list;
     * `leaguesLabel` is the right-column header on each step-card.
     */
    drawerCopy: {
        emptyMessage: string;
        title: string;
        leaguesLabel: string;
    };
    /** Optional event callout banner; `null` when no callout. */
    eventCallout: { title: string; iconKey: string } | null;
    /** Legend bottom strip — pre-formatted display strings. */
    legend: { left: string; right: string };
}

// Exploration step-card icons. `encounter` uses `'sword'` (the combat tab's
// ATTACK icon), not the FLEE glyph, so the card reads "this starts combat".
// Exported so the map nodes can render the same kind-icon the option cards use,
// giving adjacent nodes an at-a-glance "what is this" glyph. Boss uses a
// distinct `crown` (not the encounter `sword`) so the climax is signposted.
export const ACTION_ICON_BY_TYPE: Record<NodeType, string> = {
    // Every node kind wears its own woodcut: campfire for rest, the winged
    // foot for an empty waypoint (walk on through), falling rocks for hazard.
    rest: 'rest',
    waypoint: 'flee',
    current: 'eye',
    encounter: 'sword',
    // Treasure reads as a chest, not a scroll (the scroll is the
    // quest/document mark), and a boss node wears the crowned skull rather
    // than the plain crown (the crown is the SELF mark).
    treasure: 'chest',
    boss: 'boss',
    quest: 'scroll',
    // The story kind (cutscene) wears the quill.
    story: 'quill',
    hazard: 'hazard',
    blacksmith: 'anvil',
    village: 'village',
    // No door glyph exists yet; the scroll stands in until the art does.
    door: 'scroll',
};

const ACTION_TAG_BY_TYPE: Record<NodeType, string> = {
    rest: 'HEAL · COSTLY',
    waypoint: 'WAYPOINT · PASS ON',
    current: 'YOU ARE HERE',
    encounter: 'TRAVEL · 1 TURN',
    treasure: 'CARD · MIND',
    boss: 'TRAVEL · BOSS',
    quest: 'LORE',
    story: 'LORE',
    hazard: 'PERIL · BRAVE IT',
    blacksmith: 'FORGE · DIE GEAR',
    village: 'HAVEN · TRADE',
    door: 'LEAVE · NEXT MAP',
};

/**
 * The word a node's kind goes by on the map: the selection panel's tag and
 * the node's accessibility label. A door reads as the way out, not a quest,
 * and the Anvil carries the name its own screen uses.
 */
export const NODE_KIND_LABEL: Record<NodeType, string> = {
    encounter: 'BATTLE',
    boss: 'BOSS · BATTLE',
    quest: 'QUEST',
    story: 'STORY',
    rest: 'REST',
    waypoint: 'WAYPOINT',
    treasure: 'TREASURE',
    hazard: 'HAZARD',
    blacksmith: 'THE ANVIL',
    village: 'VILLAGE',
    door: 'PATH ONWARD',
    current: 'HERE',
};

const ENCOUNTER_NODE_TYPES = new Set<NodeType>(['encounter', 'boss']);

// Maps the engine's authored MapEvent kind to a display NodeType (icon).
// The engine owns which kind fires at each node; mobile only chooses the
// glyph. `encounter` is promoted to `boss` when the node's pool is a boss
// fight (see `engineNodeType`). Kinds with no bespoke glyph (cutscene,
// travel, labyrinth) borrow the narrative icon. A node with no pool is the
// empty waypoint, which is no kind at all (see `engineNodeType`).
const KIND_TO_NODE_TYPE: Record<MapEventKind, NodeType> = {
    encounter: 'encounter',
    rest: 'rest',
    'loot-cache': 'treasure',
    hazard: 'hazard',
    // Village and blacksmith wear their own woodcuts (huts and anvil).
    village: 'village',
    cutscene: 'story',
    blacksmith: 'blacksmith',
    // Inter-map travel doors.
    travel: 'door',
    // The Labyrinth door (the Lantern Deep's vault door), a door like travel.
    labyrinth: 'door',
    // The questline's giver wears the scroll and QUEST; the story kind above
    // wears the quill and STORY. The map shows no step state (the quest screen
    // alone carries progress).
    quest: 'quest',
};

/** Node display type, sourced from the engine's authored event pools. */
function engineNodeType(continent: string, mapName: string, nodeId: string): NodeType {
    const kind = getNodePrimaryEventKind(continent, mapName, nodeId);
    // No pool: the empty waypoint, its own look, never drawn as a fight.
    if (!kind) return 'waypoint';
    if (kind === 'encounter') {
        const pool = getNodeEventPool(continent, mapName, nodeId);
        const isBoss = pool?.entries.some(
            (e) => e.kind === 'encounter' && (e.payload as { isBoss?: boolean }).isBoss === true,
        );
        return isBoss ? 'boss' : 'encounter';
    }
    return KIND_TO_NODE_TYPE[kind];
}

/**
 * `available` here means REACHABLE RIGHT NOW — the engine's
 * `legalMovesFrom`, not the map's cumulative `availableNodes` unlock set.
 *
 * `availableNodes` accumulates every node ever unlocked, including nodes
 * `moveToNode` would refuse as non-adjacent. A node you have seen but cannot
 * walk to from where you stand reads as 'locked' — which is exactly what the
 * gauntlet's no-back-travel rule makes it.
 *
 * ── SPENT IS NOT SEALED ──
 *
 * `spent` is the set the engine calls `isNodeSpent()`:
 * `completedNodes ∪ consumedNodes`. Those two lists are written by DIFFERENT
 * verbs — `completeNode` and `markNodeConsumed` — and neither implies the
 * other, so a node answered through the consume path lands in one list and
 * not the other.
 *
 * The frontier excludes every spent node from `legalMovesFrom`, so testing
 * `completedNodes` alone would drop a consumed-but-not-completed node through
 * to `locked` — drawn SEALED when the player has walked it and answered it.
 * Any spent node is TRODDEN.
 *
 * The spent set is passed in (rather than recomputed here) so the ONE place
 * that decides what "resolved" means stays `world.reducer.ts` — see the call
 * site, which reads both engine lists and never redefines their union.
 */
function classifyNode(
    nodeId: string,
    currentNodeId: string,
    spent: ReadonlySet<string>,
    reachable: readonly string[],
): NodeKind {
    if (nodeId === currentNodeId) return 'current';
    if (spent.has(nodeId)) return 'completed';
    if (reachable.includes(nodeId)) return 'available';
    return 'locked';
}

/** Resolved per-node display metadata (position + copy + engine-sourced kind). */
interface ResolvedNodeMeta {
    x: number;
    y: number;
    label: string;
    description: string;
    type: NodeType;
}

// Edges come from the ENGINE graph (`getMapDefinition().nodes[].connectedNodes`).
//
// Lateral lane ribs are authored BOTH WAYS, so the same pair appears
// twice in `connectedNodes`; the `seen` key is order-insensitive precisely so
// one line is drawn per pair rather than two stacked on each other.
//
// `forward` is the engine's own forward-skeleton adjacency
// (`forwardEdges(def)`), passed in by the caller. An edge is a RIB exactly
// when neither endpoint lists the other as a forward neighbour — the same
// test the engine's route audits use, asked once here instead of being
// re-derived from `location[0]` in the presenter.
function buildEdges(
    nodes: readonly { id: string; connectedNodes: readonly string[] }[],
    forward: ReadonlyMap<string, readonly string[]>,
    spent: ReadonlySet<string>,
    locked: readonly string[],
    blockedReason: (a: string, b: string) => string | null,
): ExplorationEdge[] {
    const edges: ExplorationEdge[] = [];
    const seen = new Set<string>();
    const isForward = (a: string, b: string): boolean =>
        (forward.get(a) ?? []).includes(b) || (forward.get(b) ?? []).includes(a);
    for (const node of nodes) {
        for (const target of node.connectedNodes) {
            const key = node.id < target ? `${node.id}|${target}` : `${target}|${node.id}`;
            if (seen.has(key)) continue;
            seen.add(key);
            // A road reads as TRAVELLED once both its ends are spent, not
            // merely in `completedNodes` (see `classifyNode`: the two lists
            // diverge, and reading only one draws roads between walked nodes
            // as untrodden).
            const traveled = spent.has(node.id) && spent.has(target);
            const isLocked = locked.includes(node.id) || locked.includes(target);
            edges.push({
                fromId: node.id,
                toId: target,
                traveled,
                locked: isLocked,
                lateral: !isForward(node.id, target),
                blocked: blockedReason(node.id, target) !== null,
            });
        }
    }
    return edges;
}

/**
 * Bucket an Euclidean distance (in `LEGACY_SHEET_SIZE` units — callers
 * normalise other sheets first, see `buildOptions`) into a
 * three-band league indicator. Cutoffs are calibrated against the
 * canonical layout fixtures — most "next step" hops sit in the 40-140
 * range, so 80 / 160 gives a roughly even three-way split across the
 * shipped maps. Pure function; tested in
 * `state/e2e/exploration.engine.test.ts`.
 */
function leaguesFromDistance(d: number): LeagueBucket {
    if (d <= 80) return 'I';
    if (d <= 160) return 'II';
    return 'III';
}

function buildOptions(
    metaById: ReadonlyMap<string, ResolvedNodeMeta>,
    orderById: ReadonlyMap<string, number>,
    reachable: readonly string[],
    currentNodeId: string,
    sheet: MapSheet,
    currency: number,
): ExplorationOption[] {
    // Leagues are calibrated on `LEGACY_SHEET_SIZE`. Measure in rendered
    // device px, then express that in its units, so the same on-screen hop
    // reads the same league on any sheet (sheets differ per map).
    const toLegacyUnits = sheet.scale / LEGACY_SHEET_SIZE.scale;
    const current = metaById.get(currentNodeId) ?? null;
    return reachable
        // Don't offer the node the player is standing on (reusable encounter
        // nodes stay in `availableNodes`, but you're already there).
        .filter((id) => id !== currentNodeId && metaById.has(id))
        .sort((a, b) => (orderById.get(a) ?? 0) - (orderById.get(b) ?? 0))
        .map((id) => {
            const n = metaById.get(id)!;
            const distance =
                current === null ? 0 : Math.hypot(n.x - current.x, n.y - current.y) * toLegacyUnits;
            return {
                nodeId: id,
                label: n.label,
                type: n.type,
                description: n.description,
                leagues: leaguesFromDistance(distance),
                ...purseFieldsFor(n.type, currency),
            };
        });
}

/**
 * The selected option's purse line for the node panel, or null when the
 * node's kind charges nothing. `short` is set only at the anvil, when the
 * purse is below its cheapest work.
 */
export function nodePurseLines(option: ExplorationOption): { purse: string; short: string | null } | null {
    if (option.purse === null) return null;
    const short =
        option.cheapestWork !== null && option.purse < option.cheapestWork
            ? anvilShortLine(option.cheapestWork)
            : null;
    return { purse: nodePurseLine(option.purse), short };
}

function buildActions(options: readonly ExplorationOption[]): ExplorationAction[] {
    return options.map((opt, i) => ({
        key: `move-${opt.nodeId}`,
        label: opt.label,
        iconKey: ACTION_ICON_BY_TYPE[opt.type],
        tag: ACTION_TAG_BY_TYPE[opt.type],
        selected: i === 0,
    }));
}

/**
 * The three map-node states, as the legend strip names them.
 *
 * The glyphs are not decoration: they are the legend's half of the
 * colour-blind contract that `components/NodeMark.tsx` draws the other half
 * of. Each one is a picture of how much of the disc its state fills, so the
 * key teaches the same distinction the chart makes:
 *
 *   ● TRODDEN — a SOLID mass. Answered; it yields nothing more.
 *   ◉ OPEN    — a ring around a lit core. The frontier: walk here.
 *   ◌ SEALED  — an EMPTY broken ring. Shut to you.
 *
 * A sealed node recedes rather than shouting: it is most of the chart and
 * means "nothing for you here".
 *
 * SEALED, not SHUT — one word for the state across the
 * legend, the counter beside it, the node tap-tip, and every locked node's
 * accessible name.
 */
export const MAP_LEGEND_KEYS = [
    { glyph: '\u25CF', label: 'TRODDEN' },
    { glyph: '\u25C9', label: 'OPEN' },
    { glyph: '\u25CC', label: 'SEALED' },
] as const;

/** The legend strip's left half, built from `MAP_LEGEND_KEYS` so the two cannot drift. */
export const MAP_LEGEND_LEFT: string = MAP_LEGEND_KEYS
    .map((k) => `${k.glyph} ${k.label}`)
    .join('   ');

/** How the player moves the chart: a finger (native, phone browsers) or a mouse. */
export type MapPointer = 'touch' | 'mouse';

/**
 * The chart's gesture line, by pointer. A mouse has no pinch: on web the
 * wheel zooms, anchored at the cursor (`<MapCanvas>`), so a desktop player
 * is told to scroll instead (critique pass 91).
 */
export const MAP_GESTURE_LINE: Readonly<Record<MapPointer, string>> = Object.freeze({
    touch: 'drag · pinch',
    mouse: 'drag · scroll to zoom',
});

const DRAWER_COPY = {
    emptyMessage: 'every path beside trodden ground stays open — choose a glowing node to travel.',
    title: '✠ WHITHER, PILGRIM?',
    leaguesLabel: 'LEAGUES',
} as const;

const FALLBACK_VM: ExplorationViewModel = {
    continent: 'CONTINENT · UNKNOWN',
    region: '—',
    regionProgress: '',
    sheet: FALLBACK_SHEET,
    mapId: '',
    currentNodeId: '',
    startNodePending: false,
    arrivalPending: false,
    retryable: false,
    nodes: [],
    edges: [],
    actions: [],
    options: [],
    drawerCopy: DRAWER_COPY,
    eventCallout: null,
    legend: { left: MAP_LEGEND_LEFT, right: '' },
};

// Referential-stability memo (1-entry, keyed by the `world` slice this
// selector reads). `useGameState` subscribes via Zustand `useStore`, whose
// `getSnapshot` is the bare selector call — React's `useSyncExternalStore`
// then requires it to return a STABLE reference for unchanged state, or it
// loops ("getSnapshot should be cached → Maximum update depth exceeded").
// The other presenters dodge this by returning frozen singletons; this one
// builds a fresh frozen VM, so we cache it against the immutable `world`
// reference (Zustand replaces it only when the world actually changes).
// The purse on the node options is the one read outside `world`, so the
// shilling count is part of the key.
let _expWorldRef: unknown;
let _expCurrency: number | undefined;
let _expVm: ExplorationViewModel | null = null;

function readCurrency(state: GameStore): number {
    return Number(state.player?.currency ?? 0);
}

export function selectExplorationViewModel(state: GameStore): ExplorationViewModel {
    const currency = readCurrency(state);
    if (state.world === _expWorldRef && currency === _expCurrency && _expVm !== null) return _expVm;
    const vm = computeExplorationViewModel(state);
    _expWorldRef = state.world;
    _expCurrency = currency;
    _expVm = vm;
    return vm;
}

function computeExplorationViewModel(state: GameStore): ExplorationViewModel {
    // Engine `GameStore = GameState & GameActions`; `GameState.world:
    // WorldState` is typed, so no cast is needed.
    const world = state.world;
    if (!world || !world.currentMap || !world.currentContinent) {
        return freezeViewModel(FALLBACK_VM);
    }

    const layout = getMapLayout(world.currentMap.name);
    if (layout === null) {
        return freezeViewModel({
            ...FALLBACK_VM,
            continent: `CONTINENT · ${String(world.currentContinent.name).toUpperCase()}`,
            region: world.currentMap.name,
            mapId: world.currentMap.name,
            currentNodeId: readCurrentNodeId(world),
        });
    }

    // The node GRAPH (ids + edges) is the engine's; the mobile layout supplies
    // only pixel positions + display copy. Resolve the engine map definition.
    const continent = world.currentMap.continent;
    const mapName = world.currentMap.name;
    let def: ReturnType<typeof getMapDefinition> | null = null;
    try {
        def = getMapDefinition(continent, mapName);
    } catch {
        def = null;
    }
    if (def === null) {
        return freezeViewModel({
            ...FALLBACK_VM,
            continent: layout.continent,
            region: layout.region,
            sheet: layout.sheet,
            mapId: mapName,
            currentNodeId: readCurrentNodeId(world),
            startNodePending: false,
            arrivalPending: false,
            retryable: false,
        });
    }

    const completed = world.currentMap.completedNodes as readonly string[];
    const consumedNodes = (world.currentMap.consumedNodes ?? []) as readonly string[];
    const locked = world.currentMap.lockedNodes as readonly string[];
    const currentNodeId = readCurrentNodeId(world);
    // The engine owns "where can I go from here" (see `classifyNode`).
    const reachable: readonly string[] = legalMovesFrom(world.currentMap);
    // The SPENT set — `isNodeSpent()`'s union, read off the two lists the
    // save actually carries. The engine's own predicate takes a `MapState`
    // one node at a time; over ~28 nodes per map that is 28 map-definition
    // lookups per render, so the union is materialised once here against the
    // same two lists `isNodeSpent` reads and never against a third rule.
    const spent: ReadonlySet<string> = new Set<string>([...completed, ...consumedNodes]);
    // The engine's forward skeleton — what separates a progression road from
    // a lateral rib on the canvas. Definition-only, so it is stable for
    // the life of the map.
    const forward = forwardEdges(def);

    // Per-node display meta: position/label/blurb from the mobile layout (by id),
    // kind/icon from the engine's authored event pools. Nodes without an authored
    // layout entry fall back to the canvas centre + their id.
    const layoutById = new Map(layout.nodes.map((n) => [n.id, n] as const));
    const orderById = new Map(def.nodes.map((n, i) => [n.id, i] as const));
    const metaById = new Map<string, ResolvedNodeMeta>();
    for (const eng of def.nodes) {
        const lay = layoutById.get(eng.id);
        metaById.set(eng.id, {
            x: lay?.x ?? layout.sheet.width / 2,
            y: lay?.y ?? layout.sheet.height / 2,
            label: lay?.label ?? eng.id,
            description: lay?.description ?? '',
            type: engineNodeType(continent, mapName, eng.id),
        });
    }

    // A blocked road's reason, either direction (the engine's
    // `isRouteBlocked` reading of `MapState.blockedRoutes`).
    const blockedRoutes = world.currentMap.blockedRoutes ?? [];
    const blockedReason = (a: string, b: string): string | null =>
        blockedRoutes.find((r) => (r.from === a && r.to === b) || (r.from === b && r.to === a))?.reason ?? null;
    // Where the player has been: the spent nodes and the one underfoot.
    const been = (id: string): boolean => spent.has(id) || id === currentNodeId;
    const neighboursOf = (id: string): string[] => [
        ...(def.nodes.find((n) => n.id === id)?.connectedNodes ?? []),
        ...def.nodes.filter((n) => n.connectedNodes.includes(id)).map((n) => n.id),
    ];

    const nodes: ExplorationNode[] = def.nodes.map((eng) => {
        const meta = metaById.get(eng.id)!;
        const nodeKind = classifyNode(eng.id, currentNodeId, spent, reachable);
        // A locked node met across a blocked road from where the player has
        // been says why (the first such road, in map order).
        const reason = nodeKind !== 'locked' ? null
            : neighboursOf(eng.id).filter(been).map((n) => blockedReason(n, eng.id)).find((r) => r !== null) ?? null;
        return {
            id: eng.id,
            x: meta.x,
            y: meta.y,
            kind: nodeKind,
            label: meta.label,
            type: meta.type,
            triggersCombat: nodeKind === 'available' && ENCOUNTER_NODE_TYPES.has(meta.type),
            blockedReason: reason,
        };
    });

    // THE ARRIVAL THE MAP STILL OWES THE PLAYER. Two different sentences,
    // deliberately kept apart.
    //
    // `arrivalPending` is READ, not inferred: `pendingArrival` is the record
    // the arrival verb writes (`moveToNode`, and mobile's own move) and
    // `resolveMapEvent` clears the moment the arrival is answered. It rides
    // the save, so an arrival interrupted by a reload — the move checkpoints
    // BEFORE its event resolves — is still owed on the next mount instead of
    // being walked past. Travel doors need no special case here: crossing
    // answers the door even though a door is never consumed, and a reload
    // taken while standing on one still owes the crossing the player walked
    // into.
    //
    // Inferring it instead from "the node under the player is unconsumed"
    // cannot tell a walk from a placement, and `placeOnNode` un-consumes the
    // node it places you on — so every state fixture and every `/dev` JUMP
    // read as an unanswered arrival and the screen fired it on mount.
    //
    // `startNodePending` is the one placement the game treats as an arrival,
    // and it has to be derived precisely because a placement leaves no
    // record: the player is put on the start node by `createMapState`, never
    // walks onto it. Whether it is SAFE to resolve either of them right now
    // (no event or combat already owning the screen) is the screen's call,
    // not the map's — this view model is memoised on `state.world` and must
    // not read the event slice.
    //
    // The labyrinth is out of scope only because the aporia maps carry no
    // mobile layout (`state/exploration-maps`), so those states take the
    // fallback view model above. `labyrinthMove` defers the boss room's
    // arrival for the finale panel on purpose — it leaves `pendingArrival`
    // set until the finale resolves it — so registering a labyrinth layout
    // would need this read revisited first.
    const arrivalPending = (world.currentMap.pendingArrival ?? null) === currentNodeId;
    const startNodePending =
        currentNodeId === def.startingNode.id
        && !consumedNodes.includes(currentNodeId)
        && getNodeEventPool(continent, mapName, currentNodeId) !== undefined;

    const options = buildOptions(metaById, orderById, reachable, currentNodeId, layout.sheet, readCurrency(state));
    const actions = buildActions(options);
    const edges = buildEdges(def.nodes, forward, spent, locked, blockedReason);

    return freezeViewModel({
        continent: layout.continent,
        region: layout.region,
        regionProgress: layout.regionProgress,
        sheet: layout.sheet,
        mapId: mapName,
        currentNodeId,
        startNodePending,
        arrivalPending,
        retryable: !arrivalPending && !spent.has(currentNodeId) && currentNodeId !== def.startingNode.id,
        nodes,
        edges,
        actions,
        options,
        drawerCopy: DRAWER_COPY,
        eventCallout: null,
        legend: {
            // SEALED, not SHUT: the counter at the other end of this strip
            // says 'N sealed', the node tap-tip says 'This path is sealed.',
            // and every locked node's accessible name ends 'sealed'.
            left: MAP_LEGEND_LEFT,
            // Count the nodes the pips are drawn from (`classifyNode`), not
            // `world.currentMap.lockedNodes`: the two disagree (the start node
            // is never in `lockedNodes`, yet once left behind unspent it is
            // drawn sealed). A test pins this label against the pips.
            right: `${nodes.length} nodes · ${nodes.filter((n) => n.kind === 'locked').length} sealed`,
        },
    });
}

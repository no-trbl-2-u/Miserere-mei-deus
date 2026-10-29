/**
 * The Labyrinth (THE APORIA, W-01) — presenter.
 *
 * Maps engine act content + `GameState.labyrinth` progress + the
 * mobile `labyrinthUi` slice onto render-ready view-models. Pure: no
 * store writes, no rolls, no rule decisions — door visibility, gate
 * state, prices and debt all come from `@mechanics`.
 *
 * All player-facing strings live here (Hard Rule #8). Voice: the
 * Sophist per C-01 — terse, cold, old; no thee/thou; no emojis.
 *
 * Spoiler hygiene (W-01): POIs never advertise fragments, secrets, or
 * baited clues before inspection; pocket chips show word + provenance
 * only (never honest/counterfeit); gate answers and the true name are
 * never rendered from content — the UI echoes only what the player
 * assembled or typed.
 */

import {
    APORIA_ACTS,
    borrowedPremiseStacks,
    debtPoints,
    getAporiaAct,
    getRoom,
    hintPrice,
    namingForkOpen,
    preConfirmedWords,
    SETTLE_PRICE_PER_POINT,
    visibleDoors,
    walkedEdgesOf,
} from '@mechanics';
import type {
    GameState,
    LabyrinthActDef,
    LabyrinthActId,
    LabyrinthProgress,
} from '@mechanics';

import { labyrinthProgressOf } from '@/state/labyrinth/store-actions';
import type { AppStoreState } from '@/state/store';

// ---------------------------------------------------------------------------
// Copy (canon: C-01 voice; VITAE/STANCE stay inside encounters)
// ---------------------------------------------------------------------------

export const LABYRINTH_COPY = Object.freeze({
    title: 'THE APORIA',
    actSelectSub: 'A building in the shape of a country. Three acts. One descent.',
    actSelectWarning: 'Anything here may be a clue. Not every clue is honest. Neither am I.',
    enterAct: 'DESCEND',
    actDone: 'walked',
    leave: 'LEAVE',
    mapLabel: 'MAP',
    mapEmpty: 'You have walked nowhere worth drawing.',
    mapHint: 'Rooms you have walked. Directions you have walked them.',
    doorsLabel: 'DOORS',
    poisLabel: 'WHAT STANDS IN THE ROOM',
    doorSealed: 'sealed',
    doorConfirmTitle: 'Walk through?',
    doorGo: 'WALK',
    doorStay: 'STAY',
    gatedDoorLine: 'The door has no doubt. Say the road first.',
    narrationLabel: 'WHAT YOU SEE',
    riddleLabel: 'THE RIDDLE',
    pocketLabel: 'THE POCKET',
    pocketEmpty: 'Empty of words.',
    pocketSource: (display: string) => `found in ${display}`,
    hintsLabel: 'ASK THE SOPHIST',
    hintPriceSuffix: 'shillings',
    hintBroke: 'He looks at your purse and does not finish the sentence.',
    fragmentPickup: (word: string) => `You take the word: ${word}.`,
    secretReveal: (display: string) => `A door that was not there is there. It leads to ${display}.`,
    trapCombat: 'The clue was bait. Something kept it.',
    trapHazard: 'The clue was bait. The building fights you.',
    waystoneToast: 'The stone takes your hand. The house will hold your place here.',
    ejectToast: 'Up you go. "The chair fit. Remember that it fit."',
    gateLabel: 'THE GATE OF ASSENT',
    gateSubmit: 'SAY THE ROAD',
    gateClear: 'TAKE THE WORDS BACK',
    gateOpen: 'The way is open.',
    gateLedgerNote: 'Entered in the Ledger of Assertions.',
    socketEmpty: '·',
    settleLabel: 'THE FOURTH LEDGER',
    settleLine: (outstanding: number, price: number) =>
        `Debt stands at ${outstanding}. The house takes ${price} shillings a point.`,
    settleNothingOwed: 'Nothing owed. How unlike a visitor.',
    settleButton: 'SETTLE A POINT',
    settledLine: 'Paid in part, the house accepts. It knows how arguments end.',
    debtLine: (points: number, stacks: number) =>
        `Debt ${points} — Borrowed Premise x${stacks}`,
    finaleTitle: 'THE UNFOUNDED DOOR',
    finaleIntro: 'The Sophist stands between you and a doorway full of weather from somewhere else.',
    finaleStacks: (stacks: number, debt: number) =>
        `Borrowed Premise x${stacks} — your purchased certainty fights for the house. (debt ${debt})`,
    finaleNamePrompt: 'There is a third way, if you kept your receipts. Speak a name:',
    finaleNamePlaceholder: 'say it',
    finaleNameSpeak: 'SPEAK',
    finaleNameWrong: '"No. That is furniture. En garde."',
    finaleNameClosed: '"I do not take my name from that mouth." The naming is closed.',
    finaleFight: 'EN GARDE',
    bossTitle: (name: string) => name.toUpperCase(),
    bossIntro: 'A warden of the house. It has been waiting the way furniture waits.',
    bossFight: 'FACE IT',
    completeTitle: 'THE LAST CONTINENT',
    completeBody: 'The Unfounded Door was never locked. You walk through.',
    completeLastLine: '"Mind the first step. There is no first step."',
    /**
     * Screen-reader copy for the labyrinth's unadorned pressables. The act
     * cards, LEAVE and the MAP toggle carry no visual affordance a reader
     * can infer, so they name themselves here rather than in the screen (Hard Rule #8 — copy
     * lives in the presenter).
     */
    a11y: Object.freeze({
        /**
         * Spoken label for one act card on the act select.
         * Purpose: name the descent and say whether it is already walked,
         * since the card's state is carried visually by a lowercase word.
         * Input: the act's title, and whether the act is completed.
         * Output: the label string.
         */
        actOption: (title: string, completed: boolean): string =>
            completed ? `${title}. Walked. Descend again.` : `${title}. Descend.`,
        leave: 'Leave the Aporia',
        mapShow: 'Show the map of what you have walked',
        mapHide: 'Hide the map. Back to the room.',
    }),
    hintTiers: Object.freeze([
        { tier: 1 as const, label: 'A Nudge', desc: 'One true sentence, unhelpfully put.' },
        { tier: 2 as const, label: 'A Reading', desc: 'What the room actually holds.' },
        { tier: 3 as const, label: 'A Conclusion', desc: 'The door you want. Ruinous.' },
    ]),
});

// ---------------------------------------------------------------------------
// VM shapes
// ---------------------------------------------------------------------------

export interface LabyrinthActOptionVM {
    id: LabyrinthActId;
    title: string;
    riddle: string;
    completed: boolean;
}

export interface LabyrinthDoorVM {
    to: string;
    /** Destination display number (plaque). */
    display: string;
    gated: boolean;
}

export interface LabyrinthPoiVM {
    id: string;
    label: string;
    /** Already inspected → the node stops pulsating. */
    inspected: boolean;
}

export interface LabyrinthPocketChipVM {
    word: string;
    /** Provenance ("found in 19"); never honest/counterfeit. */
    source: string;
}

export interface LabyrinthHintVM {
    tier: 1 | 2 | 3;
    label: string;
    desc: string;
    /** Real units — shillings (real-units-or-no-number rule). */
    price: number;
    affordable: boolean;
}

export interface LabyrinthGateVM {
    riddle: string;
    /** Socket count = answer length; contents the player lays. */
    socketCount: number;
    /** Words the house remembers (pre-filled, immutable). */
    preConfirmed: readonly string[];
}

export interface LabyrinthMapVM {
    /** Normalized grid coordinates (col/row starting at 0). */
    rooms: ReadonlyArray<{ nodeId: string; col: number; row: number; current: boolean }>;
    edges: ReadonlyArray<{ fromCol: number; fromRow: number; toCol: number; toRow: number }>;
    cols: number;
    rows: number;
}

export interface LabyrinthRoomVM {
    actId: LabyrinthActId;
    actTitle: string;
    /** Engine node id — scene layout seed + backdrop registry key. */
    nodeId: string;
    display: string;
    name: string;
    scene: string;
    narration: string;
    riddle: string;
    doors: readonly LabyrinthDoorVM[];
    pois: readonly LabyrinthPoiVM[];
    pocket: readonly LabyrinthPocketChipVM[];
    hints: readonly LabyrinthHintVM[];
    debtLine: string;
    gate: LabyrinthGateVM | null;
    /** Fourth Ledger available (act III quest room). */
    settle: { outstanding: number; pricePerPoint: number; canAfford: boolean } | null;
    isBossRoom: boolean;
    lastRemark: {
        poiId: string;
        remark: string;
        pickupLine: string | null;
        trapLine: string | null;
    } | null;
    arrivalToast: string | null;
    coin: number;
}

export interface LabyrinthFinaleVM {
    /** True finale (the Sophist) vs an act warden pre-fight panel. */
    isFinale: boolean;
    title: string;
    intro: string;
    stacksLine: string | null;
    namingOpen: boolean;
    namePrompt: string | null;
    fightLabel: string;
}

export type LabyrinthViewModel =
    | { kind: 'act-select'; title: string; sub: string; warning: string; acts: readonly LabyrinthActOptionVM[] }
    | { kind: 'complete'; title: string; body: string; lastLine: string }
    | { kind: 'room'; room: LabyrinthRoomVM; map: LabyrinthMapVM };

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

function gameStateOf(state: AppStoreState): GameState {
    return state as unknown as GameState;
}

// `useSyncExternalStore` requires stable snapshots — memoize on the
// exact inputs the VM reads (the event.engine pattern).
let _vm: LabyrinthViewModel | null = null;
let _vmUi: unknown = null;
let _vmProgress: unknown = null;
let _vmMap: unknown = null;
let _vmPlayer: unknown = null;

export function selectLabyrinthViewModel(state: AppStoreState): LabyrinthViewModel {
    const g = gameStateOf(state);
    if (
        _vm !== null &&
        state.labyrinthUi === _vmUi &&
        g.labyrinth === _vmProgress &&
        state.world?.currentMap === _vmMap &&
        state.player === _vmPlayer
    ) {
        return _vm;
    }
    const vm = buildLabyrinthViewModel(state);
    _vm = vm;
    _vmUi = state.labyrinthUi;
    _vmProgress = g.labyrinth;
    _vmMap = state.world?.currentMap;
    _vmPlayer = state.player;
    return vm;
}

function buildLabyrinthViewModel(state: AppStoreState): LabyrinthViewModel {
    const session = state.labyrinthUi?.session ?? null;
    const progress = labyrinthProgressOf(gameStateOf(state));

    if (!session) {
        return {
            kind: 'act-select',
            title: LABYRINTH_COPY.title,
            sub: LABYRINTH_COPY.actSelectSub,
            warning: LABYRINTH_COPY.actSelectWarning,
            acts: APORIA_ACTS.map((act) => ({
                id: act.id,
                title: act.title,
                riddle: act.riddle,
                completed: progress.actsCompleted.includes(act.id),
            })),
        };
    }

    if (progress.completed) {
        return {
            kind: 'complete',
            title: LABYRINTH_COPY.completeTitle,
            body: LABYRINTH_COPY.completeBody,
            lastLine: LABYRINTH_COPY.completeLastLine,
        };
    }

    const act = getAporiaAct(session.actId);
    const nodeId = state.world.currentMap.currentNode;

    // A live session whose current world node is NOT a room in the act
    // means the world was swapped out from under the visit — a run reset
    // on death (`resetRun` regenerates the overworld and seats the player
    // at `bw-w1`), a save/load race, or a teleport. The session is stale;
    // fall back to act-select rather than throwing `LabyrinthContentError`
    // and tripping the global error boundary. (Root cause of the
    // "battle loss → THE BINDING TORE" crash.)
    if (!act.rooms.some((r) => r.nodeId === nodeId)) {
        return {
            kind: 'act-select',
            title: LABYRINTH_COPY.title,
            sub: LABYRINTH_COPY.actSelectSub,
            warning: LABYRINTH_COPY.actSelectWarning,
            acts: APORIA_ACTS.map((a) => ({
                id: a.id,
                title: a.title,
                riddle: a.riddle,
                completed: progress.actsCompleted.includes(a.id),
            })),
        };
    }

    const room = getRoom(act, nodeId);
    const doors = visibleDoors(act, progress, nodeId);
    const gate = act.gates.find((g) => g.roomId === nodeId) ?? null;
    const coin = state.player?.currency ?? 0;
    const points = debtPoints(progress);
    const outstandingSettle = nodeId === act.questRoom && act.id === 'act3' ? points : null;

    const lastRemark = session.lastRemark
        ? {
            poiId: session.lastRemark.poiId,
            remark: session.lastRemark.remark,
            pickupLine: session.lastRemark.fragmentWord
                ? LABYRINTH_COPY.fragmentPickup(session.lastRemark.fragmentWord)
                : session.lastRemark.revealedDisplay
                    ? LABYRINTH_COPY.secretReveal(session.lastRemark.revealedDisplay)
                    : null,
            trapLine: session.lastRemark.trap === 'encounter'
                ? LABYRINTH_COPY.trapCombat
                : session.lastRemark.trap === 'hazard'
                    ? LABYRINTH_COPY.trapHazard
                    : null,
        }
        : null;

    return {
        kind: 'room',
        room: {
            actId: act.id,
            actTitle: act.title,
            nodeId,
            display: room.display,
            name: room.name,
            scene: room.scene,
            narration: room.narration,
            riddle: act.riddle,
            doors: doors.map((d) => ({ to: d.to, display: d.display, gated: d.gated })),
            pois: room.pois.map((p) => ({
                id: p.id,
                label: p.label,
                inspected: progress.inspectedPois.includes(`${nodeId}:${p.id}`),
            })),
            pocket: progress.pocket.map((f) => ({
                word: f.word,
                source: LABYRINTH_COPY.pocketSource(displayOf(act, f.sourceNodeId)),
            })),
            hints: LABYRINTH_COPY.hintTiers.map((t) => {
                const price = hintPrice(progress, t.tier);
                return { ...t, price, affordable: coin >= price };
            }),
            debtLine: LABYRINTH_COPY.debtLine(points, borrowedPremiseStacks(progress)),
            gate: gate
                ? {
                    riddle: gate.riddle,
                    socketCount: gate.answer.length,
                    preConfirmed: preConfirmedWords(APORIA_ACTS, progress, gate),
                }
                : null,
            settle: outstandingSettle !== null
                ? {
                    outstanding: outstandingSettle,
                    pricePerPoint: SETTLE_PRICE_PER_POINT,
                    canAfford: coin >= SETTLE_PRICE_PER_POINT && outstandingSettle > 0,
                }
                : null,
            isBossRoom: nodeId === act.bossRoom,
            lastRemark,
            arrivalToast: session.arrivalNote === 'waystone'
                ? LABYRINTH_COPY.waystoneToast
                : session.arrivalNote === 'ejected'
                    ? LABYRINTH_COPY.ejectToast
                    : null,
            coin,
        },
        map: buildFogMap(act, progress, nodeId),
    };
}

let _finaleVm: LabyrinthFinaleVM | null = null;
let _finaleUi: unknown = null;
let _finaleProgress: unknown = null;
let _finaleMap: unknown = null;

/** Pre-fight panel for the boss room (warden acts) / finale (act III). */
export function selectLabyrinthFinaleViewModel(state: AppStoreState): LabyrinthFinaleVM | null {
    const g = gameStateOf(state);
    if (
        state.labyrinthUi === _finaleUi &&
        g.labyrinth === _finaleProgress &&
        state.world?.currentMap === _finaleMap
    ) {
        return _finaleVm;
    }
    const vm = buildLabyrinthFinaleViewModel(state);
    _finaleVm = vm;
    _finaleUi = state.labyrinthUi;
    _finaleProgress = g.labyrinth;
    _finaleMap = state.world?.currentMap;
    return vm;
}

function buildLabyrinthFinaleViewModel(state: AppStoreState): LabyrinthFinaleVM | null {
    const session = state.labyrinthUi?.session ?? null;
    if (!session) return null;
    const act = getAporiaAct(session.actId);
    const nodeId = state.world.currentMap.currentNode;
    // `bossRoom` is always an authored room, so a stale post-reset node
    // (e.g. `bw-w1`) fails this guard and returns null before any
    // `getRoom` lookup — no LabyrinthContentError from the finale path.
    if (nodeId !== act.bossRoom) return null;
    const progress = labyrinthProgressOf(gameStateOf(state));
    const isFinale = act.descent === 'exit';
    const stacks = borrowedPremiseStacks(progress);
    const room = getRoom(act, nodeId);
    if (!isFinale) {
        return {
            isFinale: false,
            title: LABYRINTH_COPY.bossTitle(room.name),
            intro: LABYRINTH_COPY.bossIntro,
            stacksLine: null,
            namingOpen: false,
            namePrompt: null,
            fightLabel: LABYRINTH_COPY.bossFight,
        };
    }
    const namingOpen = namingForkOpen(progress);
    return {
        isFinale: true,
        title: LABYRINTH_COPY.finaleTitle,
        intro: LABYRINTH_COPY.finaleIntro,
        stacksLine: LABYRINTH_COPY.finaleStacks(stacks, debtPoints(progress)),
        namingOpen,
        namePrompt: namingOpen
            ? LABYRINTH_COPY.finaleNamePrompt
            : LABYRINTH_COPY.finaleNameClosed,
        fightLabel: LABYRINTH_COPY.finaleFight,
    };
}

// ---------------------------------------------------------------------------
// Fog-of-war map layout (from walk history — never engine coordinates)
// ---------------------------------------------------------------------------

function displayOf(act: LabyrinthActDef, nodeId: string): string {
    return act.rooms.find((r) => r.nodeId === nodeId)?.display ?? '?';
}

/**
 * Lay visited rooms on a grid purely from walk order: the act entry
 * sits at the origin; each newly-walked destination takes the first
 * free cell adjacent to its source (E, S, W, N, then diagonals —
 * deterministic, so the map is stable across renders and sessions).
 * An edge renders only in the direction actually walked.
 */
export function buildFogMap(
    act: LabyrinthActDef,
    progress: LabyrinthProgress,
    currentNode: string,
): LabyrinthMapVM {
    const walked = walkedEdgesOf(progress)
        .map((key) => key.split('->'))
        .filter((parts): parts is [string, string] => parts.length === 2)
        // Only this act's edges (progress spans all three acts).
        .filter(([from, to]) =>
            act.rooms.some((r) => r.nodeId === from) && act.rooms.some((r) => r.nodeId === to));

    const pos = new Map<string, { col: number; row: number }>();
    pos.set(act.entry, { col: 0, row: 0 });
    const taken = new Set(['0,0']);
    const NEIGHBORS = [
        [1, 0], [0, 1], [-1, 0], [0, -1],
        [1, 1], [-1, 1], [1, -1], [-1, -1],
    ] as const;

    const place = (from: string, to: string): void => {
        if (pos.has(to)) return;
        const origin = pos.get(from);
        if (!origin) return;
        for (let ring = 1; ring < 8; ring += 1) {
            for (const [dc, dr] of NEIGHBORS) {
                const col = origin.col + dc * ring;
                const row = origin.row + dr * ring;
                const key = `${col},${row}`;
                if (!taken.has(key)) {
                    taken.add(key);
                    pos.set(to, { col, row });
                    return;
                }
            }
        }
    };

    for (const [from, to] of walked) {
        if (!pos.has(from)) place(act.entry, from);
        place(from, to);
    }
    if (!pos.has(currentNode) && act.rooms.some((r) => r.nodeId === currentNode)) {
        place(act.entry, currentNode);
    }

    // Normalize to non-negative grid coordinates.
    let minCol = 0;
    let minRow = 0;
    let maxCol = 0;
    let maxRow = 0;
    for (const p of pos.values()) {
        minCol = Math.min(minCol, p.col);
        minRow = Math.min(minRow, p.row);
        maxCol = Math.max(maxCol, p.col);
        maxRow = Math.max(maxRow, p.row);
    }

    const rooms = [...pos.entries()].map(([nodeId, p]) => ({
        nodeId,
        col: p.col - minCol,
        row: p.row - minRow,
        current: nodeId === currentNode,
    }));

    const edges = walked
        .filter(([from, to]) => pos.has(from) && pos.has(to))
        .map(([from, to]) => {
            const a = pos.get(from) as { col: number; row: number };
            const b = pos.get(to) as { col: number; row: number };
            return {
                fromCol: a.col - minCol,
                fromRow: a.row - minRow,
                toCol: b.col - minCol,
                toRow: b.row - minRow,
            };
        });

    return {
        rooms,
        edges,
        cols: maxCol - minCol + 1,
        rows: maxRow - minRow + 1,
    };
}

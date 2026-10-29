/**
 * Questlines: a chapter's quests as data.
 *
 * A questline is an ordered list of steps; each step is offered at one quest
 * node (`MapEvents` kind `quest`) and is a `Quest` the log tracks. Steps 1-3
 * are held when their objectives fill and turned in at the NEXT quest node
 * (`settle: 'turn-in'`); the last step is beating the chapter boss and pays on
 * that victory (`settle: 'on-victory'`); a `reach` step can be paid on
 * arrival at its node (`settle: 'on-arrival'`), and a step can be given from
 * anywhere (`giveQuestStep`).
 *
 * The contract (the types an authored questline and a resolved quest node
 * share) and the step rules: a registry of authored questlines, the stage a
 * quest node reads (`questNodeStage`), accepting a step (`acceptQuestStep`,
 * which spends the node), turning one in at the next node (`turnInQuestStep`),
 * and the one settle seam every quest-log change goes through
 * (`settleQuestLog`: pays what completed, opens the roads of a step that
 * became ready, `opensOnReady`, and the gates of a step that completed,
 * `gatesPast`). Several questlines run side by side (a side quest is a
 * one-step questline); each reads only its own steps off the shared log. The
 * authored questlines (the Breakwater's) live in `quest.library.ts`, which
 * registers them on load.
 */

import type { MapName } from './map.library';
import type { MapState, NodeId, Quest, QuestLog, Reward } from './types';
import type { GameState } from '../Game/types';
import type { QuestPayload, ResolvedEvent } from './MapEvents/types';
import {
    isQuestComplete, findActiveQuest, startQuest, completeQuest, payCompletedQuests,
    syncCarryObjectives, type PaidQuestReward,
} from './quest.engine';
import { markNodeConsumed, revealAdjacent, syncFrontierLists, unblockMapRoute } from './world.reducer';
import { getRng } from '../Utils/rng';

/** A questline's id (the Breakwater's is `BREAKWATER_QUESTLINE_ID`). */
export type QuestlineId = string;

/** A road between two nodes: the shape of a `BlockedRoute` without its reason. */
export interface RouteRef {
    readonly from: NodeId;
    readonly to: NodeId;
}

/**
 * How a step is paid: turned in at a quest node (the next step's, or its own
 * `turnInAt`), or the moment its objectives fill (`'on-victory'`, the boss
 * step's shape; `'on-arrival'`, a `reach` step paid as the player enters its
 * target node, which then offers the next step as a turn-in node does).
 */
export type QuestlineSettle = 'turn-in' | 'on-victory' | 'on-arrival';

/** One step of a questline. */
export interface QuestlineStep {
    /** 1-based step number. */
    readonly step: number;
    /** The quest node that offers this step. */
    readonly nodeId: NodeId;
    /** The quest the log tracks once the step is accepted. */
    readonly quest: Quest;
    /** XP plus one extra, paid in order (the last step also a relic). */
    readonly rewards: readonly Reward[];
    readonly settle: QuestlineSettle;
    /** The roads into the next quest node, opened when every objective fills. */
    readonly opensOnReady?: readonly RouteRef[];
    /**
     * The gates this step holds: roads leaving the node where it settles
     * (its turn-in node, or the boss) toward the far side, `from` the near
     * end. The map seeds them shut (`initialBlockedRoutes`, the reason naming
     * the quest); they open only when the step is completed, not merely ready.
     */
    readonly gatesPast?: readonly RouteRef[];
    /**
     * Where a turn-in step is turned in when no next step's node is: a
     * one-step side quest's turn-in node. The next step's node wins when both
     * exist.
     */
    readonly turnInAt?: NodeId;
}

/** A chapter's questline. */
export interface Questline {
    readonly id: QuestlineId;
    /** The questline's display name (T's to write); the item-reward eyebrow names it. */
    readonly name?: string;
    readonly mapName: MapName;
    readonly steps: readonly QuestlineStep[];
}

/** A step as a resolved quest node shows it: the quest with its progress and rewards. */
export type QuestStepView = Quest;

/** What a quest node shows the player. */
export type QuestNodeStage = 'locked' | 'waiting' | 'turn-in' | 'offer';

// ─── The registry ─────────────────────────────────────────────────────────────

const questlineRegistry = new Map<QuestlineId, Questline>();

/** Registers an authored questline (last write wins on the same id). */
export function registerQuestline(questline: Questline): void {
    questlineRegistry.set(questline.id, questline);
}

/** Test-only: removes a questline a hermetic test registered. */
export function _unregisterQuestline(id: QuestlineId): void {
    questlineRegistry.delete(id);
}

/** The registered questline with this id, if any. */
export function getQuestline(id: QuestlineId): Questline | undefined {
    return questlineRegistry.get(id);
}

/** Every registered questline, in registration order. */
export function listQuestlines(): readonly Questline[] {
    return [...questlineRegistry.values()];
}

/** The step numbered `step` (1-based) of `questline`, if it has one. */
export function questlineStep(questline: Questline, step: number): QuestlineStep | undefined {
    return questline.steps.find(s => s.step === step);
}

// ─── Reading a step off the log ───────────────────────────────────────────────

/**
 * Where a step stands in the quest log: not yet accepted, accepted and
 * counting, ready (every objective filled, held for its turn-in), or
 * completed (turned in, or paid on the boss victory).
 */
export type QuestStepState = 'unaccepted' | 'active' | 'ready' | 'completed';

/** Reads `step`'s state off `log`. */
export function questStepState(log: QuestLog, step: QuestlineStep): QuestStepState {
    if (log.completed.includes(step.quest.name)) return 'completed';
    const active = findActiveQuest(log, step.quest.name);
    if (!active) return 'unaccepted';
    return isQuestComplete(active) ? 'ready' : 'active';
}

/**
 * The quest a step starts as: the authored quest stamped with its questline,
 * its step and its map, every count at 0 ("counts from acceptance"), held for
 * its turn-in when it settles by turn-in, and carrying the step's rewards
 * (the first as `reward`, the rest as `rewards`; a step with no rewards keeps
 * the quest's own).
 */
export function stepQuest(questline: Questline, step: QuestlineStep): Quest {
    const [first, ...rest] = step.rewards;
    return {
        ...step.quest,
        mapName: questline.mapName,
        questline: questline.id,
        step: step.step,
        objectives: step.quest.objectives.map(o => ({ ...o, currentCount: 0 })),
        ...(first !== undefined ? { reward: first, rewards: rest } : {}),
        holdForTurnIn: step.settle === 'turn-in',
        status: 'available',
    };
}

/**
 * A step as a node shows it: the log's own quest while it is active (with its
 * progress), otherwise the quest it starts as (`stepQuest`), its counts full
 * once the step is completed.
 */
export function questStepView(log: QuestLog, questline: Questline, step: QuestlineStep): QuestStepView {
    const active = findActiveQuest(log, step.quest.name);
    if (active) return active;
    const fresh = stepQuest(questline, step);
    if (!log.completed.includes(step.quest.name)) return fresh;
    return {
        ...fresh,
        objectives: fresh.objectives.map(o => ({ ...o, currentCount: o.requiredCount })),
        status: 'completed',
    };
}

/**
 * The stage quest node `node` reads. Node 1 (the chapter start) offers step 1.
 * Node k (k >= 2) reads the step before it: `locked` while step k-1 is not
 * accepted, `waiting` while it is accepted and unmet, `turn-in` once it is
 * met, and `offer` once it is turned in. An unregistered questline reads
 * node 1 as `offer` and every later node as `locked`.
 */
export function questNodeStage(log: QuestLog, questlineId: QuestlineId, node: number): QuestNodeStage {
    if (node <= 1) return 'offer';
    const questline = getQuestline(questlineId);
    const behind = questline ? questlineStep(questline, node - 1) : undefined;
    if (!behind) return 'locked';
    switch (questStepState(log, behind)) {
        case 'unaccepted': return 'locked';
        case 'active':     return 'waiting';
        case 'ready':      return 'turn-in';
        case 'completed':  return 'offer';
    }
}

/**
 * Resolves a quest node from the log: its stage, the step it turns in
 * (`behind`, node 2-4) and the step it offers (`ahead`). Touches no state.
 */
export function resolveQuestNodeEvent(log: QuestLog, payload: QuestPayload): Extract<ResolvedEvent, { kind: 'quest' }> {
    const event: Extract<ResolvedEvent, { kind: 'quest' }> = {
        kind: 'quest',
        questline: payload.questline,
        node: payload.node,
        stage: questNodeStage(log, payload.questline, payload.node),
        description: payload.description,
    };
    const questline = getQuestline(payload.questline);
    if (!questline) return event;
    const behind = questlineStep(questline, payload.node - 1);
    const ahead = questlineStep(questline, payload.node);
    if (behind) event.behind = questStepView(log, questline, behind);
    if (ahead) event.ahead = questStepView(log, questline, ahead);
    return event;
}

// ─── The settle seam ──────────────────────────────────────────────────────────

/**
 * Opens the roads (`opensOnReady`) of every step on the current map whose
 * objectives have all filled (ready, or already completed): the quest-node
 * locks; and the gates (`gatesPast`) of every step already completed. Every
 * registered questline on the map is read. Idempotent: an open road stays
 * open, and the same state comes back when nothing opened.
 */
export function openReadyQuestRoutes(state: GameState): GameState {
    const map = state.world.currentMap;
    let next: MapState = map;
    for (const questline of questlineRegistry.values()) {
        if (questline.mapName !== map.name) continue;
        for (const step of questline.steps) {
            if (!step.opensOnReady?.length && !step.gatesPast?.length) continue;
            const where = questStepState(state.quests, step);
            if (where !== 'ready' && where !== 'completed') continue;
            for (const road of step.opensOnReady ?? []) next = unblockMapRoute(next, road.from, road.to);
            if (where !== 'completed') continue;
            for (const road of step.gatesPast ?? []) next = unblockMapRoute(next, road.from, road.to);
        }
    }
    if (next === map) return state;
    return { ...state, world: { ...state.world, currentMap: syncFrontierLists(next) } };
}

/**
 * THE settle seam for a quest-log change: moves `state` onto `quests`, pays
 * every quest that completed through the one reward door
 * (`payCompletedQuests`), opens the roads of any step that became ready and
 * the gates of any step that completed (`openReadyQuestRoutes`). Every completion path calls it: `END_COMBAT`'s
 * kills, the hazard, `reach` and `collect` branches of `resolveMapEvent`, the
 * dialogue effects, and `turnInQuestStep`. The same state comes back when
 * the log did not change.
 */
export function settleQuestLog(
    state: GameState,
    quests: QuestLog,
    rng: () => number = () => getRng().random(),
): { state: GameState; paid: PaidQuestReward[] } {
    if (quests === state.quests) return { state, paid: [] };
    // Carry objectives read the inventory, and a payout can put the item in it
    // (an arrival step paying the key): read, pay, and read again until steady.
    let player = state.player;
    let before = state.quests;
    let log = quests;
    const paid: PaidQuestReward[] = [];
    for (let pass = 0; pass < 5; pass++) {
        log = syncCarryObjectives(player, log);
        if (log === before) break;
        const pay = payCompletedQuests(player, before, log, rng);
        player = pay.player;
        paid.push(...pay.paid);
        before = log;
    }
    const moved: GameState = { ...state, player, quests: log };
    return { state: openReadyQuestRoutes(moved), paid };
}

// ─── Accept and turn in ───────────────────────────────────────────────────────

/** True when the player stands on `nodeId` of `questline`'s map. */
function standsOn(state: GameState, questline: Questline, nodeId: NodeId): boolean {
    const map = state.world.currentMap;
    return map.name === questline.mapName && map.currentNode === nodeId;
}

/**
 * Accepts `step` of `questlineId` at its own node: starts the step's quest
 * with every count at 0 (nothing before acceptance counts) and spends the
 * node, which opens its held roads. Accepting needs the player on the step's
 * node, the step not yet accepted, and (for step 2 and on) the step before it
 * turned in. Any other call returns the same state.
 */
export function acceptQuestStep(state: GameState, questlineId: QuestlineId, step: number): GameState {
    const questline = getQuestline(questlineId);
    const target = questline ? questlineStep(questline, step) : undefined;
    if (!questline || !target) return state;
    if (!standsOn(state, questline, target.nodeId)) return state;
    const started = startStep(state, questline, target);
    if (started === state) return state;
    const map = started.world.currentMap;
    const spent = markNodeConsumed(revealAdjacent(map, target.nodeId), target.nodeId);
    return { ...started, world: { ...started.world, currentMap: spent } };
}

/**
 * Starts `target` in the log when it can start: not yet accepted, the step
 * before it completed. Counts begin at 0 (nothing before the start counts);
 * a carry objective reads the inventory at once. Goes through the settle seam.
 * Any other call returns the same state.
 */
function startStep(state: GameState, questline: Questline, target: QuestlineStep): GameState {
    if (questStepState(state.quests, target) !== 'unaccepted') return state;
    const behind = questlineStep(questline, target.step - 1);
    if (behind && questStepState(state.quests, behind) !== 'completed') return state;
    const fresh = stepQuest(questline, target);
    const withoutOffer: QuestLog = {
        ...state.quests,
        available: state.quests.available.filter(q => q.name !== fresh.name),
    };
    return settleQuestLog(state, startQuest(withoutOffer, fresh)).state;
}

/**
 * Gives `step` of `questlineId` from anywhere (a dialogue or cutscene
 * effect): starts the step as `acceptQuestStep` would, counting from 0 and
 * needing the step before it completed, but needs no quest node and spends
 * none. Any other call returns the same state.
 */
export function giveQuestStep(state: GameState, questlineId: QuestlineId, step: number): GameState {
    const questline = getQuestline(questlineId);
    const target = questline ? questlineStep(questline, step) : undefined;
    if (!questline || !target) return state;
    return startStep(state, questline, target);
}

/**
 * The node where `step` is turned in: the next step's node, else the step's
 * own `turnInAt` (a one-step side quest); `undefined` when it has neither.
 */
export function turnInNodeOf(questline: Questline, step: QuestlineStep): NodeId | undefined {
    return questlineStep(questline, step.step + 1)?.nodeId ?? step.turnInAt;
}

/**
 * Turns in a ready `step` (one that settles by turn-in) at its turn-in node
 * (`turnInNodeOf`: the NEXT quest node, or a side quest's `turnInAt`):
 * completes its held quest and pays it through the settle seam
 * (`settleQuestLog`), so its XP, shillings and items land once and its gates
 * open. A node that offers a next step stays unspent and now offers it; a
 * side quest's turn-in node, offering nothing more, is spent. Needs the
 * player on the turn-in node and the step ready; any other call returns the
 * same state and pays nothing. `paid` carries what the door paid (items,
 * card offers).
 */
export function turnInQuestStep(
    state: GameState,
    questlineId: QuestlineId,
    step: number,
    rng: () => number = () => getRng().random(),
): { state: GameState; paid: PaidQuestReward[] } {
    const questline = getQuestline(questlineId);
    const target = questline ? questlineStep(questline, step) : undefined;
    const at = questline && target ? turnInNodeOf(questline, target) : undefined;
    if (!questline || !target || !at || target.settle !== 'turn-in') return { state, paid: [] };
    if (!standsOn(state, questline, at)) return { state, paid: [] };
    // A carry objective is read off the inventory now: a key that left is unmet.
    const held: GameState = { ...state, quests: syncCarryObjectives(state.player, state.quests) };
    if (questStepState(held.quests, target) !== 'ready') return { state, paid: [] };
    const settled = settleQuestLog(held, completeQuest(held.quests, target.quest.name), rng);
    if (questlineStep(questline, step + 1)) return settled;
    const map = settled.state.world.currentMap;
    const spent = syncFrontierLists(markNodeConsumed(revealAdjacent(map, at), at));
    return { state: { ...settled.state, world: { ...settled.state.world, currentMap: spent } }, paid: settled.paid };
}

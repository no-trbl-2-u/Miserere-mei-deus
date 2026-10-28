/**
 * Questlines: a chapter's quests as data.
 *
 * A questline is an ordered list of steps; each step is offered at one quest
 * node (`MapEvents` kind `quest`) and is a `Quest` the log tracks. Steps 1-3
 * are held when their objectives fill and turned in at the NEXT quest node
 * (`settle: 'turn-in'`); the last step is beating the chapter boss and pays on
 * that victory (`settle: 'on-victory'`).
 *
 * The contract (the types an authored questline and a resolved quest node
 * share) and the step rules: a registry of authored questlines, the stage a
 * quest node reads (`questNodeStage`), accepting a step (`acceptQuestStep`,
 * which spends the node), turning one in at the next node (`turnInQuestStep`),
 * and the one settle seam every quest-log change goes through
 * (`settleQuestLog`: pays what completed and opens the roads of a step that
 * became ready, `opensOnReady`). The authored questlines (the Breakwater's)
 * live in `quest.library.ts`, which registers them on load.
 */

import type { MapName } from './map.library';
import type { MapState, NodeId, Quest, QuestLog, Reward } from './types';
import type { GameState } from '../Game/types';
import type { QuestPayload, ResolvedEvent } from './MapEvents/types';
import {
    isQuestComplete, findActiveQuest, startQuest, completeQuest, payCompletedQuests,
    type PaidQuestReward,
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

/** How a step is paid: turned in at the next quest node, or on the boss victory. */
export type QuestlineSettle = 'turn-in' | 'on-victory';

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
 * locks. Idempotent: an open road stays open, and the same state comes back
 * when nothing opened.
 */
export function openReadyQuestRoutes(state: GameState): GameState {
    const map = state.world.currentMap;
    let next: MapState = map;
    for (const questline of questlineRegistry.values()) {
        if (questline.mapName !== map.name) continue;
        for (const step of questline.steps) {
            if (!step.opensOnReady?.length) continue;
            const where = questStepState(state.quests, step);
            if (where !== 'ready' && where !== 'completed') continue;
            for (const road of step.opensOnReady) next = unblockMapRoute(next, road.from, road.to);
        }
    }
    if (next === map) return state;
    return { ...state, world: { ...state.world, currentMap: syncFrontierLists(next) } };
}

/**
 * THE settle seam for a quest-log change: moves `state` onto `quests`, pays
 * every quest that completed through the one reward door
 * (`payCompletedQuests`), and opens the roads of any step that became ready
 * (`openReadyQuestRoutes`). Every completion path calls it: `END_COMBAT`'s
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
    const pay = payCompletedQuests(state.player, state.quests, quests, rng);
    const moved: GameState = { ...state, player: pay.player, quests };
    return { state: openReadyQuestRoutes(moved), paid: pay.paid };
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
    if (questStepState(state.quests, target) !== 'unaccepted') return state;
    const behind = questlineStep(questline, step - 1);
    if (behind && questStepState(state.quests, behind) !== 'completed') return state;

    const fresh = stepQuest(questline, target);
    const withoutOffer: QuestLog = {
        ...state.quests,
        available: state.quests.available.filter(q => q.name !== fresh.name),
    };
    const quests = startQuest(withoutOffer, fresh);
    const map = state.world.currentMap;
    const spent = markNodeConsumed(revealAdjacent(map, target.nodeId), target.nodeId);
    return { ...state, quests, world: { ...state.world, currentMap: spent } };
}

/**
 * Turns in a ready `step` (one that settles by turn-in) at the NEXT quest
 * node: completes its held quest and pays it through the settle seam
 * (`settleQuestLog`), so its XP, shillings and items land once. The node
 * stays unspent and now offers the next step. Needs the player on the next
 * step's node and the step ready; any other call returns the same state and
 * pays nothing. `paid` carries what the door paid (items, card offers).
 */
export function turnInQuestStep(
    state: GameState,
    questlineId: QuestlineId,
    step: number,
    rng: () => number = () => getRng().random(),
): { state: GameState; paid: PaidQuestReward[] } {
    const questline = getQuestline(questlineId);
    const target = questline ? questlineStep(questline, step) : undefined;
    const next = questline ? questlineStep(questline, step + 1) : undefined;
    if (!questline || !target || !next || target.settle !== 'turn-in') return { state, paid: [] };
    if (!standsOn(state, questline, next.nodeId)) return { state, paid: [] };
    if (questStepState(state.quests, target) !== 'ready') return { state, paid: [] };
    return settleQuestLog(state, completeQuest(state.quests, target.quest.name), rng);
}

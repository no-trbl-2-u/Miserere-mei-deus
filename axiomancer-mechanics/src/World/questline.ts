/**
 * Questlines: a chapter's quests as data.
 *
 * A questline is an ordered list of steps; each step is offered at one quest
 * node (`MapEvents` kind `quest`) and is a `Quest` the log tracks. Steps 1-3
 * are held when their objectives fill and turned in at the NEXT quest node
 * (`settle: 'turn-in'`); the last step is beating the chapter boss and pays on
 * that victory (`settle: 'on-victory'`).
 *
 * This file is the contract only (phase QL1a): the types an authored
 * questline and a resolved quest node share. The step rules (`acceptQuestStep`,
 * `turnInQuestStep`, `questNodeStage`, the locks) arrive with QL1b, and the
 * Breakwater's own questline with QL1d.
 */

import type { MapName } from './map.library';
import type { NodeId, Quest, Reward } from './types';

/** A questline's id (the Breakwater's is authored by QL1d). */
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
    readonly mapName: MapName;
    readonly steps: readonly QuestlineStep[];
}

/** A step as a resolved quest node shows it: the quest with its progress and rewards. */
export type QuestStepView = Quest;

/** What a quest node shows the player. */
export type QuestNodeStage = 'locked' | 'waiting' | 'turn-in' | 'offer';

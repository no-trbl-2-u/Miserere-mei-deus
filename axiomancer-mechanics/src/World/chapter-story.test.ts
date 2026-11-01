/**
 * A chapter's story read from data (phase SM2b): the boss, the elites, the
 * exit, the main questline and what its current step needs.
 */

import { describe, expect, it } from 'vitest';

import './index';
import { BREAKWATER_CHAPTER_QUESTLINE, BREAKWATER_CHAPTER_STEPS } from './breakwater-chapter.questline';
import {
    bossNodes, currentStoryTargets, exitNodes, mainQuestline, nodeStagesElite, stepNodes,
} from './chapter-story';
import { breakwaterChapter as def } from './Continents/Coastal-Village/breakwater-chapter';
import type { Quest, QuestLog } from './types';

const log = (active: Quest[], completed: string[] = []): QuestLog => ({ available: [], active, completed });

/** Step `n`'s quest as the log holds it once accepted, its one objective at `count`. */
function accepted(n: number, count = 0): Quest {
    const step = BREAKWATER_CHAPTER_QUESTLINE.steps[n - 1]!;
    return {
        ...step.quest,
        status: 'active',
        objectives: step.quest.objectives.map((o) => ({ ...o, currentCount: count })),
    };
}

const names = Object.values(BREAKWATER_CHAPTER_STEPS);

describe('the chapter story', () => {
    it('finds the boss, the elites and the exit from the pools', () => {
        expect(bossNodes(def)).toEqual(['bw-k2']);
        expect(exitNodes(def)).toEqual(['bw-b2']);
        expect(def.nodes.filter((n) => nodeStagesElite(def, n.id)).map((n) => n.id)).toEqual(['bw-w5', 'bw-c1', 'bw-l4']);
    });

    it('takes the questline the start node gives as the main one', () => {
        expect(mainQuestline(def)?.id).toBe(BREAKWATER_CHAPTER_QUESTLINE.id);
        expect(mainQuestline({ ...def, name: 'nowhere' } as never)).toBeNull();
    });

    it('lists what each step may need: its giver, its targets, its turn-in', () => {
        const [s1, , s3, s4] = BREAKWATER_CHAPTER_QUESTLINE.steps;
        expect(stepNodes(def, BREAKWATER_CHAPTER_QUESTLINE, s1!)).toEqual(['bw-w1', 'bw-c2']);
        expect(stepNodes(def, BREAKWATER_CHAPTER_QUESTLINE, s3!)).toEqual(['bw-l5', 'bw-k1']);
        expect(stepNodes(def, BREAKWATER_CHAPTER_QUESTLINE, s4!)).toEqual(['bw-k1', 'bw-k2', 'bw-b1']);
    });

    it('follows the log: the giver, then the target, then the turn-in, then the next step', () => {
        expect(currentStoryTargets(def, log([]))).toEqual(['bw-w1']);
        expect(currentStoryTargets(def, undefined)).toEqual(['bw-w1']);
        expect(currentStoryTargets(def, log([accepted(1)]))).toEqual(['bw-c2']);
        expect(currentStoryTargets(def, log([accepted(1, 1)]))).toEqual(['bw-c2']);
        expect(currentStoryTargets(def, log([], names.slice(0, 1)))).toEqual(['bw-c2']);
        expect(currentStoryTargets(def, log([accepted(3)], names.slice(0, 2)))).toEqual(['bw-k1']);
        expect(currentStoryTargets(def, log([accepted(4)], names.slice(0, 3)))).toEqual(['bw-k2']);
        expect(currentStoryTargets(def, log([accepted(4, 1)], names.slice(0, 3)))).toEqual(['bw-b1']);
        expect(currentStoryTargets(def, log([], names))).toEqual([]);
    });
});

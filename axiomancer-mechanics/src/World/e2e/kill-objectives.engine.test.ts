/**
 * Kill-objective progression.
 *
 * `advanceKillObjectives` is the reusable reducer that advances a quest's
 * kill objectives when a foe dies, on any combat path.
 *
 * No authored quest carries a kill objective, so the reducer's contract
 * is pinned on a fixture quest whose target is a real rostered foe (the
 * Death Beholder, every Act 1 region's door fight).
 */

import { describe, expect, it } from 'vitest';

import { advanceKillObjectives, startQuest, emptyQuestLog } from '../quest.engine';
import { ENEMY_REGISTRY } from '../../Enemy/enemy.library';
import type { Quest, QuestLog } from '../types';

/** The door fight's display name — the kill the fixture quest asks for. */
const BOSS_NAME = ENEMY_REGISTRY['death-beholder'].name;

/** A one-kill fixture quest (any `QuestName` will do; the reducer keys on it). */
const DOOR_QUEST: Quest = {
    name: 'gather-wood',
    description: 'test fixture',
    mapName: 'breakwater',
    status: 'available',
    objectives: [{
        id: 'kill-door', type: 'kill', target: BOSS_NAME,
        description: 'Put down the Death Beholder.',
        requiredCount: 1, currentCount: 0,
    }],
    reward: { kind: 'currency', amount: 1 },
};

function logWithDoorQuest(): QuestLog {
    return startQuest(emptyQuestLog(), DOOR_QUEST);
}

describe('advanceKillObjectives', () => {
    it('completes the quest when its target falls', () => {
        const before = logWithDoorQuest();
        expect(before.active.map(q => q.name)).toContain('gather-wood');

        const { log, completed } = advanceKillObjectives(before, BOSS_NAME);

        expect(completed).toEqual(['gather-wood']);
        expect(log.completed).toContain('gather-wood');
        expect(log.active.map(q => q.name)).not.toContain('gather-wood');
    });

    it('leaves the log untouched for an unrelated kill', () => {
        const before = logWithDoorQuest();
        const { log, completed } = advanceKillObjectives(before, 'Float-Eye');

        expect(completed).toEqual([]);
        expect(log).toBe(before);
    });

    it('is idempotent once the quest has completed', () => {
        const once = advanceKillObjectives(logWithDoorQuest(), BOSS_NAME);
        const twice = advanceKillObjectives(once.log, BOSS_NAME);

        expect(twice.completed).toEqual([]);
        expect(twice.log.completed.filter(n => n === 'gather-wood')).toHaveLength(1);
    });

    it('advances a multi-kill objective one kill at a time', () => {
        const hunt: Quest = {
            name: 'gather-wood',
            description: 'test fixture',
            mapName: 'breakwater',
            status: 'available',
            objectives: [{
                id: 'cull', type: 'kill', target: 'Float-Eye',
                description: 'Put down three Float-Eyes.',
                requiredCount: 3, currentCount: 0,
            }],
            reward: { kind: 'currency', amount: 1 },
        };
        let log = startQuest(emptyQuestLog(), hunt);
        for (let i = 0; i < 2; i++) log = advanceKillObjectives(log, 'Float-Eye').log;

        expect(log.active[0]!.objectives[0]!.currentCount).toBe(2);
        expect(log.completed).not.toContain('gather-wood');

        const third = advanceKillObjectives(log, 'Float-Eye');
        expect(third.completed).toEqual(['gather-wood']);
    });
});

/**
 * QS1a (A1): the quest presenter's pay and beads on the live Breakwater chain.
 * Pure over a quest slice and a quest log.
 */

import { describe, expect, it } from '@jest/globals';

import {
    BREAKWATER_CHAPTER_QUESTLINE, BREAKWATER_CHAPTER_QUESTLINE_ID, completeQuest, emptyQuestLog, progressQuest,
    startQuest, stepQuest, type QuestLog,
} from '@mechanics';

import { selectQuestVM } from '@/state/presenters/quest.engine';
import { EMPTY_QUEST_SLICE } from '@/state/store';

const LINE = BREAKWATER_CHAPTER_QUESTLINE;
const slice = (node: number) => ({
    ...EMPTY_QUEST_SLICE,
    open: { questline: BREAKWATER_CHAPTER_QUESTLINE_ID, node },
});
const step = (n: number) => LINE.steps[n - 1]!;
const accept = (log: QuestLog, n: number) => startQuest(log, stepQuest(LINE, step(n)));
const turnedIn = (log: QuestLog, n: number) => completeQuest(accept(log, n), step(n).quest.name);
const ready = (log: QuestLog, n: number) => {
    let l = accept(log, n);
    for (const o of step(n).quest.objectives) {
        for (let i = 0; i < o.requiredCount; i++) l = progressQuest(l, step(n).quest.name, o.id).log;
    }
    return l;
};
const states = (vm: ReturnType<typeof selectQuestVM>) => vm.beads.map(b => b.state);

describe('quest pay and beads on the live chain', () => {
    it('the offer at the keep gate (bw-k1, node 4) shows step 4: its pay and beads', () => {
        const log = turnedIn(turnedIn(emptyQuestLog(), 1), 2);
        const vm = selectQuestVM({ quest: slice(4), quests: turnedIn(log, 3) });
        expect(vm.stage).toBe('offer');
        expect(vm.card?.step).toBe(4);
        expect(vm.pay?.experience).toBe(40);
        expect(vm.pay?.items).toHaveLength(1);
        expect(vm.pay?.items[0]).toMatchObject({ category: 'equipment', sub: 'Armor' });
        expect(vm.beads).toHaveLength(4);
        expect(states(vm)).toEqual(['done', 'done', 'done', 'current']);
        expect(vm.canAccept).toBe(true);
    });

    it('step 2 (offered at node 2) pays XP, the key and the piece', () => {
        const vm = selectQuestVM({ quest: slice(2), quests: turnedIn(emptyQuestLog(), 1) });
        const two = selectQuestVM({ quest: slice(3), quests: turnedIn(turnedIn(emptyQuestLog(), 1), 2) });
        expect(vm.card?.step).toBe(2);
        expect(vm.pay?.experience).toBe(40);
        expect(vm.pay?.items.length).toBe(2);
        expect(vm.stage).toBe('offer');
        expect(vm.pay?.items.map(i => i.name).every(n => n.length > 0)).toBe(true);
        expect(two.card?.step).toBe(3);
    });

    it('node 2 beads: locked, waiting, turn-in, and the offer after step 1 is turned in', () => {
        const offer = selectQuestVM({ quest: slice(2), quests: emptyQuestLog() });
        expect(offer.stage).toBe('locked');
        expect(offer.card?.step).toBe(2);
        expect(states(offer)).toEqual(['ahead', 'current', 'ahead', 'ahead']);

        const waiting = selectQuestVM({ quest: slice(2), quests: accept(emptyQuestLog(), 1) });
        expect(waiting.stage).toBe('waiting');
        expect(waiting.card?.step).toBe(1);
        expect(states(waiting)).toEqual(['current', 'ahead', 'ahead', 'ahead']);

        const turnIn = selectQuestVM({ quest: slice(2), quests: ready(emptyQuestLog(), 1) });
        expect(turnIn.stage).toBe('turn-in');
        expect(turnIn.card?.step).toBe(1);
        expect(turnIn.pay?.experience).toBe(40);
        expect(states(turnIn)).toEqual(['current', 'ahead', 'ahead', 'ahead']);

        const after = selectQuestVM({ quest: slice(2), quests: turnedIn(emptyQuestLog(), 1) });
        expect(after.stage).toBe('offer');
        expect(after.card?.step).toBe(2);
        expect(states(after)).toEqual(['done', 'current', 'ahead', 'ahead']);
    });

    it('locked shows the step the node would offer', () => {
        const vm = selectQuestVM({ quest: slice(3), quests: emptyQuestLog() });
        expect(vm.stage).toBe('locked');
        expect(vm.card?.step).toBe(3);
        expect(vm.pay?.items).toHaveLength(1);
        expect(states(vm)).toEqual(['ahead', 'ahead', 'current', 'ahead']);
    });

    it("the chain's end at the bridge (bw-b1) stays on step 4 with all four beads done", () => {
        let log = emptyQuestLog();
        for (const n of [1, 2, 3]) log = turnedIn(log, n);
        const turnIn = selectQuestVM({ quest: slice(5), quests: ready(log, 4) });
        expect(turnIn.stage).toBe('turn-in');
        expect(turnIn.card?.step).toBe(4);

        const end = selectQuestVM({ quest: slice(5), quests: turnedIn(log, 4) });
        expect(end.stage).toBe('offer');
        expect(end.ahead).toBeNull();
        expect(end.card?.step).toBe(4);
        expect(end.pay?.experience).toBe(40);
        expect(states(end)).toEqual(['done', 'done', 'done', 'current']);
        expect(end.beads.every(b => b.done)).toBe(true);
        expect(end.canAccept).toBe(false);
    });
});

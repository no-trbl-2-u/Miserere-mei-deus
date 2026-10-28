/**
 * Quest screen presenter (phase QL1c): the engine's stage and step views
 * worded for the screen. Pure over a quest slice and a quest log.
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { completeQuest, emptyQuestLog, progressQuest, type Reward } from '@mechanics';

import { selectHasActiveQuest, selectQuestVM, questRewardLine } from '@/state/presenters/quest.engine';
import {
    FIXTURE_LINE,
    registerFixtureQuestline,
    startFixtureStep,
    unregisterFixtureQuestline,
} from '@/test-utils/questlineFixture';
import { EMPTY_QUEST_SLICE, type MobileQuestSlice } from '@/state/store';
import type { GameState } from '@mechanics';

beforeAll(() => { registerFixtureQuestline(); });
afterAll(() => { unregisterFixtureQuestline(); });

const base = { quests: emptyQuestLog() } as unknown as GameState;
const slice = (node: number, extra: Partial<MobileQuestSlice> = {}): MobileQuestSlice => ({
    ...EMPTY_QUEST_SLICE,
    open: { questline: FIXTURE_LINE, node },
    ...extra,
});

describe('selectQuestVM', () => {
    it('is inactive with nothing open', () => {
        const vm = selectQuestVM({ quest: EMPTY_QUEST_SLICE, quests: base.quests });
        expect(vm.active).toBe(false);
        expect(selectHasActiveQuest({ quest: EMPTY_QUEST_SLICE })).toBe(false);
    });

    it('node 1 offers step 1: the requirement, a 0 count, the pay in order, ACCEPT', () => {
        const vm = selectQuestVM({ quest: slice(1), quests: base.quests });
        expect(vm.stage).toBe('offer');
        expect(vm.eyebrow).toBe('STEP 1 OF 4');
        expect(vm.canAccept).toBe(true);
        expect(vm.canTurnIn).toBe(false);
        expect(vm.behind).toBeNull();
        expect(vm.ahead?.name).toBe('Cross the Gallows');
        expect(vm.ahead?.objectives).toEqual([
            { id: 'goal', description: 'Cross a hazard', progress: '0 of 1', done: false },
        ]);
        expect(vm.ahead?.rewards).toEqual(['+40 XP', '+10 shillings']);
    });

    it('the giver line is the node payload line, else a placeholder', () => {
        const withLine = selectQuestVM({
            quest: { ...EMPTY_QUEST_SLICE, open: { questline: FIXTURE_LINE, node: 1, description: 'Take it.' } },
            quests: base.quests,
        });
        expect(withLine.giverLine).toBe('Take it.');
        expect(selectQuestVM({ quest: slice(1), quests: base.quests }).giverLine).toContain('[content]');
    });

    it('after step 1 is accepted node 1 no longer offers ACCEPT', () => {
        const vm = selectQuestVM({ quest: slice(1), quests: startFixtureStep(base, 1) });
        expect(vm.canAccept).toBe(false);
        expect(vm.ahead?.status).toBe('active');
    });

    it('node 2 reads waiting while step 1 is accepted and unmet, with its progress', () => {
        const vm = selectQuestVM({ quest: slice(2), quests: startFixtureStep(base, 1) });
        expect(vm.stage).toBe('waiting');
        expect(vm.eyebrow).toBe('STEP 2 OF 4');
        expect(vm.behind?.name).toBe('Cross the Gallows');
        expect(vm.behind?.status).toBe('active');
        expect(vm.canAccept).toBe(false);
        expect(vm.canTurnIn).toBe(false);
    });

    it('node 2 reads turn-in once step 1 is met, and offer once it is turned in', () => {
        const ready = progressQuest(startFixtureStep(base, 1), 'Cross the Gallows', 'goal').log;
        const turnIn = selectQuestVM({ quest: slice(2), quests: ready });
        expect(turnIn.stage).toBe('turn-in');
        expect(turnIn.canTurnIn).toBe(true);
        expect(turnIn.behind?.status).toBe('ready');
        expect(turnIn.behind?.objectives[0]?.done).toBe(true);

        const offered = selectQuestVM({ quest: slice(2), quests: completeQuest(ready, 'Cross the Gallows') });
        expect(offered.stage).toBe('offer');
        expect(offered.canAccept).toBe(true);
        expect(offered.ahead?.name).toBe('Thin the Quay');
        expect(offered.ahead?.rewards).toEqual(['+40 XP', 'A pick of 3 cards']);
    });

    it('a later node reads locked while the step before it is not accepted', () => {
        const vm = selectQuestVM({ quest: slice(3), quests: base.quests });
        expect(vm.stage).toBe('locked');
        expect(vm.eyebrow).toBe('STEP 3 OF 4');
        expect(vm.canAccept).toBe(false);
        expect(vm.canTurnIn).toBe(false);
    });

    it('carries the last ledger and the waiting card offers', () => {
        const paid = { step: 1, questName: 'Cross the Gallows', experience: 40, currency: 10, itemNames: [] };
        const vm = selectQuestVM({ quest: slice(2, { paid, cardOffers: ['grey-ward'] }), quests: base.quests });
        expect(vm.paid).toBe(paid);
        expect(vm.cardOffers).toEqual(['grey-ward']);
        expect(selectHasActiveQuest({ quest: { ...EMPTY_QUEST_SLICE, cardOffers: ['grey-ward'] } })).toBe(true);
    });

    it('a card pick waiting with no node open still reaches the screen', () => {
        const vm = selectQuestVM({ quest: { ...EMPTY_QUEST_SLICE, cardOffers: ['grey-ward'] }, quests: base.quests });
        expect(vm.active).toBe(false);
        expect(vm.cardOffers).toEqual(['grey-ward']);
    });
});

describe('questRewardLine', () => {
    it('words each reward kind, and says nothing for the legacy string rewards', () => {
        const line = (r: Reward) => questRewardLine(r);
        expect(line({ kind: 'experience', amount: 5 })).toBe('+5 XP');
        expect(line({ kind: 'currency', amount: 7 })).toBe('+7 shillings');
        expect(line({ kind: 'card-pick', count: 3 })).toBe('A pick of 3 cards');
        expect(line({ kind: 'card-pick', count: 1 })).toBe('A card of your choosing');
        expect(line({ kind: 'card', cardId: 'grey-ward' })).toMatch(/^The card /);
        expect(line('experience')).toBeNull();
    });
});

/**
 * Quest screen presenter (phase QL1c): the engine's stage and step views
 * worded for the screen. Pure over a quest slice and a quest log.
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import {
    BREAKWATER_CHAPTER_QUESTLINE, BREAKWATER_CHAPTER_QUESTLINE_ID, startQuest, stepQuest,
    buildStateFromFixture, completeQuest, emptyQuestLog, getQuestline, getStateFixtureById, progressQuest,
    questlineStep, resolveMapEvent, type Reward,
} from '@mechanics';

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

    it('node 1 offers step 1: the requirement, a 0 count, no counter on a single step, no pay lines, ACCEPT', () => {
        const vm = selectQuestVM({ quest: slice(1), quests: base.quests });
        expect(vm.stage).toBe('offer');
        expect(vm.canAccept).toBe(true);
        expect(vm.canTurnIn).toBe(false);
        expect(vm.behind).toBeNull();
        expect(vm.ahead?.name).toBe('Cross the Gallows');
        expect(vm.ahead?.objectives).toEqual([
            { id: 'goal', description: 'Cross a hazard', progress: '', done: false },
        ]);
        // The panel carries no pay, but the step still owes it.
        expect(vm.ahead).not.toHaveProperty('rewards');
        const owed = questlineStep(getQuestline(FIXTURE_LINE)!, 1)!.rewards;
        expect(owed.length).toBeGreaterThan(0);
        expect(questRewardLine(owed[0]!)).toBe('+40 XP');
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
        expect(offered.ahead).not.toHaveProperty('rewards');
    });

    it('a later node reads locked while the step before it is not accepted', () => {
        const vm = selectQuestVM({ quest: slice(3), quests: base.quests });
        expect(vm.stage).toBe('locked');
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

    it('speaks the turn-in line at turn-in and once paid, and the description at the other stages', () => {
        const open = { questline: FIXTURE_LINE, node: 2, description: 'Wait for it.', turnInLine: 'It is done.' };
        const withLines = (extra: Partial<MobileQuestSlice> = {}): MobileQuestSlice => ({ ...EMPTY_QUEST_SLICE, open, ...extra });
        const held = startFixtureStep(base, 1);
        const ready = progressQuest(held, 'Cross the Gallows', 'goal').log;

        expect(selectQuestVM({ quest: withLines(), quests: base.quests }).giverLine).toBe('Wait for it.');
        expect(selectQuestVM({ quest: withLines(), quests: held }).giverLine).toBe('Wait for it.');
        expect(selectQuestVM({ quest: withLines(), quests: ready }).giverLine).toBe('It is done.');
        const paid = { step: 1, questName: 'Cross the Gallows', experience: 40, currency: 0, itemNames: [] };
        expect(selectQuestVM({ quest: withLines({ paid }), quests: completeQuest(ready, 'Cross the Gallows') }).giverLine).toBe('It is done.');

        const plain = { questline: FIXTURE_LINE, node: 2, description: 'Wait for it.' };
        expect(selectQuestVM({ quest: { ...EMPTY_QUEST_SLICE, open: plain }, quests: ready }).giverLine).toBe('Wait for it.');
    });

    it("the staged quest-paid state (wanderer-bw-bridge-paid, no ledger) speaks C-04's turn-in line at the bridge", () => {
        const fixture = getStateFixtureById('wanderer-bw-bridge-paid')!;
        const result = resolveMapEvent(buildStateFromFixture(fixture));
        const event = result.event;
        if (event.kind !== 'quest') throw new Error('expected a quest node at bw-b1');
        expect(event.stage).toBe('offer');
        const vm = selectQuestVM({
            quest: {
                ...EMPTY_QUEST_SLICE,
                open: {
                    questline: event.questline, node: event.node, description: event.description,
                    turnInLine: event.turnInLine, giver: event.giver,
                },
            },
            quests: result.state.quests,
        });
        expect(vm.paid).toBeNull();
        expect(vm.giverLine).toBe(
            "Tolliver Pease says, Well. He is done, then. I heard it in the chain, it has gone slack as a widow's purse. Cross. No charge. There is no one left to charge it to.",
        );
    });

    it('(a) keeps the description at stage offer while a step is ahead, even with a turn-in line and no ledger', () => {
        const line = BREAKWATER_CHAPTER_QUESTLINE;
        const quests = completeQuest(emptyQuestLog(), line.steps[0]!.quest.name);
        const vm = selectQuestVM({
            quest: {
                ...EMPTY_QUEST_SLICE,
                open: { questline: BREAKWATER_CHAPTER_QUESTLINE_ID, node: 2, description: 'Given line.', turnInLine: 'Ends line.' },
            },
            quests,
        });
        expect(vm.stage).toBe('offer');
        expect(vm.ahead).not.toBeNull();
        expect(vm.paid).toBeNull();
        expect(vm.giverLine).toBe('Given line.');
    });

    it('(b) keeps the description at the chain end while the step behind is unmet (waiting)', () => {
        const line = BREAKWATER_CHAPTER_QUESTLINE;
        const quests = startQuest(emptyQuestLog(), stepQuest(line, line.steps[3]!));
        const vm = selectQuestVM({
            quest: {
                ...EMPTY_QUEST_SLICE,
                open: { questline: BREAKWATER_CHAPTER_QUESTLINE_ID, node: 5, description: '[content] The River Bridge.', turnInLine: 'Ends line.' },
            },
            quests,
        });
        expect(vm.stage).toBe('waiting');
        expect(vm.giverLine).toBe('[content] The River Bridge.');
    });

    it('(c) with no quest slice it does not throw and shows nothing; with a slice and no ledger it shows the description', () => {
        const none = selectQuestVM({ quest: undefined as never, quests: base.quests });
        expect(none.active).toBe(false);
        expect(none.giverLine).toBe('');
        const open = { questline: FIXTURE_LINE, node: 1, description: 'Take it.', turnInLine: 'Done.' };
        const vm = selectQuestVM({ quest: { ...EMPTY_QUEST_SLICE, open, paid: null }, quests: base.quests });
        expect(vm.paid).toBeNull();
        expect(vm.giverLine).toBe('Take it.');
    });

    it('(d) a node with no turn-in line shows its description at stage turn-in', () => {
        const ready = progressQuest(startFixtureStep(base, 1), 'Cross the Gallows', 'goal').log;
        const vm = selectQuestVM({
            quest: { ...EMPTY_QUEST_SLICE, open: { questline: FIXTURE_LINE, node: 2, description: 'Wait for it.' } },
            quests: ready,
        });
        expect(vm.stage).toBe('turn-in');
        expect(vm.giverLine).toBe('Wait for it.');
    });

    it('a node without a turn-in line keeps its description at every stage', () => {
        const plain = { questline: FIXTURE_LINE, node: 2, description: 'Wait for it.' };
        const ready = progressQuest(startFixtureStep(base, 1), 'Cross the Gallows', 'goal').log;
        for (const quests of [base.quests, startFixtureStep(base, 1), ready, completeQuest(ready, 'Cross the Gallows')]) {
            expect(selectQuestVM({ quest: { ...EMPTY_QUEST_SLICE, open: plain }, quests }).giverLine).toBe('Wait for it.');
        }
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

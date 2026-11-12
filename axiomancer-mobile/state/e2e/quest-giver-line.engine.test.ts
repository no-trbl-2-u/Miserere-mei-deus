/**
 * Hermetic E2E - the quest screen's giver line by stage on the live Breakwater.
 * Each case boots a store on the real node, opens
 * the screen through the real path (`resolveCurrentMapEvent` ->
 * `openQuestScreenAction`) and reads the presenter's `giverLine`, so a
 * `turnInLine` dropped anywhere along the way turns the case red.
 *
 * The lines are the approved ledger's (plan/ballots/narrator-chapter1.md): the
 * C-01 and C-02 "Ends" lines, the C-02 and C-03 "Given" lines.
 */

import { describe, expect, it } from '@jest/globals';

import {
    BREAKWATER_CHAPTER_QUESTLINE as LINE, BREAKWATER_CHAPTER_QUESTLINE_ID, stepQuest,
    type GameState, type QuestLog,
} from '@mechanics';

import { selectQuestVM } from '@/state/presenters/quest.engine';
import { arriveFromFixture, createFixtureStore } from '@/test-utils/fixtureStore';

const C01_ENDS = "Abel Corse says, Seven living. Tell her that her brother is one of the seven. Tell her the master is not.";
const C02_GIVEN = "Abel Corse says, Ask the man in the tower who lit it. The master would know that much.";
const C02_ENDS = "Enoch Marrable says, Entered as lit. It was not lit. Your man saw the sea door under the keep, standing open, and the light of it laid along the head. They paid me a key when they took the lamp. I have not used it.";
const C03_GIVEN = "Enoch Marrable says, Take it. I will enter it as lost overboard.";
const C04_ENDS = "Tolliver Pease says, Well. He is done, then. I heard it in the chain, it has gone slack as a widow's purse. Cross. No charge. There is no one left to charge it to.";

const step = (n: number) => LINE.steps[n - 1]!;
const completed = (...steps: number[]): QuestLog['completed'] => steps.map(n => step(n).quest.name);

/** A store on `node` holding `active` steps and `done` steps, its arrival played and the screen open. */
function openAt(node: string, active: number[], done: number[]) {
    const handle = createFixtureStore({
        id: `giver-line-${node}`,
        seed: `giver-line-${node}`,
        preset: 'wanderer',
        world: { continent: 'coastal-continent', map: 'breakwater', node },
    });
    const { store } = handle;
    store.setState({
        quests: { available: [], active: active.map(n => stepQuest(LINE, step(n))), completed: completed(...done) },
    } as never);
    expect(arriveFromFixture(handle)).toBe(true);
    expect(store.getState().quest.open).toMatchObject({ questline: BREAKWATER_CHAPTER_QUESTLINE_ID });
    return handle;
}

const vmOf = (store: ReturnType<typeof createFixtureStore>['store']) => selectQuestVM(store.getState());
const gs = (store: ReturnType<typeof createFixtureStore>['store']) => store.getState() as unknown as GameState;

describe('bw-c2, the fishermen camp', () => {
    it('hands in step 1 and offers step 2: the turn-in line, a blank line, then the offer line', () => {
        const { store, actions } = openAt('bw-c2', [1], []);
        expect(vmOf(store).stage).toBe('turn-in');
        expect(vmOf(store).giverLine).toBe(C01_ENDS);
        expect(actions.turnInQuestStep()).toBe(true);
        expect(vmOf(store).canAccept).toBe(true);
        expect(vmOf(store).giverLine).toBe(`${C01_ENDS}\n\n${C02_GIVEN}`);
    });

    it('after ACCEPT the offer line speaks alone', () => {
        const { store, actions } = openAt('bw-c2', [1], []);
        expect(actions.turnInQuestStep()).toBe(true);
        expect(actions.acceptQuestStep()).toBe(true);
        expect(gs(store).quests.active.map(q => q.name)).toEqual([step(2).quest.name]);
        expect(vmOf(store).canAccept).toBe(false);
        expect(vmOf(store).giverLine).toBe(C02_GIVEN);
    });

    it('a later visit with step 2 still on offer and no ledger speaks the offer line alone', () => {
        const { store } = openAt('bw-c2', [], [1]);
        expect(vmOf(store).stage).toBe('offer');
        expect(vmOf(store).paid).toBeNull();
        expect(vmOf(store).giverLine).toBe(C02_GIVEN);
    });
});

describe('bw-l5, the lighthouse (step 2 settles on arrival)', () => {
    it('arrival pays step 2 and offers step 3: the turn-in line, a blank line, then the offer line', () => {
        const { store } = openAt('bw-l5', [2], [1]);
        expect(gs(store).quests.completed).toContain(step(2).quest.name);
        expect(vmOf(store).stage).toBe('offer');
        expect(vmOf(store).paid).not.toBeNull();
        expect(vmOf(store).giverLine).toBe(`${C02_ENDS}\n\n${C03_GIVEN}`);
    });

    it('after ACCEPT the offer line speaks alone', () => {
        const { store, actions } = openAt('bw-l5', [2], [1]);
        expect(actions.acceptQuestStep()).toBe(true);
        expect(vmOf(store).giverLine).toBe(C03_GIVEN);
    });
});

describe('bw-b1, the river bridge', () => {
    it('waits on the placeholder while the master lives', () => {
        const { store } = openAt('bw-b1', [4], [1, 2, 3]);
        expect(vmOf(store).stage).toBe('waiting');
        expect(vmOf(store).giverLine).toBe('[content] The River Bridge.');
    });

    it('hands in step 4 and speaks the turn-in line alone, there being no step ahead', () => {
        const handle = createFixtureStore({
            id: 'giver-line-bw-b1-ready', seed: 'giver-line-bw-b1-ready', preset: 'wanderer',
            world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-b1' },
        });
        const held = stepQuest(LINE, step(4));
        handle.store.setState({
            quests: {
                available: [],
                active: [{ ...held, objectives: held.objectives.map(o => ({ ...o, currentCount: o.requiredCount })) }],
                completed: completed(1, 2, 3),
            },
        } as never);
        expect(arriveFromFixture(handle)).toBe(true);
        expect(vmOf(handle.store).stage).toBe('turn-in');
        expect(vmOf(handle.store).giverLine).toBe(C04_ENDS);
        expect(handle.actions.turnInQuestStep()).toBe(true);
        expect(vmOf(handle.store).giverLine).toBe(C04_ENDS);
    });
});

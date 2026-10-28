/**
 * The questline registry and step views (phase QL1c: mutation gaps left by
 * QL1b in `World/questline.ts`).
 *
 * Pins the registry (register, replace, list in order, unregister), how a step
 * is shown in each state of the log (`questStepView`), what `stepQuest` stamps,
 * the stage of a node whose questline is unknown, and that accepting a step
 * moves its offer out of the log's `available` list.
 */

import { afterEach, describe, expect, it } from 'vitest';

import {
    registerQuestline, _unregisterQuestline, getQuestline, listQuestlines, questlineStep,
    questNodeStage, questStepView, stepQuest, questStepState, acceptQuestStep,
    type Questline, type QuestlineStep,
} from '../questline';
import { emptyQuestLog, progressQuest, startQuest, completeQuest } from '../quest.engine';
import { createNewGameState } from '../../Game/game.reducer';
import { placeOnNode } from '../world.reducer';
import type { Quest, QuestObjective, Reward } from '../types';
import type { GameState } from '../../Game/types';

const XP: Reward = { kind: 'experience', amount: 40 };
const COIN: Reward = { kind: 'currency', amount: 10 };

function objective(o: Partial<QuestObjective> = {}): QuestObjective {
    return { id: 'goal', type: 'kill', description: 'fixture', requiredCount: 2, currentCount: 0, ...o };
}

function quest(name: string, reward: Reward = 'quest'): Quest {
    return { name, description: name, mapName: 'breakwater', objectives: [objective()], reward, status: 'available' };
}

function step(n: number, nodeId: string, rewards: Reward[], extra: Partial<QuestlineStep> = {}): QuestlineStep {
    return { step: n, nodeId, quest: quest(`ql1c-reg-step-${n}`), rewards, settle: 'turn-in', ...extra };
}

function line(id: string, steps: QuestlineStep[]): Questline {
    return { id, mapName: 'breakwater', steps };
}

const A = 'ql1c-reg-a';
const B = 'ql1c-reg-b';

afterEach(() => {
    _unregisterQuestline(A);
    _unregisterQuestline(B);
});

describe('the registry', () => {
    it('registers, reads back, lists in registration order, and unregisters', () => {
        const a = line(A, [step(1, 'bw-1', [XP])]);
        const b = line(B, [step(1, 'bw-2', [XP])]);
        const before = listQuestlines().length;
        registerQuestline(a);
        registerQuestline(b);
        expect(getQuestline(A)).toBe(a);
        expect(getQuestline(B)).toBe(b);
        const listed = listQuestlines();
        expect(listed.length).toBe(before + 2);
        expect(listed.indexOf(a)).toBeLessThan(listed.indexOf(b));

        _unregisterQuestline(A);
        expect(getQuestline(A)).toBeUndefined();
        expect(getQuestline(B)).toBe(b);
        expect(listQuestlines()).not.toContain(a);
    });

    it('registering the same id again replaces it (last write wins), without duplicating', () => {
        const first = line(A, [step(1, 'bw-1', [XP])]);
        const second = line(A, [step(1, 'bw-2', [COIN])]);
        const before = listQuestlines().length;
        registerQuestline(first);
        registerQuestline(second);
        expect(getQuestline(A)).toBe(second);
        expect(listQuestlines().length).toBe(before + 1);
    });

    it('questlineStep finds a step by its number and nothing for a number the line lacks', () => {
        const l = line(A, [step(1, 'bw-1', [XP]), step(2, 'bw-2', [XP])]);
        expect(questlineStep(l, 2)?.nodeId).toBe('bw-2');
        expect(questlineStep(l, 3)).toBeUndefined();
        expect(questlineStep(l, 0)).toBeUndefined();
    });
});

describe('stepQuest', () => {
    it('stamps the line, step and map, zeroes the counts, splits the rewards and holds a turn-in step', () => {
        const l = line(A, [step(1, 'bw-1', [XP, COIN])]);
        const s = l.steps[0]!;
        const dirty: QuestlineStep = { ...s, quest: { ...s.quest, objectives: [objective({ currentCount: 2 })] } };
        const fresh = stepQuest(l, dirty);
        expect(fresh).toMatchObject({
            questline: A, step: 1, mapName: 'breakwater', holdForTurnIn: true, status: 'available',
            reward: XP, rewards: [COIN],
        });
        expect(fresh.objectives[0]?.currentCount).toBe(0);
    });

    it('an on-victory step is not held for turn-in', () => {
        const l = line(A, [step(1, 'bw-1', [XP], { settle: 'on-victory' })]);
        expect(stepQuest(l, l.steps[0]!).holdForTurnIn).toBe(false);
    });

    it("a step with no rewards keeps the quest's own reward", () => {
        const s = step(1, 'bw-1', []);
        const own: QuestlineStep = { ...s, quest: quest('ql1c-reg-own', COIN) };
        const fresh = stepQuest(line(A, [own]), own);
        expect(fresh.reward).toBe(COIN);
        expect(fresh.rewards).toBeUndefined();
    });
});

describe('questStepView', () => {
    const l = line(A, [step(1, 'bw-1', [XP, COIN])]);
    const s = l.steps[0]!;

    it('an unaccepted step shows the quest it would start as, counts at 0', () => {
        const view = questStepView(emptyQuestLog(), l, s);
        expect(view).toEqual(stepQuest(l, s));
        expect(view.status).toBe('available');
    });

    it("an active step shows the log's own quest with its progress", () => {
        const started = startQuest(emptyQuestLog(), stepQuest(l, s));
        const log = progressQuest(started, s.quest.name, 'goal').log;
        const view = questStepView(log, l, s);
        expect(view.objectives[0]?.currentCount).toBe(1);
        expect(view).toBe(log.active[0]);
    });

    it('a completed step shows every count full and the completed status', () => {
        let log = startQuest(emptyQuestLog(), stepQuest(l, s));
        log = progressQuest(progressQuest(log, s.quest.name, 'goal').log, s.quest.name, 'goal').log;
        const done = questStepView(completeQuest(log, s.quest.name), l, s);
        expect(done.status).toBe('completed');
        expect(done.objectives[0]).toMatchObject({ currentCount: 2, requiredCount: 2 });
        expect(done.reward).toBe(XP);
    });
});

describe('questNodeStage with an unknown questline', () => {
    it('reads node 1 as offer and every later node as locked', () => {
        const log = emptyQuestLog();
        expect(questNodeStage(log, 'no-such-line', 1)).toBe('offer');
        expect(questNodeStage(log, 'no-such-line', 2)).toBe('locked');
        expect(questNodeStage(log, 'no-such-line', 4)).toBe('locked');
    });

    it('a node past the end of a known line reads locked', () => {
        registerQuestline(line(A, [step(1, 'bw-1', [XP])]));
        expect(questNodeStage(emptyQuestLog(), A, 2)).toBe('locked');
    });
});

describe('acceptQuestStep and the log offer', () => {
    it("moves the step's offer out of `available` into `active`", () => {
        const l = line(A, [step(1, 'bw-1', [XP])]);
        registerQuestline(l);
        const base = createNewGameState({ startMap: 'breakwater' });
        const onNode: GameState = { ...base, world: placeOnNode(base.world, 'bw-1') };
        const offered: GameState = {
            ...onNode,
            quests: { ...onNode.quests, available: [stepQuest(l, l.steps[0]!), quest('ql1c-reg-other')] },
        };

        const accepted = acceptQuestStep(offered, A, 1);

        expect(accepted.quests.available.map(q => q.name)).toEqual(['ql1c-reg-other']);
        expect(accepted.quests.active.map(q => q.name)).toEqual(['ql1c-reg-step-1']);
        expect(questStepState(accepted.quests, l.steps[0]!)).toBe('active');
    });
});

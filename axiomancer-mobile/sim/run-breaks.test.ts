/**
 * The sim batch's breaks (phase SM2d, A9): a crash, a stuck run and a stuck
 * fight each become a recorded break with a key and a state summary while the
 * batch goes on; the end-of-run checks come back as findings, never thrown.
 * Nothing here asserts a sim number.
 */

import { BREAKWATER_CHAPTER_QUESTLINE_ID, WANDERER_POLICY, type Quest, type RunPolicy } from '@mechanics';

import { runLogPoster } from '@/lib/runLog';
import type { AppStoreState } from '@/state/store';

import { breakKey, detailOf, tapRunEvents } from './run-breaks';
import { playRun } from './run-driver';
import { RunCrashError, RunStuckError } from './run-stuck';
import { breaksOf, playRuns } from './sim-runs';

describe('the break key', () => {
    it('is persona, map, node and kind', () => {
        expect(breakKey('rusher', 'breakwater', 'bw-t3', 'stuck')).toBe('rusher:breakwater/bw-t3:stuck');
    });
});

describe('breaks in the batch', () => {
    it('records a stuck run as a break with its state summary and plays the next seed', () => {
        const lost: RunPolicy = { ...WANDERER_POLICY, chooseRoad: () => null };
        const runs = playRuns(lost, { runs: 2, seed: 1, build: 'abc' }, (options) => playRun(options));
        expect(runs).toHaveLength(2);
        const breaks = breaksOf(runs, 'abc');
        expect(breaks).toHaveLength(2);
        expect(breaks[0]).toMatchObject({
            key: 'wanderer:breakwater/bw-w1:stuck',
            kind: 'stuck',
            persona: 'wanderer',
            seed: 1,
            build: 'abc',
            state: { map: 'breakwater', node: 'bw-w1', screen: 'map' },
        });
        expect(breaks[0]!.state.deckSize).toBeGreaterThan(0);
        expect(Array.isArray(breaks[0]!.state.lastEvents)).toBe(true);
    });

    it('records an exception out of a step as a crash', () => {
        const boom: RunPolicy = { ...WANDERER_POLICY, chooseRoad: () => { throw new Error('boom'); } };
        const [run] = playRuns(boom, { runs: 1, seed: 1 }, (options) => playRun(options));
        expect(run).toMatchObject({ stuck: true, kind: 'crash', node: 'bw-w1' });
        expect((run as { break: { message: string } }).break.message).toMatch(/boom/);
        expect(() => playRun({ policy: boom, seed: 1 })).toThrow(RunCrashError);
    });

    it('records a stuck fight as fight-stuck', () => {
        const [run] = playRuns(WANDERER_POLICY, { runs: 1, seed: 1 }, () => {
            throw Object.assign(new RunStuckError('fight did not end', {
                map: 'breakwater', node: 'bw-w2', health: 1, maxHealth: 2, level: 1, screen: 'fight', step: 4,
            }), { kind: 'fight-stuck' as const });
        });
        expect(run).toMatchObject({ stuck: true, kind: 'fight-stuck', node: 'bw-w2' });
    });

    it('lets an error the driver does not throw through', () => {
        expect(() => playRuns(WANDERER_POLICY, { runs: 1, seed: 1 }, () => { throw new TypeError('not a break'); })).toThrow(TypeError);
    });

    it('finds no break in a run that plays through (the end-of-run checks stay quiet)', () => {
        const result = playRun({ policy: WANDERER_POLICY, seed: 2 });
        expect(result.findings).toEqual([]);
        expect(breaksOf([result], null)).toEqual([]);
    });
});

describe('the end-of-run checks fire', () => {
    it('files node-unresolved when a fight is entered and left without resolving', () => {
        let dropped = false;
        const result = playRun({
            policy: WANDERER_POLICY,
            seed: 2,
            onStep: (store) => {
                const pending = store.getState().event?.pending;
                if (dropped || pending?.event.kind !== 'encounter') return;
                dropped = true;
                // The player walks away from the staged fight: the arrival is answered, nothing resolves it.
                const world = store.getState().world;
                store.setState({
                    event: { ...store.getState().event, pending: null },
                    currentEncounter: null,
                    world: { ...world, currentMap: { ...world.currentMap, pendingArrival: null } },
                } as never);
            },
        });
        expect(dropped).toBe(true);
        const found = result.findings.filter((f) => f.kind === 'node-unresolved');
        expect(found).toHaveLength(1);
        expect(found[0]).toMatchObject({ node: 'bw-w2', state: { map: 'breakwater', node: 'bw-w2' } });
        const [line] = breaksOf([result], 'abc');
        expect(line).toMatchObject({ key: 'wanderer:breakwater/bw-w2:node-unresolved', kind: 'node-unresolved', build: 'abc' });
        expect(line!.state.lastEvents.length).toBeGreaterThan(0);
    });

    it('files quest-unfinishable when a chapter clear leaves an accepted quest no road reaches', () => {
        let planted = false;
        const stranded = {
            name: 'stranded', description: '', mapName: 'breakwater', reward: 'quest', status: 'active',
            questline: BREAKWATER_CHAPTER_QUESTLINE_ID, step: 1,
            objectives: [{ id: 'o', type: 'reach', target: 'bw-nowhere', description: '', requiredCount: 1, currentCount: 0 }],
        } as unknown as Quest;
        const result = playRun({
            policy: WANDERER_POLICY,
            seed: 2,
            onStep: (store) => {
                const here = store.getState().world.currentMap.currentNode;
                if (planted || (here !== 'bw-b1' && here !== 'bw-b2')) return;
                planted = true;
                const quests = store.getState().quests;
                store.setState({ quests: { ...quests, active: [...quests.active, stranded] } } as never);
            },
        });
        expect(planted).toBe(true);
        expect(result.outcome).toBe('chapter-clear');
        const found = result.findings.filter((f) => f.kind === 'quest-unfinishable');
        expect(found).toHaveLength(1);
        expect(found[0]!.message).toMatch(/stranded.*bw-nowhere/);
        const lines = breaksOf([result], null);
        expect(lines.map((b) => b.kind)).toContain('quest-unfinishable');
        expect(lines.find((b) => b.kind === 'quest-unfinishable')).toMatchObject({ persona: 'wanderer', seed: 2, build: null });
    });
});

describe('the event tap', () => {
    it('records every event past the shut play-log gate, keeps the last ten, and reports resolved nodes', () => {
        const tap = tapRunEvents();
        try {
            const resolved: string[] = [];
            tap.onResolved = (id) => resolved.push(id);
            for (let i = 0; i < 12; i++) runLogPoster.event('r', 'node-entered', { map: 'breakwater', nodeId: `n${i}`, nodeKind: null });
            runLogPoster.event('r', 'node-resolved', { nodeId: 'n11', nodeKind: 'rest', choice: 'rest' });
            expect(tap.recent).toHaveLength(10);
            expect(tap.recent[0]).toBe('node-entered nodeId=n3');
            expect(tap.recent[9]).toBe('node-resolved nodeId=n11 choice=rest');
            expect(resolved).toEqual(['n11']);
        } finally {
            tap.restore();
        }
    });

    it('puts the app\'s poster back on restore, so later events are not recorded', () => {
        const tap = tapRunEvents();
        tap.restore();
        runLogPoster.event('r', 'node-entered', { map: 'breakwater', nodeId: 'late', nodeKind: null });
        expect(tap.recent).toEqual([]);
    });
});

describe('detailOf', () => {
    const quest = (name: string, objectives: object[]) => ({ name, objectives }) as unknown as Quest;

    it('names each active quest\'s next step and passes the deck size and recent events through', () => {
        const state = {
            quests: {
                available: [],
                completed: [],
                active: [
                    quest('reach one', [{ type: 'reach', target: 'bw-l5', requiredCount: 1, currentCount: 0 }]),
                    quest('kill any boss', [{ type: 'kill', foeClass: 'boss', requiredCount: 2, currentCount: 1 }]),
                    quest('done', [{ type: 'reach', target: 'bw-x', requiredCount: 1, currentCount: 1 }]),
                ],
            },
        } as unknown as AppStoreState;
        const detail = detailOf(state, 21, ['a', 'b']);
        expect(detail.deckSize).toBe(21);
        expect(detail.lastEvents).toEqual(['a', 'b']);
        expect(detail.quests).toEqual([
            { name: 'reach one', next: 'reach bw-l5 0/1' },
            { name: 'kill any boss', next: 'kill boss 1/2' },
            { name: 'done', next: 'turn in' },
        ]);
    });
});

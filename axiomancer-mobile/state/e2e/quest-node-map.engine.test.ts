/**
 * The quest node on the map (phase QL1c, A12).
 *
 * The `quest` kind wears NodeType `quest` (label QUEST, the scroll); the story
 * kinds (cutscene, narration, interaction) moved to `story` (label STORY, the
 * quill), so the windmill's cutscene (bw-1) no longer reads QUEST. The map
 * shows NO step state: a quest node's marker and selection panel are the same
 * with a step accepted, ready or absent.
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { createStartingWorld, type GameState } from '@mechanics';
import { registerMapEventPool, setNodeEventPoolOverride } from '@mechanics/World/MapEvents/resolve-map-event';

import { createAppActions } from '@/state/actions';
import { createAppStore, type AppStore } from '@/state/store';
import { ACTION_ICON_BY_TYPE, NODE_KIND_LABEL, selectExplorationViewModel } from '@/state/presenters/exploration.engine';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import {
    FIXTURE_LINE,
    acceptFixtureStep,
    fillFixtureStep,
    registerFixtureQuestline,
    unregisterFixtureQuestline,
} from '@/test-utils/questlineFixture';

beforeAll(() => {
    registerFixtureQuestline();
    // bw-5 is a quest node for this file only (jest isolates each file's modules).
    registerMapEventPool({
        id: 'ql1c.map.bw-5',
        entries: [{ kind: 'quest', weight: 1, payload: { kind: 'quest', questline: FIXTURE_LINE, node: 2 } }],
    });
    setNodeEventPoolOverride('coastal-continent', 'breakwater', 'bw-5', 'ql1c.map.bw-5');
});
afterAll(() => { unregisterFixtureQuestline(); });

function breakwater(): AppStore {
    return createAppStore({ adapter: createMemoryAdapter(), overrides: { world: createStartingWorld('breakwater') } });
}

function nodeOf(store: AppStore, id: string) {
    const vm = selectExplorationViewModel(store.getState());
    return { node: vm.nodes.find(n => n.id === id)!, option: vm.options.find(o => o.nodeId === id) ?? null, vm };
}

describe('node types and labels (A12)', () => {
    it('the quest kind is NodeType quest: QUEST and the scroll', () => {
        const { node } = nodeOf(breakwater(), 'bw-5');
        expect(node.type).toBe('quest');
        expect(NODE_KIND_LABEL.quest).toBe('QUEST');
        expect(ACTION_ICON_BY_TYPE.quest).toBe('scroll');
    });

    it('the windmill cutscene (bw-1) is STORY and the quill, no longer QUEST', () => {
        const { node } = nodeOf(breakwater(), 'bw-1');
        expect(node.type).toBe('story');
        expect(NODE_KIND_LABEL[node.type]).toBe('STORY');
        expect(ACTION_ICON_BY_TYPE[node.type]).toBe('quill');
    });
});

describe('the map shows no step state (A12)', () => {
    function snapshot(store: AppStore) {
        const { node, option } = nodeOf(store, 'bw-5');
        return JSON.stringify({ node, option });
    }

    it('a quest node reads the same with no step, an accepted step and a ready step', () => {
        const store = breakwater();
        const none = snapshot(store);

        acceptFixtureStep(store, 1);
        expect(snapshot(store)).toBe(none);

        fillFixtureStep(store, 1);
        expect((store.getState() as unknown as GameState).quests.active[0]?.objectives[0]?.currentCount).toBe(1);
        expect(snapshot(store)).toBe(none);
    });

    it('the marker and the panel carry no step number, count or READY', () => {
        const store = breakwater();
        acceptFixtureStep(store, 1);
        fillFixtureStep(store, 1);
        const text = JSON.stringify(nodeOf(store, 'bw-5'));
        expect(text).not.toMatch(/\bstep\b/i);
        expect(text).not.toMatch(/\bready\b/i);
        expect(text).not.toMatch(/\d+\s*(of|\/)\s*\d+/i);
    });
});

describe('walking onto a quest node does not spend it', () => {
    it('moveTo leaves the quest node uncompleted and unconsumed; only accepting its step spends it', () => {
        const store = breakwater();
        const actions = createAppActions(store);
        expect(actions.moveTo('bw-5').moved).toBe(true);
        actions.resolveCurrentMapEvent('quest');
        const map = store.getState().world.currentMap;
        expect(map.completedNodes).not.toContain('bw-5');
        expect(map.consumedNodes).not.toContain('bw-5');
        expect(store.getState().quest.open).toMatchObject({ node: 2 });
    });
});

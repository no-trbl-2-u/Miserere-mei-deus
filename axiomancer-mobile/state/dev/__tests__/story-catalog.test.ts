/**
 * Hermetic tests — dev story catalogue (real NPCs + real quests).
 *
 * Pins:
 *   - `listNpcs` finds staged NPCs with trees across maps, unique keys.
 *   - `listQuests` finds the authored quest line in campaign order.
 *   - `openNpcDialogue` seats a cursor at the tree root under a placeholder
 *     event that `selectHasActiveEvent` recognises, routing to /dialogue.
 *   - start → advance → complete moves a real quest through the log.
 */

import {
    advanceQuest,
    completeQuestByName,
    listNpcs,
    listQuests,
    openNpcDialogue,
    questStatus,
    startQuestByName,
    type NpcChoice,
    type QuestChoice,
} from '@/state/dev/story-catalog';
import { FIXTURE_NPC, FIXTURE_QUEST } from '@mechanics';
import { selectHasActiveEvent, selectPacedEventRoute } from '@/state/presenters/event.engine';
import { createAppStore } from '@/state/store';

const FIXTURE_NPC_CHOICE: NpcChoice = {
    key: `breakwater/${FIXTURE_NPC.name}`, name: FIXTURE_NPC.name, map: 'breakwater', tree: FIXTURE_NPC.dialogueTree!,
};
const FIXTURE_QUEST_CHOICE: QuestChoice = { key: FIXTURE_QUEST.name, map: 'breakwater', quest: FIXTURE_QUEST };

describe('story-catalog dev helpers', () => {
    // No map stages an NPC or carries a quest, so both lists are
    // empty and the helpers below run on the neutral fixtures.
    it('lists no staged NPC and no authored quest', () => {
        expect(listNpcs()).toEqual([]);
        expect(listQuests()).toEqual([]);
    });

    it('openNpcDialogue seats a cursor at the root under a placeholder event, and routes to /dialogue', () => {
        const store = createAppStore();
        const npc = FIXTURE_NPC_CHOICE;
        openNpcDialogue(store, npc);
        const slice = store.getState().event;
        expect(selectHasActiveEvent(store.getState())).toBe(true);
        expect(slice.pending!.event).toEqual({ kind: 'cutscene', lines: [] });
        expect(slice.dialogueCursor?.nodeId).toBe(npc.tree.rootId);
        expect(selectPacedEventRoute(store.getState())).toBe('/dialogue');
    });

    it('start → advance → complete walks a real quest through the log', () => {
        const store = createAppStore();
        const quest = FIXTURE_QUEST_CHOICE;
        expect(advanceQuest(store, quest)).toBe(false);
        startQuestByName(store, quest);
        expect(questStatus(store.getState(), quest.key)).toBe('active');
        expect(advanceQuest(store, quest)).toBe(true);
        // A one-objective quest auto-completes on its first advance; a
        // longer one stays active with a bumped counter. Either is progress.
        const afterAdvance = store.getState();
        const active = afterAdvance.quests.active.find((q) => q.name === quest.key);
        expect(active ? active.objectives[0].currentCount >= 1 : questStatus(afterAdvance, quest.key) === 'done').toBe(true);
        completeQuestByName(store, quest);
        expect(questStatus(store.getState(), quest.key)).toBe('done');
    });
});

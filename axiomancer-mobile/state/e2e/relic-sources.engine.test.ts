/**
 * Relic sources reach the item-reward screen (phase LR1c, A7 of the LR1 brief).
 *
 * A relic a completed quest pays, and the relic a won elite fight drops, are
 * queued on `state.itemReward` (TO THE SATCHEL / WEAR IT NOW) with an eyebrow
 * naming the source, and are not ALSO left in the satchel: the screen's
 * commit is the one grant. One store test per source path: a kill
 * (`endCombat`), a reach on arrival (`resolveCurrentMapEvent`, including a
 * host that restores the pre-event player), a dialogue choice
 * (`pickEventChoice`), and the elite drop (queued after the card draft).
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
    COMBAT_REWARD_POOL,
    ENEMY_REGISTRY,
    FIXTURE_CUTSCENE_EVENT,
    FIXTURE_ELITE_RELICS,
    FIXTURE_QUEST,
    FIXTURE_QUEST_RELIC,
    emptyQuestLog,
    startQuest,
} from '@mechanics';
import type { DialogueTree, GameState, Quest, QuestObjective } from '@mechanics';

type Reward = Quest['reward'];

import { createAppActions } from '@/state/actions';
import { claimCombatRewardAction, rollCombatRewardAction } from '@/state/combat/store-actions';
import { confirmItemRewardAction } from '@/state/item-reward/store-actions';
import { eliteDropSource, questRewardSource } from '@/state/presenters/relic-source.copy';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

afterEach(() => {
    jest.restoreAllMocks();
});

const FOE = ENEMY_REGISTRY['death-beholder'];
const RELIC_REWARD: Reward = { kind: 'item', item: FIXTURE_QUEST_RELIC };

function quest(objective: Partial<QuestObjective>, reward: Reward = RELIC_REWARD): Quest {
    return { ...FIXTURE_QUEST, objectives: [{ ...FIXTURE_QUEST.objectives[0]!, ...objective }], reward };
}

function gs(store: AppStore): GameState {
    return store.getState() as unknown as GameState;
}

/** A fresh store with `q` active and the player standing on `nodeId`. */
function storeWith(q: Quest, nodeId?: string): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const state = gs(store);
    const world = nodeId
        ? { ...state.world, currentMap: { ...state.world.currentMap, currentNode: nodeId } }
        : state.world;
    store.setState({ quests: startQuest(emptyQuestLog(), q), world } as never);
    return store;
}

function relicsInSatchel(store: AppStore): number {
    return gs(store).player.inventory.filter(i => i.id === FIXTURE_QUEST_RELIC.id).length;
}

function expectQuestRelicQueued(store: AppStore, q: Quest): void {
    const queue = store.getState().itemReward.queue;
    expect(queue.map(e => e.item.id)).toEqual([FIXTURE_QUEST_RELIC.id]);
    expect(queue[0]!.source).toBe(questRewardSource(q.name));
    // Not also paid inline: CONFIRM is the one grant.
    expect(relicsInSatchel(store)).toBe(0);
    confirmItemRewardAction(store);
    expect(relicsInSatchel(store)).toBe(1);
}

describe('a quest relic reaches the item-reward screen', () => {
    it('from a kill: endCombat completes the quest and queues its relic', () => {
        const q = quest({ id: 'kill-foe', type: 'kill', target: FOE.name });
        const store = storeWith(q);
        const actions = createAppActions(store);
        actions.startCombat(FOE);
        actions.endCombat('victory');
        expect(gs(store).quests.completed).toContain(q.name);
        expectQuestRelicQueued(store, q);
    });

    it('from a reach on arrival: the event resolve queues the relic', () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        const here = gs(store).world.currentMap.currentNode;
        const q = quest({ id: 'reach-here', type: 'reach', target: here });
        const seeded = storeWith(q, here);
        createAppActions(seeded).resolveCurrentMapEvent(undefined, FIXTURE_CUTSCENE_EVENT);
        expect(gs(seeded).quests.completed).toContain(q.name);
        expectQuestRelicQueued(seeded, q);
    });

    it('a host that restores the pre-event player (rest) keeps a reach reward paid', () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        const here = gs(store).world.currentMap.currentNode;
        const q = quest({ id: 'reach-here', type: 'reach', target: here }, { kind: 'currency', amount: 6 });
        const seeded = storeWith(q, here);
        const before = gs(seeded).player.currency;
        createAppActions(seeded).resolveCurrentMapEvent(undefined, { kind: 'rest', shelter: 'camp' } as never);
        expect(gs(seeded).quests.completed).toContain(q.name);
        expect(gs(seeded).player.currency).toBe(before + 6);
    });

    it('from a dialogue choice: completeQuest queues the relic', () => {
        const q = quest({ id: 'flag-1', type: 'flag', target: 'fixture' });
        const store = storeWith(q);
        const dialogue: DialogueTree = {
            id: 'fixture-complete',
            rootId: 'root',
            nodes: {
                root: {
                    id: 'root', text: 'Placeholder.',
                    choices: [{ text: 'Done.', effect: { completeQuest: q.name } }],
                },
            },
        };
        const actions = createAppActions(store);
        actions.resolveCurrentMapEvent(undefined, { kind: 'narration', dialogue });
        expect(store.getState().event.dialogueCursor?.nodeId).toBe('root');
        actions.pickEventChoice('0');
        expect(gs(store).quests.completed).toContain(q.name);
        expectQuestRelicQueued(store, q);
    });
});

describe("the elite's relic reaches the item-reward screen after the draft", () => {
    const ELITE = { difficulty: 'elite' as const, name: 'Fixture Elite' };

    function playerStore(): AppStore {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        const player = gs(store).player;
        store.setState({
            player: { ...player, knownCards: [...COMBAT_REWARD_POOL.slice(0, 6)], combatRewardCards: [] },
        } as never);
        return store;
    }

    it('a drop is held on the draft, then queued with the elite named once the draft is claimed', () => {
        const store = playerStore();
        jest.spyOn(Math, 'random').mockReturnValue(0);
        const offers = rollCombatRewardAction(store, ELITE, FIXTURE_ELITE_RELICS);
        expect(offers.length).toBeGreaterThan(0);
        // The elite reward is unchanged and comes first: nothing queued yet.
        expect(store.getState().itemReward.queue).toHaveLength(0);
        expect(store.getState().combatReward.relicDrop?.item.id).toBe(FIXTURE_ELITE_RELICS[0]!.id);
        claimCombatRewardAction(store, offers[0]!);
        const queue = store.getState().itemReward.queue;
        expect(queue.map(e => e.item.id)).toEqual([FIXTURE_ELITE_RELICS[0]!.id]);
        expect(queue[0]!.source).toBe(eliteDropSource(ELITE.name));
        expect(store.getState().combatReward.relicDrop ?? null).toBeNull();
    });

    it('no drop when the chance misses, and none after a non-elite fight', () => {
        const missed = playerStore();
        jest.spyOn(Math, 'random').mockReturnValue(0.99);
        rollCombatRewardAction(missed, ELITE, FIXTURE_ELITE_RELICS);
        claimCombatRewardAction(missed, null);
        expect(missed.getState().itemReward.queue).toHaveLength(0);

        const normal = playerStore();
        (Math.random as jest.Mock).mockReturnValue(0);
        rollCombatRewardAction(normal, { difficulty: 'normal' } as never, FIXTURE_ELITE_RELICS);
        claimCombatRewardAction(normal, null);
        expect(normal.getState().itemReward.queue).toHaveLength(0);
    });
});

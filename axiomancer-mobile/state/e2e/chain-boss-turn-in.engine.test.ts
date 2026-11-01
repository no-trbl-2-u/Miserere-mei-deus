/**
 * The Breakwater chain's last step in the app (phase BW1a's A2 and A3, on the
 * store; it replaces QL1d's watchtower Belt, whose questline is gone).
 *
 * With steps 1-3 turned in and step 4 accepted at the keep gate (bw-k1), the
 * chapter boss's victory at the sea keep (bw-k2) through the combat host
 * (`applyHazardOutcome`) fills step 4 but pays nothing: step 4 is turned in at
 * the river bridge (bw-b1). TURN IN there pays its XP, queues its relic (the
 * Crimson Circlet) on `/item-reward` under the chain's name (never straight
 * into the satchel), and opens the bridge to the far bank (bw-b2).
 */

import { describe, expect, it } from '@jest/globals';

import {
    BREAKWATER_CHAPTER_GATES, BREAKWATER_CHAPTER_QUESTLINE, BREAKWATER_CHAPTER_PIECES, ENEMY_REGISTRY,
    completeQuest, createStartingWorld, initializeCombatEncounter, legalMovesFrom, placeOnNode, startQuest,
    stepQuest, unblockMapRoute, type CombatOutcome, type GameState, type WorldState,
} from '@mechanics';

import { applyHazardOutcome } from '@/components/combat/encounter/CombatEncounterPanel';
import { createAppActions } from '@/state/actions';
import { equipItemRewardAction } from '@/state/item-reward/store-actions';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

const LINE = BREAKWATER_CHAPTER_QUESTLINE;
const LAST = LINE.steps[3]!;
const ARMOR = BREAKWATER_CHAPTER_PIECES[4];

function gs(store: AppStore): GameState {
    return store.getState() as unknown as GameState;
}

/** A new Breakwater with the keep gate open (step 3 turned in) and the bridge still shut, standing on the sea keep. */
function keepOpenWorld(): WorldState {
    const w = createStartingWorld('breakwater');
    const { from, to } = BREAKWATER_CHAPTER_GATES.pastKeep;
    const map = unblockMapRoute(
        { ...w.currentMap, consumedNodes: ['bw-w1', 'bw-c2', 'bw-l5', 'bw-k1'] },
        from, to,
    );
    return placeOnNode({ ...w, currentMap: map }, 'bw-k2');
}

/** Steps 1-3 turned in, step 4 accepted, standing on the sea keep with its boss fight engaged. */
function atTheSeaKeep() {
    const world = keepOpenWorld();
    const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world } });
    const actions = createAppActions(store);
    const base = gs(store);
    let quests = base.quests;
    for (const step of LINE.steps.slice(0, 3)) {
        quests = completeQuest(startQuest(quests, stepQuest(LINE, step)), step.quest.name);
    }
    quests = startQuest(quests, stepQuest(LINE, LAST));
    store.setState({
        quests,
        world: { ...base.world, currentMap: { ...base.world.currentMap, pendingArrival: 'bw-k2' } },
        player: { ...base.player, inventory: [], experience: 0, experienceToNextLevel: 1_000_000 },
    } as never);
    const boss = { ...ENEMY_REGISTRY['death-beholder']!, difficulty: 'boss' as const };
    actions.startCombat(boss);
    return { store, actions, boss };
}

function winTheBoss(store: AppStore, boss: ReturnType<typeof atTheSeaKeep>['boss']): void {
    const finalState = initializeCombatEncounter(gs(store).player, boss, ['grey-strike'], 7);
    applyHazardOutcome(store, 'victory' as CombatOutcome, finalState, boss);
}

/** Stands the player on the river bridge and opens its quest node, as an arrival does. */
function atTheBridge(store: AppStore, actions: ReturnType<typeof createAppActions>): void {
    store.setState({ world: placeOnNode(gs(store).world, 'bw-b1') } as never);
    expect(actions.resolveCurrentMapEvent('quest')).toBe(true);
}

describe('the chapter boss fills step 4; the bridge turns it in', () => {
    it('the victory fills step 4 and pays nothing yet: no relic, the bridge still shut', () => {
        const { store, boss } = atTheSeaKeep();
        winTheBoss(store, boss);
        const active = gs(store).quests.active.find((q) => q.name === LAST.quest.name);
        expect(active?.objectives[0]?.currentCount).toBe(1);
        expect(gs(store).quests.completed).not.toContain(LAST.quest.name);
        expect(store.getState().itemReward.queue).toEqual([]);
        const bridged = placeOnNode(gs(store).world, 'bw-b1');
        expect(legalMovesFrom(bridged.currentMap)).not.toContain('bw-b2');
    });

    it('TURN IN at the bridge queues the armor on /item-reward under the chain\'s name, and WEAR IT NOW puts it on', () => {
        const { store, actions, boss } = atTheSeaKeep();
        winTheBoss(store, boss);
        atTheBridge(store, actions);
        expect(store.getState().quest.open).toMatchObject({ questline: LINE.id, node: 5 });

        const before = gs(store).player;
        expect(actions.turnInQuestStep()).toBe(true);
        expect(gs(store).quests.completed).toContain(LAST.quest.name);
        expect(gs(store).player.experience).toBe(before.experience + 40);

        const queue = store.getState().itemReward.queue;
        expect(queue.map((e) => e.item.id)).toEqual([ARMOR]);
        expect(queue[0]!.source).toContain(LINE.name!.toUpperCase());
        // Not in the satchel yet: the queue is the one grant.
        expect(gs(store).player.inventory.some((i) => i.id === ARMOR)).toBe(false);

        equipItemRewardAction(store);
        expect(gs(store).player.equipment.armor?.id).toBe(ARMOR);
        expect(store.getState().itemReward.queue).toEqual([]);
    });

    it('the bridge opens with the turn-in, not before', () => {
        const { store, actions, boss } = atTheSeaKeep();
        winTheBoss(store, boss);
        atTheBridge(store, actions);
        expect(legalMovesFrom(gs(store).world.currentMap)).not.toContain('bw-b2');
        actions.turnInQuestStep();
        expect(legalMovesFrom(gs(store).world.currentMap)).toContain('bw-b2');
    });
});

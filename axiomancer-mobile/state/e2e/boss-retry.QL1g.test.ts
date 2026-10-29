// guard-test: the seam already agreed on the parent; this pins the app path (moveTo, endCombat, playerDied) for the lost-then-won chapter boss
/**
 * The chapter boss fought again through the app's actions (phase QL1g's A23,
 * on the Chapter 1 chain of phase BW1a).
 *
 * A lost boss fight revives the player on the node walked from (the keep
 * gate, bw-k1), dying, with the sea keep (bw-k2) open, unspent and step 4
 * active. The retry wins and fills step 4, which is turned in at the river
 * bridge (bw-b1), so nothing is queued and the bridge stays shut until then.
 * A second loss while dying ends the run.
 */

import { describe, expect, it } from '@jest/globals';

import {
    BREAKWATER_CHAPTER_QUESTLINE, ENEMY_REGISTRY, completeQuest, initializeCombatEncounter, legalMovesFrom,
    startQuest, stepQuest, type CombatOutcome, type GameState,
} from '@mechanics';

import { applyHazardOutcome } from '@/components/combat/encounter/CombatEncounterPanel';
import { createAppActions } from '@/state/actions';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { settledBreakwater } from '@/test-utils/settledBreakwater';

const gs = (store: ReturnType<typeof createAppStore>) => store.getState() as unknown as GameState;

function setup() {
    const placed = settledBreakwater('bw-k1');
    const world = placed;
    const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world } });
    const actions = createAppActions(store);
    let quests = gs(store).quests;
    for (const step of BREAKWATER_CHAPTER_QUESTLINE.steps.slice(0, 3)) {
        quests = completeQuest(startQuest(quests, stepQuest(BREAKWATER_CHAPTER_QUESTLINE, step)), step.quest.name);
    }
    quests = startQuest(quests, stepQuest(BREAKWATER_CHAPTER_QUESTLINE, BREAKWATER_CHAPTER_QUESTLINE.steps[3]!));
    store.setState({ quests } as never);
    const boss = { ...ENEMY_REGISTRY['death-beholder']!, difficulty: 'boss' as const };
    const engage = () => {
        actions.moveTo('bw-k2');
        actions.startCombat(boss);
    };
    return { store, actions, boss, engage };
}

describe('the lost chapter boss, retried (QL1g)', () => {
    it('a loss revives before bw-k2 with it open and step 4 active; the retry wins and fills step 4', () => {
        const { store, actions, boss, engage } = setup();
        engage();
        const before = gs(store).quests;
        const lost = initializeCombatEncounter(gs(store).player, boss, ['grey-strike'], 7);
        applyHazardOutcome(store, 'defeat' as CombatOutcome, lost, boss);
        expect(actions.playerDied('fight')).toBe('revived');

        const map = gs(store).world.currentMap;
        expect(gs(store).dying).toBe(true);
        expect(gs(store).player.health).toBe(1);
        expect(map.currentNode).toBe('bw-k1');
        expect(map.consumedNodes).not.toContain('bw-k2');
        expect(map.completedNodes).not.toContain('bw-k2');
        expect(legalMovesFrom(map)).toContain('bw-k2');
        expect(gs(store).quests.active).toEqual(before.active);
        expect(store.getState().itemReward.queue).toEqual([]);

        engage();
        const won = initializeCombatEncounter(gs(store).player, boss, ['grey-strike'], 7);
        applyHazardOutcome(store, 'victory' as CombatOutcome, won, boss);
        const last = BREAKWATER_CHAPTER_QUESTLINE.steps[3]!.quest.name;
        expect(gs(store).quests.active.find((q) => q.name === last)?.objectives[0]?.currentCount).toBe(1);
        // Step 4 is turned in at the bridge: the win queues nothing.
        expect(store.getState().itemReward.queue).toEqual([]);
    });

    it('a second loss while dying ends the run', () => {
        const { store, actions, boss, engage } = setup();
        for (const expected of ['revived', 'run-over']) {
            engage();
            const lost = initializeCombatEncounter(gs(store).player, boss, ['grey-strike'], 7);
            applyHazardOutcome(store, 'defeat' as CombatOutcome, lost, boss);
            expect(actions.playerDied('fight')).toBe(expected);
        }
        expect(gs(store).dying).toBeUndefined();
        expect(gs(store).world.currentMap.currentNode).toBe('bw-w1');
    });
});

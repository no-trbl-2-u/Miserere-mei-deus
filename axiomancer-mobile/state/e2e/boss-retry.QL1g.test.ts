// guard-test: the seam already agreed on the parent; this pins the app path (moveTo, endCombat, playerDied, the Belt on /item-reward) for the lost-then-won watchtower
/**
 * The watchtower fought again through the app's actions (phase QL1g, A23).
 *
 * A lost boss fight revives the player on the node walked from, dying, with
 * bw-17 open, unspent and step 4 active. The retry wins, the Belt is queued on
 * /item-reward and the bridge opens. A second loss while dying ends the run.
 */

import { describe, expect, it } from '@jest/globals';

import {
    BREAKWATER_QUESTLINE, ENEMY_REGISTRY, completeQuest, initializeCombatEncounter, legalMovesFrom,
    placeOnNode, startQuest, stepQuest, type CombatOutcome, type GameState,
} from '@mechanics';

import { applyHazardOutcome } from '@/components/combat/encounter/CombatEncounterPanel';
import { createAppActions } from '@/state/actions';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { settledBreakwater } from '@/test-utils/settledBreakwater';

const gs = (store: ReturnType<typeof createAppStore>) => store.getState() as unknown as GameState;

function setup() {
    const placed = placeOnNode(settledBreakwater(), 'bw-16');
    const world = placed;
    const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world } });
    const actions = createAppActions(store);
    let quests = gs(store).quests;
    for (const step of BREAKWATER_QUESTLINE.steps.slice(0, 3)) {
        quests = completeQuest(startQuest(quests, stepQuest(BREAKWATER_QUESTLINE, step)), step.quest.name);
    }
    quests = startQuest(quests, stepQuest(BREAKWATER_QUESTLINE, BREAKWATER_QUESTLINE.steps[3]!));
    store.setState({ quests } as never);
    const boss = { ...ENEMY_REGISTRY['death-beholder']!, difficulty: 'boss' as const };
    const engage = () => {
        actions.moveTo('bw-17');
        actions.startCombat(boss);
    };
    return { store, actions, boss, engage };
}

describe('the lost watchtower, retried (QL1g)', () => {
    it('a loss revives before bw-17 with it open and step 4 active; the retry wins and queues the Belt', () => {
        const { store, actions, boss, engage } = setup();
        engage();
        const before = gs(store).quests;
        const lost = initializeCombatEncounter(gs(store).player, boss, ['grey-strike'], 7);
        applyHazardOutcome(store, 'defeat' as CombatOutcome, lost, boss);
        expect(actions.playerDied('fight')).toBe('revived');

        const map = gs(store).world.currentMap;
        expect(gs(store).dying).toBe(true);
        expect(gs(store).player.health).toBe(1);
        expect(map.currentNode).toBe('bw-16');
        expect(map.consumedNodes).not.toContain('bw-17');
        expect(map.completedNodes).not.toContain('bw-17');
        expect(legalMovesFrom(map)).toContain('bw-17');
        expect(legalMovesFrom(map)).not.toContain('bw-18');
        expect(gs(store).quests.active).toEqual(before.active);
        expect(store.getState().itemReward.queue).toEqual([]);

        engage();
        const won = initializeCombatEncounter(gs(store).player, boss, ['grey-strike'], 7);
        applyHazardOutcome(store, 'victory' as CombatOutcome, won, boss);
        expect(store.getState().itemReward.queue.map((e) => e.item.id)).toEqual(['relic-elementalist-belt']);
        expect(legalMovesFrom(gs(store).world.currentMap)).toContain('bw-18');
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
        expect(gs(store).world.currentMap.currentNode).toBe('bw-1');
    });
});

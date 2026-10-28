/**
 * The Breakwater questline's last step in the app (phase QL1d, A11 and A18
 * on the live questline).
 *
 * With steps 1-3 turned in and step 4 accepted, the watchtower victory pays
 * step 4 through the combat host (`applyHazardOutcome`), and the Belt goes
 * through `/item-reward` (its eyebrow naming the questline), never straight
 * into the satchel. WEAR IT NOW puts it on, and only worn does it open the
 * Elementalist lane.
 */

import { describe, expect, it } from '@jest/globals';

import {
    BREAKWATER_QUESTLINE, ENEMY_REGISTRY, completeQuest, initializeCombatEncounter, legalMovesFrom, placeOnNode,
    startQuest, stepQuest, unlockedLaneIds, type CombatOutcome, type GameState,
} from '@mechanics';

import { applyHazardOutcome } from '@/components/combat/encounter/CombatEncounterPanel';
import { createAppActions } from '@/state/actions';
import { equipItemRewardAction } from '@/state/item-reward/store-actions';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { settledBreakwater } from '@/test-utils/settledBreakwater';

function gs(store: AppStore): GameState {
    return store.getState() as unknown as GameState;
}

/** Steps 1-3 turned in, step 4 accepted, standing on the watchtower with its fight engaged. */
function atTheWatchtower() {
    const world = placeOnNode(settledBreakwater(), 'bw-17');
    const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world } });
    const actions = createAppActions(store);
    const base = gs(store);
    let quests = base.quests;
    for (const step of BREAKWATER_QUESTLINE.steps.slice(0, 3)) {
        quests = completeQuest(startQuest(quests, stepQuest(BREAKWATER_QUESTLINE, step)), step.quest.name);
    }
    quests = startQuest(quests, stepQuest(BREAKWATER_QUESTLINE, BREAKWATER_QUESTLINE.steps[3]!));
    store.setState({
        quests,
        world: { ...base.world, currentMap: { ...base.world.currentMap, pendingArrival: 'bw-17' } },
        player: { ...base.player, inventory: [], experience: 0, experienceToNextLevel: 1_000_000 },
    } as never);
    const boss = { ...ENEMY_REGISTRY['death-beholder']!, difficulty: 'boss' as const };
    actions.startCombat(boss);
    return { store, boss };
}

describe('the watchtower victory pays the Breakwater questline\'s last step', () => {
    it('queues the Belt on /item-reward under the questline\'s name, and WEAR IT NOW opens the Elementalist lane', () => {
        const { store, boss } = atTheWatchtower();
        const before = gs(store).player;
        const finalState = initializeCombatEncounter(before, boss, ['grey-strike'], 7);
        applyHazardOutcome(store, 'victory' as CombatOutcome, finalState, boss);

        const last = BREAKWATER_QUESTLINE.steps[3]!;
        expect(gs(store).quests.completed).toContain(last.quest.name);
        expect(gs(store).player.currency).toBe(before.currency + 15);

        const queue = store.getState().itemReward.queue;
        expect(queue.map((e) => e.item.id)).toEqual(['relic-elementalist-belt']);
        expect(queue[0]!.source).toContain(BREAKWATER_QUESTLINE.name!.toUpperCase());
        // Not in the satchel yet, and so no lane: the queue is the one grant.
        expect(gs(store).player.inventory.some((i) => i.id === 'relic-elementalist-belt')).toBe(false);
        expect(unlockedLaneIds(gs(store).player)).not.toContain('elementalist');

        equipItemRewardAction(store);
        const worn = gs(store).player;
        expect(worn.equipment.relics.map((r) => r.id)).toContain('relic-elementalist-belt');
        expect(unlockedLaneIds(worn)).toContain('elementalist');
        expect(store.getState().itemReward.queue).toEqual([]);
    });

    it('the bridge opens with the victory, not before', () => {
        const { store, boss } = atTheWatchtower();
        // (A placement lists the bridge in the legacy unlock list; the
        // frontier is the authority.)
        expect(legalMovesFrom(store.getState().world.currentMap)).not.toContain('bw-18');
        const finalState = initializeCombatEncounter(gs(store).player, boss, ['grey-strike'], 7);
        applyHazardOutcome(store, 'victory' as CombatOutcome, finalState, boss);
        expect(legalMovesFrom(store.getState().world.currentMap)).toContain('bw-18');
    });
});

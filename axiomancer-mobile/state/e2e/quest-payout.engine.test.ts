/**
 * Hermetic E2E - the quest screen's store actions and the payout (phase QL1c,
 * A10's store half and A11).
 *
 * A staged four-step questline on the Breakwater's first nodes
 * (`test-utils/questlineFixture.ts`): ACCEPT and TURN IN dispatch the engine's
 * calls, XP and shillings land in the purse once, a consumable goes to the
 * satchel, a `card-pick` opens its offers on the spoils tiles without adding
 * a card, and the boss victory pays step 4 with the Belt on `/item-reward`.
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { completeQuest, initializeCombatEncounter, ENEMY_REGISTRY, placeOnNode, type CombatOutcome, type GameState } from '@mechanics';

import { applyHazardOutcome } from '@/components/combat/encounter/CombatEncounterPanel';
import { claimQuestCardAction, offerCompletedQuestExtrasAction } from '@/state/quest/store-actions';
import type { AppStore } from '@/state/store';
import {
    FIXTURE_LINE,
    FIXTURE_LINE_NAME,
    FIXTURE_NODES,
    acceptFixtureStep,
    fillFixtureStep,
    registerFixtureQuestline,
    unregisterFixtureQuestline,
} from '@/test-utils/questlineFixture';
import { createFixtureStore } from '@/test-utils/fixtureStore';

beforeAll(() => { registerFixtureQuestline(); });
afterAll(() => { unregisterFixtureQuestline(); });

function gs(store: AppStore): GameState {
    return store.getState() as unknown as GameState;
}

/** A store standing on quest node `node` (1-4) and the screen opened on it. */
function atNode(node: number) {
    const handle = createFixtureStore({
        id: `ql1c-node-${node}`,
        seed: `ql1c-node-${node}`,
        world: { continent: 'coastal-continent', map: 'breakwater', node: FIXTURE_NODES[node - 1]! },
    });
    const { store, actions } = handle;
    // The grey deck, an empty satchel and no level-up in reach.
    const { player } = gs(store);
    store.setState({
        player: { ...player, inventory: [], experience: 0, experienceToNextLevel: 1_000_000, combatRewardCards: [] },
    } as never);
    const open = () => {
        expect(actions.resolveCurrentMapEvent(undefined, { kind: 'quest', questline: FIXTURE_LINE, node })).toBe(true);
    };
    return { store, actions, open };
}

describe('opening a quest node', () => {
    it('fills the quest slice, never the paced event slice, and leaves the node unspent', () => {
        const { store, open } = atNode(1);
        open();
        expect(store.getState().quest.open).toMatchObject({ questline: FIXTURE_LINE, node: 1 });
        expect(store.getState().event.pending).toBeNull();
        expect(gs(store).world.currentMap.consumedNodes).not.toContain(FIXTURE_NODES[0]);
    });

    it('LEAVE closes the screen and changes nothing else', () => {
        const { store, actions, open } = atNode(1);
        open();
        const before = gs(store);
        actions.closeQuest();
        expect(store.getState().quest.open).toBeNull();
        expect(gs(store).quests).toBe(before.quests);
        expect(gs(store).world.currentMap.consumedNodes).not.toContain(FIXTURE_NODES[0]);
    });
});

describe('ACCEPT', () => {
    it('starts the step at count 0 and spends the node', () => {
        const { store, actions, open } = atNode(1);
        open();
        expect(actions.acceptQuestStep()).toBe(true);
        const active = gs(store).quests.active.find(q => q.name === 'Cross the Gallows');
        expect(active?.objectives[0]?.currentCount).toBe(0);
        expect(gs(store).world.currentMap.consumedNodes).toContain(FIXTURE_NODES[0]);
    });

    it('a second ACCEPT does nothing', () => {
        const { store, actions, open } = atNode(1);
        open();
        actions.acceptQuestStep();
        const after = gs(store);
        expect(actions.acceptQuestStep()).toBe(false);
        expect(gs(store).quests).toBe(after.quests);
    });

    it('with no screen open it does nothing', () => {
        const { store, actions } = atNode(1);
        const before = gs(store);
        expect(actions.acceptQuestStep()).toBe(false);
        expect(gs(store).quests).toBe(before.quests);
    });
});

describe('TURN IN', () => {
    it('pays XP and shillings once, into the purse, and the node then offers the next step', () => {
        const { store, actions, open } = atNode(2);
        acceptFixtureStep(store, 1);
        fillFixtureStep(store, 1);
        const before = gs(store).player;
        open();
        expect(actions.turnInQuestStep()).toBe(true);
        const after = gs(store).player;
        expect(after.experience).toBe(before.experience + 40);
        expect(after.currency).toBe(before.currency + 10);
        expect(gs(store).quests.completed).toContain('Cross the Gallows');
        expect(store.getState().quest.paid).toMatchObject({ step: 1, experience: 40, currency: 10, itemNames: [] });
        // Paid once: a second TURN IN finds nothing ready.
        expect(actions.turnInQuestStep()).toBe(false);
        expect(gs(store).player.experience).toBe(before.experience + 40);
        // The node is not spent by a turn-in; it offers step 2.
        expect(gs(store).world.currentMap.consumedNodes).not.toContain(FIXTURE_NODES[1]);
    });

    it('refuses a step that is not ready', () => {
        const { store, actions, open } = atNode(2);
        acceptFixtureStep(store, 1);
        const before = gs(store);
        open();
        expect(actions.turnInQuestStep()).toBe(false);
        expect(gs(store).player).toBe(before.player);
    });

    it('a card-pick opens three offers on the spoils tiles and adds no card until taken', () => {
        const { store, actions, open } = atNode(3);
        acceptFixtureStep(store, 2);
        fillFixtureStep(store, 2);
        open();
        expect(actions.turnInQuestStep()).toBe(true);
        const offers = store.getState().quest.cardOffers;
        expect(offers).toHaveLength(3);
        expect(gs(store).player.combatRewardCards ?? []).toEqual([]);
        // Taking one adds exactly that card and closes the offers.
        actions.claimQuestCard(offers[1]!);
        expect(gs(store).player.combatRewardCards).toEqual([offers[1]]);
        expect(store.getState().quest.cardOffers).toEqual([]);
    });

    it('a card-pick can be skipped: nothing is added', () => {
        const { store, actions, open } = atNode(3);
        acceptFixtureStep(store, 2);
        fillFixtureStep(store, 2);
        open();
        actions.turnInQuestStep();
        actions.claimQuestCard(null);
        expect(gs(store).player.combatRewardCards ?? []).toEqual([]);
        expect(store.getState().quest.cardOffers).toEqual([]);
    });

    it('an id the pick did not offer adds nothing', () => {
        const { store, actions, open } = atNode(3);
        acceptFixtureStep(store, 2);
        fillFixtureStep(store, 2);
        open();
        actions.turnInQuestStep();
        claimQuestCardAction(store, 'not-offered');
        expect(gs(store).player.combatRewardCards ?? []).toEqual([]);
    });

    it('a consumable goes to the satchel', () => {
        const { store, actions, open } = atNode(4);
        acceptFixtureStep(store, 3);
        fillFixtureStep(store, 3);
        open();
        expect(actions.turnInQuestStep()).toBe(true);
        expect(gs(store).player.inventory.map(i => i.id)).toContain('minor-healing-potion');
        expect(store.getState().quest.paid?.itemNames).toEqual(['Minor Healing Potion']);
        // A potion is not screen-worthy: it does not queue on /item-reward.
        expect(store.getState().itemReward.queue).toEqual([]);
    });
});

describe('the boss victory pays step 4 (A11)', () => {
    it('pays XP and shillings with the aftermath and queues the Belt on /item-reward, its eyebrow naming the questline', () => {
        const { store, actions } = atNode(4);
        acceptFixtureStep(store, 4);
        // Stand where the boss is fought: the node under the player, arrival owed.
        const before = gs(store).player;
        const boss = { ...ENEMY_REGISTRY['death-beholder']!, difficulty: 'boss' as const };
        actions.startCombat(boss);
        const finalState = initializeCombatEncounter(gs(store).player, boss, ['grey-strike'], 7);
        applyHazardOutcome(store, 'victory' as CombatOutcome, finalState, boss);

        expect(gs(store).quests.completed).toContain('Fell the Warden');
        expect(gs(store).player.currency).toBe(before.currency + 15);
        const queue = store.getState().itemReward.queue;
        expect(queue.map(e => e.item.id)).toEqual(['relic-elementalist-belt']);
        expect(queue[0]!.source).toContain(FIXTURE_LINE_NAME.toUpperCase());
        // Not also in the satchel: CONFIRM / EQUIP is the one grant.
        expect(gs(store).player.inventory.some(i => i.id === 'relic-elementalist-belt')).toBe(false);
    });

    it('a fled boss fight pays nothing and queues nothing', () => {
        const { store, actions } = atNode(4);
        acceptFixtureStep(store, 4);
        const boss = { ...ENEMY_REGISTRY['death-beholder']!, difficulty: 'boss' as const };
        actions.startCombat(boss);
        actions.endCombat('flee');
        expect(gs(store).quests.completed).not.toContain('Fell the Warden');
        expect(store.getState().itemReward.queue).toEqual([]);
    });
});

describe('a card-pick paid off the turn-in path (a boss victory)', () => {
    it('the host re-reads the offers from the reward door', () => {
        const { store } = atNode(4);
        acceptFixtureStep(store, 2);
        fillFixtureStep(store, 2);
        const before = gs(store).quests;
        // Complete step 2 outside a turn-in, as a dialogue effect would.
        store.setState({ quests: completeQuest(before, 'Thin the Quay') } as never);
        const placed = placeOnNode(gs(store).world, FIXTURE_NODES[3]);
        store.setState({ world: placed } as never);
        // offerCompletedQuestExtrasAction is the one call every completion path makes.
        offerCompletedQuestExtrasAction(store, before);
        expect(store.getState().quest.cardOffers).toHaveLength(3);
        expect(gs(store).player.combatRewardCards ?? []).toEqual([]);
    });
});

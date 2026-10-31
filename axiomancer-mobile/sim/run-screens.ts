/**
 * One resolver per screen a Breakwater node opens (phase SM1e). Each reads
 * the store slice its screen reads and taps the store action its screen's
 * button calls, asking the run policy wherever the player would choose.
 * Every resolver returns true when it made a move, false when its screen is
 * not open; a screen that stays open with no legal tap throws.
 */

import {
    buildCombatDeck,
    isEquipment,
    nextHazardStep,
    hazardRouteFor,
    type GameState,
    type HazardPolicyId,
    type RunPolicy,
} from '@mechanics';

import type { AppActions } from '@/state/actions';
import {
    confirmItemRewardAction,
    equipItemRewardAction,
} from '@/state/item-reward/store-actions';
import { selectQuestVM } from '@/state/presenters/quest.engine';
import { selectVillageVM } from '@/state/presenters/village.engine';
import type { AppStore } from '@/state/store';

/** Thrown by a resolver whose screen has no legal tap; the driver adds the state. */
export class ScreenStuckError extends Error {}

function deckOf(store: AppStore): string[] {
    const s = store.getState() as unknown as GameState;
    return buildCombatDeck(s.player, s.flags);
}

/** `/item-reward`: EQUIP or CONFIRM the head of the queue. */
export function resolveItemReward(store: AppStore, policy: RunPolicy): boolean {
    const head = store.getState().itemReward?.queue[0];
    if (!head) return false;
    const wearable = isEquipment(head.item);
    const choice = policy.takeItem({ itemId: head.item.id, category: head.item.category, wearable });
    const result = choice === 'equip' && wearable ? equipItemRewardAction(store) : confirmItemRewardAction(store);
    if (!result.applied) throw new ScreenStuckError(`the item reward '${head.item.id}' would not commit`);
    return true;
}

/** `/rest`: pick an offer (and a card to upgrade), then MOVE ON. */
export function resolveRest(store: AppStore, actions: AppActions, policy: RunPolicy): boolean {
    const session = store.getState().rest?.session;
    if (!session) return false;
    if (session.phase === 'offer') {
        const decision = policy.chooseRest({
            health: session.health,
            maxHealth: session.maxHealth,
            currency: session.currency,
            offers: session.offers.map((o) => ({ id: o.id, cost: o.cost, enabled: !o.disabledReason })),
            upgradableCardIds: session.upgradableCardIds,
            deck: session.deckCardIds,
        });
        actions.chooseRestChoiceOffer(decision.offer);
        const after = store.getState().rest?.session;
        if (after?.phase === 'upgrade-pick' && decision.offer === 'upgrade') {
            actions.pickRestChoiceUpgrade(decision.cardId);
        }
    } else if (session.phase === 'upgrade-pick') {
        const cardId = session.upgradableCardIds[0];
        if (cardId === undefined) throw new ScreenStuckError('the rest asks for an upgrade with nothing to upgrade');
        actions.pickRestChoiceUpgrade(cardId);
    } else if (session.phase === 'outcome') {
        actions.claimRestOutcome();
    } else {
        throw new ScreenStuckError(`the rest sits in phase '${session.phase}'`);
    }
    if (store.getState().rest?.session === session) throw new ScreenStuckError(`the rest did not move from '${session.phase}'`);
    return true;
}

/** `/cache`: take an offer, then claim it. */
export function resolveCache(store: AppStore, actions: AppActions, policy: RunPolicy): boolean {
    const session = store.getState().cache?.session;
    if (!session) return false;
    if (session.phase === 'offer') {
        const offer = policy.chooseCacheOffer({
            cardCandidate: session.cardCandidate,
            itemIds: session.itemCandidates.map((i) => i.id),
            currency: session.currencyCandidate,
            deck: deckOf(store),
        });
        actions.chooseLootCacheChoiceOffer(offer);
    } else if (session.phase === 'outcome') {
        actions.claimLootCacheChoiceOutcome();
    } else {
        throw new ScreenStuckError(`the cache sits in phase '${session.phase}'`);
    }
    if (store.getState().cache?.session === session) throw new ScreenStuckError(`the cache did not move from '${session.phase}'`);
    return true;
}

/** `/quest`: take or skip its card, turn in, accept, else LEAVE. */
export function resolveQuest(store: AppStore, actions: AppActions, policy: RunPolicy): boolean {
    const state = store.getState();
    if (!state.quest?.open && (state.quest?.cardOffers.length ?? 0) === 0) return false;
    const vm = selectQuestVM({ quest: state.quest, quests: state.quests });
    if (vm.cardOffers.length > 0) {
        const decision = policy.pickReward({ source: 'quest', offers: vm.cardOffers, upgradeFromCardId: null, deck: deckOf(store) });
        const cardId = decision.kind === 'card' && vm.cardOffers.includes(decision.cardId) ? decision.cardId : null;
        actions.claimQuestCard(cardId);
        return true;
    }
    if (vm.stage === 'turn-in' && actions.turnInQuestStep()) return true;
    if (vm.stage === 'offer' && vm.canAccept && actions.acceptQuestStep()) return true;
    actions.closeQuest();
    return true;
}

/** `/travel`: YES (`takeTravel`) or NO (`closeTravel`), as the policy says. */
export function resolveTravel(
    store: AppStore,
    actions: AppActions,
    policy: RunPolicy,
    visited: ReadonlySet<string>,
): boolean {
    const offer = store.getState().travel?.open;
    if (!offer) return false;
    const toNodeId = 'node' in offer.destination ? offer.destination.node : null;
    const toMap = 'map' in offer.destination ? offer.destination.map : null;
    const take = offer.open && policy.takeTravel({
        fromNodeId: offer.nodeId,
        toNodeId,
        toMap,
        leavesMap: toMap !== null,
        destinationVisited: toNodeId !== null && visited.has(toNodeId),
    });
    if (take && actions.takeTravel()) return true;
    actions.closeTravel();
    return true;
}

/** `/village`: rest, buy, remove as the policy says, then LEAVE. */
export function resolveVillage(store: AppStore, actions: AppActions, policy: RunPolicy): boolean {
    const state = store.getState();
    if (state.event?.pending?.event.kind !== 'village') return false;
    const vm = selectVillageVM({ event: state.event, player: state.player, flags: (state as unknown as GameState).flags });
    const decision = policy.visitVillage({
        health: vm.health,
        maxHealth: vm.maxHealth,
        currency: vm.currency,
        rest: vm.rest ? { price: vm.rest.price, enabled: vm.rest.enabled } : null,
        shop: (vm.cardShop?.cards ?? []).map((c) => ({ cardId: c.cardId, price: c.price, enabled: c.enabled })),
        removal: vm.cardShop
            ? { price: vm.cardShop.removal.price, enabled: vm.cardShop.removal.enabled, cardIds: vm.cardShop.removal.cards.map((c) => c.cardId) }
            : null,
        hasAnvil: vm.anvil !== null,
        deck: deckOf(store),
    });
    if (decision.rest && vm.rest?.enabled) actions.restAtVillage();
    for (const cardId of decision.buy) actions.buyVillageCard(cardId);
    for (const cardId of decision.remove) actions.removeVillageCard(cardId);
    actions.dismissEvent();
    return true;
}

/** Any other pending event (a cutscene, a dialogue, an omen): read it and move on. */
export function resolvePacedEvent(store: AppStore, actions: AppActions): boolean {
    const slice = store.getState().event;
    if (!slice?.pending) return false;
    if (slice.dialogueCursor !== null) {
        // A dialogue: the first choice, as a player reading top-down would.
        const before = slice.dialogueCursor;
        actions.pickEventChoice('0');
        if (store.getState().event?.dialogueCursor === before) actions.dismissEvent();
        return true;
    }
    actions.dismissEvent();
    return true;
}

/** `/hazard`: pick the route, play each round tap by tap, take the outcome and its card. */
export function resolveHazard(store: AppStore, actions: AppActions, policy: RunPolicy, chosen: { policy: HazardPolicyId | null }): boolean {
    const session = store.getState().hazard?.session;
    if (!session) {
        chosen.policy = null;
        return false;
    }
    const player = store.getState().player;
    if (chosen.policy === null) {
        chosen.policy = policy.hazardPolicy({ hazardId: session.hazardId, health: player.health, maxHealth: player.maxHealth });
    }
    const hazardPolicy = chosen.policy;
    switch (session.phase) {
        case 'route-select':
            actions.selectHazardRoute(hazardRouteFor(hazardPolicy));
            break;
        case 'rolling':
            actions.finishHazardRolling();
            break;
        case 'playing': {
            const step = nextHazardStep(session, hazardPolicy);
            if (step.kind === 'stage') actions.stageHazardCard(step.uid);
            else if (step.kind === 'power') actions.powerHazardCard(step.uid, step.dieId);
            else if (step.kind === 'discard') actions.discardHazardCard(step.uid);
            else actions.resolveHazardRound();
            break;
        }
        case 'resolve-flash':
            actions.continueHazardAfterResolve();
            break;
        case 'outcome':
            actions.acknowledgeHazardOutcome();
            break;
        case 'rewards': {
            const offers = session.outcome?.offerCards.map((c) => c.id) ?? [];
            const canSkip = session.outcome?.canSkip ?? true;
            let cardId = offers.length > 0 ? policy.pickHazardCard({ offers, canSkip }) : null;
            if (cardId !== null && !offers.includes(cardId)) cardId = null;
            if (cardId === null && !canSkip && offers.length > 0) cardId = offers[0]!;
            actions.claimHazardRewards(cardId);
            break;
        }
        default:
            throw new ScreenStuckError(`the hazard sits in phase '${session.phase}'`);
    }
    if (store.getState().hazard?.session === session) {
        throw new ScreenStuckError(`the hazard did not move from '${session.phase}'`);
    }
    return true;
}

/** The character screen: spend each banked stat point as the policy says. */
export function resolveStatPoints(store: AppStore, actions: AppActions, policy: RunPolicy): boolean {
    const player = store.getState().player;
    const points = player?.availableStatPoints ?? 0;
    if (points <= 0) return false;
    const stat = policy.raiseStat({ level: player.level, baseStats: player.baseStats, availableStatPoints: points });
    const left = actions.allocateStatPoint(stat);
    if (left >= points) throw new ScreenStuckError(`a stat point would not go on '${stat}'`);
    return true;
}

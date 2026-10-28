/**
 * Quest screen - store action glue (phase QL1c).
 *
 * The RULES are the engine's: `acceptQuestStep` starts a step and spends its
 * node, `turnInQuestStep` completes a ready step at the next quest node and
 * pays it through the one reward door (`settleQuestLog` -> `payCompletedQuests`),
 * `resolveQuestNodeEvent` reads the stage. This module threads those through
 * the mobile `quest` slice and routes what they hand back: a relic to the
 * item-reward screen, a `card-pick`'s offers to the spoils tiles. It makes no
 * rule decisions of its own.
 */

import {
    addRewardCard,
    newlyCompletedQuests,
    payCompletedQuests,
    acceptQuestStep,
    turnInQuestStep,
} from '@mechanics';
import type { GameState, PaidQuestReward, QuestLog, Reward } from '@mechanics';

import { offerCompletedQuestItemsAction } from '../item-reward/relic-sources';
import { EMPTY_QUEST_SLICE, type AppStore, type MobileQuestPaid } from '../store';

/** The resolved quest event the screen opens on. */
export interface OpenQuestInput {
    questline: string;
    node: number;
    description?: string;
}

/** Opens the quest screen on a quest node. The node itself stays unspent. */
export function openQuestScreenAction(store: AppStore, input: OpenQuestInput): void {
    store.setState({
        quest: {
            open: { questline: input.questline, node: input.node, description: input.description },
            paid: null,
            cardOffers: [],
        },
    } as never);
}

/** LEAVE: closes the screen. Nothing is accepted, turned in or spent. */
export function closeQuestAction(store: AppStore): void {
    store.setState({ quest: EMPTY_QUEST_SLICE } as never);
}

function saveQuietly(store: AppStore): void {
    try { store.getState().save(); } catch { /* persistence must not strand the quest screen */ }
}

/**
 * ACCEPT: starts the step this node offers (the engine spends the node and
 * opens its held roads). Returns true when the step was accepted.
 */
export function acceptQuestStepAction(store: AppStore): boolean {
    const open = store.getState().quest?.open;
    if (!open) return false;
    const before = store.getState() as unknown as GameState;
    const next = acceptQuestStep(before, open.questline, open.node);
    if (next === before) return false;
    store.setState({ quests: next.quests, world: next.world } as never);
    saveQuietly(store);
    return true;
}

function amountOf(rewards: readonly Reward[], kind: 'experience' | 'currency'): number {
    let total = 0;
    for (const reward of rewards) {
        if (typeof reward !== 'string' && 'kind' in reward && reward.kind === kind) total += reward.amount;
    }
    return total;
}

/** The ledger a turn-in shows, read off what the reward door paid. */
function ledgerOf(step: number, paid: readonly PaidQuestReward[]): MobileQuestPaid {
    const first = paid[0];
    return {
        step,
        questName: first?.questName ?? '',
        experience: paid.reduce((sum, p) => sum + amountOf(p.rewards, 'experience'), 0),
        currency: paid.reduce((sum, p) => sum + amountOf(p.rewards, 'currency'), 0),
        itemNames: paid.flatMap(p => p.items.map(item => item.name)),
    };
}

/**
 * TURN IN: completes the ready step behind this node (node - 1) and pays it
 * once through the engine's reward door. XP and shillings land in the purse, a
 * consumable in the satchel, a relic goes to `/item-reward`, and a `card-pick`
 * opens its offers on the spoils tiles. The node then offers the next step on
 * the same screen. Returns true when something was turned in.
 */
export function turnInQuestStepAction(store: AppStore): boolean {
    const open = store.getState().quest?.open;
    if (!open) return false;
    const before = store.getState() as unknown as GameState;
    const result = turnInQuestStep(before, open.questline, open.node - 1);
    if (result.state === before) return false;
    store.setState({
        player: result.state.player,
        quests: result.state.quests,
        world: result.state.world,
    } as never);
    const cardOffers = result.paid.flatMap(p => p.cardOffers ?? []);
    store.setState({
        quest: { ...(store.getState().quest ?? EMPTY_QUEST_SLICE), paid: ledgerOf(open.node - 1, result.paid), cardOffers },
    } as never);
    // A relic the step paid goes to the reward screen, like any quest relic.
    offerCompletedQuestItemsAction(store, before.quests);
    saveQuietly(store);
    return true;
}

/**
 * Card offers a quest completed elsewhere than a turn-in (a boss victory, a
 * dialogue effect) paid. The engine adds no card for a `card-pick` and the
 * offers ride only the paid record, which the log-level seams drop, so the
 * host re-reads them from the reward door over the quests that completed
 * since `before`.
 */
export function completedQuestCardOffers(state: GameState, before: QuestLog): string[] {
    if (!state.player || !state.quests) return [];
    if (newlyCompletedQuests(before, state.quests).length === 0) return [];
    return payCompletedQuests(state.player, before, state.quests).paid.flatMap(p => p.cardOffers ?? []);
}

/**
 * After any step that can complete a quest outside a turn-in: routes the
 * relic to `/item-reward` (`offerCompletedQuestItemsAction`) and a
 * `card-pick` to the spoils tiles. The one call every completion path makes.
 */
export function offerCompletedQuestExtrasAction(store: AppStore, before: QuestLog): void {
    offerCompletedQuestItemsAction(store, before);
    const offers = completedQuestCardOffers(store.getState() as unknown as GameState, before);
    if (offers.length === 0) return;
    const prev = store.getState().quest ?? EMPTY_QUEST_SLICE;
    store.setState({ quest: { ...prev, cardOffers: [...prev.cardOffers, ...offers] } } as never);
}

/**
 * Resolves the quest's card pick: `cardId` joins the deck for the run, `null`
 * skips it (a lean deck is a fair play, as after a fight). The offers close.
 */
export function claimQuestCardAction(store: AppStore, cardId: string | null): void {
    const slice = store.getState().quest ?? EMPTY_QUEST_SLICE;
    if (slice.cardOffers.length === 0) return;
    const player = (store.getState() as unknown as GameState).player;
    const patch: Record<string, unknown> = { quest: { ...slice, cardOffers: [] } };
    if (cardId && slice.cardOffers.includes(cardId) && player) patch.player = addRewardCard(player, cardId);
    store.setState(patch as never);
    saveQuietly(store);
}

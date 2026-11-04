/**
 * Combat (hazard-pattern encounter) store-actions — mobile UI layer.
 *
 * The encounter engine (`CombatEncounterState`) is pure and the
 * `/combat-encounter` screen holds it in local React state, so unlike the
 * gathering/hazard slices there is no mobile combat session slice here. This
 * module carries the post-combat card draft. Mobile invents no cards, costs,
 * or tuning.
 */

import {
    addRewardCard,
    eliteRelicDropsAt,
    isEliteEnemy,
    isEliteNode,
    isEliteUpgradeTaken,
    markEliteUpgradeTaken,
    playerWithWinQuestItems,
    replaceCard,
    retireEliteNode,
    rollCombatCardRewards,
    rollEliteEquipmentDrop,
    rollEliteReward,
    rollEliteRelicDrop,
    type Enemy,
    type Equipment,
    type GameState,
    type SpareReward,
    type WorldState,
} from '@mechanics';

import { deckEventPoster, deckEventRunId, deckEventWhere, runDeck, type DeckEventState } from '@/lib/deckEvents';

import { recordDeckTransform, recordDeckUpgrade, recordItemGained } from '../run-log';
import { EMPTY_COMBAT_REWARD_SLICE, type AppStore } from '../store';
import { offerEliteRelicAction, offerElitePieceAction } from '../item-reward/relic-sources';

// ---------------------------------------------------------------------------
// Post-combat card reward — the 1-of-3 draft.
//
// The ROLL is engine truth (`rollCombatCardRewards` fills the lane slots from
// the lane the player wears most, then draws from `rewardPoolFor`: the worn
// relics' lanes plus the character's starting lanes, never grey; after an elite, `rollEliteReward`
// offers the best cards or a random upgrade). Mobile owns exactly two things: WHEN the draft
// opens, and persisting the claim.
// ---------------------------------------------------------------------------

/** Offers shown per reward screen. */
export const COMBAT_REWARD_OFFER_COUNT = 3;

/**
 * The elite node the player stands on after a fight (the fight's node: the
 * settle never moves the player), or null when the node is no elite node or
 * no world is loaded.
 */
function eliteFightNode(world: WorldState | undefined): string | null {
    const map = world?.currentMap;
    if (!map) return null;
    return isEliteNode(map.continent, map.name, map.currentNode) ? map.currentNode : null;
}

/**
 * A won elite fight's relic roll, made BEFORE any other reward: the fight's
 * own drop list (`eliteRelicDrops` on its node, else the elite-only pool from
 * `relics`, the relic library by default). On a drop the relic is the whole
 * reward: the draft is closed as claimed (no cards, no upgrade), the fight's
 * node is retired so it never returns from a rest, and the relic is queued on
 * the item-reward screen. Returns true on a drop, so the caller withholds the
 * XP (`endCombat(..., { withholdSpoils: true })`); the shillings stand. A
 * non-elite foe rolls nothing. The roll comes before `endCombat` pays the
 * fight's quests, so it reads a player already holding what they will pay
 * (`playerWithWinQuestItems`) and goes around it.
 */
export function settleEliteRelicAction(
    store: AppStore,
    enemy: Pick<Enemy, 'difficulty'> & Partial<Pick<Enemy, 'name'>>,
    relics?: readonly Equipment[],
): boolean {
    if (!isEliteEnemy(enemy)) return false;
    const state = store.getState() as unknown as GameState;
    if (!state.player) return false;
    const map = state.world?.currentMap;
    const node = eliteFightNode(state.world);
    const dropList = map && node ? eliteRelicDropsAt(map.continent, map.name, node) : undefined;
    const relic = rollEliteRelicDrop(playerWithWinQuestItems(state), Math.random, relics, dropList);
    if (!relic) return false;
    const eliteName = enemy.name ?? '';
    const patch: Record<string, unknown> = {
        combatReward: { offers: [], claimed: true, upgrade: null, relicDrop: { item: relic, eliteName } },
    };
    if (node) patch.world = retireEliteNode(state.world, node);
    store.setState(patch as never);
    offerEliteRelicAction(store, relic, eliteName);
    return true;
}

/**
 * A beaten elite's lane piece, rolled on top of the relic roll
 * (`rollEliteEquipmentDrop`: `EQUIPMENT_DROP_TUNING.elite`) from the weapons and armor the player does not
 * carry, and queued on the item-reward screen as a relic is. Unlike a relic it
 * is not the whole reward: the XP, shillings and card draft stand. A foe that is no
 * elite rolls nothing. Like the relic it goes around what the fight's quests will
 * pay. Returns the piece queued, or null.
 */
export function settleEliteEquipmentAction(
    store: AppStore,
    enemy: Pick<Enemy, 'difficulty'> & Partial<Pick<Enemy, 'name'>>,
): Equipment | null {
    if (!isEliteEnemy(enemy)) return null;
    const state = store.getState() as unknown as GameState;
    if (!state.player) return null;
    const piece = rollEliteEquipmentDrop(playerWithWinQuestItems(state), Math.random);
    if (!piece) return null;
    offerElitePieceAction(store, piece, enemy.name ?? '');
    return piece;
}

/**
 * A foe spared at the mercy check, after `endCombat` paid it: the draft closes as
 * claimed (a Spare pays no card reward), the roll goes on the slice for the end
 * screen to reveal, the run log hears of it and the save is written, since no
 * draft claim will write it. Gear stays in the satchel, saved, until the end
 * screen closes and `offerSpareGearAction` offers it. Does nothing for any other ending.
 */
export function settleSpareAction(
    store: AppStore,
    report: { spareReward?: SpareReward; journalEntryUnlocked?: { title: string } } | null | undefined,
): void {
    const reward = report?.spareReward;
    if (!reward) return;
    const journalTitle = report.journalEntryUnlocked?.title;
    store.setState({
        combatReward: {
            offers: [], claimed: true, upgrade: null, relicDrop: null,
            spare: journalTitle ? { reward, journalTitle } : { reward },
        },
    } as never);
    // A piece of gear is logged when the item-reward screen hands it over.
    if (reward.kind === 'consumable') recordItemGained(store, reward.item, 'spare');
    if (reward.kind === 'upgrade') recordDeckUpgrade(store, reward.fromCardId, reward.toCardId, 'spare');
    if (reward.kind === 'transform') recordDeckTransform(store, reward.fromCardId, reward.toCardId, 'spare');
    try { store.getState().save(); } catch { /* persistence must not strand the end screen */ }
}

/**
 * Rolls the post-combat draft into the store, once. After an elite fight
 * (`isEliteEnemy`) the draft is the elite reward: the best cards available
 * and, when an owned card can take one and the player has not yet taken the
 * upgrade over this elite (`isEliteUpgradeTaken`), a random upgrade as the
 * other option. No-ops when a draft is already open, when the reward was
 * already claimed this encounter (an elite whose relic dropped,
 * `settleEliteRelicAction`, closes it as claimed), or when no player is
 * loaded, so a re-render (or a panel remount mid-draft) re-reads the SAME
 * offer instead of rerolling it.
 */
export function rollCombatRewardAction(
    store: AppStore,
    enemy?: Pick<Enemy, 'difficulty'> & Partial<Pick<Enemy, 'name'>>,
): readonly string[] {
    const state = store.getState();
    const slice = state.combatReward ?? EMPTY_COMBAT_REWARD_SLICE;
    if (slice.claimed || slice.offers.length > 0) return slice.offers;
    const game = state as unknown as GameState;
    const player = game.player;
    if (!player) return EMPTY_COMBAT_REWARD_SLICE.offers;
    if (enemy && isEliteEnemy(enemy)) {
        const elite = rollEliteReward(player, Math.random, COMBAT_REWARD_OFFER_COUNT);
        const node = eliteFightNode(game.world);
        const upgradeTaken = node !== null && isEliteUpgradeTaken(game.world, node);
        const upgrade = upgradeTaken ? null : elite.upgrade;
        store.setState({ combatReward: { offers: elite.cards, claimed: false, upgrade, relicDrop: null } } as never);
        return elite.cards;
    }
    const offers = rollCombatCardRewards(player, Math.random, COMBAT_REWARD_OFFER_COUNT);
    store.setState({ combatReward: { offers, claimed: false, upgrade: null } } as never);
    return offers;
}

/**
 * Resolves the draft: `cardId` appends that card to the player's persistent
 * `combatRewardCards`; `null` is the SKIP (a lean deck is a legitimate play —
 * the draft is claimed, nothing is added). Either way the claim is PERSISTED
 * immediately: before this, a pick lived
 * only in memory until some unrelated `save()` happened to run, so closing the
 * app after taking a card silently lost it.
 */
export function claimCombatRewardAction(store: AppStore, cardId: string | null): void {
    const offered = [...(store.getState().combatReward?.offers ?? [])];
    const player = (store.getState() as unknown as GameState).player;
    const patch: Record<string, unknown> = { combatReward: { offers: [], claimed: true, upgrade: null } };
    if (cardId && player) patch.player = addRewardCard(player, cardId);
    store.setState(patch as never);
    try { store.getState().save(); } catch { /* persistence must not strand the reward screen */ }
    postRewardEvent(store, offered, cardId);
}

/**
 * The play log (phase BE2e): the draft just claimed, with the cards it showed
 * and the deck after it. A claim with no open draft behind it posts nothing.
 */
function postRewardEvent(store: AppStore, offered: string[], cardId: string | null): void {
    if (offered.length === 0) return;
    const state = store.getState() as unknown as DeckEventState;
    void deckEventPoster.post({
        kind: 'reward',
        cardId: cardId && offered.includes(cardId) ? cardId : null,
        offered,
        deck: runDeck(state),
        where: deckEventWhere(state, 'combat-reward'),
        runId: deckEventRunId(state),
    });
}

/**
 * Takes the elite reward's upgrade instead of a card: one owned copy of the
 * drawn card becomes its upgrade (`replaceCard`), the fight's elite node is
 * marked (`markEliteUpgradeTaken`, so a repeat win over it offers cards only)
 * in the same `setState`, the draft is claimed and the save written. `cardId`
 * must be the draft's own drawn card; anything else (no upgrade on offer, a
 * stale id) changes nothing.
 */
export function claimCombatUpgradeAction(store: AppStore, cardId: string): void {
    const state = store.getState();
    const upgrade = state.combatReward?.upgrade ?? null;
    const game = state as unknown as GameState;
    const player = game.player;
    if (!upgrade || !player || upgrade.fromCardId !== cardId) return;
    const patch: Record<string, unknown> = {
        player: replaceCard(player, upgrade.fromCardId, upgrade.toCardId),
        combatReward: { offers: [], claimed: true, upgrade: null },
    };
    const node = eliteFightNode(game.world);
    if (node) patch.world = markEliteUpgradeTaken(game.world, node);
    store.setState(patch as never);
    try { store.getState().save(); } catch { /* persistence must not strand the reward screen */ }
    // The run log: the elite's upgrade is a deck change, the card before and the card after.
    recordDeckUpgrade(store, upgrade.fromCardId, upgrade.toCardId, 'combat-reward');
}

/** Clears the draft for the next encounter (called when combat is left). */
export function resetCombatRewardAction(store: AppStore): void {
    store.setState({ combatReward: EMPTY_COMBAT_REWARD_SLICE } as never);
}

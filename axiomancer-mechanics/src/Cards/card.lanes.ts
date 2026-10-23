/**
 * CARD LANES — the registry of player card lanes.
 *
 * A lane is a named group of library cards that share a play pattern, plus a
 * test deck that plays it. The registry is what the dev menu's CARDS section
 * lists: its lane-deck picker deals a lane's `testDeck`, and its reward-pool
 * grid narrows the post-combat offer to the checked lanes' `cardIds`.
 *
 * The grey office is the permanent lane. A trial set (plan/revamp/cards.md →
 * "The trial set") carries its own lanes, and they join the registry through
 * the set's one registration line in `cards.library.ts` (`TRIAL_SETS`).
 *
 * Everything here is data or a pure function over plain values.
 *
 * Functions (each takes the registry as an optional last argument, so tests
 * can pass fixture lanes):
 *   getCardLane(id)            one lane by id, or undefined
 *   laneRewardPool(laneIds)    the card ids of the named lanes, de-duplicated
 */

import type { Card } from './types';
import { GREY_OFFICE_CARDS } from './library/starters.cards';
import { TRIAL_SETS } from './cards.library';

/**
 * One card lane.
 *
 * @property id        - Stable key, saved in `Character.devRewardLaneIds`.
 * @property name      - Label the dev menu prints.
 * @property cardIds   - Every library card that belongs to the lane, in
 *                       library order. The reward pool draws from these.
 * @property testDeck  - The deck the dev menu's SET DECK deals, copies kept
 *                       (an id listed twice is two cards in the deck).
 */
export interface CardLane {
    readonly id: string;
    readonly name: string;
    readonly cardIds: readonly string[];
    readonly testDeck: readonly string[];
}

/**
 * A removable trial set: its cards (lane cards and any Curse they add) and
 * its lanes. Deleting the set is deleting its file and its line in
 * `TRIAL_SETS`.
 */
export interface TrialSet {
    readonly id: string;
    readonly cards: readonly Card[];
    readonly lanes: readonly CardLane[];
}

/**
 * The grey office: three colourless cards. Its test deck is the fresh-run
 * deck, Blow 5 / Ward 3 / Word 2 (`STARTING_CARD_IDS` reads it from here).
 */
export const GREY_LANE: CardLane = Object.freeze({
    id: 'grey',
    name: 'Grey office',
    cardIds: Object.freeze(GREY_OFFICE_CARDS.map(card => card.id)),
    testDeck: Object.freeze([
        'grey-strike', 'grey-strike', 'grey-strike', 'grey-strike', 'grey-strike',
        'grey-ward', 'grey-ward', 'grey-ward',
        'grey-word', 'grey-word',
    ]),
});

/** Every registered lane, in the order the dev menu lists them: the grey
 *  office, then each registered trial set's lanes. */
export const CARD_LANES: readonly CardLane[] = Object.freeze([
    GREY_LANE,
    ...TRIAL_SETS.flatMap(set => set.lanes),
]);

/**
 * Looks a lane up by id.
 *
 * @param id    - A lane id, e.g. `'grey'`.
 * @param lanes - The registry to search; defaults to {@link CARD_LANES}.
 * @returns The lane, or `undefined` for an id no lane carries (a save can
 *          name a lane that was later removed).
 * @example getCardLane('grey')?.name // 'Grey office'
 */
export function getCardLane(id: string, lanes: readonly CardLane[] = CARD_LANES): CardLane | undefined {
    return lanes.find(lane => lane.id === id);
}

/**
 * The card ids of the named lanes, merged in the order given, each id once.
 * Unknown lane ids are skipped.
 *
 * @param laneIds - Lane ids, e.g. `['grey']`.
 * @param lanes   - The registry to read; defaults to {@link CARD_LANES}.
 * @returns The merged card ids; `[]` when no id names a registered lane.
 * @example laneRewardPool(['grey']) // ['grey-strike', 'grey-ward', 'grey-word']
 */
export function laneRewardPool(laneIds: readonly string[], lanes: readonly CardLane[] = CARD_LANES): string[] {
    const ids = laneIds
        .map(id => getCardLane(id, lanes))
        .filter((lane): lane is CardLane => lane !== undefined)
        .flatMap(lane => lane.cardIds);
    return [...new Set(ids)];
}

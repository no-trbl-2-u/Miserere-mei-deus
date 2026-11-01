/**
 * The character roster: the archetypes a run can open as.
 *
 * A character is a starting point for a run, not a preset: it carries a
 * portrait, a starting relic (worn from the first node), a stat spread, two
 * starting card lanes other than the relic's lane, three starting lane cards
 * (one per starting lane and one from the relic's lane) and a one-line
 * playstyle. `createNewGameState({ characterId })`
 * (`Game/game.reducer.ts`) turns a definition into a run.
 *
 * Every run opens as a roster character (NEW GAME goes through the select
 * screen); a save with no `characterId` predates characters and is only
 * offered for deletion.
 *
 * Everything here is data or a pure function over plain values. The checker
 * takes the lane registry and the relic library as optional last arguments,
 * so tests can pass fixtures.
 */

import type { BaseStats } from './types';
import type { Equipment } from '../Items/types';
import { CARD_LANES, GREY_LANE, getCardLane, type CardLane } from '../Cards/card.lanes';
import { getCardById } from '../Cards/cards.library';
import { relicLibrary } from '../Items/relic.library';
import { relicLaneId } from '../Items/relic-lanes';

/**
 * One character a run can open as.
 *
 * @property id               - Stable key, saved as `Character.characterId`.
 * @property name             - The character's name.
 * @property portraitKey      - A portrait id from the mobile gallery.
 * @property startingRelicId  - A relic in the relic library; worn at run start.
 * @property baseStats        - HEART / BODY / MIND, totalling the fresh-run budget.
 * @property startingLaneIds  - Two registered lanes, neither the relic's lane nor grey.
 * @property startingCardIds  - Three lane cards: one from each starting lane and
 *                              one from the relic's lane, in any order.
 * @property playstyle        - One short line the select screen shows.
 */
export interface CharacterDefinition {
    readonly id: string;
    readonly name: string;
    readonly portraitKey: string;
    readonly startingRelicId: string;
    readonly baseStats: Readonly<BaseStats>;
    readonly startingLaneIds: readonly [string, string];
    readonly startingCardIds: readonly [string, string, string];
    readonly playstyle: string;
}

/** The level-1 stat spread of a run with no character. */
export const FRESH_RUN_BASE_STATS: Readonly<BaseStats> = Object.freeze({ heart: 5, body: 5, mind: 5 });

/** The stat points a fresh run starts with; every character's stats total this. */
export const FRESH_RUN_STAT_BUDGET =
    FRESH_RUN_BASE_STATS.heart + FRESH_RUN_BASE_STATS.body + FRESH_RUN_BASE_STATS.mind;

/** The grey part of a character's deck: Blow 3, Ward 2, Word 2 (copies kept). */
export const CHARACTER_GREY_DECK: readonly string[] = Object.freeze([
    'grey-strike', 'grey-strike', 'grey-strike',
    'grey-ward', 'grey-ward',
    'grey-word', 'grey-word',
]);

/**
 * Every character a run can open as. T's words for each field are in
 * `plan/phases/phase_CH1_character_select.md` ("T's characters").
 */
export const CHARACTER_ROSTER: readonly CharacterDefinition[] = Object.freeze([
    Object.freeze({
        id: 'the-chosen',
        name: 'The Chosen',
        portraitKey: 'altair-man',
        startingRelicId: 'relic-disarming-plea',
        baseStats: Object.freeze({ heart: 7, body: 3, mind: 5 }),
        startingLaneIds: Object.freeze(['defender', 'blood-price'] as const) as readonly [string, string],
        startingCardIds: Object.freeze(['df-e-09c', 'bp-m-01d', 'mc-e-07b'] as const) as readonly [string, string, string],
        playstyle: 'Fumbling Squire trying to hold the line',
    }),
]);

/**
 * Looks a character up by id.
 *
 * @param id     - A character id.
 * @param roster - The roster to search; defaults to {@link CHARACTER_ROSTER}.
 * @returns The definition, or `undefined` for an id no character carries.
 */
export function getCharacterDefinition(
    id: string,
    roster: readonly CharacterDefinition[] = CHARACTER_ROSTER,
): CharacterDefinition | undefined {
    return roster.find(def => def.id === id);
}

/**
 * The ten-card deck a character's run is dealt: {@link CHARACTER_GREY_DECK}
 * then the three starting lane cards.
 */
export function characterDeck(def: Pick<CharacterDefinition, 'startingCardIds'>): string[] {
    return [...CHARACTER_GREY_DECK, ...def.startingCardIds];
}

/** Which rule a character definition breaks. */
export type CharacterProblemCode =
    | 'relic-unknown'
    | 'relic-no-lane'
    | 'lane-grey'
    | 'lane-unregistered'
    | 'lane-is-relic-lane'
    | 'lanes-equal'
    | 'stats-budget'
    | 'card-unknown'
    | 'card-forbidden-type'
    | 'cards-not-one-per-lane';

/** One broken rule, with a sentence naming it. */
export interface CharacterProblem {
    readonly code: CharacterProblemCode;
    readonly message: string;
}

/** Card types a starting lane card may not be. */
const FORBIDDEN_STARTING_CARD_TYPES: ReadonlySet<string> = new Set(['spell', 'curse']);

/**
 * Every rule a character definition breaks; `[]` when it is sound.
 *
 * The rules: the relic is in the library and opens a registered lane; each
 * starting lane is registered, is not grey and is not the relic's lane; the
 * two starting lanes differ; the stats total {@link FRESH_RUN_STAT_BUDGET};
 * each starting card exists and is not a Spell or a Curse (a Global may
 * start); and the three cards are exactly one from each starting lane and one
 * from the relic's lane.
 *
 * @param def    - The definition to check.
 * @param lanes  - The lane registry; defaults to {@link CARD_LANES}.
 * @param relics - The relic library; defaults to {@link relicLibrary}.
 * @returns The problems found, in rule order.
 */
export function characterProblems(
    def: CharacterDefinition,
    lanes: readonly CardLane[] = CARD_LANES,
    relics: readonly Equipment[] = relicLibrary,
): CharacterProblem[] {
    const problems: CharacterProblem[] = [];
    const add = (code: CharacterProblemCode, message: string) => problems.push({ code, message });

    const relic = relics.find(r => r.id === def.startingRelicId);
    const relicLane = relic ? relicLaneId(relic, lanes, relics) : undefined;
    if (!relic) add('relic-unknown', `${def.id}: relic ${def.startingRelicId} is not in the relic library`);
    else if (relicLane === undefined) add('relic-no-lane', `${def.id}: relic ${def.startingRelicId} opens no registered lane`);

    for (const laneId of def.startingLaneIds) {
        if (laneId === GREY_LANE.id) add('lane-grey', `${def.id}: grey is not a lane a character starts with`);
        else if (!getCardLane(laneId, lanes)) add('lane-unregistered', `${def.id}: lane ${laneId} is not registered`);
        if (relicLane !== undefined && laneId === relicLane) {
            add('lane-is-relic-lane', `${def.id}: starting lane ${laneId} is the relic's lane`);
        }
    }
    if (def.startingLaneIds[0] === def.startingLaneIds[1]) {
        add('lanes-equal', `${def.id}: the two starting lanes are both ${def.startingLaneIds[0]}`);
    }

    const { heart, body, mind } = def.baseStats;
    const total = heart + body + mind;
    if (total !== FRESH_RUN_STAT_BUDGET) {
        add('stats-budget', `${def.id}: stats total ${total}, not ${FRESH_RUN_STAT_BUDGET}`);
    }

    for (const cardId of def.startingCardIds) {
        const card = getCardById(cardId);
        if (!card) add('card-unknown', `${def.id}: card ${cardId} is not in the card library`);
        else if (FORBIDDEN_STARTING_CARD_TYPES.has(card.cardType)) {
            add('card-forbidden-type', `${def.id}: card ${cardId} is a ${card.cardType}`);
        }
    }

    // With no relic lane the relic problem above already says why; no cascade.
    if (relicLane !== undefined && !isOneCardPerLane(def.startingCardIds, [...def.startingLaneIds, relicLane], lanes)) {
        add('cards-not-one-per-lane', `${def.id}: the starting cards are not exactly one card from each of its two starting lanes and one from the relic's lane`);
    }
    return problems;
}

/**
 * Whether the cards can be matched one-to-one with the lanes, each card in its
 * lane. A missing lane (`undefined`) matches no card.
 */
function isOneCardPerLane(
    cardIds: readonly string[],
    laneIds: readonly (string | undefined)[],
    lanes: readonly CardLane[],
): boolean {
    if (cardIds.length !== laneIds.length) return false;
    const holds = (laneId: string | undefined, cardId: string) =>
        laneId !== undefined && (getCardLane(laneId, lanes)?.cardIds.includes(cardId) ?? false);
    const permute = (cards: readonly string[], rest: readonly (string | undefined)[]): boolean => {
        if (cards.length === 0) return true;
        const [card, ...others] = cards;
        return rest.some((laneId, i) => holds(laneId, card) && permute(others, rest.filter((_, j) => j !== i)));
    };
    return permute(cardIds, laneIds);
}

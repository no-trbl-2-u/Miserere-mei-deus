/**
 * Hazard puzzle demo board presenter (dev menu only). Maps a puzzle layout,
 * its session and its outcome onto render-ready view models: the board and
 * the route pick are the live hazard's own `HazardViewModel`, so the puzzle
 * plays on the live `HazardBoard` and `RouteSelect`. Pure: no store writes,
 * no rolls, no rule decisions; the clock arithmetic lives here so a test can
 * drive it.
 */

import {
    createHazardPuzzleSession,
    getHazardCardDef,
    getHazardDef,
    HAZARD_PUZZLE_CANDIDATES,
    HAZARD_PUZZLE_CLOCK_SECONDS,
    HAZARD_PUZZLE_FAILURE,
    HAZARD_PUZZLE_LIBRARY,
    HAZARD_PUZZLE_REWARDS,
    HAZARD_PUZZLE_UNLOCK_DIE,
    hazardProjectedProgress,
    type HazardPuzzleBand,
    type HazardPuzzleCandidate,
    type HazardPuzzleLayout,
    type HazardPuzzleOutcome,
    type HazardPuzzleResult,
    type HazardPuzzleSession,
    type HazardPuzzleUnlock,
    type HazardRouteKey,
} from '@mechanics';
import {
    HAZARD_PUZZLE_BAND_LABEL,
    HAZARD_PUZZLE_CLEARED,
    HAZARD_PUZZLE_CONFIRM_LABEL,
    HAZARD_PUZZLE_CONFIRM_SUB,
    HAZARD_PUZZLE_DIE_WORD,
    HAZARD_PUZZLE_NO_PENALTY,
    HAZARD_PUZZLE_ROUND_LABEL,
    HAZARD_PUZZLE_SHORT,
    HAZARD_PUZZLE_TIME_UP,
    HAZARD_PUZZLE_CANDIDATE_GROUP_EMPTY,
    hazardPuzzleBandChip,
    hazardPuzzleCandidateDetail,
    hazardPuzzleCandidateGroupHeading,
    hazardPuzzleItemChip,
    hazardPuzzleReached,
    hazardPuzzleReserve,
    hazardPuzzleRouteBadge,
    hazardPuzzleRouteCta,
    hazardPuzzleRoutePenalty,
    hazardPuzzleRouteReward,
    hazardPuzzleScarChip,
    hazardPuzzleShillingsChip,
    hazardPuzzleUnlockBlank,
    hazardPuzzleUnlockCard,
    hazardPuzzleUnlockDie,
    hazardPuzzleUnlockLine,
    hazardPuzzleVitaeChip,
    hazardPuzzleXpChip,
} from './hazard-puzzle.copy';
import {
    hazardDieVM,
    hazardEntryCardVM,
    hazardRouteMeters,
    hazardThresholdLadder,
    type HazardDieRoll,
    type HazardRouteChoiceVM,
    type HazardViewModel,
} from './hazard.engine';

// ---------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------

export interface HazardPuzzleListItemVM {
    id: string;
    title: string;
    bandChip: string;
    testID: string;
}

export function selectHazardPuzzleListVM(
    library: readonly HazardPuzzleLayout[] = HAZARD_PUZZLE_LIBRARY,
): HazardPuzzleListItemVM[] {
    return library.map((l) => ({
        id: l.id,
        title: l.title,
        bandChip: hazardPuzzleBandChip(l.bands.risk),
        testID: `hazard-puzzle-pick-${l.id}`,
    }));
}

// ---------------------------------------------------------------------------
// The candidates, grouped by intended band
// ---------------------------------------------------------------------------

export interface HazardPuzzleCandidateItemVM {
    id: string;
    /** The authored pattern, the row's headline. */
    label: string;
    /** The live hazard's title and the nominated route. */
    detail: string;
    testID: string;
}

export interface HazardPuzzleCandidateGroupVM {
    band: HazardPuzzleBand;
    heading: string;
    items: HazardPuzzleCandidateItemVM[];
    /** Set when the group holds no candidate, so the board still shows the band. */
    emptyLine: string | null;
    testID: string;
}

/** The candidate groups' order on the board. */
const CANDIDATE_BAND_ORDER: readonly HazardPuzzleBand[] = ['easy', 'medium', 'hard'];

/**
 * The candidate list: always three groups, easy then medium then hard, each
 * holding the candidates whose `intendedBand` it names, in authored order.
 * A band with no candidate still gets its group, with an empty line.
 */
export function selectHazardPuzzleCandidateGroupsVM(
    candidates: readonly HazardPuzzleCandidate[] = HAZARD_PUZZLE_CANDIDATES,
): HazardPuzzleCandidateGroupVM[] {
    return CANDIDATE_BAND_ORDER.map((band) => {
        const items = candidates
            .filter((c) => c.intendedBand === band)
            .map((c) => ({
                id: c.id,
                label: c.label,
                detail: hazardPuzzleCandidateDetail(c.title, c.route),
                testID: `hazard-puzzle-candidate-${c.id}`,
            }));
        return {
            band,
            heading: hazardPuzzleCandidateGroupHeading(band, items.length),
            items,
            emptyLine: items.length === 0 ? HAZARD_PUZZLE_CANDIDATE_GROUP_EMPTY : null,
            testID: `hazard-puzzle-candidate-group-${band}`,
        };
    });
}

/** True when a layout is a candidate (it carries an intended band and a nominated route). */
export function isHazardPuzzleCandidate(layout: HazardPuzzleLayout): layout is HazardPuzzleCandidate {
    return 'intendedBand' in layout && 'route' in layout;
}

// ---------------------------------------------------------------------------
// Routes and the clock
// ---------------------------------------------------------------------------

/**
 * Seconds on the clock for a route: the band constant of that route. A
 * candidate on its nominated route runs on its intended band's clock, the
 * band it is authored and ruled against; any other route reads the solver's band.
 */
export function hazardPuzzleClockFor(layout: HazardPuzzleLayout, route: HazardRouteKey): number {
    const band = isHazardPuzzleCandidate(layout) && layout.route === route ? layout.intendedBand : layout.bands[route];
    return HAZARD_PUZZLE_CLOCK_SECONDS[band];
}

/** One second off the clock, never below zero. */
export function tickHazardPuzzleClock(remaining: number): number {
    return Math.max(0, remaining - 1);
}

/** True once the clock has run out: the board confirms as it stands. */
export function hazardPuzzleClockExpired(remaining: number): boolean {
    return remaining <= 0;
}

/** `m:ss`, the board's clock face. */
export function formatHazardPuzzleClock(remaining: number): string {
    const s = Math.max(0, Math.floor(remaining));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// The stat-unlock line
// ---------------------------------------------------------------------------

function unlockPart(u: HazardPuzzleUnlock): string {
    if (u.kind === 'extraDie') return hazardPuzzleUnlockDie(u.stat, u.min, HAZARD_PUZZLE_DIE_WORD[HAZARD_PUZZLE_UNLOCK_DIE[u.stat]]);
    if (u.kind === 'extraCard') return hazardPuzzleUnlockCard(u.stat, u.min, getHazardCardDef(u.cardId).name);
    return hazardPuzzleUnlockBlank(u.stat, u.min, HAZARD_PUZZLE_DIE_WORD[u.face]);
}

/** Names what the player's stats unlocked (the unlocks the session was built with). */
export function selectHazardPuzzleUnlockLine(unlocks: readonly HazardPuzzleUnlock[]): string {
    return hazardPuzzleUnlockLine(unlocks.map(unlockPart));
}

// ---------------------------------------------------------------------------
// The board: the live hazard view model, one round
// ---------------------------------------------------------------------------

/** Seconds left at which the clock face turns urgent. */
export const HAZARD_PUZZLE_URGENT_SECONDS = 10;

/** The puzzle strip over the board: the clock and the reserve count. */
export interface HazardPuzzleStripVM {
    clockLabel: string;
    clockUrgent: boolean;
    reserveLabel: string;
}

export function selectHazardPuzzleStripVM(session: HazardPuzzleSession, remaining: number): HazardPuzzleStripVM {
    return {
        clockLabel: formatHazardPuzzleClock(remaining),
        clockUrgent: remaining <= HAZARD_PUZZLE_URGENT_SECONDS,
        reserveLabel: hazardPuzzleReserve(session.board.drawPile.length),
    };
}

/** The goal on a route as the live meters read it: combined on safe, `[force, escape]` on risk. */
function routeGoal(layout: HazardPuzzleLayout, route: HazardRouteKey): number | readonly [number, number] {
    return route === 'risk' ? layout.goals.risk : layout.goals.safe;
}

/** The route panels: each route's one-round goal, its band and clock, and what it pays and costs. */
function puzzleRouteChoices(layout: HazardPuzzleLayout): HazardRouteChoiceVM[] {
    const def = getHazardDef(layout.hazardId);
    return (['safe', 'risk'] as const).map((key) => {
        const name = key === 'risk' ? def.riskRouteName : def.safeRouteName;
        return {
            key,
            name,
            badge: hazardPuzzleRouteBadge(HAZARD_PUZZLE_BAND_LABEL[layout.bands[key]], hazardPuzzleClockFor(layout, key)),
            badgeTone: key === 'risk' ? 'sulfur' : 'bone',
            description: key === 'risk' ? def.riskRouteDesc : def.safeRouteDesc,
            ladder: hazardThresholdLadder(key, [routeGoal(layout, key)]),
            rewardLabel: hazardPuzzleRouteReward(HAZARD_PUZZLE_REWARDS.purse[key]),
            penaltyLabel: hazardPuzzleRoutePenalty(HAZARD_PUZZLE_FAILURE.maxVitaeLoss[key]),
            ctaLabel: hazardPuzzleRouteCta(name),
            dual: key === 'risk',
        };
    });
}

/**
 * The puzzle as the live hazard view model, so `HazardBoard` and
 * `RouteSelect` render it unchanged. A field the puzzle lacks takes its
 * one-round value: one round, one ledger mark, no momentum, the reserve as
 * the deck count, and a CONFIRM resolve that is armed for the whole round.
 *
 * Inputs: `layout`; `session`, the puzzle round (a preview session before
 * the route is picked); `phase`, `route-select` for the route pick, else
 * `playing` while the round runs (a resolved session reads `outcome`).
 * Outputs: a `HazardViewModel` with no resolve flash, outcome or rewards;
 * the puzzle's own outcome panel shows the result.
 */
export function selectHazardPuzzleViewModel(
    layout: HazardPuzzleLayout,
    session: HazardPuzzleSession,
    phase: 'route-select' | 'playing' = 'playing',
): HazardViewModel {
    const board = session.board;
    const def = getHazardDef(layout.hazardId);
    const routeSelect = phase === 'route-select';
    const route = session.route;
    const isRisk = route === 'risk';
    const proj = hazardProjectedProgress(board);
    const { meters, meterDetail } = hazardRouteMeters(route, proj, routeGoal(layout, route));
    const dice = board.dice.map(hazardDieVM);
    const playing = !routeSelect && session.phase === 'playing';
    return {
        active: true,
        phase: routeSelect ? 'route-select' : playing ? 'playing' : 'outcome',
        title: layout.title,
        scenario: def.scenario,
        boardHeadline: def.boardHeadline,
        boardNote: isRisk ? def.riskBoardNote : def.safeBoardNote,
        roundLabel: HAZARD_PUZZLE_ROUND_LABEL,
        roundRoman: 'I',
        totalRounds: 1,
        marks: board.marks,
        routeKey: routeSelect ? null : route,
        routeLabel: routeSelect ? '' : isRisk ? 'RISK ROUTE' : 'SAFE ROUTE',
        routeChoices: routeSelect ? puzzleRouteChoices(layout) : [],
        dice,
        diceReady: dice.filter((d) => d.usable).length,
        hexCount: dice.filter((d) => d.isHex).length,
        bothRequired: isRisk,
        meters,
        meterDetail,
        momentumNote: null,
        hand: board.hand.map((entry) => hazardEntryCardVM(entry, board)),
        play: board.play.map((entry) => hazardEntryCardVM(entry, board)),
        deckCount: board.drawPile.length,
        discardCount: board.discardPile.length,
        thresholdLadder: hazardThresholdLadder(route, [routeGoal(layout, route)]),
        resolveEnabled: playing,
        resolveLabel: HAZARD_PUZZLE_CONFIRM_LABEL,
        resolveSubLabel: HAZARD_PUZZLE_CONFIRM_SUB,
        resolveFlash: null,
        outcome: null,
        rewards: null,
    };
}

/**
 * The route pick before the clock: the live route panels over a preview of
 * the opening hand (the stat unlocks already granted).
 */
export function selectHazardPuzzleRouteSelectVM(
    layout: HazardPuzzleLayout,
    unlocks: readonly HazardPuzzleUnlock[],
): HazardViewModel {
    return selectHazardPuzzleViewModel(layout, createHazardPuzzleSession(layout, 'safe', unlocks), 'route-select');
}

// ---------------------------------------------------------------------------
// The tray between two moves: rerolled and gained dice
// ---------------------------------------------------------------------------

export interface HazardPuzzleDiceChange {
    /** Dice on both boards whose face changed (a reroll), in tray order. */
    rerolled: string[];
    /** Dice on the next board only (a gained die), in tray order. */
    gained: string[];
}

/**
 * What one move did to the tray, so the board can animate it: a reroll
 * turns a die's face in place, a gained die is new. Reads the two boards
 * only; every face is the layout's, nothing is rolled here.
 */
export function selectHazardPuzzleDiceChange(
    prev: HazardPuzzleSession,
    next: HazardPuzzleSession,
): HazardPuzzleDiceChange {
    const before = new Map(prev.board.dice.map((d) => [d.id, d.kind]));
    const rerolled: string[] = [];
    const gained: string[] = [];
    for (const d of next.board.dice) {
        const kind = before.get(d.id);
        if (kind === undefined) gained.push(d.id);
        else if (kind !== d.kind) rerolled.push(d.id);
    }
    return { rerolled, gained };
}

/**
 * The board's roll record after a reroll: each rerolled die's count goes up
 * by one (replaying its tumble), staggered in tray order. No reroll returns
 * the same record, so the memoised board does not re-render for it.
 */
export function nextHazardPuzzleDieRolls(
    rolls: Readonly<Record<string, HazardDieRoll>>,
    rerolled: readonly string[],
): Readonly<Record<string, HazardDieRoll>> {
    if (rerolled.length === 0) return rolls;
    const next = { ...rolls };
    rerolled.forEach((id, order) => {
        next[id] = { count: (rolls[id]?.count ?? 0) + 1, order };
    });
    return next;
}

// ---------------------------------------------------------------------------
// The outcome panel
// ---------------------------------------------------------------------------

export interface HazardPuzzleOutcomeVM {
    /** The goal was reached: the headline reads in the live PERFECT gold, else in blood. */
    cleared: boolean;
    /** The round's one ledger mark. */
    mark: 'O' | 'X';
    headline: string;
    reachedLabel: string;
    rewards: string[];
    penalties: string[];
}

/** What the claim actually took, after the VITAE floor of 1 and the max-VITAE floor of 5. */
export interface HazardPuzzleApplied {
    vitaeLost: number;
    scarApplied: number;
}

/**
 * The outcome panel. `applied` is what the claim took from the player; the
 * penalty lines print it rather than the outcome's nominal numbers, which
 * the floors can soften (a 4-VITAE player losing "12" loses 3).
 */
export function selectHazardPuzzleOutcomeVM(
    result: HazardPuzzleResult,
    outcome: HazardPuzzleOutcome,
    timedOut: boolean,
    applied: HazardPuzzleApplied = { vitaeLost: outcome.vitaeLoss, scarApplied: outcome.scar },
): HazardPuzzleOutcomeVM {
    const headline = result.cleared ? HAZARD_PUZZLE_CLEARED : timedOut ? HAZARD_PUZZLE_TIME_UP : HAZARD_PUZZLE_SHORT;
    const rewards = [hazardPuzzleXpChip(outcome.xp), ...outcome.items.map((i) => hazardPuzzleItemChip(i.name))];
    if (outcome.shillings > 0) rewards.push(hazardPuzzleShillingsChip(outcome.shillings));
    const penalties: string[] = [];
    if (applied.vitaeLost > 0) penalties.push(hazardPuzzleVitaeChip(applied.vitaeLost));
    if (applied.scarApplied > 0) penalties.push(hazardPuzzleScarChip(applied.scarApplied));
    if (penalties.length === 0) penalties.push(HAZARD_PUZZLE_NO_PENALTY);
    return {
        cleared: result.cleared,
        mark: result.cleared ? 'O' : 'X',
        headline,
        // Floored, so a short resolve never reads "100%" (p = 199/200 rounds up).
        reachedLabel: hazardPuzzleReached(Math.floor(result.p * 100)),
        rewards,
        penalties,
    };
}

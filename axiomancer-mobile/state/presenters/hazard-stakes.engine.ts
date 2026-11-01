/**
 * The hazard stakes card's presenter (phase ET1b): what the player reads
 * before the board. Pure; it states only what the engine states (the hazard's
 * routes, their VITAE penalty per lost round and their reward label, and the
 * road the node holds), and leaves a line off when the engine has nothing to
 * say, never guessing one.
 */

import {
    getHazardDef,
    getHazardPuzzleCandidate,
    getMapDefinition,
    HAZARD_PUZZLE_FAILURE,
    HAZARD_PUZZLE_REWARDS,
    heldRoadPlaces,
    nodePlace,
} from '@mechanics';
import type { AppStoreState } from '@/state/store';
import { hazardPuzzleClockFor } from './hazard-puzzle.engine';
import {
    HAZARD_PUZZLE_STAKES_CLEAR_LABEL,
    HAZARD_PUZZLE_STAKES_FAIL_LABEL,
    HAZARD_PUZZLE_STAKES_GOAL_LABEL,
    hazardPuzzleStakesClear,
    hazardPuzzleStakesClock,
    hazardPuzzleStakesFail,
    hazardPuzzleStakesGoal,
} from './hazard-puzzle.copy';

export interface HazardStakesLine {
    /** Stable key for tests and keys. */
    key: 'goal' | 'fail' | 'clear' | 'routes' | 'opens';
    label: string;
    /** One entry per route (or one for the held road). */
    values: string[];
}

export interface HazardStakesVM {
    place: string;
    /** "Hazard", or "Hazard · holds the road" for a held hazard. */
    kindLine: string;
    lines: HazardStakesLine[];
    cta: string;
}

export const HAZARD_STAKES_CTA = 'Face it';

/** The failing cost of one route as the engine states it, or null when it states none. */
function failText(name: string, penaltyVitae: number | undefined): string | null {
    if (penaltyVitae === undefined || penaltyVitae <= 0) return null;
    return `${name}: −${penaltyVitae} VITAE per lost round`;
}

/** The node under the player and the roads it holds (the `opens` line). */
function nodeAndOpens(state: Pick<AppStoreState, 'world'>): { nodeId: string | null; opens: string[] } {
    const map = state.world?.currentMap;
    const nodeId: string | null = map ? (map.currentNode as string) : null;
    let opens: string[] = [];
    if (map && nodeId) {
        try {
            opens = heldRoadPlaces(getMapDefinition(map.continent, map.name), nodeId);
        } catch {
            opens = [];
        }
    }
    return { nodeId, opens };
}

function opensLine(opens: string[]): HazardStakesLine[] {
    return opens.length > 0 ? [{ key: 'opens', label: 'Opens', values: opens.map((p) => `the road to ${p}`) }] : [];
}

/**
 * The stakes card at a puzzle hazard node (HP6c, A6): the one goal on the
 * candidate's graded route and its clock, what falling short costs, what
 * clearing pays and the road the node holds. No routes line: there is no
 * route choice. Null when no puzzle is open.
 */
export function selectHazardPuzzleStakes(
    state: Pick<AppStoreState, 'hazard' | 'world'>,
): HazardStakesVM | null {
    const play = state.hazard?.puzzle ?? null;
    if (!play) return null;
    const layout = getHazardPuzzleCandidate(play.candidateId);
    const route = play.session.route;
    const { nodeId, opens } = nodeAndOpens(state);
    const place = (nodeId ? nodePlace(nodeId) : null) ?? layout.title;
    const goal = route === 'risk' ? layout.goals.risk : layout.goals.safe;
    const lines: HazardStakesLine[] = [
        {
            key: 'goal',
            label: HAZARD_PUZZLE_STAKES_GOAL_LABEL,
            values: [hazardPuzzleStakesGoal(goal), hazardPuzzleStakesClock(hazardPuzzleClockFor(layout, route))],
        },
        {
            key: 'fail',
            label: HAZARD_PUZZLE_STAKES_FAIL_LABEL,
            values: hazardPuzzleStakesFail(HAZARD_PUZZLE_FAILURE.maxVitaeLoss[route], HAZARD_PUZZLE_FAILURE.scar),
        },
        {
            key: 'clear',
            label: HAZARD_PUZZLE_STAKES_CLEAR_LABEL,
            values: [hazardPuzzleStakesClear(HAZARD_PUZZLE_REWARDS.purse[route])],
        },
        ...opensLine(opens),
    ];
    return {
        place,
        kindLine: opens.length > 0 ? 'Hazard · holds the road' : 'Hazard',
        lines,
        cta: HAZARD_STAKES_CTA,
    };
}

export function selectHazardStakes(
    state: Pick<AppStoreState, 'hazard' | 'world'>,
): HazardStakesVM | null {
    const session = state.hazard?.session ?? null;
    if (!session) return null;
    const def = getHazardDef(session.hazardId);

    const { nodeId, opens } = nodeAndOpens(state);
    const place = (nodeId ? nodePlace(nodeId) : null) ?? def.title;

    const routes = [
        { name: def.safeRouteName, route: def.safe },
        { name: def.riskRouteName, route: def.risk },
    ];
    const fail = routes
        .map((r) => failText(r.name, r.route.penaltyVitae))
        .filter((t): t is string => t !== null);
    const clear = routes
        .filter((r) => r.route.rewardLabel)
        .map((r) => `${r.name}: ${r.route.rewardLabel}`);

    const lines: HazardStakesLine[] = [];
    if (fail.length > 0) lines.push({ key: 'fail', label: 'FAILING COSTS', values: fail });
    if (clear.length > 0) lines.push({ key: 'clear', label: 'CLEARING PAYS', values: clear });
    lines.push({ key: 'routes', label: 'ROUTES', values: routes.map((r) => r.name) });
    lines.push(...opensLine(opens));

    return {
        place,
        kindLine: opens.length > 0 ? 'Hazard · holds the road' : 'Hazard',
        lines,
        cta: HAZARD_STAKES_CTA,
    };
}

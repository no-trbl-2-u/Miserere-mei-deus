/**
 * The hazard stakes card's presenter (phase ET1b): what the player reads
 * before the board. Pure; it states only what the engine states (the hazard's
 * routes, their VITAE penalty per lost round and their reward label, and the
 * road the node holds), and leaves a line off when the engine has nothing to
 * say, never guessing one.
 */

import { getHazardDef, getMapDefinition, heldRoadPlaces, nodePlace } from '@mechanics';
import type { AppStoreState } from '@/state/store';

export interface HazardStakesLine {
    /** Stable key for tests and keys. */
    key: 'fail' | 'clear' | 'routes' | 'opens';
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

export function selectHazardStakes(
    state: Pick<AppStoreState, 'hazard' | 'world'>,
): HazardStakesVM | null {
    const session = state.hazard?.session ?? null;
    if (!session) return null;
    const def = getHazardDef(session.hazardId);

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
    if (opens.length > 0) lines.push({ key: 'opens', label: 'Opens', values: opens.map((p) => `the road to ${p}`) });

    return {
        place,
        kindLine: opens.length > 0 ? 'Hazard · holds the road' : 'Hazard',
        lines,
        cta: HAZARD_STAKES_CTA,
    };
}

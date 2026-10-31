/**
 * The seen record: the DANGER moves the player has watched fire. It lives on
 * `codex.seenDangers` as `<enemy slug>:<move name>` keys, an optional field, so
 * a save written before it loads and reads as "none seen". A DANGER is seen when
 * it fires in a fight the player was in, whoever won.
 */

import type { CombatEncounterState } from '../Combat/combat.encounter.types';
import { enemySlugOf } from './defeat-ledger';
import type { GameState } from './types';

/** The record's key for one DANGER move of one foe. */
export function dangerKey(slug: string, moveName: string): string {
    return `${slug}:${moveName}`;
}

/** Every key the save records as seen; empty for a save that predates the record. */
export function seenDangers(state: Pick<GameState, 'codex'>): readonly string[] {
    return state.codex.seenDangers ?? [];
}

/** True when the save records the DANGER `moveName` of `slug` as seen. */
export function hasSeenDanger(state: Pick<GameState, 'codex'>, slug: string, moveName: string): boolean {
    return seenDangers(state).includes(dangerKey(slug, moveName));
}

/** The move names of `slug`'s DANGERs the save records as seen. */
export function seenDangerNames(state: Pick<GameState, 'codex'>, slug: string | undefined): ReadonlySet<string> {
    if (!slug) return new Set();
    const prefix = `${slug}:`;
    return new Set(seenDangers(state).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length)));
}

/**
 * The keys of the DANGER moves that fired so far in a fight, in firing order,
 * de-duped. A foe the registry does not hold has no slug, so none are recorded.
 */
export function firedDangerKeys(
    state: Pick<CombatEncounterState, 'enemy' | 'threatPhases' | 'log'>,
): string[] {
    const slug = enemySlugOf(state.enemy);
    if (!slug) return [];
    const out: string[] = [];
    for (const e of state.log ?? []) {
        if (e.kind !== 'threat-fired') continue;
        const move = state.threatPhases[e.phaseIndex - 1]?.enemyMove;
        if (move?.kind !== 'danger') continue;
        const key = dangerKey(slug, move.name);
        if (!out.includes(key)) out.push(key);
    }
    return out;
}

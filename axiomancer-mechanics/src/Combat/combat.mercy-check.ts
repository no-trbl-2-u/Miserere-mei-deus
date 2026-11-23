import type { CombatEncounterState, CombatEvent } from './combat.encounter.types';
import type { Enemy } from '../Enemy/types';
import { getRng } from '../Utils/rng';
import { isLoggingEnabled, forwardCombatEventsToLog } from '../Log';

/**
 * What a won fight pays, the mercy check that can change it, and the one tuning
 * table for both.
 *
 * - `mercyCheckChance`: the chance a lethal blow on a normal or elite foe asks
 *   spare or finish.
 * - `shillingsPerLevel`: every won fight pays this times the lead foe's level,
 *   on every difficulty (a level-5 foe is 15).
 * - `spareShillingsMultiplier`: a spared foe pays this times that wage, rounded
 *   up (a level-5 foe's 15 becomes 23).
 * - `extraShillingsMultiplier`: the table's extra shillings result is this
 *   times the normal wage, on top of Spare's own.
 * - `spareTable`: the weights of the one roll a Spare pays, out of 100.
 */
export const MERCY_TUNING = {
    mercyCheckChance: 0.15,
    shillingsPerLevel: 3,
    spareShillingsMultiplier: 1.5,
    extraShillingsMultiplier: 1,
    spareTable: {
        shillings: 30,
        consumable: 30,
        upgrade: 15,
        transform: 10,
        gear: 10,
        relic: 5,
    },
} as const;

/** The chance a lethal blow on a normal or elite foe asks spare or finish. */
export const MERCY_CHECK_CHANCE = MERCY_TUNING.mercyCheckChance;

/** The shillings a won fight pays for a lead foe of `level`. */
export function fightWage(level: number): number {
    return MERCY_TUNING.shillingsPerLevel * Math.max(0, level);
}

/** The shillings a spared foe of `level` pays: 1.5 x the wage, rounded up. */
export function spareWage(level: number): number {
    return Math.ceil(MERCY_TUNING.spareShillingsMultiplier * fightWage(level));
}

/** The foes that can ask at the lethal blow: normals and elites. A boss never does. */
export function canAskMercy(enemy: Pick<Enemy, 'difficulty'>): boolean {
    return enemy.difficulty === 'normal' || enemy.difficulty === 'elite';
}

/** Whether the check is open: the foe stands at 1 VITAE and the fight waits on spare or finish. */
export function mercyCheckOpen(state: CombatEncounterState): boolean {
    return state.mercyCheck === 'offered' && state.finalOutcome === null;
}

/**
 * The check at the lethal blow. `state` is the fight as a blow left it: the foe
 * at 0 VITAE or below, the fight not yet ended. A normal or elite foe draws once
 * from `rng` and asks at the fight's chance (`mercyCheckChance`, else
 * `MERCY_CHECK_CHANCE`); any other foe draws nothing. Returns the paused fight
 * when it asks: the foe at 1 VITAE, `mercyCheck: 'offered'`, `phase:
 * 'mercy-check'`, `finalOutcome` still null. Returns null when the blow kills.
 *
 * The engine calls this where a win would be declared (`endCombat`), so every
 * lethal source passes through it: a card, a die's payload, a status tick.
 */
export function offerMercyAtBlow(
    state: CombatEncounterState,
    rng: () => number = () => getRng().random(),
): CombatEncounterState | null {
    if (state.finalOutcome !== null || state.mercyCheck !== undefined || !canAskMercy(state.enemy)) return null;
    const chance = state.mercyCheckChance ?? MERCY_CHECK_CHANCE;
    if (!(rng() < chance)) return null;
    return {
        ...state,
        enemy: { ...state.enemy, health: 1 },
        phase: 'mercy-check',
        mercyCheck: 'offered',
        mercyBlowVitae: state.enemy.health,
        // The ending's log write folds this the same way, so FINISH lands on the kill's exact state.
        enemyDotDamageThisRound: state.enemyDotDamageThisRound ?? 0,
    };
}

/**
 * Answers an open check, and the fight ends as a win. FINISH puts the foe back
 * at the VITAE the blow left it and ends the fight exactly as that blow would
 * have with no check (`mercyCheck: 'finished'`). SPARE ends it with the foe at
 * 1 VITAE (`mercyCheck: 'spared'`). Whatever the blow had not yet resolved is
 * gone: the foe takes no turn and nothing else fires. Anything but an open
 * check comes back as it is.
 */
export function chooseMercyCheck(
    state: CombatEncounterState,
    choice: 'spare' | 'finish',
): CombatEncounterState {
    if (!mercyCheckOpen(state)) return state;
    const { mercyBlowVitae, ...rest } = state;
    const enemy = choice === 'finish' ? { ...rest.enemy, health: mercyBlowVitae ?? 0 } : rest.enemy;
    const ended: CombatEvent = { kind: 'combat-ended', outcome: 'victory' };
    if (isLoggingEnabled()) forwardCombatEventsToLog([ended]);
    return {
        ...rest,
        enemy,
        phase: 'complete',
        finalOutcome: 'victory',
        mercyCheck: choice === 'spare' ? 'spared' : 'finished',
        log: [...rest.log, ended],
    };
}

/**
 * Whether a fight's ending can be paid: it has ended, and no check is open. An
 * open check holds `finalOutcome` at null, so nothing pays until it is answered.
 */
export function mercyCheckSettled(state: CombatEncounterState): boolean {
    return state.finalOutcome !== null && state.mercyCheck !== 'offered';
}

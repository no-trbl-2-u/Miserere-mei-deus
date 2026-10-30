/**
 * ENEMY RIDERS: a `phases` move's conditional effect (`EnemyMove.rider`),
 * resolved here and nowhere else. A rider touches the fight at five points,
 * one function each, all called from `resolveThreatPhase` or the card play:
 *
 *   planRiderTurn       before the move fires: shapes its hits from the board
 *                       (your hand, your discard, your VITAE, your TANGLE,
 *                       what you dealt it last turn) and cashes the state an
 *                       earlier rider left (a delayed hit, an attack bonus).
 *   riderGuardShare     during each hit: how much of your GUARD counts.
 *   riderStealPerHit    during each hit that gets through: what it takes.
 *   applyRiderAfterMove after the move's hits and words: what it leaves
 *                       behind (WARD from your GUARD, VULNERABLE on itself, a
 *                       stolen die, an armed bonus, a delayed hit).
 *   riderAfterPlay      after each of your card plays: a lengthened status.
 *
 * Adding a rider: a new member of `EnemyMoveRider` (`Enemy/types.ts`), its
 * scaled fields in `scaleRider`, and one `case` in the function for the point
 * it touches. The exhaustive switch in `scaleRider` refuses to compile until
 * the new kind is listed there.
 */

import type { EnemyMoveRider } from '../Enemy/types';
import { lookupEffect, applyEffect } from '../Effects';
import { BARNACLE_ID } from '../Cards/library/enemy-curses.cards';
import { wordsOf } from './combat.enemy-words';
import type {
    CombatEncounterState, CombatEvent, CombatThreatAction, CombatThreatEffect, EnemyRidersState,
} from './combat.encounter.types';

/** Scales a rider's level-bound numbers (`damage`, `mend`) with `scale`;
 *  counts, percentages and thresholds stay as authored. */
export function scaleRider(rider: EnemyMoveRider, scale: (n: number) => number): EnemyMoveRider {
    switch (rider.kind) {
        case 'unplayed-card-bonus':
        case 'hand-size-damage':
        case 'if-tangled':
        case 'unhit-next-attack-bonus':
            return { ...rider, damage: scale(rider.damage) };
        case 'below-half-vitae':
            return { ...rider, damage: scale(rider.damage), mend: scale(rider.mend) };
        case 'delayed-hit':
            return { ...rider, damage: scale(rider.damage) };
        case 'half-dealt-last-turn':
        case 'hits-per-discard':
        case 'half-guard':
        case 'steal-conviction-per-hit':
        case 'guard-to-ward':
        case 'self-vulnerable-on-block':
        case 'lengthen-next-status':
        case 'steal-banked-die':
            return rider;
    }
}

/** What you dealt the foe since its last turn ended. */
export function dealtSinceFoeTurn(state: Pick<CombatEncounterState, 'directDamageDealt' | 'enemyRiders'>): number {
    return Math.max(0, state.directDamageDealt - (state.enemyRiders?.dealtMark ?? 0));
}

/** The foe's turn as its rider shapes it. */
export interface RiderTurnPlan {
    /** The effects the move fires with. */
    effects: CombatThreatEffect[];
    /** The riders' state after the plan cashed what was pending. */
    riders: EnemyRidersState | undefined;
    events: CombatEvent[];
}

const isHit = (e: CombatThreatEffect): boolean => (e.damage ?? 0) > 0;

/** The move's effects with its hits replaced by `hits` (the rest kept, in order). */
function withHits(effects: readonly CombatThreatEffect[], hits: number[]): CombatThreatEffect[] {
    const rest = effects.filter(e => !isHit(e));
    return [...hits.filter(h => h > 0).map(damage => ({ damage })), ...rest];
}

/** Adds `n` to the first hit, if the move has one. */
function bumpFirstHit(effects: CombatThreatEffect[], n: number): { effects: CombatThreatEffect[]; bumped: boolean } {
    const i = effects.findIndex(isHit);
    if (i < 0 || n <= 0) return { effects, bumped: false };
    return { effects: effects.map((e, k) => (k === i ? { ...e, damage: e.damage! + n } : e)), bumped: true };
}

/**
 * Plans the foe's move from the board at the end of your turn (call it on the
 * state before the foe's turn-start fades, so your TANGLE still reads).
 * Pure: the projections call it too.
 */
export function planRiderTurn(state: CombatEncounterState, action: CombatThreatAction): RiderTurnPlan {
    const events: CombatEvent[] = [];
    let effects = action.effects.slice();
    const before = state.enemyRiders;
    const dealt = dealtSinceFoeTurn(state);
    const rider = action.rider;
    if (rider) {
        const firstHit = effects.find(isHit)?.damage ?? 0;
        switch (rider.kind) {
            case 'unplayed-card-bonus': {
                const unplayed = state.hand.filter(h => h.cardId !== BARNACLE_ID).length;
                effects = bumpFirstHit(effects, rider.damage * unplayed).effects;
                break;
            }
            case 'hand-size-damage':
                effects = withHits(effects, [rider.damage * state.hand.length]);
                break;
            case 'half-dealt-last-turn':
                effects = withHits(effects, [Math.floor(dealt / 2)]);
                break;
            case 'below-half-vitae':
                if (state.player.health * 2 < state.player.maxHealth) {
                    effects = [...withHits(effects, [rider.damage]), { enemyHeal: rider.mend }];
                }
                break;
            case 'if-tangled':
                if ((state.enemyWords?.tangle ?? 0) > 0) effects = withHits(effects, [rider.damage]);
                break;
            case 'hits-per-discard': {
                const hits = Math.max(rider.min, Math.floor(state.discard.length / rider.per));
                effects = withHits(effects, Array.from({ length: hits }, () => firstHit));
                break;
            }
            default:
                break;
        }
    }
    let riders: EnemyRidersState | undefined = before ? { ...before } : undefined;
    if (riders) {
        // The lid opens at the foe's turn.
        delete riders.lengthenStatus;
        if ((riders.unhitBonus ?? 0) > 0) {
            if (dealt <= 0) riders.nextAttackBonus = (riders.nextAttackBonus ?? 0) + riders.unhitBonus!;
            delete riders.unhitBonus;
        }
        if ((riders.nextAttackBonus ?? 0) > 0) {
            const bump = bumpFirstHit(effects, riders.nextAttackBonus!);
            if (bump.bumped) {
                events.push({ kind: 'enemy-rider', rider: 'unhit-next-attack-bonus', amount: riders.nextAttackBonus! });
                effects = bump.effects;
                delete riders.nextAttackBonus;
            }
        }
        if (riders.delayedHit) {
            const due = riders.delayedHit;
            if (dealt < due.unless) {
                effects = [{ damage: due.damage }, ...effects];
                events.push({ kind: 'enemy-rider', rider: 'delayed-hit', amount: due.damage });
            }
            delete riders.delayedHit;
        }
    }
    return { effects, riders, events };
}

/** The share of your GUARD that counts against the move's hits. */
export function riderGuardShare(rider: EnemyMoveRider | undefined): number {
    return rider?.kind === 'half-guard' ? 0.5 : 1;
}

/** Conviction a hit that got through takes. */
export function riderStealPerHit(rider: EnemyMoveRider | undefined): number {
    return rider?.kind === 'steal-conviction-per-hit' ? rider.amount : 0;
}

/** How the move's hits went, for the riders that read it. */
export interface RiderMoveOutcome {
    /** It struck and your GUARD and BARRIER stopped every hit. */
    fullyBlocked: boolean;
    /** Your GUARD when the move began. */
    guardBefore: number;
}

/**
 * What the move leaves behind once its hits and words have landed. Returns
 * the next state and its events; a move with no rider returns the state as is.
 */
export function applyRiderAfterMove(
    stateIn: CombatEncounterState, rider: EnemyMoveRider | undefined, outcome: RiderMoveOutcome,
): { state: CombatEncounterState; events: CombatEvent[] } {
    if (!rider) return { state: stateIn, events: [] };
    let state = stateIn;
    const events: CombatEvent[] = [];
    const riders = (): EnemyRidersState => state.enemyRiders ?? {};
    switch (rider.kind) {
        case 'guard-to-ward':
            if (outcome.fullyBlocked && outcome.guardBefore > 0) {
                const words = wordsOf(state);
                state = { ...state, enemyWords: { ...words, ward: words.ward + outcome.guardBefore } };
                events.push({ kind: 'enemy-word', word: 'ward', op: 'gained', amount: outcome.guardBefore });
                events.push({ kind: 'enemy-rider', rider: rider.kind, amount: outcome.guardBefore });
            }
            break;
        case 'self-vulnerable-on-block': {
            const def = lookupEffect('debuff_vulnerable');
            if (outcome.fullyBlocked && def) {
                // One turn ticks off at this round's end, so it lasts through your next `turns` turns.
                const applied = applyEffect(state.enemy.effects, def, state.round, {
                    intensityDelta: rider.pct, uncapped: true,
                    durationMode: 'additive', durationDelta: rider.turns + 1, sourceId: state.enemy.id,
                });
                state = { ...state, enemy: { ...state.enemy, effects: applied.activeEffects } };
                events.push({ kind: 'enemy-rider', rider: rider.kind, amount: rider.pct });
            }
            break;
        }
        case 'lengthen-next-status':
            state = { ...state, enemyRiders: { ...riders(), lengthenStatus: rider.turns } };
            break;
        case 'unhit-next-attack-bonus':
            state = { ...state, enemyRiders: { ...riders(), unhitBonus: rider.damage } };
            break;
        case 'delayed-hit':
            state = { ...state, enemyRiders: { ...riders(), delayedHit: { damage: rider.damage, unless: rider.unless } } };
            break;
        case 'steal-banked-die': {
            const reserve = state.reserve ?? [];
            if (reserve.length > 0) {
                state = { ...state, reserve: reserve.slice(0, -1) };
                events.push({ kind: 'enemy-rider', rider: rider.kind, amount: 1 });
            } else if (rider.tangle > 0) {
                const words = wordsOf(state);
                state = { ...state, enemyWords: { ...words, tangle: (words.tangle ?? 0) + rider.tangle } };
                events.push({ kind: 'enemy-word', word: 'tangle', op: 'gained', amount: rider.tangle });
            }
            break;
        }
        default:
            break;
    }
    return { state, events };
}

/**
 * After a card play: while a `lengthen-next-status` rider holds, the first
 * status the play put on the foe (a new or lengthened affliction, or more
 * LEECH turns) lasts that many turns longer, and the rider is spent.
 */
export function riderAfterPlay(
    before: CombatEncounterState, after: CombatEncounterState,
): { state: CombatEncounterState; events: CombatEvent[] } {
    const turns = after.enemyRiders?.lengthenStatus ?? 0;
    if (turns <= 0) return { state: after, events: [] };
    const spent = (s: CombatEncounterState): { state: CombatEncounterState; events: CombatEvent[] } => {
        const { lengthenStatus: _gone, ...rest } = s.enemyRiders ?? {};
        return {
            state: { ...s, enemyRiders: rest },
            events: [{ kind: 'enemy-rider', rider: 'lengthen-next-status', amount: turns }],
        };
    };
    const old = new Map(before.enemy.effects.map(ae => [ae.effectId, ae.remainingDuration]));
    const idx = after.enemy.effects.findIndex(ae =>
        lookupEffect(ae.effectId)?.type === 'debuff'
        && (!old.has(ae.effectId) || ae.remainingDuration > old.get(ae.effectId)!));
    if (idx >= 0) {
        const effects = after.enemy.effects.map((ae, k) =>
            (k === idx ? { ...ae, remainingDuration: ae.remainingDuration + turns } : ae));
        return spent({ ...after, enemy: { ...after.enemy, effects } });
    }
    const l0 = before.program?.leechTurns ?? 0;
    const l1 = after.program;
    if (l1 && l1.leechTurns > l0) {
        return spent({ ...after, program: { ...l1, leechTurns: l1.leechTurns + turns } });
    }
    return { state: after, events: [] };
}

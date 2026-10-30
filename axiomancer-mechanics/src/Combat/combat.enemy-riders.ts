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
 * Two more points serve the riders that change the board before the move
 * (`riderBeforeMove`) and the rule they leave for your next turn
 * (`playLimitBlock`, the curfew).
 *
 * Adding a rider: a new member of `EnemyMoveRider` (`Enemy/types.ts`), its
 * scaled fields in `scaleRider`, and one `case` in the function for the point
 * it touches. The exhaustive switch in `scaleRider` refuses to compile until
 * the new kind is listed there.
 */

import type { Enemy, EnemyMoveRider, EnemyMoveRiderKind } from '../Enemy/types';
import { lookupEffect, applyEffect } from '../Effects';
import { BARNACLE_ID } from '../Cards/library/enemy-curses.cards';
import { wordsOf } from './combat.enemy-words';
import { foeInferno, initElementState, weatherEvents, yourInferno } from './combat.elements';
import { initSpikeState, spikeEvents } from './combat.spikes';
import type {
    CombatEncounterState, CombatEvent, CombatThreatAction, CombatThreatEffect, EnemyRidersState,
    ReflectedStatus,
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
        case 'strip-weather-hits':
        case 'leech-turns-damage':
        case 'spit-held':
        case 'toll-count':
        case 'many-plays-bonus':
            return { ...rider, damage: scale(rider.damage) };
        case 'half-dealt-last-turn':
        case 'hits-per-discard':
        case 'half-guard':
        case 'steal-conviction-per-hit':
        case 'guard-to-ward':
        case 'self-vulnerable-on-block':
        case 'lengthen-next-status':
        case 'steal-banked-die':
        case 'double-if-status':
        case 'veil':
        case 'engulf-hold':
        case 'mirror-dealt':
        case 'copy-last-status':
        case 'curfew':
            return rider;
    }
}

/** True when the foe has a move (or DANGER) carrying one of these rider kinds. */
export function enemyCarriesRider(enemy: Pick<Enemy, 'phases'>, kinds: readonly EnemyMoveRiderKind[]): boolean {
    return (enemy.phases ?? []).some(p =>
        [...p.moves, ...(p.danger ? [p.danger] : [])].some(m => m.rider && kinds.includes(m.rider.kind)));
}

/** A status on you of any kind: an affliction, a LEECH or your own INFERNO. */
function carriesStatus(state: CombatEncounterState): boolean {
    const w = wordsOf(state);
    return state.player.effects.some(ae => lookupEffect(ae.effectId)?.type === 'debuff')
        || (w.leechTurns > 0 && w.leechPotency > 0)
        || yourInferno(state.program?.el ?? initElementState()) > 0;
}

/** How many of your THORNS, REFLECT and INFERNO stand (0 to 3). */
function weatherStrippable(state: CombatEncounterState): number {
    const sp = state.program?.spikes;
    return (sp && sp.thorns > 0 ? 1 : 0) + (sp && sp.reflect > 0 ? 1 : 0)
        + (yourInferno(state.program?.el ?? initElementState()) > 0 ? 1 : 0);
}

/** The cards that left your hand in one play (a Barnacle falling off is not a play). */
function playedCards(before: CombatEncounterState, after: CombatEncounterState): string[] {
    const kept = new Set(after.hand.map(h => h.uid));
    return before.hand.filter(h => !kept.has(h.uid) && h.cardId !== BARNACLE_ID).map(h => h.cardId);
}

/** Why a card cannot be played under the curfew. */
export const CURFEW_REFUSAL = 'curfew, no more cards can be played this turn';

/**
 * The curfew's refusal: on the turn after its DANGER, once `cards` cards have
 * been played every further play is refused, FREE line or PAID. Null = it can.
 */
export function playLimitBlock(state: Pick<CombatEncounterState, 'enemyRiders'>): string | null {
    const r = state.enemyRiders;
    if (!r || (r.curfew ?? 0) <= 0) return null;
    return (r.played ?? 0) >= r.curfew! ? CURFEW_REFUSAL : null;
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
            case 'double-if-status':
                if (carriesStatus(state)) effects = bumpFirstHit(effects, firstHit).effects;
                break;
            case 'strip-weather-hits':
                effects = withHits(effects, [rider.damage * weatherStrippable(state)]);
                break;
            case 'leech-turns-damage': {
                const w = wordsOf(state);
                effects = withHits(effects, [w.leechPotency > 0 ? rider.damage * w.leechTurns : 0]);
                break;
            }
            case 'mirror-dealt':
                effects = withHits(effects, [Math.min(dealt, rider.cap)]);
                break;
            case 'spit-held':
                effects = withHits(effects, [rider.damage * (before?.held?.length ?? 0)]);
                break;
            case 'toll-count':
                effects = bumpFirstHit(effects, rider.damage * (before?.tolls ?? 0)).effects;
                break;
            case 'many-plays-bonus':
                if ((before?.played ?? 0) >= rider.cards) effects = bumpFirstHit(effects, rider.damage).effects;
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
        // The lid opens, the veil lifts and the curfew ends at the foe's turn.
        delete riders.lengthenStatus;
        delete riders.veil;
        delete riders.curfew;
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

/** The riders' state as the foe's turn ends: what you dealt it is marked, and your plays are counted afresh. */
export function riderTurnEnd(riders: EnemyRidersState | undefined, directDamage: number): EnemyRidersState {
    const { played: _gone, ...rest } = riders ?? {};
    return { ...rest, dealtMark: directDamage };
}

/** The share of your GUARD that counts against the move's hits. */
export function riderGuardShare(rider: EnemyMoveRider | undefined): number {
    return rider?.kind === 'half-guard' ? 0.5 : 1;
}

/** Conviction a hit that got through takes. */
export function riderStealPerHit(rider: EnemyMoveRider | undefined): number {
    return rider?.kind === 'steal-conviction-per-hit' ? rider.amount : 0;
}

/**
 * What the move does to the board before its first hit: a rider that strips
 * your THORNS, REFLECT and INFERNO takes them first, so they do not answer
 * the strikes that follow.
 */
export function riderBeforeMove(
    state: CombatEncounterState, rider: EnemyMoveRider | undefined,
): { state: CombatEncounterState; events: CombatEvent[] } {
    const l = state.program;
    if (rider?.kind !== 'strip-weather-hits' || !l) return { state, events: [] };
    const events: CombatEvent[] = [];
    const bare = initSpikeState();
    const el = l.el ?? initElementState();
    const kept = { ...el, infSelf: 0, infShared: 0, upSelf: false, upShared: false };
    events.push(...spikeEvents(l.spikes, bare), ...weatherEvents(el, kept));
    const n = weatherStrippable(state);
    if (n > 0) events.push({ kind: 'enemy-rider', rider: rider.kind, amount: n });
    return { state: { ...state, program: { ...l, spikes: { ...l.spikes, ...bare }, el: kept } }, events };
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
        case 'veil':
            state = { ...state, enemyRiders: { ...riders(), veil: true } };
            break;
        case 'leech-turns-damage': {
            const words = wordsOf(state);
            if (words.leechTurns > 0) {
                state = { ...state, enemyWords: { ...words, leechTurns: 0, leechPotency: 0 } };
                events.push({ kind: 'enemy-word', word: 'leech', op: 'stripped', amount: words.leechTurns });
            }
            break;
        }
        case 'engulf-hold':
            state = { ...state, enemyRiders: { ...riders(), holdArmed: rider.cards } };
            break;
        case 'spit-held': {
            const held = riders().held ?? [];
            if (held.length > 0) {
                const { held: _gone, ...rest } = riders();
                state = { ...state, discard: [...state.discard, ...held], enemyRiders: rest };
                events.push({ kind: 'enemy-rider', rider: rider.kind, amount: held.length });
            }
            break;
        }
        case 'copy-last-status': {
            const last = riders().lastStatus;
            if (last) {
                state = reflectStatus(state, last);
                const { lastStatus: _gone, ...rest } = riders();
                state = { ...state, enemyRiders: rest };
                events.push({ kind: 'enemy-rider', rider: rider.kind, amount: 1 });
            }
            break;
        }
        case 'toll-count': {
            const tolls = (riders().tolls ?? 0) + 1;
            state = { ...state, enemyRiders: { ...riders(), tolls } };
            events.push({ kind: 'enemy-rider', rider: rider.kind, amount: tolls });
            break;
        }
        case 'curfew':
            state = { ...state, enemyRiders: { ...riders(), curfew: rider.cards } };
            events.push({ kind: 'enemy-rider', rider: rider.kind, amount: rider.cards });
            break;
        default:
            break;
    }
    return { state, events };
}

/** Throws the status you last put on the foe back onto you. */
function reflectStatus(state: CombatEncounterState, last: ReflectedStatus): CombatEncounterState {
    switch (last.kind) {
        case 'effect': {
            const def = lookupEffect(last.effectId);
            if (!def) return state;
            const applied = applyEffect(state.player.effects, def, state.round, {
                intensityDelta: last.intensity, uncapped: true,
                durationMode: 'additive', durationDelta: last.turns + 1, sourceId: state.enemy.id,
            });
            return { ...state, player: { ...state.player, effects: applied.activeEffects } };
        }
        case 'leech': {
            const w = wordsOf(state);
            return {
                ...state,
                enemyWords: { ...w, leechTurns: w.leechTurns + last.turns, leechPotency: w.leechPotency + last.potency },
            };
        }
        case 'inferno': {
            const l = state.program;
            if (!l) return state;
            const el = l.el ?? initElementState();
            return { ...state, program: { ...l, el: { ...el, infSelf: el.infSelf + last.amount, upSelf: false } } };
        }
    }
}

/**
 * After a card play: while a `lengthen-next-status` rider holds, the first
 * status the play put on the foe (a new or lengthened affliction, or more
 * LEECH turns) lasts that many turns longer, and the rider is spent.
 */
export function riderAfterPlay(
    before: CombatEncounterState, after: CombatEncounterState,
): { state: CombatEncounterState; events: CombatEvent[] } {
    let state = after;
    const events: CombatEvent[] = [];
    for (const step of [lengthenStep, playedStep, holdStep, lastStatusStep]) {
        const r = step(before, state);
        state = r.state;
        events.push(...r.events);
    }
    return { state, events };
}

type PlayStep = (before: CombatEncounterState, after: CombatEncounterState) => { state: CombatEncounterState; events: CombatEvent[] };

/** Counts your plays for the riders that read them (a Clapper's bonus, the curfew). */
const playedStep: PlayStep = (before, after) => {
    if (!enemyCarriesRider(after.enemy, ['many-plays-bonus', 'curfew'])) return { state: after, events: [] };
    const n = playedCards(before, after).length;
    if (n <= 0) return { state: after, events: [] };
    return { state: { ...after, enemyRiders: { ...after.enemyRiders, played: (after.enemyRiders?.played ?? 0) + n } }, events: [] };
};

/** An armed `engulf-hold`: the card you just played is HELD inside the foe, off your discard. */
const holdStep: PlayStep = (before, after) => {
    const armed = after.enemyRiders?.holdArmed ?? 0;
    if (armed <= 0) return { state: after, events: [] };
    const played = playedCards(before, after);
    const last = after.discard[after.discard.length - 1];
    if (played.length === 0 || after.discard.length <= before.discard.length || last !== played[played.length - 1]) {
        return { state: after, events: [] };
    }
    const riders = { ...after.enemyRiders, held: [...(after.enemyRiders?.held ?? []), last] };
    if (armed > 1) riders.holdArmed = armed - 1; else delete riders.holdArmed;
    return {
        state: { ...after, discard: after.discard.slice(0, -1), enemyRiders: riders },
        events: [{ kind: 'enemy-rider', rider: 'engulf-hold', amount: riders.held!.length }],
    };
};

/** Remembers the last status you put on the foe, for a `copy-last-status` rider. */
const lastStatusStep: PlayStep = (before, after) => {
    if (!enemyCarriesRider(after.enemy, ['copy-last-status'])) return { state: after, events: [] };
    let last: ReflectedStatus | undefined;
    const old = new Map(before.enemy.effects.map(ae => [ae.effectId, ae]));
    for (const ae of after.enemy.effects) {
        if (lookupEffect(ae.effectId)?.type !== 'debuff') continue;
        const was = old.get(ae.effectId);
        if (!was || ae.intensity > was.intensity || ae.remainingDuration > was.remainingDuration) {
            last = { kind: 'effect', effectId: ae.effectId, intensity: ae.intensity, turns: ae.remainingDuration };
        }
    }
    const l0 = before.program?.leechTurns ?? 0;
    const l1 = after.program;
    if (!last && l1 && l1.leechTurns > l0) last = { kind: 'leech', turns: l1.leechTurns - l0, potency: l1.leechPotency };
    const f0 = foeInferno(before.program?.el ?? initElementState());
    const f1 = foeInferno(after.program?.el ?? initElementState());
    if (!last && f1 > f0) last = { kind: 'inferno', amount: f1 - f0 };
    if (!last) return { state: after, events: [] };
    return { state: { ...after, enemyRiders: { ...after.enemyRiders, lastStatus: last } }, events: [] };
};

/** A `lengthen-next-status` rider: the next status you put on the foe lasts longer. */
const lengthenStep: PlayStep = (before, after) => {
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
};

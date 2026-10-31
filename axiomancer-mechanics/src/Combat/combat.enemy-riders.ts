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
 * The Wreck-Picker's hoard and the Tithe-Collector's LEDGER ride the same
 * state (`EnemyRidersState`): the hoard fills in `applyRiderAfterMove`, the
 * LEDGER counts your scraps and spent Conviction in `riderAfterSpend`.
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
import { isCurseCard } from './combat.card-program';
import { wordsOf } from './combat.enemy-words';
import { foeInferno, initElementState, weatherEvents, yourInferno } from './combat.elements';
import { initProgramLedger } from './combat.card-program';
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
        case 'hoard-hurl':
        case 'hoard-return':
        case 'audit':
            return { ...rider, damage: scale(rider.damage) };
        case 'hoard-ward':
            return { ...rider, ward: scale(rider.ward) };
        case 'assess':
            return {
                ...rider, perScrap: scale(rider.perScrap),
                ...(rider.perLien !== undefined ? { perLien: scale(rider.perLien) } : {}),
            };
        case 'garnish':
            return {
                ...rider, bonus: scale(rider.bonus),
                ...(rider.perLien !== undefined ? { perLien: scale(rider.perLien) } : {}),
            };
        case 'foreclose':
            return { ...rider, damage: scale(rider.damage), ward: scale(rider.ward) };
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
        case 'hoard-pick':
        case 'inferno-feed':
        case 'barnacle-on-hit':
        case 'self-vulnerable':
        case 'inferno-both':
        case 'ward-per-conviction':
            return rider;
        // The Cave Choir (phase EN1j).
        case 'verse-hit':
        case 'verse-amen':
            return { ...rider, damage: scale(rider.damage) };
        case 'antiphon':
            return { ...rider, ward: scale(rider.ward), damage: scale(rider.damage) };
        case 'verse-gain':
            return rider;
        // The lighthouse path (phase EN1k).
        case 'wick-lash':
            return { ...rider, dark: scale(rider.dark) };
        case 'bait':
            return { ...rider, ward: scale(rider.ward), damage: scale(rider.damage) };
        case 'strip-wreck':
            return { ...rider, ward: scale(rider.ward) };
        case 'lamp':
        case 'lit-only':
        case 'barnacle-if-through':
            return rider;
        // The Toll-Keeper and the Tide-Gate (phase EN1l).
        case 'toll-levy':
        case 'toll-seize':
        case 'curse-count-hit':
        case 'tide-wash':
        case 'tide-surge':
            return { ...rider, damage: scale(rider.damage) };
        case 'tide-ward':
            return { ...rider, ward: scale(rider.ward) };
        case 'distrain':
        case 'tide-ebb':
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

/** The Barnacle Curses in your hand (the Tithe-Collector's Liens). */
function liensInHand(state: Pick<CombatEncounterState, 'hand'>): number {
    return state.hand.filter(h => h.cardId === BARNACLE_ID).length;
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
    let infernoRead: number | undefined;
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
            case 'hoard-hurl':
            case 'hoard-return':
                effects = withHits(effects, [rider.damage * (before?.hoard?.length ?? 0)]);
                break;
            case 'inferno-feed': {
                infernoRead = foeInferno(state.program?.el ?? initElementState());
                effects = bumpFirstHit(effects, infernoRead).effects;
                break;
            }
            case 'assess':
                effects = bumpFirstHit(
                    effects, rider.perScrap * (state.scrapsThisTurn ?? 0) + (rider.perLien ?? 0) * liensInHand(state),
                ).effects;
                break;
            case 'garnish':
                effects = bumpFirstHit(
                    effects, (state.conviction <= 0 ? rider.bonus : 0) + (rider.perLien ?? 0) * liensInHand(state),
                ).effects;
                break;
            case 'audit':
                effects = withHits(effects, [rider.damage * (before?.ledger ?? 0)]);
                break;
            case 'foreclose':
                effects = withHits(effects, [rider.damage * state.conviction]);
                break;
            case 'verse-hit':
            case 'verse-amen':
            case 'antiphon':
                effects = planVerseMove(state, effects, rider);
                break;
            case 'wick-lash':
            case 'lit-only':
            case 'bait':
                effects = planLighthouseMove(state, effects, rider);
                break;
            case 'toll-levy':
            case 'toll-seize':
            case 'curse-count-hit':
            case 'tide-wash':
            case 'tide-ward':
            case 'tide-surge':
                effects = planCausewayMove(state, effects, rider);
                break;
            default:
                break;
        }
    }
    let riders: EnemyRidersState | undefined = before ? { ...before } : undefined;
    if (infernoRead !== undefined) riders = { ...(riders ?? {}), infernoRead };
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
export function riderTurnEnd(
    riders: EnemyRidersState | undefined, directDamage: number, hindered = false,
): EnemyRidersState {
    // A hindered foe turn never spoke, so a standing curfew's play count stands.
    const { played: _gone, ...rest } = riders ?? {};
    const kept = hindered && riders?.played !== undefined ? { ...rest, played: riders.played } : rest;
    return { ...kept, dealtMark: directDamage };
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
    // Your INFERNO goes; the foe keeps burning (its shared share folds onto it first).
    const kept = {
        ...el, infFoe: el.infFoe + el.infShared, infSelf: 0, infShared: 0,
        upFoe: el.upFoe || el.upShared, upSelf: false, upShared: false,
    };
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
    /** The fight's random source (the hoard's random pick). */
    rng?: () => number;
    /** Hits that got through your GUARD and BARRIER (absent = none). */
    hitsThrough?: number;
}

/** The foe gains `n` WARD (the event is a word gain like any other). */
function gainWard(state: CombatEncounterState, n: number, events: CombatEvent[]): CombatEncounterState {
    if (n <= 0) return state;
    const words = wordsOf(state);
    events.push({ kind: 'enemy-word', word: 'ward', op: 'gained', amount: n });
    return { ...state, enemyWords: { ...words, ward: words.ward + n } };
}

/** `n` Barnacle Curses join your hand. */
function addBarnacles(state: CombatEncounterState, n: number, events: CombatEvent[]): CombatEncounterState {
    const words = wordsOf(state);
    let uid = words.barnacleUid ?? 0;
    const added = Array.from({ length: n }, () => ({ uid: `bn${++uid}`, cardId: BARNACLE_ID }));
    events.push({ kind: 'enemy-word', word: 'barnacle', op: 'gained', amount: n });
    return { ...state, enemyWords: { ...words, barnacleUid: uid }, hand: [...state.hand, ...added] };
}

/** VULNERABLE `pct`% on the foe itself for `turns` of your turns. */
function foeVulnerable(state: CombatEncounterState, pct: number, turns: number): CombatEncounterState {
    const def = lookupEffect('debuff_vulnerable');
    if (!def) return state;
    // One turn ticks off at this round's end, so it lasts through your next `turns` turns.
    const applied = applyEffect(state.enemy.effects, def, state.round, {
        intensityDelta: pct, uncapped: true,
        durationMode: 'additive', durationDelta: turns + 1, sourceId: state.enemy.id,
    });
    return { ...state, enemy: { ...state.enemy, effects: applied.activeEffects } };
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
            if (outcome.fullyBlocked) {
                state = foeVulnerable(state, rider.pct, rider.turns);
                events.push({ kind: 'enemy-rider', rider: rider.kind, amount: rider.pct });
            }
            break;
        }
        case 'self-vulnerable':
            state = foeVulnerable(state, rider.pct, rider.turns);
            events.push({ kind: 'enemy-rider', rider: rider.kind, amount: rider.pct });
            break;
        case 'hoard-pick': {
            const discard = state.discard.slice();
            const got: string[] = [];
            for (let i = 0; i < rider.cards && discard.length > 0; i++) {
                const at = rider.from === 'top'
                    ? discard.length - 1
                    : Math.min(discard.length - 1, Math.floor((outcome.rng ?? (() => 0))() * discard.length));
                got.push(...discard.splice(at, 1));
            }
            if (got.length > 0) {
                state = { ...state, discard, enemyRiders: { ...riders(), hoard: [...(riders().hoard ?? []), ...got] } };
                events.push({ kind: 'enemy-rider', rider: rider.kind, amount: got.length });
            }
            break;
        }
        case 'hoard-ward': {
            const n = riders().hoard?.length ?? 0;
            if (n > 0) {
                state = gainWard(state, rider.ward * n, events);
                events.push({ kind: 'enemy-rider', rider: rider.kind, amount: n });
            }
            break;
        }
        case 'hoard-return': {
            const hoard = riders().hoard ?? [];
            if (hoard.length > 0) {
                let uid = riders().hoardUid ?? 0;
                const back = hoard.map(cardId => ({ uid: `hd${++uid}`, cardId }));
                const { hoard: _gone, ...rest } = riders();
                state = { ...state, hand: [...state.hand, ...back], enemyRiders: { ...rest, hoardUid: uid } };
                events.push({ kind: 'enemy-rider', rider: rider.kind, amount: hoard.length });
            }
            break;
        }
        case 'inferno-feed': {
            const read = riders().infernoRead ?? 0;
            const { infernoRead: _gone, ...rest } = riders();
            state = { ...state, enemyRiders: rest };
            if (read > 0) {
                state = gainWard(state, read, events);
                events.push({ kind: 'enemy-rider', rider: rider.kind, amount: read });
            }
            break;
        }
        case 'barnacle-on-hit':
            if (!outcome.fullyBlocked) {
                state = addBarnacles(state, 1, events);
                events.push({ kind: 'enemy-rider', rider: rider.kind, amount: 1 });
            }
            break;
        case 'inferno-both': {
            // The shared INFERNO: the foe burns in full, you by half. A fight with no
            // program ledger gets one, so the weather ticks as it does for a program deck.
            const l = state.program ?? initProgramLedger();
            const el = l.el ?? initElementState();
            const next = { ...el, infShared: el.infShared + rider.amount };
            events.push(...weatherEvents(el, next));
            state = { ...state, program: { ...l, el: next } };
            events.push({ kind: 'enemy-rider', rider: rider.kind, amount: rider.amount });
            break;
        }
        case 'ward-per-conviction': {
            const n = rider.per * state.conviction;
            if (n > 0) {
                state = gainWard(state, n, events);
                events.push({ kind: 'enemy-rider', rider: rider.kind, amount: n });
            }
            break;
        }
        case 'garnish': {
            const took = Math.min(state.conviction, rider.take);
            if (took > 0) {
                state = { ...state, conviction: state.conviction - took };
                events.push({ kind: 'enemy-rider', rider: rider.kind, amount: took });
            }
            break;
        }
        case 'audit': {
            const { ledger: _gone, ...rest } = riders();
            if ((riders().ledger ?? 0) > 0) {
                events.push({ kind: 'enemy-rider', rider: rider.kind, amount: riders().ledger! });
                state = { ...state, enemyRiders: rest };
            }
            break;
        }
        case 'foreclose': {
            const taken = state.conviction;
            if (taken > 0) {
                state = gainWard({ ...state, conviction: 0 }, rider.ward * taken, events);
                events.push({ kind: 'enemy-rider', rider: rider.kind, amount: taken });
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
        case 'verse-gain':
        case 'verse-amen':
        case 'antiphon': {
            const after = verseAfterMove(state, rider);
            state = after.state;
            events.push(...after.events);
            break;
        }
        case 'lamp':
        case 'wick-lash':
        case 'barnacle-if-through':
        case 'strip-wreck': {
            const after = lighthouseAfterMove(state, rider, outcome);
            state = after.state;
            events.push(...after.events);
            break;
        }
        case 'toll-seize':
        case 'distrain':
        case 'tide-surge':
        case 'tide-ebb': {
            const after = causewayAfterMove(state, rider, outcome.rng);
            state = after.state;
            events.push(...after.events);
            break;
        }
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
    for (const step of [lengthenStep, playedStep, holdStep, lastStatusStep, ledgerStep]) {
        const r = step(before, state);
        state = r.state;
        events.push(...r.events);
    }
    return { state, events };
}

type PlayStep = (before: CombatEncounterState, after: CombatEncounterState) => { state: CombatEncounterState; events: CombatEvent[] };

/**
 * The LEDGER counts what you spend: +1 for each card you scrap and each
 * Conviction you spend. `spent` names the Conviction a signature cost; left
 * out it is the drop in your Conviction between the two states.
 */
function ledgerStep(before: CombatEncounterState, after: CombatEncounterState, spent?: number): { state: CombatEncounterState; events: CombatEvent[] } {
    if (!enemyCarriesRider(after.enemy, ['audit'])) return { state: after, events: [] };
    const scraps = Math.max(0, (after.scrapsThisTurn ?? 0) - (before.scrapsThisTurn ?? 0));
    const n = scraps + (spent ?? Math.max(0, before.conviction - after.conviction));
    if (n <= 0) return { state: after, events: [] };
    return {
        state: { ...after, enemyRiders: { ...after.enemyRiders, ledger: (after.enemyRiders?.ledger ?? 0) + n } },
        events: [{ kind: 'enemy-rider', rider: 'audit', amount: n }],
    };
}

/**
 * After a scrap or a signature cast (not a card play): the LEDGER reads what
 * you spent. `spent` is the Conviction the signature cost.
 */
export function riderAfterSpend(
    before: CombatEncounterState, after: CombatEncounterState, spent?: number,
): { state: CombatEncounterState; events: CombatEvent[] } {
    return ledgerStep(before, after, spent);
}

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
    const p0 = before.program?.leechPotency ?? 0;
    const l1 = after.program;
    if (!last && l1 && l1.leechTurns > l0) {
        last = { kind: 'leech', turns: l1.leechTurns - l0, potency: Math.max(1, l1.leechPotency - (l0 > 0 ? p0 : 0)) };
    }
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

// ─── The Cave Choir's VERSE (phase EN1j) ─────────────────────────────────────
//
// VERSE is fight state on the foe (`enemyRiders.verse`), not a keyword: each
// Hymn adds to it, Crescendo hits for it, and the Amen spends all of it.

/** The Cave Choir's VERSE: how many verses it has sung this fight. */
export function verseOf(state: Pick<CombatEncounterState, 'enemyRiders'>): number {
    return state.enemyRiders?.verse ?? 0;
}

/** How the Antiphon answers your last turn. */
export type AntiphonAnswer = 'pews' | 'hymn';

/**
 * The Antiphon's read of your last turn: you attacked (you dealt the foe
 * damage since its last turn ended) and it answers with The Pews; otherwise
 * (you guarded, or did neither) it answers with a Hymn. Read on the board
 * your turn left: what you dealt is only re-marked when the foe's turn ends,
 * so the plan and the after-move read the same answer.
 */
export function antiphonAnswer(state: Pick<CombatEncounterState, 'directDamageDealt' | 'enemyRiders'>): AntiphonAnswer {
    return dealtSinceFoeTurn(state) > 0 ? 'pews' : 'hymn';
}

type VerseRider = Extract<EnemyMoveRider, { kind: 'verse-hit' | 'verse-amen' | 'antiphon' }>;

/** A VERSE move's effects from the board: Crescendo's hit, the Amen's hit and MEND, the Antiphon's answer. */
function planVerseMove(state: CombatEncounterState, effects: CombatThreatEffect[], rider: VerseRider): CombatThreatEffect[] {
    const verse = verseOf(state);
    switch (rider.kind) {
        case 'verse-hit':
            return withHits(effects, [rider.damage * verse]);
        case 'verse-amen': {
            const total = rider.damage * verse;
            return total > 0 ? [...withHits(effects, [total]), { enemyHeal: total }] : withHits(effects, []);
        }
        case 'antiphon':
            return antiphonAnswer(state) === 'pews'
                ? [...effects.filter(e => !isHit(e)), { ward: rider.ward }]
                : withHits(effects, Array.from({ length: rider.hits }, () => rider.damage));
    }
}

/** What a VERSE move leaves: a Hymn's verses added, the Amen's spent. */
function verseAfterMove(
    state: CombatEncounterState, rider: Extract<EnemyMoveRider, { kind: 'verse-gain' | 'verse-amen' | 'antiphon' }>,
): { state: CombatEncounterState; events: CombatEvent[] } {
    const verse = verseOf(state);
    const withVerse = (n: number): CombatEncounterState => ({ ...state, enemyRiders: { ...state.enemyRiders, verse: n } });
    switch (rider.kind) {
        case 'verse-gain':
            return { state: withVerse(verse + rider.verse), events: [{ kind: 'enemy-rider', rider: rider.kind, amount: rider.verse }] };
        case 'verse-amen':
            if (verse <= 0) return { state, events: [] };
            return { state: withVerse(0), events: [{ kind: 'enemy-rider', rider: rider.kind, amount: verse }] };
        case 'antiphon':
            if (antiphonAnswer(state) === 'pews') {
                return { state, events: [{ kind: 'enemy-rider', rider: rider.kind, amount: 0 }] };
            }
            return { state: withVerse(verse + rider.verse), events: [{ kind: 'enemy-rider', rider: rider.kind, amount: rider.verse }] };
    }
}

// ─── The lighthouse path: the Lamplighter's lamp, the Wrecker's Bait (phase EN1k) ──
//
// The lamp is fight state on the foe (`enemyRiders.lamp`, absent = Lit), not
// a keyword. While it is Dark every intent the board shows reads UNKNOWN with
// no name, and a Lit-only move (Glare) is skipped. The Wrecker's Bait reads
// your GUARD as your turn ends.

/** The Lamplighter's lamp as the board shows it. */
export type LampState = 'lit' | 'dark';

/** The lamp of a foe that carries one (`null` for every other foe). */
export function lampOf(state: Pick<CombatEncounterState, 'enemy' | 'enemyRiders'>): LampState | null {
    if (!enemyCarriesRider(state.enemy, ['lamp'])) return null;
    return state.enemyRiders?.lamp ? 'dark' : 'lit';
}

/** True while the foe's lamp is Dark: every intent the board shows reads UNKNOWN, unnamed. */
export function intentsInTheDark(state: Pick<CombatEncounterState, 'enemy' | 'enemyRiders'>): boolean {
    return lampOf(state) === 'dark';
}

/** True when the foe's next move is a Bait: your GUARD at your turn end decides it. */
export function baitSet(state: Pick<CombatEncounterState, 'threatPhases' | 'currentPhaseIndex'>): boolean {
    const cur = state.threatPhases[Math.min(state.currentPhaseIndex, state.threatPhases.length - 1)];
    return cur?.threatAction.rider?.kind === 'bait';
}

type LighthousePlanRider = Extract<EnemyMoveRider, { kind: 'wick-lash' | 'lit-only' | 'bait' }>;

/** A lighthouse move's effects from the board: Wick-Lash's dark bonus, Glare skipped in the dark, the Bait's read. */
function planLighthouseMove(
    state: CombatEncounterState, effects: CombatThreatEffect[], rider: LighthousePlanRider,
): CombatThreatEffect[] {
    switch (rider.kind) {
        case 'wick-lash':
            return lampOf(state) === 'dark' ? bumpFirstHit(effects, rider.dark).effects : effects;
        case 'lit-only':
            return lampOf(state) === 'dark' ? [] : effects;
        case 'bait':
            return (state.guard ?? 0) > 0
                ? [...effects.filter(e => !isHit(e)), { ward: rider.ward }]
                : withHits(effects, [rider.damage]);
    }
}

type LighthouseAfterRider = Extract<EnemyMoveRider, { kind: 'lamp' | 'wick-lash' | 'barnacle-if-through' | 'strip-wreck' }>;

/** What a lighthouse move leaves: the lamp turned, Wick-Lash's INFERNO, a Cudgel's Barnacle, the wreck stripped. */
function lighthouseAfterMove(
    state: CombatEncounterState, rider: LighthouseAfterRider, outcome: RiderMoveOutcome,
): { state: CombatEncounterState; events: CombatEvent[] } {
    switch (rider.kind) {
        case 'lamp': {
            const was = state.enemyRiders?.lamp;
            if (was === 'out') return { state, events: [] };
            const next: EnemyRidersState['lamp'] = rider.to === 'out' ? 'out'
                : rider.to === 'dark' ? 'dark'
                : rider.to === 'lit' ? undefined
                : was ? undefined : 'dark';
            if (next === was) return { state, events: [] };
            const { lamp: _was, ...rest } = state.enemyRiders ?? {};
            return {
                state: { ...state, enemyRiders: next ? { ...rest, lamp: next } : rest },
                events: [{ kind: 'enemy-rider', rider: rider.kind, amount: next ? 0 : 1 }],
            };
        }
        case 'wick-lash': {
            // The weather lives on the program ledger; a deck with no program card opens one here.
            const l = state.program ?? initProgramLedger();
            if (rider.inferno <= 0 || lampOf(state) !== 'lit') return { state, events: [] };
            const el = l.el ?? initElementState();
            const burnt = { ...el, infSelf: el.infSelf + rider.inferno, upSelf: false };
            return {
                state: { ...state, program: { ...l, el: burnt } },
                events: [...weatherEvents(el, burnt), { kind: 'enemy-rider', rider: rider.kind, amount: rider.inferno }],
            };
        }
        case 'barnacle-if-through': {
            if ((outcome.hitsThrough ?? 0) <= 0 || rider.barnacle <= 0) return { state, events: [] };
            const events: CombatEvent[] = [];
            const next = addBarnacles(state, rider.barnacle, events);
            events.push({ kind: 'enemy-rider', rider: rider.kind, amount: rider.barnacle });
            return { state: next, events };
        }
        case 'strip-wreck': {
            const dice = (state.reserve ?? []).length;
            const conviction = Math.min(state.conviction, rider.conviction);
            const taken = dice + conviction;
            if (taken <= 0) return { state, events: [] };
            const events: CombatEvent[] = [];
            const next = gainWard({ ...state, reserve: [], conviction: state.conviction - conviction }, rider.ward * taken, events);
            events.push({ kind: 'enemy-rider', rider: rider.kind, amount: taken });
            return { state: next, events };
        }
    }
}
// ─── The keep causeway: TOLL and TIDE (phase EN1l) ──────────────────────────
//
// The Toll-Keeper's TOLL and the Tide-Gate's TIDE are fight state on the foe
// (`enemyRiders.tollOwed`, `.tide`), not keywords. Each rises at the end of
// every foe turn; the toll is paid on your turn (`settleToll`, after the
// card-program SACRIFICE), and TIDE 0-1 leaves the gate VULNERABLE.

/** The riders that mark a foe as the Toll-Keeper (its TOLL rises each turn). */
const TOLL_RIDERS: readonly EnemyMoveRiderKind[] = ['toll-levy', 'toll-seize', 'distrain'];
/** The riders that mark a foe as the Tide-Gate (its TIDE rises each turn). */
const TIDE_RIDERS: readonly EnemyMoveRiderKind[] = ['tide-wash', 'tide-ward', 'tide-surge', 'tide-ebb'];

/** The highest TIDE. */
export const TIDE_MAX = 5;
/** At this TIDE or lower the gate is VULNERABLE. */
export const LOW_TIDE = 1;
/** How VULNERABLE the gate is at low tide, in %. */
export const LOW_TIDE_VULNERABLE_PCT = 25;

/** The TOLL owed to the Toll-Keeper. */
export function tollOwed(state: Pick<CombatEncounterState, 'enemyRiders'>): number {
    return state.enemyRiders?.tollOwed ?? 0;
}

/** The Tide-Gate's TIDE. */
export function tideOf(state: Pick<CombatEncounterState, 'enemyRiders'>): number {
    return state.enemyRiders?.tide ?? 0;
}

/** True for the Toll-Keeper: a foe whose moves read the TOLL. */
export function carriesToll(enemy: Pick<Enemy, 'phases'>): boolean {
    return enemyCarriesRider(enemy, TOLL_RIDERS);
}

/** True for the Tide-Gate: a foe whose moves read the TIDE. */
export function carriesTide(enemy: Pick<Enemy, 'phases'>): boolean {
    return enemyCarriesRider(enemy, TIDE_RIDERS);
}

/** The Curses you carry: in your hand, your draw pile and your discard. */
export function cursesCarried(state: Pick<CombatEncounterState, 'hand' | 'drawPile' | 'discard'>): number {
    return state.hand.filter(h => isCurseCard(h.cardId)).length
        + state.drawPile.filter(isCurseCard).length
        + state.discard.filter(isCurseCard).length;
}

type CausewayPlanRider = Extract<EnemyMoveRider, {
    kind: 'toll-levy' | 'toll-seize' | 'curse-count-hit' | 'tide-wash' | 'tide-ward' | 'tide-surge';
}>;

/** A TOLL or TIDE move's effects from the board. */
function planCausewayMove(state: CombatEncounterState, effects: CombatThreatEffect[], rider: CausewayPlanRider): CombatThreatEffect[] {
    switch (rider.kind) {
        case 'toll-levy':
            return bumpFirstHit(effects, rider.damage * tollOwed(state)).effects;
        case 'toll-seize':
            return withHits(effects, [rider.damage * tollOwed(state) * 2]);
        case 'curse-count-hit':
            return withHits(effects, [rider.damage * cursesCarried(state)]);
        case 'tide-wash': {
            const tide = tideOf(state);
            const hit = (effects.find(isHit)?.damage ?? 0) + rider.damage * tide;
            const twice = rider.twiceAt !== undefined && tide >= rider.twiceAt;
            return withHits(effects, twice ? [hit, hit] : [hit]);
        }
        case 'tide-ward': {
            const ward = rider.ward * tideOf(state);
            const rest = effects.filter(e => (e.ward ?? 0) <= 0);
            return ward > 0 ? [...rest, { ward }] : rest;
        }
        case 'tide-surge':
            return withHits(effects, [rider.damage * rider.to]);
    }
}

/**
 * The foe takes VULNERABLE `pct`% lasting `duration` round ends. Held, not
 * stacked: a VULNERABLE already on it keeps the larger % and the longer span.
 */
function holdFoeVulnerable(enemy: Enemy, round: number, pct: number, duration: number): Enemy {
    const def = lookupEffect('debuff_vulnerable');
    if (!def) return enemy;
    const held = enemy.effects.find(ae => ae.effectId === 'debuff_vulnerable');
    if (held) {
        if (held.intensity >= pct && held.remainingDuration >= duration) return enemy;
        return {
            ...enemy,
            effects: enemy.effects.map(ae => (ae === held
                ? { ...ae, intensity: Math.max(ae.intensity, pct), remainingDuration: Math.max(ae.remainingDuration, duration) }
                : ae)),
        };
    }
    const applied = applyEffect(enemy.effects, def, round, {
        intensityDelta: pct, uncapped: true, durationMode: 'additive', durationDelta: duration, sourceId: enemy.id,
    });
    return { ...enemy, effects: applied.activeEffects };
}

/** What a TOLL or TIDE move leaves: the TOLL doubled, a card distrained, the TIDE set. */
function causewayAfterMove(
    state: CombatEncounterState,
    rider: Extract<EnemyMoveRider, { kind: 'toll-seize' | 'distrain' | 'tide-surge' | 'tide-ebb' }>,
    rng: (() => number) | undefined,
): { state: CombatEncounterState; events: CombatEvent[] } {
    const riders = state.enemyRiders ?? {};
    switch (rider.kind) {
        case 'toll-seize': {
            const toll = tollOwed(state) * 2;
            return {
                state: { ...state, enemyRiders: { ...riders, tollOwed: toll } },
                events: [{ kind: 'enemy-rider', rider: rider.kind, amount: toll }],
            };
        }
        case 'distrain': {
            const takeable = state.hand.filter(h => !isCurseCard(h.cardId));
            if (takeable.length === 0) return { state, events: [] };
            const pick = rng ? Math.min(takeable.length - 1, Math.floor(rng() * takeable.length)) : takeable.length - 1;
            const taken = takeable[pick]!;
            return {
                state: {
                    ...state,
                    hand: state.hand.filter(h => h.uid !== taken.uid),
                    enemyRiders: { ...riders, distrained: [...(riders.distrained ?? []), taken] },
                },
                events: [{ kind: 'enemy-rider', rider: rider.kind, amount: 1 }],
            };
        }
        case 'tide-surge':
            return {
                state: { ...state, enemyRiders: { ...riders, tide: rider.to } },
                events: [{ kind: 'enemy-rider', rider: rider.kind, amount: rider.to }],
            };
        case 'tide-ebb': {
            const enemy = holdFoeVulnerable(state.enemy, state.round, rider.pct, rider.turns + 1);
            return {
                state: { ...state, enemy, enemyRiders: { ...riders, tide: rider.to } },
                events: [{ kind: 'enemy-rider', rider: rider.kind, amount: rider.pct }],
            };
        }
    }
}

/** How far the TIDE rises at the end of a turn in the foe's phase `phase`. */
function tideRise(enemy: Pick<Enemy, 'phases'>, phase: number): number {
    const moves = enemy.phases?.[phase]?.moves ?? [];
    const rises = moves.flatMap(m => (m.rider?.kind === 'tide-wash' && m.rider.rise !== undefined ? [m.rider.rise] : []));
    return rises.length > 0 ? Math.max(...rises) : 1;
}

/**
 * The end of every foe turn: the TOLL rises 1 and the TIDE rises (1, or its
 * phase's rate) up to `TIDE_MAX`, unless the move that fired set the TIDE
 * itself (`fired`: the rider of the move that fired, absent when it was
 * hindered). Then a TIDE of `LOW_TIDE` or less holds the gate VULNERABLE
 * through your next turn. A foe with neither returns the state as is.
 */
export function causewayFoeTurnEnd(
    state: CombatEncounterState, fired: EnemyMoveRider | undefined,
): CombatEncounterState {
    const toll = carriesToll(state.enemy);
    const tide = carriesTide(state.enemy);
    if (!toll && !tide) return state;
    const riders: EnemyRidersState = { ...state.enemyRiders };
    if (toll) riders.tollOwed = tollOwed(state) + 1;
    let enemy = state.enemy;
    if (tide) {
        const set = fired?.kind === 'tide-surge' || fired?.kind === 'tide-ebb';
        const phase = state.threatPhases[state.currentPhaseIndex]?.enemyMove?.phase ?? 0;
        riders.tide = set ? tideOf(state) : Math.min(TIDE_MAX, tideOf(state) + tideRise(state.enemy, phase));
        // One round end ticks off before your turn, so it lasts through it.
        if (riders.tide <= LOW_TIDE) enemy = holdFoeVulnerable(enemy, state.round, LOW_TIDE_VULNERABLE_PCT, 2);
    }
    return { ...state, enemy, enemyRiders: riders };
}

/** The fight's start: the Tide-Gate opens at low tide (TIDE 0), so VULNERABLE through the first round. */
export function causewayFightStart(enemy: Enemy, round: number): Enemy {
    return carriesTide(enemy) ? holdFoeVulnerable(enemy, round, LOW_TIDE_VULNERABLE_PCT, 1) : enemy;
}

/** Why the toll cannot be paid now, before its SACRIFICE is priced (null = it may be). */
export function tollOwedBlock(state: Pick<CombatEncounterState, 'enemy' | 'enemyRiders'>): string | null {
    if (!carriesToll(state.enemy)) return 'no toll is asked in this fight';
    return tollOwed(state) > 0 ? null : 'no toll is owed yet';
}

/** The toll paid: TOLL back to 0 and every distrained card back in your hand. */
export function settleToll(state: CombatEncounterState): CombatEncounterState {
    const { distrained = [], ...rest } = state.enemyRiders ?? {};
    return { ...state, hand: [...state.hand, ...distrained], enemyRiders: { ...rest, tollOwed: 0 } };
}

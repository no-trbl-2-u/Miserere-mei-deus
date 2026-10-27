/**
 * Fight-length (pacing) sim — how many player turns a deck takes to win, at
 * the VITAE the app's live encounters actually use.
 *
 * Two drivers, reported side by side:
 *
 *   'witness'    the matrix sim's own phase (`upgradeablePlayPhase` with the
 *                greedy policy): every live die powers a PAID line, the dice
 *                momentum-steered, then every card left in hand is played
 *                FREE. It plays nearly the whole hand every turn.
 *   'human-like' the obvious best line and no more: dice in tray order (no
 *                momentum planning), each die on the card whose PAID line
 *                reads best (`programLineValue`, the face value), FREE lines
 *                only when they do something worth doing, in hand order (no
 *                enabler-first chaining), and never a SACRIFICE that would
 *                leave VITAE at or below the telegraphed hit.
 *
 * Foes are scaled by {@link LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER}, the knob the
 * app applies to every live encounter, so the turn counts compare with play.
 * A measurement instrument: nothing here grades the game.
 */

import type { Character } from '../Character/types';
import type { Enemy } from '../Enemy/types';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard, resolveThreatPhase,
    startTurn, endTurn, playSignatureSkill, signatureCastBlock, getSignatureSkill,
    selectMercyChoice, handCards, PROGRAM_KIT,
} from './combat.engine';
import { programLineValue, programLineCost, programIllegalReason, isProgramCard } from './combat.card-program';
import { OPEN_VEIN_HEAL } from './combat.signature';
import { upgradeablePlayPhase } from './combat.encounter.sim';
import { COMBAT_SIM_POLICIES } from './combat.sim-policies';
import { getRng } from '../Utils/rng';
import { LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER } from './live-encounter';

export { LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER };
import type { CombatEncounterState, CombatManaDie } from './combat.encounter.types';


/** A copy of `enemy` with its VITAE scaled by `mult` (rounded, at least 1). */
export function scaleEnemyVitae(enemy: Enemy, mult: number): Enemy {
    if (mult === 1) return enemy;
    const maxHealth = Math.max(1, Math.round(enemy.maxHealth * mult));
    const health = Math.max(1, Math.round(enemy.health * mult));
    return { ...enemy, health, maxHealth };
}

export type PacingPolicy = 'witness' | 'human-like';

/** One fight's pacing read-out. */
export interface PacingRun {
    outcome: 'victory' | 'mercy' | 'defeat' | 'retreat';
    /** Player turns taken (tray rolls). */
    turns: number;
    /** The player's VITAE when the fight ended. */
    vitaeLeft: number;
    /** SACRIFICES made, as counted. */
    sacrifices: number;
    /** The highest LEECH potency the foe carried. */
    leechPeak: number;
}

/** The human-like signature step: The Open Hand when it can open mercy (and
 *  `mercy` is on); the Circlet's and the Ruby Signet's when the hand holds a
 *  SACRIFICE to arm; Open Vein when the foe carries LEECH or the HEAL would
 *  land in full. */
function castSignatures(s: CombatEncounterState, mercy: boolean): CombatEncounterState {
    let state = s;
    for (const id of state.signatures) {
        const sig = getSignatureSkill(id);
        if (!sig || signatureCastBlock(state, sig)) continue;
        if (sig.kind === 'mercy' && !mercy) continue;
        if (sig.kind === 'sacrifice-heals' || sig.kind === 'sacrifice-leech') {
            const sacInHand = state.hand.some(h => isProgramCard(h.cardId)
                && (programLineCost(state, h.uid, false, PROGRAM_KIT) > 0 || programLineCost(state, h.uid, true, PROGRAM_KIT) > 0));
            if (!sacInHand) continue;
        }
        if (sig.kind === 'heal-trigger-leech') {
            const leech = (state.program?.leechTurns ?? 0) > 0 && (state.program?.leechPotency ?? 0) > 0;
            const missing = state.player.maxHealth - state.player.health;
            if (!leech && missing < OPEN_VEIN_HEAL) continue;
        }
        if (sig.kind === 'clear-yours-trigger-storm' && (state.program?.el?.storm ?? 0) <= 0) continue;
        state = playSignatureSkill(state, id).state;
        if (state.finalOutcome || state.mercyChoiceActive) return state;
    }
    return state;
}

/** The dice a human reads off the table, in tray order: live tray faces,
 *  then banked Reserve dice, then surge dice. */
function liveDice(s: CombatEncounterState): CombatManaDie[] {
    const tray = s.dice.filter(d => d.state === 'available' && d.color !== 'x' && !d.floating && d.face !== 'miss');
    const floating = s.dice.filter(d => d.state === 'available' && d.floating);
    return [...tray, ...(s.reserve ?? []), ...floating];
}

/** A SACRIFICE the human pays only when it leaves VITAE above the telegraphed hit. */
function safe(s: CombatEncounterState, uid: string, paid: boolean): boolean {
    const cost = programLineCost(s, uid, paid, PROGRAM_KIT);
    if (cost <= 0) return true;
    return s.player.health - cost > PROGRAM_KIT.incomingNet(s);
}

/** The face value of a line: a program card's own estimate, a grey card's printed damage preview. */
function lineValue(s: CombatEncounterState, uid: string, paid: boolean): number {
    const entry = s.hand.find(h => h.uid === uid);
    if (!entry) return -Infinity;
    if (isProgramCard(entry.cardId)) {
        if (programIllegalReason(s, uid, paid, PROGRAM_KIT) !== null || !safe(s, uid, paid)) return -Infinity;
        return programLineValue(s, uid, paid, PROGRAM_KIT);
    }
    const card = handCards(s).find(c => c.uid === uid)?.card;
    return paid ? 1 + (card?.bottomDamagePreview ?? 0) : 1;
}

/** One human-like player turn. `maxPlays` caps the cards played (PAID and
 *  FREE together) — a calibration knob for a player who reads a hand slowly. */
function humanLikePhase(stateIn: CombatEncounterState, maxPlays: number, mercy: boolean): CombatEncounterState {
    let s = stateIn;
    let plays = 0;
    if (s.dice.length === 0 && !s.turnTakenThisPhase) {
        s = startTurn(s).state;
        if (s.phase !== 'phase-play') return s;
    }
    s = castSignatures(s, mercy);
    if (s.finalOutcome || s.mercyChoiceActive) return s;

    // Each die, in tray order, on the best-reading PAID line it can power.
    const used = new Set<string>();
    for (let guard = 0; guard < 12 && plays < maxPlays; guard++) {
        const die = liveDice(s).find(d => !used.has(d.id));
        if (!die) break;
        used.add(die.id);
        let best: { uid: string; v: number } | null = null;
        for (const c of handCards(s)) {
            const stance = c.card.stance;
            if (!(die.color === 'wild' || stance === 'any' || stance === die.color)) continue;
            const v = lineValue(s, c.uid, true);
            if (v > 0 && (!best || v > best.v)) best = { uid: c.uid, v };
        }
        if (!best) continue;
        const r = playCombatCard(s, { uid: best.uid }, true, die.id);
        if (r.events.some(e => e.kind === 'effect-fizzled')) continue;
        s = r.state;
        plays++;
        if (s.finalOutcome || s.phase !== 'phase-play') return s;
    }

    // FREE lines worth playing, in hand order; the rest stay in hand.
    const held = new Set<string>();
    for (let guard = 0; guard < 12 && plays < maxPlays; guard++) {
        const next = s.hand.find(h => !held.has(h.uid) && lineValue(s, h.uid, false) > 0);
        if (!next) break;
        held.add(next.uid);
        const r = playCombatCard(s, { uid: next.uid }, false);
        if (r.events.some(e => e.kind === 'effect-fizzled')) continue;
        s = r.state;
        plays++;
        if (s.finalOutcome || s.phase !== 'phase-play') return s;
    }
    if (s.phase === 'phase-play' && !s.finalOutcome && s.turnTakenThisPhase) s = endTurn(s).state;
    return s;
}

/** Runs one seeded fight under `policy` and reads its pacing. */
export function runPacingEncounter(
    player: Character, enemy: Enemy, deck: readonly string[], seed: number, policy: PacingPolicy,
    opts: { maxPlaysPerTurn?: number; mercy?: boolean } = {},
): PacingRun {
    // A PAID line plays only a card the player knows; the deck is the known set.
    const knower = { ...player, knownCards: [...new Set([...(player.knownCards ?? []), ...deck])] };
    let s = rollEncounterDice(initializeCombatEncounter(knower, enemy, [...deck], seed)).state;
    const rng = (): number => getRng().random();
    const mercy = opts.mercy ?? true;
    const greedy = COMBAT_SIM_POLICIES.greedy;
    const witness = mercy ? greedy : { ...greedy, signatureKinds: greedy.signatureKinds.filter(k => k !== 'mercy') };
    let leechPeak = 0;
    const sample = (): void => { leechPeak = Math.max(leechPeak, s.program?.leechPotency ?? 0); };
    for (let guard = 0; guard < 200 && s.phase !== 'complete' && !s.finalOutcome; guard++) {
        if (s.mercyChoiceActive) { s = selectMercyChoice(s, 'spare').state; continue; }
        if (s.phase !== 'phase-play') break;
        s = policy === 'witness'
            ? upgradeablePlayPhase(s, witness, rng, {}, {}).state
            : humanLikePhase(s, opts.maxPlaysPerTurn ?? Infinity, mercy);
        sample();
        if (s.finalOutcome) break;
        if (s.mercyChoiceActive) { s = selectMercyChoice(s, 'spare').state; continue; }
        if (s.phase === 'phase-play') s = resolveThreatPhase(s).state;
        sample();
    }
    return {
        outcome: s.finalOutcome ?? 'defeat',
        turns: s.turn,
        vitaeLeft: s.finalOutcome === 'defeat' ? 0 : s.player.health,
        sacrifices: s.program?.sacrificeCount ?? 0,
        leechPeak,
    };
}

/** A cell's pacing over many seeded fights. */
export interface PacingSummary {
    runs: number;
    winRate: number;
    /** Mean player turns over every fight. */
    meanTurns: number;
    /** Mean player turns over the won fights (NaN when none). */
    meanTurnsWon: number;
    /** Share of fights won by sparing the foe (The Open Hand). */
    mercyRate: number;
    meanVitaeLeft: number;
    meanSacrifices: number;
    meanLeechPeak: number;
    maxLeechPeak: number;
}

export interface PacingOptions {
    player: Character;
    enemy: Enemy;
    deck: readonly string[];
    policy: PacingPolicy;
    runs?: number;
    startSeed?: number;
    /** Foe VITAE multiplier; defaults to the live one. */
    enemyHpMultiplier?: number;
    /** Human-like only: the most cards played per turn (default: no cap). */
    maxPlaysPerTurn?: number;
    /** Cast The Open Hand when it can spare the foe (default true). Off: every win is a kill. */
    mercy?: boolean;
}

/** Runs `runs` seeded fights (seeds startSeed..) and summarises their pacing. */
export function simulatePacing(o: PacingOptions): PacingSummary {
    const runs = o.runs ?? 200;
    const start = o.startSeed ?? 1;
    const enemy = scaleEnemyVitae(o.enemy, o.enemyHpMultiplier ?? LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER);
    const all: PacingRun[] = [];
    for (let i = 0; i < runs; i++) {
        all.push(runPacingEncounter(o.player, enemy, o.deck, start + i, o.policy, { maxPlaysPerTurn: o.maxPlaysPerTurn, mercy: o.mercy }));
    }
    const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
    const won = all.filter(r => r.outcome === 'victory' || r.outcome === 'mercy');
    return {
        runs,
        winRate: won.length / runs,
        meanTurns: mean(all.map(r => r.turns)),
        meanTurnsWon: mean(won.map(r => r.turns)),
        mercyRate: all.filter(r => r.outcome === 'mercy').length / runs,
        meanVitaeLeft: mean(all.map(r => r.vitaeLeft)),
        meanSacrifices: mean(all.map(r => r.sacrifices)),
        meanLeechPeak: mean(all.map(r => r.leechPeak)),
        maxLeechPeak: Math.max(0, ...all.map(r => r.leechPeak)),
    };
}

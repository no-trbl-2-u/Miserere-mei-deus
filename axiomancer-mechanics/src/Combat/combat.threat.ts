/**
 * Hazard-pattern combat: enemy threat sequences.
 *
 * Each enemy fights as an authored *threat sequence* — 2-5 phases, revealed in
 * full at combat start (Hazard's full-information doctrine). HP MODEL: the enemy
 * executes its phase threat action EVERY phase (hitting the player), unless a
 * control status hinders it (`canAct`). There are no clear thresholds — the
 * player wins by dropping the enemy's HP to 0.
 *
 * An authored phase specifies a threat action (damage + optional
 * debuff/heal). Threat damage scales with level + difficulty, so the autonomous balance-tuning loop
 * can move enemy stats without re-authoring the sequences.
 */

import type { Enemy, EnemyMove } from '../Enemy/types';
import { PHASES_AUTHORED_LEVEL, enemyPhaseTarget, enemyPhaseTier, hasEnemyPhases } from '../Enemy/enemy-phases';
import { lookupEffect } from '../Effects/effects.library';
import type {
    CombatIntentType, CombatThreatAction, CombatThreatBranchOutcome, CombatThreatEffect,
    CombatThreatPhase, ThreatBranchCondition,
} from './combat.encounter.types';
import { AUTHORED_THREAT_SEQUENCES } from './combat.threat-sequences';

export type { ThreatBranchCondition } from './combat.encounter.types';

/**
 * Authored phase template — DESIGN INTENT. The resolver (`resolveAuthored`)
 * computes the numeric clear thresholds (level + difficulty) and the threat-action
 * damage (level/difficulty budget × `damageWeight`) so the whole roster retunes
 * from a handful of constants without re-authoring 60+ enemies. Authoring lives in
 * `combat.threat-sequences.ts`.
 */
export interface AuthoredThreatPhase {
    /** Threat-action damage as a multiple of the level/difficulty budget (default 1.0). */
    damageWeight?: number;
    /** Optional player-debuff applied when this phase is Overwhelmed (telegraphed punish). */
    threatEffectId?: string;
    /** Intensity for `threatEffectId` (default 1). */
    threatIntensity?: number;
    /** Optional enemy self-heal on Overwhelm (a regenerating phase). */
    enemyHeal?: number;
    /** Enemy sheds up to this many of its OWN afflictions on Overwhelm (the
     *  CAUTERIZE archetype: a fraction, never the last — enforced again at
     *  resolution in the engine). Authorable on any phase, linear or branch;
     *  the `bearer-afflictions-gte` branch also carries an implicit reactive
     *  cleanse, and an explicit value here wins over that fallback. */
    enemyCleanse?: number;
    /** Threat description WITHOUT the damage number — the resolver appends "(+N damage[, Effect])". */
    actionText: string;
    isFinalPhase?: boolean;
    /** "Rage mode": locks this phase until the resolving round
     *  reaches it (see `CombatThreatPhase.unlockAfterRound`).
     *
     *  ROUND-KEYED DECK TIERS — this field is
     *  also the mechanism behind tiered enemy decks: `compileEnemyDeck`
     *  (`combat.enemy-decks.ts`) stamps a tier's round onto every card in it,
     *  so tier 2 is unreachable before round 3 and tier 3 before round 6 by
     *  default. The gates a deck compiles to are NON-DECREASING down the
     *  sequence (a tier never reverts) and phase index 0 is never gated, so
     *  the fight always has a legal action: `processBetweenPhases` responds to
     *  a gated candidate by HOLDING the pointer at the last reachable phase
     *  rather than advancing past it. */
    unlockAfterRound?: number;
    /** THE COVETED DIE: seated at the DECK level by
     *  `compileEnemyDeck` (`DECK_STAKES`, defaulting to a BOSS/UNIQUE deck's
     *  2nd card), never via backfill. Undefined = no coveted die on this
     *  phase (the common case). */
    stake?: boolean;
}

// ── Conditional threat branches ──

/**
 * A BRANCH step: one authored phase slot holding a condition and two fully
 * authored forks. `AuthoredThreatPhase` itself is unchanged — the
 * branch is a parallel wrapper. Closed condition union, authored data only,
 * zero RNG: the fork commits from observable state at phase START.
 */
export interface AuthoredThreatBranch {
    branch: {
        condition: ThreatBranchCondition;
        then: AuthoredThreatPhase;
        else: AuthoredThreatPhase;
    };
}

/** One slot of an authored sequence: a linear phase or a branch node. */
export type AuthoredThreatStep = AuthoredThreatPhase | AuthoredThreatBranch;

/** Narrows an authored step to the branch wrapper. */
export function isBranchStep(step: AuthoredThreatStep): step is AuthoredThreatBranch {
    return 'branch' in step;
}

/** Flattens steps to plain phases (branch steps contribute BOTH forks) — the
 *  lens the roster-validation e2es read authored intent through. */
export function flattenAuthoredSteps(steps: readonly AuthoredThreatStep[]): AuthoredThreatPhase[] {
    return steps.flatMap(s => (isBranchStep(s) ? [s.branch.then, s.branch.else] : [s]));
}

/** Human text for a branch condition (the telegraph's "why"). */
export function describeThreatBranchCondition(condition: ThreatBranchCondition): string {
    switch (condition.kind) {
        case 'bearer-afflictions-gte': return `if it carries ${condition.n}+ afflictions`;
        case 'prior-threat-fully-blocked': return 'if its last threat was fully blocked';
    }
}

/**
 * Evaluates a branch condition against phase-START state. Pure and RNG-free:
 * affliction count is the enemy's live debuff instances; the full-block read
 * is the `lastThreatFullyBlocked` combat ledger.
 */
export function evaluateThreatBranchCondition(
    condition: ThreatBranchCondition,
    enemy: Enemy,
    lastThreatFullyBlocked: boolean,
): boolean {
    switch (condition.kind) {
        case 'bearer-afflictions-gte':
            return enemy.effects.filter(ae => lookupEffect(ae.effectId)?.type === 'debuff').length >= condition.n;
        case 'prior-threat-fully-blocked':
            return lastThreatFullyBlocked;
    }
}

/**
 * Commits a branch phase's fork at phase START: evaluates the condition on
 * live state, copies the taken fork onto the phase's face and stamps
 * `branch.taken` (the telegraph then shows the taken fork AND the condition).
 * Returns null when `phases[index]` carries no branch. Re-entering a branch
 * phase (a looping final phase) re-evaluates — each entry is a fresh START.
 */
export function commitThreatBranch(
    phases: readonly CombatThreatPhase[],
    index: number,
    enemy: Enemy,
    lastThreatFullyBlocked: boolean,
): { phases: CombatThreatPhase[]; taken: 'then' | 'else'; conditionText: string } | null {
    const phase = phases[index];
    if (!phase?.branch) return null;
    const taken: 'then' | 'else' =
        evaluateThreatBranchCondition(phase.branch.condition, enemy, lastThreatFullyBlocked) ? 'then' : 'else';
    const outcome = taken === 'then' ? phase.branch.then : phase.branch.else;
    const committed: CombatThreatPhase = {
        ...phase,
        threatAction: outcome.threatAction,
        intentType: outcome.intentType,
        stake: outcome.stake,
        branch: { ...phase.branch, taken },
    };
    return {
        phases: phases.map((p, i) => (i === index ? committed : p)),
        taken,
        conditionText: phase.branch.conditionText,
    };
}

/**
 * Per-DIFFICULTY threat-damage multiplier (the win-rate-band lever, HP model).
 * Gives a boss real bite a same-level normal lacks; `simple` foes hit softly.
 * In the HP model the enemy attacks each phase, so its DIFFICULTY lives in its
 * tier + authored pattern + threat damage — there are no clear thresholds.
 */
const DIFFICULTY_MULT: Record<string, number> = {
    simple: 0.7, normal: 0.92, elite: 1.08, boss: 1.5, unique: 1.45,
};

/** Resolves an enemy's per-difficulty threat-damage multiplier (neutral fallback). */
function difficultyMult(enemy: Enemy): number {
    const d = (enemy as Enemy & { difficulty?: string }).difficulty;
    return (d !== undefined && DIFFICULTY_MULT[d] !== undefined) ? DIFFICULTY_MULT[d] : 1.0;
}

// ── Intent derivation (the telegraph) ────────────────────────────────────────

/** True when a threat effect debuffs the player (an applied effectId). */
function effectIsDebuff(eff: CombatThreatEffect): boolean {
    return !!eff.effectId;
}

/**
 * Derives the enemy's INTENT type from a threat action's effects.
 * Damage + a debuff, or damage + self-heal, etc. → `combo`. Pure.
 */
export function deriveIntentType(effects: readonly CombatThreatEffect[]): CombatIntentType {
    const hasDamage = effects.some(e => (e.damage ?? 0) > 0);
    // `enemyCleanse` counts toward `hasDebuff`: shedding its OWN afflictions
    // erases the player's invested DoT work — counterplay against the player,
    // not a benign self-buff. Only a bare self-heal reads as `buff`.
    const hasDebuff = effects.some(e => effectIsDebuff(e) || (e.enemyCleanse ?? 0) > 0);
    const hasBuff = effects.some(e => (e.enemyHeal ?? 0) > 0);
    const active = [hasDamage, hasDebuff, hasBuff].filter(Boolean).length;
    if (active === 0) return 'pass';
    if (active >= 2) return 'combo';
    if (hasDamage) return 'damage';
    if (hasDebuff) return 'debuff';
    return 'buff';
}

/** Stamps the derived intent (unless an explicit override is present). */
function withIntent(phase: CombatThreatPhase): CombatThreatPhase {
    return phase.intentType ? phase : { ...phase, intentType: deriveIntentType(phase.threatAction.effects) };
}

/**
 * Threat-damage budget for an Overwhelmed phase (hazard-combat pass). Anchored to
 * LEVEL + DIFFICULTY, not the enemy's attack stat (whose curve is far steeper
 * than HP). As a consistent ~%-of-player-HP punish it keeps a missed clear
 * meaningful at every level. Authored sequences set their own damage; this
 * only backs the generator fallback. Sized so a telegraph reads as a real
 * threat against the VITAE pools without letting a mid-campaign boss kill the
 * player before any deck could assemble. Reference points at weight 1.0,
 * phase index 0 (per-level 0.8):
 * L1 normal 6 · L6 boss 16 · L7 elite 13 · L18 boss 31 · L110 unique 136.
 */
const THREAT_BASE = 6;
const THREAT_PER_LEVEL = 0.8;

/** Damage an Overwhelmed phase deals: a level/difficulty budget × the phase's
 *  authored `damageWeight`. Shared by authored sequences and the generator. */
function threatDamageBudget(level: number, dMult: number, phaseIndex: number, weight = 1): number {
    return Math.max(4, Math.round(
        (THREAT_BASE + THREAT_PER_LEVEL * Math.max(1, level)) * dMult * (1 + 0.2 * phaseIndex) * weight,
    ));
}

/** A short human label for a telegraphed debuff id (e.g. `debuff_bleed` → "Bleed"). */
function effectLabel(effectId: string): string {
    return effectId.replace(/^debuff_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** The non-damage/non-debuff riders a threat action can carry. */
interface ThreatActionRiders {
    enemyHeal?: number;
    enemyCleanse?: number;
}

/**
 * Builds a `CombatThreatAction` from authored intent + the computed damage.
 *
 * Purpose: turn one authored threat step into BOTH the effect list the engine
 * resolves and the one-line preview the board telegraphs.
 * Inputs: `actionText` (the flavour clause), `damage` (already budget-scaled),
 * an optional `effectId`/`intensity` player debuff, and the non-damage `riders`
 * (enemy heal, enemy self-cleanse).
 * Output: a `CombatThreatAction` — `effects` for the engine, `description` for
 * the preview.
 */
function buildThreatAction(
    actionText: string, damage: number, effectId?: string, intensity?: number,
    riders?: ThreatActionRiders,
): CombatThreatAction {
    const { enemyHeal, enemyCleanse } = riders ?? {};
    const effects: CombatThreatEffect[] = [];
    if (damage > 0) effects.push({ damage });
    if (effectId) effects.push({ effectId, intensity: intensity ?? 1 });
    if (enemyHeal && enemyHeal > 0) effects.push({ enemyHeal });
    if (enemyCleanse && enemyCleanse > 0) effects.push({ enemyCleanse });
    const parts = [`${damage} damage`];
    if (effectId) parts.push(effectLabel(effectId));
    if (enemyHeal && enemyHeal > 0) parts.push(`heals ${enemyHeal}`);
    if (enemyCleanse && enemyCleanse > 0) {
        parts.push(`sheds ${enemyCleanse} affliction${enemyCleanse === 1 ? '' : 's'}`);
    }
    return { description: `${actionText} (${parts.join(', ')}).`, effects };
}

/** A level/difficulty-scaled threat action for an unauthored enemy. */
function defaultThreatAction(enemy: Enemy, phaseIndex: number): CombatThreatAction {
    const damage = threatDamageBudget(enemy.level, difficultyMult(enemy), phaseIndex);
    const verb = phaseIndex === 0 ? 'presses the attack' : 'escalates';
    return buildThreatAction(`${enemy.name} ${verb}`, damage);
}

/** Ids that carry an authored threat sequence. */
export const AUTHORED_THREAT_ENEMY_IDS: readonly string[] = Object.freeze(Object.keys(AUTHORED_THREAT_SEQUENCES));

/** Resolves one authored fork into a branch outcome (level/difficulty scaled).
 *  `implicitCleanse` is the afflictions-gte branch's implicit reactive
 *  cleanse (`resolveAuthored` below) — an explicit `p.enemyCleanse` wins. */
function resolveBranchOutcome(
    p: AuthoredThreatPhase, phaseIndex: number, level: number, dMult: number,
    implicitCleanse?: number,
): CombatThreatBranchOutcome {
    const damage = threatDamageBudget(level, dMult, phaseIndex, p.damageWeight ?? 1);
    const threatAction = buildThreatAction(p.actionText, damage, p.threatEffectId, p.threatIntensity, {
        enemyHeal: p.enemyHeal,
        enemyCleanse: p.enemyCleanse ?? implicitCleanse,
    });
    return {
        threatAction,
        intentType: deriveIntentType(threatAction.effects),
        stake: p.stake,
    };
}

function resolveAuthored(enemy: Enemy, authored: AuthoredThreatStep[]): CombatThreatPhase[] {
    const level = Math.max(1, enemy.level);
    const dMult = difficultyMult(enemy);
    return authored.map((step, i) => {
        if (isBranchStep(step)) {
            const { condition } = step.branch;
            // The THEN fork of an affliction-count branch carries a
            // reactive cleanse — the enemy
            // answers being stacked by shedding ONE affliction (a fraction,
            // never a wipe; enforced again at resolution in the engine).
            const reactiveCleanse = condition.kind === 'bearer-afflictions-gte' ? 1 : undefined;
            const thenOutcome = resolveBranchOutcome(step.branch.then, i, level, dMult, reactiveCleanse);
            const elseOutcome = resolveBranchOutcome(step.branch.else, i, level, dMult);
            // Pending face = the ELSE (baseline) fork; `commitThreatBranch`
            // swaps the taken fork in at phase START.
            return {
                index: i + 1,
                ...elseOutcome,
                isFinalPhase: step.branch.else.isFinalPhase ?? i === authored.length - 1,
                unlockAfterRound: step.branch.else.unlockAfterRound,
                branch: {
                    condition,
                    conditionText: describeThreatBranchCondition(condition),
                    then: thenOutcome,
                    else: elseOutcome,
                },
            };
        }
        const p = step;
        const damage = threatDamageBudget(level, dMult, i, p.damageWeight ?? 1);
        return withIntent({
            index: i + 1,
            threatAction: buildThreatAction(p.actionText, damage, p.threatEffectId, p.threatIntensity, {
                enemyHeal: p.enemyHeal, enemyCleanse: p.enemyCleanse,
            }),
            isFinalPhase: p.isFinalPhase ?? i === authored.length - 1,
            unlockAfterRound: p.unlockAfterRound,
            stake: p.stake,
        });
    });
}

// ── HP phases (the `Enemy.phases` model) ─────────────────────────────────────

/**
 * Scales one of a move's numbers (damage, MEND) from the level it was
 * authored at to the foe's level, on the same level curve as
 * `threatDamageBudget`, so a level change moves every number together.
 * A positive number never scales below 1.
 */
export function scaleMoveNumber(n: number, level: number, authoredLevel: number): number {
    if (n <= 0) return 0;
    const at = (lv: number): number => THREAT_BASE + THREAT_PER_LEVEL * Math.max(1, lv);
    return Math.max(1, Math.round(n * at(level) / at(authoredLevel)));
}

/** Builds the engine's threat action for one `phases` move at the foe's level. */
function moveThreatAction(move: EnemyMove, level: number, authoredLevel: number): CombatThreatAction {
    const effects: CombatThreatEffect[] = [];
    const damage = scaleMoveNumber(move.damage ?? 0, level, authoredLevel);
    if (damage > 0) {
        for (let h = 0; h < Math.max(1, move.hits ?? 1); h++) effects.push({ damage });
    }
    if (move.effectId) {
        effects.push({
            effectId: move.effectId, intensity: move.intensity ?? 1,
            ...(move.duration !== undefined ? { duration: move.duration } : {}),
        });
    }
    const heal = scaleMoveNumber(move.enemyHeal ?? 0, level, authoredLevel);
    if (heal > 0) effects.push({ enemyHeal: heal });
    // The enemy words (`combat.enemy-words.resolve.ts`): WARD, BRINE and LEECH
    // scale like damage; VULNERABLE's % and turns and SCOUR's count do not.
    if ((move.enemyCleanse ?? 0) > 0) effects.push({ scour: move.enemyCleanse });
    const ward = scaleMoveNumber(move.ward ?? 0, level, authoredLevel);
    if (ward > 0) effects.push({ ward });
    const brine = scaleMoveNumber(move.brine ?? 0, level, authoredLevel);
    if (brine > 0) effects.push({ brine });
    if (move.vulnerable && move.vulnerable.pct > 0 && move.vulnerable.turns > 0) {
        effects.push({ vulnerable: { pct: move.vulnerable.pct, turns: move.vulnerable.turns } });
    }
    const leech = scaleMoveNumber(move.leech ?? 0, level, authoredLevel);
    if (leech > 0) effects.push({ leech });
    // TANGLE and BARNACLE are counts and UNDERTOW a colour: none scales.
    if ((move.tangle ?? 0) > 0) effects.push({ tangle: move.tangle });
    if (move.undertow) effects.push({ undertow: move.undertow });
    if ((move.barnacle ?? 0) > 0) effects.push({ barnacle: move.barnacle });
    return { description: `${move.name}: ${move.text}`, effects };
}

/**
 * Lays a `phases` foe's moves out as the engine's flat threat sequence:
 * the opening phase's loop, then for each later phase its entry DANGER
 * followed by its loop. Each entry carries `enemyMove` so `nextEnemyPhaseIndex` can walk it.
 * No entry is round-gated, branched or staked.
 */
export function resolveEnemyPhases(enemy: Enemy): CombatThreatPhase[] {
    const phases = enemy.phases ?? [];
    const level = Math.max(1, enemy.level);
    const authoredLevel = PHASES_AUTHORED_LEVEL[enemyPhaseTier(enemy.difficulty)];
    const out: CombatThreatPhase[] = [];
    const push = (move: EnemyMove, phase: number, step: number, danger: boolean): void => {
        out.push(withIntent({
            index: out.length + 1,
            threatAction: moveThreatAction(move, level, authoredLevel),
            isFinalPhase: false,
            enemyMove: { phase, step, danger, name: move.name, kind: danger ? 'danger' : move.kind },
        }));
    };
    phases.forEach((p, phase) => {
        if (phase > 0 && p.danger) push(p.danger, phase, 0, true);
        p.moves.forEach((move, step) => push(move, phase, step, false));
    });
    if (out.length > 0) out[out.length - 1] = { ...out[out.length - 1], isFinalPhase: true };
    return out;
}

/**
 * The index a `phases` foe plays next, read at the turn boundary from the
 * live (post-tick) enemy. If its VITAE has crossed a line past its current
 * phase it enters the NEXT phase only (one change per boundary) and plays
 * that phase's DANGER; otherwise it plays the next move of its current loop,
 * wrapping to the first (a DANGER is followed by the loop's first move).
 * Returns null when the current entry is not a `phases` move.
 */
export function nextEnemyPhaseIndex(
    threatPhases: readonly CombatThreatPhase[],
    currentIndex: number,
    enemy: Enemy,
): number | null {
    const cur = threatPhases[currentIndex]?.enemyMove;
    if (!cur) return null;
    const find = (phase: number, pred: (m: NonNullable<CombatThreatPhase['enemyMove']>) => boolean): number =>
        threatPhases.findIndex(p => p.enemyMove?.phase === phase && pred(p.enemyMove));
    if (enemyPhaseTarget(enemy) > cur.phase) {
        const nextPhase = cur.phase + 1;
        const danger = find(nextPhase, m => m.danger);
        if (danger >= 0) return danger;
        const first = find(nextPhase, m => !m.danger && m.step === 0);
        if (first >= 0) return first;
    }
    if (!cur.danger) {
        const following = find(cur.phase, m => !m.danger && m.step === cur.step + 1);
        if (following >= 0) return following;
    }
    const first = find(cur.phase, m => !m.danger && m.step === 0);
    return first >= 0 ? first : currentIndex;
}

/**
 * "Rage mode": the generated (unauthored) sequence's appended
 * escalation phase. Locked until `RAGE_UNLOCK_ROUND` — a discrete,
 * qualitative step layered on top of THE CLOCK's continuous numeric
 * escalation (`THREAT_ESCALATION_*`, `combat.engine.ts`), which already
 * saturates a few rounds past its grace window. Harder-hitting AND
 * self-healing (reusing the existing `enemyHeal` rider) so it specifically
 * punishes slow, non-status attrition — locked-in DoT keeps ticking
 * regardless, but a fight won by trading basic strikes gets partially
 * healed back.
 */
export const RAGE_UNLOCK_ROUND = 6;
export const RAGE_DAMAGE_WEIGHT = 1.6;
export const RAGE_HEAL_FRACTION = 0.5;

/** Generates a default escalating sequence for an unauthored enemy (§10),
 *  topped with a locked rage phase. */
export function generateDefaultThreatSequence(enemy: Enemy): CombatThreatPhase[] {
    const PHASES = 3;
    const phases = Array.from({ length: PHASES }, (_unused, i) => withIntent({
        index: i + 1,
        threatAction: defaultThreatAction(enemy, i),
        isFinalPhase: false, // the rage phase below is the true final phase
    }));
    const rageDamage = threatDamageBudget(enemy.level, difficultyMult(enemy), PHASES, RAGE_DAMAGE_WEIGHT);
    const rageHeal = Math.round(rageDamage * RAGE_HEAL_FRACTION);
    phases.push(withIntent({
        index: PHASES + 1,
        threatAction: buildThreatAction(
            `${enemy.name} loses patience and turns savage`, rageDamage, undefined, undefined, { enemyHeal: rageHeal },
        ),
        isFinalPhase: true,
        unlockAfterRound: RAGE_UNLOCK_ROUND,
    }));
    return phases;
}

/**
 * Returns the enemy's threat sequence: an explicit `enemy.threatSequence` wins;
 * otherwise an authored sequence keyed by id; otherwise the generated default.
 */
export function getThreatSequence(enemy: Enemy): CombatThreatPhase[] {
    // A foe with HP phases bypasses every deck and authored sequence.
    if (hasEnemyPhases(enemy)) return resolveEnemyPhases(enemy);
    const explicit = (enemy as Enemy & { threatSequence?: CombatThreatPhase[] }).threatSequence;
    let seq: CombatThreatPhase[];
    if (explicit && explicit.length > 0) {
        seq = explicit.map(withIntent);
    } else {
        const authored = AUTHORED_THREAT_SEQUENCES[enemy.id];
        seq = authored ? resolveAuthored(enemy, authored) : generateDefaultThreatSequence(enemy);
    }
    // ROUND-KEYED DECK TIERS — the ANTI-STALL guarantee, applied
    // at the single choke point every source funnels through (explicit
    // `threatSequence`, `AUTHORED_THREAT_SEQUENCES`, the generator): the OPENING phase is never round-gated,
    // whatever the source authored. Every later phase can only hold the
    // pointer where it is (`processBetweenPhases`), and the phase it holds on
    // always has an action — so no combination of tier gates can leave a
    // fight without a legal enemy action.
    return seq.map((p, i) => {
        if (i > 0 || p.unlockAfterRound === undefined) return p;
        return { ...p, unlockAfterRound: undefined };
    });
}

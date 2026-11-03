/**
 * Upgradeable Dice: the D3 economy witness.
 *
 * Runs encounters through the real engine + policy driver
 * (`upgradeablePlayPhase`) with the grey deck across stage profiles ×
 * seeds, then reads the recorded transcript to measure the **D3 gate
 * table**: E[usable dice/round], whiff rate, per-color access, dead rounds,
 * realized ◆ income (specials-on-use + yield + overflow), surge frequency and
 * momentum-break rate.
 *
 * Every number is READ FROM THE ENGINE'S OWN EVENT STREAM — the roll gates from
 * the `turn-dice-rolled` events (the fresh four-die roll, not a post-spend
 * snapshot), realized income from `special-fired` /
 * `die-overflowed`, surges from `momentum-surged`. Nothing is recomputed by a
 * parallel model, so the witness cannot drift from the engine it measures.
 */

import { setSeed } from '../Utils/rng';
import {
    initializeCombatEncounter, rollEncounterDice, resolveThreatPhase,
} from './combat.engine';
import { playSimPhase } from './combat.encounter.sim';
import {
    SPECIAL_CONVICTION_DEFAULT, OVERHEAT_CRACK_CHANCE, rollUpgradeableDice,
} from './combat.upgradeable-dice';
import {
    COMBAT_STAGE_PROFILES, COMBAT_STAGE_ORDER, buildStagePlayer, type CombatStageId,
} from './combat.stage-profiles';
import { STARTING_CARD_IDS } from './combat.rewards';
import type { CombatSimPolicyId } from './combat.sim-policies';
import { ENEMY_REGISTRY } from '../Enemy/enemy.library';
import type {
    CombatEncounterState, CombatManaDie, CombatOutcome,
} from './combat.encounter.types';

const FIXED_DIE_ID = /-u-(body|mind|heart|wild)$/;
/** The stock four PLUS the act-reward duplicates (`t1-u-act0-body`, THE PATH).
 *  ◆ conservation has to count every die that can fire a special: an act
 *  die's `special-fired` must land in GROSS as well as REALIZED, or the
 *  spend-rate can read >100% on a short fight. */
const ROLLED_DIE_ID = /-u-(act\d+-)?(body|mind|heart|wild)$/;
const CHAIN_COLORS = ['body', 'mind', 'heart'] as const;
type ChainColor = (typeof CHAIN_COLORS)[number];

/** The stock four-die roll from a `turn-dice-rolled` event (drops surge floats,
 *  act-reward dice and the gold+lead pair — the FACE gates are for stock gear). */
function stockFixedDice(dice: readonly CombatManaDie[]): CombatManaDie[] {
    return dice.filter(d => !d.floating && FIXED_DIE_ID.test(d.id));
}

/** Every rolled die that can fire a special into the ◆ ledger (stock + act
 *  reward; still no floats / gold+lead) — the CONSERVATION side. */
function rolledDice(dice: readonly CombatManaDie[]): CombatManaDie[] {
    return dice.filter(d => !d.floating && ROLLED_DIE_ID.test(d.id));
}

/** The authoritative dice-math witness: a single long stream of stock four-die
 *  rolls, decoupled from any encounter. This measures the FACE TABLES — usable,
 *  whiff, per-color access, gross special ◆ — the way the baseline
 *  arithmetic does. It is the canonical D3 roll-gate reading; the
 *  in-play realized figures (below) are the SAME dice seen through the engine's
 *  interleaved RNG stream and diverge from these by the RNG-lattice skew the
 *  report flags. */
export interface DiceMathWitness {
    rolls: number;
    usablePerRound: number;
    whiffRate: number;
    perColorAccess: Record<ChainColor, number>;
    grossSpecialIncomePerRound: number;
    specialsPerRound: number;
}

export function measureDiceMath(rolls = 200000, seed = 4242): DiceMathWitness {
    setSeed(seed);
    let usable = 0, whiff = 0, specials = 0;
    const colorHits: Record<ChainColor, number> = { body: 0, mind: 0, heart: 0 };
    for (let i = 0; i < rolls; i++) {
        const dice = rollUpgradeableDice(1, {}, new Set());
        const u = dice.filter(d => d.face === 'special' || d.face === 'mana');
        usable += u.length;
        specials += dice.filter(d => d.face === 'special').length;
        if (u.length === 0) whiff++;
        for (const c of CHAIN_COLORS) {
            if (dice.some(d => (d.color === c || d.color === 'wild') && (d.face === 'special' || d.face === 'mana'))) colorHits[c]++;
        }
    }
    return {
        rolls,
        usablePerRound: usable / rolls,
        whiffRate: whiff / rolls,
        perColorAccess: { body: colorHits.body / rolls, mind: colorHits.mind / rolls, heart: colorHits.heart / rolls },
        specialsPerRound: specials / rolls,
        grossSpecialIncomePerRound: (specials / rolls) * SPECIAL_CONVICTION_DEFAULT,
    };
}

export interface UpgradeableEconomyStats {
    encounters: number;
    /** Rounds that actually rolled the tray (one `turn-dice-rolled` each). */
    rounds: number;
    // ── Roll gates (stock fixed dice) ────────────────────────────────────────
    usablePerRound: number;
    whiffRate: number;
    perColorAccess: Record<ChainColor, number>;
    /** Whiffed rounds entered with 0◆ — the FREE-only
     *  dead round the brief asks to measure (no band yet). */
    deadRoundRate: number;
    // ── Realized ◆ economy ───────────────────────────────────────────────────
    /** Gross special income if EVERY rolled special fired (specials × payload). */
    grossSpecialIncomePerRound: number;
    /** Realized special income (SPECIAL_FIRES_ON_USE: only spent specials pay). */
    specialIncomePerRound: number;
    /** Fraction of rolled special ◆ actually realized (spent-on-use). */
    specialSpendRate: number;
    overflowIncomePerRound: number;
    totalIncomePerRound: number;
    // ── Momentum / surge ─────────────────────────────────────────────────────
    surgePerRound: number;
    momentumBreakPerRound: number;
    // ── Outcome context (NOT a D7 win-curve read) ────────────────────────────
    winRate: number;
    avgRounds: number;
}

export interface UpgradeableEconomyCell {
    stage: CombatStageId;
    stats: UpgradeableEconomyStats;
}

export interface UpgradeableEconomyOptions {
    stages?: readonly CombatStageId[];
    seeds?: readonly number[];
    policy?: CombatSimPolicyId;
}

interface EconomyAccumulator {
    encounters: number;
    rounds: number;
    usable: number;
    whiff: number;
    deadRounds: number;
    colorHits: Record<ChainColor, number>;
    grossSpecials: number;
    specialIncome: number;
    overflowIncome: number;
    surges: number;
    breaks: number;
    wins: number;
    totalRounds: number;
}

function emptyAcc(): EconomyAccumulator {
    return {
        encounters: 0, rounds: 0, usable: 0, whiff: 0, deadRounds: 0,
        colorHits: { body: 0, mind: 0, heart: 0 },
        grossSpecials: 0, specialIncome: 0, overflowIncome: 0,
        surges: 0, breaks: 0, wins: 0, totalRounds: 0,
    };
}

function isWin(outcome: CombatOutcome | null): boolean {
    return outcome === 'victory';
}

/** Folds a slice of transcript events into `acc`. The `turn-dice-rolled` in the
 *  slice (if any) is the fresh roll for one phase; `convBefore` is the player's
 *  Conviction entering that phase (a whiffed round with 0◆ is a
 *  dead round). Income/surge/break events are folded regardless. */
function foldEvents(acc: EconomyAccumulator, events: readonly CombatEncounterState['log'][number][], convBefore: number): void {
    const roll = events.find(e => e.kind === 'turn-dice-rolled');
    if (roll && roll.kind === 'turn-dice-rolled') {
        const fixed = stockFixedDice(roll.dice);
        const usable = fixed.filter(d => d.face === 'special' || d.face === 'mana');
        acc.rounds++;
        acc.usable += usable.length;
        acc.grossSpecials += rolledDice(roll.dice).filter(d => d.face === 'special').length;
        if (usable.length === 0) {
            acc.whiff++;
            if (convBefore < 1) acc.deadRounds++;
        }
        for (const c of CHAIN_COLORS) {
            if (fixed.some(d => (d.color === c || d.color === 'wild') && (d.face === 'special' || d.face === 'mana'))) acc.colorHits[c]++;
        }
    }
    for (const ev of events) {
        // Same filter as the gross (see ROLLED_DIE_ID): a special fired off a
        // die the gross never counted would break conservation by definition.
        if (ev.kind === 'special-fired') { if (ROLLED_DIE_ID.test(ev.dieId)) acc.specialIncome += ev.conviction; }
        else if (ev.kind === 'momentum-surged') acc.surges++;
        else if (ev.kind === 'momentum-broken') acc.breaks++;
        else if (ev.kind === 'die-overflowed') acc.overflowIncome += 1;
    }
}

/** Runs one encounter, folding its transcript into `acc`. A single log cursor advances through the
 *  whole transcript so the round-1 roll (emitted by `rollEncounterDice`, before
 *  the loop) is counted exactly once — the fix for the >100% special spend-rate
 *  a per-phase `logStart` produced by dropping round 1's roll. */
function accumulateEncounter(
    acc: EconomyAccumulator,
    stageId: CombatStageId,
    seed: number,
    policyId: CombatSimPolicyId,
): void {
    const stage = COMBAT_STAGE_PROFILES[stageId];
    const enemy = ENEMY_REGISTRY[stage.enemySlugs[0] as keyof typeof ENEMY_REGISTRY];
    const deck = [...STARTING_CARD_IDS];
    const player = buildStagePlayer(stage);
    player.knownCards = deck.slice();

    setSeed(seed);
    const init = initializeCombatEncounter(player, enemy, deck, seed);
    const convAtInit = init.conviction;
    let state: CombatEncounterState = rollEncounterDice(init).state;
    // greedy/blind never consume policy rng (their ranking is deterministic); a
    // stub keeps the seeded engine stream untouched, matching runOneEncounter.
    const rng = (): number => 0;

    acc.encounters++;
    // Round 1's roll fired inside rollEncounterDice, before the loop — fold it
    // with the pre-roll Conviction (the just-initialized state).
    let cursor = 0;
    foldEvents(acc, state.log.slice(cursor), convAtInit);
    cursor = state.log.length;

    let loopGuard = 0;
    while (state.phase !== 'complete' && !state.finalOutcome && loopGuard < 200) {
        loopGuard++;
        if (state.phase !== 'phase-play') break;

        const convBefore = state.conviction;
        state = playSimPhase(state, policyId, rng).state;
        foldEvents(acc, state.log.slice(cursor), convBefore);
        cursor = state.log.length;

        if (state.finalOutcome) break;
        if (state.phase === 'phase-play') {
            state = resolveThreatPhase(state).state;
            // The resolve slice has no roll — pass convBefore through unused.
            foldEvents(acc, state.log.slice(cursor), convBefore);
            cursor = state.log.length;
        }
    }
    acc.totalRounds += state.round;
    if (isWin(state.finalOutcome ?? null)) acc.wins++;
}

function finalize(acc: EconomyAccumulator): UpgradeableEconomyStats {
    const r = Math.max(1, acc.rounds);
    const grossSpecialIncome = (acc.grossSpecials * SPECIAL_CONVICTION_DEFAULT) / r;
    const specialIncome = acc.specialIncome / r;
    return {
        encounters: acc.encounters,
        rounds: acc.rounds,
        usablePerRound: acc.usable / r,
        whiffRate: acc.whiff / r,
        perColorAccess: {
            body: acc.colorHits.body / r,
            mind: acc.colorHits.mind / r,
            heart: acc.colorHits.heart / r,
        },
        deadRoundRate: acc.deadRounds / r,
        grossSpecialIncomePerRound: grossSpecialIncome,
        specialIncomePerRound: specialIncome,
        specialSpendRate: grossSpecialIncome > 0 ? specialIncome / grossSpecialIncome : 0,
        overflowIncomePerRound: acc.overflowIncome / r,
        totalIncomePerRound: (acc.specialIncome + acc.overflowIncome) / r,
        surgePerRound: acc.surges / r,
        momentumBreakPerRound: acc.breaks / r,
        winRate: acc.encounters > 0 ? acc.wins / acc.encounters : 0,
        avgRounds: acc.encounters > 0 ? acc.totalRounds / acc.encounters : 0,
    };
}

/**
 * The D3 economy witness: grey-deck encounters across stages × seeds,
 * measured from the transcript. Returns the pooled stats plus per-cell rows.
 */
export function simulateUpgradeableEconomy(options: UpgradeableEconomyOptions = {}): {
    diceMath: DiceMathWitness;
    pooled: UpgradeableEconomyStats;
    cells: UpgradeableEconomyCell[];
    config: { stages: readonly CombatStageId[]; seeds: readonly number[]; policy: CombatSimPolicyId };
} {
    const stages = options.stages ?? COMBAT_STAGE_ORDER;
    const seeds = options.seeds ?? [1, 2, 3, 4, 5];
    const policy = options.policy ?? 'greedy';

    const diceMath = measureDiceMath();

    const pooledAcc = emptyAcc();
    const cells: UpgradeableEconomyCell[] = [];
    for (const stage of stages) {
        const cellAcc = emptyAcc();
        for (const seed of seeds) {
            accumulateEncounter(pooledAcc, stage, seed, policy);
            accumulateEncounter(cellAcc, stage, seed, policy);
        }
        cells.push({ stage, stats: finalize(cellAcc) });
    }
    const pooled = finalize(pooledAcc);
    return { diceMath, pooled, cells, config: { stages, seeds, policy } };
}

/** Aligned text report of the pooled gates + per-cell rows + derived-constant
 *  proposals, for the D3 tuning doc and the CLI. */
export function formatUpgradeableEconomyReport(result: ReturnType<typeof simulateUpgradeableEconomy>): string {
    const { diceMath, pooled, cells, config } = result;
    const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
    const num = (x: number) => x.toFixed(3);
    const band = (v: number, lo: number, hi: number) => (v >= lo && v <= hi ? 'PASS' : 'MISS');
    const geq = (v: number, lo: number) => (v >= lo ? 'PASS' : 'MISS');
    const lines: string[] = [];
    lines.push(`Upgradeable-Dice D3 economy witness — policy=${config.policy} seeds=[${config.seeds.join(',')}]`);
    lines.push(`stages=[${config.stages.join(',')}] rounds=${pooled.rounds} encounters=${pooled.encounters}`);
    lines.push('');
    lines.push('D3 ROLL GATES — DICE-MATH WITNESS (direct roll stream, N=' + diceMath.rolls + ', stock gear)');
    lines.push('  This is the authoritative reading: it measures the face tables (§1), decoupled from encounter RNG.');
    lines.push(`  E[usable dice/round] = ${num(diceMath.usablePerRound)}   band 1.83 ± 0.05   [${band(diceMath.usablePerRound, 1.78, 1.88)}]`);
    lines.push(`  whiff rate           = ${pct(diceMath.whiffRate)}   band 8.3% ± 1%   [${band(diceMath.whiffRate, 0.073, 0.093)}]`);
    lines.push(`  per-color body       = ${pct(diceMath.perColorAccess.body)}   band >= 65%   [${geq(diceMath.perColorAccess.body, 0.65)}]`);
    lines.push(`  per-color mind       = ${pct(diceMath.perColorAccess.mind)}   band >= 65%   [${geq(diceMath.perColorAccess.mind, 0.65)}]`);
    lines.push(`  per-color heart      = ${pct(diceMath.perColorAccess.heart)}   band >= 65%   [${geq(diceMath.perColorAccess.heart, 0.65)}]`);
    lines.push(`  gross special income = ${num(diceMath.grossSpecialIncomePerRound)}◆/round   (E[specials]=${num(diceMath.specialsPerRound)} × ${SPECIAL_CONVICTION_DEFAULT}◆)`);
    lines.push('');
    lines.push('REALIZED PLAY — IN-ENCOUNTER WITNESS (same face tables through the engine RNG)');
    lines.push(`  E[usable dice/round] = ${num(pooled.usablePerRound)}   (dice-math ${num(diceMath.usablePerRound)}; delta = RNG-lattice skew, see report)`);
    lines.push(`  whiff rate           = ${pct(pooled.whiffRate)}   (dice-math ${pct(diceMath.whiffRate)})`);
    lines.push(`  per-color body/mind/heart = ${pct(pooled.perColorAccess.body)} / ${pct(pooled.perColorAccess.mind)} / ${pct(pooled.perColorAccess.heart)}`);
    lines.push(`  ◆ income/round       = ${num(pooled.totalIncomePerRound)}   band 1.2-1.6   [${band(pooled.totalIncomePerRound, 1.2, 1.6)}]`);
    lines.push(`      special (realized) = ${num(pooled.specialIncomePerRound)}   gross(in-play) = ${num(pooled.grossSpecialIncomePerRound)}   spend-rate = ${pct(pooled.specialSpendRate)}`);
    lines.push(`      overflow           = ${num(pooled.overflowIncomePerRound)}`);
    lines.push(`  surge frequency      = ${num(pooled.surgePerRound)}/round   (momentum breaks ${num(pooled.momentumBreakPerRound)}/round)`);
    lines.push(`  dead rounds (0◆ FREE-only) = ${pct(pooled.deadRoundRate)}   (no band — measured only)`);
    lines.push('');
    lines.push('OVERHEAT (constant, not policy-exercised): crack chance = ' + `${(OVERHEAT_CRACK_CHANCE * 100).toFixed(0)}%`);
    lines.push('');
    lines.push('PER-CELL (stage): usable / whiff / income◆ / surge / winRate / rounds');
    for (const c of cells) {
        lines.push(
            `  ${c.stage.padEnd(6)} `
            + `u=${num(c.stats.usablePerRound)} w=${pct(c.stats.whiffRate).padStart(6)} `
            + `inc=${num(c.stats.totalIncomePerRound)} surge=${num(c.stats.surgePerRound)} `
            + `win=${pct(c.stats.winRate).padStart(6)} rounds=${c.stats.avgRounds.toFixed(1)}`,
        );
    }
    return lines.join('\n');
}

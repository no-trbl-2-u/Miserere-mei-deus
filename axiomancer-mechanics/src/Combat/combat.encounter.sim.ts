/**
 * Hazard-Pattern Combat — balance simulator (HP model).
 *
 * Drives full encounters through the pure engine with scripted policies so
 * balance can be asserted in hermetic tests and tuned with evidence. The win
 * condition is enemy HP → 0; status effects do the heavy lifting (DoT erodes
 * HP; control hinders the enemy's turn), strikes are the weak baseline. Every
 * run is reproducible from its seed.
 *
 * Every policy plays the spec-33 four-die round (`upgradeablePlayPhase`):
 * each live die powers one paid line of its colour (gold = wild), momentum-
 * steered toward the chain successor, banked Conviction spent on Signatures, FREE tops drain the rest of the hand. The
 * policy supplies only the card/signature ranking. The full roster
 * (dot-weaver, control-lock, aggro-brute, turtle, chaos, mercy-seeker) lives in
 * `combat.sim-policies.ts`.
 */

import type { Character } from '../Character/types';
import type { Enemy } from '../Enemy/types';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard,
    resolveThreatPhase, startTurn, endTurn,
    playSignatureSkill, handCards, selectMercyChoice, getSignatureSkill,
    signatureCastBlock,
} from './combat.engine';
import { MOMENTUM_CHAIN_ORDER } from './combat.upgradeable-dice';
import { getRng } from '../Utils/rng';
import type {
    CombatAttributionRow, CombatCard, CombatEncounterState, CombatEvent, CombatOutcome,
} from './combat.encounter.types';
import { COMBAT_SIM_POLICIES, type CombatSimPolicy, type CombatSimPolicyId } from './combat.sim-policies';
// The objective function, computed beside `statusEngagement` (a warning
// light, not the target — see `combat.objective.ts`).
import {
    addObjectiveTelemetry, damageCentroid, emptyObjectiveTelemetry, foldObjectiveEvents,
    type CombatObjectiveTelemetry,
} from './combat.objective.telemetry';
import { scoreCombatObjective, type CombatQualityScore } from './combat.objective';

/**
 * The policy roster (greedy, blind, dot-weaver, control-lock, aggro-brute,
 * turtle, chaos, mercy-seeker, ...) is defined in `combat.sim-policies.ts`; the
 * id type is re-exported here so existing importers keep working.
 */
export type { CombatSimPolicyId } from './combat.sim-policies';

/**
 * The UN-COLLAPSED win-path distribution: a raw count per `CombatOutcome`
 * across the sim's runs. Sums to the run count; `mercies` is its
 * `mercy` cell (a Befriend through The Open Hand).
 */
export type WinPathCounts = Record<CombatOutcome, number>;

export interface CombatSimStats {
    runs: number;
    victories: number;       // enemy HP → 0
    mercies: number;         // spared a low-HP foe via Befriend
    defeats: number;
    retreats: number;
    /** Win rate = (victories + mercies) / runs. */
    winRate: number;
    /** Win-path mix (victory / mercy / defeat / retreat). Sums to `runs`. */
    winPathCounts: WinPathCounts;
    avgRounds: number;
    /** Population std-dev of rounds across the runs:
     *  the consistency witness — a high spread means the deck's clock depends
     *  on drawing the right cards, the duplicate-more signal. */
    roundsStdDev: number;
    /** Average share of plays that landed a status effect on the enemy.
     *  **A WARNING LIGHT, not the objective.** Suites read it and a collapse
     *  in it is worth seeing. The objective function is `combatQuality`
     *  below. */
    statusEngagement: number;
    /** **THE OBJECTIVE FUNCTION.** The Combat Quality Index and its
     *  four weighted components — SPINE (Conviction + Surge + Dice, the locked
     *  systems), ARC, WIDTH, IDENTITY. See `combat.objective.ts`. */
    combatQuality: CombatQualityScore;
    /** The raw counters behind `combatQuality`, pooled over the runs. Exposed
     *  so a stage/preset rollup can MERGE telemetry across cells and re-score
     *  rather than averaging nonlinear component scores. */
    objectiveTelemetry: CombatObjectiveTelemetry;
    /** Average Conviction spent on Signature Skills per run. */
    avgConvictionSpent: number;
    /** Fraction of total enemy HP loss delivered by DoT ticks (0–1).
     *  Doctrine witness: DoT should be the primary damage source in status builds. */
    dotHpFraction: number;
    /** Fraction of total enemy HP loss from direct strikes (excl. mechanic bursts) (0–1). */
    strikeFraction: number;
    /** Fraction of total enemy HP loss from mechanic bursts (rupture/reap/backfire/reflect/conclude) (0–1). */
    mechanicBurstFraction: number;
    /** Guard availability ratio: total guard present when an enemy threat fired /
     *  (that guard + total player HP damage taken). A proxy for how often GUARD was relevant. */
    guardMitigatedFraction: number;
    /** Mean count of active effects on the enemy at the start of each threat phase.
     *  Doctrine witness: a loaded status board = the engine working as intended. */
    avgActiveEffectsPerPhase: number;
    /** Deck utilization: distinct cards actually PLAYED / distinct cards in the
     *  deck (0–1). 1.0 = every card earned a play; a low value on a big deck is
     *  the bloat witness (a 2x late preset that only ever plays 6 of its 15+
     *  uniques). Denominator falls back to distinct cards played when no explicit
     *  deck was threaded (the known-cards path), so it reads 1.0 there. */
    deckUtilization: number;
    /** Normalized Shannon entropy (0–1) over the per-card PLAYS vector — the
     *  decision-spread witness. 0 = one card carried every play (one-note spam);
     *  1 = plays spread evenly across the deck's distinct cards. */
    usageEntropy: number;
    /** The single card that dealt the enemy the most HP (dotDamage + damageDealt,
     *  aggregated across runs), by id. '' when nothing dealt damage. */
    dominantCardId: string;
    /** `dominantCardId`'s share of total attributed enemy-HP damage (0–1). The
     *  single-card-spam witness: deck-tuning §4 flags any card > 0.70. */
    dominantCardShare: number;
    /** Mean over the runs of the lowest player VITAE reached, as a fraction of
     *  max VITAE (sampled after every enemy action and at the fight's end). A
     *  win at 1 VITAE reads ~0; a defeat reads 0. */
    lowestVitaeFractionMean: number;
    /** The 10th percentile of the same per-run lows: one fight in ten gets
     *  at least this close to death. */
    lowestVitaeFractionP10: number;
    /** Mean VITAE the enemy's fired threats took off the player per run. */
    playerHpTakenMean: number;
    /** Mean VITAE per run the player lost to their own INFERNO at the start
     *  of their turn. `playerHpTakenMean` leaves it out. */
    selfBurnMean: number;
}

/** Per-card telemetry for one run (or aggregated over many), keyed by the
 *  card/card id — NOT the hand-entry uid. `statusLands` counts powered plays
 *  that landed at least one status on the enemy (the doctrine witness).
 *
 *  Line telemetry — the OPTIONAL fields below are populated only on
 *  AGGREGATED rows (`simulateHazardPatternCombatDetailed` / the playtest
 *  report); per-run rows from `runOneEncounter` omit them so the pinned
 *  per-run row shapes stay stable (the numbers ride the parallel
 *  `cardLineTelemetry` record instead). */
export interface CombatCardUsage {
    cardId: string;
    plays: number;
    bottomPlays: number;
    topPlays: number;
    statusLands: number;
    discards: number;
    /** Attempted plays (either line) that emitted an `effect-fizzled` event
     *  for this card. A fizzled PAID attempt that the policy drains via the
     *  FREE line counts one fizzle AND one top play. */
    fizzles?: number;
    /** HP-swing attributed per line: immediate enemy-HP loss during the play
     *  plus the projected DoT of effects it landed (`damagePerRound ×
     *  intensity × remainingDuration`; the engine ledger itself does not
     *  project).
     *  `free` = top-line plays, `paid` = powered bottom-line plays. */
    lineContribution?: { free: number; paid: number };
    /** Hand entries discarded un-played at phase end (the engine's draw-fresh
     *  discard site) — the dead-in-hand denominator. */
    unplayedAtPhaseEnd?: number;
    // ── Draw telemetry. AGGREGATED rows only,
    //    like the line-telemetry fields above: per-run rows keep their pinned shape and
    //    the numbers ride `runOneEncounter`'s `cardDrawCounts` instead. ──────
    /** Hand entries of this card across the runs (opening hand + every
     *  `hand-drawn` event) — the play-rate-when-drawn denominator. */
    drawsSeen?: number;
    /** Runs in which this card entered the hand at least once. */
    runsDrawn?: number;
    /** Of `runsDrawn`, runs that ended in a win (victory or any merciful
     *  resolution). With the cell's total runs/wins this yields the
     *  win-rate-when-drawn delta — the "does drawing this card help?" witness. */
    winsWhenDrawn?: number;
}

/** Per-run FREE/PAID line telemetry, kept SEPARATE from the per-run
 *  `CombatCardUsage` rows (whose exact shape is pinned by the sim-policy
 *  decision-sequence e2e). Aggregators fold these into the optional
 *  `CombatCardUsage` fields. */
export interface CombatCardLineTelemetry {
    cardId: string;
    /** Attempted plays that emitted `effect-fizzled` for this card. */
    fizzles: number;
    /** HP swing (immediate + projected DoT) from FREE (top) plays. */
    freeHpSwing: number;
    /** HP swing (immediate + projected DoT) from PAID (bottom) plays. */
    paidHpSwing: number;
    /** Hand entries discarded un-played at phase end. */
    unplayedAtPhaseEnd: number;
}

/** Optional per-run knobs threaded through `runOneEncounter`. */
export interface CombatSimRunOptions {
    /** Explicit deck (card ids) passed to `initializeCombatEncounter`; omitted →
     *  the engine builds the deck from the player's known cards. */
    deck?: readonly string[];
    /** Card ids boosted to the FRONT of every policy's ranking — used by the
     *  card-coverage e2e to guarantee a specific card gets exercised. */
    focusCardIds?: readonly string[];
}

/** Dominates every policy score band so a focused card always ranks first. */
const FOCUS_CARD_BOOST = 1e18;

/**
 * The best card in hand to POWER now, per the active policy's `rankCard`
 * (highest score wins; ties resolve to the earliest card in hand order, which
 * matches a stable sort). Token-gated cards that fizzle are skipped
 * via `notUids`; `focusIds` (card-coverage harness) trump every band.
 */
function selectCard(
    s: CombatEncounterState,
    policy: CombatSimPolicy,
    rng: () => number,
    notUids?: Set<string>,
    focusIds?: ReadonlySet<string>,
    matchColor?: string,
): { uid: string; card: CombatCard } | null {
    // With a powering die in hand, only cards of ITS
    // color are playable (wild matches everything) — mismatches hard-fizzle.
    const cards = handCards(s)
        .filter(c => c.card.verbClass !== 'retreat' && !(notUids && notUids.has(c.uid)))
        .filter(c => !matchColor || matchColor === 'wild' || c.card.stance === 'any' || c.card.stance === matchColor);
    let best: { uid: string; card: CombatCard } | null = null;
    let bestScore = -Infinity;
    for (const c of cards) {
        let score = policy.rankCard(s, c.card, rng);
        if (focusIds && focusIds.has(c.card.id)) {
            score += FOCUS_CARD_BOOST;
        }
        if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
}

/**
 * The LEGAL card options at one powering die: hand
 * entries whose stance that die can power and that have not already fizzled.
 * Pure observation — it mirrors `selectCard`'s filter without ranking, scoring,
 * consuming rng or touching state, so instrumenting decision width can never
 * perturb a seeded run.
 */
function countLiveOptions(
    s: CombatEncounterState,
    notUids: ReadonlySet<string>,
    matchColor: string,
): number {
    return handCards(s).filter(c =>
        c.card.verbClass !== 'retreat'
        && !notUids.has(c.uid)
        && (matchColor === 'wild' || c.card.stance === 'any' || c.card.stance === matchColor)).length;
}

/** An affordable Signature (kind allowed by the policy) to spend banked
 *  Conviction on. Without a policy `rankSignature`, the FIRST affordable match
 *  in `state.signatures` order wins — the `greedy`/`blind` behavior. */
function bestSignature(s: CombatEncounterState, policy: CombatSimPolicy, rng: () => number): string | null {
    let best: string | null = null;
    let bestScore = -Infinity;
    for (const id of s.signatures) {
        const sig = getSignatureSkill(id);
        if (!sig || signatureCastBlock(s, sig)) continue;
        if (!policy.signatureKinds.includes(sig.kind)) continue;
        if (!policy.rankSignature) return id;
        const score = policy.rankSignature(s, sig, rng);
        if (score > bestScore) { bestScore = score; best = id; }
    }
    return best;
}

/** The card's line-telemetry row, created zeroed on first touch. */
function lineRow(
    lines: Record<string, CombatCardLineTelemetry>,
    cardId: string,
): CombatCardLineTelemetry {
    return lines[cardId] ?? (lines[cardId] = {
        cardId, fizzles: 0, freeHpSwing: 0, paidHpSwing: 0, unplayedAtPhaseEnd: 0,
    });
}

/**
 * The HP swing one play produced, measured sim-side so it needs no
 * engine tag: the enemy HP the play removed RIGHT NOW (payoff bursts, TICK
 * advances, reflect) plus the projected DoT of every enemy-side effect it
 * landed — the `damagePerRound × max(1,intensity) ×
 * max(1,remainingDuration)` projection (the engine ledger records
 * provenance only), read off the
 * post-play active effect (falling back to the landed intensity × 1 when the
 * active row is gone, e.g. instantly consumed).
 */
function playHpSwing(
    before: CombatEncounterState,
    after: CombatEncounterState,
    events: readonly CombatEvent[],
): number {
    let swing = Math.max(0, before.enemy.health - after.enemy.health);
    for (const ev of events) {
        if (ev.kind !== 'effect-landed' || ev.target !== 'enemy') continue;
        const dot = ev.effect.payload.damageOverTime;
        if (!dot) continue;
        const active = after.enemy.effects.find(ae => ae.effectId === ev.effectId);
        swing += dot.damagePerRound
            * Math.max(1, active?.intensity ?? ev.intensity)
            * Math.max(1, active?.remainingDuration ?? 1);
    }
    return swing;
}

/** Records one play against the card's usage row (keyed by card/card id). */
function bumpUsage(
    usage: Record<string, CombatCardUsage>,
    card: CombatCard,
    kind: 'top' | 'bottom',
    landedStatus = false,
): void {
    const key = card.id;
    const row = usage[key] ?? (usage[key] = {
        cardId: key, plays: 0, bottomPlays: 0, topPlays: 0, statusLands: 0, discards: 0,
    });
    row.plays++;
    if (kind === 'top') row.topPlays++;
    else row.bottomPlays++;
    if (landedStatus) row.statusLands++;
}

/** §3 — the chain-successor color to build toward from the current momentum
 *  (null when momentum is null — any color legally starts a fresh chain, so
 *  there's no single "advance" target to steer for). */
function momentumSuccessor(momentum: CombatEncounterState['momentumV2']): string | null {
    if (!momentum) return null;
    const i = MOMENTUM_CHAIN_ORDER.indexOf(momentum.color);
    return i < 0 ? null : MOMENTUM_CHAIN_ORDER[(i + 1) % MOMENTUM_CHAIN_ORDER.length];
}

/** Momentum-steer ordering: a die that can produce the chain-successor stance
 *  (its own color, or wild which powers any) sorts first, so the policy builds
 *  toward a surge instead of breaking to null. No preference when `want` is
 *  null (momentum null / off-chain). */
function momentumSourceScore(color: string, want: string | null): number {
    if (!want) return 0;
    if (color === want) return 2;
    if (color === 'wild') return 1;
    return 0;
}

/**
 * What one played threat phase reports back. `decisionPoints`/`liveOptions`
 * are the decision-width sample (see `countLiveOptions`).
 */
export interface PlayPhaseResult {
    state: CombatEncounterState;
    plays: number;
    statusPlays: number;
    /** Powered-play decisions the driver made this phase. */
    decisionPoints: number;
    /** Σ legal card options at those decisions. */
    liveOptions: number;
}

/**
 * Plays a single threat phase to a stop — the four-die round under the
 * ROUND-TURN LAW (ONE tray roll per phase). No draft: the
 * four fixed dice (+ Reserve + surge floats) each power one paid line of their
 * color (gold = wild), momentum-steered toward the chain successor. A whiffed
 * round Presses Fate (a `reroll`-kind signature, 1◆) when
 * it can afford it. FREE tops drain the leftover hand, then `endTurn` banks the
 * best unspent die to Reserve. A pure measurement instrument — legible, not an
 * AI: it reuses the policy's `rankCard`/`bestSignature`, adding only the
 * momentum-steer ordering and the whiff-reroll, both spec-mandated levers.
 */
export function upgradeablePlayPhase(
    state: CombatEncounterState,
    policy: CombatSimPolicy,
    rng: () => number,
    usage: Record<string, CombatCardUsage>,
    lines: Record<string, CombatCardLineTelemetry>,
    focusIds?: ReadonlySet<string>,
): PlayPhaseResult {
    let working = state;
    let plays = 0;
    let statusPlays = 0;
    let decisionPoints = 0;
    let liveOptions = 0;
    let guard = 0;
    const fizzledUids = new Set<string>();

    // ── The ONE legal tray roll for this phase (rolls the four fixed dice). ───
    if (working.dice.length === 0 && !working.turnTakenThisPhase) {
        working = startTurn(working).state;
        if (working.phase !== 'phase-play') return { state: working, plays, statusPlays, decisionPoints, liveOptions };
    }

    // ── Powered plays: iterate the live dice, momentum-steered. ──────────────
    while (working.phase === 'phase-play' && guard < 60) {
        guard++;
        if (working.finalOutcome || working.mercyChoiceActive) break;

        if (working.conviction >= policy.convictionThreshold) {
            const sigId = bestSignature(working, policy, rng);
            if (sigId) {
                const cast = playSignatureSkill(working, sigId);
                if (cast.state !== working) { working = cast.state; if (working.finalOutcome) break; continue; }
            }
        }

        const sources: { dieId: string; color: string }[] = [];
        for (const d of working.dice) {
            if (d.state !== 'available' || d.color === 'x') continue;
            if (d.floating || d.face === 'special' || d.face === 'mana') sources.push({ dieId: d.id, color: d.color });
        }
        for (const banked of working.reserve ?? []) sources.push({ dieId: banked.id, color: banked.color });
        if (sources.length === 0) break;
        const want = momentumSuccessor(working.momentumV2);
        sources.sort((a, b) => momentumSourceScore(b.color, want) - momentumSourceScore(a.color, want));

        let attempted = false;
        for (const src of sources) {
            const card = selectCard(working, policy, rng, fizzledUids, focusIds, src.color);
            if (!card) continue;
            attempted = true;
            // Decision width, sampled where the driver actually chose.
            decisionPoints++;
            liveOptions += countLiveOptions(working, fizzledUids, src.color);
            const res = playCombatCard(working, { uid: card.uid }, true, src.dieId);
            if (res.events.some(e => e.kind === 'effect-fizzled')) {
                lineRow(lines, card.card.id).fizzles++;
                fizzledUids.add(card.uid);
                break;
            }
            lineRow(lines, card.card.id).paidHpSwing += playHpSwing(working, res.state, res.events);
            working = res.state;
            plays++;
            const landed = res.events.some(e => e.kind === 'effect-landed' && e.target === 'enemy');
            if (landed) statusPlays++;
            bumpUsage(usage, card.card, 'bottom', landed);
            break;
        }
        if (!attempted) break;
    }

    // Wind-down: drain the leftover hand through the FREE tops, then end the turn.
    // A FREE line that fizzles (its condition or its SACRIFICE cannot be met)
    // is held for the rest of the phase, so the rest of the hand still drains.
    let drain = 0;
    const heldUids = new Set<string>();
    while (working.phase === 'phase-play' && !working.finalOutcome && !working.mercyChoiceActive && drain < 30) {
        drain++;
        const resT = handCards(working).find(c => c.card.verbClass !== 'retreat' && !heldUids.has(c.uid));
        if (!resT) break;
        const play = playCombatCard(working, { uid: resT.uid }, false);
        const row = lineRow(lines, resT.card.id);
        row.freeHpSwing += playHpSwing(working, play.state, play.events);
        if (play.events.some(e => e.kind === 'effect-fizzled')) {
            row.fizzles++;
            heldUids.add(resT.uid);
        }
        working = play.state;
        plays++;
        bumpUsage(usage, resT.card, 'top');
    }
    if (working.phase === 'phase-play' && !working.finalOutcome && working.turnTakenThisPhase) {
        working = endTurn(working).state;
    }
    return { state: working, plays, statusPlays, decisionPoints, liveOptions };
}

/**
 * Plays ONE threat phase for an external sim harness (the dice-economy
 * witness), routed through the same `upgradeablePlayPhase` the matrix uses so
 * the harness measures exactly what the matrix plays. `usage`/`lines` collect
 * telemetry the caller may discard.
 */
export function playSimPhase(
    state: CombatEncounterState,
    policyId: CombatSimPolicyId,
    rng: () => number,
    usage: Record<string, CombatCardUsage> = {},
    lines: Record<string, CombatCardLineTelemetry> = {},
): PlayPhaseResult {
    const policy = COMBAT_SIM_POLICIES[policyId];
    if (!policy) throw new Error(`Unknown combat sim policy '${String(policyId)}'`);
    return upgradeablePlayPhase(state, policy, rng, usage, lines);
}

/**
 * VITAE the player lost to their own INFERNO in a transcript: the sum of the
 * `dot-tick` amounts aimed at the player with effect id `inferno`.
 *
 * @param log - a combat transcript (`state.log`).
 * @returns The total; 0 when the player never burned.
 * @example selfBurnFromLog([{ kind: 'dot-tick', effectId: 'inferno', label: 'INFERNO', amount: 3, target: 'self' }]) // 3
 */
export function selfBurnFromLog(log: readonly CombatEncounterState['log'][number][]): number {
    let total = 0;
    for (const ev of log) {
        if (ev.kind === 'dot-tick' && ev.target === 'self' && ev.effectId === 'inferno') total += ev.amount;
    }
    return total;
}

/** Runs a single seeded encounter and returns its outcome (+ per-card telemetry). */
export function runOneEncounter(
    player: Character,
    enemy: Enemy,
    seed: number,
    policy: CombatSimPolicyId = 'greedy',
    options?: CombatSimRunOptions,
): {
    outcome: CombatOutcome; rounds: number; plays: number; statusPlays: number; convictionSpent: number;
    dotHpDamage: number; mechanicBurstDamage: number; directHpDamage: number;
    guardOnAttack: number; playerHpTaken: number;
    /** VITAE the player lost to their own INFERNO: the self `dot-tick`
     *  amounts in the run's transcript. */
    selfBurn: number;
    /** The lowest player VITAE this run reached, as a fraction of max VITAE:
     *  sampled after every enemy action and once more at the end. */
    lowestVitaeFraction: number;
    /** Round-turn law — `turn-law-blocked` events in the run's
     *  transcript. A legal policy NEVER trips the law: pinned 0 by the
     *  turn-law e2e. */
    turnLawBlocked: number;
    /** Signature-cast counts by id, for the
     *  dominance measurement (signature damage isn't
     *  attributed per-card the way `attribution` is — cast-share is the
     *  available proxy). */
    signatureCastsByKind: Record<string, number>;
    activeEffectSamples: number[];
    cardUsage: Record<string, CombatCardUsage>;
    /** Per-card FREE/PAID line telemetry (fizzles, per-line HP swing,
     *  unplayed-at-phase-end), parallel to `cardUsage` so the pinned per-run
     *  usage-row shape stays untouched. */
    cardLineTelemetry: Record<string, CombatCardLineTelemetry>;
    /** Hand entries per card id this run: the
     *  opening hand plus every `hand-drawn` event in the transcript (the
     *  opening deal emits no event, so it is counted from the initialized
     *  hand). Parallel to `cardUsage` for the same pinned-shape reason. */
    cardDrawCounts: Record<string, number>;
    /** The final per-card HP-damage ledger (already accumulated by the engine —
     *  surfaced, not recomputed) so the detailed sim can aggregate the
     *  dominant-card share across runs. */
    attribution: Record<string, CombatAttributionRow>;
    /** This run's raw counters for the
     *  Combat Quality Index: the three LOCKED systems (Conviction / Surge /
     *  Dice) read off their own events, plus the arc, width and identity
     *  readings. Additive: callers pool it across runs and RE-SCORE. */
    objective: CombatObjectiveTelemetry;
} {
    const policyObj = COMBAT_SIM_POLICIES[policy];
    if (!policyObj) throw new Error(`Unknown combat sim policy '${String(policy)}'`);
    const focusIds = options?.focusCardIds ? new Set(options.focusCardIds) : undefined;
    const deck = options?.deck ? [...options.deck] : undefined;
    let state = initializeCombatEncounter(player, enemy, deck, seed);
    // The opening Conviction bank emits no `conviction-gained`
    // event, so the objective telemetry seeds income from it; without this the
    // spend SHARE can exceed 1 (spending ◆ the transcript never granted).
    const openingConviction = state.conviction;
    // Metrics slate — the opening deal emits no `hand-drawn` event; seed the
    // draw ledger from the initialized hand before play begins.
    const cardDrawCounts: Record<string, number> = {};
    for (const entry of state.hand) {
        cardDrawCounts[entry.cardId] = (cardDrawCounts[entry.cardId] ?? 0) + 1;
    }
    state = rollEncounterDice(state).state;
    // Policy randomness (chaos ranking) rides the same seeded global stream the
    // engine uses — never Math.random. greedy/blind never consume it, keeping
    // their engine stream (and therefore behavior) bit-identical to the
    // pre-roster sim.
    const rng = (): number => getRng().random();

    let plays = 0;
    let statusPlays = 0;
    let loopGuard = 0;
    let guardOnAttack = 0;
    let playerHpTaken = 0;
    const vitaeFraction = (st: CombatEncounterState): number =>
        st.player.maxHealth > 0 ? Math.max(0, st.player.health) / st.player.maxHealth : 0;
    let lowestVitaeFraction = vitaeFraction(state);
    // The ARC sample: enemy HP at every round boundary (plus the
    // post-fight value pushed after the loop). `damageCentroid` turns the
    // series into "when in the fight did the HP actually fall?".
    const enemyHpSamples: number[] = [];
    let decisionPoints = 0;
    let liveOptions = 0;
    const activeEffectSamples: number[] = [];
    const cardUsage: Record<string, CombatCardUsage> = {};
    const cardLineTelemetry: Record<string, CombatCardLineTelemetry> = {};

    while (state.phase !== 'complete' && loopGuard < 200) {
        loopGuard++;
        if (state.mercyChoiceActive) {
            state = selectMercyChoice(state, policyObj.mercyChoice).state;
            if (state.phase === 'complete' || state.finalOutcome) break;
            continue;
        }
        if (state.phase === 'phase-play') {
            enemyHpSamples.push(state.enemy.health);
            const r = upgradeablePlayPhase(state, policyObj, rng, cardUsage, cardLineTelemetry, focusIds);
            state = r.state;
            plays += r.plays;
            statusPlays += r.statusPlays;
            decisionPoints += r.decisionPoints;
            liveOptions += r.liveOptions;
            if (state.finalOutcome) break;
            if (state.mercyChoiceActive) {
                state = selectMercyChoice(state, policyObj.mercyChoice).state;
                if (state.phase === 'complete' || state.finalOutcome) break;
                continue;
            }
            if (state.phase === 'phase-play') {
                // Every hand entry still here is about to be discarded
                // un-played by the engine's draw-fresh site in
                // `resolveThreatPhase` (the phase-end discard).
                for (const h of handCards(state)) {
                    lineRow(cardLineTelemetry, h.card.id).unplayedAtPhaseEnd++;
                }
                // Sample active effects and guard BEFORE the threat resolves.
                activeEffectSamples.push(state.enemy.effects.length);
                const guardBefore = state.guard ?? 0;
                const playerHpBefore = state.player.health;
                const result = resolveThreatPhase(state);
                state = result.state;
                lowestVitaeFraction = Math.min(lowestVitaeFraction, vitaeFraction(state));
                // If the threat actually fired, attribute guard availability + HP taken.
                if (result.events.some(e => e.kind === 'threat-fired')) {
                    guardOnAttack += guardBefore;
                    playerHpTaken += Math.max(0, playerHpBefore - state.player.health);
                }
            }
        } else {
            break;
        }
    }

    const convictionSpent = Math.max(0, state.turn - state.conviction);
    // The end state too: a defeat (or a self-inflicted cost) that ends the
    // fight before the next enemy action still counts as the trough.
    lowestVitaeFraction = Math.min(lowestVitaeFraction, vitaeFraction(state));

    // Metrics slate — every draw after the opening deal rides a `hand-drawn`
    // event in the transcript (phase-boundary refills).
    for (const ev of state.log) {
        if (ev.kind !== 'hand-drawn') continue;
        for (const cardId of ev.cards) {
            cardDrawCounts[cardId] = (cardDrawCounts[cardId] ?? 0) + 1;
        }
    }

    // Derive HP-damage breakdown from the accumulated event log.
    let dotHpDamage = 0;
    let mechanicBurstDamage = 0;
    const selfBurn = selfBurnFromLog(state.log);
    for (const ev of state.log) {
        if (ev.kind === 'dot-tick' && ev.target === 'enemy') dotHpDamage += ev.amount;
        // The engine-gated riposte is credited via its own event.
        if (ev.kind === 'riposte-fired') mechanicBurstDamage += ev.amount;
    }
    // directDamageDealt includes mechanic bursts; subtract them to get pure strikes.
    const directHpDamage = Math.max(0, state.directDamageDealt - mechanicBurstDamage);

    // ── Objective-function telemetry for this run ────────────────────────────
    // Locked-mechanic counters come straight off the transcript; arc, width and
    // identity come from the loop above and the engine's own damage ledger.
    enemyHpSamples.push(state.enemy.health);
    const objective = emptyObjectiveTelemetry();
    foldObjectiveEvents(state.log, objective);
    objective.convictionGained += openingConviction;
    objective.runs = 1;
    objective.rounds = state.round;
    const centroid = damageCentroid(enemyHpSamples);
    if (centroid !== null) {
        objective.arcRuns = 1;
        objective.arcCentroidSum = centroid;
    }
    objective.decisionPoints = decisionPoints;
    objective.liveOptions = liveOptions;
    // IDENTITY denominator. Deliberately NOT `state.attribution` alone: post
    // strike-death that ledger's `dotDamage` is filled at SUMMARY time, so the
    // raw rows carry direct damage only and the whole fight collapses onto
    // whichever signature burst last — which is why `dominantCardShare` reads
    // ~100% on nearly every cell. Cards are credited from the sim's own
    // per-line HP swing (immediate + projected DoT, the `playHpSwing`
    // measure); non-card damage sources still in the ledger (signatures,
    // engine drips) are folded in afterwards so "the generic engine won it"
    // stays visible as an identity failure rather than disappearing.
    for (const row of Object.values(cardLineTelemetry)) {
        const dmg = row.freeHpSwing + row.paidHpSwing;
        if (dmg > 0) objective.damageByCard[row.cardId] = (objective.damageByCard[row.cardId] ?? 0) + dmg;
    }
    for (const row of Object.values(state.attribution)) {
        if (cardLineTelemetry[row.cardId]) continue;
        const dmg = row.dotDamage + row.damageDealt;
        if (dmg > 0) objective.damageByCard[row.cardId] = (objective.damageByCard[row.cardId] ?? 0) + dmg;
    }

    return {
        outcome: state.finalOutcome ?? 'defeat',
        rounds: state.round,
        plays,
        statusPlays,
        convictionSpent,
        turnLawBlocked: state.log.filter(ev => ev.kind === 'turn-law-blocked').length,
        signatureCastsByKind: state.log.reduce<Record<string, number>>((acc, ev) => {
            if (ev.kind === 'signature-cast') acc[ev.signatureId] = (acc[ev.signatureId] ?? 0) + 1;
            return acc;
        }, {}),
        dotHpDamage,
        mechanicBurstDamage,
        directHpDamage,
        guardOnAttack,
        playerHpTaken,
        selfBurn,
        lowestVitaeFraction,
        activeEffectSamples,
        cardUsage,
        cardLineTelemetry,
        cardDrawCounts,
        attribution: state.attribution,
        objective,
    };
}

/** Options for `simulateHazardPatternCombatDetailed`. */
export interface CombatSimDetailedOptions {
    player: Character;
    enemy: Enemy;
    /** Number of seeded runs (default 300). */
    runs?: number;
    /** Per-run seed = startSeed + runIndex (default 1). */
    startSeed?: number;
    /** Scripted witness (default 'greedy'). */
    policy?: CombatSimPolicyId;
    /** Explicit deck threaded to every run. */
    deck?: readonly string[];
    /** Cards boosted to the front of ranking in every run (coverage harness). */
    focusCardIds?: readonly string[];
}

/** The AGGREGATED usage row for a card, created zeroed (line-telemetry
 *  fields included — aggregated rows always carry them) on first touch. */
function aggUsageRow(cardUsage: Record<string, CombatCardUsage>, cardId: string): CombatCardUsage {
    return cardUsage[cardId] ?? (cardUsage[cardId] = {
        cardId, plays: 0, bottomPlays: 0, topPlays: 0, statusLands: 0, discards: 0,
        fizzles: 0, lineContribution: { free: 0, paid: 0 }, unplayedAtPhaseEnd: 0,
        drawsSeen: 0, runsDrawn: 0, winsWhenDrawn: 0,
    });
}

/** A zeroed win-path tally with every `CombatOutcome` key present. */
function emptyWinPathCounts(): WinPathCounts {
    return { victory: 0, mercy: 0, defeat: 0, retreat: 0 };
}

/** The card with the largest share of total attributed enemy-HP damage. */
function dominantCard(damageByCard: Record<string, number>): { dominantCardId: string; dominantCardShare: number } {
    const entries = Object.entries(damageByCard);
    const total = entries.reduce((s, [, d]) => s + d, 0);
    if (total <= 0 || entries.length === 0) return { dominantCardId: '', dominantCardShare: 0 };
    let bestId = '';
    let bestDmg = -Infinity;
    for (const [id, dmg] of entries) {
        if (dmg > bestDmg) { bestDmg = dmg; bestId = id; }
    }
    return { dominantCardId: bestId, dominantCardShare: bestDmg / total };
}

/**
 * The `p` quantile (0–1) of `xs` by the nearest-rank method: the smallest
 * value with at least `p` of the list at or below it. 0 for an empty list.
 */
export function percentile(xs: readonly number[], p: number): number {
    if (xs.length === 0) return 0;
    const sorted = [...xs].sort((a, b) => a - b);
    const rank = Math.max(1, Math.ceil(p * sorted.length));
    return sorted[rank - 1]!;
}

/**
 * Normalized Shannon entropy (0–1) of the per-card PLAYS distribution. 0 when
 * one card carried every play (one-note spam); 1 when plays are spread evenly
 * across the distinct cards that saw play. A single played card (or none)
 * yields 0 — there is no spread to measure.
 */
function normalizedPlayEntropy(usage: readonly CombatCardUsage[]): number {
    const plays = usage.map(u => u.plays).filter(p => p > 0);
    const total = plays.reduce((s, p) => s + p, 0);
    if (total <= 0 || plays.length <= 1) return 0;
    let h = 0;
    for (const p of plays) {
        const prob = p / total;
        h -= prob * Math.log(prob);
    }
    return h / Math.log(plays.length);
}

/**
 * Monte-Carlo simulation with per-card telemetry: runs `runs` seeded
 * encounters and reports the win/mercy/defeat distribution + engagement
 * witnesses, plus a per-card usage table aggregated over all runs.
 */
export function simulateHazardPatternCombatDetailed(
    options: CombatSimDetailedOptions,
): { stats: CombatSimStats; cardUsage: Record<string, CombatCardUsage> } {
    const count = options.runs ?? 300;
    const startSeed = options.startSeed ?? 1;
    const policy = options.policy ?? 'greedy';

    let victories = 0, mercies = 0, defeats = 0, retreats = 0;
    let totalRounds = 0, totalRoundsSq = 0, totalPlays = 0, totalStatusPlays = 0, totalConviction = 0;
    let totalDotHp = 0, totalMechanicBurst = 0, totalDirectHp = 0;
    let totalGuardOnAttack = 0, totalPlayerHpTaken = 0, totalSelfBurn = 0;
    let totalActiveEffectSamples = 0, totalPhaseSamples = 0;
    const lowestVitae: number[] = [];
    const winPathCounts = emptyWinPathCounts();
    // Per-card enemy-HP damage across all runs (dominant-card witness).
    const damageByCard: Record<string, number> = {};
    const cardUsage: Record<string, CombatCardUsage> = {};
    // Pooled objective telemetry across the runs (scored once, at
    // the end: the components are nonlinear, so pooling counters is the only
    // correct aggregation).
    const objectiveTelemetry = emptyObjectiveTelemetry();

    for (let i = 0; i < count; i++) {
        const r = runOneEncounter(options.player, options.enemy, startSeed + i, policy, {
            deck: options.deck,
            focusCardIds: options.focusCardIds,
        });
        winPathCounts[r.outcome]++;
        addObjectiveTelemetry(objectiveTelemetry, r.objective);
        if (r.outcome === 'victory') victories++;
        else if (r.outcome === 'mercy') mercies++;
        else if (r.outcome === 'retreat') retreats++;
        else defeats++;
        const won = r.outcome === 'victory' || r.outcome === 'mercy';
        // Metrics slate — fold the run's draw ledger into the aggregated rows.
        // With an explicit deck, restrict to its cards so a synthetic/conjured
        // id can never violate the "usage ⊆ deck" matrix invariant.
        const deckIds = options.deck ? new Set(options.deck) : null;
        for (const [cardId, drawn] of Object.entries(r.cardDrawCounts)) {
            if (drawn <= 0 || (deckIds && !deckIds.has(cardId))) continue;
            const agg = aggUsageRow(cardUsage, cardId);
            agg.drawsSeen = (agg.drawsSeen ?? 0) + drawn;
            agg.runsDrawn = (agg.runsDrawn ?? 0) + 1;
            if (won) agg.winsWhenDrawn = (agg.winsWhenDrawn ?? 0) + 1;
        }
        for (const row of Object.values(r.attribution)) {
            damageByCard[row.cardId] = (damageByCard[row.cardId] ?? 0) + row.dotDamage + row.damageDealt;
        }
        totalRounds += r.rounds;
        totalRoundsSq += r.rounds * r.rounds;
        totalPlays += r.plays;
        totalStatusPlays += r.statusPlays;
        totalConviction += r.convictionSpent;
        totalDotHp += r.dotHpDamage;
        totalMechanicBurst += r.mechanicBurstDamage;
        totalDirectHp += r.directHpDamage;
        totalGuardOnAttack += r.guardOnAttack;
        totalPlayerHpTaken += r.playerHpTaken;
        totalSelfBurn += r.selfBurn;
        lowestVitae.push(r.lowestVitaeFraction);
        for (const s of r.activeEffectSamples) totalActiveEffectSamples += s;
        totalPhaseSamples += r.activeEffectSamples.length;
        for (const row of Object.values(r.cardUsage)) {
            const agg = aggUsageRow(cardUsage, row.cardId);
            agg.plays += row.plays;
            agg.bottomPlays += row.bottomPlays;
            agg.topPlays += row.topPlays;
            agg.statusLands += row.statusLands;
            agg.discards += row.discards;
        }
        // Fold the per-run line telemetry into the aggregated rows
        // (per-run usage rows deliberately omit these fields; see the type).
        for (const row of Object.values(r.cardLineTelemetry)) {
            const agg = aggUsageRow(cardUsage, row.cardId);
            agg.fizzles = (agg.fizzles ?? 0) + row.fizzles;
            agg.unplayedAtPhaseEnd = (agg.unplayedAtPhaseEnd ?? 0) + row.unplayedAtPhaseEnd;
            const lc = agg.lineContribution ?? (agg.lineContribution = { free: 0, paid: 0 });
            lc.free += row.freeHpSwing;
            lc.paid += row.paidHpSwing;
        }
    }

    const totalEnemyHpLost = Math.max(1, totalDotHp + totalMechanicBurst + totalDirectHp);
    const guardDenom = Math.max(1, totalGuardOnAttack + totalPlayerHpTaken);

    // Distinct cards that earned at least one play across the runs.
    const playedIds = Object.values(cardUsage).filter(u => u.plays > 0).map(u => u.cardId);
    // Denominator: distinct non-synthetic cards in the threaded deck; when no
    // explicit deck was given (known-cards path) fall back to the played set so
    // utilization reads 1.0 rather than dividing by an unknown pool.
    const deckDistinct = options.deck
        ? new Set(options.deck).size
        : playedIds.length;
    const deckUtilization = deckDistinct > 0 ? Math.min(1, playedIds.length / deckDistinct) : 0;

    const { dominantCardId, dominantCardShare } = dominantCard(damageByCard);

    const stats: CombatSimStats = {
        runs: count,
        victories,
        mercies,
        defeats,
        retreats,
        winRate: (victories + mercies) / count,
        winPathCounts,
        avgRounds: totalRounds / count,
        // Population σ; the max(0, …) guards float error on a zero-variance set.
        roundsStdDev: Math.sqrt(Math.max(0,
            totalRoundsSq / count - (totalRounds / count) ** 2)),
        statusEngagement: totalPlays > 0 ? totalStatusPlays / totalPlays : 0,
        combatQuality: scoreCombatObjective(objectiveTelemetry),
        objectiveTelemetry,
        avgConvictionSpent: totalConviction / count,
        dotHpFraction: totalDotHp / totalEnemyHpLost,
        strikeFraction: totalDirectHp / totalEnemyHpLost,
        mechanicBurstFraction: totalMechanicBurst / totalEnemyHpLost,
        guardMitigatedFraction: totalGuardOnAttack / guardDenom,
        avgActiveEffectsPerPhase: totalPhaseSamples > 0 ? totalActiveEffectSamples / totalPhaseSamples : 0,
        deckUtilization,
        usageEntropy: normalizedPlayEntropy(Object.values(cardUsage)),
        dominantCardId,
        dominantCardShare,
        lowestVitaeFractionMean: lowestVitae.length > 0
            ? lowestVitae.reduce((a, b) => a + b, 0) / lowestVitae.length : 0,
        lowestVitaeFractionP10: percentile(lowestVitae, 0.1),
        playerHpTakenMean: totalPlayerHpTaken / count,
        selfBurnMean: totalSelfBurn / count,
    };
    return { stats, cardUsage };
}

/**
 * Monte-Carlo simulation: runs `count` seeded encounters and reports the
 * win/mercy/defeat distribution + engagement witnesses.
 */
export function simulateHazardPatternCombat(
    player: Character,
    enemy: Enemy,
    count = 300,
    startSeed = 1,
    policy: CombatSimPolicyId = 'greedy',
): CombatSimStats {
    return simulateHazardPatternCombatDetailed({ player, enemy, runs: count, startSeed, policy }).stats;
}

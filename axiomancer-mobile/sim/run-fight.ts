/**
 * One fight, played headlessly the way the live fight screen plays it
 * (phase SM1e).
 *
 * The store already holds the staged foe (`beginHazardEncounter`, which
 * scales its HP by the live multiplier, is what `<CombatGate>` calls). The
 * fight then runs on the engine's encounter functions exactly as
 * `<CombatEncounterPanel>` runs them: `initializeCombatEncounter` from the
 * store's player and flags (the run's real deck, relics, worn gear and level:
 * a new run wears the grey pair, so the sim plays a fresh run as the live
 * screen does), the
 * reveal's `rollEncounterDice`, each phase played by the run policy's combat
 * witness (`upgradeablePlayPhase`, the sim's own phase player), the foe's turn
 * through `resolveThreatPhase`. At the outcome the panel's own write-back
 * (`applyHazardOutcome`, which dispatches the engine's `endCombat`) settles
 * it, the victory draft is rolled and claimed through the panel's store
 * actions, and a defeat runs the death rule as the fight screen's exit does.
 */

import {
    buildCombatDeck,
    chooseMercyCheck,
    getRng,
    initializeCombatEncounter,
    isEliteEnemy,
    resolveThreatPhase,
    rollEncounterDice,
    rollMercyCheck,
    upgradeablePlayPhase,
    type CombatEncounterState,
    type CombatOutcome,
    type CombatSimPolicy,
    type Enemy,
    type GameState,
    type RunFightContext,
    type RunPolicy,
    type SpareResultKind,
} from '@mechanics';

import { applyHazardOutcome } from '@/components/combat/encounter/CombatEncounterPanel';
import { fightRecorder } from '@/lib/fightRecorder';
import type { AppActions } from '@/state/actions';
import {
    claimCombatRewardAction,
    claimCombatUpgradeAction,
    resetCombatRewardAction,
    rollCombatRewardAction,
} from '@/state/combat/store-actions';
import { selectResumableFight } from '@/state/presenters/navigation.engine';
import type { AppStore } from '@/state/store';

/** How a fight ended for the run's tally. */
export type RunFightResult = 'won' | 'spared' | 'lost' | 'fled';

/** What `endCombat` reports (the engine does not export the type). */
type CombatEndReport = ReturnType<ReturnType<AppStore['getState']>['endCombat']>;

/** What a run's won fights paid and what its mercy checks did, for the comparison. */
export interface MercyLedger {
    /** Checks that fired (a normal foe fell and asked spare or finish). */
    checks: number;
    spared: number;
    finished: number;
    /** The Spare table's results, by kind. */
    table: Partial<Record<SpareResultKind, number>>;
    /** XP the won fights paid (quest XP is not counted). */
    xp: number;
    /** Shillings the won fights paid (the table's extra shillings result is not counted). */
    shillings: number;
}

/** A ledger with nothing in it. */
export function emptyMercyLedger(): MercyLedger {
    return { checks: 0, spared: 0, finished: 0, table: {}, xp: 0, shillings: 0 };
}

/** The boss fight a run has had, if any: how much of the boss's VITAE its last fight with it took. */
export interface BossLedger {
    /** The share (0 to 100, one decimal) of the boss's VITAE gone when its last fight ended; null before one. */
    damagePct: number | null;
}

/** A ledger for a run that has not met the boss. */
export function emptyBossLedger(): BossLedger {
    return { damagePct: null };
}

/** The share of `enemy`'s VITAE gone, 0 to 100 at one decimal; 0 for a foe with no VITAE to lose. */
export function damagePctOf(enemy: Pick<Enemy, 'health' | 'maxHealth'>): number {
    if (!(enemy.maxHealth > 0)) return 0;
    const gone = Math.min(1, Math.max(0, (enemy.maxHealth - Math.max(0, enemy.health)) / enemy.maxHealth));
    return Math.round(gone * 1000) / 10;
}

/** Phases a fight may take before the driver calls it stuck. */
export const MAX_FIGHT_PHASES = 200;

/** Thrown inside the fight loop; the driver turns it into a stuck error. */
export class FightStuckError extends Error {}

function runDeck(store: AppStore): string[] {
    const s = store.getState() as unknown as GameState;
    return buildCombatDeck(s.player, s.flags);
}

/** The fight seam's view of the staged foe. */
export function fightContext(store: AppStore, enemy: Enemy, fleeAllowed: boolean, fledHere = 0): RunFightContext {
    const player = store.getState().player;
    return {
        enemyName: enemy.name,
        isBoss: !fleeAllowed,
        isElite: isEliteEnemy(enemy),
        fleeAllowed,
        fledHere,
        health: player.health,
        maxHealth: player.maxHealth,
        deck: runDeck(store),
    };
}

/** Play the live fight to its outcome on the engine's encounter functions. */
function playToOutcome(store: AppStore, enemy: Enemy, policy: RunPolicy, ctx: RunFightContext): CombatEncounterState {
    const witness = policy.fightPolicy(ctx);
    return answerMercyCheck(playToVictory(store, enemy, witness), witness);
}

/**
 * The panel's mercy check, on a fight just won: rolled from the combat rng once
 * the foe has fallen, answered as the policy's `mercyCheck` says. Any other
 * ending comes back as it is. The engine's turn loop draws nothing for it, so a
 * seeded stream reads as before.
 */
export function answerMercyCheck(live: CombatEncounterState, witness: CombatSimPolicy): CombatEncounterState {
    const answered = chooseMercyCheck(rollMercyCheck(live), witness.mercyCheck);
    if (answered !== live) fightRecorder.observe(answered);
    return answered;
}

/** Play the fight until the foe falls, or the player does. */
function playToVictory(store: AppStore, enemy: Enemy, witness: CombatSimPolicy): CombatEncounterState {
    const state = store.getState();
    const flags = (state as unknown as GameState).flags;
    const seed = Math.floor(Math.random() * 0xffffffff);
    const rng = (): number => getRng().random();
    // The player fights as they stand: a new run wears the grey pair, so the sim plays a fresh run as it is.
    let live = initializeCombatEncounter(state.player, enemy, undefined, seed, flags);
    live = rollEncounterDice(live).state;
    // The panel hands every state it renders to the fight recorder; so does the driver.
    fightRecorder.observe(live);
    for (let phase = 0; phase < MAX_FIGHT_PHASES; phase++) {
        if (live.finalOutcome || live.phase === 'complete') return live;
        if (live.phase !== 'phase-play') {
            throw new FightStuckError(`fight against ${enemy.name} sits in phase '${live.phase}' with no move`);
        }
        live = upgradeablePlayPhase(live, witness, rng, {}, {}).state;
        fightRecorder.observe(live);
        if (live.finalOutcome) continue;
        if (live.phase === 'phase-play') {
            live = resolveThreatPhase(live).state;
            fightRecorder.observe(live);
        }
    }
    if (live.finalOutcome) return live;
    throw new FightStuckError(`fight against ${enemy.name} did not end in ${MAX_FIGHT_PHASES} phases`);
}

/** Claim the victory draft through the panel's reward actions, as the policy picks. */
function claimDraft(store: AppStore, enemy: Enemy, policy: RunPolicy): void {
    const offers = rollCombatRewardAction(store, enemy);
    const upgrade = store.getState().combatReward?.upgrade ?? null;
    if (offers.length === 0 && upgrade === null) return;
    const decision = policy.pickReward({
        source: isEliteEnemy(enemy) ? 'elite' : 'fight',
        offers,
        upgradeFromCardId: upgrade?.fromCardId ?? null,
        deck: runDeck(store),
    });
    if (decision.kind === 'upgrade' && upgrade !== null) {
        claimCombatUpgradeAction(store, upgrade.fromCardId);
        return;
    }
    const cardId = decision.kind === 'card' && offers.includes(decision.cardId) ? decision.cardId : null;
    claimCombatRewardAction(store, cardId);
}

/**
 * Engage the pending encounter and play it to the end through the app.
 *
 * @param fled - Withdrawals so far this run, by node id; a WITHDRAW adds one
 *               for the node underfoot.
 * @returns How it ended, or null when no fight was staged.
 */
export function playFight(
    store: AppStore,
    actions: AppActions,
    policy: RunPolicy,
    fled: Map<string, number> = new Map(),
    ledger?: MercyLedger,
    boss?: BossLedger,
): RunFightResult | null {
    if (!store.getState().currentEncounter) {
        // The gate's engage: stage the foe from the pending prelude.
        if (!actions.beginHazardEncounter()) return null;
    }
    const fight = selectResumableFight(store.getState());
    if (!fight) return null;
    const enemy = fight.enemy;
    const nodeId = store.getState().world.currentMap.currentNode;
    const ctx = fightContext(store, enemy, fight.fleeAllowed, fled.get(nodeId) ?? 0);
    if (fight.fleeAllowed && policy.flee(ctx)) {
        fled.set(nodeId, (fled.get(nodeId) ?? 0) + 1);
        // WITHDRAW, from the reveal.
        actions.fleeEncounter();
        actions.endCombat('flee');
        return 'fled';
    }
    const final = playToOutcome(store, enemy, policy, ctx);
    const outcome = final.finalOutcome as CombatOutcome;
    // A fight with no way out is the boss's: the last one is the one that counts.
    if (boss && ctx.isBoss) boss.damagePct = damagePctOf(final.enemy);
    const spared = outcome === 'victory' && final.mercyCheck === 'spared';
    // The ledger reads what `endCombat` paid off its own report: the panel's write-back drops it.
    let report: CombatEndReport | null = null;
    const endCombat = store.getState().endCombat;
    if (ledger) {
        store.setState({
            endCombat: (...args: Parameters<typeof endCombat>) => (report = endCombat(...args)),
        } as never);
    }
    try {
        applyHazardOutcome(store, outcome, final, enemy);
    } finally {
        if (ledger) store.setState({ endCombat } as never);
    }
    if (ledger && outcome === 'victory') {
        const paid = report as CombatEndReport | null;
        if (final.mercyCheck === 'spared' || final.mercyCheck === 'finished') ledger.checks++;
        if (final.mercyCheck === 'spared') ledger.spared++;
        if (final.mercyCheck === 'finished') ledger.finished++;
        ledger.xp += paid?.xpGained ?? 0;
        ledger.shillings += paid?.shillings ?? 0;
        const kind = paid?.spareReward?.kind;
        if (kind) ledger.table[kind] = (ledger.table[kind] ?? 0) + 1;
    }
    // A Spare pays no card reward: the panel opens no draft for it.
    if (outcome === 'victory' && !spared) claimDraft(store, enemy, policy);
    resetCombatRewardAction(store);
    if (outcome === 'defeat') {
        actions.playerDied('fight');
        return 'lost';
    }
    return spared ? 'spared' : 'won';
}

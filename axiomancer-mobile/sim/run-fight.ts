/**
 * One fight, played headlessly the way the live fight screen plays it
 * (phase SM1e).
 *
 * The store already holds the staged foe (`beginHazardEncounter`, which
 * scales its HP by the live multiplier, is what `<CombatGate>` calls). The
 * fight then runs on the engine's encounter functions exactly as
 * `<CombatEncounterPanel>` runs them: `initializeCombatEncounter` from the
 * store's player and flags (the run's real deck, relics and level), the
 * reveal's `rollEncounterDice`, each phase played by the run policy's combat
 * witness (`upgradeablePlayPhase`, the sim's own phase player), the mercy
 * choice through `selectEncounterMercyChoice`, the foe's turn through
 * `resolveThreatPhase`. At the outcome the panel's own write-back
 * (`applyHazardOutcome`, which dispatches the engine's `endCombat`) settles
 * it, the victory draft is rolled and claimed through the panel's store
 * actions, and a defeat runs the death rule as the fight screen's exit does.
 */

import {
    buildCombatDeck,
    getRng,
    initializeCombatEncounter,
    isEliteEnemy,
    resolveThreatPhase,
    rollEncounterDice,
    selectEncounterMercyChoice,
    upgradeablePlayPhase,
    wearGreySword,
    type CombatEncounterState,
    type CombatOutcome,
    type Enemy,
    type GameState,
    type RunFightContext,
    type RunPolicy,
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
    const state = store.getState();
    const flags = (state as unknown as GameState).flags;
    const seed = Math.floor(Math.random() * 0xffffffff);
    const witness = policy.fightPolicy(ctx);
    const rng = (): number => getRng().random();
    // A special only pays when a weapon is worn, and a new game gives none yet: the run fights
    // with the grey sword's stand-in so it plays as a fresh run is meant to.
    const fighter = state.player.equipment.weapon ? state.player : wearGreySword({ ...state.player });
    let live = initializeCombatEncounter(fighter, enemy, undefined, seed, flags);
    live = rollEncounterDice(live).state;
    // The panel hands every state it renders to the fight recorder; so does the driver.
    fightRecorder.observe(live);
    for (let phase = 0; phase < MAX_FIGHT_PHASES; phase++) {
        if (live.finalOutcome || live.phase === 'complete') return live;
        if (live.mercyChoiceActive) {
            live = selectEncounterMercyChoice(live, witness.mercyChoice).state;
            fightRecorder.observe(live);
            continue;
        }
        if (live.phase !== 'phase-play') {
            throw new FightStuckError(`fight against ${enemy.name} sits in phase '${live.phase}' with no move`);
        }
        live = upgradeablePlayPhase(live, witness, rng, {}, {}).state;
        fightRecorder.observe(live);
        if (live.finalOutcome || live.mercyChoiceActive) continue;
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
    applyHazardOutcome(store, outcome, final, enemy);
    if (outcome === 'victory') claimDraft(store, enemy, policy);
    resetCombatRewardAction(store);
    if (outcome === 'defeat') {
        actions.playerDied('fight');
        return 'lost';
    }
    return outcome === 'mercy' ? 'spared' : 'won';
}

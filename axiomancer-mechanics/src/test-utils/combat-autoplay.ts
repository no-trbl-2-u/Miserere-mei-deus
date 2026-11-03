import type { Character } from '../Character/types';
import type { Enemy } from '../Enemy/types';
import {
    initializeCombatEncounter,
    rollEncounterDice,
    startTurn,
    endTurn,
    playCombatCard,
    resolveThreatPhase,
    handCards,
    firstLegalPoweringDie,
    buildCombatSummary,
} from '../Combat/combat.engine';
import type { CombatCard, CombatEncounterState, CombatOutcome } from '../Combat/combat.encounter.types';

export type HazardAutoPolicyId = 'naive' | 'safe' | 'aggressive' | 'status';

export interface HazardCombatAutoOptions {
    seed?: number;
    policy?: HazardAutoPolicyId;
    maxTurns?: number;
}

export interface HazardCombatAutoResult {
    state: CombatEncounterState;
    outcome: CombatOutcome | null;
    summary: ReturnType<typeof buildCombatSummary>;
    phaseCount: number;
}

/** The hand (retreat excluded), ranked by the auto policy, best first. */
const rankedAutoCards = (s: CombatEncounterState, policy: HazardAutoPolicyId): { uid: string; card: CombatCard }[] => {
    const cards = handCards(s).filter(c => c.card.verbClass !== 'retreat');
    const activeIds = new Set(s.enemy.effects.map(e => e.effectId));
    return cards.sort((a, b) => {
        switch (policy) {
            case 'status': {
                const af = a.card.effectKind !== 'none' && !activeIds.has(a.card.primaryEffectId ?? '') ? 0 : a.card.effectKind !== 'none' ? 1 : 2;
                const bf = b.card.effectKind !== 'none' && !activeIds.has(b.card.primaryEffectId ?? '') ? 0 : b.card.effectKind !== 'none' ? 1 : 2;
                if (af !== bf) return af - bf;
                return b.card.bottomDamagePreview - a.card.bottomDamagePreview;
            }
            case 'aggressive':
                return b.card.bottomDamagePreview - a.card.bottomDamagePreview;
            case 'safe': {
                const at = a.card.verbClass === 'defend' || a.card.verbClass === 'buff-self' ? 0 : 1;
                const bt = b.card.verbClass === 'defend' || b.card.verbClass === 'buff-self' ? 0 : 1;
                if (at !== bt) return at - bt;
                return a.card.bottomDamagePreview - b.card.bottomDamagePreview;
            }
            default:
                return 0;
        }
    });
};


/**
 * Plays one threat phase under the ROUND-TURN LAW: ONE
 * tray roll per phase. Each paid play takes the best-ranked card a
 * live die can LEGALLY power (`firstLegalPoweringDie`), until none can; then
 * the leftover hand drains through the FREE tops and the turn ends. The
 * safety counter is kept but never binds on legal play.
 */
const playAutoPhase = (state: CombatEncounterState, policy: HazardAutoPolicyId, phaseTurnLimit: number): CombatEncounterState => {
    let s = state;
    let safety = 0;

    // The ONE legal tray roll for this phase.
    if (s.dice.length === 0 && !s.turnTakenThisPhase) {
        s = startTurn(s).state;
        if (s.phase !== 'phase-play') return s;
    }

    // Paid plays: each spends one live die on a colour-legal card.
    while (s.phase === 'phase-play' && !s.finalOutcome && safety < phaseTurnLimit * 6) {
        safety++;
        const current = s;
        const want = rankedAutoCards(current, policy)
            .map(c => ({ ...c, die: firstLegalPoweringDie(current, c.card) }))
            .find(c => c.die !== null);
        if (!want || !want.die) break;
        const res = playCombatCard(s, { uid: want.uid }, true, want.die.id);
        if (res.events.some(e => e.kind === 'effect-fizzled')) {
            s = playCombatCard(s, { uid: want.uid }, false).state;
            continue;
        }
        s = res.state;
    }

    // Wind-down: drain the leftover hand via the FREE tops, then end the turn.
    let drain = 0;
    while (s.phase === 'phase-play' && !s.finalOutcome && drain < 30) {
        drain++;
        const topCard = handCards(s).find(c => c.card.verbClass !== 'retreat');
        if (!topCard) break;
        s = playCombatCard(s, { uid: topCard.uid }, false).state;
    }
    if (s.phase === 'phase-play' && !s.finalOutcome && s.turnTakenThisPhase) s = endTurn(s).state;
    return s;
};

export function runHazardCombatAutoEncounter(
    player: Character,
    enemy: Enemy,
    options: HazardCombatAutoOptions = {},
): HazardCombatAutoResult {
    const policy = options.policy ?? 'status';
    const maxTurns = options.maxTurns ?? 20;
    let state = rollEncounterDice(initializeCombatEncounter(player, enemy, undefined, options.seed)).state;
    let phaseCount = 0;
    while (state.phase !== 'complete' && !state.finalOutcome && phaseCount < maxTurns) {
        phaseCount++;
        state = playAutoPhase(state, policy, maxTurns);
        if (state.finalOutcome) break;
        if (state.phase === 'phase-play') state = resolveThreatPhase(state).state;
    }
    return { state, outcome: state.finalOutcome ?? null, summary: buildCombatSummary(state), phaseCount };
}

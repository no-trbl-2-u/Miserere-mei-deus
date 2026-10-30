/**
 * Hazard-Pattern Combat — post-combat attribution + summary (HP model).
 *
 * The enemy's ONLY bar is HP. There are no effect kinds: DoT effects erode
 * enemy HP each phase, strikes chip it, and control gates the enemy's turn. This
 * module just keeps a per-card HP-damage ledger for the post-combat "which card
 * did the work" summary. Pure math only — no RNG, no I/O.
 */

import type {
    CombatAttributionRow, CombatEncounterState, CombatOutcome,
    CombatSummary, LandedEffect,
} from './combat.encounter.types';

/**
 * Folds a card's contribution into the attribution ledger keyed by the card.
 * `damage` is the DIRECT HP the play dealt right now (strike / payoff burst) and
 * is clamped to what the target could take. `landed` (when present) records the
 * DoT effect's PROVENANCE — which card applied it — so `buildCombatSummary` can
 * later attribute the effect's ACTUAL emitted ticks back to this card.
 *
 * WI-9 (2026-07-12): the old ledger PROJECTED a DoT's whole life
 * (damagePerRound × intensity × remainingDuration) at apply time. Post
 * trigger-migration a poison/bleed can sit its whole duration and tick zero, so
 * that projection credited HP the fight never contained — the defeat screen once
 * read "Straw Man's Jab — 27 dmg" while the enemy bar read 90/90. DoT is now
 * summed from emitted `dot-tick` events; this function only records the link.
 *
 * Overkill clamp (Gate 0 §2, 2026-07-10): when `targetHpBefore` — the target's
 * HP BEFORE this record's damage — is given, the DIRECT damage claims at most
 * that HP (a killing burst can't attribute more than the bar held).
 */
export function recordAttribution(
    attribution: Record<string, CombatAttributionRow>,
    cardId: string,
    cardName: string,
    landed: LandedEffect | null,
    damage: number,
    targetHpBefore?: number,
): Record<string, CombatAttributionRow> {
    const prev = attribution[cardId] ?? { cardId, name: cardName, dotDamage: 0, damageDealt: 0, phases: 0, effectIds: [] };
    const cap = targetHpBefore !== undefined ? Math.max(0, targetHpBefore) : undefined;
    const applied = cap !== undefined ? Math.min(damage, cap) : damage;
    // Record DoT provenance (the effect id this card applied) — its ticks are
    // attributed from the log at summary time, never projected here.
    const prevEffectIds = prev.effectIds ?? [];
    const dotEffectId = landed?.effect.payload.damageOverTime ? landed.effectId : null;
    const effectIds = dotEffectId && !prevEffectIds.includes(dotEffectId)
        ? [...prevEffectIds, dotEffectId]
        : prevEffectIds;
    return {
        ...attribution,
        [cardId]: {
            ...prev,
            dotDamage: prev.dotDamage, // filled from emitted ticks in buildCombatSummary
            damageDealt: prev.damageDealt + applied,
            phases: prev.phases + 1,
            effectIds,
        },
    };
}

const HEADLINES: Record<CombatOutcome, string> = {
    victory: 'Victory — the enemy falls',
    mercy: 'Mercy — the enemy is spared',
    defeat: 'Defeat',
    // No in-combat retreat exists (the Retreat card was removed) — this entry
    // stays only because `CombatOutcome` is a Record key and must stay
    // exhaustive; no live code path can ever produce this outcome.
    retreat: 'Retreat',
};

/** The synthetic ledger row for DoT ticks with no card provenance — engine
 *  drips (suppurating-curse, vulnerable surcharge, wall upkeep) and afflictions
 *  whose applying card wasn't recorded. Keeps the summed total honest. */
const LINGERING_ROW_ID = '__lingering_afflictions__';

/**
 * Every point of VITAE the enemy lost across the fight: the bar's net drop
 * PLUS everything it healed back. Heals show as negative `damage-dealt` (card
 * mechanics) or as `enemy-healed` (STAGE / threat `enemyHeal`, playtest fix
 * 2026-09-04 — before that event existed those heals were invisible here and
 * tripped the WI-9 reconciliation warning), or as the heal a `mercy-added`
 * carries (MERCY heals the foe).
 */
function enemyHpLost(state: CombatEncounterState): number {
    let enemyHealed = 0;
    for (const ev of state.log) {
        if (ev.kind === 'damage-dealt' && ev.target === 'enemy' && ev.amount < 0) enemyHealed += -ev.amount;
        else if (ev.kind === 'enemy-healed') enemyHealed += ev.amount;
        else if (ev.kind === 'mercy-added') enemyHealed += ev.healed;
    }
    return Math.max(0, state.enemy.maxHealth - state.enemy.health) + enemyHealed;
}

/**
 * Builds the post-combat summary (§7.7): names the card that dealt the enemy the
 * most HP. WI-9 — DoT is summed from the enemy's ACTUAL emitted `dot-tick`
 * events (attributed to the card that applied each effect), never projected, so
 * the ledger can never credit HP the fight didn't contain.
 */
export function buildCombatSummary(state: CombatEncounterState): CombatSummary {
    const outcome = state.finalOutcome ?? 'defeat';
    // Work on clones — dotDamage is (re)derived from the log, not from state.
    const rows = Object.values(state.attribution).map(r => ({ ...r, dotDamage: 0 }));
    const byCard = new Map(rows.map(r => [r.cardId, r]));
    // effectId → applying card (last applier wins on re-application).
    const effectToCard = new Map<string, string>();
    for (const r of rows) for (const eid of r.effectIds ?? []) effectToCard.set(eid, r.cardId);

    let totalDotDamage = 0;
    let lingering = 0;
    for (const ev of state.log) {
        if (ev.kind !== 'dot-tick' || ev.target !== 'enemy') continue;
        totalDotDamage += ev.amount;
        const row = byCard.get(effectToCard.get(ev.effectId) ?? '');
        if (row) row.dotDamage += ev.amount;
        else lingering += ev.amount;
    }
    if (lingering > 0) {
        const row = { cardId: LINGERING_ROW_ID, name: 'Lingering afflictions', dotDamage: lingering, damageDealt: 0, phases: 0 };
        rows.push(row);
    }

    reconcileAttribution(state, totalDotDamage);

    const hpLost = enemyHpLost(state);
    const directDamage = Math.max(0, hpLost - totalDotDamage);

    const sorted = rows.slice().sort((a, b) => b.damageDealt - a.damageDealt);
    // "Best card" names a CARD — the lingering bucket is bookkeeping, not a
    // play the player made, so it never wins the headline (it won a playtest
    // defeat screen on 2026-09-04 while the real deck did the work).
    const best = rows
        .filter(r => r.cardId !== LINGERING_ROW_ID)
        .sort((a, b) => (b.dotDamage + b.damageDealt) - (a.dotDamage + a.damageDealt))[0];
    return {
        outcome,
        headline: HEADLINES[outcome],
        rows: sorted,
        totalDotDamage,
        directDamage,
        bestCard: best?.name ?? '',
    };
}

/**
 * WI-9 dev-only reconciliation. Every attributed DoT tick actually reduced the
 * enemy's HP, so the summed DoT can never legitimately exceed the enemy's total
 * HP loss (± any healing it received). A divergence means the ledger is
 * projecting or double-counting again — the exact "27 DoT dmg while the bar
 * reads 90/90" bug this fix retires. Warn loudly in dev, never throw (a
 * diagnostic, not a gate; disabled in production).
 */
function reconcileAttribution(
    state: CombatEncounterState,
    totalDotDamage: number,
): void {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;
    const hpLostCeiling = enemyHpLost(state);
    if (totalDotDamage > hpLostCeiling + 0.5) {
        console.warn(
            `[attribution] DoT total ${totalDotDamage} exceeds enemy HP lost ${hpLostCeiling} — ledger over-counting (WI-9 regression).`,
        );
    }
}

/**
 * ENEMY DECKS — the Profane Canon.
 *
 * Every roster enemy fights as an ordered deck of enemy cards
 * (`combat.enemy-cards.ts`). The deck IS the fight's script, fully revealed
 * (Hazard's full-information doctrine): card N is threat phase N, the final
 * card loops as the standing final phase. `compileEnemyDeck` projects a deck
 * into the `AuthoredThreatStep[]` shape `combat.threat.ts`
 * consumes; the deck is the authoring layer.
 *
 * DECK SHAPE (conventions, not laws):
 *   - a deck is an ordered, non-reshuffling sequence, so escalation is
 *     STRUCTURAL rather than legislated: card 1 opens, the back half spikes.
 *     Aeon's End's tiered nemesis deck is the model — tier 1 on top, tier 3 on
 *     the bottom, and the fight gets worse because of how it was built.
 *   - every card id must resolve in the library (enforced; a miss is a bug).
 *   - THE STAKE is a free authoring tool: any deck may wager on any card via
 *     `DECK_STAKES`. `wagersCovetedDie` is the DEFAULT for a deck that
 *     authors no stake of its own.
 *
 * ROUND-KEYED DECK TIERS: "enemy decks increase in tier as the rounds
 * increase." A deck may be
 * authored as ORDERED TIERS whose entry is keyed to the ROUND rather than to
 * position alone (`TieredEnemyDeck`): tier 1 plays from round 1, tier 2 is
 * unreachable before `tier2AtRound` (default 3), tier 3 before `tier3AtRound`
 * (default 6). The mechanism is the per-phase `unlockAfterRound`
 * lock, stamped onto every card of a tier at compile time — so the resolver,
 * the telegraph and `processBetweenPhases` need no new vocabulary, and a
 * gated phase simply HOLDS the pointer at the last reachable phase (the fight
 * can never stall: the opener is never gated, see `compileEnemyDeck`).
 *
 * The flat `string[]` form is the majority shape: its
 * tiers are DERIVED from the cards' own `grade` (common → 1, escalation → 2,
 * signature → 3), running-max'd so a tier never reverts. Two authoring rules
 * make the derivation safe on decks nobody hand-tiered:
 *   - the deck's OPENING PAIR is always tier 1 (`TIER1_MIN_CARDS`) — rounds 1
 *     and 2 are the fight's opening exchange by definition, so a derived tier
 *     boundary can never land before index 2. This is what keeps the 3-card
 *     majority byte-identical to its pre-tier behaviour.
 *   - a gate can only DELAY a card, never summon it early, and the compiled
 *     gates are non-decreasing down the deck.
 * An authored `TieredEnemyDeck` overrides the derivation completely.
 */

import type { AuthoredThreatStep, AuthoredThreatPhase } from './combat.threat';
import {
    ENEMY_CARD_LIBRARY, type EnemyCard, type EnemyCardFace, type EnemyCardGrade,
} from './combat.enemy-cards';
import { ENEMY_REGISTRY } from '../Enemy/enemy.library';

/** Which tier of a deck a card sits in. 1 opens; 3 is the late-fight spike. */
export type DeckTier = 1 | 2 | 3;

/**
 * A deck authored as ROUND-KEYED TIERS (Aeon's End's nemesis deck: tier 1 on
 * top, tier 3 on the bottom). The compiled order is `tier1 ++ tier2 ++ tier3`,
 * so an authored tiering that partitions an existing flat deck in place
 * compiles to the same steps it always did — only the round gates are new.
 */
export interface TieredEnemyDeck {
    /** Openers. Plays from round 1; never gated. */
    readonly tier1: readonly string[];
    /** The pattern. Unreachable before `tier2AtRound`. */
    readonly tier2?: readonly string[];
    /** Spikes, signatures, the finale. Unreachable before `tier3AtRound`. */
    readonly tier3?: readonly string[];
    /** Round tier 2 becomes reachable (default `TIER2_DEFAULT_ROUND`). */
    readonly tier2AtRound?: number;
    /** Round tier 3 becomes reachable (default `TIER3_DEFAULT_ROUND`). */
    readonly tier3AtRound?: number;
}

/** Either deck form. The flat array is the majority shape. */
export type EnemyDeckSpec = readonly string[] | TieredEnemyDeck;

/** Default round gates. A tier never reverts, so these are clamped monotonic. */
export const TIER2_DEFAULT_ROUND = 3;
export const TIER3_DEFAULT_ROUND = 6;
/** The opening exchange is always tier 1 — see the header note. */
export const TIER1_MIN_CARDS = 2;

/** Narrows a deck spec to the authored tiered form. */
export function isTieredDeck(spec: EnemyDeckSpec): spec is TieredEnemyDeck {
    return !Array.isArray(spec);
}

/** The deck's card ids in compiled (play) order, whichever form it was authored in. */
export function deckCardIds(spec: EnemyDeckSpec): readonly string[] {
    if (!isTieredDeck(spec)) return spec;
    return [...spec.tier1, ...(spec.tier2 ?? []), ...(spec.tier3 ?? [])];
}

/** enemy id → its ordered deck of enemy-card ids (flat), or its authored tiers. */
export const ENEMY_DECKS: Record<string, EnemyDeckSpec> = {
    // The three roster enemies.
    'enemy-float-eye': ['dp-first-bell', 'dp-undertow-grip', 'dp-breaking-sea'],
    'enemy-brine-hag': ['dp-wet-congregation', 'dp-lead-bell', 'dp-drowning-drill', 'dp-breaking-sea', 'dp-vespers-under-water'],
    // BOSS — TIERED (7 cards): the door is kept open, the frame and the
    // margin note, then what shuts stays shut, the proof completed and the
    // question that eats.
    'enemy-death-beholder': {
        tier1: ['litany-of-thresholds', 'the-door-kept-open'],
        tier2: ['the-bronze-frame', 'ap-the-margin-note'],
        tier3: ['what-shuts-stays-shut', 'ap-the-proof-completed', 'ap-the-question-that-eats'],
        // Later gates than the default 3/6: the boss fight runs about seven
        // turns, so its pattern opens on round 4 and its finale on round 7.
        tier2AtRound: 4,
        tier3AtRound: 7,
    },
};

/** Projects one enemy-card face onto an authored-phase fragment. */
function faceToPhase(face: EnemyCardFace): AuthoredThreatPhase {
    return {
        damageWeight: face.damageWeight,
        threatEffectId: face.effectId,
        threatIntensity: face.intensity,
        enemyHeal: face.enemyHeal,
        enemyCleanse: face.enemyCleanse,
        actionText: face.actionText,
    };
}

/** Projects one enemy card onto its authored threat step. The telegraph names
 *  the card being played — the enemy is visibly a deck-player. */

/**
 * THE STAKE is a DECK property, not a card property: signature cards are
 * shared across decks (the same Devoured Lexicon serves an elite and a boss),
 * so which seat wagers is decided here — at the one place that knows which
 * enemy is playing — rather than trusted to every card literal.
 *
 * This is the DEFAULT, used when a deck authors no `DECK_STAKES` entry of
 * its own. Any deck may stake any seat.
 */
function wagersCovetedDie(enemyId: string): boolean {
    const registry = ENEMY_REGISTRY as Record<string, { difficulty?: string } | undefined>;
    const difficulty = registry[enemyId.replace(/^enemy-/, '')]?.difficulty;
    return difficulty === 'boss' || difficulty === 'unique';
}

function cardToStep(
    cardId: string, card: EnemyCard, isFinal: boolean, stake: boolean,
    unlockAfterRound: number | undefined,
): AuthoredThreatStep {
    if (card.branch) {
        // A branch step has no phase-level fields of its own — `resolveAuthored`
        // reads the gate off the ELSE (pending) fork, so both forks carry it.
        return {
            branch: {
                condition: card.branch.condition,
                then: { ...faceToPhase(card.branch.then), isFinalPhase: isFinal, unlockAfterRound },
                else: { ...faceToPhase(card.branch.else), isFinalPhase: isFinal, unlockAfterRound },
            },
        };
    }
    return {
        damageWeight: card.damageWeight,
        threatEffectId: card.effectId,
        threatIntensity: card.intensity,
        enemyHeal: card.enemyHeal,
        enemyCleanse: card.enemyCleanse,
        stake: stake || undefined,
        unlockAfterRound,
        actionText: `${card.name} — ${card.actionText}`,
        isFinalPhase: isFinal,
    };
}

/**
 * Compiles an enemy's deck into the authored threat-step sequence the
 * resolver consumes. Unknown card ids are dropped LOUDLY (a deck referencing
 * a missing card is an authoring bug, not a runtime condition).
 */
export const DECK_STAKES: Readonly<Record<string, readonly number[]>> = Object.freeze({
    // Per-deck stake seats (0-based card index).
    // Empty by design: every deck currently takes the default. Author an entry
    // here to make a foe wager somewhere else, or to make an elite wager at
    // all. An empty array means "this deck never stakes".
});

/** The card grade → tier reading the derivation uses when a deck authors none. */
const GRADE_TIER: Readonly<Record<EnemyCardGrade, DeckTier>> = Object.freeze({
    common: 1, escalation: 2, signature: 3,
});

/** A deck resolved to its play order plus the round each of its tiers opens. */
export interface DeckTierPlan {
    /** Card ids in compiled (play) order. */
    readonly cardIds: readonly string[];
    /** `tiers[i]` is the tier of `cardIds[i]`. Non-decreasing by construction. */
    readonly tiers: readonly DeckTier[];
    /** Round each tier becomes reachable. Non-decreasing; tier 1 is always 1. */
    readonly tierRounds: Readonly<Record<DeckTier, number>>;
    /** True when the deck hand-authored its tiers (a `TieredEnemyDeck`). */
    readonly authored: boolean;
}

/**
 * Resolves a deck to its ROUND-KEYED TIER PLAN — the one place that decides
 * which card sits in which tier and when that tier opens.
 *
 * An authored `TieredEnemyDeck` is taken as written (its gates clamped
 * monotonic so tier 3 can never open before tier 2). A flat deck is DERIVED
 * from the cards' `grade`, running-max'd down the deck so a tier never
 * reverts, with the opening pair pinned to tier 1 (`TIER1_MIN_CARDS`).
 *
 * Returns null for an unknown enemy id.
 */
export function planDeckTiers(enemyId: string): DeckTierPlan | null {
    const spec = ENEMY_DECKS[enemyId];
    if (!spec) return null;

    if (isTieredDeck(spec)) {
        const t2 = spec.tier2 ?? [];
        const t3 = spec.tier3 ?? [];
        const round2 = Math.max(1, spec.tier2AtRound ?? TIER2_DEFAULT_ROUND);
        const round3 = Math.max(round2, spec.tier3AtRound ?? TIER3_DEFAULT_ROUND);
        return {
            cardIds: [...spec.tier1, ...t2, ...t3],
            tiers: [
                ...spec.tier1.map((): DeckTier => 1),
                ...t2.map((): DeckTier => 2),
                ...t3.map((): DeckTier => 3),
            ],
            tierRounds: { 1: 1, 2: round2, 3: round3 },
            authored: true,
        };
    }

    const cardIds = spec;
    let running: DeckTier = 1;
    const tiers = cardIds.map((cardId, i): DeckTier => {
        // The opening exchange is tier 1 whatever it is holding: rounds 1-2
        // ARE the deck's top, and gating them would gate the fight's first act.
        if (i < TIER1_MIN_CARDS) return 1;
        const card = ENEMY_CARD_LIBRARY[cardId];
        if (!card) throw new Error(`Enemy deck '${enemyId}' names unknown card '${cardId}'.`);
        const tier = GRADE_TIER[card.grade];
        if (tier > running) running = tier;
        return running;
    });

    const tierRounds: Record<DeckTier, number> = { 1: 1, 2: 1, 3: 1 };
    let previous = 1;
    for (const tier of [2, 3] as const) {
        // A tier the deck never reaches inherits the previous tier's round, so
        // the map stays monotonic and reads sanely for callers.
        const round = tiers.includes(tier)
            ? Math.max(previous, tier === 2 ? TIER2_DEFAULT_ROUND : TIER3_DEFAULT_ROUND)
            : previous;
        tierRounds[tier] = round;
        previous = round;
    }
    return { cardIds, tiers, tierRounds, authored: false };
}

export function compileEnemyDeck(enemyId: string): AuthoredThreatStep[] {
    const plan = planDeckTiers(enemyId);
    if (!plan) return [];
    const { cardIds, tiers, tierRounds } = plan;
    // An authored stake list wins; otherwise fall back to the default
    // (a boss/unique wagers on its second card).
    const authoredStakes = DECK_STAKES[enemyId];
    // The compiled gate is a RUNNING MAX: a card's own authored
    // `unlockAfterRound` and its tier's round both push it later, never
    // earlier, and no phase can ever open before the one in front of it.
    let gate = 0;
    return cardIds.map((cardId, i) => {
        const card = ENEMY_CARD_LIBRARY[cardId];
        if (!card) throw new Error(`Enemy deck '${enemyId}' names unknown card '${cardId}'.`);
        const stake = authoredStakes
            ? authoredStakes.includes(i)
            : i === 1 && wagersCovetedDie(enemyId);
        // ANTI-STALL: the opener is never round-gated. It is the phase the
        // encounter starts on, so a gate there could lock the fight out of a
        // legal action; every later phase can only hold the pointer at the
        // last reachable one, which always has an action.
        let unlockAfterRound: number | undefined;
        if (i === 0) {
            unlockAfterRound = undefined;
        } else {
            gate = Math.max(gate, card.unlockAfterRound ?? 0, tiers[i] > 1 ? tierRounds[tiers[i]] : 0);
            unlockAfterRound = gate > 1 ? gate : undefined;
        }
        return cardToStep(cardId, card, i === cardIds.length - 1, stake, unlockAfterRound);
    });
}

/** Every enemy id that fights by deck (the full roster). */
export const ENEMY_DECK_IDS: readonly string[] = Object.freeze(Object.keys(ENEMY_DECKS));

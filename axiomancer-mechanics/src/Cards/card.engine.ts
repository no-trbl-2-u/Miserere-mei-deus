/**
 * Card engine — pure execution helpers for cards.
 *
 * The Hazard-Pattern combat engine drives card bottom-actions through
 * `executeCard`. Every helper here is pure: callers thread the updated state
 * forward themselves.
 */

import { BaseStats, Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { ActiveEffect, Effect } from '../Effects/types';
import { lookupEffect, applyEffect } from '../Effects';
import { resolveEffectApplication } from '../Combat/resist';
import { Combatant, CombatState } from '../Combat/types';
import { scaleEffectIntensity } from '../Combat/stat-scaling';
import { Card, CardCombatEffects } from './types';
import { cardLibrary, getCardById } from './cards.library';

// ─── Card Learning ──────────────────────────────────────────────────────────

/**
 * Returns every entry in `cardLibrary` that the character has not already
 * learned, except the Curses (a card adds a Curse mid-combat). Order matches the library order so the UI can show a stable list
 * across calls. Cards are learnable unconditionally (no level / stat /
 * prerequisite / alignment gate).
 */
export function getAvailableCards(
    character: Pick<Character, 'knownCards'>,
): Card[] {
    // A Curse is never learned: a card adds it mid-combat.
    return cardLibrary.filter(s => s.cardType !== 'curse' && !character.knownCards.includes(s.id));
}

/**
 * Appends `cardId` to `character.knownCards` when the card exists and is not
 * already known. Pure; returns the unchanged character (same reference) on any
 * guard miss.
 */
export function learnCard(
    character: Character,
    cardId: string,
): Character {
    if (character.knownCards.includes(cardId)) return character;
    if (!getCardById(cardId)) return character;
    return {
        ...character,
        knownCards: [...character.knownCards, cardId],
    };
}

/**
 * Swaps ONE owned copy of `cardId` for `withCardId` (an upgrade: `x` for
 * `x+`), in `knownCards` first, else in `combatRewardCards`. Duplicates are
 * kept: only the first matching copy changes. Pure; returns the unchanged
 * character (same reference) when the card is not owned or `withCardId` does
 * not resolve.
 */
export function replaceCard(
    character: Character,
    cardId: string,
    withCardId: string,
): Character {
    if (cardId === withCardId || !getCardById(withCardId)) return character;
    const swapOne = (ids: readonly string[]): string[] | null => {
        const at = ids.indexOf(cardId);
        if (at < 0) return null;
        const next = ids.slice();
        next[at] = withCardId;
        return next;
    };
    const known = swapOne(character.knownCards);
    if (known) return { ...character, knownCards: known };
    const rewards = swapOne(character.combatRewardCards ?? []);
    if (rewards) return { ...character, combatRewardCards: rewards };
    return character;
}

// ─── Card Execution ─────────────────────────────────────────────────────────

/** One discrete thing that happened while a card resolved. */
export type CardEvent = {
    kind: 'effect-applied';
    cardId: string;
    appliedTo: 'self' | 'enemy';
    effect: Effect;
    message: string;
};

/** Result of `executeCard`. */
export interface CardResolution {
    state: CombatState;
    events: CardEvent[];
}

/** Lookup helper used by `executeCard` to resolve a card ID against an actor. */
export interface CardLookup {
    (cardId: string): Card | undefined;
}

/**
 * Runs a player card's `combatEffects` against the current `CombatState`:
 *
 *   1. Validate the player owns the card (known or a card-reward pickup).
 *   2. Resolve each `combatEffects` payload through `resolveEffectApplication`
 *      (every effect lands as printed).
 *
 * `specialMechanics` (DEAL, GUARD) are the combat engine's: this engine never
 * reads them, and it deals no direct damage.
 *
 * The caller — not this function — is responsible for surfacing the returned
 * `CardEvent[]` to any higher-level event stream.
 *
 * @throws if the card is not owned or not found in the lookup.
 */
export function executeCard(
    state: CombatState,
    cardId: string,
    lookupCard: CardLookup,
): CardResolution {
    // A player OWNS a combat card when it is a learned card OR a card-reward
    // pickup — the exact two sources `buildCombatDeck` deals from. Reward
    // cards (`combatRewardCards`) enter the deck WITHOUT joining `knownCards`,
    // so a knownCards-only check would reject a legitimately-dealt reward card.
    const player = state.player;
    const owned = player.knownCards.includes(cardId)
        || (player.combatRewardCards ?? []).includes(cardId);
    if (!owned) {
        throw new Error(`Card '${cardId}' is not known.`);
    }

    const card = lookupCard(cardId);
    if (!card) {
        throw new Error(`Card '${cardId}' not found in library.`);
    }

    const events: CardEvent[] = [];
    let workingPlayer: Combatant = state.player;
    let workingEnemy: Combatant = state.enemy;

    for (const payload of card.combatEffects ?? []) {
        const result = applyCardEffect(
            payload, card, workingPlayer, workingEnemy, state.round, state.player.baseStats,
        );
        workingPlayer = result.caster;
        workingEnemy = result.target;
        events.push(...result.events);
    }

    return {
        state: {
            ...state,
            player: workingPlayer as Character,
            enemy:  workingEnemy as Enemy,
        },
        events,
    };
}

interface CardEffectResult {
    caster: Combatant;
    target: Combatant;
    events: CardEvent[];
}

/**
 * Routes a single `CardCombatEffects` payload through the
 * `resolveEffectApplication` resolver and lands the outcome on the correct
 * combatant. Every effect lands as printed, whatever its tier.
 *
 * `payload.intensity` and `payload.duration` override the effect's default
 * stack/duration, scaled by the player's stats. `payload.appliedTo ===
 * 'self'` routes to the caster's effects; otherwise to the target's.
 */
function applyCardEffect(
    payload: CardCombatEffects,
    card: Card,
    caster: Combatant,
    target: Combatant,
    round: number,
    playerStats: BaseStats,
): CardEffectResult {
    const events: CardEvent[] = [];
    const effect = lookupEffect(payload.effectId);
    if (!effect) {
        return { caster, target, events };
    }

    const targetIsSelf = payload.appliedTo === 'self';
    const effectTarget: Combatant = targetIsSelf ? caster : target;
    const intensityOverride = scaleEffectIntensity(effect, payload.intensity ?? 1, targetIsSelf, playerStats);
    const durationOverride  = payload.duration;

    const built = buildActiveEffect(effect, round, intensityOverride, durationOverride);
    const result = resolveEffectApplication(effectTarget, built, effect.type);

    // When the card payload explicitly overrides duration we must apply in
    // `additive` mode so the override survives the apply path, which otherwise
    // resets to `effect.duration` on first application. The override value is
    // also the value to write.
    const buildApplyOptions = (intensity: number, duration: number) => {
        if (durationOverride !== undefined) {
            return {
                intensityDelta: intensity,
                durationMode:   'additive' as const,
                durationDelta:  duration,
            };
        }
        return {
            intensityDelta: intensity,
            durationDelta:  duration,
        };
    };

    const appliedIntensity = result.activeEffect?.intensity ?? intensityOverride ?? 1;
    const appliedDuration  = result.activeEffect?.remainingDuration ?? durationOverride ?? effect.duration;

    const applied = applyEffect(
        effectTarget.effects, effect, round,
        { ...buildApplyOptions(appliedIntensity, appliedDuration), sourceId: caster.id, uncapped: true },
    );

    events.push({
        kind: 'effect-applied', cardId: card.id,
        appliedTo: targetIsSelf ? 'self' : 'enemy',
        effect, message: result.message,
    });

    if (targetIsSelf) {
        return {
            caster: { ...caster, effects: applied.activeEffects } as Combatant,
            target,
            events,
        };
    }
    return {
        caster,
        target: { ...target, effects: applied.activeEffects } as Combatant,
        events,
    };
}

function buildActiveEffect(
    effect: Effect,
    round: number,
    intensityOverride?: number,
    durationOverride?: number,
): ActiveEffect {
    return {
        effectId:          effect.id,
        remainingDuration: durationOverride  ?? effect.duration,
        intensity:         intensityOverride ?? 1,
        appliedAt:         round,
        tier:              effect.tier,
        resistedBy:        effect.resistedBy,
        resistDR:          effect.resistDR,
    };
}


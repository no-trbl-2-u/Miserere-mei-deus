/**
 * Playtest stage profiles — canonical "moments in the campaign" for the
 * Hazard-Pattern Combat playtest harness (stage matrix, deck drafting, CLIs).
 *
 * A stage profile freezes the three inputs that define a player's power at a
 * point in the campaign: level, base stats, and max HP — plus the deck-maturity
 * gate (`maxCardTier`) and the enemy roster that stage is measured against.
 * `buildStagePlayer` turns a profile into a ready-to-fight `Character` whose
 * known cards are exactly the stage-eligible card pool.
 *
 * HP is the sole win condition. Stage rosters exist so the playtest matrix can
 * measure every win path at EVERY stage of the campaign, not just at one
 * tuned snapshot.
 *
 * Pure data + pure helpers. Enemy slugs are NOT validated at import time — the
 * stage-profiles e2e asserts every slug against `ENEMY_REGISTRY`.
 */

import type { BaseStats, Character } from '../Character/types';
import type { Card, CardTier, CardRank } from '../Cards/types';
import { cardLibrary } from '../Cards/cards.library';
import { canUpgrade, UPGRADE_SUFFIX } from '../Cards/card-upgrades';
import { Player } from '../Character/characters.mock';
import { deepClone, calculateMaxHealth } from '../Utils';
import { wearGreySword } from './combat.grey-sword';

/**
 * Deck-MATURITY level implied by a card's RANK (the quality ladder Ash 1 …
 * Saint 6). Cards carry no player-level requirement; the playtest harness
 * uses this rank→maturity mapping to decide which cards a player "at stage X"
 * would plausibly hold. This is a SIM-harness heuristic only; it is not a gate
 * the game enforces on the player.
 */
export function rankMaturityLevel(rank: CardRank): number {
    return ({ 1: 1, 2: 2, 3: 4, 4: 6, 5: 10, 6: 12 } as Record<CardRank, number>)[rank];
}

/** The three campaign moments the playtest matrix measures. */
export type CombatStageId = 'early' | 'mid' | 'late';

/** A frozen campaign moment: player power + deck maturity + enemy roster. */
export interface CombatStageProfile {
    id: CombatStageId;
    /** Display name for reports and CLIs. */
    name: string;
    /** One-line pitch: what this stage is measuring. */
    description: string;
    /** Player level at this stage (drives player stat scaling, and — via
     *  `rankMaturityLevel` — the deck-maturity gate in `stageEligibleCardIds`). */
    playerLevel: number;
    /** Heart/Body/Mind core attributes at this stage. */
    playerBaseStats: BaseStats;
    /** Authored max HP of the profile's era — documentation only:
     *  `buildStagePlayer` DERIVES the live VITAE from level + stats. */
    playerMaxHealth: number;
    /** Deck maturity gate — only cards with `tier <= maxCardTier` are eligible. */
    maxCardTier: CardTier;
    // ── THE PATH — the progression axes ─────────────────────────────────────
    // A player's power does NOT grow through card rank alone; modelling only
    // rank + stats sends an act-1 body at act-4 content. These fields carry
    // the rest of the campaign's growth into the measurement.
    /** ACT REWARD DICE banked by this stage — extra dice in every turn's tray.
     *  One per completed act ("a red/blue/purple base die of their choice").
     *
     *  NOT A SHIPPED FEATURE YET: the game is still in act one, so no player
     *  is handed an act-reward die. This field
     *  is the harness PROJECTING the campaign the design intends, so a mid/late
     *  cell is measured with the body that stage of the game will actually
     *  have. Do not read it as evidence the reward exists in the product. */
    bonusBaseDice: number;
    /** DIE UPGRADES bought by this stage (0-`MAX_DIE_UPGRADE_LEVEL`) — the share
     *  of LIVE and WILD faces in the roll bag. Expensive in the fiction.
     *
     *  Owner-set bands: early = the base die, mid = 1-2 upgrades,
     *  late = 3-4. Pinned in `progression-axes.engine.test.ts`. */
    dieUpgradeLevel: number;
    /** CARD UPGRADES: the fraction of this stage's deck that has been upgraded
     *  (Slay the Spire's rest-site upgrade). 0 = none, 1 = the whole deck. */
    upgradedCardShare: number;
    /** Slugs (keys of `ENEMY_REGISTRY`) this stage is measured against. */
    enemySlugs: readonly string[];
}

/** Canonical stage order — early campaign first. */
export const COMBAT_STAGE_ORDER: readonly CombatStageId[] = Object.freeze([
    'early', 'mid', 'late',
]);

/**
 * The stage roster. Numbers are playtest anchors, not live game tuning — the
 * orchestrator calibrates them against the balance-band e2e.
 */
export const COMBAT_STAGE_PROFILES: Record<CombatStageId, CombatStageProfile> = {
    early: {
        id: 'early',
        name: 'The Shallows',
        description: 'The opening hours: a thin tier-1 kit against the coast\'s small griefs. Status play should already be the efficient path.',
        // PLAYTEST-CALIBRATION
        playerLevel: 3,
        playerBaseStats: { heart: 5, body: 5, mind: 5 },
        playerMaxHealth: 90,
        maxCardTier: 1,
        // Act 1: nothing banked yet. This is the body the game starts you in.
        bonusBaseDice: 0,
        dieUpgradeLevel: 0,
        upgradedCardShare: 0,
        enemySlugs: ['float-eye', 'green-jelly', 'death-beholder'],
    },
    mid: {
        id: 'mid',
        name: 'The Long Road',
        description: 'Mid-campaign: tier-2 status engines online, against enemies that punish pure basic-attack trading.',
        // PLAYTEST-CALIBRATION — interpolated from the L15/L30 ladder presets
        // (src/Character/presets.ts): L20 ~ 51 total stats, HP = stat sum x 5.
        playerLevel: 20,
        playerBaseStats: { heart: 17, body: 17, mind: 17 },
        playerMaxHealth: 255,
        // `tier` is the RESIST tier, never a power axis; `rankMaturityLevel`
        // is the maturity gate (rank 5 wants level 10, rank 6 level 12). At
        // level 20 a player holds Skull and Saint cards, all tier 3, so the
        // cap admits tier 3.
        maxCardTier: 3,
        // One act cleared: a fourth die, two hones (top of the owner's "1 or 2"
        // band), a third of the deck upgraded at rest sites.
        bonusBaseDice: 1,
        dieUpgradeLevel: 2,
        upgradedCardShare: 0.33,
        enemySlugs: ['green-jelly', 'death-beholder'],
    },
    late: {
        id: 'late',
        name: 'The Deep Wood',
        description: 'Late campaign: the full tier-3 library against bosses and uniques — DoT erosion and control denial must carry the fight.',
        // PLAYTEST-CALIBRATION — interpolated from the L30/L50 ladder presets:
        // L45 ~ 114 total stats, HP = stat sum x 5.
        playerLevel: 45,
        playerBaseStats: { heart: 37, body: 39, mind: 38 },
        playerMaxHealth: 570,
        maxCardTier: 3,
        // Two acts cleared: five dice, three hones (the owner's "3 or 4" band),
        // most of the deck upgraded.
        bonusBaseDice: 2,
        dieUpgradeLevel: 3,
        upgradedCardShare: 0.66,
        enemySlugs: ['death-beholder'],
    },
};

/** Looks up a stage profile by id (undefined when unknown). */
export function getStageProfile(id: string): CombatStageProfile | undefined {
    return isCombatStageId(id) ? COMBAT_STAGE_PROFILES[id] : undefined;
}

/** True when the string names a combat stage. */
export function isCombatStageId(id: string): id is CombatStageId {
    return (COMBAT_STAGE_ORDER as readonly string[]).includes(id);
}

/**
 * The card pool eligible at a stage: every library card (plus any
 * `extraCards` — e.g. registered sandbox cards, which may also OVERRIDE a
 * library card by sharing its id) filtered by `tier <= maxCardTier` and
 * `rankMaturityLevel(rank) <= playerLevel`, Curses left out (a card adds a
 * Curse mid-combat). Excludes nothing else — the point
 * is the WHOLE maturity-gated library, so the playtest matrix can measure
 * coverage of it.
 */
export function stageEligibleCardIds(
    stage: CombatStageProfile,
    extraCards: readonly Card[] = [],
): string[] {
    const pool = new Map<string, Card>();
    for (const card of cardLibrary) pool.set(card.id, card);
    for (const card of extraCards) pool.set(card.id, card);
    const ids: string[] = [];
    for (const card of pool.values()) {
        if (card.tier > stage.maxCardTier) continue;
        if (rankMaturityLevel(card.rank) > stage.playerLevel) continue;
        // A Curse is never learned: a card adds it mid-combat.
        if (card.cardType === 'curse') continue;
        // The grey office is also the reward pool, so a stage pool models the
        // reward-built deck with it.
        ids.push(card.id);
    }
    // THE PATH — CARD UPGRADES (axis 3). By this stage the player has spent
    // `upgradedCardShare` of their rest-site beats on `+` copies. Applied
    // DETERMINISTICALLY (every Nth id in a stable order), never by rng, so a
    // seeded cell stays reproducible.
    const share = Math.max(0, Math.min(1, stage.upgradedCardShare));
    if (share <= 0) return ids;
    ids.sort();
    const step = share >= 1 ? 1 : Math.max(2, Math.round(1 / share));
    return ids.map((id, i) => {
        if (i % step !== 0) return id;
        const card = pool.get(id);
        if (!card || !canUpgrade(card)) return id;
        return `${id}${UPGRADE_SUFFIX}`;
    });
}

/**
 * Builds the stage's player: a deep clone of the canonical `Player` mock with
 * level / base stats / HP set from the profile, and `knownCards` = the full stage-eligible card pool
 * (so `buildCombatDeck` and deck drafting both see the same maturity gate).
 */
export function buildStagePlayer(stage: CombatStageProfile): Character {
    const player = deepClone(Player);
    player.level = stage.playerLevel;
    player.baseStats = { ...stage.playerBaseStats };
    // DERIVE the pool from the live VITAE formula, never author it: a
    // hard-coded `playerMaxHealth` drifts from the formula and turns every
    // cell into a measurement artefact. The authored field is not read here.
    const vitae = calculateMaxHealth(stage.playerLevel, player.baseStats);
    player.maxHealth = vitae;
    player.health = vitae;
    player.knownCards = stageEligibleCardIds(stage);
    // THE PATH — carry the dice axes into the encounter. `upgradedCardShare` is
    // consumed by `stageEligibleCardIds` (the `knownCards` pool above), not here.
    player.bonusTurnDice = stage.bonusBaseDice;
    player.dieUpgradeLevel = stage.dieUpgradeLevel;
    // A special only pays when a weapon is worn; the stage player plays as a fresh run does.
    wearGreySword(player);
    return player;
}

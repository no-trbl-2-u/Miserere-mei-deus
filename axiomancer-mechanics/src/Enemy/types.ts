import { Card } from '../Cards/types';
import { MapName } from '../World/map.library';
import { BaseStats } from '../Character/types';
import { ActiveEffect } from '../Effects/types';
import { Item } from '../Items/types';
// CodexEntry's semantic home is src/Game/types.ts (alongside CodexState +
// the Game-loop persistence surface). It's re-exported here so
// `Enemy.journalEntry?: CodexEntry` decoration works at the per-foe content
// site without import churn for consumers reading from the Enemy barrel.
import type { CodexEntry } from '../Game/types';
export type { CodexEntry };
import type { EnemyKeyword, EnemyStage } from './enemy-keywords';
export type { EnemyKeyword, EnemyStage };

/**
 * Per-enemy befriend gate, read by The Open Hand (`befriendHpGateOpen`,
 * `Enemy/befriend.ts`). Absent = the foe is always open to a befriend.
 */
export interface BefriendabilityConfig {
    /**
     * Friendship eligibility requires `enemy.health / enemy.maxHealth`
     * to be at or below `belowPct` at the eligibility check. Pure
     * snapshot — healing back above the threshold un-qualifies
     * eligibility. Range [0, 1].
     */
    hpGate?: { belowPct: number };
}

/**
 * Decision-making label an enemy carries. Data only: nothing reads it. The
 * Hazard-Pattern engine drives every foe through its authored threat
 * sequence.
 */
export type EnemyLogic =
    | 'random' | 'aggressive' | 'defensive' | 'balanced' | 'strategic' | 'boss';

/**
 * Difficulty classification used by the world to seed encounters.
 */
export type EnemyDifficulty = 'simple' | 'normal' | 'elite' | 'boss' | 'unique';

/**
 * Per-enemy content awarded when combat resolves via friendship (the
 * `outcome === 'friendship'` path).
 *
 * Layered ON TOP OF the base: half-XP + full loot. None of the
 * FriendshipReward fields REPLACE the base grants; they augment them. Authors leave
 * undefined for enemies whose friendship path is purely mechanical
 * (no content stakes).
 *
 * Engine wiring lives in `store.endCombat()` — items append to
 * `report.loot` and `xpBonus` adds to `report.xpGained` before the
 * level-up cascade fires. `narrative` surfaces on
 * `CombatEndReport.friendshipReward.narrative` for the CLI / UI
 * (engine does not interpret).
 */
export interface FriendshipReward {
    /** Guaranteed items appended to the weighted-loot roll. */
    items?: Item[];
    /** Extra XP on top of the half-XP base. Additive, not multiplicative. */
    xpBonus?: number;
    /** Optional flavour text for the CLI / UI to render after combat-end. */
    narrative?: string;
    /**
     * Optional world-flag appended to `state.flags` when combat
     * resolves via friendship. Reuses the existing flag-gate machinery
     * (`DialogueChoice.requires.flag`, `visibleChoices`); downstream content
     * (dialogue branches, quest objectives) can gate on the flag without
     * extending the engine. Convention: `befriended-<enemy-id-stem>`
     * (e.g. `'befriended-mournful-gull'`). De-duplicated on append.
     */
    flagSet?: string;
}

/**
 * Weighted drop entry on an `Enemy.loot` table.
 *
 * Each entry contributes its `weight` to the roll; the rolled bucket spawns
 * the entry's `item` (or, if `item` is `null`, nothing — that bucket is the
 * empty / no-drop slot). Library authors can express "nothing 60%, herb 30%,
 * potion 10%" with `[ { item: null, weight: 60 }, { item: herb, weight: 30 },
 * { item: potion, weight: 10 } ]`. Weights are unitless integers; the runtime
 * normalises them at roll time.
 *
 * `loot` on the `Enemy` is intentionally a runtime-mutable variable: encounters
 * can splice in extra entries (e.g. quest-driven guaranteed drops, biome
 * tables) before combat starts. See `rollLoot` in `Enemy/loot.ts`.
 */
export interface LootTableEntry {
    /** Item to drop when this bucket rolls. `null` represents a no-drop slot. */
    item: Item | null;
    /** Positive integer weight; normalised across the table at roll time. */
    weight: number;
}

/**
 * Chronicle-voice prose for the victory final-blow
 * aftermath panel. Three variants; consumer (mobile presenter, CLI,
 * etc.) picks which to render based on the outcome shape (typically
 * damage-tier: brutal = overkill burst, quiet = exact cap, ironic =
 * self-inflicted / mirror-effect KO). Strings are complete prose as
 * authored; engine does no interpolation and no variant selection.
 */
export interface FinalBlowLines {
    brutal: string;
    quiet: string;
    ironic: string;
}

/**
 * Chronicle-voice prose for the friendship-pact
 * aftermath panel. Three variants matching how the parley landed
 * (quiet = mutual silence, setDown = enemy lays down its weapon
 * literally, heavy = recognition under weight). Only meaningful
 * when the enemy also carries a `friendshipReward`; un-befriendable
 * enemies leave this undefined.
 *
 * Naming note: the prose variant is "set-down"; this field is
 * `setDown` (TS-identifier convention).
 */
export interface PactLines {
    quiet: string;
    setDown: string;
    heavy: string;
}

/**
 * Chronicle-voice prose for the defeat aftermath panel
 * ("cause of loss"). Three variants matching how the player went
 * down (brutal = enemy unloaded a burst, broken = attrition over
 * many rounds, quiet = exact-cap or single-tick KO).
 */
export interface CauseLines {
    brutal: string;
    broken: string;
    quiet: string;
}

/**
 * An adversary that can be encountered in combat.
 *
 * @property id           - Unique identifier (used for save/load and tracking).
 * @property mapName      - The map this enemy belongs to.
 * @property logic        - AI strategy.
 * @property difficulty   - Optional encounter classification.
 * @property cards        - Optional card rotation the enemy can use.
 * @property loot         - Optional weighted drop table. Each
 *                          successful kill rolls the table once. May be empty
 *                          / undefined for enemies that don't drop anything.
 * @property effects      - Active status effects on the enemy.
 */
export interface Enemy {
    id: string;
    name: string;
    description: string;
    level: number;
    health: number;
    maxHealth: number;
    baseStats: BaseStats;
    mapName: MapName;
    logic: EnemyLogic;
    difficulty?: EnemyDifficulty;
    cards?: Card[];
    /** Weighted drop table — see {@link LootTableEntry}. */
    loot?: LootTableEntry[];
    /** Flat experience-point award on kill. Defaults computed by difficulty. */
    xpReward?: number;
    effects: ActiveEffect[];
    /**
     * Optional per-enemy reward content surfaced on
     * `outcome === 'friendship'`. See {@link FriendshipReward}.
     * When undefined, the enemy's friendship resolution is purely
     * mechanical (base only: half-XP + weighted-loot roll).
     */
    friendshipReward?: FriendshipReward;
    /** The befriend gate The Open Hand reads. See {@link BefriendabilityConfig}. */
    befriendabilityConfig?: BefriendabilityConfig;
    /**
     * Optional per-foe victory final-blow chronicle
     * prose. See {@link FinalBlowLines}. Three variants; consumer
     * picks based on damage-tier shape. Undefined falls through to
     * consumer-side defaults (e.g. mobile presenter's
     * derive*Phrase helpers).
     */
    finalBlowLines?: FinalBlowLines;
    /**
     * Optional per-foe friendship-pact chronicle prose.
     * See {@link PactLines}. Three variants matching parley
     * posture. Only meaningful when the enemy also carries a
     * `friendshipReward`.
     */
    pactLines?: PactLines;
    /**
     * Optional per-foe defeat / cause-of-loss chronicle
     * prose. See {@link CauseLines}. Three variants matching the
     * KO shape.
     */
    causeLines?: CauseLines;
    /**
     * Optional per-foe codex / journal entry. Auto-fires
     * on `outcome === 'friendship'`: the engine appends the entry's
     * id to `state.codex.unlockedEntries` (de-duped) and surfaces
     * `{ id, title }` on
     * `CombatEndReport.friendshipReward.codexEntryUnlocked`. See
     * {@link CodexEntry}.
     */
    journalEntry?: CodexEntry;
    /**
     * Content-provenance metadata. `addedIn` is an ISO date / phase tag;
     * `tags` are freeform labels (e.g. `'late-game'`, `'boss'`). Both
     * optional and ignored by the combat engine.
     */
    addedIn?: string;
    tags?: string[];
    /**
     * Asset id for the enemy's combat portrait. Mobile resolves
     * it via the portrait registry; absent → fallback silhouette. Kebab-case
     * (e.g. `coastal-tyrant`).
     */
    portraitAsset?: string;
    /**
     * The foe's combat keywords. A `phases` foe's words come from its moves
     * (`enemyPhaseKeywords`); this optional slot is not read by the engine.
     * See {@link EnemyKeyword}.
     */
    keywords?: EnemyKeyword[];
    /**
     * Boss/unique STAGES: the VITAE (or
     * round) thresholds at which this foe becomes a different fight. Checked at
     * phase boundaries; each fires at most once. See {@link EnemyStage}.
     */
    stages?: EnemyStage[];
    /**
     * HP PHASES: the foe's moves, one entry per phase. Inside a phase the
     * foe plays `moves` in order, repeating; it changes phase only when its
     * VITAE crosses a line of its tier (`PHASE_LINES`, `Enemy/enemy-phases.ts`),
     * at most one change per turn boundary, and plays the entered phase's
     * `danger` move first. A foe with `phases` bypasses the enemy deck, its
     * round gates and its `stages`; a normal or elite one also skips the
     * escalation clock. See {@link EnemyPhase}.
     */
    phases?: EnemyPhase[];
}

/** The telegraph kind of an enemy move: what the board says it will do. */
export type EnemyMoveKind = 'attack' | 'defend' | 'status' | 'danger' | 'unknown';

/**
 * One move a `phases` foe plays. Numbers are authored at
 * `PHASES_AUTHORED_LEVEL` for the foe's tier and scale with its level
 * (`scaleMoveNumber`, `Combat/combat.threat.ts`).
 */
export interface EnemyMove {
    /** The move's name, e.g. `Long Look`. */
    name: string;
    /** The telegraph kind (a DANGER move is `danger`). */
    kind: EnemyMoveKind;
    /** One player-facing line of what the move does. */
    text: string;
    /** Damage per hit at the authored level. */
    damage?: number;
    /** Number of hits (default 1). */
    hits?: number;
    /** A status the move puts on the player (an effects-library id). */
    effectId?: string;
    /** Intensity of `effectId` (default 1). */
    intensity?: number;
    /** Duration override for `effectId`. */
    duration?: number;
    /** VITAE the foe heals itself (MEND), at the authored level. */
    enemyHeal?: number;
    /** Statuses the foe strips off itself (SCOUR): its LEECH, INFERNO, STORM
     *  and afflictions, in that order, the last one included. */
    enemyCleanse?: number;
    /** WARD n, at the authored level: the foe's GUARD against your DEALs,
     *  gone at the start of its next turn. */
    ward?: number;
    /** BRINE n, at the authored level: each GUARD you gain is cut by n until
     *  the end of your next turn. */
    brine?: number;
    /** VULNERABLE on you: you take `pct`% more from its next `turns` attacks.
     *  Neither number scales with level. */
    vulnerable?: { pct: number; turns: number };
    /** LEECH n on you, at the authored level: adds 3 turns and n to the
     *  potency; at the start of your turn you lose the potency and it heals that much. */
    leech?: number;
    /** TANGLE n: your next n cards cannot use their FREE line (a count, not scaled by level). */
    tangle?: number;
    /** UNDERTOW: the named die does not roll on your next turn; a pair names two. */
    undertow?: 'heart' | 'body' | 'mind' | readonly ['heart' | 'body' | 'mind', 'heart' | 'body' | 'mind'];
    /** BARNACLE n: n Barnacle Curses join your hand (a count, not scaled by level). */
    barnacle?: number;
    /** The move's one conditional effect, resolved in `Combat/combat.enemy-riders.ts`.
     *  See {@link EnemyMoveRider}. */
    rider?: EnemyMoveRider;
}

/**
 * A move's conditional effect: the part no plain field covers. One kind per
 * shape, each resolved in one place (`Combat/combat.enemy-riders.ts`). Fields
 * named `damage`, `mend` and `ward` are authored at the tier's level and scale
 * like the move's damage; counts, percentages and thresholds do not.
 *
 *   unplayed-card-bonus      +`damage` per card you leave unplayed in your hand.
 *   hand-size-damage         one hit of `damage` per card in your hand.
 *   half-dealt-last-turn     one hit of half what you dealt it last turn.
 *   below-half-vitae         under half VITAE: the hit becomes `damage` and it MENDs `mend`.
 *   if-tangled               TANGLE left at the end of your turn: the hit becomes `damage`.
 *   hits-per-discard         one hit of the move's damage per `per` cards in your discard, at least `min`.
 *   half-guard               your GUARD counts half against its hits.
 *   steal-conviction-per-hit each hit that gets through takes `amount` Conviction.
 *   guard-to-ward            if your GUARD blocks all of it, it gains your GUARD as WARD.
 *   self-vulnerable-on-block if you block all of it, it takes VULNERABLE `pct`% for `turns`.
 *   lengthen-next-status     until its next turn, the next status you put on it lasts `turns` longer.
 *   unhit-next-attack-bonus  if you do not hit it on your next turn, its next attack gains `damage`.
 *   steal-banked-die         takes your newest banked die; with none banked, TANGLE `tangle`.
 *   delayed-hit              a `damage` hit on its next turn unless you deal it `unless`+ first.
 *   double-if-status         the hit doubles if you carry any status (an affliction, LEECH or INFERNO).
 *   veil                     until its next turn, your HEAL is halved.
 *   strip-weather-hits       strips your THORNS, REFLECT and INFERNO, then one hit of `damage` per one stripped.
 *   leech-turns-damage       one hit of `damage` per turn of LEECH left on you, then the LEECH lets go.
 *   engulf-hold              the next `cards` you play are HELD inside it (out of your discard) until its DANGER or its death.
 *   mirror-dealt             one hit of what you dealt it last turn, up to `cap`.
 *   copy-last-status         the last status you put on it lands on you.
 *   spit-held                every HELD card drops into your discard, one hit of `damage` per card.
 *   toll-count               +`damage` on the hit for every Toll already rung this fight; ringing one adds to the count.
 *   many-plays-bonus         +`damage` on the hit if you played `cards`+ cards this turn.
 *   curfew                   on your next turn you can play at most `cards` cards.
 *   verse-gain               adds `verse` to the foe's VERSE count.
 *   verse-hit                one hit of `damage` per VERSE.
 *   verse-amen               spends every VERSE: one hit of `damage` per VERSE, and it MENDs the same.
 *   antiphon                 answers your last turn: you dealt it damage, WARD `ward`; else `hits`
 *                            hits of `damage` and +`verse` VERSE.
 *   toll-levy                +`damage` on the hit per TOLL owed.
 *   toll-seize               TOLL doubles, then one hit of `damage` per TOLL.
 *   curse-count-hit          one hit of `damage` per Curse in your hand, draw pile and discard.
 *   distrain                 takes a random card (not a Curse) from your hand until you pay the TOLL.
 *   tide-wash                +`damage` on the hit per TIDE; at TIDE `twiceAt`+ it hits twice; TIDE
 *                            rises `rise` a turn in the phase that carries it (default 1).
 *   tide-ward                WARD `ward` per TIDE.
 *   tide-surge               TIDE jumps to `to`, then one hit of `damage` per TIDE.
 *   tide-ebb                 TIDE drops to `to`, then the foe takes VULNERABLE `pct`% for `turns`.
 */
export type EnemyMoveRider =
    | { kind: 'unplayed-card-bonus'; damage: number }
    | { kind: 'hand-size-damage'; damage: number }
    | { kind: 'half-dealt-last-turn' }
    | { kind: 'below-half-vitae'; damage: number; mend: number }
    | { kind: 'if-tangled'; damage: number }
    | { kind: 'hits-per-discard'; per: number; min: number }
    | { kind: 'half-guard' }
    | { kind: 'steal-conviction-per-hit'; amount: number }
    | { kind: 'guard-to-ward' }
    | { kind: 'self-vulnerable-on-block'; pct: number; turns: number }
    | { kind: 'lengthen-next-status'; turns: number }
    | { kind: 'unhit-next-attack-bonus'; damage: number }
    | { kind: 'steal-banked-die'; tangle: number }
    | { kind: 'delayed-hit'; damage: number; unless: number }
    | { kind: 'double-if-status' }
    | { kind: 'veil' }
    | { kind: 'strip-weather-hits'; damage: number }
    | { kind: 'leech-turns-damage'; damage: number }
    | { kind: 'engulf-hold'; cards: number }
    | { kind: 'mirror-dealt'; cap: number }
    | { kind: 'copy-last-status' }
    | { kind: 'spit-held'; damage: number }
    | { kind: 'toll-count'; damage: number }
    | { kind: 'many-plays-bonus'; damage: number; cards: number }
    | { kind: 'curfew'; cards: number }
    // The Cave Choir (phase EN1j).
    | { kind: 'verse-gain'; verse: number }
    | { kind: 'verse-hit'; damage: number }
    | { kind: 'verse-amen'; damage: number }
    | { kind: 'antiphon'; ward: number; damage: number; hits: number; verse: number }
    // The Toll-Keeper (phase EN1l).
    | { kind: 'toll-levy'; damage: number }
    | { kind: 'toll-seize'; damage: number }
    | { kind: 'curse-count-hit'; damage: number }
    | { kind: 'distrain' }
    // The Tide-Gate (phase EN1l).
    | { kind: 'tide-wash'; damage: number; twiceAt?: number; rise?: number }
    | { kind: 'tide-ward'; ward: number }
    | { kind: 'tide-surge'; damage: number; to: number }
    | { kind: 'tide-ebb'; to: number; pct: number; turns: number };

/** A rider's kind, e.g. `half-guard`. */
export type EnemyMoveRiderKind = EnemyMoveRider['kind'];

/**
 * One HP phase of a `phases` foe. `moves` is the loop played inside the
 * phase. `danger` is the DANGER move the foe plays on entering this phase;
 * the first phase's `danger` is never played (a fight opens on the loop).
 */
export interface EnemyPhase {
    moves: EnemyMove[];
    danger?: EnemyMove;
}

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
}

/**
 * One HP phase of a `phases` foe. `moves` is the loop played inside the
 * phase. `danger` is the DANGER move the foe plays on entering this phase;
 * the first phase's `danger` is never played (a fight opens on the loop).
 */
export interface EnemyPhase {
    moves: EnemyMove[];
    danger?: EnemyMove;
}

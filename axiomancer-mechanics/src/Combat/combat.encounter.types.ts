/**
 * Hazard-pattern combat: engine types.
 *
 * The new card-and-dice combat driver, structurally identical to the Hazard
 * minigame (`src/World/Hazard/`). HP MODEL: the enemy's SOLE bar is HP and the
 * player drops it to 0. Status effects are the EFFICIENT path (DoT erodes HP;
 * control hinders the enemy's turn); a raw strike is the weak baseline — every
 * verb is a combat card (projected from a learned card).
 *
 * This is the sole combat driver. It reuses the shared effects engine and
 * card engine: the `executeCard` /
 * `applyEffect` machinery is untouched — the engine *drives* it differently.
 *
 * DoT erosion + control (one win path among several) make a fight something
 * the player *assembles a solution* for rather than *trades stats* in.
 */

import type { Character } from '../Character/types';
import type { Enemy, EnemyMoveKind, EnemyMoveRider, EnemyMoveRiderKind } from '../Enemy/types';
import type { Effect, ActiveEffect } from '../Effects/types';
import type { CardAspect, CardType } from '../Cards/types';
import type { ProgramLedger } from './combat.card-program';

// ---------------------------------------------------------------------------
// Dice — the stance-color economy
// ---------------------------------------------------------------------------

/**
 * Die face colors. Heart / Body / Mind power same-color cards; Wild powers any
 * color; X is the blocked face (cannot power a card unless a card specifically
 * enables X-die interaction). Mirrors the Hazard `HazardDieKind` (colors + hex).
 */
export type CombatDieColor = 'heart' | 'body' | 'mind' | 'wild' | 'x';

/** The three stance colors the combat MOMENTUM wheel and THE
 *  STAKE both key off (a strict subset of {@link CombatDieColor}: wild/x
 *  never participate in either mechanic). */
export type WheelStance = 'heart' | 'body' | 'mind';

/**
 * Die lifecycle. `available` → `spent` on power; `spent` → `available` again
 * via the self-reinforcing status loop or die-manipulation cards. `exhausted` / `preserved` mirror
 * the Hazard state machine for parity; `locked` is reserved for X dice that a
 * card has not yet unlocked.
 */
export type CombatDieState = 'available' | 'spent' | 'exhausted' | 'preserved' | 'locked';

/** A stance die — a tactile board object rolled at combat start. */
export interface CombatManaDie {
    id: string;           // 'die-0' … 'die-3' (and 'die-N' for temporary dice)
    color: CombatDieColor;
    state: CombatDieState;
    /** Created by card effects; expires between phases (display + cleanup). */
    temporary: boolean;
    /**
     * A GHOST die: forged by the FORGE verb, joins the tray
     * NOW, is exempt from every reroll, persists across rounds AND combats
     * (written to the character save at combat end), and is gone forever when
     * spent. Absent/false for rolled, temporary, and Reserve dice.
     */
    floating?: boolean;
    /**
     * RIPENING pips. Deterministic, no new RNG:
     * fresh-rolled dice have 0; a die BANKED to the Reserve gains +1 pip per
     * threat phase survived (max `RESERVE_PIP_CAP`). Spending a pipped die adds
     * +1 intensity per pip to the status it lands, or +2 Guard per pip on a
     * defend card. Optional for back-compat with state literals (absent = 0).
     */
    pips?: number;
    /**
     * The FACE this fixed-color die rolled this
     * round: `mana` powers a card of its color, `special` powers a card AND
     * fires its gear payload (+◆) when USED, `miss` is dead (state `locked`).
     * Absent on dice that are not rolled (GHOST/forged dice, state literals).
     */
    face?: 'special' | 'mana' | 'miss';
}

// ---------------------------------------------------------------------------
// Cards — combat card projected from a learned Card
// ---------------------------------------------------------------------------

/**
 * Verb-class taxonomy (adapted from the Hazard card classes). Drives the
 * effect-kind a card applies and its hand icon.
 */
export type CombatVerbClass =
    | 'direct-dot'        // applies DoT debuffs (Poison, Bleed) → erodes HP
    | 'direct-control'    // hinders the enemy's turn
    | 'stat-debuff'       // applies exposure debuffs (MARK / QUARTER) → soft control
    | 'buff-self'         // buffs the player / engine verbs → utility
    | 'direct-damage'     // status-payoff bursts (RUPTURE / REAP) — never raw strikes
    | 'befriend'          // Befriend card → opens the mercy choice
    | 'defend'            // Guard/defense card → shields against the enemy's next threat
    | 'retreat';          // dead — no card ever produces this verb class any more.
                           // No in-combat retreat exists; combat resolves only
                           // by winning or losing. Kept in the union rather than
                           // deleted so every exhaustive Record/switch keyed on
                           // CombatVerbClass elsewhere doesn't need a
                           // sweeping edit.

/** The effect-kind a card's bottom action applies. `none` = utility / damage only. */
export type CardEffectKind = 'dot' | 'control' | 'none';

/**
 * A combat card — an adapter VIEW over a library `Card`. Pure projection: never
 * mutated, recomputed from the card + effect libraries. `id` is the backing
 * library-card id.
 */
export interface CombatCard {
    /** Card id. For library-backed cards this is the source card id; synthetic
     *  cards use a `card-` prefix (e.g. `card-retreat`). */
    id: string;
    name: string;
    /** Colour identity (Heart / Body / Mind / Any). Derived verbatim from the
     *  card's `color` ('any' is the grey office's colourless aspect,
     *  distinct from a die's own 'wild'/'x' colours). */
    stance: CardAspect;
    verbClass: CombatVerbClass;
    /** Which effect-kind the bottom action applies (dot / control / none). */
    effectKind: CardEffectKind;
    tier: 1 | 2 | 3;
    /** Rarity band derived from the rank ladder. Drives the
     *  deck recipe, drop weights, and the mobile frame. */
    rarity?: 'common' | 'uncommon' | 'rare';
    /** Rank 1-6 (Ash → Saint); printed on the face. */
    rank?: 1 | 2 | 3 | 4 | 5 | 6;
    /** The card's type: attack / skill / spell. */
    cardType?: CardType;
    /** Human-readable description of the FREE top action. */
    topActionText: string;
    /** Human-readable description of the powered BOTTOM action. */
    bottomActionText: string;
    /** Projected impact if the bottom action lands (a damage-weighted
     *  preview). */
    bottomDamagePreview: number;
    /** The id of the primary enemy effect this card applies (for the projection
     *  preview's diminishing-returns lookup). Null for damage/buff/synthetic. */
    primaryEffectId: string | null;
}

/** A physical card instance in hand / play (uid-tracked, like Hazard). */
export interface CombatHandEntry {
    uid: string;
    cardId: string;
}

/** A single card play submitted to `resolveCombatPhase`. */
export interface CardPlay {
    /** Hand-entry uid (preferred) or card id. */
    uid?: string;
    cardId: string;
    /** Bottom (powered) action when true; free top action when false. */
    useBottom: boolean;
    /** Die spent to power the bottom action (ignored for top actions). */
    dieId?: string;
}

// ---------------------------------------------------------------------------
// Conviction + Signature Skills
// ---------------------------------------------------------------------------

/** What a signature skill does (drives the engine dispatch + the UI icon). */
export type SignatureSkillKind =
    | 'mercy'               // The Open Hand: open the mercy choice on a befriendable foe
    | 'sacrifice-heals'     // the Crimson Circlet: the next SACRIFICE heals instead of costing
    | 'sacrifice-leech'     // the Ruby Signet: the next SACRIFICE adds LEECH equal to the VITAE paid
    | 'heal-trigger-leech'  // the Bleeding Signet: HEAL 5, then trigger the foe's LEECH
    | 'clear-yours-trigger-storm' // the Elementalist's Signet: clear your INFERNO, trigger the foe's STORM
    | 'foe-inferno-to-storm'      // the Elementalist's Brooch: the foe-only INFERNO becomes STORM
    | 'blizzard-to-storm'         // the Elementalist's Belt: all BLIZZARD becomes STORM
    | 'guard-to-thorns'           // the Thornback Signet: THORNS equal to your GUARD
    | 'reflect-half'              // the Mirror Brooch: REFLECT 50%
    | 'hold-guard';               // the Carapace Belt: your GUARD is kept through the foe's next turn

export type SignatureSkillId =
    | 'sig-disarming-plea'
    | 'sig-crimson-circlet'
    | 'sig-ruby-signet'
    | 'sig-bleeding-signet'
    | 'sig-elementalist-signet'
    | 'sig-elementalist-brooch'
    | 'sig-elementalist-belt'
    | 'sig-defender-signet'
    | 'sig-defender-brooch'
    | 'sig-defender-belt';

/** Player archetype, derived from the dominant base stat. Drives (mobile) the
 *  portrait only. */
export type PlayerArchetype = 'heart' | 'body' | 'mind';

/** A signature skill — an always-available ability funded by Conviction (◆),
 *  independent of the shuffled deck. */
export interface SignatureSkill {
    id: SignatureSkillId;
    name: string;
    description: string;
    /** Conviction (◆) cost. */
    cost: number;
    kind: SignatureSkillKind;
}

// ---------------------------------------------------------------------------
// Threat phases
// ---------------------------------------------------------------------------

/** A single effect an enemy threat action applies to the player when a phase
 *  is not cleared. */
export interface CombatThreatEffect {
    /** Direct HP damage dealt to the player. */
    damage?: number;
    /** Effect id (from the effects library) applied to the player. */
    effectId?: string;
    /** Intensity override for the applied effect (default 1). */
    intensity?: number;
    /** Duration override for the applied effect. */
    duration?: number;
    /** Self-heal the enemy performs (escalation). */
    enemyHeal?: number;
    /** The enemy sheds up to this many of its OWN afflictions when the
     *  action fires (a fraction, never the last one). Written only by the threat-branch resolver. */
    enemyCleanse?: number;
    /** The enemy words a `phases` move carries (`combat.enemy-words.ts`).
     *  SCOUR: statuses the foe strips off itself, the last one included. */
    scour?: number;
    /** WARD: the foe gains this much GUARD against your DEALs. */
    ward?: number;
    /** BRINE: each GUARD you gain is cut by this much until the end of your next turn. */
    brine?: number;
    /** VULNERABLE on you: `pct`% more damage from the foe's next `turns` attacks. */
    vulnerable?: { pct: number; turns: number };
    /** LEECH on you: adds 3 turns and this much potency. */
    leech?: number;
    /** TANGLE: your next this-many cards cannot use their FREE line. */
    tangle?: number;
    /** UNDERTOW: the named die does not roll on your next turn. */
    undertow?: WheelStance | 'random';
    /** BARNACLE: this many Barnacle Curses join your hand. */
    barnacle?: number;
}

/** The enemy words with live state on the board (`combat.enemy-words.ts`). */
export type EnemyWordId =
    | 'ward' | 'mend' | 'scour' | 'brine' | 'vulnerable' | 'leech' | 'tangle' | 'undertow' | 'barnacle';

/**
 * The enemy words' fight state. Optional on the encounter: absent reads as
 * all zero. WARD and BRINE fade at the start of the foe's turn; LEECH ticks
 * at the start of yours.
 */
export interface EnemyWordsState {
    /** WARD on the foe: soaks your DEALs before its VITAE. */
    ward: number;
    /** BRINE on you: each GUARD you gain is cut by this much. */
    brine: number;
    /** LEECH on you: your turns left (0 = none). */
    leechTurns: number;
    /** LEECH on you: the VITAE you lose at the start of each of your turns. */
    leechPotency: number;
    /** TANGLE on you: cards left that cannot use their FREE line (absent = 0). */
    tangle?: number;
    /** UNDERTOW on you: the die colour that will not roll next turn (absent = none). */
    undertow?: WheelStance;
    /** Counter for the uids of the Barnacles put in your hand. */
    barnacleUid?: number;
}

export interface CombatThreatAction {
    /** Shown in the threat timeline. */
    description: string;
    /** Applied to the player if the phase is Overwhelmed (not cleared). */
    effects: CombatThreatEffect[];
    /** A `phases` move's conditional effect, its numbers scaled to the foe's
     *  level (`combat.enemy-riders.ts`). */
    rider?: EnemyMoveRider;
}

/**
 * The riders' fight state, carried between turns (`combat.enemy-riders.ts`).
 * Written only in a fight against a `phases` foe; absent reads as none.
 */
export interface EnemyRidersState {
    /** `directDamageDealt` when the foe's last turn ended: what you dealt
     *  it since is "what you dealt it last turn". */
    dealtMark?: number;
    /** Lengthen the next status you put on the foe by this many turns (until its next turn). */
    lengthenStatus?: number;
    /** Armed bonus: if you do not hit it on your turn, its next attack gains this. */
    unhitBonus?: number;
    /** Damage added to the foe's next attack's first hit. */
    nextAttackBonus?: number;
    /** A hit due on the foe's next turn unless you deal it `unless`+ first. */
    delayedHit?: { damage: number; unless: number };
    /** Until the foe's next turn your HEAL is halved. */
    veil?: boolean;
    /** Cards the foe still holds the next plays of (an `engulf-hold` armed). */
    holdArmed?: number;
    /** Card ids HELD inside the foe, out of your discard until it spits them out. */
    held?: string[];
    /** The last status you put on the foe, for a `copy-last-status` rider. */
    lastStatus?: ReflectedStatus;
    /** Tolls rung so far this fight. */
    tolls?: number;
    /** Cards you have played since the foe's last turn ended. */
    played?: number;
    /** On this turn of yours at most this many cards can be played. */
    curfew?: number;
    /** Card ids the foe has taken from your discard, until it dies (the Wreck-Picker's hoard). */
    hoard?: string[];
    /** Counter for the uids of the hoarded cards that go back to your hand. */
    hoardUid?: number;
    /** The Tithe-Collector's LEDGER: +1 for each card you scrap and each Conviction you spend. */
    ledger?: number;
    /** The INFERNO an `inferno-feed` move read when it was planned (its WARD gain). */
    infernoRead?: number;
}

/** A status a `copy-last-status` rider can throw back at you. */
export type ReflectedStatus =
    | { kind: 'effect'; effectId: string; intensity: number; turns: number }
    | { kind: 'leech'; turns: number; potency: number }
    | { kind: 'inferno'; amount: number };

/**
 * The enemy's telegraphed intent type, derived from the threat action's
 * effects. The INTENT (what the enemy will do if not cleared) is shown.
 */
export type CombatIntentType =
    | 'damage'     // only direct HP damage
    | 'debuff'     // only a debuff applied to the player
    | 'buff'       // only enemy self-heal / self-buff
    | 'block'      // a defensive / damage-reduction effect on the enemy
    | 'pass'       // no effects (damage 0, no effectId)
    | 'combo'      // multiple types at once
    // The telegraph kinds of a foe that declares `phases`: a kind, never a number.
    | 'attack'
    | 'defend'
    | 'status'
    | 'danger'
    | 'unknown';

/**
 * A threat branch's authored
 * condition. CLOSED union, authored data only, zero RNG: the fork commits from
 * observable state at phase START, so the telegraph can show both outcomes AND
 * the reason the taken one was taken.
 */
export type ThreatBranchCondition =
    | { kind: 'bearer-afflictions-gte'; n: number }   // the ENEMY carries >= n afflictions
    | { kind: 'prior-threat-fully-blocked' };         // `lastThreatFullyBlocked` ledger

/** One fully-resolved fork of a branch phase (the telegraph shows both). */
export interface CombatThreatBranchOutcome {
    threatAction: CombatThreatAction;
    intentType?: CombatIntentType;
    /** This fork carries THE COVETED DIE. Undefined =
     *  no coveted die on this fork (the common case; no boss/unique fork is
     *  authored with one — see `combat.threat-sequences.ts`). */
    stake?: boolean;
}

/**
 * The branch payload carried on a resolved `CombatThreatPhase`. While the
 * phase is upcoming (`taken` undefined) the phase's top-level face is the ELSE
 * (baseline) fork and the telegraph surfaces `conditionText` + both outcomes;
 * at phase START the engine evaluates the condition, copies the taken fork
 * onto the face, and stamps `taken`.
 */
export interface CombatThreatBranch {
    condition: ThreatBranchCondition;
    /** Human condition text, e.g. "if it carries 3+ afflictions". */
    conditionText: string;
    then: CombatThreatBranchOutcome;
    else: CombatThreatBranchOutcome;
    /** The fork committed at phase START (undefined while still upcoming). */
    taken?: 'then' | 'else';
}

export interface CombatThreatPhase {
    index: number;                            // 1-indexed for display
    threatAction: CombatThreatAction;         // the enemy's telegraphed attack each phase (HP model)
    isFinalPhase: boolean;                    // last telegraph in the sequence (then it loops)
    /** Set only on a `phases` foe's entries (`resolveEnemyPhases`): which HP
     *  phase this move belongs to (0-based), its place in that phase's loop
     *  (`step`, 0-based; 0 on a DANGER), whether it is the phase's entry
     *  DANGER, and the move's name and telegraph kind. */
    enemyMove?: { phase: number; step: number; danger: boolean; name: string; kind: EnemyMoveKind };

    // ── Intent telegraph ────────────────────────────────────────────────────
    /** Auto-derived from `threatAction.effects` (deriveIntentType); override for
     *  boss clarity. Drives the mobile intent icon + label. */
    intentType?: CombatIntentType;
    /** Optional short flavor label, e.g. "Charges up". Presenter defaults per type. */
    intentLabel?: string;
    /** "Rage mode": this phase cannot be entered until the
     *  ABOUT-TO-RESOLVE round (state.round + 1 at phase-advance time) is
     *  >= this value. While locked, `processBetweenPhases` holds the phase
     *  pointer at the last reachable phase (repeating it) instead of
     *  advancing into this one. Undefined = never locked. */
    unlockAfterRound?: number;

    /** Conditional fork: condition + BOTH outcomes, committed at phase
     *  START (`commitThreatBranch`). Undefined on every linear phase. */
    branch?: CombatThreatBranch;

    /** This phase carries THE COVETED DIE: fully
     *  blocking its telegraph converts it to a temp gold die
     *  (`resolveThreatPhase`, ceiling-gated — overflow → +1◆). Authored at
     *  the DECK level (`DECK_STAKES` in `combat.enemy-decks.ts`; the default
     *  seats it on a BOSS/UNIQUE deck's 2nd card) — never backfilled.
     *  Undefined = no coveted die this phase (the common case). */
    stake?: boolean;
}

export type CombatThreatMark = 'clear' | 'overwhelmed' | 'pending';

export interface CombatPhaseResult {
    phaseIndex: number;
    mark: 'clear' | 'overwhelmed';            // clear = enemy hindered (control); overwhelmed = it acted
    enemyActionFired: string;                 // '' when the enemy was hindered (control skip)
    penaltiesApplied: CombatThreatEffect[];
}

// ---------------------------------------------------------------------------
// HP model (the enemy's only bar). Win = enemy HP → 0; lose = player HP → 0.
// Status effects DO real things: DoT erodes enemy HP each phase; control gates
// the enemy's turn via `canAct`. There are no abstract effect kinds/bars.
// ---------------------------------------------------------------------------

/** Per-card attribution row for the post-combat summary. */
export interface CombatAttributionRow {
    cardId: string;
    name: string;
    /** ACTUAL DoT damage the enemy took from ticks of THIS card's effects, summed
     *  from emitted `dot-tick` events at summary time (a poison/bleed can sit
     *  for its whole duration and never tick). */
    dotDamage: number;
    /** Total DIRECT HP damage this card dealt the enemy now (strikes + payoff
     *  bursts), overkill-clamped to HP actually applicable. */
    damageDealt: number;
    /** Phases across which the card's effects were active. */
    phases: number;
    /** The DoT effect ids this card applied, so the summary can attribute
     *  their ACTUAL emitted ticks back to this card. Optional (absent = none). */
    effectIds?: string[];
}

export interface CombatSummary {
    outcome: CombatOutcome;
    /** e.g. 'Victory — the enemy falls'. */
    headline: string;
    rows: CombatAttributionRow[];
    totalDotDamage: number;
    directDamage: number;
    /** Card that dealt the most enemy HP damage ('' if none). */
    bestCard: string;
}

// ---------------------------------------------------------------------------
// Outcome + phase
// ---------------------------------------------------------------------------

export type CombatOutcome =
    | 'victory'    // enemy HP → 0 (DoT erosion + status payoffs)
    | 'mercy'      // spared a low-HP foe via Befriend (the friendship path)
    | 'defeat'     // player HP → 0
    | 'retreat';   // dead — no in-combat retreat exists; combat resolves only
                   // by winning or losing. Kept in the union (see
                   // CombatVerbClass's matching note) rather than deleted.

export type CombatEncounterPhase =
    | 'reveal'         // enemy + opening hand visible before dice are rolled
    | 'dice-roll'      // player rolls stance dice
    | 'phase-play'     // player plays cards
    | 'phase-resolve'  // effect kinds compared, enemy action fires, Clear/Overwhelmed
    | 'between-phases' // DoT ticks, durations tick, draw 5
    | 'mercy-choice'   // a successful Befriend opened the spare/exploit modal
    | 'complete';      // combat over, outcome determined

// ---------------------------------------------------------------------------
// Events — typed stream for UI rendering
// ---------------------------------------------------------------------------

/** An element of the Elementalist's weather, as the board shows it (`combat.elements.ts`). */
export type WeatherElement = 'foe-inferno' | 'your-inferno' | 'blizzard' | 'storm' | 'frozen';

/** A number of the Defender's spikes, as the board shows it (`combat.spikes.ts`). */
export type SpikeReading = 'thorns' | 'reflect' | 'reflect-turns';

export type CombatEvent =
    | { kind: 'dice-rolled'; dice: CombatManaDie[] }
    | { kind: 'turn-dice-rolled'; turn: number; dice: CombatManaDie[] }
    // Round-turn law: a second `startTurn` inside one
    // threat phase was refused (the state is untouched; the tray stays as-is).
    | { kind: 'turn-law-blocked'; turn: number; phaseIndex: number }
    | { kind: 'conviction-gained'; amount: number; total: number; reason: 'effect' | 'scrap' }
    | { kind: 'signature-cast'; signatureId: SignatureSkillId; name: string; cost: number }
    | { kind: 'card-played'; cardId: string; useBottom: boolean; dieId: string | null }
    | { kind: 'effect-landed'; cardId: string; effectId: string; target: 'self' | 'enemy';
        effectKind: CardEffectKind; intensity: number; effect: Effect }
    | { kind: 'effect-fizzled'; cardId: string; effectId: string; message: string }
    | { kind: 'damage-dealt'; cardId: string; target: 'self' | 'enemy'; amount: number }
    /** A SACRIFICE: `amount` VITAE paid (0 when WAIVED), `counted` the amount it counts as. */
    | { kind: 'vitae-sacrificed'; cardId: string; amount: number; counted: number }
    /** A card, Global, LEECH or delayed heal restored `amount` VITAE. */
    | { kind: 'player-healed'; cardId: string; amount: number }
    /** A Global entered play (`turnsLeft` null = rest of combat). */
    | { kind: 'global-entered'; cardId: string; paid: boolean; turnsLeft: number | null }
    | { kind: 'global-left'; cardId: string }
    /** A card left combat for good (EXILE). */
    | { kind: 'card-exiled'; cardId: string }
    | { kind: 'curse-added'; cardId: string; count: number }
    | { kind: 'die-refreshed'; dieId: string; color: CombatDieColor }
    | { kind: 'die-spent'; dieId: string; color: CombatDieColor }
    | { kind: 'dot-tick'; effectId: string; label: string; amount: number; target: 'self' | 'enemy' }
    /** The weather moved: one element's number on the board went from `from` to `to` (FROZEN as 0 or 1). */
    | { kind: 'weather-changed'; element: WeatherElement; from: number; to: number }
    /** BLIZZARD took `amount` off the foe's hits this phase. */
    | { kind: 'blizzard-softened'; amount: number }
    /** The spikes moved: THORNS, REFLECT's % or its turns left went from `from` to `to` (a rise, the drift, an expiry). */
    | { kind: 'spikes-changed'; spike: SpikeReading; from: number; to: number }
    /** A foe strike met THORNS or REFLECT: the foe took `amount` back (a DEAL, after VULNERABLE and FROZEN). */
    | { kind: 'spike-struck'; spike: 'thorns' | 'reflect'; amount: number }
    /** A RADIANCE resolved: it healed you `healed` VITAE, then DEALt that much; `amount` is the VITAE the hit
     *  took off the foe (after VULNERABLE and FROZEN). Both 0 when the heal restored nothing (full VITAE). */
    | { kind: 'radiance-struck'; cardId: string; healed: number; amount: number }
    /** MERCY landed on the foe: `healed` the VITAE it restored, `amount` added to its MERCY total, now `total`,
     *  bursting at the start of the foe's turn `turnsLeft` foe turns from now. */
    | { kind: 'mercy-added'; cardId: string; healed: number; amount: number; total: number; turnsLeft: number }
    /** The MERCY clock ticked down at the start of the foe's turn and did not run out. */
    | { kind: 'mercy-ticked'; total: number; turnsLeft: number }
    /** The foe's MERCY burst: a DEAL of twice the `total` (VULNERABLE and FROZEN apply) that took `amount` VITAE
     *  off the foe; the total then cleared. `onClock` false for a burst a card called early. */
    | { kind: 'mercy-burst'; total: number; amount: number; onClock: boolean }
    /** A PAID cost discarded these cards from your hand at random. */
    | { kind: 'cards-discarded'; cardIds: string[] }
    /** RETRIEVE returned these cards from your discard to your hand. */
    | { kind: 'cards-retrieved'; cardIds: string[] }
    /** A card came back from EXILE into your draw pile. */
    | { kind: 'card-unexiled'; cardId: string }
    // ── Card-mechanic events ─────────────────────────────────────────────────
    | { kind: 'barrier-absorbed'; amount: number }
    | { kind: 'riposte-fired'; amount: number }
    // ── Dice-layer events ────────────────────────────────────────────────────
    | { kind: 'die-banked'; dieId: string; color: CombatDieColor; pips: number }
    | { kind: 'die-ripened'; dieId: string; pips: number }
    | { kind: 'resonance-gained'; color: 'heart' | 'body' | 'mind'; total: number }
    | { kind: 'pips-cashed'; cardId: string; pips: number; bonus: 'intensity' | 'guard'; amount: number }
    // ── Ghost-die and oratory events ─────────────────────────────────────────
    | { kind: 'floating-die-spent'; dieId: string; color: CombatDieColor; poolSize: number }
    | { kind: 'soul-gained'; amount: number; total: number; reason: 'expiry' | 'consumed' | 'granted' }
    /** A foe crossed one of its STAGE thresholds and became another fight. */
    | { kind: 'stage-entered'; enemyId: string; name: string; text: string }
    /** A `phases` foe crossed a line and entered HP phase `phase` (0-based);
     *  `danger` names the DANGER move it plays next (null when the phase has none). */
    | { kind: 'enemy-phase-entered'; enemyId: string; phase: number; danger: string | null }
    /**
     * The foe's VITAE went UP. `amount` is the HP
     * ACTUALLY restored after the max-VITAE clamp — never the printed figure —
     * so the attribution ledger can reconcile "HP lost" against damage dealt.
     * Every enemy-heal site (a STAGE's `heal`, a threat's `enemyHeal`) emits
     * one.
     */
    | { kind: 'enemy-healed'; enemyId: string; source: 'STAGE' | 'THREAT'; amount: number }
    | { kind: 'dots-boosted'; intensity: number; affected: string[] }
    | { kind: 'phase-resolved'; phaseIndex: number; mark: 'clear' | 'overwhelmed' }
    | { kind: 'threat-fired'; phaseIndex: number; description: string; effects: CombatThreatEffect[] }
    // A branch phase committed its fork at phase START.
    | { kind: 'threat-branch'; phaseIndex: number; conditionText: string; taken: 'then' | 'else' }
    // The enemy's reactive cleanse shed some of its own afflictions.
    | { kind: 'threat-cleansed'; phaseIndex: number; effectIds: string[] }
    /** An enemy word moved: `gained` (WARD, BRINE, VULNERABLE, LEECH, TANGLE, UNDERTOW or BARNACLE
     *  landed, `amount` its number),
     *  `soaked` (WARD took `amount` off a DEAL), `cut` (BRINE took `amount` off a GUARD gain),
     *  `ticked` (LEECH took `amount` VITAE from you), `stripped` (SCOUR took `stripped` off the foe)
     *  `faded` (WARD, BRINE or TANGLE ran out with `amount` left), `spent` (a landed PAID play counted a card off TANGLE,
     *  or UNDERTOW kept a die off the tray) or `shed` (a BARNACLE fell off). */
    | { kind: 'enemy-word'; word: EnemyWordId;
        op: 'gained' | 'soaked' | 'cut' | 'ticked' | 'stripped' | 'faded' | 'spent' | 'shed';
        amount: number; stripped?: string[] }
    /** A move's rider fired (`combat.enemy-riders.ts`): `amount` is what it
     *  took, added or dealt (Conviction stolen, WARD copied, the delayed hit, ...). */
    | { kind: 'enemy-rider'; rider: EnemyMoveRiderKind; amount: number }
    | { kind: 'hand-drawn'; cards: string[] }
    | { kind: 'mercy-opened'; message: string }
    // ── Upgradeable-dice events ────────────────────────────────────────────
    // Momentum chain advanced (length grew) or started (length 1).
    | { kind: 'momentum-advanced'; color: WheelStance; length: number }
    // A paid card of a non-successor color broke the chain to NULL (the
    // breaking card builds nothing).
    | { kind: 'momentum-broken'; by: WheelStance }
    // The 3-color chain completed: a temporary gold die (until spent, this
    // combat) is granted and momentum resets to null.
    | { kind: 'momentum-surged'; dieId: string }
    // A BOON face fired its gear payload because its die was USED to power a
    // card (the owner-ratified use-triggered rule).
    | { kind: 'special-fired'; dieId: string; conviction: number; total: number }
    // The 7-object table ceiling refused a die grant; it converted to +1◆.
    | { kind: 'die-overflowed'; source: 'surge' | 'kindle' | 'materialize' | 'coveted'; total: number }
    // An OVERHEAT push armed a second play but cracked the die: all-miss next
    // round.
    | { kind: 'die-cracked'; dieId: string; color: CombatDieColor }
    // A boss/unique phase's coveted die was claimed: its telegraph
    // was fully blocked. `dieId` is absent when the table was full and the
    // payout converted to +1◆ instead (see the paired `die-overflowed` event).
    | { kind: 'coveted-die-stolen'; phaseIndex: number; method: 'block'; dieId?: string }
    | { kind: 'combat-ended'; outcome: CombatOutcome };

// ---------------------------------------------------------------------------
// Top-level encounter state
// ---------------------------------------------------------------------------

export interface CombatEncounterState {
    phase: CombatEncounterPhase;
    enemy: Enemy;                          // unchanged — HP, effects, stats (deep-cloned)
    player: Character;                     // unchanged — HP, effects, stats (deep-cloned)
    /** The CURRENT ROUND's tray: the four fixed dice (plus act
     *  reward dice, the gold+lead pair, and GHOST/surge floats). Rolled fresh
     *  each round; every live mana/special face may power one paid line. */
    dice: CombatManaDie[];
    /** Turn counter within the encounter (drives die ids + display). */
    turn: number;
    /** Round-turn law: true once this threat phase's ONE
     *  legal tray roll has happened (`startTurn` stamps it; the phase
     *  boundary in `resolveThreatPhase`/`processBetweenPhases` re-arms it).
     *  A second `startTurn` in the same phase is refused with a
     *  `turn-law-blocked` event. The law caps TRAY ROLLS, not card plays —
     *  Reserve and floating dice still power extra plays within the turn.
     *  Optional for back-compat with state literals (absent = false). */
    turnTakenThisPhase?: boolean;
    /** Conviction (◆) bank — funds Signature Skills. */
    conviction: number;
    /** Hazard GUARD — a transient shield (HP) granted by defense cards that
     *  absorbs the enemy's NEXT telegraphed threat, then resets each phase.
     *  Optional for back-compat with state literals (treated as 0 when absent). */
    guard?: number;
    /** BARRIER — a STACKING, persistent damage soak (distinct from the per-phase
     *  `guard`, which resets every phase). Absorbed AFTER guard in
     *  `resolveThreatPhase`; only the absorbed amount is subtracted, the rest
     *  carries across phases. Optional for back-compat with state literals
     *  (treated as 0 when absent). */
    barrier?: number;
    /** RIPOSTE — a one-shot parry armed by a Briar Riposte card: reduces the
     *  enemy's next telegraphed hit by `reduce` and counters for `damage`. Cleared
     *  each phase (like guard). Optional for back-compat with state literals. */
    riposte?: { damage: number; reduce: number };
    /**
     * The RESERVE: banked dice (max
     * `RESERVE_MAX`), each ripening +1 pip per threat phase survived. A bottom
     * action may be powered by a tray die OR a Reserve die (one die per paid
     * line). Optional for back-compat (absent = empty).
     */
    reserve?: CombatManaDie[];
    /**
     * The TOLL tally: every die spent this
     * encounter to power a paid line adds 1 of its color;
     * a Wild adds to the color of the card it powered. Cards with a `threshold`
     * check this tally at play time. Optional for back-compat (absent = zeros).
     */
    resonance?: { heart: number; body: number; mind: number };
    /** The player's archetype (dominant base stat). */
    archetype: PlayerArchetype;
    /** The player's resolved Signature Skill kit for this combat (per-archetype). */
    signatures: SignatureSkillId[];
    deck: string[];                        // full combat deck (card ids) — reshuffle source
    drawPile: string[];                    // remaining draw order
    discard: string[];                     // used / discarded card ids
    hand: CombatHandEntry[];               // current hand (up to 5)
    /** The GHOST die pool (live tray): merged into every
     *  turn's dice, exempt from rerolls, persists across combats. Optional. */
    floatingDice?: CombatManaDie[];
    /** Phase INDICES whose coveted die has already
     *  been claimed THIS COMBAT (one-time-per-phase steal, so a repeating/
     *  locked final phase can't be farmed on every loop). Initialized `[]` in
     *  `initializeCombatEncounter`. Optional for back-compat (absent = none
     *  claimed yet). */
    covetedDiceClaimed?: number[];
    /** The SOUL bank (Harvest currency). Optional. */
    souls?: number;
    /** THE PATH — extra dice added to every turn's tray (act-reward dice),
     *  seeded from `Character.bonusTurnDice`. Absent = 0. */
    bonusTurnDice?: number;
    /** THE PATH — die-upgrade level (0-2) driving the roll bag's share of live
     *  faces, seeded from `Character.dieUpgradeLevel`. Absent = 0. */
    dieUpgradeLevel?: number;
    /** STAGES already entered this combat, by index into `enemy.stages`. Each
     *  stage fires at most once; this is the ledger that guarantees it. */
    stagesEntered?: number[];
    /** Cumulative `threatBonus` contributed by every STAGE entered so far,
     *  added to each subsequent phase's damage weight. */
    stageThreatBonus?: number;
    /** Spells played this turn (resonant-chamber's gate). */
    spellsPlayedThisTurn?: number;
    /** HP the enemy's threat dealt the player this turn
     *  (post-soak budget); rolls into `enemyDamageLastRound` between phases. */
    enemyDamageThisTurn?: number;
    /** The prior round's `enemyDamageThisTurn`. The enemy hits
     *  BETWEEN player turns, so this is the value a card played this turn reads. */
    enemyDamageLastRound?: number;
    /** Scraps taken THIS turn. Scrapping a hand card pays
     *  +1 Conviction only for the first {@link SCRAP_CONVICTION_CAP_PER_TURN}
     *  scraps per turn; further scraps still cycle the card but pay nothing, so
     *  "scrap the whole hand for +6◆/turn" against a 12 cap is closed. Reset each
     *  turn in `startTurn`. Optional for back-compat (absent = 0). */
    scrapsThisTurn?: number;
    /** The REAL DoT damage the enemy has taken from
     *  event-triggered ticks so far THIS round (poison `card-played`, bleed
     *  `damage-instance`). Folded in `withLog` at every
     *  enemy `dot-tick` emission, reset each turn in `startTurn`, and consumed
     *  by `suppurating-curse` in `processBetweenPhases` (which adds the
     *  round-clock ticks on top) so the curse can double the round's true DoT
     *  total instead of the structurally-empty round-clock pool. Optional for
     *  back-compat with state literals (treated as 0 when absent). */
    enemyDotDamageThisRound?: number;
    /** The prior threat's damage was FULLY prevented (every
     *  budgeted hit soaked to 0 by riposte/guard/barrier). Persists until the
     *  next threat resolves (`prior-threat-fully-blocked` branch fuel). */
    lastThreatFullyBlocked?: boolean;
    threatPhases: CombatThreatPhase[];     // enemy's authored / generated threat sequence
    threatMarks: CombatThreatMark[];       // O / X ledger per phase (hindered / acted)
    currentPhaseIndex: number;             // 0-indexed into threatPhases
    phaseResults: CombatPhaseResult[];     // completed phase records
    round: number;                         // total rounds elapsed
    /** Per-effect attribution accumulator keyed by the card that applied it. */
    attribution: Record<string, CombatAttributionRow>;
    directDamageDealt: number;             // raw HP damage (for the summary)
    log: CombatEvent[];                    // event stream for UI rendering
    finalOutcome: CombatOutcome | null;    // null until combat ends
    /** Set when a successful Befriend opens the spare/exploit
     *  mercy choice. */
    mercyChoiceActive?: boolean;
    /**
     * Permanent wild-die pool growth. Unlike `dice` (rolled
     * fresh each round), these persist for the REST of the encounter once
     * granted by a `grant_permanent_wild_die` card special mechanic. Any
     * non-zero pool adds the gold+lead pair (`rollGoldLeadPair`,
     * cap 1 pair) to every round's tray. Never reset by `startTurn`/`endTurn`.
     * Optional for back-compat with state literals (treated as 0 when absent).
     */
    permanentWildDice?: number;
    /** See `permanentWildDice`. The grant's paired dead-die tally (reported by
     *  `permanent-wild-die-granted`); the LEADEN die of the
     *  gold+lead pair is the visible "fate pushes back" cost. */
    permanentDeadDice?: number;

    // ── Upgradeable dice — all optional for back-compat with state
    //    literals. ─────────────────────────────────────────────────────────
    /** The momentum chain: `{color, length}` of the live chain, or null.
     *  Breaks reset to NULL; persists across rounds; surge
     *  (length 3) grants the temp gold die and resets to null. */
    momentumV2?: { color: WheelStance; length: number } | null;
    /** OVERHEAT — dice cracked by an overheat push: each entry forces that
     *  color's NEXT roll to all-miss (`turn` = the turn the crack bites; under
     *  the round-turn law one turn == one round). Entries are consumed by the bitten turn's roll. */
    crackedDice?: { color: 'heart' | 'body' | 'mind' | 'wild'; turn: number }[];
    /** The die-gear loadout driving the four dice's face tables + special
     *  payloads. When absent the engine falls back to the hardcoded default
     *  gear. */
    dieGear?: Partial<Record<'heart' | 'body' | 'mind' | 'wild', UpgradeableDieGear>>;
    seed?: number;                         // seed used to drive the encounter (sim/tests)
    /** The SACRIFICE / Global / Curse ledger. Present only when the deck
     *  holds a program card (`combat.card-program.ts`). */
    program?: ProgramLedger;
    /** The enemy words' state (WARD, BRINE, LEECH on you). Absent = none. */
    enemyWords?: EnemyWordsState;
    /** The move riders' state (`combat.enemy-riders.ts`). Absent = none. */
    enemyRiders?: EnemyRidersState;
}

/**
 * One die's GEAR: the equipment piece that
 * defines everything mutable about its die. The DICE are permanent immutable
 * 6-siders; gear carries the face distribution and the special payload.
 * Caps (enforced where gear is authored/upgraded): colored dice keep
 * >= 1 miss face and <= 2 special faces; the wild (gold) die keeps <= 1
 * special face.
 */
export interface UpgradeableDieGear {
    /** Which die this piece drives (stance-named; `wild` = the gold die). */
    dieColor: 'heart' | 'body' | 'mind' | 'wild';
    /** Number of special faces on the driven die (default 1). */
    specialFaces: number;
    /** Number of mana faces on the driven die (default 2; gold default 1). */
    manaFaces: number;
    /** The special payload: Conviction granted when a special-face die is USED
     *  to power a card (default 2 — "powers this color AND grants 2◆"). */
    specialConviction: number;
}

/** Return shape of every engine transition (mirrors `CardResolution`). */
export interface CombatTransition {
    state: CombatEncounterState;
    events: CombatEvent[];
}

/** A snapshot of one live effect for HP attribution. */
export interface LandedEffect {
    effectId: string;
    effect: Effect;
    active: ActiveEffect;
    target: 'self' | 'enemy';
}

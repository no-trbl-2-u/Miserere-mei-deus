/**
 * CARD PROGRAMS — the line shape for cards that read VITAE, pay SACRIFICE,
 * handle Curses or stay in play as Globals.
 *
 * A grey card's lines are plain data (`free` rider, `specialMechanics`). A
 * card whose line reads the fight ("DEAL 3, or 6 at half VITAE or less"),
 * pays a cost or moves Curses carries a `program` instead: each line is a
 * small function written against {@link ProgramCtx}. The engine
 * (`Combat/combat.card-program.ts`) runs the same function three ways (a cost
 * probe, the sim witness's value estimate, the real resolution), so a line's
 * legality and its effect cannot drift apart.
 *
 * Printed text carries number tokens so a face prints the number the engine
 * applies at the player's stats (`programText`):
 *
 *   {deal:n}   body-scaled one-shot (DEAL)
 *   {guard:n}  mind-scaled one-shot (GUARD)
 *   {heal:n}   mind-scaled one-shot (HEAL)
 *   {vuln:n}   VULNERABLE percent, heart-scaled like the status
 *   {leech:n}  heart-scaled repeating (LEECH)
 *   {thorns:n} heart-scaled repeating (THORNS)
 *   {radiance:n} heart-scaled repeating (RADIANCE, as LEECH)
 *   {mercy:n}  heart-scaled repeating (MERCY, as LEECH)
 *
 * Every other number (SACRIFICE, Conviction, caps, "the foe loses n") is
 * unscaled and printed as written.
 */

/** What a line can read about the fight when it resolves. */
export interface ProgramQuery {
    vitae: number;
    maxVitae: number;
    /** maxVitae - vitae. */
    missing: number;
    /** VITAE at half of maximum or less. */
    atHalf: boolean;
    /** Damage the player took last turn (enemy hits and DoT, not SACRIFICE). */
    takenLastTurn: number;
    /** Every VITAE the player lost this combat (cumulative, heals ignored). */
    lostThisCombat: number;
    /** Every VITAE the player lost this round: damage and SACRIFICE (heals
     *  ignored), a SACRIFICE earlier in the same line included. */
    lostThisRound: number;
    cursesInHand: number;
    cursesInDiscard: number;
    // ── The weather (Elementalist; `Combat/combat.elements.ts`) ──
    /** The foe's INFERNO: the number it loses at the start of its turn. */
    foeInferno: number;
    /** Your INFERNO: what you lose at the start of your turn (half the
     *  both-sides INFERNO, rounded down, plus any INFERNO on you alone). */
    yourInferno: number;
    blizzard: number;
    storm: number;
    frozen: boolean;
    /** Different elements on the foe (INFERNO, BLIZZARD, STORM): 0 to 3. */
    elementsOnFoe: number;
    /** Cards in your hand (the played card excluded). */
    handSize: number;
    // ── The spikes (Defender; `Combat/combat.spikes.ts`) ──
    /** Your THORNS, an earlier verb on the same line included. */
    thorns: number;
    /** Your REFLECT, in percent. */
    reflect: number;
    /** Your GUARD right now, an earlier GUARD on the same line included. */
    guard: number;
    /** VITAE your DEALs took off the foe this turn. */
    dealtThisTurn: number;
    // ── The Merciful (`Combat/combat.mercy.ts`) ──
    /** The foe's MERCY total (0 = none), an earlier verb on the same line included. */
    foeMercy: number;
    /** The foe has MERCY (its total is above 0). */
    foeHasMercy: boolean;
    /** The foe is at its max VITAE. */
    foeAtMax: boolean;
    /** VITAE you healed this turn: HEAL and RADIANCE, the turn-start heals
     *  included, an earlier verb on the same line included. */
    healedThisTurn: number;
    /** You are below half your max VITAE (`atHalf` is "at half or less"). */
    belowHalf: boolean;
}

/** Who an INFERNO line burns: both sides (the default), the foe only, you only. */
export type InfernoSide = 'both' | 'foe' | 'self';

/** Per-turn SACRIFICE modifiers. */
export type SacrificeModifier =
    /** WAIVE: the next `count` SACRIFICES this turn cost no VITAE but still count. */
    | { kind: 'next-free'; count: number }
    /** The next SACRIFICE this turn is doubled: its cost and what it counts as. */
    | { kind: 'next-double' }
    /** The next SACRIFICE this turn counts twice: two instances, each firing
     *  the 🩸 Globals and TETHER for the full amount; the cost is paid once. */
    | { kind: 'next-twice' };

/** The verbs a program line is written in. */
export interface ProgramCtx {
    readonly q: ProgramQuery;
    /** DEAL n: damage to the foe, body-scaled, VULNERABLE applies. `exact`
     *  deals an already-resolved number (VITAE lost) unscaled. Returns the
     *  VITAE the foe actually lost (what "the damage dealt" heals).
     *  `plus` adds an unscaled amount after scaling (a line that reads the
     *  weather, "+1 per STORM"); GUARD and HEAL take it the same way. */
    deal(n: number, opts?: { exact?: boolean; plus?: number }): number;
    /** GUARD n, mind-scaled. `exact` copies an already-resolved number. Returns the GUARD gained. */
    guard(n: number, opts?: { exact?: boolean; plus?: number }): number;
    /** HEAL n, mind-scaled, capped at max VITAE. `exact` copies an already
     *  resolved number (damage dealt) unscaled. `overflowToGuard`: healing
     *  past max VITAE becomes GUARD. Returns the VITAE restored. */
    heal(n: number, opts?: { exact?: boolean; overflowToGuard?: boolean; plus?: number }): number;
    /** VULNERABLE +pct% for `turns` turns, heart-scaled. */
    vulnerable(pct: number, turns: number): void;
    /** The foe loses n VITAE: unscaled, not a DEAL (VULNERABLE does not apply). */
    foeLoses(n: number): void;
    /** TETHER n: for n turns (this one included), each SACRIFICE instance makes
     *  the foe take DEAL x, x = the VITAE that instance paid (unscaled;
     *  VULNERABLE applies). */
    tether(turns: number): void;
    /** LEECH n, a debuff on the foe with turns and potency: each application
     *  adds 3 turns and adds n (heart-scaled when applied) to the potency. */
    leech(n: number): void;
    /** Your next DEAL this turn deals +n (unscaled). Stacks; the next DEAL
     *  takes all of it; what is left expires at the end of the turn. */
    empowerNextDeal(n: number): void;
    /** Gain n Conviction (capped). */
    conviction(n: number): void;
    /** SACRIFICE n: lose n VITAE, unscaled. A cost: never below 1 VITAE. */
    sacrifice(n: number): void;
    /** SACRIFICE any amount from 1 up to `max`, chosen by the player. Returns the amount. */
    sacrificeX(max: number): number;
    /** Add `count` copies of the Curse `curseId` to your hand. */
    addCurse(curseId: string, count: number): void;
    /** Play a Curse from your hand on its PAID line with its SACRIFICE WAIVED.
     *  Returns how many were played (0 or 1). */
    playCurseFromHandWaived(): number;
    /** Return a Curse from your discard to your hand. Returns how many moved (0 or 1). */
    returnCurseFromDiscard(): number;
    /** EXILE a Curse from your hand. Returns how many (0 or 1). */
    exileCurseFromHand(): number;
    /** Set a SACRIFICE modifier for the rest of this turn. */
    sacModifier(mod: SacrificeModifier): void;
    /** This turn, damage cannot take your VITAE below 1. */
    deathWard(): void;
    /** HEAL n at the start of your next turn (scaled now). */
    healNextTurn(n: number): void;
    /** For `turns` turns (this one included), HEAL `perHit` each time your
     *  card or Global makes the foe lose VITAE. */
    drain(perHit: number, turns: number): void;

    // ── The weather verbs (Elementalist; T's rulings 2026-10-24) ──
    /** INFERNO n, unscaled; stacks by adding. */
    inferno(n: number, side?: InfernoSide): void;
    /** BLIZZARD n, unscaled; stacks by adding. */
    blizzard(n: number): void;
    /** STORM n, unscaled; stacks by adding. */
    storm(n: number): void;
    /** DRAW n: draw n cards now. */
    draw(n: number): void;
    /** Remove all your INFERNO (the foe keeps burning). Returns the amount removed. */
    removeYourInferno(): number;
    /** Move `share` of your INFERNO onto the foe (foe only). Returns the amount moved. */
    moveYourInferno(share: 'half' | 'all'): number;
    /** Spend all the foe's BLIZZARD. Returns the amount spent. */
    spendBlizzard(): number;
    /** The foe takes its STORM tick now (plain loss; the STORM does not grow). */
    triggerStorm(): void;
    /** Double the foe's BLIZZARD and STORM. */
    doubleBlizzardAndStorm(): void;
    /** Swap the numbers of two elements on the foe (the witness picks the pair). */
    swapElements(): void;
    /** A static Global's marker: while in play the STORM grows by n extra (apply: nothing; value: an estimate). */
    stormGrowthMarker(n: number): void;

    // ── The spikes (Defender; `Combat/combat.spikes.ts`, T's rulings 2026-10-26) ──
    /** THORNS n, heart-scaled (repeating) when applied; `exact` adds an
     *  already-resolved number unscaled. Stacks by adding. Returns the THORNS gained. */
    thorns(n: number, opts?: { exact?: boolean }): number;
    /** REFLECT +pct%, unscaled: adds to your REFLECT and refreshes it to 2 turns. */
    reflect(pct: number): void;
    /** "Discard n cards at random": a PAID-only cost, paid before the line's
     *  effects (write it first). Picks from the other cards in hand with the
     *  combat's seeded rng; a line holding fewer other cards than it discards
     *  is refused. Returns how many were discarded. */
    discardRandom(n: number): number;
    /** "Discard your hand": a PAID-only cost like {@link discardRandom},
     *  refused with no other card in hand. Returns how many were discarded. */
    discardHand(): number;
    /** Double your THORNS (adds your THORNS again, unscaled). */
    doubleThorns(): void;
    /** "If the foe attacks on their turn, REFLECT pct% before they DEAL
     *  damage": armed now, it lands as the foe starts to attack this round. */
    reflectOnAttack(pct: number): void;
    /** "While GUARD holds": on this round's foe turn each THORNS hit deals
     *  double while you have taken no damage that turn. */
    thornsDoubleWhileGuardHolds(): void;
    /** "You don't lose your GUARD at the end of the enemy's turn this turn." */
    holdGuard(): void;
    /** RETRIEVE n: return n random cards from your discard to your hand. */
    retrieve(n: number): void;
    /** Return a random EXILED card to your draw pile, at a random place. */
    unexileRandom(): void;
    /** Lose n VITAE: a plain self-loss GUARD does not block; it can kill you. */
    loseVitae(n: number): void;

    // ── The Merciful (`Combat/combat.mercy.ts`, T's rulings 2026-10-29 and 2026-10-30) ──
    /** RADIANCE n: HEAL n (heart-scaled, repeating, as LEECH), then DEAL what
     *  that heal restored (0 at full VITAE); the hit is a DEAL (VULNERABLE,
     *  FROZEN and a pending next-DEAL bonus apply). Returns the VITAE restored. */
    radiance(n: number): number;
    /** MERCY n on the foe, heart-scaled (`exact`: an already-resolved number):
     *  heal the foe n, stopping at its max VITAE, and add n to its MERCY total
     *  whatever the heal restored. The first MERCY starts the 3-turn clock; a
     *  later one never resets it. */
    mercy(n: number, opts?: { exact?: boolean }): void;
    /** The foe's MERCY bursts now: a DEAL of `mult` times its total (VULNERABLE
     *  and FROZEN apply), then the total clears. Nothing happens without MERCY. */
    burstMercy(mult: number): void;
    /** The foe's MERCY clock ticks down n. A tick that takes it to 0 bursts the
     *  MERCY at once (twice the total). Nothing happens without MERCY. */
    tickMercy(n: number): void;
    /** While the foe has MERCY it is YIELDING: you can befriend it whatever its
     *  VITAE. Clears when the MERCY does. Nothing happens without MERCY. */
    yieldWhileMercy(): void;
    /** Your HEALs and RADIANCEs this turn heal +n (unscaled). Stacks. */
    healsPlus(n: number): void;
    /** Your HEALs and RADIANCEs this turn heal k times as much. Stacks. */
    healsTimes(k: number): void;
    /** Your next HEAL this turn is RADIANCE instead. */
    nextHealRadiance(): void;
    /** Your HEALs this turn are RADIANCE instead, and each RADIANCE deals double. */
    allHealsRadianceDouble(): void;
    /** +n max VITAE for the rest of this combat (current VITAE is unchanged). */
    maxVitae(n: number): void;
    /** HEAL the VITAE you are missing. Returns the VITAE restored. */
    healToFull(): number;
    /** Clear `count` debuffs from yourself, oldest first (`Infinity`: every one). Returns how many. */
    clearDebuffs(count: number): number;
    /** The foe's next attack deals n less, taken off its strikes in order. Stacks. */
    weakenNextAttack(n: number): void;
    /** Return the last n MERCY cards you played this combat from your discard to
     *  your hand (an exiled card is not in it). A MERCY card is one whose line
     *  added MERCY. */
    returnMercyCards(n: number): void;
}

/** One printed line (FREE or PAID) of a card that is not a Global. */
export interface ProgramLine {
    /** The printed text, with number tokens (see the module comment). */
    text: string;
    /** Extra legality ("Only at half VITAE or less", "needs a Curse in hand").
     *  `why` is the reason the game gives when it fails. */
    requires?: { test: (q: ProgramQuery) => boolean; why: string };
    run: (c: ProgramCtx) => void;
    /** PAID only: the card leaves combat (EXILE) instead of going to discard. */
    exile?: boolean;
}

/**
 * The closed set of Global triggers: ⟳ the start of your turn, 🩸 when you
 * SACRIFICE n, 📜 when you play a Curse.
 */
export type GlobalTrigger = 'turn' | 'sac' | 'curse';

/** A Global card: one trigger, a FREE body and an optional PAID change. */
export interface ProgramGlobal {
    trigger: GlobalTrigger;
    /** The printed trigger body (FREE: in play 3 turns), with number tokens. */
    text: string;
    /** The printed PAID change (PAID: in play for the rest of combat), when the PAID line changes anything. */
    paidDelta?: string;
    /** `n` is the SACRIFICE amount for a 🩸 trigger, 0 otherwise. */
    free: (c: ProgramCtx, n: number) => void;
    paid: (c: ProgramCtx, n: number) => void;
    /** While in play, the STORM grows by this much extra each foe turn. */
    stormGrowth?: number;
}

/** A card's program: two lines, or a Global body. */
export interface CardProgram {
    free?: ProgramLine;
    paid?: ProgramLine;
    global?: ProgramGlobal;
    /** "If this card is discarded": runs when a random discard or the scrap
     *  takes it from your hand (not when it is played). A card property,
     *  printed once, whichever line would have been played. */
    onDiscard?: ProgramRider;
    /** The combat sim's greedy witness ranks this card by what its lines are
     *  worth (`programLineValue`) instead of its printed damage preview, which
     *  reads 0 for a program card: a die goes to the card whose PAID line gains
     *  most over its FREE line, and a FREE line worth less than nothing is held.
     *  A lane whose cards heal, or gain value later, opts in per card. */
    valueWitness?: boolean;
}

/** A card property that fires on an event rather than when the card is played. */
export interface ProgramRider {
    /** The printed text, with number tokens. */
    text: string;
    run: (c: ProgramCtx) => void;
}

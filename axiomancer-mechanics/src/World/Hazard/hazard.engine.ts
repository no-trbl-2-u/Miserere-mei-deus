/**
 * Hazard Minigame v2 — pure engine.
 *
 * Every function takes a `HazardSessionState` and returns a new one
 * (or the same reference when the transition is illegal). All
 * randomness flows through the session's embedded mulberry32 state,
 * so a session is fully reproducible from its seed.
 *
 * Doctrine:
 *  - Dice are cast ONCE at route selection and never re-cast between
 *    rounds. Spent dice stay spent. Only the SECOND WIND (re-cast) and
 *    convert cards manipulate the pool mid-hazard.
 *  - Safe route: one combined FORCE+ESCAPE meter per round.
 *  - Risk route: dual meters — BOTH must clear in the same round.
 *  - Momentum (REC#1): surplus progress on a cleared round carries
 *    half (capped at HAZARD_MOMENTUM_CAP) into the next round.
 *  - Reserves (REC#3): unspent non-hex dice at completion each restore
 *    1 VITAE on complete/perfect tiers.
 */

import {
    getHazardCardDef,
    getHazardDef,
    HAZARD_CRACK_CARD,
    hazardLiveDeck,
    HAZARD_DIE_FACES,
} from './hazard.content';
import { nextInt, seedRng, shuffle, type HazardRngState } from './hazard.rng';
import type { SeedInput } from '../seed';
import {
    HAZARD_DICE_COUNT,
    HAZARD_HAND_SIZE,
    HAZARD_MOMENTUM_CAP,
    type HazardCardDef,
    type HazardColor,
    type HazardConsequenceId,
    type HazardDie,
    type HazardHandEntry,
    type HazardMark,
    type HazardOutcome,
    type HazardOutcomeTier,
    type HazardResolveInfo,
    type HazardRewardId,
    type HazardRouteKey,
    type HazardSessionState,
    type HazardUtilityEffect,
} from './hazard.types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface Roll<T> {
    value: T;
    rng: HazardRngState;
    uidCounter: number;
}

function rollDie(rng: HazardRngState, uidCounter: number): Roll<HazardDie> {
    const draw = nextInt(rng, HAZARD_DIE_FACES.length);
    const id = `d${uidCounter + 1}`;
    return {
        value: { id, kind: HAZARD_DIE_FACES[draw.value], state: 'available' },
        rng: draw.state,
        uidCounter: uidCounter + 1,
    };
}

/** A fresh usable (non-hex) colour die — for powered re-cast / convert extras. */
function rollManaDie(rng: HazardRngState, uidCounter: number, kind?: HazardColor): Roll<HazardDie> {
    const colors: HazardColor[] = ['red', 'blue', 'purple', 'gold'];
    let nextRng = rng;
    let color = kind;
    if (!color) {
        const draw = nextInt(nextRng, colors.length);
        nextRng = draw.state;
        color = colors[draw.value];
    }
    const id = `d${uidCounter + 1}`;
    return {
        value: { id, kind: color, state: 'available', temporary: true },
        rng: nextRng,
        uidCounter: uidCounter + 1,
    };
}

/** Builds the weighted draw bag from a list of deck card ids. */
function refillPile(rng: HazardRngState, deckBag: readonly string[]): { pile: string[]; rng: HazardRngState } {
    const shuffled = shuffle(rng, deckBag);
    return { pile: shuffled.value, rng: shuffled.state };
}

interface DrawResult {
    drawn: HazardHandEntry[];
    drawPile: string[];
    rng: HazardRngState;
    uidCounter: number;
}

function drawFromPile(
    rng: HazardRngState,
    uidCounter: number,
    drawPile: readonly string[],
    deckBag: readonly string[],
    n: number,
): DrawResult {
    let pile = drawPile.slice();
    let r = rng;
    if (pile.length < n) {
        const refill = refillPile(r, deckBag);
        pile = pile.concat(refill.pile);
        r = refill.rng;
    }
    let uc = uidCounter;
    const drawn = pile.slice(0, n).map((cardId) => {
        uc += 1;
        return { uid: `c${uc}`, cardId, dieId: null };
    });
    return { drawn, drawPile: pile.slice(n), rng: r, uidCounter: uc };
}

/**
 * Per-card {force, escape} contribution. A card pays its numbers whether
 * or not it also carries a utility (purple hybrids always pay their low
 * dual number; gold cards pay nothing until a die is applied, since their
 * free row is 0/0). Dead CRACK cards contribute nothing.
 */
export function hazardCardValue(entry: HazardHandEntry): { force: number; escape: number } {
    const def = getHazardCardDef(entry.cardId);
    if (def.dead) return { force: 0, escape: 0 };
    const powered = entry.dieId !== null;
    const force = powered ? (def.fp ?? def.f) : def.f;
    const escape = powered ? (def.ep ?? def.e) : def.e;
    return { force, escape };
}

/** Staged progress (play area only — excludes momentum base). */
export function hazardStagedProgress(s: HazardSessionState): { force: number; escape: number } {
    return s.play.reduce(
        (acc, e) => {
            const v = hazardCardValue(e);
            return { force: acc.force + v.force, escape: acc.escape + v.escape };
        },
        { force: 0, escape: 0 },
    );
}

/** Projected round progress: momentum base + staged cards. */
export function hazardProjectedProgress(s: HazardSessionState): { force: number; escape: number } {
    const staged = hazardStagedProgress(s);
    return {
        force: s.progressBase.force + staged.force,
        escape: s.progressBase.escape + staged.escape,
    };
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

/**
 * Creates a fresh session in `route-select`: opening hand drawn (the
 * player sees their 5 cards BEFORE committing to a route), dice not
 * yet cast.
 */
export function createHazardSession(
    seed: SeedInput,
    deckBag: readonly string[],
    hazardId: string,
): HazardSessionState {
    const def = getHazardDef(hazardId);
    let rng = seedRng(seed);
    const refill = refillPile(rng, deckBag);
    rng = refill.rng;
    const draw = drawFromPile(rng, 0, refill.pile, deckBag, HAZARD_HAND_SIZE);
    return {
        hazardId,
        phase: 'route-select',
        route: null,
        round: 1,
        totalRounds: def.rounds,
        marks: Array.from({ length: def.rounds }, () => 'pending' as HazardMark),
        drawPile: draw.drawPile,
        discardPile: [],
        hand: draw.drawn,
        play: [],
        dice: [],
        progressBase: { force: 0, escape: 0 },
        momentumCap: HAZARD_MOMENTUM_CAP,
        resolveInfo: null,
        outcome: null,
        pickedRewardCardId: null,
        seed,
        rng: draw.rng,
        uidCounter: draw.uidCounter,
    };
}

/** Route choice is binding for the whole hazard; casts the dice (once). */
export function selectHazardRoute(
    s: HazardSessionState,
    route: HazardRouteKey,
    deckBag: readonly string[],
): HazardSessionState {
    void deckBag;
    if (s.phase !== 'route-select') return s;
    let rng = s.rng;
    let uc = s.uidCounter;
    const dice: HazardDie[] = [];
    for (let i = 0; i < HAZARD_DICE_COUNT; i++) {
        const roll = rollDie(rng, uc);
        rng = roll.rng;
        uc = roll.uidCounter;
        dice.push(roll.value);
    }
    return { ...s, phase: 'rolling', route, dice, rng, uidCounter: uc };
}

/** The dice-cast interstitial finished animating; begin round play. */
export function finishHazardRolling(s: HazardSessionState): HazardSessionState {
    if (s.phase !== 'rolling') return s;
    return { ...s, phase: 'playing' };
}

// ---------------------------------------------------------------------------
// Card effects (draw / re-cast / convert / gain die / reroll)
// ---------------------------------------------------------------------------

/**
 * Fires a card's utility once, in full, at the appropriate tier. The
 * effect now fires on APPLY (not on stage/power), so this draws / recasts
 * / converts / adds dice / rerolls to set faces for the WHOLE amount for the tier rather than a powered delta.
 * `major` is true when a die is attached OR the card is a gold
 * `majorEffect` card (utility-first — always major, the die buys numbers).
 */
function applyUtilityEffect(
    s: HazardSessionState,
    def: HazardCardDef,
    effect: HazardUtilityEffect,
    major: boolean,
    deckBag: readonly string[],
): HazardSessionState {
    if (effect === 'draw') {
        const base = def.drawBase ?? 1;
        const n = major ? (def.drawPowered ?? base) : base;
        if (n <= 0) return s;
        const draw = drawFromPile(s.rng, s.uidCounter, s.drawPile, deckBag, n);
        return {
            ...s,
            hand: [...s.hand, ...draw.drawn],
            drawPile: draw.drawPile,
            rng: draw.rng,
            uidCounter: draw.uidCounter,
        };
    }
    if (effect === 'recast') {
        let rng = s.rng;
        let uc = s.uidCounter;
        let dice = s.dice.map((d) => {
            if (d.state !== 'available') return d;
            const roll = rollDie(rng, uc);
            rng = roll.rng;
            uc = roll.uidCounter;
            return roll.value;
        });
        if (major) {
            const extra = rollManaDie(rng, uc);
            rng = extra.rng;
            uc = extra.uidCounter;
            dice = [...dice, extra.value];
        }
        return { ...s, dice, rng, uidCounter: uc };
    }
    if (effect === 'convert') {
        // CONVERT always mints WILD GOLD dice (so it is never strictly worse
        // than re-cast). Minor turns ONE hostile ✕; major turns them ALL, and
        // — when ≤1 was converted — conjures a floating gold die so a major
        // convert is always strictly better than a minor one.
        const hexIds = s.dice.filter((d) => d.kind === 'hex' && d.state === 'available').map((d) => d.id);
        let rng = s.rng;
        let uc = s.uidCounter;
        let dice: HazardDie[];
        let convertedCount: number;
        if (major) {
            dice = s.dice.map((d) =>
                d.kind === 'hex' ? { ...d, kind: 'gold' as const, state: 'available' as const } : d,
            );
            convertedCount = hexIds.length;
            if (convertedCount <= 1) {
                const extra = rollManaDie(rng, uc, 'gold');
                rng = extra.rng;
                uc = extra.uidCounter;
                dice = [...dice, extra.value];
            }
        } else {
            const targetId = hexIds[0];
            dice = targetId
                ? s.dice.map((d) =>
                      d.id === targetId ? { ...d, kind: 'gold' as const, state: 'available' as const } : d,
                  )
                : s.dice;
            convertedCount = targetId ? 1 : 0;
        }
        void convertedCount;
        return { ...s, dice, rng, uidCounter: uc };
    }
    if (effect === 'gainDie') {
        // No defaults: a card missing its count or colour adds nothing
        // (`validateHazardCardDef` rejects such a card).
        const n = (major ? def.gainDiePowered : def.gainDieBase) ?? 0;
        const kind = def.gainDieKind;
        if (n <= 0 || !kind) return s;
        let rng = s.rng;
        let uc = s.uidCounter;
        const added: HazardDie[] = [];
        for (let i = 0; i < n; i++) {
            const extra = rollManaDie(rng, uc, kind);
            rng = extra.rng;
            uc = extra.uidCounter;
            added.push(extra.value);
        }
        return { ...s, dice: [...s.dice, ...added], rng, uidCounter: uc };
    }
    if (effect === 'reroll') {
        // Turns the card's count of available dice (`rerollBase` minor,
        // `rerollPowered` major), in die order, each to the next of the
        // session's set faces. No die is rolled; once the faces run out the
        // rest keep their face.
        const faces = (s.rerollFaces ?? []).slice();
        let budget = (major ? def.rerollPowered : def.rerollBase) ?? 0;
        const dice = s.dice.map((d) => {
            if (d.state !== 'available' || budget <= 0) return d;
            budget -= 1;
            const face = faces.shift();
            return face === undefined ? d : { ...d, kind: face };
        });
        return { ...s, dice, rerollFaces: faces };
    }
    return s;
}

// ---------------------------------------------------------------------------
// Round play
// ---------------------------------------------------------------------------

/**
 * Moves a hand card into the play area (no cap — the player may stage
 * their whole hand). Number cards begin counting toward the meter
 * immediately; utility effects do NOT fire here — they fire on APPLY.
 */
export function stageHazardCard(
    s: HazardSessionState,
    uid: string,
    deckBag: readonly string[],
): HazardSessionState {
    void deckBag;
    if (s.phase !== 'playing') return s;
    const card = s.hand.find((h) => h.uid === uid);
    if (!card) return s;
    return {
        ...s,
        hand: s.hand.filter((h) => h.uid !== uid),
        play: [...s.play, card],
    };
}

/**
 * Returns a staged card to hand and frees its die. Refused once the card
 * has been APPLIED — applying is a one-way commit.
 */
export function unstageHazardCard(s: HazardSessionState, uid: string): HazardSessionState {
    if (s.phase !== 'playing') return s;
    const card = s.play.find((p) => p.uid === uid);
    if (!card || card.applied) return s;
    let dice = s.dice;
    if (card.dieId) {
        dice = s.dice.map((d) => (d.id === card.dieId ? { ...d, state: 'available' as const } : d));
    }
    return {
        ...s,
        play: s.play.filter((p) => p.uid !== uid),
        hand: [...s.hand, { ...card, dieId: null }],
        dice,
    };
}

/** True if `die` may power a card of colour `kind`: a matching-colour die,
 *  or the WILD gold die (which powers any colour). Hex is never usable. */
export function dieCanPower(dieKind: HazardDie['kind'], cardKind: HazardColor): boolean {
    if (dieKind === 'hex') return false;
    return dieKind === 'gold' || dieKind === cardKind;
}

/** Card-aware variant: true if `dieKind` may power `def`. */
export function dieCanPowerCard(dieKind: HazardDie['kind'], def: HazardCardDef): boolean {
    return dieCanPower(dieKind, def.kind);
}

/**
 * Drops a die onto a staged card to arm its SURGE / numbers. A
 * matching-colour die works, and the WILD gold die powers any colour
 * (gold cards themselves still need a gold die — nothing else is gold).
 * Hex dice are blocked; dead cards and already-applied cards reject
 * everything. The utility effect does NOT fire here — that waits for
 * APPLY.
 */
export function powerHazardCard(
    s: HazardSessionState,
    uid: string,
    dieId: string,
    deckBag: readonly string[],
): HazardSessionState {
    void deckBag;
    if (s.phase !== 'playing') return s;
    const card = s.play.find((p) => p.uid === uid);
    const die = s.dice.find((d) => d.id === dieId);
    if (!card || !die || card.applied) return s;
    if (die.state !== 'available') return s;
    const def = getHazardCardDef(card.cardId);
    if (def.dead) return s;
    if (!dieCanPowerCard(die.kind, def)) return s;
    let dice = s.dice.map((d) => (d.id === dieId ? { ...d, state: 'spent' as const } : d));
    if (card.dieId) {
        dice = dice.map((d) => (d.id === card.dieId ? { ...d, state: 'available' as const } : d));
    }
    return {
        ...s,
        dice,
        play: s.play.map((p) => (p.uid === uid ? { ...p, dieId } : p)),
    };
}

/**
 * APPLIES a staged card: fires its utility effect once (powered tier if a
 * die is attached, else base — gold `majorEffect` cards are always major),
 * then, on a powered card, its `poweredEffect` at the major tier, and
 * locks the card. Applied cards can no longer be unstaged, re-powered,
 * or discarded. A no-op if the card is missing or already applied.
 */
export function applyHazardCard(
    s: HazardSessionState,
    uid: string,
    deckBag: readonly string[],
): HazardSessionState {
    if (s.phase !== 'playing') return s;
    const card = s.play.find((p) => p.uid === uid);
    if (!card || card.applied) return s;
    const ns: HazardSessionState = {
        ...s,
        play: s.play.map((p) => (p.uid === uid ? { ...p, applied: true } : p)),
    };
    const def = getHazardCardDef(card.cardId);
    if (def.dead || !def.effect) return ns;
    const powered = card.dieId !== null;
    const after = applyUtilityEffect(ns, def, def.effect, powered || def.majorEffect === true, deckBag);
    if (!powered || !def.poweredEffect) return after;
    return applyUtilityEffect(after, def, def.poweredEffect, true, deckBag);
}

/**
 * Drags a HAND card to the trash bin (staged cards must be returned to
 * hand first; applied cards can never be binned). The card leaves the
 * round for its SALVAGE benefit, when it has one:
 *  - progress salvage rides `progressBase`, so it counts THIS round
 *    only (the round advance overwrites the base with momentum);
 *  - mana salvage conjures a temporary die of the card's colour.
 * Cards without salvage (CRACK) discard for nothing — thinning the
 * hand is the whole benefit.
 */
export function discardHazardCard(s: HazardSessionState, uid: string): HazardSessionState {
    if (s.phase !== 'playing') return s;
    const card = s.hand.find((h) => h.uid === uid);
    if (!card) return s;
    let ns: HazardSessionState = {
        ...s,
        hand: s.hand.filter((h) => h.uid !== uid),
        discardPile: [...s.discardPile, card.cardId],
    };
    const def = getHazardCardDef(card.cardId);
    if (def.salvage?.type === 'progress') {
        ns = {
            ...ns,
            progressBase: {
                ...ns.progressBase,
                [def.salvage.key]: ns.progressBase[def.salvage.key] + def.salvage.amount,
            },
        };
    } else if (def.salvage?.type === 'mana') {
        const extra = rollManaDie(ns.rng, ns.uidCounter, def.kind);
        ns = { ...ns, dice: [...ns.dice, extra.value], rng: extra.rng, uidCounter: extra.uidCounter };
    }
    return ns;
}

// ---------------------------------------------------------------------------
// Resolve
// ---------------------------------------------------------------------------

function momentumCarry(value: number, need: number, cleared: boolean, lastRound: boolean, cap: number): number {
    if (!cleared || lastRound) return 0;
    const surplus = Math.max(0, value - need);
    return Math.min(cap, Math.floor(surplus / 2));
}

/**
 * Commits the staged set, judges the round, enters `resolve-flash`.
 * Any staged card not yet APPLIED is applied here (firing its utility)
 * — PLAY auto-commits the whole set, so the engine never judges an
 * un-committed card. The per-card APPLY button remains for players who
 * want a utility (draw / re-cast / convert) to fire mid-round.
 */
export function resolveHazardRound(s: HazardSessionState, deckBag: readonly string[] = []): HazardSessionState {
    if (s.phase !== 'playing') return s;
    if (s.play.length === 0) return s;
    for (const p of s.play) {
        if (!p.applied) s = applyHazardCard(s, p.uid, deckBag);
    }
    const def = getHazardDef(s.hazardId);
    const p = hazardProjectedProgress(s);
    const lastRound = s.round >= s.totalRounds;
    let info: HazardResolveInfo;
    if (s.route === 'risk') {
        const [nF, nE] = def.risk.thresholds[s.round - 1];
        const cleared = p.force >= nF && p.escape >= nE;
        info = {
            cleared,
            dual: true,
            round: s.round,
            force: p.force,
            escape: p.escape,
            needF: nF,
            needE: nE,
            carryForce: momentumCarry(p.force, nF, cleared, lastRound, s.momentumCap),
            carryEscape: momentumCarry(p.escape, nE, cleared, lastRound, s.momentumCap),
        };
    } else {
        const need = def.safe.thresholds[s.round - 1];
        const combined = p.force + p.escape;
        const cleared = combined >= need;
        // Safe route carry is combined; bank it on the force meter so
        // projected math stays a plain sum.
        info = {
            cleared,
            dual: false,
            round: s.round,
            force: p.force,
            escape: p.escape,
            combined,
            need,
            carryForce: momentumCarry(combined, need, cleared, lastRound, s.momentumCap),
            carryEscape: 0,
        };
    }
    const marks = s.marks.slice();
    marks[s.round - 1] = info.cleared ? 'O' : 'X';

    return { ...s, phase: 'resolve-flash', marks, resolveInfo: info };
}

// ---------------------------------------------------------------------------
// Outcome
// ---------------------------------------------------------------------------

export function hazardTierOf(marks: readonly HazardMark[]): HazardOutcomeTier {
    const wins = marks.filter((m) => m === 'O').length;
    if (wins === marks.length) return 'perfect';
    if (wins >= 1) return 'complete';
    return 'failure';
}

/**
 * The pick-one card offer after a clear: three distinct cards from the core
 * deck (never a puzzle-only card). A perfect run's first slot is a gold rare; a one-win run offers no
 * rare.
 */
function rollRewardCards(
    rng: HazardRngState,
    tier: HazardOutcomeTier,
    wins: number,
): { cards: HazardCardDef[]; rng: HazardRngState } {
    const deck = hazardLiveDeck();
    const rares = deck.filter((c) => c.rarity === 'rare');
    const cards: HazardCardDef[] = [];
    let r = rng;
    if (tier === 'perfect') {
        const pick = nextInt(r, rares.length);
        cards.push(rares[pick.value]);
        r = pick.state;
    }
    const pool = deck.filter(
        (c) => !cards.includes(c) && (wins === 1 ? c.rarity !== 'rare' : true),
    );
    const shuffled = shuffle(r, pool);
    cards.push(...shuffled.value.slice(0, 3 - cards.length));
    return { cards, rng: shuffled.state };
}

/** Consequences by rounds lost. One loss costs only the route penalty. */
const CONSEQUENCES_BY_LOSS: Record<number, HazardConsequenceId[]> = {
    0: [],
    1: [],
    2: ['maxhp', 'deadcard'],
    3: ['minhp', 'maxhp', 'deadcard'],
};

/**
 * The spoils table. Every reward pays exactly what its chip says: the risk
 * route's premium is the larger purse (`riskShillings`), and a perfect run
 * adds a heal on either route.
 */
function rewardsFor(route: HazardRouteKey, tier: HazardOutcomeTier, wins: number): HazardRewardId[] {
    if (tier === 'failure') return [];
    if (route === 'risk') {
        if (tier === 'perfect') return ['riskShillings', 'vitae'];
        return wins >= 2 ? ['riskShillings'] : ['shillings'];
    }
    return tier === 'perfect' ? ['shillings', 'vitae'] : ['vitae'];
}

function computeOutcome(s: HazardSessionState): { outcome: HazardOutcome; rng: HazardRngState } {
    const def = getHazardDef(s.hazardId);
    const wins = s.marks.filter((m) => m === 'O').length;
    const losses = s.marks.length - wins;
    const tier = hazardTierOf(s.marks);
    const routeKey = s.route ?? 'safe';
    const rewards = rewardsFor(routeKey, tier, wins);
    const consequences = CONSEQUENCES_BY_LOSS[Math.min(losses, 3)] ?? [];
    let offerCards: HazardCardDef[] = [];
    let rng = s.rng;
    if (tier !== 'failure') {
        const rolled = rollRewardCards(rng, tier, wins);
        offerCards = rolled.cards;
        rng = rolled.rng;
    }
    const reserveBonus =
        tier === 'failure'
            ? 0
            : s.dice.filter((d) => d.kind !== 'hex' && d.state === 'available').length;
    const route = routeKey === 'risk' ? def.risk : def.safe;
    const outcome: HazardOutcome = {
        tier,
        wins,
        losses,
        rewards,
        consequences,
        offerCards,
        canSkip: tier === 'perfect',
        reserveBonus,
        penaltyVitae: route.penaltyVitae * losses,
    };
    return { outcome, rng };
}

/**
 * Dismisses the resolve flash. Final round → compute outcome and enter
 * `outcome`; otherwise advance the round: PLAYED cards discard, the
 * unplayed hand is KEPT, and the player draws back up to
 * HAZARD_HAND_SIZE (a draw-effect-inflated hand keeps everything and
 * draws nothing). Momentum applies — the dice pool is NOT re-cast.
 */
export function continueHazardAfterResolve(
    s: HazardSessionState,
    deckBag: readonly string[],
): HazardSessionState {
    if (s.phase !== 'resolve-flash' || !s.resolveInfo) return s;
    const info = s.resolveInfo;
    if (info.round >= s.totalRounds) {
        const { outcome, rng } = computeOutcome(s);
        return { ...s, phase: 'outcome', outcome, resolveInfo: null, rng };
    }
    let drawPile = s.drawPile;
    // CRACK-as-punishment: a failed round shuffles a CRACK into the middle
    // of the draw pile, where it clogs a later hand.
    if (!info.cleared) {
        const mid = Math.floor(drawPile.length / 2);
        drawPile = [...drawPile.slice(0, mid), HAZARD_CRACK_CARD.id, ...drawPile.slice(mid)];
    }
    const discardPile = [...s.discardPile, ...s.play.map((p) => p.cardId)];
    const drawCount = Math.max(0, HAZARD_HAND_SIZE - s.hand.length);
    const draw = drawFromPile(s.rng, s.uidCounter, drawPile, deckBag, drawCount);
    return {
        ...s,
        phase: 'playing',
        round: info.round + 1,
        play: [],
        hand: [...s.hand, ...draw.drawn],
        drawPile: draw.drawPile,
        discardPile,
        progressBase: { force: info.carryForce, escape: info.carryEscape },
        resolveInfo: null,
        rng: draw.rng,
        uidCounter: draw.uidCounter,
        // dice untouched — the one cast must last the hazard.
    };
}

/** Outcome modal acknowledged → rewards/consequences ledger. */
export function acknowledgeHazardOutcome(s: HazardSessionState): HazardSessionState {
    if (s.phase !== 'outcome') return s;
    return { ...s, phase: 'rewards' };
}

/**
 * Confirms the rewards modal. `cardId` is the picked reward card
 * (null = skip on perfect, or failure with no offer). Terminal phase;
 * the store applies the outcome to real game state and clears the
 * session.
 */
export function claimHazardRewards(s: HazardSessionState, cardId: string | null): HazardSessionState {
    if (s.phase !== 'rewards') return s;
    if (!s.outcome) return s;
    if (cardId !== null && !s.outcome.offerCards.find((c) => c.id === cardId)) return s;
    if (cardId === null && s.outcome.offerCards.length > 0 && !s.outcome.canSkip) return s;
    return { ...s, phase: 'done', pickedRewardCardId: cardId };
}

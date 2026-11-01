/**
 * Card → CombatCard projection adapter.
 *
 * Projects a learned `Card` into a `CombatCard` view: stance color, verb
 * class, rank/rarity, card type, and FREE/PAID action text. The projection is
 * pure — it reads the card + effect libraries and never mutates.
 *
 * There is no chip line and no auto-derived strike line: direct damage is
 * the authored `deal` mechanic, and `bottomDamagePreview` counts it. Every
 * printed number is a real engine unit.
 */

import { MAX_EFFECT_INTENSITY } from '../Game/game-mechanics.constants';
import type { Effect } from '../Effects/types';
import type { Card, CardAspect, CardCombatEffects, CardRider, CardSpecialMechanic } from '../Cards/types';
import { rankToRarity, CARD_RANK_NAMES } from '../Cards/types';
import type {
    CombatCard, CombatVerbClass, CardEffectKind,
} from './combat.encounter.types';
import { programText } from './stat-scaling';

export type EffectLookup = (effectId: string) => Effect | undefined;
export type CardLookup = (cardId: string) => Card | undefined;

/** Enemy-targeted effect payloads on a card (`appliedTo: 'opponent'`). */
function enemyEffects(card: Card): CardCombatEffects[] {
    return (card.combatEffects ?? []).filter(e => e.appliedTo === 'opponent');
}

/** True if the effect is a DoT (ticks HP damage). */
function isDot(effect: Effect): boolean {
    return effect.payload.damageOverTime !== undefined;
}

/** True if the effect hinders the bearer's turn (control). */
function isControl(effect: Effect): boolean {
    if (effect.category === 'control') return true;
    const r = effect.payload.actionRestriction;
    return !!r && (r.skipTurn === true);
}

/** True if the effect is an exposure / soft debuff (MARK / QUARTER class). */
function isStatDebuff(effect: Effect): boolean {
    if (effect.type !== 'debuff') return false;
    return (effect.payload.damageTakenMult ?? 1) > 1
        || (effect.payload.tickAmplifyFlat ?? 0) > 0
        || (effect.payload.outgoingDamageMulPct ?? 0) < 0;
}

/**
 * Impact a single enemy-targeted effect contributes when it lands (attribution
 * weighting; kept from the pre-v3 engine — DoT keeps raw perRound×intensity,
 * control gets a fixed weight).
 */
export const CONTROL_HARD_MULT = 6;   // hard control (turn denial class)
export const CONTROL_SOFT_MULT = 4;   // exposure / soft debuffs
export const DOT_PERROUND_WEIGHT = 1; // DoT keeps its raw perRound×intensity
export const IMPACT_INTENSITY_CAP = 3;

export function effectImpact(
    effect: Effect,
    intensity: number,
    duration: number,
): { track: CardEffectKind; amount: number } {
    const i = Math.min(Math.max(1, intensity), IMPACT_INTENSITY_CAP);
    if (isDot(effect)) {
        const perRound = effect.payload.damageOverTime!.damagePerRound;
        return { track: 'dot', amount: DOT_PERROUND_WEIGHT * perRound * i };
    }
    if (isControl(effect)) {
        const r = effect.payload.actionRestriction;
        const restricts = !!r && (r.skipTurn === true);
        const durationCredit = Math.min(Math.max(0, duration), 3);
        return { track: 'control', amount: i * CONTROL_HARD_MULT + (restricts ? durationCredit : 0) };
    }
    if (isStatDebuff(effect)) {
        return { track: 'control', amount: i * CONTROL_SOFT_MULT };
    }
    return { track: 'none', amount: 0 };
}

/** Stance color for a projected combat card — its philosophical aspect.
 *  'any' is the grey office's colourless aspect: every die colour
 *  powers it. */
export function cardStanceColor(card: Card): CardAspect {
    return card.color;
}

/**
 * Classifies a card into a verb class + the effect kind its PAID action
 * advances. Priority: defend > DoT > control > exposure > damage > utility.
 */
export function classifyVerbClass(
    card: Card,
    lookupEffect: EffectLookup,
): { verbClass: CombatVerbClass; track: CardEffectKind } {
    const mechs = card.specialMechanics ?? [];
    if (mechs.some(m => m.kind === 'guard')) {
        return { verbClass: 'defend', track: 'none' };
    }

    const enemy = enemyEffects(card);
    const defs = enemy.map(e => lookupEffect(e.effectId)).filter((e): e is Effect => !!e);

    if (defs.some(isDot)) return { verbClass: 'direct-dot', track: 'dot' };
    if (defs.some(isControl)) return { verbClass: 'direct-control', track: 'control' };
    if (defs.some(isStatDebuff)) return { verbClass: 'stat-debuff', track: 'control' };
    if (mechs.some(m => m.kind === 'deal')) {
        return { verbClass: 'direct-damage', track: 'none' };
    }
    return { verbClass: 'buff-self', track: 'none' };
}

/**
 * VITAE preview: what this card's PAID line takes off the foe on a
 * neutral read — direct damage PLUS the lifetime of the statuses it lands
 * (Σ floor(damagePerRound × intensity) × duration, ramp-aware).
 *
 * The sim's greedy pilot ranks candidate plays by exactly this number, so it
 * must count the whole hit: a preview that ignored direct damage would leave
 * the pilot blind to the library's primary verb.
 */
export function bottomDamagePreview(card: Card, lookupEffect: EffectLookup): number {
    let total = 0;
    for (const m of card.specialMechanics ?? []) {
        if (m.kind === 'deal') total += m.amount;
    }
    for (const ce of enemyEffects(card)) {
        const def = lookupEffect(ce.effectId);
        const dot = def?.payload.damageOverTime;
        if (!def || !dot) continue;
        const intensity = Math.min(ce.intensity ?? 1, MAX_EFFECT_INTENSITY);
        const duration = Math.max(1, ce.duration ?? def.duration);
        const ramp = def.payload.dotModifiers?.escalatesPerTurn ? (def.payload.dotModifiers.rampFactor ?? 0) : 0;
        for (let k = 0; k < duration; k++) {
            total += Math.floor((dot.damagePerRound + Math.floor(ramp * k)) * intensity);
        }
    }
    return total;
}

/**
 * WI-2 — the enemy DoT's FACE descriptor. Event-triggered DoTs (poison =
 * `card-played`, bleed = `damage-instance`, `payoff`) tick on a game event, not
 * at the round boundary, so a round-clock "N over its run" lifetime is a lie for
 * them (passive play deals zero). Returns a per-event string ("2/play", "3/hit",
 * "2/payoff") for the first event DoT, or null when the card's DoT is round-clock
 * (the lifetime total stands) or it has no enemy DoT.
 */
export function bottomDotFacePreview(card: Card, lookupEffect: EffectLookup): string | null {
    for (const ce of enemyEffects(card)) {
        const def = lookupEffect(ce.effectId);
        const dot = def?.payload.damageOverTime;
        if (!def || !dot) continue;
        const trig = dot.trigger;
        if (trig !== 'card-played' && trig !== 'damage-instance' && trig !== 'payoff') return null;
        const intensity = Math.min(ce.intensity ?? 1, MAX_EFFECT_INTENSITY);
        const perTick = Math.floor(dot.damagePerRound * intensity);
        const unit = trig === 'card-played' ? 'play' : trig === 'damage-instance' ? 'hit' : 'payoff';
        return `${perTick}/${unit}`;
    }
    return null;
}

/** The primary enemy effect id a card applies (first that contributes impact). */
export function primaryEnemyEffectId(card: Card, lookupEffect: EffectLookup): string | null {
    for (const ce of enemyEffects(card)) {
        const def = lookupEffect(ce.effectId);
        if (def && effectImpact(def, ce.intensity ?? 1, ce.duration ?? def.duration).track !== 'none') {
            return def.id;
        }
    }
    return null;
}

/**
 * Human text for a `CardRider` — every clause a real engine unit (generated
 * action text IS the applied number).
 *
 * `opts.selfTargetCard` marks riders printed on a self-target card: an effect
 * rider then names its side only when it crosses the card's printed target
 * (an unmarked clause always lands on the card's target).
 */
export function riderText(r: CardRider, opts?: { selfTargetCard?: boolean }): string {
    const parts: string[] = [];
    if (r.guard) parts.push(`Guard ${r.guard}`);
    if (r.applyEffect) {
        // `debuff_creeping_doom` is printed DOOM on every face; the raw effect
        // slug ("creeping_doom") is not a word the game ever says out loud.
        const label = r.applyEffect.effectId === 'debuff_creeping_doom'
            ? 'DOOM'
            : r.applyEffect.effectId.replace(/^(debuff|buff)_/, '');
        const i = r.applyEffect.intensity ?? 1;
        const d = r.applyEffect.duration;
        const toSelf = r.applyEffect.to === 'self';
        const side = toSelf === !!opts?.selfTargetCard ? '' : toSelf ? ' (self)' : ' (enemy)';
        parts.push(`${label} i${i}${d ? ` d${d}` : ''}${side}`);
    }
    // Damage leads the rider when it carries any, so a FREE line reads
    // "Deal 4 · POISON 3", not "POISON 3 · Deal 4".
    if (r.damage) parts.unshift(`Deal ${r.damage}`);
    return parts.join(' · ');
}

/** Human text for one special mechanic (PAID line clauses, real units). */
export function mechanicText(m: CardSpecialMechanic): string | null {
    switch (m.kind) {
        case 'guard': return `GUARD ${m.amount}`;
        case 'deal': return `DEAL ${m.amount}`;
    }
}

/** Registry DoT species — their keyword definition already says how they tick.
 *  Any OTHER DoT effect is card-local vocabulary and prints its per-turn bite
 *  inline. */
export const REGISTRY_DOT_IDS: ReadonlySet<string> = new Set(['debuff_poison', 'debuff_bleed']);

/**
 * The head of one printed status clause. A damage-taken status prints in the
 * card voice (`VULNERABLE 25% for 2 turns`, `docs/card-voice.md`), so a
 * stat-scaled copy, which has no authored `paidSummary`, still reads like the
 * library; any other status keeps the generated `name iN dM` shorthand.
 * Shared by `paidText` and `paidClauses` so the two never drift.
 */
export function paidEffectHead(def: Effect, intensity: number, duration: number, clock: string): string {
    const mult = def.payload.damageTakenMult ?? 1;
    if (mult > 1 && !clock.includes('grows')) {
        const pct = Math.round((mult - 1) * 100 * intensity);
        return `VULNERABLE ${pct}% for ${duration} turn${duration === 1 ? '' : 's'}`;
    }
    return `${def.name.toLowerCase()} i${intensity}${clock}`;
}

/** Human text for a card's PAID payload: statuses + mechanics, real units.
 *  An effect names its side only when it crosses the card's printed target.
 *  Exported for the paid-summary honesty guard (authored summaries must carry
 *  every number this generator prints). */
export function paidText(card: Card, lookupEffect: EffectLookup): string {
    const parts: string[] = [];
    for (const ce of card.combatEffects ?? []) {
        const def = lookupEffect(ce.effectId);
        if (!def) continue;
        const i = ce.intensity ?? 1;
        const d = ce.duration ?? def.duration;
        const notes: string[] = [];
        const dot = def.payload.damageOverTime;
        if (dot && !REGISTRY_DOT_IDS.has(def.id)) {
            notes.push(`DoT: ${Math.floor(dot.damagePerRound * Math.min(i, MAX_EFFECT_INTENSITY))}/turn`);
        }
        const toSelf = ce.appliedTo === 'self';
        if (toSelf !== (card.targetType === 'self')) notes.push(toSelf ? 'self' : 'enemy');
        // DOOM never counts its duration down and grows every time the foe
        // acts — printing `d3` would promise an expiry the engine will not
        // honour. Print the clock the keyword actually obeys instead.
        const grows = def.payload.dotModifiers?.growth === 'per-enemy-action'
            && def.payload.dotModifiers?.calendarExpiry === false;
        const clock = grows ? ' (grows +1 each time the foe acts)' : ` d${d}`;
        parts.push(`${paidEffectHead(def, i, d, clock)}${notes.length ? ` (${notes.join(', ')})` : ''}`);
    }
    for (const m of card.specialMechanics ?? []) {
        const t = mechanicText(m);
        if (t) parts.push(t);
    }
    const body = parts.join(', ') || 'utility';
    return card.paidExile ? `${body}. EXILE` : body;
}

/** A printed line without its closing full stop, so a sentence added after it never doubles it. */
function stripStop(line: string): string {
    return line.replace(/\.\s*$/, '');
}

function rankLabel(card: Card): string {
    return CARD_RANK_NAMES[card.rank];
}

/** Projects a library card into a `CombatCard` view. */
export function toCombatCard(cardId: string, lookupCard: CardLookup, lookupEffect: EffectLookup): CombatCard | null {
    const card = lookupCard(cardId);
    if (!card) return null;

    const { verbClass, track } = classifyVerbClass(card, lookupEffect);
    const preview = bottomDamagePreview(card, lookupEffect);

    // An authored `paidSummary` replaces the generated
    // telegraphese wholesale; the honesty guard pins its numbers and keywords
    // to the payload, so the authored sentence IS the truth surface (no auto
    // dot-suffix gets appended on top of it).
    const authored = card.paidSummary;
    const paid = authored ?? paidText(card, lookupEffect);

    // A program card prints its own lines (`programFaceText`).
    const programFace = card.program ? programFaceText(card) : null;

    // FREE line — the authored dieless rider.
    const riderOpts = { selfTargetCard: card.targetType === 'self' };
    const topActionText = programFace
        ? `FREE — ${programFace.free} (${rankLabel(card)})`
        : card.free
        ? `FREE — ${riderText(card.free, riderOpts)}. (${rankLabel(card)})`
        : `FREE — no effect. (${rankLabel(card)})`;

    // WI-2 — an event DoT (poison/bleed) prints its per-event bite ("2/play"),
    // never a round-clock lifetime; only a true round-clock DoT keeps "N over
    // its run" — and only when no per-turn species gloss already spelled it
    // out (the lifetime is per-tick × duration, both printed).
    const dotFace = bottomDotFacePreview(card, lookupEffect);
    const speciesGlossed = enemyEffects(card).some(ce => {
        const def = lookupEffect(ce.effectId);
        return !!def?.payload.damageOverTime && !REGISTRY_DOT_IDS.has(def.id);
    });
    const dotSuffix = authored ? '' : dotFace ? ` (${dotFace})` : preview > 0 && !speciesGlossed ? ` (${preview} over its run)` : '';
    const bottomActionText = programFace
        ? `PAID — ${stripStop(programFace.paid)}. Costs 1 die.`
        : authored
        ? `PAID — ${authored}. Costs 1 die.`
        : `PAID — ${paid}${dotSuffix}. Costs 1 die.`;

    return {
        id: card.id,
        name: card.name,
        stance: cardStanceColor(card),
        verbClass,
        effectKind: track,
        tier: card.tier,
        rank: card.rank,
        rarity: rankToRarity(card.rank),
        cardType: card.cardType,
        topActionText,
        bottomActionText,
        bottomDamagePreview: preview,
        primaryEffectId: primaryEnemyEffectId(card, lookupEffect),
    };
}

/** The printed opener of each Global trigger (the closed set: ⟳ turn start,
 *  🩸 SACRIFICE, 📜 Curse played). */
export const GLOBAL_TRIGGER_TEXT: Readonly<Record<'turn' | 'sac' | 'curse', string>> = Object.freeze({
    turn: '⟳ Start of your turn:',
    sac: '🩸 When you SACRIFICE X:',
    curse: '📜 When you play a Curse:',
});

/**
 * A program card's FREE and PAID lines as printed, in the card voice (no
 * line-end full stop; `docs/card-voice.md`). Number tokens print at the
 * numbers already in the card (a stat-scaled copy carries its scaled
 * numbers). A Global has one effect, so both lines print its trigger and that
 * effect, each followed by how long it stays in play. A discard rider follows
 * the PAID line as its own sentence.
 */
export function programFaceText(card: Card): { free: string; paid: string } {
    const p = card.program;
    if (!p) return { free: 'no effect.', paid: 'no effect.' };
    if (p.global) {
        const opener = GLOBAL_TRIGGER_TEXT[p.global.trigger];
        const body = programText(p.global.text, undefined);
        return {
            free: `${opener} ${body}. In play 3 turns.`,
            paid: `${opener} ${body}. In play for the rest of combat.`,
        };
    }
    return {
        free: p.free ? programText(p.free.text, undefined) : 'no effect.',
        paid: p.paid ? programText(p.paid.text, undefined) + (p.onDiscard ? `. ${programText(p.onDiscard.text, undefined)}` : '') : 'no effect.',
    };
}

/** A Global's trigger as the small face prints it: the opener without its
 *  glyph (`GLOBAL_TRIGGER_TEXT` keeps the glyphs for the large face). */
export const GLOBAL_TRIGGER_FACE: Readonly<Record<'turn' | 'sac' | 'curse', string>> = Object.freeze({
    turn: 'Start of your turn:',
    sac: 'When you SACRIFICE X:',
    curse: 'When you play a Curse:',
});

/**
 * The PAID line the small face prints whole, in the card voice. A plain card
 * prints its authored `paidSummary` (or the generated PAID text, which a
 * stat-scaled copy falls back to); a program card prints its PAID line with a
 * discard rider; a Global prints its trigger and its one effect, with no
 * duration (the large face states it). No line-end full stop. Numbers are the
 * card's own, so a stat-scaled copy prints its scaled numbers.
 *
 * @example paidFaceLine(callus, lookupEffect) // 'When you SACRIFICE X: DEAL X'
 */
export function paidFaceLine(card: Card, lookupEffect: EffectLookup): string {
    const p = card.program;
    if (p?.global) return `${GLOBAL_TRIGGER_FACE[p.global.trigger]} ${programText(p.global.text, undefined)}`;
    if (p) return stripStop(programFaceText(card).paid);
    return stripStop(card.paidSummary ?? paidText(card, lookupEffect));
}

/** Projects an entire deck (card ids) into card views, dropping unknown ids. */
export function projectDeck(
    cardIds: readonly string[],
    lookupCard: CardLookup,
    lookupEffect: EffectLookup,
): CombatCard[] {
    return cardIds
        .map(id => toCombatCard(id, lookupCard, lookupEffect))
        .filter((c): c is CombatCard => c !== null);
}

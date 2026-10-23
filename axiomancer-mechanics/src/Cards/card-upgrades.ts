/**
 * CARD UPGRADES (2026-09-02) — the Slay the Spire progression axis.
 *
 * OWNER RULING: "Players should also be able to upgrade their cards (See Slay
 * the Spire)." One of the six progression axes.
 *
 * ─── THE UPGRADE LAW (Phase UP1b) ───────────────────────────────────────────
 *
 * Rarity sets how many upgrades a card may take: common 1, uncommon 2, rare 3
 * ({@link UPGRADE_LIMITS}). Each upgrade appends one `+` to the id and the
 * name: `<id>+`, `<id>++`, `<id>+++`. An upgrade past the limit is refused
 * (`upgradeCard` returns undefined, and the id does not resolve). Each upgrade
 * applies to the previous one. A Curse takes none.
 *
 * The upgraded copy is computed, never hand-authored a second time:
 *
 *   1. If the base card carries an authored {@link CardUpgrade} patch
 *      (`Card.upgrade`), that patch IS the upgrade — the default rule is not
 *      layered underneath it.
 *   2. Otherwise the DEFAULT RULE below fires, so all ~124 library cards get a
 *      sane `+` for free and a rework of a base card carries forward into it.
 *
 * ─── THE DEFAULT RULE (exact numbers) ───────────────────────────────────────
 *
 * Every number a card prints falls into one of two buckets:
 *
 *   MAGNITUDE  n -> n + max(2, round(n * 0.40))     (+40%, at least +2)
 *     deal.amount, guard.amount, and the rider fields damage / guard.
 *     Worked: 6->8, 7->10, 8->11, 12->17, 14->20, 22->31, 45->63.
 *
 *   DOT INTENSITY  intensity -> intensity + 1, clamped to MAX_EFFECT_INTENSITY
 *     Every `combatEffects` entry and every `applyEffect` rider payload.
 *     DURATION is untouched by default (an authored patch may raise it): +1
 *     intensity is the StS-shaped step, and moving both doubles a DoT card.
 *
 * NOTHING ELSE MOVES. In particular the default rule NEVER raises a
 * SELF-INFLICTED DEBUFF (`appliedTo: 'self'` / `to: 'self'` on a `debuff_*`
 * effect): that is a cost wearing an effect's clothes. The `buff_` /
 * `debuff_` id prefix is exhaustive across both effect libraries.
 *
 * CURSES take no upgrade at all: every number on a curse is a price you pay,
 * so there is nothing a `+` could honestly raise. Slay the Spire likewise
 * makes curses unupgradable.
 *
 * PROGRAM CARDS (the Blood Price lane) carry their numbers in program lines,
 * which the rule above cannot reach. Such a card authors `Card.programAt`, its
 * lines built at an {@link UpgradeScale}; the upgrade rebuilds `program` at the
 * new level. Payoffs and their caps grow by the same two steps; costs do not
 * (`card-upgrade.scale.ts`).
 *
 * ─── paidSummary ────────────────────────────────────────────────────────────
 *
 * The repo's one surviving text law is that a printed number IS the applied
 * number (`src/Combat/e2e/paid-summary-honesty.engine.test.ts`). `paidText`
 * generates the face from `combatEffects` + `specialMechanics` only, so:
 * whenever an upgrade changes either of those payloads, `paidSummary` is
 * CLEARED and the face falls back to the generated (therefore honest) text. An
 * upgrade that only touches the FREE line keeps the authored sentence, because `paidText` never read those numbers. An authored
 * patch may supply its own `paidSummary`, and then it owns the honesty.
 *
 * This file is pure. `upgradeCard` deep-copies before it touches anything and
 * never mutates its input.
 */

import { MAX_EFFECT_INTENSITY } from '../Game/game-mechanics.constants';
import { getCardById } from './cards.library';
import { magnitudeStep, upgradeScale, UPGRADE_INTENSITY_STEP } from './card-upgrade.scale';
import { rankToRarity } from './types';
import type {
    Card,
    CardRarity,
    CardCombatEffects,
    CardRider,
    CardRiderUpgrade,
    CardSpecialMechanic,
    CardUpgrade,
    UpgradableRiderField,
} from './types';

// ─── Constants (the exact default-rule numbers, in one place) ───────────────

/** The suffix appended to an upgraded card's id and name, once per upgrade. */
export const UPGRADE_SUFFIX = '+';
export { UPGRADE_MAGNITUDE_PCT, UPGRADE_MAGNITUDE_MIN, UPGRADE_INTENSITY_STEP } from './card-upgrade.scale';

/** How many upgrades a card of each rarity may take (T, 2026-10-20). */
export const UPGRADE_LIMITS: Readonly<Record<CardRarity, number>> = Object.freeze({
    common: 1, uncommon: 2, rare: 3,
});

// ─── The buckets ────────────────────────────────────────────────────────────

/** +40%, at least +2. Damage and walls — anything on the scale ladder. */
const magnitude = magnitudeStep;

/** +1 intensity, never above MAX_EFFECT_INTENSITY (30). */
function intensity(n: number): number {
    return Math.min(MAX_EFFECT_INTENSITY, n + UPGRADE_INTENSITY_STEP);
}

/** Clamp an intensity from ANY source (default rule or authored patch). */
function capIntensity(n: number): number {
    return Math.min(MAX_EFFECT_INTENSITY, n);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Structural deep copy. Cards are JSON-shaped data (no functions, no dates),
 *  but this walks the structure rather than round-tripping so `undefined`
 *  members and key order survive exactly. */
function deepCopy<T>(value: T): T {
    if (Array.isArray(value)) return value.map(deepCopy) as unknown as T;
    if (value !== null && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            out[k] = deepCopy(v);
        }
        return out as T;
    }
    return value;
}

/** A self-inflicted `debuff_*` is a printed COST, not a payload to raise.
 *  The `buff_` / `debuff_` id prefix is exhaustive across both effect
 *  libraries (`src/Effects/{buffs,debuffs}.library.json`). */
function isSelfCost(effectId: string, toSelf: boolean): boolean {
    return toSelf && effectId.startsWith('debuff_');
}

/** `<id>+++` -> `<id>`: strips every `+`. Idempotent for a base id. Callers
 *  that key engine behaviour off a literal card id (oath/hex passives,
 *  WOUND_CARD_ID, deck recipes) must resolve through this. */
export function baseCardId(id: string): string {
    return id.replace(/\++$/, '');
}

/** How many upgrades an id carries: 0 for a base id, 3 for `<id>+++`. */
export function upgradeLevel(id: string): number {
    return id.length - baseCardId(id).length;
}

/** How many upgrades this card may take in all: its rarity's limit, 0 for a Curse. */
export function upgradeLimit(card: Card): number {
    if (card.cardType === 'curse') return 0;
    return UPGRADE_LIMITS[rankToRarity(card.rank)];
}

/** True while the card (base or upgraded) has an upgrade left under its limit. */
export function canUpgrade(card: Card): boolean {
    return upgradeLevel(card.id) < upgradeLimit(card);
}

/** True for an upgraded card's id (`'some-card+'`). */
export function isUpgradedCardId(id: string): boolean {
    return id.endsWith(UPGRADE_SUFFIX);
}

// ─── The default rule: riders ───────────────────────────────────────────────

const RIDER_MAGNITUDE_FIELDS = ['damage', 'guard'] as const;

/** Raise every payoff field of a rider IN PLACE (the rider is already a copy). */
function upgradeRiderDefault(rider: CardRider): void {
    for (const f of RIDER_MAGNITUDE_FIELDS) {
        if (rider[f] !== undefined) rider[f] = magnitude(rider[f] as number);
    }
    const ae = rider.applyEffect;
    if (ae && !isSelfCost(ae.effectId, ae.to === 'self')) {
        ae.intensity = intensity(ae.intensity ?? 1);
    }
}

// ─── The default rule: mechanics ────────────────────────────────────────────

/** Raise one mechanic IN PLACE. */
function upgradeMechanicDefault(m: CardSpecialMechanic): void {
    m.amount = magnitude(m.amount);
}

/** Raise one `combatEffects` entry IN PLACE. */
function upgradeCombatEffectDefault(ce: CardCombatEffects): void {
    if (isSelfCost(ce.effectId, ce.appliedTo === 'self')) return;
    ce.intensity = intensity(ce.intensity ?? 1);
}

// ─── The authored patch ─────────────────────────────────────────────────────

/** Deltas are non-negative by construction: a `+` never subtracts. */
function delta(n: number | undefined): number {
    return n === undefined ? 0 : Math.max(0, n);
}

function applyRiderPatch(rider: CardRider, patch: CardRiderUpgrade): void {
    for (const key of Object.keys(patch) as (keyof CardRiderUpgrade)[]) {
        if (key === 'applyEffect') continue;
        const d = delta(patch[key] as number | undefined);
        if (d === 0) continue;
        const f = key as UpgradableRiderField;
        rider[f] = (rider[f] ?? 0) + d;
    }
    if (patch.applyEffect && rider.applyEffect) {
        const ae = rider.applyEffect;
        const di = delta(patch.applyEffect.intensity);
        const dd = delta(patch.applyEffect.duration);
        if (di) ae.intensity = capIntensity((ae.intensity ?? 1) + di);
        if (dd && ae.duration !== undefined) ae.duration = ae.duration + dd;
    }
}

function applyMechanicFieldPatch(
    m: CardSpecialMechanic,
    fields: Partial<Record<string, number>>,
): void {
    // A mechanic is a closed union of numeric-and-boolean data; the patch
    // addresses its fields by name, so this one bridge cast is the honest
    // shape. Only fields the mechanic ACTUALLY has are touched.
    const bag = m as unknown as Record<string, unknown>;
    for (const [key, raw] of Object.entries(fields)) {
        const d = delta(raw);
        if (d === 0) continue;
        const current = bag[key];
        if (typeof current !== 'number') continue;
        bag[key] = key === 'intensity' ? capIntensity(current + d) : current + d;
    }
}

function applyPatch(card: Card, patch: CardUpgrade): void {
    for (const mp of patch.mechanics ?? []) {
        let seen = 0;
        for (const m of card.specialMechanics ?? []) {
            if (m.kind !== mp.kind) continue;
            const here = seen++;
            if (mp.index !== undefined && mp.index !== here) continue;
            if (mp.fields) applyMechanicFieldPatch(m, mp.fields);
        }
    }
    for (const ep of patch.effects ?? []) {
        for (const ce of card.combatEffects ?? []) {
            if (ep.effectId !== undefined && ce.effectId !== ep.effectId) continue;
            const di = delta(ep.intensity);
            const dd = delta(ep.duration);
            if (di) ce.intensity = capIntensity((ce.intensity ?? 1) + di);
            if (dd && ce.duration !== undefined) ce.duration = ce.duration + dd;
            else if (dd) ce.duration = dd;
        }
    }
    if (patch.free) {
        card.free = card.free ?? {};
        applyRiderPatch(card.free, patch.free);
    }
}

// ─── The default rule, whole-card ───────────────────────────────────────────

function applyDefaultRule(card: Card): void {
    for (const ce of card.combatEffects ?? []) upgradeCombatEffectDefault(ce);
    for (const m of card.specialMechanics ?? []) upgradeMechanicDefault(m);
    if (card.free) upgradeRiderDefault(card.free);
}

// ─── The public verb ────────────────────────────────────────────────────────

/** The payload `paidText` reads. If this changed, the authored face is stale. */
function paidPayloadSignature(card: Card): string {
    return JSON.stringify([card.combatEffects ?? null, card.specialMechanics ?? null]);
}

/**
 * The next upgrade of a card: one more `+` on the id and the name, numbers
 * raised by the card's authored {@link CardUpgrade} patch on the first upgrade
 * if it has one, otherwise by the default rule documented at the top of this
 * file; a program card rebuilds its lines at the new level (`programAt`).
 * Returns undefined when the card is at its limit (the upgrade is refused).
 *
 * PURE: the input card (and every object reachable from it) is untouched — the
 * whole card is deep-copied first.
 */
export function upgradeCard(card: Card): Card | undefined {
    if (!canUpgrade(card)) return undefined;
    const level = upgradeLevel(card.id) + 1;
    const up = deepCopy(card);
    const beforePaid = paidPayloadSignature(up);
    // The patch is the FIRST upgrade only; the copy drops it below.
    const patch = card.upgrade;

    if (patch) applyPatch(up, patch);
    else applyDefaultRule(up);
    if (card.programAt) up.program = card.programAt(upgradeScale(level));

    up.id = `${card.id}${UPGRADE_SUFFIX}`;
    up.name = patch?.name ?? `${card.name}${UPGRADE_SUFFIX}`;
    if (patch?.description) up.description = patch.description;

    // P0-truth: an authored face that no longer names the applied numbers is a
    // lie. Clear it and let the generated text speak.
    const paidChanged = paidPayloadSignature(up) !== beforePaid;
    if (patch?.paidSummary) up.paidSummary = patch.paidSummary;
    else if (paidChanged && up.paidSummary !== undefined) delete up.paidSummary;

    // The upgraded copy carries no patch of its own: later upgrades use the
    // default rule on top of it.
    delete up.upgrade;
    return up;
}

/** Upgraded copies by base card object, then level, so a hot lookup in a
 *  fight does not rebuild the copy. Keyed by object: a sandbox card that
 *  shadows a library id gets its own entries. */
const upgradedCache = new WeakMap<Card, Map<number, Card | undefined>>();

/** `base` upgraded `level` times, or undefined past its limit. */
function upgradedAt(base: Card, level: number): Card | undefined {
    let byLevel = upgradedCache.get(base);
    if (!byLevel) upgradedCache.set(base, byLevel = new Map());
    if (byLevel.has(level)) return byLevel.get(level);
    let card: Card | undefined = base;
    for (let k = 0; k < level && card; k++) card = upgradeCard(card);
    byLevel.set(level, card);
    return card;
}

/**
 * Resolve an upgraded card id (`'some-card+'`, `'some-card++'`) to its
 * computed upgraded card. Accepts the base id too, as one upgrade, so a caller
 * that already stripped the suffix still gets the `+` copy. Returns
 * `undefined` when the base card does not exist or the id is past its limit.
 */
export function getUpgradedCardById(id: string): Card | undefined {
    const base = getCardById(baseCardId(id));
    return base ? upgradedAt(base, Math.max(1, upgradeLevel(id))) : undefined;
}

// ─── Picking a card to upgrade (Phase UP1d) ─────────────────────────────────

/**
 * The id one upgrade turns `id` into (`'some-card'` -> `'some-card+'`), or
 * undefined when the card is unknown or already at its rarity's limit. A
 * picker uses it to refuse a card before it offers it.
 */
export function nextUpgradeId(id: string): string | undefined {
    const card = getCardById(id);
    return card && canUpgrade(card) ? `${id}${UPGRADE_SUFFIX}` : undefined;
}

/**
 * The distinct ids in `ids` that can still take an upgrade, in first-seen
 * order. An unknown id, a Curse and a card at its limit drop out, so an
 * upgrade screen built on this lists only what one more upgrade can reach.
 */
export function upgradableCardIds(ids: readonly string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of ids) {
        if (seen.has(id)) continue;
        seen.add(id);
        if (nextUpgradeId(id) !== undefined) out.push(id);
    }
    return out;
}

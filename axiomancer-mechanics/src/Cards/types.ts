import type { CardProgram } from './card-program.types';
import type { UpgradeScale } from './card-upgrade.scale';

/**
 * Cards System Types
 * Cards run on the resonance economy (heart / body / mind).
 */

/**
 * A stat colour (body / mind / heart). A card's `color` is one of these or
 * 'any' (see `CardAspect`); the Color Law reads it.
 * - 'body': Physical/strength-based cards
 * - 'mind': Mental/intelligence-based cards
 * - 'heart': Emotional/charisma-based cards
 */
export type StatType = 'body' | 'mind' | 'heart';

/**
 * A CARD's colour identity. `StatType` plus `'any'`: the grey
 * office's colourless aspect, powered by every die colour (body/mind/heart,
 * AND wild). `StatType`
 * itself stays three stats — only a card's aspect widens.
 */
export type CardAspect = StatType | 'any';

/**
 * Tier of a card — mirrors the effect tier system. Drives the resist tier
 * used when a card applies a `combatEffects` payload through the effect-application
 * machinery (Tier 1 auto-applies, Tier 2 resisted, Tier 3 only nat-20 repels).
 */
export type CardTier = 1 | 2 | 3;

/**
 * The rank ladder (quality axis, distinct from `tier`):
 * 1 Ash · 2 Tooth · 3 Splinter · 4 Rib · 5 Skull · 6 Saint.
 */
export type CardRank = 1 | 2 | 3 | 4 | 5 | 6;

/** Display names for the rank ladder (printed on card faces). */
export const CARD_RANK_NAMES: Readonly<Record<CardRank, string>> = Object.freeze({
    1: 'Ash', 2: 'Tooth', 3: 'Splinter', 4: 'Rib', 5: 'Skull', 6: 'Saint',
});

/** Rarity band, derived from rank. Drives the deck recipe
 *  and reward drop weights. */
export type CardRarity = 'common' | 'uncommon' | 'rare';

/** Maps a rank to its rarity band: common = Ash/Tooth, uncommon =
 *  Splinter/Rib, rare = Skull/Saint. */
export function rankToRarity(rank: CardRank): CardRarity {
    return rank <= 2 ? 'common' : rank <= 4 ? 'uncommon' : 'rare';
}

/**
 * A card's type is a lifecycle rule. Attack, Skill and Spell play FREE or
 * PAID, then discard. A Global stays in play and affects the combat: FREE
 * for 3 turns, PAID for the rest of combat, one copy of each in play. A
 * Curse is a dead card that holds a hand slot until played; it cannot be
 * scrapped.
 */
export type CardType = 'attack' | 'skill' | 'spell' | 'global' | 'curse';

/**
 * Targeting scope for a card effect.
 * - `'self'`  — the caster.
 * - `'enemy'` — the current opponent.
 */
export type CardTarget = 'self' | 'enemy';

/**
 * Combat effect payload applied by a card. Routes through
 * `resolveEffectApplication` so resist / repel / crit follow the
 * same rules as proc-applied effects.
 *
 * @property effectId    - ID of the effect in the global effects library.
 * @property appliedTo   - 'self' or 'opponent' (relative to the caster).
 * @property description - Display text for the CLI / UI.
 * @property intensity   - Optional initial intensity override (default 1).
 *                         Used by cards like Liar's Echo that stack a Tier 1
 *                         mark with extra intensity on first application.
 * @property duration    - Optional remaining-duration override (defaults to
 *                         the effect's library duration). Switches the apply
 *                         path into `additive` duration mode so the override
 *                         survives stacking.
 */
export interface CardCombatEffects {
    effectId: string;
    appliedTo: 'self' | 'opponent';
    description?: string;
    intensity?: number;
    duration?: number;
}

/**
 * A card's PAID-line mechanics — the verbs the combat engine resolves itself
 * rather than through a `combatEffects` payload. Kept as a discriminated
 * union so the resolver / UI can branch on `kind` without runtime tag
 * parsing. Only verbs a live card prints exist here: the grey office
 * prints DEAL and GUARD.
 */
export type CardSpecialMechanic =
    /** GUARD — a shield that absorbs the enemy's next telegraphed threat.
     *  `amount` is the base Guard before stat scaling. */
    | { kind: 'guard'; amount: number }
    /** DEAL — direct VITAE damage. `amount` is the magnitude before stat
     *  and VULNERABLE scaling. */
    | { kind: 'deal'; amount: number };

/**
 * Every `CardSpecialMechanic` kind, at RUNTIME.
 *
 * The union above is erased at compile time, so every consumer that needed to
 * enumerate the kinds kept its own copy — and they drifted. This array IS the
 * enumeration, and the two assertions below bind it to the union in BOTH
 * directions:
 *   - add a kind to the union without listing it here  -> compile error
 *   - list a kind here that the union does not have    -> compile error
 */
export const CARD_SPECIAL_MECHANIC_KINDS = [
    'guard',
    'deal',
] as const;

/** A kind in the union that this array forgot. Resolves to `never` when clean. */
type MissingFromKindList = Exclude<
    CardSpecialMechanic['kind'],
    (typeof CARD_SPECIAL_MECHANIC_KINDS)[number]
>;
/** A kind in this array that the union does not have. `never` when clean. */
type NotAKind = Exclude<
    (typeof CARD_SPECIAL_MECHANIC_KINDS)[number],
    CardSpecialMechanic['kind']
>;
/**
 * Both sides must resolve to `never`. `AssertNever` constrains its parameter to
 * `never`, so a leftover kind fails the constraint and names itself in the
 * error — unlike an empty-array annotation, which type-checks against ANY
 * element type and would assert nothing at all.
 */
type AssertNever<T extends never> = T;
type _KindListCoversUnion = AssertNever<MissingFromKindList>;
type _KindListHasNoStrays = AssertNever<NotAKind>;

/**
 * A card's FREE (dieless) line: a bundle of real-unit verbs. Every field is an
 * exact engine unit so generated action text is the applied number (P0-truth
 * law). All fields optional; absent = 0. Only verbs a live card prints exist
 * here.
 */
export interface CardRider {
    /** Deal N direct VITAE damage. */
    damage?: number;
    /** +N Guard. */
    guard?: number;
    /** Apply an effect from the library (e.g. a FREE VULNERABLE). `to`
     *  defaults to 'opponent'. */
    applyEffect?: { effectId: string; intensity?: number; duration?: number; to?: 'self' | 'opponent' };
}

// ── CARD UPGRADES — the Slay the Spire axis ─────────────────────────────────
// One of the six progression axes: a card you own can be upgraded as many
// times as its rarity allows (common 1, uncommon 2, rare 3), into `<id>+`,
// `<id>++`, `<id>+++` (Phase UP1b). The upgraded copy is a PATCH of the original, never a
// second hand-authored card, so a rework of the base card carries forward.
// Runtime lives in `src/Cards/card-upgrades.ts` (`upgradeCard`), which applies
// an authored {@link Card.upgrade} patch if present and otherwise falls back
// to the documented DEFAULT rule. Every field below is a NON-NEGATIVE ADDITIVE
// DELTA (a `+` never subtracts): the applier clamps negatives to 0.

/**
 * The numeric {@link CardRider} fields an upgrade may raise.
 */
export type UpgradableRiderField = 'damage' | 'guard';

/**
 * An additive patch over a {@link CardRider} — the FREE line.
 */
export interface CardRiderUpgrade extends Partial<Record<UpgradableRiderField, number>> {
    /** Deltas on the rider's `applyEffect` payload. `intensity` is clamped to
     *  `MAX_EFFECT_INTENSITY` by the applier. */
    applyEffect?: { intensity?: number; duration?: number };
}

/** The numeric {@link CardSpecialMechanic} fields an upgrade may raise. */
export type UpgradableMechanicField = 'amount';

/** An additive patch over ONE entry of `Card.specialMechanics`. */
export interface CardMechanicUpgrade {
    /** Which mechanic to patch, by its `kind`. */
    kind: CardSpecialMechanic['kind'];
    /** Which occurrence of that kind (0-based). Omit to patch every one. */
    index?: number;
    /** Additive deltas on the mechanic's own numeric fields. */
    fields?: Partial<Record<UpgradableMechanicField, number>>;
}

/** An additive patch over the matching entries of `Card.combatEffects`. */
export interface CardEffectUpgrade {
    /** Only patch entries with this `effectId`. Omit to patch every entry. */
    effectId?: string;
    /** +N intensity (clamped to `MAX_EFFECT_INTENSITY`). */
    intensity?: number;
    /** +N turns of duration. */
    duration?: number;
}

/**
 * The authored upgrade PATCH for a card: the fields an upgraded copy
 * overrides. Present on a card, it wins over the default rule ENTIRELY (the
 * default is not layered underneath — an author who writes a patch owns the
 * whole upgrade). Data only; see `src/Cards/card-upgrades.ts`.
 */
export interface CardUpgrade {
    /** Display name of the upgraded copy. Default: `${name}+`. */
    name?: string;
    /** Replacement fiction. Default: the base card's `description`. */
    description?: string;
    /**
     * Replacement PAID sentence. Omit it and `upgradeCard` CLEARS
     * `paidSummary` whenever the patch changed a printed number, so the face
     * falls back to generated text rather than printing a stale one (the
     * P0-truth law — `src/Combat/e2e/paid-summary-honesty.engine.test.ts`).
     */
    paidSummary?: string;
    /** Deltas on `specialMechanics`. */
    mechanics?: CardMechanicUpgrade[];
    /** Deltas on `combatEffects`. */
    effects?: CardEffectUpgrade[];
    /** Deltas on the FREE line. Applies even when the base card has no
     *  `free` rider (the deltas become the rider). */
    free?: CardRiderUpgrade;
}

/**
 * Card entity — an ability that can be learned/unlocked and used in combat.
 *
 * @property id              - Unique identifier for this card.
 * @property name            - Display name.
 * @property description     - Flavor text or lore.
 * @property color           - The card's colour (heart/body/mind),
 *                              or 'any' for the grey office's colourless cards.
 * @property tier            - 1 / 2 / 3, mirrors the effect tier system.
 * @property targetType      - 'self' or 'enemy'.
 * @property combatEffects   - Optional list of effect payloads to apply.
 * @property specialMechanics - Optional bespoke behaviours. Resolved after
 *                              `combatEffects`. Direct damage is the `deal`
 *                              mechanic.
 */
export interface Card {
    id: string;
    name: string;
    color: CardAspect;
    description: string;
    tier: CardTier;
    targetType: CardTarget;
    /**
     * The RANK ladder (quality axis): 1 Ash · 2 Tooth · 3 Splinter
     * · 4 Rib · 5 Skull · 6 Saint. Rarity derives from it:
     * common = 1-2, uncommon = 3-4, rare = 5-6. Orthogonal to `tier` (resist).
     */
    rank: CardRank;
    /** Attack / Skill / Spell. See {@link CardType}. */
    cardType: CardType;
    /**
     * The authored FREE (dieless) line. Budget law: FREE ≈
     * 25-35% of the card's total points.
     */
    free?: CardRider;
    /**
     * The authored, human-readable PAID sentence. A card may print prose ("Apply POISON 2 for 3 turns,
     * then PROLONG every DoT by 1.") instead of the generated telegraphese.
     * The P0-truth law still holds: every number the engine applies must
     * appear verbatim in this text, and every UPPERCASE token must be a real
     * keyword — both enforced by `paid-summary-honesty.engine.test.ts`.
     * Absent → the projection falls back to the generated `paidText`.
     */
    paidSummary?: string;
    combatEffects?: CardCombatEffects[];
    specialMechanics?: CardSpecialMechanic[];
    /**
     * Content-provenance metadata. `addedIn` is an ISO date / phase tag;
     * `tags` are freeform labels (e.g. `'mid-game'`, `'damage'`). Both
     * optional and ignored by the card engine.
     */
    addedIn?: string;
    tags?: string[];
    /**
     * CARD UPGRADES — the authored patch used when this card is
     * upgraded to `<id>+`. Optional by design: a card WITHOUT one still
     * upgrades, through the documented default rule in
     * `src/Cards/card-upgrades.ts`. Author one only when the default reads
     * badly on this card (a cost-shaped number, a payoff that wants a second
     * hit rather than a bigger one, a face whose prose must be rewritten).
     * Data only — the card engine ignores it; `upgradeCard` reads it.
     */
    upgrade?: CardUpgrade;
    /**
     * A card whose lines read the fight, pay a SACRIFICE, handle Curses or
     * stay in play as a Global carries its lines as a program instead of
     * `free` / `specialMechanics`; `Combat/combat.card-program.ts` resolves
     * it. See `card-program.types.ts`.
     */
    program?: CardProgram;
    /**
     * A program card's lines at a given upgrade level (Phase UP1b). `program`
     * is this at level 0; `upgradeCard` rebuilds `program` from it at each
     * upgrade, so the printed text and the applied numbers come from the same
     * scaled values. A program card without one keeps its numbers when upgraded.
     */
    programAt?: (scale: UpgradeScale) => CardProgram;
}

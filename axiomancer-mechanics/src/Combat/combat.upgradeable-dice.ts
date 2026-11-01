/**
 * Upgradeable Dice: the four-die combat model.
 *
 * Four fixed, single-color d6 rolled every round — Body (red), Mind (blue),
 * Heart (purple) at 1 special / 2 mana / 3 miss, and the wild Gold die at
 * 1 special / 1 mana / 4 miss. Face semantics: a MANA die may power one paid
 * line of its color (gold = any color); a MISS is dead; a BOON powers a
 * card AND fires its gear payload (+2◆ by default) when USED (the
 * use-triggered rule, kept as one switchable constant below).
 *
 * The dice are immutable; ALL progression lives on DIE GEAR, with a
 * hardcoded default loadout (`DEFAULT_DIE_GEAR`).
 *
 * Randomness flows
 * through caller-supplied `rng` closures, so hermetic tests pin faces via
 * sequential mocks and the sim stays reproducible.
 *
 * Dice honesty: NOTHING in this module
 * rigs a roll — no stance guarantee, no pity floor; the ~0.7% double-whiff
 * residue is carried by FREE lines.
 */

import { getRng } from '../Utils/rng';
import type {
    CombatDieColor, CombatEncounterState, CombatManaDie, UpgradeableDieGear, WheelStance,
} from './combat.encounter.types';
import type { CardAspect } from '../Cards/types';
import { applyDieChanges } from './combat.equipment-effects';

// ---------------------------------------------------------------------------
// Constants ([owner-locked] unless noted)
// ---------------------------------------------------------------------------

/** The fixed rolled pool: one die per color, every round. */
export const UPGRADEABLE_DIE_COLORS: readonly ('heart' | 'body' | 'mind' | 'wild')[] =
    Object.freeze(['body', 'mind', 'heart', 'wild']);

/** Hard ceiling on die OBJECTS on the table (tray + Reserve). A grant
 *  that would create the 8th object converts to +1◆ instead. */
export const UPGRADEABLE_TABLE_CEILING = 7;

/** KINDLE concurrency cap (at most one temporary kindled
 *  die at a time; further grants convert to +1◆). */
export const KINDLE_CONCURRENT_CAP = 1;

/** OVERHEAT: pushing an already-spent die to power a second card risks
 *  this chance that the die CRACKS (all-miss next round). The push itself always succeeds. */
export const OVERHEAT_CRACK_CHANCE = 0.35;

/**
 * Fires-on-use rule: a BOON face fires its payload
 * only when the die is USED to power a card. Keep this the single switch —
 * nothing else may encode the trigger timing.
 */
export const SPECIAL_FIRES_ON_USE = true;

/** The default special payload: +2◆ when the special fires. */
export const SPECIAL_CONVICTION_DEFAULT = 2;

/** Chain order, cyclic, any entry point (matches the shipped wheel). */
export const MOMENTUM_CHAIN_ORDER: readonly WheelStance[] = Object.freeze(['heart', 'body', 'mind']);

/** Chain length that completes a surge. */
export const MOMENTUM_SURGE_LENGTH = 3;

/** Id prefix for the surge-granted temp gold die (until spent, this combat —
 *  `temporary: true` keeps it out of the cross-combat float save, mirroring
 *  the wheel-era `momentum-` prefix convention). */
export const SURGE_DIE_PREFIX = 'surge-';

/** Id prefix for the coveted-die payout: a boss/unique
 *  phase's `stake` claimed by a full block.
 *  Same shape as the surge die (temp gold, until spent), distinct prefix so
 *  the two payout sources stay attributable in telemetry/tests. */
export const COVETED_DIE_PREFIX = 'coveted-';

// ---------------------------------------------------------------------------
// Die gear
// ---------------------------------------------------------------------------

/** The stock loadout: R/B/P at 1 special / 2 mana / 3 miss; Gold 1/1/4. */
export const DEFAULT_DIE_GEAR: Readonly<Record<'heart' | 'body' | 'mind' | 'wild', UpgradeableDieGear>> =
    Object.freeze({
        heart: { dieColor: 'heart', specialFaces: 1, manaFaces: 2, specialConviction: SPECIAL_CONVICTION_DEFAULT },
        body: { dieColor: 'body', specialFaces: 1, manaFaces: 2, specialConviction: SPECIAL_CONVICTION_DEFAULT },
        mind: { dieColor: 'mind', specialFaces: 1, manaFaces: 2, specialConviction: SPECIAL_CONVICTION_DEFAULT },
        wild: { dieColor: 'wild', specialFaces: 1, manaFaces: 1, specialConviction: SPECIAL_CONVICTION_DEFAULT },
    });

/** Faces on an upgradeable die. `specialFaces + manaFaces` may never exceed it —
 *  a die with no miss face left is fully honed and cannot be honed further. */
const UPGRADEABLE_DIE_FACE_COUNT = 6;

/**
 * THE PATH — DIE UPGRADES. "Players will have the ability to upgrade the dice (so it shows
 * more mana faces but will be expensive)."
 *
 * A HONE turns one MISS face into a MANA face. This is the potent form of
 * the axis, because there is no draft — every usable die powers a card, so a mana face the player didn't have before is a PAID play they
 * didn't have before.
 *
 *   level 0 — colours 1 special / 2 mana / 3 miss   gold 1 / 1 / 4  (stock)
 *   level 1 — colours 1 / 3 / 2                     gold 1 / 2 / 3
 *   level 2 — colours 1 / 4 / 1                     gold 1 / 3 / 2
 *   level 3 — colours 1 / 5 / 0  (never misses)     gold 1 / 4 / 1
 *   level 4 — colours 1 / 5 / 0  (capped)           gold 1 / 5 / 0
 *
 * Monotone but SATURATING: colour dice run out of miss faces at level 3, so
 * level 4 only pays the gold die. That is the honest shape of the ladder — do
 * not read the levels as equal steps.
 */
export function honedDieGear(
    color: 'heart' | 'body' | 'mind' | 'wild',
    level = 0,
): UpgradeableDieGear {
    const stock = DEFAULT_DIE_GEAR[color];
    const hones = Math.max(0, Math.floor(level));
    if (hones === 0) return stock;
    const room = UPGRADEABLE_DIE_FACE_COUNT - stock.specialFaces - stock.manaFaces;
    return { ...stock, manaFaces: stock.manaFaces + Math.min(room, hones) };
}

/**
 * The active gear for one die: the state's rail, else the stock default
 * HONED by `dieUpgradeLevel`. An explicit rail always wins — it is the
 * player's actual gear; the honed default is what the balance harness uses to
 * model a stage of the campaign it has no authored loadout for.
 */
export function activeDieGear(
    state: Pick<CombatEncounterState, 'dieGear' | 'dieUpgradeLevel' | 'equipmentDice'>,
    color: 'heart' | 'body' | 'mind' | 'wild',
): UpgradeableDieGear {
    const base = state.dieGear?.[color] ?? honedDieGear(color, state.dieUpgradeLevel ?? 0);
    // The worn armor's die change rides on top of the character's gear (and a
    // fully honed die has no miss face left for it to turn).
    return applyDieChanges(base, state.equipmentDice?.dieChanges);
}

export type UpgradeableDieFace = 'special' | 'mana' | 'miss';

/** Rolls one face from a gear piece's table (special / mana / the miss rest). */
export function rollUpgradeableFace(
    gear: UpgradeableDieGear,
    rng: () => number = defaultRng,
): UpgradeableDieFace {
    const faceIdx = Math.min(5, Math.floor(rng() * 6));
    if (faceIdx < gear.specialFaces) return 'special';
    if (faceIdx < gear.specialFaces + gear.manaFaces) return 'mana';
    return 'miss';
}

const defaultRng = (): number => getRng().random();

/** Materializes a rolled face as a tray die. Miss = `locked` (cannot power;
 *  never fate-tappable — these are stance colors, not X). */
function faceToDie(
    id: string,
    color: 'heart' | 'body' | 'mind' | 'wild',
    face: UpgradeableDieFace,
): CombatManaDie {
    return {
        id, color, face,
        state: face === 'miss' ? 'locked' : 'available',
        temporary: false,
    };
}

/**
 * THE PATH — ACT REWARD DICE. "After each act is
 * completed, the players are rewarded a red/blue/purple base die of their
 * choice." The tray is a fixed one-die-per-colour set, so an act
 * reward is a DUPLICATE colour die: a second body die, a second mind die, and
 * so on. Since the harness cannot model the player's choice, the colours are
 * handed out deterministically in R/B/P order.
 *
 * NOT SHIPPED YET: the game is still in act one, so no
 * player has been given one. This exists so a mid/late playtest cell measures
 * the body that stage of the campaign will have.
 *
 * These dice honour the colour-keyed OVERHEAT crack like any other die of
 * their colour — a body crack silences every body die that round. That is
 * deliberate, and it makes OVERHEAT costlier the more
 * duplicates you own.
 */
function actRewardDieColors(count: number): ('heart' | 'body' | 'mind')[] {
    const order: ('heart' | 'body' | 'mind')[] = ['body', 'mind', 'heart'];
    return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, i) => order[i % order.length]);
}

/**
 * Rolls the round's four dice (one per color, fixed order R/B/P/G by
 * stance name body/mind/heart/wild), plus one duplicate colour die per banked
 * ACT REWARD (`bonusTurnDice`). A color listed in `cracked` (an OVERHEAT crack
 * biting this round) comes up all-miss WITHOUT consuming rng — the crack is a
 * stated consequence, not a rigged roll.
 */
export function rollUpgradeableDice(
    turn: number,
    state: Pick<CombatEncounterState, 'dieGear' | 'dieUpgradeLevel' | 'bonusTurnDice' | 'equipmentDice'>,
    crackedColors: ReadonlySet<string>,
    rng: () => number = defaultRng,
): CombatManaDie[] {
    const roll = (id: string, color: 'heart' | 'body' | 'mind' | 'wild'): CombatManaDie => {
        if (crackedColors.has(color)) return faceToDie(id, color, 'miss');
        return faceToDie(id, color, rollUpgradeableFace(activeDieGear(state, color), rng));
    };
    return [
        ...UPGRADEABLE_DIE_COLORS.map(color => roll(`t${turn}-u-${color}`, color)),
        ...actRewardDieColors(state.bonusTurnDice ?? 0)
            .map((color, i) => roll(`t${turn}-u-act${i}-${color}`, color)),
    ];
}

/** The rare permanent gold+lead pair (cap 1 pair, the reading of
 *  `permanentWildDice`): a 2nd gold die (stock gold gear faces) plus the
 *  LEADEN die — 5 miss / 1 gold-colored mana. Fate pushes back. */
export function rollGoldLeadPair(
    turn: number,
    state: Pick<CombatEncounterState, 'dieGear' | 'dieUpgradeLevel' | 'equipmentDice'>,
    rng: () => number = defaultRng,
): CombatManaDie[] {
    const gold = faceToDie(`t${turn}-u-gold2`, 'wild', rollUpgradeableFace(activeDieGear(state, 'wild'), rng));
    const leadFace: UpgradeableDieFace = Math.min(5, Math.floor(rng() * 6)) < 1 ? 'mana' : 'miss';
    const lead = faceToDie(`t${turn}-u-lead`, 'wild', leadFace);
    return [gold, lead];
}

// ---------------------------------------------------------------------------
// Momentum — breaks reset to NULL
// ---------------------------------------------------------------------------

export type MomentumV2 = { color: WheelStance; length: number } | null;

function nextChainColor(s: WheelStance): WheelStance {
    return MOMENTUM_CHAIN_ORDER[(MOMENTUM_CHAIN_ORDER.indexOf(s) + 1) % MOMENTUM_CHAIN_ORDER.length];
}

/**
 * Advances the momentum chain for a landed PAID play of `played`:
 * - null → start `{played, 1}`;
 * - the successor color → advance (+1); reaching `MOMENTUM_SURGE_LENGTH`
 *   surges and resets to null;
 * - ANY other color — INCLUDING the color the chain sits on — breaks the
 *   chain to NULL. The breaking card builds nothing.
 * FREE plays never reach this function.
 */
export function advanceMomentumV2(
    momentum: MomentumV2,
    played: WheelStance,
): { momentum: MomentumV2; surged: boolean; broke: boolean } {
    if (momentum === null) return { momentum: { color: played, length: 1 }, surged: false, broke: false };
    if (played !== nextChainColor(momentum.color)) return { momentum: null, surged: false, broke: true };
    const length = momentum.length + 1;
    if (length >= MOMENTUM_SURGE_LENGTH) return { momentum: null, surged: true, broke: false };
    return { momentum: { color: played, length }, surged: false, broke: false };
}

// ---------------------------------------------------------------------------
// Table ceiling — materialization priority + overflow → +1◆
// ---------------------------------------------------------------------------

/** Die objects on the table: the tray plus the Reserve. */
export function tableDieObjectCount(state: Pick<CombatEncounterState, 'dice' | 'reserve'>): number {
    return state.dice.length + (state.reserve ?? []).length;
}

/** True when one more die object fits under the 7-object ceiling. */
export function tableHasRoom(state: Pick<CombatEncounterState, 'dice' | 'reserve'>): boolean {
    return tableDieObjectCount(state) < UPGRADEABLE_TABLE_CEILING;
}

// ---------------------------------------------------------------------------
// Cracked dice (OVERHEAT)
// ---------------------------------------------------------------------------

/** The colors whose dice are forced all-miss on `turn` (crack biting now). */
export function crackedColorsForTurn(
    state: Pick<CombatEncounterState, 'crackedDice'>,
    turn: number,
): Set<string> {
    return new Set((state.crackedDice ?? []).filter(c => c.turn === turn).map(c => c.color));
}

/** Drops crack entries STRICTLY BEFORE `turn`. An entry survives through its
 *  own bitten turn and is swept by the next turn's roll. */
export function expireCrackedDice(
    cracked: readonly { color: 'heart' | 'body' | 'mind' | 'wild'; turn: number }[] | undefined,
    turn: number,
): { color: 'heart' | 'body' | 'mind' | 'wild'; turn: number }[] {
    return (cracked ?? []).filter(c => c.turn >= turn);
}

/** True for the three momentum-chain colours (never wild/x). */
export function isChainStance(s: CombatDieColor | CardAspect): s is WheelStance {
    return s === 'heart' || s === 'body' || s === 'mind';
}

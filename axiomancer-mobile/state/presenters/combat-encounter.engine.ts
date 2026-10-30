/**
 * Combat board presenter.
 *
 * Pure function `buildCombatViewModel(state)`: maps the engine
 * `CombatEncounterState` into a single render-ready `CombatViewModel`. No store
 * writes, no rules — the engine owns truth, this shapes it for the board
 * (portraits, visible enemy HP, intent telegraph, the faced dice tray, the
 * hand, and Conviction + Signature Skills).
 */

import {
    handCards as engineHandCards, getCard, getCardById, toCombatCard,
    getSignatureSkill,
    lookupEffect,
    RESERVE_MAX,
    riderText,
    // The wall-math readout on the intent.
    projectIncomingThreat,
    // The status kill-path foresight on the enemy pane.
    projectCombatOutcome,
    // The signature bar reads the engine's own cast gate.
    signatureCastBlock,
    // The momentum chain and the die-gear rail.
    MOMENTUM_CHAIN_ORDER, MOMENTUM_SURGE_LENGTH, activeDieGear, DEFAULT_DIE_GEAR,
    // Stat scaling: the hand prints final numbers in the family colour.
    scaleCardForStats,
    weatherReading, yourInferno,
    spikeReading, mercyReading,
    type StatFamily,
    type CombatEncounterState, type CombatCard, type CombatManaDie, type CombatEvent,
    type CombatThreatPhase, type CombatIntentType,
    type CombatSummary, type SignatureSkill,
    type Card, type CardCombatEffects, type CardType,
    type UpgradeableDieGear,
    type WheelStance,
    type WeatherElement,
    type SpikeReading,
    hasEnemyPhases, nextEnemyPhaseIndex, playLimitBlock,
} from '@mechanics';
// The card-text projection. The detail panel's printed clauses are DERIVED in
// mechanics from the effect data; this presenter only formats them (keyword
// casing, separators, de-abbreviation). It never decides what is in the list.
// Imported by sub-path: the module is not re-exported through the top-level
// barrel.
import { paidClauses, type CardClause } from '@mechanics/Combat/combat.card-text';
import { momentumV2A11y } from '@/state/combat/momentum';
// The single mobile source for the rarity band. Never re-band a rank here;
// `rarityFor` owns that question for every surface.
import { rarityFor, RARITY_LABEL, RARITY_PIPS, RARITY_COLOR } from '@/state/presenters/card-rarity.engine';

/** The barrel doesn't re-export the union, so derive it from Card. */
type CardSpecialMechanic = NonNullable<Card['specialMechanics']>[number];
import { effectGlyph, GLYPH_COLORS, type StatusGlyph } from '@/components/combat/statusGlyphs';
import { keywordForEffect, keywordForVerb, keywordForMechanic, keywordGloss, keywordsInText, systemTermsForCard } from '@/state/combat/keywords';
import { AXM, HUE } from '@/theme/axm';
import {
    programFreeCell, programHeadline, programLinesFor, programLifecycle, programPlayVM, programTypeTag,
    type ProgramPlayVM,
} from '@/state/presenters/card-program.engine';

// ── Stance palette (Heart/Body/Mind/Wild/X/Any) ──────────────────────────────

export const STANCE_COLORS: Record<string, string> = {
    // Body=RED, Mind=BLUE, Heart=PURPLE, Wild=GOLD (owner-specified dice palette).
    heart: HUE.dieHeart, body: HUE.dieBody, mind: HUE.dieMind, wild: HUE.goldAccent, x: HUE.dieX,
    // The colourless (grey) aspect: the neutral ink token.
    any: AXM.bone,
};
const DIE_GLYPHS: Record<string, string> = { heart: '♥', body: '⚡', mind: '★', wild: '✦', x: '✕', any: '✦' };
const STANCE_LABELS: Record<string, string> = { heart: 'HEART', body: 'BODY', mind: 'MIND', wild: 'WILD', x: 'X', any: 'ANY' };

// A FREE (no-die) play executes the card's AUTHORED free rider. The free text
// below always comes from the engine's riderText so printed == applied.
//
// Rank ladder display names. CARD_RANK_NAMES lives in
// mechanics src/Cards/types.ts but is NOT re-exported through the barrel,
// so mirrored here (kept in sync by hand).
const RANK_NAMES: Record<number, string> = Object.freeze({
    1: 'Ash', 2: 'Tooth', 3: 'Splinter', 4: 'Rib', 5: 'Skull', 6: 'Saint',
});
// Verb-class card colours (these map to verbs, not Effects, so they aren't in GLYPH_COLORS).
const GUARD_COLOR = HUE.guardSteel;
const PAYOFF_COLOR = HUE.payoffGold;
const BEFRIEND_COLOR = HUE.boonGreen;
const INERT_COLOR = HUE.inertGrey;

// A single gold accent (matches `STANCE_COLORS.wild`, the existing "charged
// token" identity) — the Signature line in the combat log.
const GOLD_ACCENT = HUE.goldAccent;

/**
 * Canon combat copy is VITAE (mobile CLAUDE.md — "copy regressions to the
 * generic terms are rejected on sight"). The engine composes some printed card
 * lines itself (`fate.recoilHp` prints "(recoil 4 HP)"), and rules text is
 * engine-owned truth — but the WORD a player reads is presentation, and this
 * is the layer that owns it. One narrow substitution at the boundary where
 * engine text becomes a face string, so a single stale noun in the engine can
 * never put "HP" on a card again.
 */
function vitaeCopy(text: string): string {
    return text.replace(/\bHP\b/g, 'VITAE');
}

/** De-abbreviate the rider shorthand ('mark i1 d2') at render: intensity →
 *  '×N', duration → 'N turns'. Presentation-only — the engine text stays the
 *  truth; this is its spelling (ADR-0001/0003). */
function deabbreviateShorthand(text: string): string {
    return text
        .replace(/\bi(\d+) d(\d+)\b/g, (_, i: string, d: string) => `×${i} · ${d} turn${d === '1' ? '' : 's'}`)
        .replace(/\bi(\d+)\b/g, '×$1')
        .replace(/\bd(\d+)\b/g, (_, d: string) => `${d} turn${d === '1' ? '' : 's'}`);
}

/** The authored FREE (no-die) line in real engine units — riderText over the
 *  card's `free` rider. Never a fabricated number. */
function freeLineText(card: CombatCard, sourceCard?: Card): string {
    // selfTargetCard: a rider crossing the card's printed target names its side
    // ('mark ×1 (enemy)' on a self-target card).
    if (sourceCard?.program) return programLinesFor(sourceCard).free;
    if (!sourceCard?.free) return 'no effect';
    const text = deabbreviateShorthand(riderText(sourceCard.free, { selfTargetCard: sourceCard.targetType === 'self' }));
    const ae = sourceCard.free.applyEffect;
    const pct = ae ? percentIntensity(ae.effectId, ae.intensity ?? 1) : null;
    return pct ? text.replace(`×${ae!.intensity ?? 1}`, pct) : text;
}

/** A damage-taken status (VULNERABLE) counts its intensity in percentage
 *  points (`damageTakenMult` 1.01 per point), so its value reads '+10%', the
 *  way the PAID rail prints '+25%' — never the '×10' stack count. null for
 *  every other effect. */
function percentIntensity(effectId: string, intensity: number): string | null {
    const mult = lookupEffect(effectId)?.payload?.damageTakenMult;
    return mult && mult > 1 ? `+${Math.round((mult - 1) * 100 * intensity)}%` : null;
}

/** The barrel doesn't export CardRider — derive it from Card. */
type CardRider = NonNullable<Card['free']>;
/** The player's base stats, as the hand reads them for scaling. */
type PlayerStats = CombatEncounterState['player']['baseStats'] | undefined;

/** Split rail — project the authored FREE rider into a KEYWORD · value
 *  pair for the face's ◇ column. Clause order mirrors the engine's riderText so
 *  the head clause is the same one the prose leads with; a multi-clause free
 *  line keeps the head pair and marks the rest with a trailing '+' (the overlay
 *  freePill remains the full-truth line). Never a fabricated number. */
function riderPairs(r: CardRider): [string, string][] {
    const pairs: [string, string][] = [];
    if (r.guard) pairs.push(['GUARD', `${r.guard}`]);
    if (r.applyEffect) {
        const kw = keywordForEffect(r.applyEffect.effectId)
            ?? r.applyEffect.effectId.replace(/^(debuff|buff)_/, '');
        const i = r.applyEffect.intensity ?? 1;
        const d = r.applyEffect.duration;
        // De-abbreviated: '×1 · 1t', never the 'i1 d1' code.
        pairs.push([kw.toUpperCase(), `${percentIntensity(r.applyEffect.effectId, i) ?? `×${i}`}${d ? ` · ${d}t` : ''}`]);
    }
    // Damage leads, as riderText leads with "Deal N": A Plain Blow's FREE
    // "Deal 2" is a DEAL pill, never a face with no pill.
    if (r.damage) pairs.unshift(['DEAL', `${r.damage}`]);
    return pairs;
}

function freeRail(sourceCard?: Card): { freeKeyword: string | null; freeValue: string | null } {
    const r: CardRider | undefined = sourceCard?.free;
    if (!r) return { freeKeyword: null, freeValue: null };
    const pairs = riderPairs(r);
    if (pairs.length === 0) return { freeKeyword: null, freeValue: null };
    const [kw, val] = pairs[0];
    return { freeKeyword: kw, freeValue: pairs.length > 1 ? `${val} +` : val };
}

// FREE-effect glyph — the hero mark for the dieless play. Affliction riders use
// their effect's board glyph; currency riders (guard/draw…) map to a
// terse rune; any other rider falls back to the generic ◆ rune. '' when the
// card has no free line.
const FREE_KW_GLYPH: Record<string, string> = {
    GUARD: '❖', HEAL: '✚', DRAW: '⚑',
    CLEANSE: '✦', PIP: '⬡',
    SACRIFICE: '†', LEECH: '∿', TETHER: '⊸', WAIVE: '○', DEAL: '⚔',
    RADIANCE: '☼', MERCY: '☮',
};
/** The FREE glyph plus the KEYWORD that drives it — the key lets the face swap
 *  the text rune for the effect's SILHOUETTE (glyphShapes.ts) when one exists. */
function freeGlyphMeta(sourceCard?: Card): { glyph: string; key: string | null } {
    const r: CardRider | undefined = sourceCard?.free;
    if (!r) return { glyph: '', key: null };
    if (r.applyEffect?.effectId) {
        const kw = keywordForEffect(r.applyEffect.effectId)
            ?? r.applyEffect.effectId.replace(/^(debuff|buff)_/, '');
        return { glyph: glyphFor(r.applyEffect.effectId), key: kw.toUpperCase() };
    }
    const kw = riderPairs(r)[0]?.[0];
    return kw ? { glyph: FREE_KW_GLYPH[kw] ?? '◆', key: kw } : { glyph: '', key: null };
}

/** Type strip — stance + card type. */
function typeStripText(card: CombatCard): string {
    const typeLabel = card.cardType ? card.cardType.toUpperCase() : null;
    return [card.stance.toUpperCase(), ...(typeLabel ? [typeLabel] : [])].join(' · ');
}

// ── Intent vocabulary ────────────────────────────────────────────────────────

export const INTENT_ICONS: Record<CombatIntentType, { icon: string; label: string; color: string }> = {
    damage: { icon: '⚔', label: 'ATTACKS', color: HUE.damageRed },
    debuff: { icon: '☠', label: 'WEAKENS', color: HUE.tickPurple },
    buff: { icon: '✦', label: 'RECOVERS', color: HUE.boonGreen },
    block: { icon: '🛡', label: 'DEFENDS', color: HUE.blockBlue },
    pass: { icon: '○', label: 'WAITS', color: HUE.stoneGrey },
    combo: { icon: '⚡', label: 'SURGES', color: HUE.goldAccent },
    // The kinds a `phases` foe telegraphs: a kind and a name, never a number.
    attack: { icon: '⚔', label: 'ATTACK', color: HUE.damageRed },
    defend: { icon: '🛡', label: 'DEFEND', color: HUE.blockBlue },
    status: { icon: '☠', label: 'STATUS', color: HUE.tickPurple },
    danger: { icon: '⚠', label: 'DANGER', color: HUE.goldAccent },
    unknown: { icon: '?', label: 'UNKNOWN', color: HUE.stoneGrey },
};

/** A `phases` foe's telegraph: the entry's move name, or null for a DANGER
 *  the save has not seen beaten. Null for any other entry. */
export function telegraphName(phase: CombatThreatPhase | undefined, beaten: boolean): string | null {
    const move = phase?.enemyMove;
    if (!move) return null;
    return move.kind === 'danger' && !beaten ? null : move.name;
}

// ── View-model types ─────────────────────────────────────────────────────────

export interface CombatEffectChipVM {
    // No `isMax`: the engine has no intensity cap, so the chip shows the real
    // stack count.
    effectId: string; glyph: StatusGlyph; intensity: number; duration: number;
    /** A unit the badge prints after the number (REFLECT's '%'); absent = a bare count. */
    unit?: string;
    /** General keyword definition for the on-board status tooltip (null if unmapped). */
    gloss: string | null;
    /** A visible line beside the chip (set only on your own weather, e.g. the
     *  per-turn loss of your INFERNO); absent everywhere else. */
    caption?: string;
}
/** The fork telegraph of a BRANCH phase: the condition
 *  plus BOTH outcomes stay visible; `taken` is stamped once the phase starts. */
export interface CombatIntentBranchVM {
    /** Human condition text, e.g. "if it carries 3+ afflictions". */
    condition: string;
    thenText: string;
    elseText: string;
    /** The committed fork — null while the phase is still upcoming. */
    taken: 'then' | 'else' | null;
}
export interface CombatIntentVM {
    type: CombatIntentType; icon: string; label: string; color: string; description: string;
    /** A `phases` foe's move name (null when it has none to show: a DANGER not
     *  yet beaten, or any other foe). Its intent carries no number at all:
     *  `damage` is 0, `debuffs` false and `wallMath` zero. */
    moveName?: string | null;
    /** Total HP damage this phase's threat action deals if NOT cleared (0 if none).
     *  Raw face value — NOT run through live modifiers; see `wallMath` for that. */
    damage: number;
    /** True if the threat action also applies a debuff to the player. */
    debuffs: boolean;
    /** Fork info for the CURRENT phase (null on linear phases). */
    branch: CombatIntentBranchVM | null;
    next: { type: CombatIntentType; icon: string; label: string; branch: CombatIntentBranchVM | null; moveName?: string | null } | null;
    /** The wall-math readout (`projectIncomingThreat`): what this
     *  telegraphed hit actually deals right now, netted against live guard/
     *  barrier and denial state — the number `damage` above can't show. */
    wallMath: {
        projectedDamage: number; netDamage: number; willDeny: boolean; guard: number; barrier: number;
        /** What BLIZZARD takes off this phase's hits (engine truth; 0 with none). */
        blizzardCut: number;
    };
}
export interface CombatEnemyPaneVM {
    name: string; artKey: string; isBoss: boolean;
    /** Encounter-varying nonce (the encounter seed) — salts the random art pick
     *  so the same foe wears a different painting from fight to fight. */
    artNonce: number;
    hp: number; maxHp: number; hpPct: number;
    effects: CombatEffectChipVM[];
    intent: CombatIntentVM;
    /** The count of STAGE thresholds this foe has already crossed (0 for
     *  anything that does not escalate). The loud announcement is the combat
     *  log's `stage-entered` line — this is the standing "it has changed" mark. */
    stagesEntered: number;
    /** The status kill-path foresight. `pendingDot` is the
     *  damage the foe's CURRENT stacks will deal if nothing else happens;
     *  `roundsToKill` is null unless that alone clears remaining HP, in which
     *  case `isLethalInFlight` is true. Engine truth (`projectCombatOutcome`),
     *  this presenter only forwards it. */
    pendingDot: number; roundsToKill: number | null; isLethalInFlight: boolean;
    /** A `phases` foe's DANGER moves, one per later phase, named only once the
     *  save records the foe beaten (null otherwise). Empty for any other foe. */
    dangers?: { phase: number; name: string | null }[];
}
export interface CombatPlayerPaneVM {
    name: string; hp: number; maxHp: number; hpPct: number; guard: number; effects: CombatEffectChipVM[];
}
export interface CombatDieVM {
    id: string; color: string; colorHex: string; glyph: string; stanceLabel: string;
    spent: boolean; isX: boolean;
    /** A banked Reserve die — a second power source, ripening between phases. */
    reserve?: boolean;
    /** Ripening pips (+1 intensity per pip on a status play; +2 Guard on a defend). */
    pips?: number;
    /** A GHOST die: consumed forever when spent, persists
     *  across combats, never rerolls. */
    floating?: boolean;
    /** The board may attach a drag gesture to this die. Computed HERE (not in
     *  the render) so it can never depend on transient drag state — flipping
     *  it mid-drag unmounts the GestureDetector, which on web kills the pan
     *  without onEnd/onFinalize (the stuck-ghost / dead-drop bug). */
    draggable: boolean;
    /** The rolled gear face: `mana` powers a card of its
     *  color (the normal look), `special` also fires its +◆ payload (the
     *  marked face), `miss` is DEAD (unpowerable). ABSENT on unrolled dice
     *  (GHOST / forged / Reserve) — those power by colour alone. */
    face?: 'special' | 'mana' | 'miss';
    /** An OVERHEAT crack forced this die's color
     *  all-miss this round; it reads as a distinct struck-out state. */
    cracked?: boolean;
}
/**
 * THE COLOR LAW, UI-side: the board PREVENTS illegal die placement rather
 * than letting the play fizzle.
 *
 * Rule source — the ENGINE, not this file: `playCombatCard`'s COLOR LAW gate
 * (axiomancer-mechanics src/Combat/combat.engine.ts — a die powers only
 * a card of ITS color; WILD is the sole exception; a fate-X play acts wild but
 * rides its own tap path, never a drag) and `combatDieCanPower`
 * (src/Combat/combat.dice.ts), which additionally wants the die's live
 * `state`. The board only holds VMs mid-drag, so this derives the SAME verdict
 * from the VM's color fields; spent/X gating stays where it already lives
 * (CombatDieVM.draggable + the board's pending-die checks). Reserve and
 * floating dice obey the same law — the engine checks every power source
 * alike.
 */
export function dieCanPowerCardVM(
    die: { color: string; isX?: boolean; face?: 'special' | 'mana' | 'miss' },
    cardStance: string,
): boolean {
    if (die.isX || die.color === 'x') return false;
    // A MISS face is dead — it powers nothing, so any drop is
    // refused just like an off-color one.
    if (die.face === 'miss') return false;
    if (cardStance === 'wild') return true;   // parity with combatDieCanPower
    // A grey card ('any') is powered by every non-X, non-miss die.
    if (cardStance === 'any') return true;
    return die.color === 'wild' || die.color === cardStance;
}

/**
 * The DEAD TRAY: dice are rolled, the hand holds cards, at least one tray or
 * Reserve die is unspent, and no unspent die can power any card in hand (a
 * MISS face or an X die powers nothing). A fully spent tray is not dead: END
 * has nothing to discard there.
 */
export function selectDeadTray(vm: Pick<CombatViewModel, 'dice' | 'diceRolled' | 'hand'>): boolean {
    const unspent = vm.dice.filter((d) => !d.spent);
    return vm.diceRolled && vm.hand.length > 0 && unspent.length > 0
        && unspent.every((d) => vm.hand.every((c) => !dieCanPowerCardVM(d, c.stance)));
}

/** The dead tray's words: the tray line, the staged-card hint and END's
 *  consequence. Engine truth (`endTurn`): unusable dice are discarded (one
 *  unspent mana or special die banks to the Reserve when a slot is free) and
 *  the fresh tray rolls next phase; the line does not name the bank. */
export const DEAD_TRAY_COPY = {
    line: 'no die matches your hand — FREE plays still work · END rolls fresh dice',
    stageHint: 'no die matches your hand — APPLY · FREE still works',
    endConsequence: 'unusable dice are discarded · fresh roll next phase',
} as const;

export type CombatCardKind =
    | 'dot' | 'stun' | 'guard' | 'weaken' | 'inert' | 'befriend'
    | 'vulnerable'   // debuff_vulnerable / debuff_vulnerability_* — foe takes +N% damage
    | 'mark'         // universal exposure: +N per DoT tick per stack
    | 'resolute'      // buff_resolute → real -N% damage-taken reduction (the inverse of vulnerable)
    // The generic MECHANIC-LED face:
    | 'program'       // a card program (Global, Curse, SACRIFICE lines): the
                      // headline is read off its printed PAID line
    | 'mechanic';     // a specialMechanics verb (DEAL / GUARD) or a
                      // rider-carried verb (DRAW / HEAL / …) is the card's paid identity;
                      // keyword + value come from the mechanic, never a fabricated fallback

/** Render-ready, HONEST card FACE. Every number is a real unit derived from the
 *  card's AUTHORED effect (never the abstract "impact"). `heroText` is '' when the
 *  kind has no honest number (strike/weaken/inert/befriend) — the face renders a
 *  qualitative word there instead. Real-units-or-no-number: never a fabricated value. */
export interface CombatCardFaceVM {
    kind: CombatCardKind;
    keyword: string | null;        // UPPERCASE keyword for the face (e.g. 'BLEED')
    /** The stat family of the card's main keyword (body: damage to
     *  the foe; mind: on you; heart: on the foe). Set on the live hand only. */
    statFamily?: StatFamily | null;
    /** The family's dice colour and stat glyph (♥ ⚡ ★) for the keyword text. */
    familyColor?: string | null;
    familyGlyph?: string | null;
    /** The PAID value was raised (or lowered) by the player's stat. */
    statScaled?: 'up' | 'down' | null;
    /** The FREE value was raised (or lowered) by the player's stat. */
    freeStatScaled?: 'up' | 'down' | null;
    glyph: string;                 // sourced from statusGlyphs → matches the board chip
    /** The FREE effect's glyph — the hero mark for the dieless play (top-left of
     *  the rail face). Derived from the free rider's effect / keyword; '' when
     *  the card has no free line. */
    freeGlyph: string;
    /** The keyword behind `freeGlyph` (e.g. 'BLEED', 'GUARD'); the face uses it
     *  to draw the effect's SILHOUETTE (glyphShapes.ts) instead of the text
     *  rune when a shape exists. null = no free line. */
    freeGlyphKey: string | null;
    categoryColor: string;
    stanceColor: string;
    heroText: string;              // POWER value in real units; '' = no honest number
    heroSub: string | null;        // e.g. '(18)'
    freeHeroText: string;          // the no-die value
    freeHeroSub: string | null;
    /** Split rail — the FREE column's
     *  KEYWORD · value projection of the authored free rider (e.g. TICK · 1).
     *  null keyword = no free effect; the overlay's freePill keeps the full
     *  prose. */
    freeKeyword: string | null;
    freeValue: string | null;
    /** Type strip at the card foot — 'BODY · SPELL'. */
    typeStrip: string;
    /** A Global's or a Curse's type tag over the art ('GLOBAL · ⏳3 / ∞',
     *  'CURSE · NO SCRAP'); null for the plain types. */
    typeTag?: string | null;
    verbLine: string;              // plain who/what
    powerRail: string;
    armable: boolean;              // the staged face reprints its number at commit (`armedValue`)
    inert: boolean;                // engine doesn't read it yet → greyed, no number
    guardBase: number | null;
    statusBase: number | null;     // the status number (DoT total / Vulnerable %) — armed display
}

/** Render-ready card DETAIL (the inspect modal) — the SAME numbers as the face. */
export interface CombatCardDetailVM {
    subtitle: string;
    metaChip: string;
    outcomeLine: string;
    outcomeStats: { label: string; value: string }[];
    stacksText: string | null;
    freeLine: string;
    powerLine: string;
    readNote: string;
    mathLine: string;
    keywords: { name: string; def: string; minor: boolean }[];
    // ── The +DIE row: only what the face cannot carry ──
    /** The no-die (free) value — the full-truth authored line (the face's ◇
     *  rail is its terse projection). Kept as a presenter truth surface. */
    freePill: string;
    /** The FULL paid line — EVERY clause a die-powered play fires, in authored
     *  order, derived from `paidClauses()` in mechanics
     *  ('DEAL 20  +  MARK ×1 · 2 turns  +  HEAL 16'). Null only for a card that prints
     *  no payload at all. */
    diePaidLine: string | null;
    /** The Color Law — which dice can power this card — rendered ONCE per
     *  modal (not per powerLine). */
    colorLawHint: string;
    /** The per-card slice of the systems glossary: ONLY the system terms this
     *  card's printed lines reference (and that no keyword chip already
     *  explains). */
    systemTerms: { term: string; def: string }[];
    /** The rarity band's player-facing name ('Common' / 'Uncommon' /
     *  'Rare'), from the `card-rarity.engine` module. */
    rarityLabel: string;
    /** How many pips to draw. The COUNT is the greyscale-safe signal. */
    rarityPips: number;
    /** The band's hue. Never render it as the only rarity cue. */
    rarityColor: string;
    /** The ◇ row's tag. */
    freeTag: string;
    /** The ◆ row's tag, carrying the fact the row's own decision needs — the
     *  colour law ('+DIE · HEART/WILD'). */
    paidTag: string;
}

/** detailStats' switch builds everything BUT the pill fields; the wrapper appends them. */
type DetailCore = Omit<CombatCardDetailVM,
    'freePill' | 'diePaidLine' | 'colorLawHint' | 'systemTerms'
    | 'rarityLabel' | 'rarityPips' | 'rarityColor' | 'freeTag' | 'paidTag'>;

export interface CombatCardVM {
    uid: string; cardId: string; name: string; stance: string; stanceColor: string;
    verbClass: string; effectKind: 'dot' | 'control' | 'none';
    /** Rarity band derived from the rank ladder. The RARE frame keys off
     *  `rarity === 'rare'`. */
    rarity?: 'common' | 'uncommon' | 'rare';
    /** Rank 1-6 (Ash → Saint) + its printed name. */
    rank?: 1 | 2 | 3 | 4 | 5 | 6;
    rankName: string | null;
    /** Attack / skill / spell. */
    cardType?: CardType;
    tier: 1 | 2 | 3;
    topActionText: string; bottomActionText: string; bottomDamagePreview: number;
    /** Honest, render-ready 5-zone face — real units, zero abstraction. */
    face: CombatCardFaceVM;
    /** Honest, render-ready inspect detail (outcome + free/die + math + keywords). */
    detail: CombatCardDetailVM;
    /** Authored flavor prose (`Card.description`) — overlay BOTTOM only, never
     *  on the face (the face is purely functional). */
    flavor: string | null;
    /** A program card in hand: whether each line can be played now and why
     *  not, the Curse's scrap refusal and an X line's range. Absent elsewhere. */
    play?: ProgramPlayVM;
}

/** A Global in play, for the board's IN PLAY row. */
export interface CombatGlobalVM {
    /** The instance in play (copies stack, so two chips may share a cardId). */
    uid: string;
    cardId: string;
    name: string;
    /** '⏳2' (turn starts left) or '∞' (rest of combat). */
    turnsLabel: string;
    stanceColor: string;
    /** The card, for the inspect overlay. */
    card: CombatCardVM | null;
    a11y: string;
}

/** Board copy for program cards (no player-facing copy lives in a component). */
export const PROGRAM_COPY = Object.freeze({
    inPlay: 'IN PLAY',
    cantPlay: "CAN'T PLAY",
    noScrap: 'a Curse cannot be scrapped — play it to be rid of it',
    xLabel: 'SACRIFICE',
    xLess: 'Sacrifice less',
    xMore: 'Sacrifice more',
    /** A refused stage or die drop on a card whose line cannot be played now. */
    blocked: (name: string, why: string) => `${name} can't be played now: ${why}`,
    /** The tag on the VITAE ring when a refused line's SACRIFICE cannot be paid. */
    floorTag: (cost: number) => `SACRIFICE ${cost}`,
    /** The VITAE ring's label during that callout. */
    floorA11y: (vitae: number, max: number, cost: number) =>
        `VITAE ${vitae} of ${max}. SACRIFICE ${cost} would leave you below 1.`,
    /** A refused APPLY on a PAID line whose random discard cannot be paid. */
    discardShort: (name: string, discard: number, held: number) =>
        `${name} can't be played: it discards ${discard}, you hold ${held} other card${held === 1 ? '' : 's'}`,
    /** End turn held while such a play is staged. */
    endHeld: (name: string, discard: number, held: number) =>
        `End turn held: ${name} discards ${discard}, you hold ${held} other card${held === 1 ? '' : 's'}. Unstage it or take its die off`,
});
export interface CombatSignatureVM {
    id: string; name: string; description: string; cost: number; affordable: boolean; icon: string;
    /** The refusal reason while the rune can't fire (null when castable):
     *  the engine's `signatureCastBlock` — Conviction short, or The Open Hand
     *  on a foe that can't be befriended yet. A refusal outranks a Conviction
     *  shortfall, so the reason names what more Conviction would not fix. */
    reason?: string | null;
    /** Refused for a reason other than Conviction (Float-Eye will not be
     *  befriended, not yet low enough to spare, already counts twice): the
     *  column marks it apart from a rune that is merely short of ◆. */
    refused?: boolean;
}
/**
 * The momentum chain chip. Momentum is a single chain `{ color, length }`. A BREAK collapses it to null and the chip must
 * teach that LOUDLY; a SURGE forges a temporary gold die and also resets. Both
 * transient states are derived from the event log (the null value alone can't
 * tell an empty chain from a just-broken one).
 */
export interface CombatMomentumV2VM {
    /** The chain's live color (the last chained stance), or null when no chain. */
    color: WheelStance | null;
    /** The chain length (0 when null; 1..surgeAt-1 while building). */
    length: number;
    /** The filled links IN PLAY ORDER (derived from color+length via the chain
     *  order) — e.g. heart→body reads ['heart','body'], so each lit node keeps
     *  the stance that was actually played, not the chain's current color. */
    chain: WheelStance[];
    /** The chain length that surges (`MOMENTUM_SURGE_LENGTH`). */
    surgeAt: number;
    /** The stance that ADVANCES the chain next (null when no chain). */
    next: WheelStance | null;
    /** LOUD state — the chain just BROKE to null. */
    broke: boolean;
    /** Celebratory state — the chain just SURGED (gold die granted). */
    surged: boolean;
    /** The chain color's palette hex (neutral when null). */
    colorHex: string;
    a11y: string;
}
/** One die's gear slot in the rail + inspection VM. */
export interface CombatDieGearSlotVM {
    color: 'heart' | 'body' | 'mind' | 'wild';
    label: string;   // 'HEART' / 'WILD'
    glyph: string;
    colorHex: string;
    specialFaces: number;
    manaFaces: number;
    missFaces: number;
    specialConviction: number;
    /** Terse face table, e.g. '1 special · 2 mana · 3 miss'. */
    faceTable: string;
    /** Payload text for the BOON face, e.g. '+2 ◆'. */
    payload: string;
    /** True when this slot's gear differs from the stock default (upgraded). */
    upgraded: boolean;
    a11y: string;
}
/** The 4-slot die-gear rail. */
export interface CombatDieGearRailVM {
    slots: CombatDieGearSlotVM[];   // heart, body, mind, wild (rail order)
}
export interface CombatViewModel {
    phase: CombatEncounterState['phase'];
    enemy: CombatEnemyPaneVM;
    player: CombatPlayerPaneVM;
    dice: CombatDieVM[];
    diceRolled: boolean;        // a turn pool exists
    conviction: number;
    signatures: CombatSignatureVM[];
    hand: CombatCardVM[];
    /** Room left in the Reserve (drives the bank-or-burn chip). */
    reserveRoom: boolean;
    /** The encounter's Resonance tally (thresholds key off this). */
    resonance: { heart: number; body: number; mind: number };
    ledger: ('clear' | 'overwhelmed' | 'pending')[];
    phaseBadge: string;
    roundLabel: string;
    turnLabel: string;
    /** The HUD's one-line clock beside the foe's name, built whole here so
     *  the board prints it as given (CRITIQUE pass 88). */
    metaLine: string;
    deckCount: number;
    discardCount: number;
    /** Discard-pile card ids + names, for the REPRISE songbook picker. */
    discardCards: { id: string; name: string }[];
    /** The momentum chain chip. */
    momentumV2: CombatMomentumV2VM;
    /** The die-gear rail. */
    dieGear: CombatDieGearRailVM;
    /** Globals in play, with their turns left. */
    globals: CombatGlobalVM[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function currentPhase(state: CombatEncounterState): CombatThreatPhase | undefined {
    return state.threatPhases[Math.min(state.currentPhaseIndex, state.threatPhases.length - 1)];
}

function chips(effects: { effectId: string; intensity: number; remainingDuration: number }[]): CombatEffectChipVM[] {
    return effects.map(ae => {
        const def = lookupEffect(ae.effectId) ?? { id: ae.effectId };
        const glyph = effectGlyph(def as Parameters<typeof effectGlyph>[0]);
        const kw = keywordForEffect(ae.effectId);
        return {
            effectId: ae.effectId, intensity: ae.intensity, duration: ae.remainingDuration,
            // Show the keyword on the chip's label (a11y/tooltip) instead of the thematic name.
            glyph: kw ? { ...glyph, label: kw } : glyph,
            gloss: keywordGloss(kw),
        };
    });
}

/** Maps a phase's branch payload to the fork telegraph (null if linear). */
function branchVM(phase: CombatThreatPhase | undefined): CombatIntentBranchVM | null {
    const b = phase?.branch;
    if (!b) return null;
    return {
        condition: b.conditionText,
        thenText: b.then.threatAction.description,
        elseText: b.else.threatAction.description,
        taken: b.taken ?? null,
    };
}

/** `buildThreatAction` prints `${actionText} (${parts}).` — keep the sentence,
 *  drop the payload parenthetical (the log narrates the payload through its own
 *  damage and status lines). A description in any other shape falls through
 *  unchanged. */
export function stripThreatPayload(description: string): string {
    const m = /^(.*?)\s*\([^()]*\)\.?$/.exec(description.trim());
    return (m ? m[1] : description.replace(/\.$/, '')).trim();
}

/**
 * The combat log's sentence for the event kinds no other surface narrates:
 * a foe entering a STAGE, a foe healing, and a refused action. This is the
 * mapping, and the only place the words live.
 *
 * `text` is the log sentence; `float` is the short token the battlefield rises
 * over the combatant (null = log only), so the two surfaces can never drift
 * apart. Events with no line here (damage, DoT ticks, status applications)
 * are narrated by `selectCombatLogHistory` and the float layer. "Absent
 * because it is handled elsewhere" is only honest when the other surface
 * actually exists and can be named; a kind with no arm anywhere is one no
 * surface narrates.
 */
export interface CombatLogLineVM {
    kind: CombatEvent['kind'];
    text: string;
    float: string | null;
    color: string;
    /** The pane the beat belongs to — the foe's, or yours. */
    side: 'enemy' | 'player';
}

const LOG_STAGE_COLOR = HUE.goldAccent;

/** The foe's MERCY and its clock, as one log sentence. */
function mercyClockText(total: number, turnsLeft: number): string {
    return `The foe's MERCY is ${total}; it bursts in ${turnsLeft} turn${turnsLeft === 1 ? '' : 's'}.`;
}

/**
 * Display names for a damage source that is not a card: the engine tags a
 * MERCY burst's hit with the pseudo card id `mercy`.
 */
const DAMAGE_SOURCE_NAMES: Readonly<Record<string, string>> = {
    mercy: 'Mercy burst',
};

export function selectCombatLogLines(events: readonly CombatEvent[]): CombatLogLineVM[] {
    const out: CombatLogLineVM[] = [];
    for (const e of events) {
        switch (e.kind) {
            // The loud one. A foe crossing a stage threshold is a different
            // fight from the one you started, and it is announced as such.
            case 'stage-entered':
                out.push({
                    kind: e.kind, side: 'enemy', color: LOG_STAGE_COLOR,
                    text: `‡ ${e.name.toUpperCase()} ‡ ${e.text}`,
                    float: `‡ ${e.name.toUpperCase()} ‡`,
                });
                break;
            // The Merciful. RADIANCE heals you, then hits for what it restored;
            // MERCY heals the foe and counts down; the burst is the hit. Every
            // amount is VITAE actually removed or restored.
            case 'radiance-struck':
                out.push({
                    kind: e.kind, side: 'player', color: GLYPH_COLORS.statup,
                    text: e.healed > 0
                        ? `RADIANCE heals you ${e.healed} and hits for ${e.amount}.`
                        : 'RADIANCE finds nothing to heal.',
                    float: null,
                });
                break;
            case 'mercy-added':
                out.push({
                    kind: e.kind, side: 'enemy', color: GLYPH_COLORS.statup,
                    text: `MERCY +${e.amount}${e.healed > 0 ? `, healing the foe ${e.healed}` : ''}. ${mercyClockText(e.total, e.turnsLeft)}`,
                    float: `MERCY +${e.amount}`,
                });
                break;
            case 'mercy-ticked':
                out.push({
                    kind: e.kind, side: 'enemy', color: GLYPH_COLORS.statup,
                    text: mercyClockText(e.total, e.turnsLeft),
                    float: null,
                });
                break;
            case 'mercy-burst':
                out.push({
                    kind: e.kind, side: 'enemy', color: INTENT_ICONS.damage.color,
                    text: `The foe's MERCY ${e.total} bursts for ${e.amount}.`,
                    float: `MERCY bursts −${e.amount}`,
                });
                break;
            // The foe's bar climbing gets a line saying WHY. Zero-amount heals
            // never emit, so no guard is needed here.
            case 'enemy-healed': {
                const why = e.source === 'STAGE' ? 'The new STAGE restores' : 'Its threat restores';
                out.push({
                    kind: e.kind, side: 'enemy', color: GLYPH_COLORS.statup,
                    text: `${why} — VITAE +${e.amount}.`,
                    float: `+${e.amount}`,
                });
                break;
            }
            // A refused action, in the engine's OWN words (`need 2 ◆ Conviction
            // (have 0)`) — never re-worded or re-cased here, or the two
            // vocabularies drift. Log-only: this fires from two dozen sites
            // (an empty discard, no glyph to charge, an unaffordable
            // signature), and a float would carpet the board on every mis-tap.
            case 'effect-fizzled':
                out.push({
                    kind: e.kind, side: 'player', color: GUARD_COLOR,
                    text: `Refused — ${e.message}.`,
                    float: null,
                });
                break;
            // The weather moving. A rise floats its word over the foe; a fall
            // (the round's drift, a spend) is log-only, so the drift does not
            // carpet the board every round.
            case 'weather-changed':
                out.push(weatherLine(e));
                break;
            case 'blizzard-softened':
                out.push({
                    kind: e.kind, side: 'player', color: HUE.guardBlue,
                    text: `BLIZZARD takes ${e.amount} off its attack.`,
                    float: null,
                });
                break;
            // The spikes. Each hit back floats its number over the foe (the
            // engine sends it as its own event, not a damage-dealt); a rise
            // is your side of the log, the drift and an expiry log-only.
            case 'spike-struck':
                out.push({
                    kind: e.kind, side: 'enemy', color: SPIKE_WORD[e.spike].color,
                    text: `${SPIKE_WORD[e.spike].name} deals ${e.amount} back to the foe.`,
                    float: `${SPIKE_WORD[e.spike].name} −${e.amount}`,
                });
                break;
            case 'spikes-changed': {
                const line = spikeLine(e);
                if (line) out.push(line);
                break;
            }
            default:
                break;
        }
    }
    return out;
}

/** The log names of the weather's elements. */
const WEATHER_WORD: Record<WeatherElement, { name: string; owner: string; side: 'enemy' | 'player'; color: string }> = {
    'foe-inferno': { name: 'INFERNO', owner: "The foe's", side: 'enemy', color: HUE.damageRed },
    'your-inferno': { name: 'INFERNO', owner: 'Your', side: 'player', color: HUE.damageRed },
    blizzard: { name: 'BLIZZARD', owner: "The foe's", side: 'enemy', color: HUE.guardBlue },
    storm: { name: 'STORM', owner: "The foe's", side: 'enemy', color: HUE.goldAccent },
    frozen: { name: 'FROZEN', owner: 'The foe is', side: 'enemy', color: HUE.hzBlueLite },
};

function weatherLine(e: Extract<CombatEvent, { kind: 'weather-changed' }>): CombatLogLineVM {
    const w = WEATHER_WORD[e.element];
    const base = { kind: e.kind, side: w.side, color: w.color };
    if (e.element === 'frozen') {
        return e.to > 0
            ? { ...base, text: 'The foe is FROZEN: the next DEAL it takes is doubled.', float: '✻ FROZEN' }
            : { ...base, text: 'FROZEN ends.', float: null };
    }
    // Your INFERNO rides your side of the board, so it never floats over the foe.
    const float = (rise: string) => (w.side === 'enemy' ? rise : null);
    if (e.from === 0) return { ...base, text: `${w.owner} ${w.name} ${e.to}.`, float: float(`${w.name} ${e.to}`) };
    if (e.to === 0) return { ...base, text: `${w.owner} ${w.name} is gone.`, float: null };
    if (e.to > e.from) {
        return { ...base, text: `${w.owner} ${w.name} rises to ${e.to}.`, float: float(`${w.name} +${e.to - e.from}`) };
    }
    return { ...base, text: `${w.owner} ${w.name} falls to ${e.to}.`, float: null };
}

/** The log names of the spikes. */
const SPIKE_WORD: Record<'thorns' | 'reflect', { name: string; color: string }> = {
    thorns: { name: 'THORNS', color: HUE.damageRed },
    reflect: { name: 'REFLECT', color: HUE.hzBlueLite },
};

/**
 * One spikes-changed event as a log line, or null. THORNS and REFLECT's %
 * read their rise, fall and expiry; REFLECT's turns read only as they run
 * down (a refresh rides the % line, and the expiry is REFLECT's own line).
 */
function spikeLine(e: Extract<CombatEvent, { kind: 'spikes-changed' }>): CombatLogLineVM | null {
    const base = { kind: e.kind, side: 'player' as const, float: null };
    if (e.spike === 'reflect-turns') {
        if (e.to <= 0 || e.to >= e.from) return null;
        return { ...base, color: SPIKE_WORD.reflect.color, text: `Your REFLECT has ${e.to} turn${e.to === 1 ? '' : 's'} left.` };
    }
    const w = SPIKE_WORD[e.spike];
    const n = (v: number) => (e.spike === 'reflect' ? `${v}%` : `${v}`);
    const base2 = { ...base, color: w.color };
    if (e.to === 0) return { ...base2, text: `Your ${w.name} is gone.` };
    if (e.from === 0) return { ...base2, text: `Your ${w.name} ${n(e.to)}.` };
    if (e.to > e.from) return { ...base2, text: `Your ${w.name} rises to ${n(e.to)}.` };
    return { ...base2, text: `Your ${w.name} falls to ${n(e.to)}.` };
}

// ── The persistent combat log ───────────────────────────────────────────────
//
// A floating token dies in ~1s, so the log is how the player reconstructs
// what just happened. `selectCombatLogHistory` walks the FULL event stream
// (`state.log`) and produces an ordered, human-readable line per beat,
// grouped by turn.
//
// It reuses `selectCombatLogLines` for every event kind that already has a
// sentence (stage-entered, enemy-healed, effect-fizzled) and adds the kinds
// that function omits — the raw damage/DoT/card/threat beats a FLOAT
// carries.

export interface CombatLogHistoryEntryVM {
    id: string;
    /** The pane the line reads over — 'system' for turn dividers and the
     *  dice-tray summary, which belong to neither combatant. */
    side: 'enemy' | 'player' | 'system';
    color: string;
    text: string;
}

/** The log toggle's copy — never hardcoded in the component (house style:
 *  no player-facing copy lives in a component). */
export const COMBAT_LOG_TOGGLE_TEXT = 'LOG';
export const COMBAT_LOG_TOGGLE_A11Y = 'Open the combat log';
export const COMBAT_LOG_CLOSE_A11Y = 'Close the combat log';
/** The log view's way back to the pilgrim's stats (the log lives in the
 *  pilgrim modal). */
export const COMBAT_LOG_BACK_TEXT = '‹ BACK';

/** Long fights scroll early turns off rather than growing the sheet forever. */
const LOG_HISTORY_CAP = 200;

export function selectCombatLogHistory(state: CombatEncounterState, beaten = false): CombatLogHistoryEntryVM[] {
    const events = state.log ?? [];
    const out: CombatLogHistoryEntryVM[] = [];
    let seq = 0;
    let lastTurn: number | null = null;
    // A draw is narrated only when a card made it (DRAW): the turn's refill
    // draw arrives before any card is played.
    let midPlay = false;
    const push = (side: CombatLogHistoryEntryVM['side'], color: string, text: string) => {
        seq += 1;
        out.push({ id: `log-${seq}`, side, color, text });
    };
    for (const e of events) {
        switch (e.kind) {
            // A turn boundary — the divider, then the tray's own dice summary.
            // Derived off the same event: `startTurn` emits exactly one of
            // these per turn, so a changed `turn` field IS the turn changing.
            case 'turn-dice-rolled': {
                midPlay = false;
                if (e.turn !== lastTurn) {
                    lastTurn = e.turn;
                    push('system', LOG_STAGE_COLOR, `TURN ${e.turn}`);
                }
                const dice = e.dice
                    .map((d) => `${STANCE_LABELS[d.color] ?? d.color.toUpperCase()}${d.face ? ` ${d.face}` : ''}`)
                    .join(', ');
                push('system', GUARD_COLOR, `Turn ${e.turn}. Dice: ${dice}.`);
                break;
            }
            case 'damage-dealt': {
                const named = getCardById(e.cardId)?.name ?? DAMAGE_SOURCE_NAMES[e.cardId];
                const suffix = named ? ` (${named})` : '';
                if (e.target === 'enemy') push('enemy', INTENT_ICONS.damage.color, `You deal ${e.amount}${suffix}.`);
                else push('player', INTENT_ICONS.damage.color, `It deals ${e.amount} to you${suffix}.`);
                break;
            }
            case 'dot-tick': {
                const side = e.target === 'enemy' ? 'enemy' as const : 'player' as const;
                const who = e.target === 'enemy' ? 'the foe' : 'you';
                const color = dotTickColor(e.effectId);
                if (e.target === 'self' && e.effectId === 'inferno') push(side, color, `Your INFERNO burns you for ${e.amount}.`);
                else push(side, color, `${e.label} ticks for ${e.amount} on ${who}.`);
                break;
            }
            case 'effect-landed': {
                const side = e.target === 'enemy' ? 'enemy' as const : 'player' as const;
                const who = e.target === 'enemy' ? 'the foe' : 'you';
                const glyph = effectGlyph(e.effect);
                const name = e.effect.name ?? glyph.label;
                push(side, glyph.color, `${name}${e.intensity > 1 ? ` ×${e.intensity}` : ''} lands on ${who}.`);
                break;
            }
            case 'card-played': {
                midPlay = true;
                const card = getCardById(e.cardId);
                const name = card?.name ?? e.cardId;
                const color = (card && STANCE_COLORS[card.color]) ?? GUARD_COLOR;
                push('player', color, `${name} — ${e.dieId === null ? 'FREE' : 'die-powered'}.`);
                break;
            }
            case 'threat-fired':
                midPlay = false;
                {
                // An unbeaten foe's DANGER fires nameless, as its telegraph did.
                const fired = state.threatPhases[e.phaseIndex - 1];
                const hidden = fired?.enemyMove?.kind === 'danger' && !beaten;
                push('enemy', GLYPH_COLORS.control, hidden ? 'DANGER.' : stripThreatPayload(e.description));
            }
                break;
            case 'hand-drawn':
                if (midPlay && e.cards.length > 0) {
                    push('player', GUARD_COLOR, `You DRAW ${e.cards.length} card${e.cards.length === 1 ? '' : 's'}.`);
                }
                break;
            // 'overwhelmed' phases already read through 'threat-fired'; the
            // DENIED half of the story (mark === 'clear') is otherwise silent.
            case 'phase-resolved':
                midPlay = false;
                if (e.mark === 'clear') {
                    push('player', GLYPH_COLORS.statup, `PHASE ${e.phaseIndex} — DENIED.`);
                }
                break;
            case 'signature-cast':
                push('player', GOLD_ACCENT, `${e.name} — Signature, ◆${e.cost}.`);
                break;
            case 'barrier-absorbed':
                push('player', GUARD_COLOR, `Barrier absorbs ${e.amount}.`);
                break;
            // The program verbs (SACRIFICE, HEAL, Globals, EXILE, Curses).
            case 'vitae-sacrificed': {
                const named = getCardById(e.cardId)?.name ?? e.cardId;
                push('player', INTENT_ICONS.damage.color, e.amount > 0
                    ? `You SACRIFICE ${e.amount} VITAE (${named}).`
                    : `Your SACRIFICE ${e.counted} is WAIVED (${named}).`);
                break;
            }
            case 'player-healed': {
                const named = getCardById(e.cardId)?.name;
                push('player', GLYPH_COLORS.statup, `You HEAL ${e.amount}${named ? ` (${named})` : ''}.`);
                break;
            }
            case 'global-entered': {
                const named = getCardById(e.cardId)?.name ?? e.cardId;
                push('player', GOLD_ACCENT, `${named} enters play ${e.turnsLeft === null ? 'for the rest of combat' : `for ${e.turnsLeft} turns`}.`);
                break;
            }
            case 'global-left':
                push('player', GUARD_COLOR, `${getCardById(e.cardId)?.name ?? e.cardId} leaves play.`);
                break;
            case 'card-exiled':
                push('player', GUARD_COLOR, `${getCardById(e.cardId)?.name ?? e.cardId} is EXILED for this combat.`);
                break;
            case 'card-unexiled':
                push('player', GUARD_COLOR, `${getCardById(e.cardId)?.name ?? e.cardId} returns from EXILE to your draw pile.`);
                break;
            case 'cards-discarded':
                if (e.cardIds.length > 0) push('player', GUARD_COLOR, `You discard ${cardNames(e.cardIds)} at random.`);
                break;
            case 'cards-retrieved':
                if (e.cardIds.length > 0) push('player', GUARD_COLOR, `You RETRIEVE ${cardNames(e.cardIds)}.`);
                break;
            case 'curse-added':
                push('player', GLYPH_COLORS.control, `${e.count === 1 ? 'A Curse' : `${e.count} Curses`} enter your hand.`);
                break;
            default: {
                // Every kind `selectCombatLogLines` already narrates — one
                // source of copy, never a forked duplicate.
                const [line] = selectCombatLogLines([e]);
                if (line) push(line.side, line.color, line.text);
                break;
            }
        }
    }
    return out.length > LOG_HISTORY_CAP ? out.slice(out.length - LOG_HISTORY_CAP) : out;
}

/** Card names for a log line: "Blow", "Blow and Ward", "Blow, Ward and Word". */
function cardNames(ids: readonly string[]): string {
    const names = ids.map((id) => getCardById(id)?.name ?? id);
    return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The reveal's collapsed phase header: "PHASE 2 · ATTACKS · 13". Since R2
 *  most phases share one intent, so the damage is what tells them apart and
 *  shows the fight escalating without opening each row. A branch phase omits
 *  it: its face is only the baseline fork, and the open row reads both. */
export function threatPhaseHeader(phase: CombatThreatPhase, beaten = false): { text: string; a11y: string } {
    const label = INTENT_ICONS[phase.intentType ?? 'pass'].label;
    if (phase.enemyMove) {
        // A `phases` foe: a kind and a name, no figure.
        const name = telegraphName(phase, beaten);
        return {
            text: `PHASE ${phase.index} · ${label}${name ? ` · ${name}` : ''}`,
            a11y: `Phase ${phase.index}, ${label}${name ? `, ${name}` : ''}`,
        };
    }
    const damage = phase.branch
        ? 0
        : phase.threatAction.effects.reduce((s, e) => s + (e.damage ?? 0), 0);
    return {
        text: `PHASE ${phase.index} · ${label}${damage > 0 ? ` · ${damage}` : ''}`,
        a11y: `Phase ${phase.index}, ${label}${damage > 0 ? `, ${damage} damage` : ''}`,
    };
}

const LEDGER_WORD: Record<CombatViewModel['ledger'][number], string> = {
    clear: 'cleared', overwhelmed: 'overwhelmed', pending: 'ahead',
};

/**
 * The dock ledger's screen-reader line. The marks are glyphs only, so the
 * row speaks once, naming each run of phases by its mark.
 *
 * @example ledgerA11y(['clear', 'overwhelmed', 'pending', 'pending', 'pending'])
 * // 'Phases: 1 cleared, 2 overwhelmed, 3 to 5 ahead'
 */
export function ledgerA11y(ledger: CombatViewModel['ledger']): string {
    const runs: string[] = [];
    for (let i = 0; i < ledger.length;) {
        let j = i;
        while (j + 1 < ledger.length && ledger[j + 1] === ledger[i]) j++;
        const span = j === i ? `${i + 1}` : j === i + 1 ? `${i + 1} and ${j + 1}` : `${i + 1} to ${j + 1}`;
        runs.push(`${span} ${LEDGER_WORD[ledger[i]]}`);
        i = j + 1;
    }
    return runs.length > 0 ? `Phases: ${runs.join(', ')}` : 'Phases: none';
}

/** The intent of a `phases` foe: the move's kind and name, every number left out. */
function phasesIntentVM(state: CombatEncounterState, cur: CombatThreatPhase, beaten: boolean): CombatIntentVM {
    const type = (cur.intentType ?? 'unknown') as CombatIntentType;
    const meta = INTENT_ICONS[type];
    const moveName = telegraphName(cur, beaten);
    const nextIndex = nextEnemyPhaseIndex(state.threatPhases, state.currentPhaseIndex, state.enemy);
    const nextPhase = nextIndex === null ? undefined : state.threatPhases[nextIndex];
    const next = nextPhase
        ? (() => {
            const t = (nextPhase.intentType ?? 'unknown') as CombatIntentType;
            const m = INTENT_ICONS[t];
            return { type: t, icon: m.icon, label: m.label, branch: null, moveName: telegraphName(nextPhase, beaten) };
        })()
        : null;
    return {
        type, icon: meta.icon, label: meta.label, color: meta.color,
        description: moveName ?? '', moveName, damage: 0, debuffs: false,
        branch: null, next,
        wallMath: { projectedDamage: 0, netDamage: 0, willDeny: false, guard: 0, barrier: 0, blizzardCut: 0 },
    };
}

function intentVM(state: CombatEncounterState, beaten: boolean): CombatIntentVM {
    const cur = currentPhase(state);
    if (cur?.enemyMove && hasEnemyPhases(state.enemy)) return phasesIntentVM(state, cur, beaten);
    const type = (cur?.intentType ?? 'pass') as CombatIntentType;
    const meta = INTENT_ICONS[type];
    const nextPhase = state.threatPhases[state.currentPhaseIndex + 1];
    const next = nextPhase && !cur?.isFinalPhase
        ? (() => { const t = (nextPhase.intentType ?? 'pass') as CombatIntentType; const m = INTENT_ICONS[t]; return { type: t, icon: m.icon, label: m.label, branch: branchVM(nextPhase), moveName: null }; })()
        : null;
    const effects = cur?.threatAction.effects ?? [];
    const damage = effects.reduce((s, e) => s + (e.damage ?? 0), 0);
    const debuffs = effects.some((e) => !!e.effectId);
    const threat = projectIncomingThreat(state);
    return {
        type, icon: meta.icon, label: cur?.intentLabel ?? meta.label, color: meta.color,
        description: cur?.threatAction.description ?? '', moveName: null, damage, debuffs,
        branch: branchVM(cur), next,
        wallMath: {
            projectedDamage: threat.projectedDamage, netDamage: threat.netDamage,
            willDeny: threat.willDeny, guard: threat.guard, barrier: threat.barrier,
            blizzardCut: threat.blizzardCut,
        },
    };
}

function enemyPane(state: CombatEncounterState, beaten: boolean): CombatEnemyPaneVM {
    const e = state.enemy;
    const isBoss = e.difficulty === 'boss' || e.difficulty === 'unique'
        || (e.tags ?? []).includes('boss') || (e.tags ?? []).includes('unique');
    // Pure selector, no state mutation; safe to call once
    // per render off the same encounter state the rest of the pane reads.
    const lethality = projectCombatOutcome(state);
    return {
        name: e.name,
        artKey: e.portraitAsset ?? e.id,
        artNonce: state.seed ?? 0,
        isBoss,
        hp: Math.max(0, e.health), maxHp: e.maxHealth,
        hpPct: e.maxHealth > 0 ? Math.max(0, e.health) / e.maxHealth : 0,
        effects: [...chips(e.effects), ...programChips(state), ...weatherChips(state, 'enemy'), ...enemyWordChips(state, 'enemy')],
        intent: intentVM(state, beaten),
        stagesEntered: (state.stagesEntered ?? []).length,
        pendingDot: lethality.pendingDot,
        roundsToKill: lethality.roundsToKill,
        isLethalInFlight: lethality.isLethalInFlight,
        dangers: (e.phases ?? []).flatMap((p, i) => (i > 0 && p.danger
            ? [{ phase: i + 1, name: beaten ? p.danger.name : null }]
            : [])),
    };
}

function playerPane(state: CombatEncounterState): CombatPlayerPaneVM {
    const p = state.player;
    return {
        name: p.name ?? 'You', hp: Math.max(0, p.health), maxHp: p.maxHealth,
        hpPct: p.maxHealth > 0 ? Math.max(0, p.health) / p.maxHealth : 0,
        guard: state.guard ?? 0,
        effects: [...chips(p.effects), ...weatherChips(state, 'player'), ...spikeChips(state), ...enemyWordChips(state, 'player')],
    };
}

function diceVM(state: CombatEncounterState): CombatDieVM[] {
    // OVERHEAT — colors whose die was forced all-miss this round (`turn` is
    // the crack's bite turn; one turn == one round). Derived inline.
    const crackedColors = new Set<string>(
        (state.crackedDice ?? []).filter(c => c.turn === state.turn).map(c => c.color),
    );
    const tray: CombatDieVM[] = state.dice.map((d: CombatManaDie) => {
        const spent = d.state === 'spent';
        const isX = d.color === 'x';
        const floating = d.floating === true;
        // The rolled face: `mana`/`special` power a card, `miss` is DEAD.
        const face = d.face;
        const isMiss = face === 'miss';
        const cracked = crackedColors.has(d.color);
        return {
            id: d.id, color: d.color, colorHex: STANCE_COLORS[d.color] ?? HUE.fallbackGrey,
            glyph: DIE_GLYPHS[d.color] ?? '?', stanceLabel: STANCE_LABELS[d.color] ?? '?',
            spent, isX,
            // The board must know a floating die from a turn die.
            floating: floating || undefined,
            // Every live die drags until it is spent; a MISS face and an X die
            // are DEAD — never draggable. NEVER a function of live drag state
            // (see the CombatDieVM.draggable doc note).
            draggable: !isMiss && !isX && !spent,
            ...(face ? { face } : {}),
            ...(cracked ? { cracked: true } : {}),
        };
    });
    // The Reserve renders in the same tray as a second power source.
    const banked: CombatDieVM[] = (state.reserve ?? []).map((d: CombatManaDie) => ({
        id: d.id, color: d.color, colorHex: STANCE_COLORS[d.color] ?? HUE.fallbackGrey,
        glyph: DIE_GLYPHS[d.color] ?? '?', stanceLabel: STANCE_LABELS[d.color] ?? '?',
        spent: false, isX: false,
        reserve: true, pips: d.pips ?? 0,
        draggable: true,
    }));
    return [...tray, ...banked];
}

// ── Honest card view-models (face + detail) ──────────────────────────────────

type EffectPayloadLike = {
    damageOverTime?: { damagePerRound: number; trigger?: string };
    actionRestriction?: { skipTurn?: boolean };
    damageTakenMult?: number;   // debuff_vulnerable / debuff_vulnerability_* → Vulnerable (>1) / buff_resolute → Resolute (<1)
    // ── The themed-deck payload keys ──
    tickAmplifyFlat?: number;      // debuff_mark → +N per DoT tick per stack
    outgoingDamageMulPct?: number; // debuff_quarter → the enemy deals N% less damage (<0)
};

/** THE single forward-compat honesty gate: the kind of HONEST, engine-read effect,
 *  or null for effects the live HP engine still doesn't quantify (→ greyed, number-
 *  less). */
export function engineHonestKind(
    effectId: string | null | undefined,
): 'dot' | 'stun' | 'weaken' | 'vulnerable' | 'mark' | 'resolute'
    | null {
    if (!effectId) return null;
    const e = lookupEffect(effectId);
    if (!e) return null;
    const p = (e.payload ?? {}) as EffectPayloadLike;
    if (p.damageOverTime) return 'dot';
    if (p.actionRestriction?.skipTurn) return 'stun';
    // The themed-deck payloads, all engine-read (honest): MARK amplifies
    // every DoT tick; QUARTER (negative outgoing-damage %) weakens the
    // enemy's hits.
    if ((p.tickAmplifyFlat ?? 0) > 0) return 'mark';
    if ((p.outgoingDamageMulPct ?? 0) < 0) return 'weaken';
    // Damage-amp is read by the live HP engine, so it's honest.
    if ((p.damageTakenMult ?? 1) > 1) return 'vulnerable';
    if ((p.damageTakenMult ?? 1) < 1) return 'resolute';      // real % dmg-taken reduction
    return null;
}

function glyphFor(effectId: string): string {
    const e = lookupEffect(effectId);
    return e ? effectGlyph(e as Parameters<typeof effectGlyph>[0]).glyph : '◆';
}

interface PrimaryResolution {
    kind: CombatCardKind;
    ce: CardCombatEffects | null;
    guardAmount: number | null;
    riders: CardCombatEffects[];
    /** The driving special mechanic for the mechanic-led kind; null for
     *  effect- or verb-driven kinds. */
    mech: CardSpecialMechanic | null;
}

/** Resolve a card's PRIMARY combat effect + its kind. Reads the sourceCard's
 *  combatEffects / specialMechanics directly — NOT card.primaryEffectId, which is
 *  null for guard/regen cards (it = primaryEnemyEffectId). */
export function resolvePrimary(card: CombatCard, sourceCard: Card | undefined): PrimaryResolution {
    const vc = card.verbClass;
    const mechs = sourceCard?.specialMechanics ?? [];
    const findMech = <K extends CardSpecialMechanic['kind']>(k: K) =>
        mechs.find(m => m.kind === k) as Extract<CardSpecialMechanic, { kind: K }> | undefined;

    if (vc === 'defend') {
        const g = findMech('guard');
        return { kind: 'guard', ce: null, guardAmount: g?.amount ?? 0, riders: [], mech: null };
    }
    if (vc === 'befriend') return { kind: 'befriend', ce: null, guardAmount: null, riders: [], mech: null };
    if (vc === 'direct-damage') {
        // DEAL is the card's paid identity: headline the mechanic.
        const led = headlineMechanic(mechs);
        if (led) return { kind: 'mechanic', ce: null, guardAmount: null, riders: [], mech: led };
        return { kind: 'inert', ce: null, guardAmount: null, riders: [], mech: null };
    }
    if (vc === 'buff-self') {
        const self = (sourceCard?.combatEffects ?? []).filter(e => e.appliedTo === 'self');
        // A self-buff that reduces damage taken (Resolute) is real.
        const resolute = self.find(s => engineHonestKind(s.effectId) === 'resolute');
        if (resolute) return { kind: 'resolute', ce: resolute, guardAmount: null, riders: self.filter(s => s !== resolute), mech: null };
        // Not a recognised self-EFFECT — headline the driving MECHANIC. The
        // self effects (e.g. a self-cost MARK) ride along as keyword chips.
        const led = headlineMechanic(mechs);
        if (led) return { kind: 'mechanic', ce: null, guardAmount: null, riders: self, mech: led };
        const primary = self[0] ?? null;
        return { kind: 'inert', ce: primary, guardAmount: null, riders: self.filter(s => s !== primary), mech: null };
    }
    // direct-dot | direct-control | stat-debuff → opponent effects
    const opp = (sourceCard?.combatEffects ?? []).filter(e => e.appliedTo === 'opponent');
    // A self-cost/self-buff effect riding a card classified by its opponent
    // effect (e.g. a Resolute alongside a DoT) is surfaced as a rider too, so
    // its keyword shows in the inspect modal.
    const selfFx = (sourceCard?.combatEffects ?? []).filter(e => e.appliedTo === 'self');
    const primary = opp.find(o => engineHonestKind(o.effectId)) ?? opp[0] ?? null;
    const k = engineHonestKind(primary?.effectId);
    const kind: CombatCardKind =
        k === 'dot' ? 'dot'
            : k === 'stun' ? 'stun'
                : k === 'weaken' ? 'weaken'
                    : k === 'vulnerable' ? 'vulnerable'
                        : k === 'mark' ? 'mark'
                            : 'inert';
    // A card classified by verb (DEAL, GUARD) with no
    // engine-honest opponent EFFECT lands here as 'inert'. Headline its driving
    // MECHANIC instead of the ambiguous fallback; the effects ride as chips.
    if (kind === 'inert') {
        const led = headlineMechanic(mechs);
        if (led) return { kind: 'mechanic', ce: null, guardAmount: null, riders: [...opp, ...selfFx], mech: led };
    }
    return { kind, ce: primary, guardAmount: null, riders: [...opp.filter(o => o !== primary), ...selfFx], mech: null };
}

interface CardCalc extends PrimaryResolution {
    keyword: string | null;
    glyph: string;
    categoryColor: string;
    perTurn: number; turns: number; total: number;
    freePerTurn: number; freeTurns: number; freeTotal: number;
    skips: number;
    dpr: number; intensity: number; stacks: boolean;
    // The DoT's trigger FAMILY: 'card-played'
    // (poison), 'damage-instance' (bleed), 'payoff', or null for a round-clock
    // DoT. Event-triggered DoTs tick per game event, NOT per turn, so their
    // face/detail must not print the round-clock "total over Nt" fiction.
    dotTrigger: 'card-played' | 'damage-instance' | 'payoff' | null;
    // DOOM: a DoT with NO calendar that grows +1
    // intensity every time the foe acts. "N over 3 turns" is a lie for it
    // (nothing expires, and the bite rises), so the face prints its real clock.
    dotGrowsOnEnemyAction: boolean;
    // ── Authored statics (real units; live swings stay live) ──
    vulnPct: number;       // +N% damage taken (from damageTakenMult)
    markAmp: number;       // MARK: +N per DoT tick per application (tickAmplifyFlat × intensity)
    resolutePct: number;   // real -N% dmg taken (the inverse of vulnPct, negative)
}

/** Single source of the numbers — faceStats AND detailStats both read this, so the
 *  face and the inspect modal can never drift. All values are AUTHORED units from
 *  getCardById(card.id).combatEffects (not effect-library defaults). */
function cardCalc(card: CombatCard, sourceCard: Card | undefined): CardCalc {
    const pr = resolvePrimary(card, sourceCard);
    const out: CardCalc = {
        ...pr, keyword: null, glyph: '◆', categoryColor: PAYOFF_COLOR,
        perTurn: 0, turns: 0, total: 0, freePerTurn: 0, freeTurns: 0, freeTotal: 0,
        skips: 0, dpr: 0, intensity: 1, stacks: false, dotTrigger: null,
        dotGrowsOnEnemyAction: false,
        vulnPct: 0,
        markAmp: 0,
        resolutePct: 0,
    };
    const eff = pr.ce ? lookupEffect(pr.ce.effectId) : undefined;
    switch (pr.kind) {
        case 'dot': {
            const p = (eff?.payload ?? {}) as EffectPayloadLike;
            out.intensity = pr.ce?.intensity ?? 1;
            out.turns = pr.ce?.duration ?? eff?.duration ?? 0;
            out.dpr = p.damageOverTime?.damagePerRound ?? 0;
            out.perTurn = Math.floor(out.dpr * out.intensity);
            // Classify the trigger family so the face/detail describe how
            // the DoT actually ticks (per card / per hit) instead of assuming a
            // round clock. `undefined`/`round-start`/`round-end` = round-clock.
            const trig = p.damageOverTime?.trigger;
            out.dotTrigger = trig === 'card-played' || trig === 'damage-instance' || trig === 'payoff' ? trig : null;
            const clockMods = (p as { dotModifiers?: { calendarExpiry?: false; growth?: string } }).dotModifiers;
            out.dotGrowsOnEnemyAction = clockMods?.growth === 'per-enemy-action'
                && clockMods?.calendarExpiry === false;
            // RAMP-AWARE lifetime totals (canonical poison /
            // unraveling escalate): mirror the engine's exact tick math so the
            // face equals `bottomDamagePreview` (printed == applied).
            const rampMods = (p as { dotModifiers?: { escalatesPerTurn?: boolean; rampFactor?: number } }).dotModifiers;
            const ramp = rampMods?.escalatesPerTurn ? (rampMods.rampFactor ?? 0) : 0;
            const lifetime = (intensity: number, turns: number): number => {
                let sum = 0;
                for (let k = 0; k < turns; k++) sum += Math.floor((out.dpr + Math.floor(ramp * k)) * intensity);
                return sum;
            };
            out.total = lifetime(out.intensity, out.turns);
            out.keyword = keywordForEffect(pr.ce?.effectId);
            out.glyph = pr.ce ? glyphFor(pr.ce.effectId) : '🔥';
            out.categoryColor = GLYPH_COLORS.dot;
            out.stacks = eff?.stacking === 'intensity';
            break;
        }
        case 'stun': {
            out.skips = pr.ce?.duration ?? eff?.duration ?? 1;
            out.keyword = keywordForEffect(pr.ce?.effectId);
            out.glyph = pr.ce ? glyphFor(pr.ce.effectId) : '💫';
            out.categoryColor = GLYPH_COLORS.control;
            break;
        }
        case 'weaken': {
            out.turns = pr.ce?.duration ?? eff?.duration ?? 0;
            out.keyword = keywordForEffect(pr.ce?.effectId);
            out.glyph = pr.ce ? glyphFor(pr.ce.effectId) : '⛓';
            out.categoryColor = GLYPH_COLORS.control;
            break;
        }
        case 'mark': {
            const p = (eff?.payload ?? {}) as EffectPayloadLike;
            out.intensity = pr.ce?.intensity ?? 1;
            out.turns = pr.ce?.duration ?? eff?.duration ?? 0;
            out.markAmp = (p.tickAmplifyFlat ?? 0) * out.intensity;
            out.keyword = keywordForEffect(pr.ce?.effectId) ?? 'Mark';
            out.glyph = pr.ce ? glyphFor(pr.ce.effectId) : '◎';
            out.categoryColor = GLYPH_COLORS.mark;
            out.stacks = eff?.stacking === 'intensity';
            break;
        }
        case 'vulnerable': {
            const p = (eff?.payload ?? {}) as EffectPayloadLike;
            out.intensity = pr.ce?.intensity ?? 1;
            out.turns = pr.ce?.duration ?? eff?.duration ?? 0;
            // The % shown is the engine's real intensity-scaled delta
            // (mult = 1 + (dtm−1) × intensity, uncapped) — not the per-stack figure.
            const dtm = p.damageTakenMult ?? 1;
            out.vulnPct = Math.round((dtm - 1) * out.intensity * 100);
            out.keyword = keywordForEffect(pr.ce?.effectId) ?? 'Vulnerable';
            out.glyph = pr.ce ? glyphFor(pr.ce.effectId) : '◎';
            out.categoryColor = GLYPH_COLORS.statdown;
            out.stacks = eff?.stacking === 'intensity';
            break;
        }
        case 'resolute': {
            const p = (eff?.payload ?? {}) as EffectPayloadLike;
            out.turns = pr.ce?.duration ?? eff?.duration ?? 0;
            out.resolutePct = Math.round(((p.damageTakenMult ?? 1) - 1) * 100);
            out.keyword = keywordForEffect(pr.ce?.effectId) ?? 'Resolute';
            out.glyph = pr.ce ? glyphFor(pr.ce.effectId) : '🛡';
            out.categoryColor = GLYPH_COLORS.statup;
            out.stacks = eff?.stacking === 'intensity';
            break;
        }
        case 'guard':
            out.keyword = 'Guard'; out.glyph = '🛡'; out.categoryColor = GUARD_COLOR; break;
        case 'befriend':
            out.keyword = null; out.glyph = '🕊'; out.categoryColor = BEFRIEND_COLOR; break;
        case 'mechanic': {
            const h = mechanicHeadline(pr.mech);
            out.keyword = h?.keyword ?? null;
            out.glyph = '◆';
            out.categoryColor = PAYOFF_COLOR;
            break;
        }
        case 'inert':
        default:
            out.keyword = keywordForEffect(pr.ce?.effectId);
            out.glyph = eff && pr.ce ? glyphFor(pr.ce.effectId) : '▽';
            out.categoryColor = INERT_COLOR;
            break;
    }
    return out;
}

/** A headline-able special mechanic → its face keyword + real-unit value. THE
 *  generic honesty path: any specialMechanics verb that isn't a self-standing
 *  face kind (guard) resolves here to `KEYWORD · value` instead
 *  of falling through to the ambiguous "DEBUFF / buff yourself" fallback.
 *  `keyword` is Title-Case (matches the glossary); returns null for kinds with
 *  no player headline (pure die-plumbing riders never reach here as primary). */
interface MechHeadline { keyword: string | null; heroText: string; heroSub: string | null; verbLine: string }
function mechanicHeadline(mech: CardSpecialMechanic | null): MechHeadline | null {
    if (!mech) return null;
    const kw = keywordForMechanic(mech.kind);
    switch (mech.kind) {
        case 'deal':
            // DEAL carries NO keyword badge on purpose (`MECHANIC_KEYWORD` has
            // no `deal` row): "Deal 24" is plain English, and shouting it would
            // spend the face's one keyword slot on the verb that needs no
            // explaining. The hero slot says the whole thing instead. The face
            // prints the AUTHORED number; stat and colour scaling land on top.
            return {
                keyword: kw ?? null,
                heroText: `Deal ${mech.amount}`,
                heroSub: 'VITAE',
                verbLine: `strike for ${mech.amount} VITAE`,
            };
        default:
            return null;
    }
}

/** Priority order for WHICH mechanic a multi-mechanic card headlines. GUARD
 *  never headlines here: a defend card is its own face kind. */
const MECH_HEADLINE_PRIORITY: readonly string[] = ['deal'];

/** The single mechanic a card should headline (highest-priority headline-able
 *  entry), or null when none of its mechanics carries a player headline. */
function headlineMechanic(mechs: readonly CardSpecialMechanic[]): CardSpecialMechanic | null {
    for (const kind of MECH_HEADLINE_PRIORITY) {
        const m = mechs.find(x => x.kind === kind);
        if (m && mechanicHeadline(m)) return m;
    }
    return null;
}

function buildDetailKeywords(card: CombatCard, c: CardCalc, sourceCard?: Card): { name: string; def: string; minor: boolean }[] {
    const out: { name: string; def: string; minor: boolean }[] = [];
    const seen = new Set<string>();
    const push = (kw: string | null, minor: boolean) => {
        if (!kw) return;
        const up = kw.toUpperCase();
        if (seen.has(up)) return;
        seen.add(up);
        out.push({ name: up, def: keywordGloss(kw) ?? '', minor });
    };
    if (c.kind === 'guard') push(keywordForVerb(card.verbClass), false);
    else push(c.keyword, c.kind === 'inert');
    // A riposte card also grants Guard — surface it as a secondary keyword.
    // A rider is "minor" only if the engine still doesn't read it (engineHonestKind null).
    for (const r of c.riders) push(keywordForEffect(r.effectId), engineHonestKind(r.effectId) === null);
    // EVERY keyword a card prints must pop a definition, so sweep the whole
    // printed surface, not just the headline:
    // authored statuses, every special-mechanic kind, and any UPPERCASE
    // registry word on the engine lines. The keyword panel IS the popup; a
    // printed keyword without a chip is unexplained vocabulary.
    for (const ce of sourceCard?.combatEffects ?? []) push(keywordForEffect(ce.effectId), false);
    for (const m of sourceCard?.specialMechanics ?? []) push(keywordForMechanic(m.kind), false);
    const printed = [card.topActionText, card.bottomActionText, freeLineText(card, sourceCard)].join(' ');
    for (const kw of keywordsInText(printed)) push(kw, false);
    // A FREE-line rider is applied by the rider path, not a combatEffect, and
    // prints in lowercase — neither sweep above sees it. Sweep the authored
    // free rider's own keyword pairs.
    if (sourceCard?.free) {
        for (const [kw] of riderPairs(sourceCard.free)) {
            const title = kw.charAt(0) + kw.slice(1).toLowerCase();
            if (keywordGloss(title)) push(title, false);
        }
    }
    // No always-on die-face gloss: BOON/HONE/TEMPER resolve through the
    // printed sweep above only when a card's OWN lines name them.
    return out;
}

/** A program card's FACE: the headline of its PAID line (the FREE line's when
 *  the PAID line has none), and the FREE line's silhouette keyword in the
 *  FREE cell. */
function programFaceStats(card: CombatCard, sourceCard: Card): CombatCardFaceVM {
    const lines = programLinesFor(sourceCard);
    const paidHead = programHeadline(lines.paid);
    const head = paidHead.keyword || paidHead.value ? paidHead : programHeadline(lines.free);
    const freeCell = programFreeCell(lines.free);
    return {
        kind: 'program',
        keyword: head.keyword,
        glyph: '◆',
        freeGlyph: freeCell ? FREE_KW_GLYPH[freeCell.keyword] ?? '◆' : '',
        freeGlyphKey: freeCell?.keyword ?? null,
        categoryColor: PAYOFF_COLOR,
        stanceColor: STANCE_COLORS[card.stance] ?? HUE.fallbackGrey,
        heroText: head.value,
        heroSub: null,
        freeHeroText: lines.free,
        freeHeroSub: null,
        freeKeyword: freeCell?.keyword ?? null,
        freeValue: freeCell?.value ?? null,
        typeStrip: typeStripText(card),
        typeTag: programTypeTag(sourceCard),
        verbLine: lines.paid,
        powerRail: head.keyword ?? (head.value || '—'),
        armable: false,
        inert: false,
        guardBase: null,
        statusBase: null,
    };
}

/** A program card's inspect DETAIL: its type's lifecycle, both printed lines
 *  and a keyword chip for every registry word they print. */
function programDetailCore(card: CombatCard, sourceCard: Card): DetailCore {
    const lines = programLinesFor(sourceCard);
    const rankName = card.rank ? RANK_NAMES[card.rank] : null;
    const metaChip = [
        card.stance.toUpperCase(),
        rankName ? rankName.toUpperCase() : `TIER ${card.tier}`,
        RARITY_LABEL[rarityFor(card)].toUpperCase(),
        ...(card.cardType ? [card.cardType.toUpperCase()] : []),
    ].join(' · ');
    const keywords = keywordsInText(`${lines.free} ${lines.paid}`)
        .map((kw) => ({ name: kw.toUpperCase(), def: keywordGloss(kw) ?? '', minor: false }));
    const global = sourceCard.cardType === 'global';
    const sacrifices = /\bSACRIFICE\b/.test(`${lines.free} ${lines.paid}`);
    return {
        subtitle: programLifecycle(sourceCard),
        metaChip,
        outcomeLine: `${lines.paid}.`,
        outcomeStats: global
            ? [{ label: 'FREE', value: '⏳3 turns' }, { label: 'PAID', value: '∞ rest of combat' }]
            : [],
        stacksText: null,
        freeLine: `◇ FREE (no die): ${lines.free}.`,
        powerLine: `◆ WITH A DIE: ${lines.paid}.`,
        readNote: 'Lands as printed: the numbers are final at your stats.',
        mathLine: sacrifices
            ? 'SACRIFICE is paid in VITAE and never takes you below 1: a line you cannot pay cannot be played.'
            : 'The printed line is the applied effect.',
        keywords,
    };
}

/** Honest card FACE view-model (the 5-zone hand card). */
export function faceStats(card: CombatCard, sourceCard?: Card): CombatCardFaceVM {
    if (sourceCard?.program) return programFaceStats(card, sourceCard);
    const c = cardCalc(card, sourceCard);
    const stanceColor = STANCE_COLORS[card.stance] ?? HUE.fallbackGrey;
    const kw = c.keyword ? c.keyword.toUpperCase() : null;
    // The authored FREE line (engine riderText) — never a fabricated chip.
    const free = freeLineText(card, sourceCard);
    const freeGlyph = freeGlyphMeta(sourceCard);
    const base = {
        glyph: c.glyph, categoryColor: c.categoryColor, stanceColor,
        statusBase: null,
        ...freeRail(sourceCard), freeGlyph: freeGlyph.glyph, freeGlyphKey: freeGlyph.key,
        typeStrip: typeStripText(card),
    };
    switch (c.kind) {
        case 'dot': {
            // Trigger-aware face. Event DoTs (poison/bleed) tick per game
            // event, never at the round boundary, so they print a per-event
            // rate, not a round-clock "total over Nt".
            const evt = c.dotTrigger === 'card-played'
                ? { hero: `${c.perTurn}/play`, sub: `per card you play · ${c.turns}t`, verb: 'foe loses VITAE each card you play' }
                : c.dotTrigger === 'damage-instance'
                    ? { hero: `${c.perTurn}/hit`, sub: `per hit taken · ${c.intensity} stack${c.intensity === 1 ? '' : 's'}`, verb: 'foe loses VITAE each time it is struck' }
                    : c.dotTrigger === 'payoff'
                        ? { hero: `${c.perTurn}/payoff`, sub: `per payoff you detonate · ${c.turns}t`, verb: 'foe loses VITAE each payoff you detonate' }
                        : null;
            if (evt) return { ...base, kind: 'dot', keyword: kw, heroText: evt.hero, heroSub: evt.sub, freeHeroText: free, freeHeroSub: null, verbLine: evt.verb, powerRail: c.keyword ?? 'DoT', armable: true, inert: false, guardBase: null, statusBase: c.perTurn };
            // DOOM: no calendar, and the stack grows every time the foe acts —
            // print the per-turn bite and the growth clause, never a lifetime.
            if (c.dotGrowsOnEnemyAction) {
                return { ...base, kind: 'dot', keyword: kw, heroText: `${c.perTurn}/turn`, heroSub: 'grows each time the foe acts', freeHeroText: free, freeHeroSub: null, verbLine: 'foe loses VITAE each turn, and the doom deepens as it acts', powerRail: c.keyword ?? 'DoT', armable: true, inert: false, guardBase: null, statusBase: c.perTurn };
            }
            // Round-clock DoT: the honest "total over N turns" face stands.
            return { ...base, kind: 'dot', keyword: kw, heroText: `${c.total}`, heroSub: `over ${c.turns} turns`, freeHeroText: free, freeHeroSub: null, verbLine: 'foe loses VITAE each turn', powerRail: c.keyword ?? 'DoT', armable: true, inert: false, guardBase: null, statusBase: c.total };
        }
        case 'stun': return { ...base, kind: 'stun', keyword: kw, heroText: `skip ${c.skips} turns`, heroSub: null, freeHeroText: free, freeHeroSub: null, verbLine: "the foe can't act", powerRail: c.keyword ?? 'Stun', armable: false, inert: false, guardBase: null };
        case 'weaken': return { ...base, kind: 'weaken', keyword: kw, heroText: '', heroSub: c.turns > 0 ? `hits softer · ${c.turns} turns` : 'weakens its hits', freeHeroText: free, freeHeroSub: null, verbLine: "weakens the foe's hits", powerRail: c.keyword ?? 'Weaken', armable: false, inert: false, guardBase: null };
        case 'mark': return { ...base, kind: 'mark', keyword: kw, heroText: `+${c.markAmp}/tick`, heroSub: `${c.turns} turns`, freeHeroText: free, freeHeroSub: null, verbLine: 'every DoT tick on the foe bites harder', powerRail: c.keyword ?? 'Mark', armable: false, inert: false, guardBase: null };
        case 'guard': { const b = c.guardAmount ?? 0; return { ...base, kind: 'guard', keyword: 'GUARD', heroText: `Guard ${b}`, heroSub: null, freeHeroText: free, freeHeroSub: null, verbLine: 'block the next hit', powerRail: `${b}`, armable: true, inert: false, guardBase: b }; }
        case 'befriend': return { ...base, kind: 'befriend', keyword: 'SPARE', heroText: '', heroSub: 'spare a near-dead foe', freeHeroText: 'mercy', freeHeroSub: null, verbLine: 'spare a near-dead foe', powerRail: 'mercy', armable: false, inert: false, guardBase: null };
        case 'vulnerable': return { ...base, kind: 'vulnerable', keyword: kw, heroText: `+${c.vulnPct}%`, heroSub: `dmg taken · ${c.turns} turns`, freeHeroText: free, freeHeroSub: null, verbLine: 'foe takes more damage', powerRail: c.keyword ?? 'Vulnerable', armable: true, inert: false, guardBase: null, statusBase: c.vulnPct };
        case 'resolute': return { ...base, kind: 'resolute', keyword: kw, heroText: `${c.resolutePct}%`, heroSub: `dmg taken · ${c.turns} turns`, freeHeroText: free, freeHeroSub: null, verbLine: 'you take less damage', powerRail: c.keyword ?? 'Resolute', armable: false, inert: false, guardBase: null, statusBase: c.resolutePct };
        // A keyword-less headline (DEAL — "Deal 24" needs no badge) leaves the
        // verb slot empty on purpose; the power rail then carries the hero
        // number rather than the em-dash placeholder, so the card still reads.
        case 'mechanic': { const h = mechanicHeadline(c.mech); return { ...base, kind: 'mechanic', keyword: kw, heroText: h?.heroText ?? '', heroSub: h?.heroSub ?? null, freeHeroText: free, freeHeroSub: null, verbLine: h?.verbLine ?? '', powerRail: c.keyword ?? h?.heroText ?? '—', armable: false, inert: false, guardBase: null }; }
        case 'inert':
        default: return { ...base, kind: 'inert', keyword: kw ?? 'DEBUFF', heroText: '', heroSub: card.verbClass === 'buff-self' ? 'buff yourself' : 'weakens the foe', freeHeroText: free, freeHeroSub: null, verbLine: card.verbClass === 'buff-self' ? 'buff yourself' : 'weakens the foe', powerRail: c.keyword ?? '—', armable: false, inert: true, guardBase: null };
    }
}

/** Honest card DETAIL view-model CORE (everything but the pill table). */
function detailCore(card: CombatCard, sourceCard?: Card): DetailCore {
    if (sourceCard?.program) return programDetailCore(card, sourceCard);
    const c = cardCalc(card, sourceCard);
    const Title = c.keyword ?? '';
    // The meta chip: stance, rank name (or tier), rarity band, card type —
    // e.g. 'BODY · ASH · COMMON · SPELL'. No engine-jargon verb class: the
    // keyword ledger and the ◆ +DIE row already say what the card does.
    const rankName = card.rank ? RANK_NAMES[card.rank] : null;
    const typeLabel = card.cardType ? card.cardType.toUpperCase() : null;
    const metaChip = [
        card.stance.toUpperCase(),
        rankName ? rankName.toUpperCase() : `TIER ${card.tier}`,
        RARITY_LABEL[rarityFor(card)].toUpperCase(),
        ...(typeLabel ? [typeLabel] : []),
    ].join(' · ');
    const keywords = buildDetailKeywords(card, c, sourceCard);
    // The authored FREE line (engine riderText).
    const free = freeLineText(card, sourceCard);
    const freeLine = `◇ FREE (no die): ${free}.`;
    switch (c.kind) {
        case 'dot': {
            // Event DoTs (poison=card-played, bleed=damage-instance) tick on a
            // game event, never at the round boundary, so they print "PER TICK
            // / TRIGGER / DURATION" and describe the real trigger, not the
            // round-clock "PER TURN / TURNS / TOTAL" table.
            if (c.dotTrigger) {
                const evt = c.dotTrigger === 'card-played' ? { noun: 'card you play', trig: 'per card played', dur: { label: 'DURATION', value: `${c.turns}t` } }
                    : c.dotTrigger === 'damage-instance' ? { noun: 'time it is struck', trig: 'per hit taken', dur: { label: 'STACKS', value: `${c.intensity}` } }
                        : { noun: 'payoff you detonate', trig: 'per payoff', dur: { label: 'DURATION', value: `${c.turns}t` } };
                return {
                    subtitle: `${Title} the enemy — ticks ${evt.trig}.`, metaChip,
                    outcomeLine: `Apply ${Title} — ${c.perTurn} VITAE each ${evt.noun}.`,
                    outcomeStats: [{ label: 'PER TICK', value: `${c.perTurn}` }, { label: 'TRIGGER', value: evt.trig }, evt.dur],
                    stacksText: c.stacks ? 'Stacks by intensity.' : null, freeLine,
                    powerLine: `◆ WITH A DIE: apply ${Title} — ${c.perTurn} VITAE each ${evt.noun} while it holds.`,
                    readNote: `Lands as printed: ${c.perTurn} VITAE each ${evt.noun}.`,
                    mathLine: `${c.perTurn}/tick = ${c.dpr} base × ${c.intensity} intensity, ${evt.trig}${c.stacks ? ' · stacks by intensity' : ''}.`,
                    keywords,
                };
            }
            return { subtitle: `${Title} the enemy — damage over time.`, metaChip, outcomeLine: `Apply ${Title} ${c.total} over ${c.turns} turns.`, outcomeStats: [{ label: 'PER TURN', value: `${c.perTurn}` }, { label: 'TURNS', value: `${c.turns}` }, { label: 'TOTAL', value: `${c.total}` }], stacksText: c.stacks ? 'Stacks up to 10×.' : null, freeLine, powerLine: `◆ WITH A DIE: apply ${Title} — ${c.perTurn} VITAE/turn for ${c.turns} turns (${c.total} total).`, readNote: `Lands as printed: ${c.total} VITAE over ${c.turns} turns.`, mathLine: `${c.perTurn}/turn = ${c.dpr} base × ${c.intensity} intensity · ${c.turns} turns · ${c.total} VITAE total${c.stacks ? ' · stacks to 10×' : ''}.`, keywords };
        }
        case 'stun': return { subtitle: `${Title} the enemy — it loses its turns.`, metaChip, outcomeLine: `Apply ${Title} ${c.skips} turn${c.skips === 1 ? '' : 's'}.`, outcomeStats: [{ label: 'SKIPS', value: `${c.skips} turns` }], stacksText: null, freeLine, powerLine: `◆ WITH A DIE: ${Title} — the foe skips its next ${c.skips} actions.`, readNote: `Lands as printed: the foe skips ${c.skips} turn${c.skips === 1 ? '' : 's'}.`, mathLine: `skip ${c.skips}t = ${Title.toLowerCase()} duration ${c.skips} (each turn it would act is cancelled).`, keywords };
        case 'weaken': return { subtitle: `${Title} the enemy — its attacks hit softer.`, metaChip, outcomeLine: c.turns > 0 ? `Apply ${Title} · ${c.turns} turns.` : `Apply ${Title}.`, outcomeStats: c.turns > 0 ? [{ label: 'TURNS', value: `${c.turns}` }] : [], stacksText: c.stacks ? 'Stacks by intensity.' : null, freeLine, powerLine: `◆ WITH A DIE: apply ${Title} — the foe's hits land softer while it holds.`, readNote: `${Title} weakens the enemy's blows.`, mathLine: `${Title} reduces the enemy's outgoing damage while active (real engine units).`, keywords };
        case 'mark': return { subtitle: `${Title} the enemy — the flaw is named.`, metaChip, outcomeLine: `Apply ${Title} +${c.markAmp}/tick · ${c.turns} turns.`, outcomeStats: [{ label: 'PER TICK', value: `+${c.markAmp}` }, { label: 'TURNS', value: `${c.turns}` }], stacksText: c.stacks ? 'Stacks by intensity.' : null, freeLine, powerLine: `◆ WITH A DIE: apply ${Title} — every DoT tick and payoff hit on the foe deals +${c.markAmp} while it holds.`, readNote: `${Title} counts as an affliction — RUPTURE, SOUL, and REAP all feed on it.`, mathLine: `+${c.markAmp}/tick = tickAmplifyFlat × intensity, for ${c.turns} turns.`, keywords };
        case 'guard': { const b = c.guardAmount ?? 0; return { subtitle: 'Guard yourself — soak the next hit.', metaChip, outcomeLine: `Gain ${Title} ${b}.`, outcomeStats: [{ label: 'GUARD', value: `${b}` }], stacksText: null, freeLine, powerLine: `◆ WITH A DIE: Guard ${b}.`, readNote: `Lands as printed: Guard ${b}.`, mathLine: `POWER = ${b}, the printed Guard.`, keywords }; }
        case 'befriend': return { subtitle: 'Spare a near-dead foe.', metaChip, outcomeLine: 'Spare a near-dead foe — end combat peacefully.', outcomeStats: [], stacksText: null, freeLine, powerLine: '◆ WITH A DIE: if the enemy VITAE is low, end combat peacefully (befriend).', readNote: 'Watch the enemy VITAE bar — befriend lands only when it is low.', mathLine: 'No fixed number — a conditional outcome gated on low enemy VITAE.', keywords };
        case 'vulnerable': { return { subtitle: `${Title} the enemy — it takes more damage.`, metaChip, outcomeLine: `Apply ${Title} +${c.vulnPct}% · ${c.turns} turns.`, outcomeStats: [{ label: 'DMG TAKEN', value: `+${c.vulnPct}%` }, { label: 'TURNS', value: `${c.turns}` }], stacksText: 'Stacks without limit.', freeLine, powerLine: `◆ WITH A DIE: apply ${Title} — +${c.vulnPct}% damage taken for ${c.turns} turns.`, readNote: `Lands as printed: +${c.vulnPct}% damage taken for ${c.turns} turns.`, mathLine: `+${c.vulnPct}% = (damageTakenMult − 1) × 100 × intensity; combined Vulnerable is uncapped.`, keywords }; }
        case 'resolute': return { subtitle: `${Title} — you take less damage.`, metaChip, outcomeLine: `Gain ${Title} ${c.resolutePct}% · ${c.turns} turns.`, outcomeStats: [{ label: 'DMG TAKEN', value: `${c.resolutePct}%` }, { label: 'TURNS', value: `${c.turns}` }], stacksText: c.stacks ? 'Stacks by intensity.' : null, freeLine, powerLine: `◆ WITH A DIE: gain ${Title} — ${c.resolutePct}% damage taken for ${c.turns} turns.`, readNote: `Lands as printed: ${Title} is a self-buff.`, mathLine: `${c.resolutePct}% = (damageTakenMult − 1) × 100${c.stacks ? '; stacks by intensity' : ''}.`, keywords };
        // A keyword-less mechanic headline (DEAL) has no Title to lead with —
        // every line below falls back to the headline's own words rather than
        // opening with a dangling dash or an empty stat label.
        case 'mechanic': { const h = mechanicHeadline(c.mech); const verb = h?.verbLine ?? 'a special mechanic'; const val = [h?.heroText, h?.heroSub].filter(Boolean).join(' '); const lead = Title || h?.heroText || 'This card'; const statLabel = (Title || 'PAID').toUpperCase(); return { subtitle: Title ? `${Title} — ${verb}.` : `${verb.charAt(0).toUpperCase()}${verb.slice(1)}.`, metaChip, outcomeLine: Title ? (val ? `${Title} ${val}.` : `${Title}.`) : `${val || verb}.`, outcomeStats: h?.heroText ? [{ label: statLabel, value: h.heroText }] : [], stacksText: null, freeLine, powerLine: `◆ WITH A DIE: ${vitaeCopy(card.bottomActionText)}`, readNote: `${lead} lands as printed — the printed line is the applied effect.`, mathLine: `${lead}: ${vitaeCopy(h?.verbLine ?? card.bottomActionText)}.`, keywords }; }
        case 'inert':
        default: return { subtitle: `${Title || 'Effect'} — minor right now.`, metaChip, outcomeLine: `${Title || 'This effect'} — minor for now.`, outcomeStats: [], stacksText: null, freeLine, powerLine: `◆ WITH A DIE: ${vitaeCopy(card.bottomActionText)}`, readNote: 'The engine text above is the whole truth for this card.', mathLine: `${Title || 'This effect'} carries no headline number — the printed line is the applied effect.`, keywords };
    }
}

/**
 * Format ONE engine clause as the terse `KEYWORD value` the ◆ +DIE rail uses.
 *
 * Presentation only. The clause — which payload it is, what it applies, what
 * numbers it prints — came from `paidClauses()` in mechanics. All this does is
 * choose the player-facing WORD (the registry keyword when the card's
 * vocabulary registers one, the engine's own leading word otherwise) and spell
 * the value the way the rest of the UI spells it (`×3 · 2 turns`, never the
 * `i3 d2` code).
 *
 * A clause the engine prints as a full sentence (no headline word — a
 * card-local rules clause) is printed verbatim: a badge for it would be
 * invented here, not read from the engine.
 */
function formatPaidClause(c: CardClause): string {
    const registry = c.source === 'effect' ? keywordForEffect(c.id) : keywordForMechanic(c.id);
    const word = (registry ?? c.label).toUpperCase();
    if (!word) return deabbreviateShorthand(vitaeCopy(c.text));
    const value = clauseValue(c);
    if (!value) return word;
    // Some engine clauses TRAIL the word the badge already says ('+2 Souls'
    // under SOUL would read 'SOUL +2 Souls'). Drop the trailing repeat — but
    // only when a number survives it, so the
    // badge still leads a real value. A clause whose word is load-bearing prose
    // ('your next spell gains ECHO') prints as written, keeping the registry
    // word uppercase so the ledger above still links to it.
    const trailingDupe = new RegExp(`\\s*\\b${word}s?\\b\\s*$`, 'i');
    if (trailingDupe.test(value)) {
        const trimmed = value.replace(trailingDupe, '').trim();
        return /\d/.test(trimmed) ? `${word} ${trimmed}` : value;
    }
    return `${word} ${value}`;
}

/** The value half of a clause. A DoT reads as its real tick ('8/play'), which
 *  is the number the engine applies; a round-clock status reads intensity and
 *  turns. Every number comes off the clause, none is computed here. */
function clauseValue(c: CardClause): string {
    if (c.source === 'effect' && c.dot) {
        const unit = c.dot.trigger === 'card-played' ? '/play'
            : c.dot.trigger === 'damage-instance' ? '/hit'
                : c.dot.trigger === 'payoff' ? '/payoff' : '/turn';
        const clock = c.dot.growsOnEnemyAction ? ' · grows as the foe acts'
            : c.dot.trigger === 'damage-instance' ? ` · ${c.intensity} stacks`
                : ` · ${c.duration} turn${c.duration === 1 ? '' : 's'}`;
        return `${c.dot.perTick}${unit}${clock}${c.cross ?? ''}`;
    }
    // A damage-taken status reads in percent here too ('+25% · 2 turns'), the
    // way the face, the FREE line and the DECK tab print it.
    const value = deabbreviateShorthand(vitaeCopy(c.value));
    const pct = c.source === 'effect' && c.intensity != null ? percentIntensity(c.id, c.intensity) : null;
    return pct ? value.replace(`×${c.intensity}`, pct) : value;
}

/**
 * The FULL ◆ +DIE line: every clause the paid play fires, in authored order.
 *
 * The list comes from `paidClauses()` in mechanics and nothing here filters,
 * dedupes or re-derives it — a DEAL with no keyword badge, a self-cost, and
 * two clauses sharing a word all print. Each clause is formatted in the terse
 * shorthand by `formatPaidClause`. Null when the card has no paid clause.
 */
function paidLine(sourceCard?: Card): string | null {
    if (!sourceCard) return null;
    if (sourceCard.program) return programLinesFor(sourceCard).paid;
    const parts = paidClauses(sourceCard, lookupEffect).map(formatPaidClause).filter(Boolean);
    return parts.length ? parts.join('  +  ') : null;
}

/** Honest card DETAIL view-model (inspect modal) — the CORE plus the +DIE row
 *  fields, which carry what the face can't: the FULL paid line. */
export function detailStats(card: CombatCard, sourceCard?: Card): CombatCardDetailVM {
    const core = detailCore(card, sourceCard);
    const STANCE = STANCE_LABELS[card.stance] ?? card.stance.toUpperCase();
    // The free (die-optional) value — the ENGINE's own free line, not the
    // face's hero slot (the face hard-codes 'mercy' on a befriend card, which
    // would disagree with its authored rider). `freeLineText` is `riderText`
    // from mechanics, de-abbreviated — nothing else.
    const freePill = freeLineText(card, sourceCard);
    const diePaidLine = paidLine(sourceCard);
    // The colour law — rendered ONCE per modal.
    // A colourless (grey) card takes any die — never 'Only a ANY … die'.
    const colorLawHint = card.stance === 'any'
        ? 'Any die can power this card.'
        : `Only a ${STANCE} or WILD die can power this card.`;
    // The per-card systems-glossary slice: scan the card's OWN
    // printed lines plus its overlay free/stacks lines (colorLawHint excluded
    // — its WILD is the global colour law, not a card reference) and drop
    // terms a keyword chip already covers.
    const typeWord = card.cardType === 'global' ? 'Global' : card.cardType === 'curse' ? 'Curse' : '';
    const systemTerms = systemTermsForCard(
        [card.topActionText, card.bottomActionText, core.freeLine, core.stacksText ?? '', typeWord].join(' '),
        core.keywords.map(k => k.name),
    );
    // The rarity band, derived ONCE by `rarityFor`. Named label +
    // pip count + hue; the panel renders label and pips so the signal survives
    // greyscale and colour blindness, and the hue is decoration on top.
    const band = rarityFor(card);
    // The colour law rides the ◆ row's tag, the row whose decision it changes.
    const freeTag = 'NO DIE';
    const paidTag = `+DIE · ${STANCE}/WILD`;
    return {
        ...core, freePill, diePaidLine, colorLawHint, systemTerms,
        rarityLabel: RARITY_LABEL[band], rarityPips: RARITY_PIPS[band], rarityColor: RARITY_COLOR[band],
        freeTag, paidTag,
    };
}

/** The hero value at the moment of commit — StagedCard only. Guard, DoT
 *  total and Vulnerable % all land as printed: the die that powers a card
 *  adds nothing. null for kinds with no number to arm (stun's skip count is
 *  duration-driven). */
export function armedValue(face: CombatCardFaceVM): number | null {
    if (face.kind === 'guard' && face.guardBase != null) {
        return face.guardBase;
    }
    if ((face.kind === 'dot' || face.kind === 'vulnerable') && face.statusBase != null) {
        return face.statusBase;
    }
    return null;
}

/**
 * The stat family of the keyword a face SHOWS, by where it lands:
 * body = damage to the foe, mind = on you, heart = on the foe. Keyed by the
 * face's keyword (a card can DEAL and POISON; the face names one of them).
 * Keywords not listed are grey: no colour, no glyph.
 */
const KEYWORD_FAMILY: Record<string, StatFamily> = {
    DEAL: 'body',
    GUARD: 'mind', HEAL: 'mind',
    BLEED: 'heart', VULNERABLE: 'heart', LEECH: 'heart',
    RADIANCE: 'heart', MERCY: 'heart',
};

/**
 * The family colour + glyph for a face's keyword, and whether the player's
 * stats actually moved each printed number (`scaled` vs the `printed` face).
 */
export function familyFace(
    scaled: CombatCardFaceVM,
    printed: CombatCardFaceVM,
): Pick<CombatCardFaceVM, 'statFamily' | 'familyColor' | 'familyGlyph' | 'statScaled' | 'freeStatScaled'> {
    // Direction from the NUMBERS, not the stat: a card mixes families, so the
    // only honest "raised" signal is that the printed figure went up.
    const dir = (a: string | null | undefined, b: string | null | undefined): 'up' | 'down' | null => {
        if (a === b || a == null || b == null) return null;
        const na = parseInt(a.replace(/[^0-9-]/g, ''), 10);
        const nb = parseInt(b.replace(/[^0-9-]/g, ''), 10);
        if (Number.isNaN(na) || Number.isNaN(nb) || na === nb) return null;
        return Math.abs(na) > Math.abs(nb) ? 'up' : 'down';
    };
    const paidMoved = dir(scaled.heroText, printed.heroText);
    const freeMoved = dir(scaled.freeValue ?? scaled.freeHeroText, printed.freeValue ?? printed.freeHeroText);
    const fam = scaled.keyword ? KEYWORD_FAMILY[scaled.keyword.toUpperCase()] ?? null : null;
    if (!fam || fam === 'grey') {
        return { statFamily: null, familyColor: null, familyGlyph: null, statScaled: paidMoved, freeStatScaled: freeMoved };
    }
    return {
        statFamily: fam,
        familyColor: STANCE_COLORS[fam] ?? null,
        familyGlyph: DIE_GLYPHS[fam] ?? null,
        statScaled: paidMoved,
        freeStatScaled: freeMoved,
    };
}

function handVM(state: CombatEncounterState): CombatCardVM[] {
    return engineHandCards(state)
        // Fleeing is offered at the encounter prelude (ENGAGE / FLEE), never
        // from the hand, so a retreat card is filtered out.
        .filter(({ card }: { card: CombatCard }) => card.id !== 'card-retreat' && card.verbClass !== 'retreat')
        .map(({ uid, card }: { uid: string; card: CombatCard }) => {
            const vm = scaledCardVM(uid, card, state.player.baseStats);
            // A plain card has no line the engine refuses, until TANGLE refuses its FREE line.
            const tangled = (state.enemyWords?.tangle ?? 0) > 0 || playLimitBlock(state) !== null;
            if (!getCardById(card.id)?.program && !tangled) return vm;
            const play = programPlayVM(state, uid, card.id);
            const blocks = [
                play.freeBlock ? `FREE can't be played now: ${play.freeBlock}.` : null,
                play.paidBlock ? `PAID can't be played now: ${play.paidBlock}.` : null,
            ].filter(Boolean).join(' ');
            return { ...vm, play, detail: blocks ? { ...vm.detail, readNote: blocks } : vm.detail };
        });
}

/**
 * The Globals in play, each with its turns left and its card for the overlay.
 * Copies of one Global stack, so a card in play more than once names its copy
 * ("copy 2 of 2") in the label, or a screen reader hears identical chips.
 */
function globalsVM(state: CombatEncounterState): CombatGlobalVM[] {
    const stats = state.player.baseStats;
    const globals = state.program?.globals ?? [];
    const copies = new Map<string, number>();
    for (const g of globals) copies.set(g.cardId, (copies.get(g.cardId) ?? 0) + 1);
    const seen = new Map<string, number>();
    return globals.map((g) => {
        const card = getCardById(g.cardId);
        const name = card?.name ?? g.cardId;
        const nth = (seen.get(g.cardId) ?? 0) + 1;
        seen.set(g.cardId, nth);
        const total = copies.get(g.cardId) ?? 1;
        const copy = total > 1 ? `, copy ${nth} of ${total}` : '';
        const turnsLabel = g.turnsLeft === null ? '∞' : `⏳${g.turnsLeft}`;
        const left = g.turnsLeft === null ? 'for the rest of combat' : `for ${g.turnsLeft} more turn start${g.turnsLeft === 1 ? '' : 's'}`;
        return {
            uid: g.uid, cardId: g.cardId, name, turnsLabel,
            stanceColor: STANCE_COLORS[card?.color ?? 'any'] ?? HUE.fallbackGrey,
            card: rewardCardVMs([g.cardId], stats)[0] ?? null,
            a11y: `${name}${copy}, a Global in play ${left}. Tap to read it.`,
        };
    });
}

/** The foe's program statuses (LEECH, TETHER) as board chips. */
function programChips(state: CombatEncounterState): CombatEffectChipVM[] {
    const l = state.program;
    if (!l) return [];
    const out: CombatEffectChipVM[] = [];
    if (l.leechTurns > 0) {
        // LEECH is a debuff with two numbers: its potency (VITAE drained each
        // foe turn) and the foe turns it has left.
        out.push({
            effectId: 'program-leech', intensity: l.leechPotency, duration: l.leechTurns,
            glyph: { glyph: '∿', color: GLYPH_COLORS.dot, kind: 'dot', label: 'Leech' },
            gloss: keywordGloss('Leech'),
        });
    }
    const tetherLeft = l.tetherUntil - state.round + 1;
    if (tetherLeft > 0) {
        out.push({
            effectId: 'program-tether', intensity: 1, duration: tetherLeft,
            glyph: { glyph: '⊸', color: GLYPH_COLORS.control, kind: 'control', label: 'Tether' },
            gloss: keywordGloss('Tether'),
        });
    }
    // MERCY on the foe: its total and the foe turns left until it bursts; YIELDING
    // while the foe holds it.
    const mercy = mercyReading(l.mercy);
    if (mercy.mercy > 0) {
        out.push({
            effectId: 'program-mercy', intensity: mercy.mercy, duration: mercy['mercy-turns'],
            glyph: { glyph: '☮', color: GLYPH_COLORS.dot, kind: 'dot', label: 'Mercy' },
            gloss: keywordGloss('Mercy'),
        });
    }
    if (mercy.yielding) {
        out.push({
            effectId: 'program-yielding', intensity: 1, duration: 0,
            glyph: { glyph: '☉', color: HUE.goldAccent, kind: 'control', label: 'Yielding' },
            gloss: keywordGloss('Yielding'),
        });
    }
    return out;
}

/**
 * The weather's board marks, one per element (`WEATHER_MARKS`): the foe's
 * INFERNO, BLIZZARD, STORM and FROZEN on the foe, your INFERNO on you. Each
 * chip's number is the element's number now, so it moves as the weather
 * drifts; the weather has no turn count (it lasts the whole combat).
 */
interface WeatherMark {
    element: WeatherElement;
    side: 'enemy' | 'player';
    keyword: string;
    glyph: StatusGlyph;
}
const WEATHER_MARKS: readonly WeatherMark[] = [
    { element: 'foe-inferno', side: 'enemy', keyword: 'Inferno', glyph: { glyph: '🔥', color: HUE.damageRed, kind: 'dot', label: 'Inferno' } },
    { element: 'blizzard', side: 'enemy', keyword: 'Blizzard', glyph: { glyph: '❄', color: HUE.guardBlue, kind: 'statdown', label: 'Blizzard' } },
    { element: 'storm', side: 'enemy', keyword: 'Storm', glyph: { glyph: '⚡', color: HUE.goldAccent, kind: 'dot', label: 'Storm' } },
    { element: 'frozen', side: 'enemy', keyword: 'Frozen', glyph: { glyph: '✻', color: HUE.hzBlueLite, kind: 'control', label: 'Frozen' } },
    { element: 'your-inferno', side: 'player', keyword: 'Inferno', glyph: { glyph: '🔥', color: HUE.damageRed, kind: 'dot', label: 'Your Inferno' } },
];

/** Your INFERNO's caption: what it takes from you at the start of each turn. */
export function selfBurnCaption(perTurn: number): string {
    return `YOUR INFERNO −${perTurn} each turn`;
}

/**
 * The spikes' badges on you: THORNS (its number; it drops by 1 each round, so
 * no turn tag) and REFLECT (its %, with the turns it has left). Each number is
 * the engine's reading now, so the badge moves as the spikes rise and drift.
 */
export function spikeChips(state: CombatEncounterState): CombatEffectChipVM[] {
    const sp = state.program?.spikes;
    if (!sp) return [];
    const r: Record<SpikeReading, number> = spikeReading(sp);
    const out: CombatEffectChipVM[] = [];
    if (r.thorns > 0) {
        out.push({
            effectId: 'spike-thorns', intensity: r.thorns, duration: 0,
            glyph: { glyph: '✷', color: SPIKE_WORD.thorns.color, kind: 'statup', label: 'Thorns' },
            gloss: keywordGloss('Thorns'),
        });
    }
    if (r.reflect > 0) {
        out.push({
            effectId: 'spike-reflect', intensity: r.reflect, unit: '%', duration: r['reflect-turns'],
            glyph: { glyph: '◈', color: SPIKE_WORD.reflect.color, kind: 'statup', label: 'Reflect' },
            gloss: keywordGloss('Reflect'),
        });
    }
    return out;
}

/**
 * The enemy words standing on the board (`state.enemyWords`), as chips: the
 * foe's WARD on its side; BRINE, TANGLE, LEECH and UNDERTOW on yours. These
 * are live state, like GUARD, so they carry their numbers; the telegraph
 * (intent, next, wall math) never does. BARNACLE shows as the Curse in hand.
 */
export function enemyWordChips(state: CombatEncounterState, side: 'enemy' | 'player'): CombatEffectChipVM[] {
    const w = state.enemyWords;
    const counters = foeCounterChips(state, side);
    if (!w) return counters;
    const chip = (word: string, intensity: number, duration: number, glyph: string, color: string): CombatEffectChipVM => ({
        effectId: `enemy-word-${word.toLowerCase()}`, intensity, duration,
        glyph: { glyph, color, kind: 'control', label: word },
        gloss: keywordGloss(word),
    });
    if (side === 'enemy') {
        return [...(w.ward > 0 ? [chip('Ward', w.ward, 0, '⛨', GLYPH_COLORS.statup)] : []), ...counters];
    }
    const out: CombatEffectChipVM[] = [...counters];
    if (w.brine > 0) out.push(chip('Brine', w.brine, 0, '≋', GLYPH_COLORS.statdown));
    if ((w.tangle ?? 0) > 0) out.push(chip('Tangle', w.tangle!, 0, '#', GLYPH_COLORS.control));
    if (w.leechTurns > 0 && w.leechPotency > 0) out.push(chip('Leech', w.leechPotency, w.leechTurns, '∿', GLYPH_COLORS.dot));
    if (w.undertow) out.push(chip('Undertow', 1, 0, '↓', GLYPH_COLORS.control));
    return out;
}

/**
 * A foe's own counters (`state.enemyRiders`): not keywords, only fight state
 * the board reads out. The cards the Green Jelly HOLDS and the Tolls the
 * Curfew-Ringer has rung stand on the foe's side; the curfew it left you
 * stands on yours. Live numbers, like GUARD; never on the telegraph.
 */
export function foeCounterChips(state: CombatEncounterState, side: 'enemy' | 'player'): CombatEffectChipVM[] {
    const r = state.enemyRiders;
    if (!r) return [];
    const chip = (id: string, label: string, intensity: number, glyph: string, color: string, gloss: string, caption?: string): CombatEffectChipVM => ({
        effectId: `enemy-counter-${id}`, intensity, duration: 0,
        glyph: { glyph, color, kind: 'control', label },
        gloss,
        ...(caption ? { caption } : {}),
    });
    const out: CombatEffectChipVM[] = [];
    if (side === 'enemy') {
        const held = r.held?.length ?? 0;
        if (held > 0) out.push(chip('held', 'Held', held, '◍', GLYPH_COLORS.control, ENEMY_COUNTER_GLOSS.held));
        if ((r.tolls ?? 0) > 0) out.push(chip('toll', 'Toll', r.tolls!, '♪', GLYPH_COLORS.dot, ENEMY_COUNTER_GLOSS.toll));
    } else if ((r.curfew ?? 0) > 0) {
        const left = Math.max(0, r.curfew! - (r.played ?? 0));
        out.push(chip('curfew', 'Curfew', left, '☾', GLYPH_COLORS.statdown, ENEMY_COUNTER_GLOSS.curfew, `${left} of ${r.curfew} plays left`));
    }
    return out;
}

/** What each foe counter says when tapped (state of the fight, not a keyword). */
const ENEMY_COUNTER_GLOSS = {
    held: 'Cards the foe has swallowed, out of your discard. They drop back into your discard when it spits them out.',
    toll: 'Tolls the foe has rung this fight. Each new Toll hits harder for every one already rung.',
    curfew: "A curfew: this turn only this many more cards can be played, FREE or PAID. It ends at the foe's next turn.",
} as const;

/** The weather's chips for one side of the board ([] when the sky is clear).
 *  Your INFERNO's chip carries its per-turn loss as a caption. */
export function weatherChips(state: CombatEncounterState, side: 'enemy' | 'player'): CombatEffectChipVM[] {
    const el = state.program?.el;
    if (!el) return [];
    const reading = weatherReading(el);
    return WEATHER_MARKS
        .filter((m) => m.side === side && reading[m.element] > 0)
        .map((m) => ({
            effectId: `weather-${m.element}`, intensity: reading[m.element], duration: 0,
            glyph: m.glyph, gloss: keywordGloss(m.keyword),
            ...(m.element === 'your-inferno' ? { caption: selfBurnCaption(yourInferno(el)) } : {}),
        }));
}

/** A status chip's a11y line. Weather has no turn count: it lasts the combat
 *  (drifting down on its own), so it never reads "0 turns left". */
export function effectChipA11y(e: CombatEffectChipVM): string {
    const span = e.effectId.startsWith('weather-') ? 'lasts the combat'
        : e.effectId === 'spike-thorns' ? 'drops by 1 each round'
        : e.effectId === 'program-yielding' ? 'while it holds'
        : e.effectId === 'program-mercy' ? `bursts in ${e.duration} turn${e.duration === 1 ? '' : 's'}`
        : e.effectId.startsWith('enemy-word-') && e.duration <= 0 ? "until the foe's next turn"
        : e.effectId === 'enemy-counter-curfew' ? "until the foe's next turn"
        : e.effectId.startsWith('enemy-counter-') ? 'a count that lasts the fight'
        : `${e.duration} turns left`;
    return `${e.glyph.label}, intensity ${e.intensity}${e.unit ?? ''}, ${span}${e.caption ? `. ${e.caption}` : ''}`;
}

/** The colour a plain hit floats in, on either side: white, so colour alone
 *  tells a hit from an element's tick. */
export const HIT_FLOAT_COLOR = HUE.white;

/** The one tick-colour table: the weather's elements by their own colour, any
 *  other DoT by its status glyph's. The float, the chip and the log share it. */
const TICK_COLOR: Record<string, string> = {
    inferno: WEATHER_WORD['foe-inferno'].color,
    storm: WEATHER_WORD.storm.color,
};

/** The colour of a `dot-tick` by its `effectId`. */
export function dotTickColor(effectId: string): string {
    const weather = TICK_COLOR[effectId];
    if (weather) return weather;
    const def = lookupEffect(effectId);
    return def ? effectGlyph(def as Parameters<typeof effectGlyph>[0]).color : GLYPH_COLORS.dot;
}

/** One DoT tick's float: its source's name and loss, in its element's colour. */
export function dotTickFloat(e: { effectId: string; label: string; amount: number }): { text: string; color: string } {
    return { text: `${e.label.toUpperCase()} −${e.amount}`, color: dotTickColor(e.effectId) };
}

/** Ticks resolved in one beat start this far apart, so each reads alone. */
export const DOT_TICK_STAGGER_MS = 180;

/** The intent's BLIZZARD line: what BLIZZARD takes off the foe's hit. */
export function intentBlizzardLine(cut: number): string {
    return `after BLIZZARD −${cut}`;
}
/** The BLIZZARD line's colour: BLIZZARD's own guard-blue. */
export const INTENT_BLIZZARD_COLOR = WEATHER_WORD.blizzard.color;

/**
 * One card's VM at FINAL numbers: the stat-scaled copy of the card (`card`
 * must already be built from it, as the engine's `handCards` does), with the
 * family colour marking each number the player's stats moved. The hand and the
 * reward offer share it, so a card reads the same before and after it is taken.
 */
function scaledCardVM(uid: string, card: CombatCard, stats: PlayerStats): CombatCardVM {
        const libraryCard = getCardById(card.id);
        const sourceCard = libraryCard ? scaleCardForStats(libraryCard, stats) : libraryCard;
        const scaledFace = faceStats(card, sourceCard);
        const printedCard = getCard(card.id);
        const printedFace = printedCard ? faceStats(printedCard, libraryCard) : scaledFace;
        const face = { ...scaledFace, ...familyFace(scaledFace, printedFace) };
        return {
            uid, cardId: card.id, name: card.name, stance: card.stance,
            stanceColor: STANCE_COLORS[card.stance] ?? HUE.fallbackGrey,
            verbClass: card.verbClass, effectKind: card.effectKind,
            rarity: card.rarity, rank: card.rank,
            rankName: card.rank ? RANK_NAMES[card.rank] : null,
            cardType: card.cardType,
            tier: card.tier,
            topActionText: vitaeCopy(card.topActionText), bottomActionText: vitaeCopy(card.bottomActionText),
            bottomDamagePreview: card.bottomDamagePreview,
            face,
            detail: detailStats(card, sourceCard),
            flavor: sourceCard?.description ?? null,
        };
}

/**
 * The signature info popup's lines, in reading order. A refused rune leads
 * with its reason (the news), above the gloss; a rune short of Conviction
 * keeps the reason on the cost line, as it always has.
 */
export function signatureInfoLines(s: CombatSignatureVM): { lead: string | null; meta: string } {
    const refused = !s.affordable && !!s.refused;
    const short = !s.affordable && !refused;
    return {
        lead: refused ? (s.reason ?? null) : null,
        meta: `consumes ◆ ${s.cost} conviction${short ? ` — ${s.reason ?? 'you have too little'}` : ''}`,
    };
}

const SIG_ICON: Record<SignatureSkill['kind'], string> = {
    mercy: '🕊',
    'sacrifice-heals': '🩸',
    'sacrifice-leech': '💎',
    'heal-trigger-leech': '🫀',
    'clear-yours-trigger-storm': '🌩',
    'foe-inferno-to-storm': '🔥',
    'blizzard-to-storm': '❄',
    'guard-to-thorns': '🌵',
    'reflect-half': '🪞',
    'hold-guard': '🛡',
};

function signaturesVM(state: CombatEncounterState): CombatSignatureVM[] {
    // The worn relics' signatures. Castability and its reason come
    // from the engine's own gate, so the rune never offers what
    // `playSignatureSkill` would refuse.
    return state.signatures
        .map(id => getSignatureSkill(id))
        .filter((s): s is SignatureSkill => !!s)
        .map((s: SignatureSkill) => {
            const reason = signatureCastBlock(state, s);
            // The gate checks Conviction first; asking it again with the cost
            // met finds a refusal that more Conviction would not lift.
            const refusal = signatureCastBlock({ ...state, conviction: Math.max(state.conviction, s.cost) }, s);
            return {
                id: s.id, name: s.name, description: s.description, cost: s.cost,
                affordable: reason === null,
                icon: SIG_ICON[s.kind] ?? '◆',
                reason: refusal ?? reason,
                refused: refusal !== null,
            };
        });
}

// ── Deckbuilder reward offers ────────────────────────────────────────────────

/**
 * Maps reward card ids (from `rollCombatCardRewards`) into REAL card VMs — the
 * exact `CombatCardVM` the hand and the inspect modal render.
 *
 * A player committing a card to their deck for the rest of the run reads the
 * same face they will read in combat, so the reward screen never builds its
 * own slice of face logic. With the player's `stats` the numbers are scaled
 * exactly as the hand scales them (A Plain Blow reads Deal 6 on both); without
 * them the face prints the card's authored numbers.
 *
 * There is no encounter state here (the reward is post-combat), so there is no
 * live enemy difficulty and no chosen-X clamp.
 */
export function rewardCardVMs(ids: readonly string[], stats?: PlayerStats): CombatCardVM[] {
    const scaledLookup = (id: string): Card | undefined => {
        const c = getCardById(id);
        return c ? scaleCardForStats(c, stats) : c;
    };
    const out: CombatCardVM[] = [];
    for (const id of ids) {
        const card = toCombatCard(id, scaledLookup, lookupEffect);
        if (!card) continue;
        // The offer is one card per id, so the id IS a stable uid.
        out.push(scaledCardVM(`reward-${id}`, card, stats));
    }
    return out;
}

// ── The momentum chain chip ──────────────────────────────────────────────────

/** The stance that advances the chain next — the successor in chain order. */
function nextChainColor(s: WheelStance): WheelStance {
    return MOMENTUM_CHAIN_ORDER[(MOMENTUM_CHAIN_ORDER.indexOf(s) + 1) % MOMENTUM_CHAIN_ORDER.length];
}

/**
 * Reshapes momentum to the chain chip. `state.momentumV2`
 * ({color,length}|null) drives it; the transient BREAK / SURGE states — both of
 * which leave momentum null — are recovered from the most-recent momentum event
 * in the log so a just-broken chain reads LOUD, not merely empty.
 */
function momentumV2VM(state: CombatEncounterState): CombatMomentumV2VM {
    const m = state.momentumV2 ?? null;
    const color = m?.color ?? null;
    const length = m?.length ?? 0;
    // Only when the chain sits at null can a break/surge be the live transient —
    // any live chain already superseded them. Scan back for the last chain
    // event, but STOP at the current turn's dice roll: a transient is loud for
    // the turn it happened in, then decays to the plain empty chip.
    let broke = false;
    let surged = false;
    if (m === null) {
        for (let i = state.log.length - 1; i >= 0; i--) {
            const ev = state.log[i];
            if (ev.kind === 'turn-dice-rolled') break;   // turn boundary — transient expired
            if (ev.kind === 'momentum-broken') { broke = true; break; }
            if (ev.kind === 'momentum-surged') { surged = true; break; }
            if (ev.kind === 'momentum-advanced') break;  // a live chain formed after
        }
    }
    const next = color ? nextChainColor(color) : null;
    const surgeAt = MOMENTUM_SURGE_LENGTH;
    // The played sequence, reconstructed backwards from the chain's end: link i
    // sits (length-1-i) steps BEFORE `color` in the cyclic chain order.
    const chain: WheelStance[] = color === null ? [] : Array.from({ length }, (_u, i) => {
        const at = MOMENTUM_CHAIN_ORDER.indexOf(color) - (length - 1 - i);
        return MOMENTUM_CHAIN_ORDER[((at % MOMENTUM_CHAIN_ORDER.length) + MOMENTUM_CHAIN_ORDER.length) % MOMENTUM_CHAIN_ORDER.length];
    });
    return {
        color, length, chain, surgeAt, next, broke, surged,
        colorHex: color ? STANCE_COLORS[color] : HUE.inertGrey,
        a11y: momentumV2A11y({ color, length, next, surgeAt, broke, surged }),
    };
}

// ── Die-gear rail + payload-only inspection ──────────────────────────────────

const GEAR_RAIL_ORDER: readonly ('heart' | 'body' | 'mind' | 'wild')[] = ['heart', 'body', 'mind', 'wild'];

function gearSlotVM(state: CombatEncounterState, color: 'heart' | 'body' | 'mind' | 'wild'): CombatDieGearSlotVM {
    // The upgraded gear if present; else the engine's stock default (activeDieGear resolves both).
    const gear: UpgradeableDieGear = activeDieGear(state, color);
    const missFaces = Math.max(0, 6 - gear.specialFaces - gear.manaFaces);
    const stock = DEFAULT_DIE_GEAR[color];
    const upgraded = gear.specialFaces !== stock.specialFaces
        || gear.manaFaces !== stock.manaFaces
        || gear.specialConviction !== stock.specialConviction;
    const faceTable = `${gear.specialFaces} boon · ${gear.manaFaces} mana · ${missFaces} miss`;
    const payload = `+${gear.specialConviction} ◆`;
    const label = STANCE_LABELS[color] ?? color.toUpperCase();
    return {
        color, label, glyph: DIE_GLYPHS[color] ?? '?', colorHex: STANCE_COLORS[color] ?? HUE.fallbackGrey,
        specialFaces: gear.specialFaces, manaFaces: gear.manaFaces, missFaces,
        specialConviction: gear.specialConviction, faceTable, payload, upgraded,
        a11y: `${label} die gear — ${faceTable}. Boon face grants ${payload}.`
            + (upgraded ? ' Upgraded from stock.' : ' Stock.'),
    };
}

function dieGearRailVM(state: CombatEncounterState): CombatDieGearRailVM {
    return { slots: GEAR_RAIL_ORDER.map((c) => gearSlotVM(state, c)) };
}

// ── Entry point ──────────────────────────────────────────────────────────────

/** `beaten`: the save records this foe as beaten, so its DANGER names show. */
export function buildCombatViewModel(state: CombatEncounterState, beaten = false): CombatViewModel {
    const total = state.threatPhases.length;
    const idx = Math.min(state.currentPhaseIndex, total - 1);
    const dice = diceVM(state);
    return {
        phase: state.phase,
        enemy: enemyPane(state, beaten),
        player: playerPane(state),
        dice,
        reserveRoom: (state.reserve ?? []).length < RESERVE_MAX,
        resonance: { heart: 0, body: 0, mind: 0, ...(state.resonance ?? {}) },
        diceRolled: state.dice.length > 0,
        conviction: state.conviction,
        signatures: signaturesVM(state),
        hand: handVM(state),
        ledger: state.threatMarks,
        phaseBadge: `PHASE ${idx + 1}/${total}`,
        roundLabel: `ROUND ${state.round}`,
        turnLabel: `TURN ${state.turn}`,
        metaLine: `PHASE ${idx + 1}/${total} · ROUND ${state.round} · TURN ${state.turn}`,
        deckCount: state.drawPile.length,
        discardCount: state.discard.length,
        discardCards: state.discard.map((id) => ({ id, name: getCardById(id)?.name ?? id })),
        momentumV2: momentumV2VM(state),
        dieGear: dieGearRailVM(state),
        globals: globalsVM(state),
    };
}

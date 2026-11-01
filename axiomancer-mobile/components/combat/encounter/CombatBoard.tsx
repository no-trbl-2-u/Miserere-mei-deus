/**
 * The Combat board (HP model + drag-to-power UX); layout per
 * axiomancer-mobile/design/combat-screen-polish-2026-07.md.
 *
 * The interaction model:
 *   1. drag a card UP into the play region to STAGE it (drag to SCRAP to discard);
 *   2. drag a DIE onto the staged card to power it (the die is *selected*, not
 *      yet committed — you can re-drag a different die);
 *   3. read the card's live keyword line (the stance-read + projected hit);
 *   4. tap APPLY (the ribbon fused to the staged card) to commit.
 * Every die is chosen explicitly (no draft): a die powers only the card it
 * was dropped (or tapped) onto, and a card with no die commits FREE. Nothing
 * auto-attaches, so a die never appears to power the next card.
 *
 * The housing is a full-bleed battlefield with floating chrome:
 *   battlefield + top HUD      → CombatCombatantPane (absolute-fill overlay)
 *   play region                → invisible drop target; dashed affordance only
 *                                while a card drag is live; staged cards float
 *   signature rune column      → left edge, under the foe's intent
 *                                (conviction chip + circular runes)
 *   dice row                   → free-floating gem dice above the hand
 *   hand fan                   → full board width, no corner chrome
 *   footer dock                → avatar (tap = pilgrim modal) · VITAE column
 *                                (value, piles, fill bar, phase ledger) · END
 *                                (`CombatFooterDock`)
 *
 * The drag ghost renders at screen level in `CombatEncounterPanel`.
 */

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { LayoutChangeEvent, StyleProp, TextStyle } from 'react-native';
import { Image } from '@/lib/platform/image';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Haptics } from '@/lib/platform/haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    FadeIn, FadeInDown, LinearTransition, runOnJS,
    useAnimatedStyle, useSharedValue,
    type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { FONTS, HUE } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import type {
    CombatViewModel, CombatCardVM, CombatDieVM,
    CombatSignatureVM, CombatEffectChipVM,
    CombatMomentumV2VM,
} from '@/state/presenters/combat-encounter.engine';
import { armedValue, dieCanPowerCardVM, DEAD_TRAY_COPY, selectDeadTray, STANCE_COLORS, PROGRAM_COPY } from '@/state/presenters/combat-encounter.engine';
import { paidLineFit, paidLineRuns, GLYPH_EM, GLYPH_GAP, PAID_LINE_LEADING, PAID_LINE_ROWS, PAID_CAPS_SPACING } from '@/state/presenters/paid-line.engine';
import { glyphKeywordFor } from '@/state/presenters/keyword-glyph.engine';
import { KeywordGlyph } from '@/components/keyword-glyphs';
import { useSetting } from '@/state/settings';
import { globalDurationLine } from '@/state/presenters/card-program.engine';
// The ONE mobile source for the rarity band. The face never
// re-bands a rank and never re-types a rarity hue; see `card-rarity.engine.ts`.
import { rarityFor, RARITY_LABEL, RARITY_COLOR } from '@/state/presenters/card-rarity.engine';
import { TrashGlyph } from '@/components/hazard/glyphs';
import { glyphShapeFor } from '@/components/combat/glyphShapes';
import { CombatCombatantPane, EffectChips, PlayerMedallion, COMBAT_HUD_HEIGHT, type CombatFx } from './CombatCombatantPane';
import { CombatFooterDock, dockMinHeight } from './CombatFooterDock';
import { SACRIFICE_CALLOUT_MS } from './VitaeSacrificeCallout';
import { CARD_ENTER_MS, CARD_LAYOUT_MS } from './cardMotion';
import type { BoardGlossLive, BoardTermId } from '@/state/combat/keywords';
import { CombatDie, combatDieA11yLabel } from './CombatDie';
import { RollingDie } from './RollingDie';
import { CombatGear, useGearFired } from './CombatGear';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
    planDiceRoll, rollSignatureMap, resolveRollMode, shouldInstantSettleDice,
    type DieRollPlan,
} from '@/state/combat/dice-roll-ritual';
import { DICE_ROLL_TIMING } from '@/state/combat/dice-roll-ritual.timing';
import { juiceHaptics, useJuicePulse, useJuiceShake } from '@/lib/juice';

// Per-card art registry (temp art pass) — keyed by cardId, falls back to the
// circe placeholder for unmapped ids. Stance tint + glyph still ride on top.
import { getCardArt } from '@/assets/images/cards';

// ── Layout-animation builders (hoisted, identity-stable) ─────────────────────
// Reanimated compares an Animated component's `layout` / `exiting` prop by
// IDENTITY on every update (`AnimatedComponent.componentDidUpdate` →
// `_configureLayoutAnimation`). `LinearTransition.duration(160)` written inline
// is a NEW builder each render, so every re-render of a fanned card re-built
// the layout worklet, serialised it to the UI runtime and pushed it through
// `configureLayoutAnimationBatch` — once on a drag pickup (the lifted card) and
// once per fanned card on every stage/unstage commit, all on the JS thread
// while the finger is moving. Built once here, the comparison short-circuits.
// (Drag-perf hypothesis 4, layout animations on the drag path; see
// docs/perf/combat-drag-baseline.md.) `entering` is only read at mount, but
// shares the convention so no builder on the board is allocated per render.
export const FAN_CARD_ENTERING = FadeIn.duration(CARD_ENTER_MS);
export const FAN_CARD_LAYOUT = LinearTransition.duration(CARD_LAYOUT_MS);

/**
 * The fan's slide-together transition, per platform.
 *
 * Why it exists (drag-perf hypothesis 4, measured on web): Reanimated's web
 * layout transitions snapshot every updating node with a forced
 * `getBoundingClientRect` in `getSnapshotBeforeUpdate` AND again in
 * `componentDidUpdate` (`tryActivateLayoutTransition`), then generate and
 * insert a CSS keyframe rule per node. A stage or unstage re-lays out every
 * fanned card, so that commit forced a synchronous layout per card,
 * interleaved with the drag ghost's style writes — the 200-370ms frame right
 * after a release. Web drops the transition (cards close the gap in one
 * frame); native keeps it until a device trace says otherwise (see
 * docs/perf/combat-drag-baseline.md, "remaining").
 *
 * @param os - the platform (`Platform.OS`); a parameter so the choice is testable.
 * @returns the layout builder for the fanned card, or undefined for none.
 */
export function fanCardLayoutFor(os: string): typeof FAN_CARD_LAYOUT | undefined {
    return os === 'web' ? undefined : FAN_CARD_LAYOUT;
}
const FAN_CARD_LAYOUT_HERE = fanCardLayoutFor(Platform.OS);
const STAGED_CARD_ENTERING = FadeInDown.duration(CARD_ENTER_MS);
const PLAY_HINT_ENTERING = FadeIn.duration(150);
const REJECT_LINE_ENTERING = FadeIn.duration(120);

// ── Drag plumbing (cards AND dice) ───────────────────────────────────────────

export type DragPayload =
    | { type: 'card'; from: 'hand' | 'play'; uid: string; card: CombatCardVM }
    | { type: 'die'; dieId: string; die: CombatDieVM };

export interface DragController {
    begin: (payload: DragPayload, x: number, y: number) => void;
    end: (x: number, y: number) => void;
    active: DragPayload | null;
    /** Ghost position shared values — written DIRECTLY from the gesture worklet
     *  every frame (no runOnJS hop; a per-frame UI→JS round-trip made card drags
     *  stutter whenever the JS thread was busy). begin/end still cross to JS once. */
    x: SharedValue<number>;
    y: SharedValue<number>;
    /** Screen rects of every drop-INELIGIBLE staged card for the die drag in
     *  flight (off-color or already armed). Measured once at die-drag begin by
     *  the board; the panel's drag ghost derives its ✕ "can't land here" cue
     *  from pointer-in-rect per frame on the UI thread. Optional — mock drag
     *  controllers in tests omit it. */
    badRects?: SharedValue<Rect[]>;
}

export interface Rect { x: number; y: number; width: number; height: number; }
function rectContains(r: Rect | null, x: number, y: number, pad = 0): boolean {
    if (!r) return false;
    return x >= r.x - pad && x <= r.x + r.width + pad && y >= r.y - pad && y <= r.y + r.height + pad;
}
function measureRect(ref: React.RefObject<View | null>): Promise<Rect | null> {
    return new Promise((resolve) => {
        const node = ref.current;
        if (!node) { resolve(null); return; }
        // Page coords, like the gesture's absoluteX/Y (see HazardBoard measureRect).
        node.measure((_x, _y, width, height, pageX, pageY) => resolve({ x: pageX, y: pageY, width, height }));
    });
}

/**
 * Pure die-drop targeting (unit-testable; `resolveDrop` feeds it the
 * measurements). `hitUid` is the staged card the pointer released over (null =
 * a loose drop); `inPlayArea` is whether the release landed inside the play
 * region. Enforces THE COLOR LAW (see `dieCanPowerCardVM` — the engine's
 * `playCombatCard` gate, combat.engine.ts ~:1339) AND the one-die-per-card
 * staging law at the drop itself:
 *   · a direct hit on an ineligible card — off-color, OR already carrying a
 *     dropped die — REJECTS (returns null: the die snaps home, nothing is
 *     selected, no fizzle can ever reach the engine);
 *   · the loose-drop forgiveness only ever lands on a color-legal card that
 *     is not already armed.
 * `blockOf` names why a card's PAID line cannot be played now (the engine's
 * `paidBlock`, null = it can); a die never lands on such a card, so it is
 * never held by a card whose APPLY would refuse it.
 */
export function resolveDieDropTarget(
    die: { color: string; isX?: boolean },
    hitUid: string | null,
    inPlayArea: boolean,
    stagedUids: string[],
    stanceOf: (uid: string) => string | undefined,
    pendingByUid: Record<string, string>,
    blockOf: (uid: string) => string | null = () => null,
): string | null {
    const legal = (uid: string) => {
        const stance = stanceOf(uid);
        return !!stance && dieCanPowerCardVM(die, stance) && !pendingByUid[uid] && !blockOf(uid);
    };
    if (hitUid) return legal(hitUid) ? hitUid : null;
    if (!inPlayArea) return null;
    const eligible = stagedUids.filter(legal);
    return eligible[0] ?? null;
}

/**
 * Keep only the pending die picks whose card is still staged — returning the
 * SAME object when nothing was dropped.
 *
 * Why it exists (drag-perf hypothesis 1, re-renders on the drag path): the
 * board prunes its picks in an effect on every staging change. Building a
 * fresh `{}` each time made React schedule a second board commit on every
 * stage and unstage (a drop's own commit, then this one), and the new object
 * re-keyed `assignedDieIds`, re-rendering the dice tray for nothing. Same
 * identity in, same identity out lets React bail out of the update.
 */
export function prunePending(prev: Record<string, string>, stagedUids: string[]): Record<string, string> {
    const staged = new Set(stagedUids);
    const keys = Object.keys(prev);
    if (keys.every((uid) => staged.has(uid))) return prev;
    const next: Record<string, string> = {};
    for (const uid of keys) if (staged.has(uid)) next[uid] = prev[uid];
    return next;
}

/**
 * The unpaid SACRIFICE to flag on the VITAE ring when a die is refused (null =
 * no callout). The refusing card is the one hit, or, for a loose drop in the
 * play area, the only staged card. Only a colour-legal die on a card that holds
 * no die is refused by the card's PAID line; the shortfall is the engine's.
 */
export function refusedDieShortfall(
    die: { color: string; isX?: boolean },
    hitUid: string | null,
    stagedUids: string[],
    hand: readonly CombatCardVM[],
    pendingByUid: Record<string, string>,
): { cost: number; vitae: number } | null {
    const uid = hitUid ?? (stagedUids.length === 1 ? stagedUids[0] : null);
    const card = uid ? hand.find((c) => c.uid === uid) : undefined;
    if (!card || pendingByUid[card.uid] || !dieCanPowerCardVM(die, card.stance)) return null;
    return card.play?.paidShortfall ?? null;
}

/** Clear every pending die pick — the same object when already empty, so the
 *  turn-change reset (and the mount pass) costs no extra board commit (same
 *  reason as {@link prunePending}). */
export function clearPending(prev: Record<string, string>): Record<string, string> {
    return Object.keys(prev).length === 0 ? prev : {};
}

/**
 * The first staged card that holds a die on a PAID line whose random discard
 * cannot be paid (the engine's `paidDiscard`), or null. End turn is held
 * while one is staged.
 */
export function unpayableDiscardStaged(
    stagedUids: readonly string[],
    hand: readonly CombatCardVM[],
    armed: (uid: string) => boolean,
): { uid: string; name: string; discard: number; held: number } | null {
    for (const uid of stagedUids) {
        const card = hand.find((c) => c.uid === uid);
        const sf = card?.play?.paidDiscard;
        if (card && sf && armed(uid)) return { uid, name: card.name, discard: sf.discard, held: sf.held };
    }
    return null;
}

/** The armed staged card's tint (keyword/value/border + the APPLY ribbon).
 *  Every play lands printed, so there is one armed tint. */
const ARMED_ACCENT = HUE.stoneGrey;

// Render a sentence with each keyword name BOLDED (Sanguine-Step style). Shared by
// the large inspect card FACE (here) and the inspect modal (CombatEncounterPanel).
export function OutcomeText({ text, names, base, bold, numberOfLines }: { text: string; names: string[]; base: StyleProp<TextStyle>; bold: StyleProp<TextStyle>; numberOfLines?: number }) {
    const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(Boolean);
    if (escaped.length === 0) return <Text style={base} numberOfLines={numberOfLines}>{text}</Text>;
    const upper = new Set(names.map((n) => n.toUpperCase()));
    const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'gi'));
    return (
        <Text style={base} numberOfLines={numberOfLines}>
            {parts.map((p, i) => (upper.has(p.toUpperCase()) ? <Text key={i} style={bold}>{p}</Text> : <Text key={i}>{p}</Text>))}
        </Text>
    );
}

// ── Signature rune column (left edge) ────────────────────────────────────────

const SignatureColumn = React.memo(function SignatureColumn({ conviction, signatures, onCast, onInfo, onConviction, top, onMeasureHeight }: {
    conviction: number;
    /** Tap the Conviction chip: opens its gloss. */
    onConviction?: () => void;
    signatures: CombatSignatureVM[];
    onCast: (id: string) => void;
    /** `tapped` is true when a tap on a rune that cannot fire opened it (not a long-press). */
    onInfo?: (s: CombatSignatureVM, tapped?: boolean) => void;
    /** Measured anchor that keeps the column clear of the dice tray (see
     *  `sigTop` in `CombatBoard`). Undefined until the first layout pass, when
     *  the stylesheet's proportional `top` stands in. */
    top?: number;
    onMeasureHeight?: (h: number) => void;
}) {
    const AXM = usePalette();
    const styles = useStyles();
    return (
        <View
            style={[styles.sigColumn, top !== undefined ? { top } : null]}
            testID="combat-signature-bar"
            pointerEvents="box-none"
            onLayout={(e) => onMeasureHeight?.(e.nativeEvent.layout.height)}
        >
            <Pressable
                style={styles.convictionChip}
                testID="combat-conviction"
                onPress={onConviction}
                accessibilityRole="button"
                accessibilityLabel={`${conviction} conviction`}
                accessibilityHint="Tap to read what Conviction is"
            >
                <Text style={[styles.convictionText, { color: AXM.sulfur }]} allowFontScaling={false}>◆ {conviction}</Text>
                {/* Name the economy: every rune below is priced in ◆ and the
                  * enemy telegraph offers '+1◆', so the chip prints the word
                  * CONVICTION rather than leaving it to the a11y label. */}
                <Text style={styles.convictionCaption}>CONVICTION</Text>
            </Pressable>
            {signatures.map((s) => {
                // Three faces: castable (sulfur), short of Conviction (dim, ◆n),
                // refused for another reason (dashed blood ring and a ✕ mark), so
                // a rune more Conviction will not unlock never reads as a wait.
                const refused = !s.affordable && !!s.refused;
                const ring = s.affordable ? AXM.sulfur : refused ? AXM.blood : AXM.ash;
                return (
                <Pressable
                    key={s.id}
                    // NOT disabled while unaffordable — a tap then opens the info popup
                    // instead of casting, and a long-press explains any rune.
                    onPress={() => {
                        if (s.affordable) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined); onCast(s.id); }
                        else onInfo?.(s, true);
                    }}
                    onLongPress={() => onInfo?.(s)}
                    delayLongPress={350}
                    testID={`combat-signature-${s.id}`}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !s.affordable }}
                    accessibilityLabel={`${s.name}, costs ${s.cost} conviction. ${s.description}${s.affordable ? '' : ` — ${refused ? 'refused: ' : ''}${s.reason ?? 'not enough conviction'}`}`}
                    accessibilityHint="Long press for details"
                    style={[styles.sigRune, {
                        borderColor: ring, borderStyle: refused ? 'dashed' : 'solid',
                        opacity: s.affordable ? 1 : refused ? 0.8 : 0.55,
                    }]}
                >
                    <Text style={[styles.sigRuneIcon, { color: s.affordable ? AXM.sulfur : AXM.bone }]}>{s.icon}</Text>
                    {refused && (
                        <View style={[styles.sigRefusedMark, { borderColor: AXM.blood }]} testID={`combat-signature-refused-${s.id}`} pointerEvents="none">
                            <Text style={[styles.sigRefusedText, { color: AXM.blood }]} allowFontScaling={false}>✕</Text>
                        </View>
                    )}
                    <View style={styles.sigCostBadge}>
                        <Text style={[styles.sigCostText, { color: s.affordable ? AXM.sulfur : AXM.ash }]} allowFontScaling={false}>◆{s.cost}</Text>
                    </View>
                </Pressable>
                );
            })}
        </View>
    );
});

// ── Dice row (free-floating gems above the hand) ─────────────────────────────

const TRAY_DIE_SIZE = 47;

// The rune column's anchor: it starts just under the foe's intent block (the
// HUD's measured bottom plus a small gap), and keeps a clearance above the
// dice tray when a long signature list would otherwise push it onto the dice.
// The stylesheet's `top` stands in only until the first layout pass.
const SIG_COLUMN_TOP_FALLBACK = '34%' as const;
export const SIG_HUD_GAP = 8;
export const SIG_TRAY_CLEARANCE = 10;
// The column's own geometry (`sigColumn`, `convictionChip`, `sigRune` below),
// named so its height for N runes can be computed without a layout pass. The
// chip is its 1pt border twice, 3pt padding twice, the 18pt value line and
// the caption's 1pt margin plus 11pt line. A rune is 44pt (the touch-target
// floor) at a 6pt gap, so five fit between the intent block and the tray on a
// 375x812 screen (`CombatBoard.sig-column.test.tsx`).
export const SIG_RUNE_SIZE = 44;
export const SIG_COLUMN_GAP = 6;
export const SIG_CONVICTION_CHIP_H = 38;

/** The rune column's height for `runes` signatures: the conviction chip, then
 *  one rune per signature, `SIG_COLUMN_GAP` apart. */
export function signatureColumnHeight(runes: number): number {
    return SIG_CONVICTION_CHIP_H + runes * (SIG_RUNE_SIZE + SIG_COLUMN_GAP);
}

/**
 * Where the rune column starts, in the board's content coordinates.
 *
 * Inputs: the HUD's measured bottom (`hudBottom`, the foe's intent block
 * included), the dice tray's measured top (`trayTop`) and the column's
 * measured height (`sigH`). Undefined until all three have landed.
 *
 * The column sits `SIG_HUD_GAP` under the intent block; when that would run
 * its last rune into the tray, the tray clamp wins and the column rises (never
 * above the board's top).
 */
export function signatureColumnTop(hudBottom: number, trayTop: number, sigH: number): number | undefined {
    if (hudBottom <= 0 || trayTop <= 0 || sigH <= 0) return undefined;
    return Math.max(0, Math.min(hudBottom + SIG_HUD_GAP, trayTop - sigH - SIG_TRAY_CLEARANCE));
}

// ── The hand fan's band ──────────────────────────────────────────────────────
// No corner chrome sits beside the hand: the avatar and END live in the
// footer dock under it, so the fan lays out across the full board width less
// the board's own edge inset.
// Never tighter than a readable sliver, however large the hand.
export const HAND_FAN_MIN_STEP = 28;
// The board's own edge inset on either side of the fan. It must hold the
// outermost card's FREE pill (6pt past the face's left edge) plus the ~9pt its
// top-left corner swings out under a five-card fan's 6deg tilt, or the pill
// is cut at the screen edge.
export const HAND_FAN_BOARD_EDGE = 18;
// The widest a step may grow: a whole card plus this gap. A band with room
// lays the hand out side by side, so no card hides its right-hand (paid) column
// under a neighbour; a phone never has that room and keeps its overlap.
export const HAND_FAN_GAP = 8;
// The fan's bottom padding inside the hand dock, and the room the dock keeps
// above the cards' top edge for the FREE corner pill, which straddles it.
export const HAND_FAN_PAD_BOTTOM = 20;
export const HAND_PILL_OVERHANG = 16;

/**
 * The name band's own left chrome, in points — everything between a card face's
 * left edge and the first pixel of its NAME text.
 *
 * Derived, never guessed, from the styles it sums (all in `useStyles` below):
 *   1.5  `faceCard.borderWidth`
 * + 6    `plateBand.paddingHorizontal` (the left half)
 * + 5    `plateRaritySpacer.width` (the rarity spacer, read by a screen reader)
 * + 5    `plateBand.gap` (spacer → text)
 * = 17.5
 *
 * In the fan, card `i` is covered by card `i+1`, so only `step` points of a
 * covered card show, and this chrome eats the first 17.5 of them. The name
 * keeps one line and runs on under its neighbour; a tap reads it whole.
 *
 * Gated for real: `CombatBoard.handfan.test.tsx` renders
 * {@link useCombatBoardStyles} and sums `faceCard.borderWidth +
 * plateBand.paddingHorizontal + plateRaritySpacer.width + plateBand.gap` off
 * the SHIPPED sheet, so moving any one of those four styles turns this
 * constant red.
 */
export const NAME_BAND_LEFT_CHROME = 17.5;

/**
 * Lay the hand fan out across the full board width.
 *
 * Inputs: `screenW` (viewport width) and `n` (number of fanned cards).
 * Outputs: `band` — the width the fan lays out in (the screen less
 * `HAND_FAN_BOARD_EDGE` each side, never narrower than one card); `step` — the
 * visible width of each non-last card; `overlap` — the negative margin that
 * produces it.
 *
 * Pure: the board calls it once per render. A hand with room sits side by
 * side `HAND_FAN_GAP` apart; a phone hand overlaps, never below the
 * `HAND_FAN_MIN_STEP` sliver.
 */
export function handFanLayout(screenW: number, n: number): { band: number; step: number; overlap: number } {
    const band = Math.max(HAND_CARD_W, screenW - HAND_FAN_BOARD_EDGE * 2);
    const step = n > 1
        ? Math.min(HAND_CARD_W + HAND_FAN_GAP, Math.max(HAND_FAN_MIN_STEP, (band - HAND_CARD_W) / (n - 1)))
        : HAND_CARD_W;
    return { band, step, overlap: HAND_CARD_W - step };
}

/** What a touch on the board asks the glossary to open: the terms in order
 *  (the first is the heading) and the live numbers they print. */
export type BoardGlossOpen = (ids: readonly BoardTermId[], live?: BoardGlossLive) => void;

/**
 * The glossary terms a tray die opens: its face (BOON, MANA or MISS), then
 * BANKED when it sits in the Reserve and GHOST when it floats. A struck X die
 * opens X DIE and the card-side X beside it.
 */
export function dieGlossTerms(die: Pick<CombatDieVM, 'isX' | 'face' | 'cracked' | 'reserve' | 'floating'>): BoardTermId[] {
    if (die.isX) return ['xdie', 'xvaries'];
    const ids: BoardTermId[] = [];
    if (die.cracked || die.face === 'miss') ids.push('miss');
    else if (die.face === 'special') ids.push('boon');
    else if (die.face === 'mana') ids.push('mana');
    if (die.reserve) ids.push('banked');
    if (die.floating) ids.push('ghost');
    return ids.length > 0 ? ids : ['mana'];
}

// Memoized: a card drag's pickup and drop re-render the board, and the tray's
// GestureDetectors must not re-push their configs to the native module then.
const DiceRow = React.memo(function DiceRow({
    vm, dieGesture, draggingDieId, assignedDieIds, onGloss,
}: {
    vm: CombatViewModel;
    dieGesture: (die: CombatDieVM) => ReturnType<typeof Gesture.Exclusive> | ReturnType<typeof Gesture.LongPress>;
    draggingDieId: string | null;
    assignedDieIds: Set<string>;
    /** Opens the X die's gloss on a tap (a live die opens its gloss on a long-press instead). */
    onGloss?: BoardGlossOpen;
}) {
    const AXM = usePalette();
    const styles = useStyles();

    // ── The Roll Ritual ──────────────────────────────────────────────────────
    // The tumble choreographs the four dice onto the faces the engine ALREADY
    // rolled — it never decides an outcome.
    const reducedMotion = useReducedMotion();
    const mode = resolveRollMode({ reducedMotion, instantSettle: shouldInstantSettleDice() });
    // Previous roll's face signatures — diffed so a round-start roll re-tumbles
    // everything while a reroll re-tumbles ONLY the rerolled dice.
    const prevSigRef = useRef<Record<string, string> | null>(null);
    const plansById = useMemo<Record<string, DieRollPlan>>(() => {
        const plans = planDiceRoll(vm.dice, prevSigRef.current, mode, DICE_ROLL_TIMING);
        const byId: Record<string, DieRollPlan> = {};
        for (const p of plans) byId[p.id] = p;
        return byId;
        // vm.dice is the roll identity; prevSigRef is read intentionally-stale.
    }, [vm.dice, mode]);
    useEffect(() => {
        prevSigRef.current = rollSignatureMap(vm.dice);
    }, [vm.dice]);
    // Tap-to-skip + the tray overlay gate (only while a die is mid-tumble).
    const [skipNonce, setSkipNonce] = useState(0);
    const tumblingIds = useRef<Set<string>>(new Set());
    const [anyTumbling, setAnyTumbling] = useState(false);
    const onTumbleChange = useCallback((id: string, on: boolean) => {
        const s = tumblingIds.current;
        if (on) s.add(id); else s.delete(id);
        setAnyTumbling(s.size > 0);
    }, []);

    return (
        <View style={styles.diceRow} testID="combat-dice-tray" pointerEvents="box-none">
            {vm.dice.map((die) => {
                // Every live die — tray face, Reserve, or GHOST — drags onto a
                // card until it is spent (one die per play).
                // Presenter-computed (CombatDieVM.draggable) so it can never flip
                // while the die's own drag is live. Every die keeps ONE mounted
                // GestureDetector for the same reason: unmounting it mid-gesture
                // killed the pan on web without onEnd/onFinalize (the drop never
                // resolved and the ghost stuck).
                const isAssigned = assignedDieIds.has(die.id);
                // An X die (the `reroll_spent` bag can still land one) is
                // dead — a static struck pip, never draggable.
                if (die.isX) {
                    return (
                        <Pressable
                            key={die.id}
                            style={styles.dieXPip}
                            onPress={() => onGloss?.(dieGlossTerms(die))}
                            testID={`combat-die-x-${die.id}`}
                            accessibilityRole="button"
                            accessibilityLabel="X die — blocked, powers nothing"
                            accessibilityHint="Tap to read what an X die is"
                        >
                            <Text style={styles.dieXGlyph}>✕</Text>
                        </Pressable>
                    );
                }
                const dieDimmed = draggingDieId === die.id;
                // What the worn weapon's special does, spoken in the die's a11y label.
                const special = vm.specialGloss;
                const node = (
                    <View style={isAssigned ? styles.dieAssigned : undefined}>
                        {plansById[die.id] ? (
                            <RollingDie
                                die={die}
                                size={TRAY_DIE_SIZE}
                                dimmed={dieDimmed}
                                mode={mode}
                                plan={plansById[die.id]}
                                skipNonce={skipNonce}
                                onTumbleChange={onTumbleChange}
                                assigned={isAssigned}
                                specialText={special}
                            />
                        ) : (
                            <CombatDie die={die} size={TRAY_DIE_SIZE} dimmed={dieDimmed} assigned={isAssigned} specialText={special} />
                        )}
                        {die.reserve ? (
                            <Text style={[styles.dieConv, { color: AXM.sulfur }]} testID={`combat-reserve-${die.id}`}>
                                ⏳{die.pips ? ` +${die.pips}✦` : ''} BANKED
                            </Text>
                        ) : null}
                        {die.floating ? (
                            <Text style={[styles.dieConv, { color: AXM.sulfur }]} testID={`combat-floating-${die.id}`}>
                                ✦ GHOST
                            </Text>
                        ) : null}
                    </View>
                );
                // A die that cannot be dragged (a MISS face, a spent die) still
                // reads on a long-press, so it keeps a detector with the hold alone.
                return (
                    <GestureDetector key={die.id} gesture={dieGesture(die)}>
                        <Animated.View>
                            {node}
                        </Animated.View>
                    </GestureDetector>
                );
            })}
            {/* Tap-to-skip: while any die is mid-tumble a
                transparent overlay catches a tap and snaps every die to its
                settled (engine-rolled) face. Absent once settled, so it never
                sits in front of the dice drags. */}
            {anyTumbling ? (
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={() => setSkipNonce((n) => n + 1)}
                    testID="combat-dice-skip"
                    accessibilityRole="button"
                    accessibilityLabel="Skip the dice roll animation"
                />
            ) : null}
        </View>
    );
});

// ── Staged card (die socket · fused APPLY ribbon) ────────────────────────────

export const StagedCard = React.memo(function StagedCard({
    card, assignedDie, onApply, gesture, register, compact = false, popKey = 0, socketPulse = false,
    dropIneligible = false, rejectKey = 0, freeProminent = false, x = null, onX, onRefuse, onRefuseDiscard,
}: {
    card: CombatCardVM;
    /** A refused APPLY on an armed PAID line whose random discard cannot be
     *  paid: the board shakes this card and names the shortfall (uid). */
    onRefuseDiscard?: (uid: string) => void;
    /** A refused APPLY hands up the line's unpaid SACRIFICE (null when the
     *  refusal is not the SACRIFICE floor) for the VITAE ring callout. */
    onRefuse?: (shortfall: { cost: number; vitae: number } | null) => void;
    assignedDie: CombatDieVM | null;
    /** The amount chosen for an armed "SACRIFICE any amount" line (null = none). */
    x?: number | null;
    /** Steps that amount (uid, delta). */
    onX?: (uid: string, delta: number) => void;
    /** Stable dispatcher — called with the card uid (memo-friendly). */
    onApply: (uid: string) => void;
    gesture: ReturnType<typeof Gesture.Exclusive>;
    /** Stable registrar — (uid, node) for the die drop-target measurement. */
    register: (uid: string, node: View | null) => void;
    compact?: boolean;
    /** Rising nonce: when it changes (>0) this card just received a dropped die →
     *  a brief 1.05 scale-pop confirms the drop landed HERE (and only here). */
    popKey?: number;
    /** True while a die drag is live — highlights the empty die socket. (A static
     *  highlight, deliberately not an animation: N staged cards each running an
     *  infinite pulse measurably chugged die drags.) */
    socketPulse?: boolean;
    /** THE COLOR LAW + staging law during a die drag: true while the dragged
     *  die CANNOT land on this card — off-color (non-wild) OR the card already
     *  carries a dropped die — the card dims like every other disabled
     *  control and reads disabled to a11y; the drop itself is rejected in
     *  `resolveDieDropTarget`. */
    dropIneligible?: boolean;
    /** Rising nonce: a drop on this card was just REJECTED → a brief shake
     *  (the loud-rejection cue; the reason line renders at board level). */
    rejectKey?: number;
    /** Dead-tray state (no die in the tray can power ANY hand card): the
     *  FREE action is the out — the APPLY · FREE ribbon reads prominent. */
    freeProminent?: boolean;
}) {
    const AXM = usePalette();
    const styles = useStyles();
    const f = card.face;
    // Drop-confirmation pop (a nudge, not the full status-proc "main event")
    // and rejection SHAKE (a quick left-right shudder on the exact card that
    // refused the drop) — lib/juice primitives, reduced-motion + escape-hatch
    // gated centrally.
    const popStyle = useJuicePulse(popKey, 0.4);
    const shakeStyle = useJuiceShake(rejectKey, 'low');
    const armed = assignedDie !== null;
    const armedColor = armed ? ARMED_ACCENT : AXM.bone;
    // Staged faces track the hand-card proportion.
    const cardW = compact ? 92 : 112;
    const cardH = compact ? 135 : 164;
    // The keyword line shows the POWER value the play will land at commit —
    // the printed number; the armed die adds nothing.
    let heroOverride: string | undefined;
    if (armed && f.armable) {
        const g = armedValue(f);
        // Commit value: Guard NN / +NN% Vulnerable / NN DoT total.
        if (g != null) heroOverride = f.kind === 'guard' ? `Guard ${g}` : f.kind === 'vulnerable' ? `+${g}%` : `${g}`;
    }
    // The APPLY suffix: a powered play names the die color; the dieless out
    // reads FREE.
    // A program line the engine says cannot be played now: the ribbon names
    // the reason and refuses the tap (a die does not change a FREE refusal).
    const blocked = card.play ? (armed ? card.play.paidBlock : card.play.freeBlock) : null;
    const xRange = armed ? card.play?.xRange ?? null : null;
    const applyLabel = blocked
        ? `✕ ${blocked}`
        : !armed
        ? 'APPLY · FREE'
        : assignedDie?.color
            ? `APPLY · ${assignedDie.color.toUpperCase()} DIE`
            : 'APPLY · POWERED';
    return (
        <View style={styles.stagedCol}>
            <GestureDetector gesture={gesture}>
                <Animated.View
                    ref={(node) => register(card.uid, node as unknown as View | null)}
                    entering={STAGED_CARD_ENTERING}
                    testID={`combat-staged-${card.uid}`}
                    accessible
                    accessibilityRole="button"
                    accessibilityState={{ disabled: dropIneligible }}
                    accessibilityLabel={dropIneligible
                        ? card.play?.paidBlock
                            ? `${card.name} staged — ${PROGRAM_COPY.blocked(card.name, card.play.paidBlock)}.`
                            : `${card.name} staged — only a ${card.stance.toUpperCase()} or WILD die can power this card.`
                        : assignedDie
                            ? `${card.name} staged — ${f.verbLine}. ${combatDieA11yLabel(assignedDie, { assigned: true })}. Tap to unstage.`
                            : `${card.name} staged — ${f.verbLine}. Tap to unstage.`}
                >
                  {/* inner wrappers carry the drop-pop scale + reject shake so
                      neither fights the outer entering animation's transform —
                      nested so each juice primitive's own transform composes
                      independently (RN style-array merge does not combine two
                      `transform` arrays) — and the COLOR-LAW dim (an off-color
                      die in flight can't land here; matches the
                      sigRune/dieAssigned disabled-opacity language). */}
                  <Animated.View style={shakeStyle}>
                  <Animated.View style={[popStyle, dropIneligible ? { opacity: 0.4 } : null]}>
                    <CombatCardFace
                        card={card}
                        width={cardW}
                        height={cardH}
                        accent={armed ? armedColor : null}
                        heroOverride={heroOverride}
                    />
                    {/* die socket notched into the top-right corner: dashed target while
                        empty (highlighted during a die drag), the assigned die once armed. */}
                    {/* testID must NOT share the `combat-die-` prefix (e2e drags dice by prefix) */}
                    <View style={[styles.dieSocket, socketPulse && !assignedDie ? { transform: [{ scale: 1.12 }] } : null]} testID={assignedDie ? undefined : `combat-socket-${card.uid}`}>
                        {assignedDie ? (
                            <View testID="combat-staged-die">
                                {/* The socket's copy answers to its OWN id — the prefix
                                    warning above applies to the die face too, not just
                                    this wrapper: an armed card otherwise put a second
                                    `combat-die-<id>` node on the board. */}
                                <CombatDie die={assignedDie} size={compact ? 26 : 32} testID="combat-staged-die-face" assigned nested />
                            </View>
                        ) : (
                            <View style={[styles.dieSocketEmpty, socketPulse ? { borderColor: AXM.sulfur, backgroundColor: 'rgba(212,192,38,0.18)' } : null]}>
                                <Text style={[styles.dieSocketGlyph, socketPulse ? { color: AXM.sulfur } : null]}>⬡</Text>
                            </View>
                        )}
                    </View>
                  </Animated.View>
                  </Animated.View>
                </Animated.View>
            </GestureDetector>
            {xRange && x !== null ? (
                <View style={[styles.xRow, { width: cardW }]} testID={`combat-x-${card.uid}`}>
                    <Pressable onPress={() => onX?.(card.uid, -1)} hitSlop={6} accessibilityRole="button" accessibilityLabel={PROGRAM_COPY.xLess} testID={`combat-x-less-${card.uid}`}>
                        <Text style={styles.xStep}>−</Text>
                    </Pressable>
                    <Text style={styles.xValue} numberOfLines={1} testID={`combat-x-value-${card.uid}`}>{`${PROGRAM_COPY.xLabel} ${x}`}</Text>
                    <Pressable onPress={() => onX?.(card.uid, 1)} hitSlop={6} accessibilityRole="button" accessibilityLabel={PROGRAM_COPY.xMore} testID={`combat-x-more-${card.uid}`}>
                        <Text style={styles.xStep}>+</Text>
                    </Pressable>
                </View>
            ) : null}
            <Pressable
                onPress={() => {
                    if (blocked) {
                        juiceHaptics.notify(Haptics.NotificationFeedbackType.Error);
                        onRefuse?.((armed ? card.play?.paidShortfall : card.play?.freeShortfall) ?? null);
                        if (armed && card.play?.paidDiscard) onRefuseDiscard?.(card.uid);
                        return;
                    }
                    Haptics.impactAsync(armed ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
                    onApply(card.uid);
                }}
                testID={`combat-apply-${card.uid}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: !!blocked }}
                accessibilityLabel={blocked ? `Cannot apply: ${blocked}` : armed ? `Apply powered: ${card.bottomActionText}` : `Apply free: ${card.topActionText}`}
                hitSlop={8}
                style={[
                    styles.applyRibbon,
                    { borderColor: armed ? armedColor : AXM.bone, backgroundColor: armed ? 'rgba(91,191,106,0.16)' : 'rgba(0,0,0,0.55)', width: cardW },
                    // Dead-tray telegraph: the FREE line is the live out — the
                    // ribbon lights sulfur so it reads as THE button to press.
                    !armed && freeProminent && { borderColor: AXM.sulfur, backgroundColor: 'rgba(212,192,38,0.16)' },
                    blocked ? { borderColor: AXM.blood, backgroundColor: AXM.bloodSubtle } : null,
                    compact && { paddingVertical: 3 },
                ]}
            >
                <Text style={[styles.applyText, { color: blocked ? AXM.blood : armed ? armedColor : freeProminent ? AXM.sulfur : AXM.parchment }, (compact || blocked) && { fontSize: 10, letterSpacing: 0.4 }]} numberOfLines={blocked ? 2 : 1} adjustsFontSizeToFit={!blocked}>
                    {applyLabel}
                </Text>
            </Pressable>
        </View>
    );
});

// ── The momentum chain chip ──────────────────────────────────────────────────

const CHAIN_GLYPHS: Record<string, string> = { heart: '♥', body: '⚡', mind: '★' };

// The momentum chip's ⓘ tap mark is a plated box of this width, set apart by
// this gap; `chipInfoGutter` mirrors the pair on the row's leading edge so the
// readout stays on the centre line.
// The glyph measures ~15pt in the capture (U+24D8 rides wide), so the box is
// sized to seat it with a plate's worth of air, borders included.
export const CHIP_INFO_MARK_W = 24;
export const CHIP_INFO_MARK_GAP = 5;

/** The momentum chain: a single color + length (heart→body→mind). A BREAK
 *  collapses it to null and reads LOUD (strict rule — the chip teaches it); a
 *  SURGE flashes gold.
 *
 *  Inputs: the momentum-V2 VM and the "how momentum works" opener. Output: the
 *  chip row. The chip opens a popup, so it carries a visible ⓘ mark. The mark
 *  carries its own backing plate (it sits on the arena floor, not on the
 *  readout's plate) and a mirrored leading gutter, so marking the chip neither
 *  costs the mark its contrast nor costs the readout its centre line. */
const MomentumChainChip = React.memo(function MomentumChainChip({ vm, onPress }: { vm: CombatMomentumV2VM; onPress?: () => void }) {
    const AXM = usePalette();
    const styles = useStyles();
    const { color, length, chain, surgeAt, next, broke, surged, a11y } = vm;
    return (
        <Pressable
            style={styles.wheelRow}
            onPress={onPress}
            testID="combat-momentum-v2"
            accessibilityRole="button"
            accessibilityLabel={a11y}
            accessibilityHint="Tap for how momentum works"
        >
            {/* The tap mark's mirror: an empty box of the mark's own
                footprint, so the readout stays on the centre line. */}
            <View style={styles.chipInfoGutter} testID="combat-momentum-info-gutter" />
            {broke ? (
                <Text style={[styles.chainBroke, { color: AXM.blood }]} allowFontScaling={false} testID="combat-momentum-broke">
                    ✕ MOMENTUM BROKEN
                </Text>
            ) : surged ? (
                <Text style={[styles.wheelCharged, { color: AXM.sulfur, textShadowColor: AXM.sulfur }]} allowFontScaling={false} testID="combat-momentum-surged">
                    ✦ MOMENTUM SURGE
                </Text>
            ) : color === null || length === 0 ? (
                <Text style={[styles.chainEmpty, { color: AXM.ash }]} allowFontScaling={false} testID="combat-momentum-empty">○ no momentum</Text>
            ) : (
                <>
                    {Array.from({ length: surgeAt }, (_u, i) => {
                        // Each lit node keeps the stance that was ACTUALLY played
                        // (vm.chain, play order) — a heart→body chain reads ♥ ⚡,
                        // never two copies of the chain's current color.
                        const link = chain[i];
                        const filled = link !== undefined;
                        const nodeHex = link ? STANCE_COLORS[link] : AXM.ash;
                        return (
                            <View
                                key={i}
                                style={[
                                    styles.chainNode,
                                    { borderColor: filled ? nodeHex : AXM.ash, backgroundColor: filled ? `${nodeHex}30` : 'rgba(0,0,0,0.5)' },
                                ]}
                            >
                                <Text style={[styles.wheelGlyph, { color: filled ? nodeHex : AXM.ash, textShadowColor: filled ? nodeHex : 'transparent' }]} allowFontScaling={false}>
                                    {link ? (CHAIN_GLYPHS[link] ?? '◆') : '·'}
                                </Text>
                            </View>
                        );
                    })}
                    {next ? (
                        <Text style={[styles.chainNext, { color: STANCE_COLORS[next] ?? AXM.bone }]} allowFontScaling={false}>
                            → {CHAIN_GLYPHS[next] ?? ''}
                        </Text>
                    ) : null}
                </>
            )}
            {/* The tap mark. Always drawn, in every chain state. */}
            <Text style={styles.chipInfoMark} allowFontScaling={false} testID="combat-momentum-info-mark">ⓘ</Text>
        </Pressable>
    );
});

// ── The board ────────────────────────────────────────────────────────────────

export interface CombatBoardProps {
    vm: CombatViewModel;
    drag: DragController;
    stagedUids: string[];
    /** Commit the staged card. `power` true → power it with `dieId` (the die the
     *  player dropped on it); `power` false → the FREE base action, no die
     *  (hazard model — the die is optional). */
    /** `x` is the amount chosen for a "SACRIFICE any amount" line. */
    onApply: (uid: string, dieId: string | null, power: boolean, x?: number) => void;
    onStage: (uid: string) => void;
    onUnstage: (uid: string) => void;
    onDiscard: (uid: string) => void;
    onSignature: (id: string) => void;
    onEndPhase: () => void;
    /** True while a threat phase is resolving (and its fx timeline plays).
     *  The END button renders disabled + dimmed and the auto-apply/end-phase
     *  handler no-ops, so a touch double-tap can't machine-gun several phases. */
    resolving?: boolean;
    onInspect: (card: CombatCardVM) => void;
    onChip?: (e: CombatEffectChipVM) => void;
    /** A touch on a board word or mark (the Conviction chip, a die, the piles,
     *  the phase ledger, `IN PLAY`) asks the glossary to open. The board drops
     *  the touch while a drag is live or a phase resolves. */
    onGloss?: BoardGlossOpen;
    /** Long-press (or tap while unaffordable) on a signature rune → info popup. */
    onSignatureInfo?: (s: CombatSignatureVM, tapped?: boolean) => void;
    /** Tap the player avatar → the pilgrim modal (stats, effects, combat log). */
    onPlayerInspect?: () => void;
    /** Tap the momentum chip → how-momentum-works popup. */
    onMomentumInfo?: () => void;
    /** Latest resolved engine events (drives enemy/player resolution feedback). */
    fx?: CombatFx;
    /** Reports the enemy HUD's measured bottom edge (screen-top-relative) on
     *  every layout pass, so a panel-level sibling anchored under the same HUD
     *  can track its real height instead of the static `COMBAT_HUD_HEIGHT`
     *  estimate. */
    onHudLayout?: (height: number) => void;
    /** The live map region (`vm.region` from the exploration screen), keying
     *  the arena backdrop plate. Omitted by the dev-only sandbox
     *  route, which falls back to the plate every unmapped region gets. */
    region?: string;
    /** Pays the Toll-Keeper's toll (phase EN1l). */
    onPayToll?: () => void;
}

export const CombatBoard = React.memo(function CombatBoard({
    vm, drag, stagedUids, onApply, onStage, onUnstage, onDiscard, onSignature, onEndPhase, resolving = false, onInspect, onChip, onGloss, onSignatureInfo, onPlayerInspect, onMomentumInfo, fx,
    onHudLayout, region, onPayToll,
}: CombatBoardProps) {
    const AXM = usePalette();
    const styles = useStyles();
    // Null-safe insets (the context is null with no SafeAreaProvider, e.g. in tests).
    const insets = useContext(SafeAreaInsetsContext);
    const topInset = insets?.top ?? 0;
    const bottomInset = insets?.bottom ?? 0;
    // Measured HUD bottom (see `onHudLayout` doc above) — falls back to the
    // static estimate until the first layout pass lands, same pattern as
    // `sigTop` below.
    const [hudMeasuredH, setHudMeasuredH] = useState(0);
    const hudBottom = hudMeasuredH > 0 ? hudMeasuredH : topInset + COMBAT_HUD_HEIGHT;
    const handleHudLayout = useCallback((h: number) => {
        setHudMeasuredH(h);
        onHudLayout?.(h);
    }, [onHudLayout]);
    const { width: screenW } = useWindowDimensions();
    const playAreaRef = useRef<View | null>(null);
    const trashRef = useRef<View | null>(null);
    // Per-staged-card measurable frames — used to drop a die onto a SPECIFIC card.
    const stagedRefs = useRef<Map<string, View>>(new Map());

    // Per-card die selection: the die the player has dragged onto each staged card
    // but not yet APPLYd. Local UI state — selecting/re-selecting is free; APPLY is
    // the commit. Each staged card shows exactly the die dragged onto it.
    const [pendingDieByUid, setPendingDieByUid] = useState<Record<string, string>>({});
    // The amount chosen per staged card for a "SACRIFICE any amount" line.
    const [xByUid, setXByUid] = useState<Record<string, number>>({});
    // Rising drop-confirmation nonce for the card a die just landed on (scale-pop).
    const [dropPop, setDropPop] = useState<{ uid: string; n: number }>({ uid: '', n: 0 });
    // Loud rejection: a rejected die drop shakes
    // the refusing card (`uid` — '' for a loose rejection) and surfaces the
    // reason as a visible line, auto-cleared after a beat.
    const [dropReject, setDropReject] = useState<{ uid: string; reason: string; n: number }>({ uid: '', reason: '', n: 0 });
    useEffect(() => {
        if (dropReject.n === 0) return;
        const t = setTimeout(() => setDropReject((prev) => (prev.n === dropReject.n ? { uid: '', reason: '', n: prev.n } : prev)), 2200);
        return () => clearTimeout(t);
    }, [dropReject.n]);
    // The SACRIFICE floor callout: a line refused because its SACRIFICE would
    // leave the player below 1 VITAE flags the VITAE ring with the engine's
    // numbers (the card VM's shortfall); any other refusal passes null. The
    // ring's label change is only heard with focus already on it, so each
    // refusal also announces the floor line once to a screen reader.
    const [vitaeCallout, setVitaeCallout] = useState<{ cost: number; vitae: number; n: number } | null>(null);
    const calloutN = useRef(0);
    const maxVitae = vm.player.maxHp;
    const flagShortfall = useCallback((sf: { cost: number; vitae: number } | null | undefined) => {
        if (!sf) return;
        calloutN.current += 1;
        setVitaeCallout({ cost: sf.cost, vitae: sf.vitae, n: calloutN.current });
        AccessibilityInfo.announceForAccessibility(PROGRAM_COPY.floorA11y(sf.vitae, maxVitae, sf.cost));
    }, [maxVitae]);
    useEffect(() => {
        if (!vitaeCallout) return;
        const t = setTimeout(() => setVitaeCallout(null), SACRIFICE_CALLOUT_MS);
        return () => clearTimeout(t);
    }, [vitaeCallout]);
    const stagedKey = stagedUids.join(',');
    // Clear pending selections when the turn's dice change…
    useEffect(() => { setPendingDieByUid(clearPending); }, [vm.turnLabel]);
    // …and drop entries for cards that are no longer staged.
    useEffect(() => {
        setPendingDieByUid((prev) => prunePending(prev, stagedUids));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stagedKey]);

    // Card stance by uid — the COLOR LAW checks key off this (uid → stance is
    // immutable for the life of the hand entry).
    const stanceOfUid = (uid: string): string | undefined => vm.hand.find((c) => c.uid === uid)?.stance;
    // Why a card's PAID line cannot be played now (null = it can): a die is
    // never dropped on such a card.
    const paidBlockOfUid = (uid: string): string | null => vm.hand.find((c) => c.uid === uid)?.play?.paidBlock ?? null;
    // DISPLAY (decoupled from commit): a staged card shows the die dropped on
    // it, but only while that die is still usable AND color-legal (drops are
    // already gated — this is the belt to the drop's braces), else null → the
    // card reads as FREE (no die). Nothing ever auto-attaches.
    const assignedDieFor = (uid: string): CombatDieVM | null => {
        const pid = pendingDieByUid[uid];
        if (!pid) return null;
        const d = vm.dice.find((x) => x.id === pid);
        const stance = stanceOfUid(uid);
        return d && !d.spent && !d.isX && stance && dieCanPowerCardVM(d, stance) ? d : null;
    };
    // Dim every die that's pending-assigned to some card.
    const assignedDieIds = useMemo(() => new Set<string>(Object.values(pendingDieByUid)), [pendingDieByUid]);

    const resolveDrop = useCallback(async (payload: DragPayload, x: number, y: number) => {
        if (x < 0 && y < 0) return;
        if (payload.type === 'die') {
            // Per-card targeting: drop a die onto a SPECIFIC staged card to power it.
            // All staged rects are measured in ONE parallel round-trip — awaiting
            // them sequentially cost O(N) async hops per drop with N staged cards.
            let hitUid: string | null = null;
            const measured = await Promise.all(stagedUids.map(async (uid) => {
                const node = stagedRefs.current.get(uid);
                if (!node) return null;
                const rect = await measureRect({ current: node });
                return { uid, rect };
            }));
            for (const m of measured) {
                if (m && rectContains(m.rect, x, y, 16)) { hitUid = m.uid; break; }
            }
            const playRect = hitUid ? null : await measureRect(playAreaRef);
            const inPlayArea = hitUid ? true : rectContains(playRect, x, y, 24);
            // THE COLOR LAW gate + loose-drop forgiveness live in the pure
            // resolver: an off-color drop rejects (die snaps home, nothing is
            // selected, no fizzle ever reaches the engine); a loose drop lands
            // on a color-legal card only.
            const target = resolveDieDropTarget(
                payload.die, hitUid, inPlayArea, stagedUids, stanceOfUid, pendingDieByUid, paidBlockOfUid,
            );
            if (target) {
                juiceHaptics.impact(Haptics.ImpactFeedbackStyle.Rigid);
                const t = target;
                setPendingDieByUid((prev) => ({ ...prev, [t]: payload.dieId }));
                setDropPop((prev) => ({ uid: t, n: prev.n + 1 }));   // confirm the drop landed HERE
            } else if (hitUid || inPlayArea) {
                // LOUD rejection: the refusing card
                // shakes and the reason renders as a visible line — never just
                // an a11y whisper. A drop outside the play area stays silent
                // (that's an aborted drag, not a refusal).
                const card = hitUid ? vm.hand.find((c) => c.uid === hitUid) : undefined;
                const reason = card
                    ? (pendingDieByUid[hitUid!]
                        ? `${card.name} already holds a die — tap it to unstage first`
                        : !dieCanPowerCardVM(payload.die, card.stance)
                            ? `only a ${card.stance.toUpperCase()} or WILD die can power ${card.name}`
                            : PROGRAM_COPY.blocked(card.name, paidBlockOfUid(card.uid) ?? ''))
                    : 'no staged card can take this die';
                juiceHaptics.notify(Haptics.NotificationFeedbackType.Error);
                setDropReject((prev) => ({ uid: hitUid ?? '', reason, n: prev.n + 1 }));
                flagShortfall(refusedDieShortfall(payload.die, hitUid, stagedUids, vm.hand, pendingDieByUid));
            }
            return;
        }
        if (payload.from === 'hand') {
            const trashRect = await measureRect(trashRef);
            if (rectContains(trashRect, x, y, 18)) {
                // A Curse cannot be scrapped: refuse it loudly, the way an
                // off-colour die is refused.
                if (vm.hand.find((c) => c.uid === payload.uid)?.play?.unscrappable) {
                    juiceHaptics.notify(Haptics.NotificationFeedbackType.Error);
                    setDropReject((prev) => ({ uid: '', reason: PROGRAM_COPY.noScrap, n: prev.n + 1 }));
                    return;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
                onDiscard(payload.uid); return;
            }
            const playRect = await measureRect(playAreaRef);
            if (rectContains(playRect, x, y)) {
                // A card neither of whose lines can be played now is refused
                // loudly at the stage, so it cannot sit staged holding a die.
                const play = vm.hand.find((c) => c.uid === payload.uid)?.play;
                if (play?.freeBlock && play.paidBlock) {
                    juiceHaptics.notify(Haptics.NotificationFeedbackType.Error);
                    setDropReject((prev) => ({ uid: '', reason: PROGRAM_COPY.blocked(payload.card.name, play.freeBlock!), n: prev.n + 1 }));
                    flagShortfall(play.freeShortfall);
                    return;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                onStage(payload.uid);
            }
            // Drag that misses the play area is a no-op — the pan gesture already
            // fired, so the Exclusive tap handler is suppressed. Inspect is tap-only.
            return;
        }
        if (payload.from === 'play') {
            const playRect = await measureRect(playAreaRef);
            if (!rectContains(playRect, x, y)) onUnstage(payload.uid);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onDiscard, onStage, onUnstage, onInspect, stagedKey, pendingDieByUid]);

    (drag as DragController & { resolveDrop?: typeof resolveDrop }).resolveDrop = resolveDrop;

    // ── stable gesture layer (multi-card staging perf) ───────────────────────
    // Rebuilding gestures every render re-attaches every pan/tap handler on
    // the board and degrades drags while several cards sit staged. So:
    //   · latest handlers live in refs, bridged through IDENTITY-STABLE JS
    //     callbacks (runOnJS mappings never change);
    //   · each card/die gets its gesture built ONCE, cached by uid;
    //   · per-frame position updates write the shared values DIRECTLY on the
    //     UI thread — only begin (stage the ghost) and end (resolve) hop to JS.
    const handMapRef = useRef(new Map<string, CombatCardVM>());
    handMapRef.current = new Map(vm.hand.map((c) => [c.uid, c]));
    const diceMapRef = useRef(new Map<string, CombatDieVM>());
    diceMapRef.current = new Map(vm.dice.map((d) => [d.id, d]));
    const dragBeginRef = useRef(drag.begin); dragBeginRef.current = drag.begin;
    const dragEndRef = useRef(drag.end); dragEndRef.current = drag.end;
    const onInspectRef = useRef(onInspect); onInspectRef.current = onInspect;
    const onUnstageRef = useRef(onUnstage); onUnstageRef.current = onUnstage;

    const beginCardJS = useCallback((from: 'hand' | 'play', uid: string, x: number, y: number) => {
        const card = handMapRef.current.get(uid);
        if (card) dragBeginRef.current({ type: 'card', from, uid, card }, x, y);
    }, []);
    const beginDieJS = useCallback((dieId: string, x: number, y: number) => {
        const die = diceMapRef.current.get(dieId);
        if (die) dragBeginRef.current({ type: 'die', dieId, die }, x, y);
    }, []);
    const endJS = useCallback((x: number, y: number) => { dragEndRef.current(x, y); }, []);
    const inspectJS = useCallback((uid: string) => {
        const card = handMapRef.current.get(uid);
        if (card) onInspectRef.current(card);
    }, []);
    const unstageJS = useCallback((uid: string) => { onUnstageRef.current(uid); }, []);
    // Tap-to-power. With
    // exactly ONE card staged, a tap routes the die to it exactly as a drop
    // would — through the same `resolveDieDropTarget` gate (THE COLOR LAW +
    // one-die-per-card), so an illegal pairing is refused silently, the way a
    // tap has no card to shake. Any other staging count keeps drag-only: the
    // player must say WHICH card. Latest-closure ref, stable JS bridge.
    const dieTapRef = useRef<(dieId: string) => void>(() => undefined);
    dieTapRef.current = (dieId: string) => {
        if (stagedUids.length !== 1) return;
        const die = diceMapRef.current.get(dieId);
        if (!die || !die.draggable) return;
        const target = resolveDieDropTarget(die, stagedUids[0], true, stagedUids, stanceOfUid, pendingDieByUid, paidBlockOfUid);
        if (!target) {
            // A colour-legal die refused by the card's PAID line: point at the
            // VITAE ring when that refusal is the SACRIFICE floor.
            flagShortfall(refusedDieShortfall(die, stagedUids[0], stagedUids, vm.hand, pendingDieByUid));
            return;
        }
        juiceHaptics.impact(Haptics.ImpactFeedbackStyle.Rigid);
        setPendingDieByUid((prev) => ({ ...prev, [target]: dieId }));
        setDropPop((prev) => ({ uid: target, n: prev.n + 1 }));
    };
    const tapDieJS = useCallback((dieId: string) => { dieTapRef.current(dieId); }, []);

    // The glossary. A gloss never opens over a live drag or a resolving phase;
    // the gate reads latest values through a ref so the callback stays stable
    // (the tray's memoized gestures and rows capture it once).
    const glossRef = useRef<{ blocked: boolean; open?: BoardGlossOpen }>({ blocked: false });
    glossRef.current = { blocked: resolving || drag.active !== null, open: onGloss };
    const openGloss = useCallback<BoardGlossOpen>((ids, live) => {
        const g = glossRef.current;
        if (!g.blocked) g.open?.(ids, live);
    }, []);
    const convictionRef = useRef(vm.conviction); convictionRef.current = vm.conviction;
    const openConvictionGloss = useCallback(() => {
        openGloss(['conviction'], { conviction: convictionRef.current });
    }, [openGloss]);
    const gearFired = useGearFired(fx);
    const specialGlossRef = useRef(vm.specialGloss); specialGlossRef.current = vm.specialGloss;
    const glossDieJS = useCallback((dieId: string) => {
        const die = diceMapRef.current.get(dieId);
        if (!die) return;
        openGloss(dieGlossTerms(die), { special: specialGlossRef.current, pips: die.pips ?? 0 });
    }, [openGloss]);

    const gestureCacheRef = useRef(new Map<string, ReturnType<typeof Gesture.Exclusive>>());
    // drag.x/drag.y are the SAME SharedValue objects across renders (created once
    // in the panel), so gestures capturing them can be cached indefinitely.
    const gx = drag.x;
    const gy = drag.y;
    // The fanned card in flight, written by the pan worklet itself on the UI
    // thread, so the slot dims the frame the drag activates instead of after
    // the pickup's JS commit, and no fanned card re-renders for it (see
    // `FanCard`). Cleared on finalize, and again below when the controller
    // reports no drag (an interrupted web pointer stream finalizes in JS).
    const liftedUid = useSharedValue<string | null>(null);
    useEffect(() => {
        if (!drag.active) liftedUid.value = null;
    }, [drag.active, liftedUid]);
    const cardGestureFor = (from: 'hand' | 'play', uid: string) => {
        const key = `${from}-${uid}`;
        let g = gestureCacheRef.current.get(key);
        if (!g) {
            const pan = Gesture.Pan().minDistance(10)
                .onStart((e) => {
                    gx.value = e.absoluteX; gy.value = e.absoluteY;
                    if (from === 'hand') liftedUid.value = uid;
                    runOnJS(beginCardJS)(from, uid, e.absoluteX, e.absoluteY);
                })
                .onUpdate((e) => { gx.value = e.absoluteX; gy.value = e.absoluteY; })
                .onEnd((e) => { runOnJS(endJS)(e.absoluteX, e.absoluteY); })
                .onFinalize((e, ok) => { liftedUid.value = null; if (!ok) runOnJS(endJS)(-1, -1); });
            // `withTestId` is RNGH's own test affordance and is inert in
            // production — the registry only stores the id under Jest. It is
            // what lets a suite drive this real `Exclusive(pan, tap)` and
            // assert the tap-to-read hatch the board advertises actually
            // reaches `onInspect`; `from` pins which branch fired.
            const tap = Gesture.Tap().maxDistance(9)
                .withTestId(`combat-card-tap-${from}-${uid}`)
                .onEnd(() => {
                    if (from === 'hand') runOnJS(inspectJS)(uid); else runOnJS(unstageJS)(uid);
                });
            g = Gesture.Exclusive(pan, tap);
            gestureCacheRef.current.set(key, g);
        }
        return g;
    };
    const handCardGesture = (card: CombatCardVM) => cardGestureFor('hand', card.uid);
    const stagedGesture = (card: CombatCardVM) => cardGestureFor('play', card.uid);
    // Identity-stable (everything it closes over is) so the memoized DiceRow
    // never re-renders just because the board did.
    const dieGesture = useCallback((die: CombatDieVM) => {
        if (!die.draggable) {
            const holdKey = `die-hold-${die.id}`;
            let h = gestureCacheRef.current.get(holdKey) as ReturnType<typeof Gesture.LongPress> | undefined;
            if (!h) {
                h = Gesture.LongPress().minDuration(450).maxDistance(9)
                    .withTestId(`combat-die-hold-${die.id}`)
                    .onStart(() => { runOnJS(glossDieJS)(die.id); });
                gestureCacheRef.current.set(holdKey, h as never);
            }
            return h;
        }
        const key = `die-${die.id}`;
        let g = gestureCacheRef.current.get(key);
        if (!g) {
            const pan = Gesture.Pan().minDistance(8)
                .onStart((e) => { gx.value = e.absoluteX; gy.value = e.absoluteY; runOnJS(beginDieJS)(die.id, e.absoluteX, e.absoluteY); })
                .onUpdate((e) => { gx.value = e.absoluteX; gy.value = e.absoluteY; })
                .onEnd((e) => { runOnJS(endJS)(e.absoluteX, e.absoluteY); })
                .onFinalize((e, ok) => { if (!ok) runOnJS(endJS)(-1, -1); });
            // `withTestId` — RNGH's own test affordance (inert in production,
            // same as the card tap above): lets a suite drive the real
            // tap-to-power path, the one way a jest harness can CHOOSE a die.
            const tap = Gesture.Tap().maxDistance(9)
                .withTestId(`combat-die-tap-${die.id}`)
                .onEnd(() => { runOnJS(tapDieJS)(die.id); });
            // A held press reads the die. The tap above already powers the
            // staged card, so the gloss rides the long-press (the way a rune
            // explains itself); a drag moves past the hold's slop first.
            const hold = Gesture.LongPress().minDuration(450).maxDistance(9)
                .withTestId(`combat-die-hold-${die.id}`)
                .onStart(() => { runOnJS(glossDieJS)(die.id); });
            g = Gesture.Exclusive(pan, hold, tap);
            gestureCacheRef.current.set(key, g);
        }
        return g;
    }, [gx, gy, beginDieJS, endJS, tapDieJS, glossDieJS]);

    const stagedSet = new Set(stagedUids);
    // Staged cards, in stage order (filtered to those still in hand).
    const stagedCards = stagedUids
        .map((uid) => vm.hand.find((c) => c.uid === uid))
        .filter((c): c is CombatCardVM => Boolean(c));
    const fan = vm.hand.filter((c) => !stagedSet.has(c.uid));
    const n = fan.length;
    const mid = (n - 1) / 2;
    // Width is the binding constraint. The fan prefers the
    // chrome-free band BETWEEN the corner medallions (see `handFanLayout`),
    // and falls back to the full board band for a hand too large to seat
    // there — readable cards the corners float over, never a row of slivers.
    const { overlap } = handFanLayout(screenW, n);
    const draggingDieId = drag.active?.type === 'die' ? drag.active.dieId : null;
    // The full VM of the die in flight — the COLOR LAW dimming keys off its color.
    const draggingDie = drag.active?.type === 'die' ? drag.active.die : null;
    const draggingCardUid = drag.active?.type === 'card' ? drag.active.uid : null;
    const cardDragLive = draggingCardUid !== null;
    const dieDragLive = draggingDieId !== null;

    // A staged card is drop-INELIGIBLE for the die in flight when it is
    // off-color (THE COLOR LAW), already carries a dropped die (the staging
    // law) or cannot play its PAID line now — mirrors `resolveDieDropTarget`
    // exactly, so the dim always predicts the rejection.
    const dropIneligibleFor = (card: CombatCardVM): boolean =>
        !!draggingDie && (!dieCanPowerCardVM(draggingDie, card.stance) || !!pendingDieByUid[card.uid] || !!card.play?.paidBlock);

    // Ghost ✕ cue: on die-drag begin, measure
    // every INELIGIBLE staged card once and hand the rects to the panel's
    // ghost via the drag controller — the ✕ shows per-frame on the UI thread
    // while the pointer is over any of them. Cleared when the drag ends.
    const badRectsSV = drag.badRects;
    useEffect(() => {
        if (!badRectsSV) return;
        if (!draggingDie) { badRectsSV.value = []; return; }
        let live = true;
        void (async () => {
            const bad = stagedCards.filter(dropIneligibleFor);
            const rects = await Promise.all(bad.map(async (c) => {
                const node = stagedRefs.current.get(c.uid);
                return node ? measureRect({ current: node }) : null;
            }));
            if (live) badRectsSV.value = rects.filter((r): r is Rect => r !== null);
        })();
        return () => { live = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draggingDieId, badRectsSV]);

    // ── the rune column must never sit on the tray ──────────────────────────
    // `sigColumn` is absolutely positioned under the foe's intent block (the
    // HUD's measured bottom) and grows DOWNWARD with the signature count; with
    // a long loadout it can reach into the dice row, where a rune button would
    // swallow a die's drag and a tap aimed at the die would cast a signature
    // instead. The MEASURED tray top clamps it, so its last rune always clears
    // the tray however many signatures the loadout grants and however many rows
    // the tray wraps to (`signatureColumnTop`). Falls back to the stylesheet's
    // proportional `top` until the first layout pass lands.
    const [trayTop, setTrayTop] = useState(0);
    const [sigH, setSigH] = useState(0);
    const sigTop = signatureColumnTop(hudMeasuredH, trayTop, sigH);

    // NO-SOFTLOCK telegraph — the DEAD TRAY: at
    // least one die is still playable but NONE of them can power ANY card in
    // hand (no matching color, no wild). The outs get lit instead of leaving
    // the player staring: FREE ribbons read prominent, and END carries its
    // honest consequence line.
    // The rule and its words are the presenter's (`selectDeadTray`): a MISS
    // face and an X die count as unable to power.
    const deadTray = selectDeadTray(vm);
    const endConsequence = deadTray ? DEAD_TRAY_COPY.endConsequence : null;

    // Commit ONE staged card: powered by the die the player dropped on it
    // (when still usable and colour-legal), else FREE (no die). Commit
    // mirrors display.
    // Latest-closure ref + a stable dispatcher so memoized StagedCards never
    // re-render just because the board did.
    const handleApplyRef = useRef<(uid: string) => void>(() => undefined);
    handleApplyRef.current = (uid: string) => {
        // THE COLOR LAW at commit (engine: playCombatCard's gate): an
        // off-color die must never be routed at a card — the engine would
        // fizzle the play. `assignedDieFor` applies the same gate the display
        // uses, so a card that reads FREE commits FREE.
        const armedDie = assignedDieFor(uid);
        const dieId: string | null = armedDie ? armedDie.id : null;
        const power = armedDie !== null;
        const x = power ? xFor(uid) : null;
        if (x !== null) onApply(uid, dieId, power, x);
        else onApply(uid, dieId, power);
        setPendingDieByUid((prev) => { const next = { ...prev }; delete next[uid]; return next; });
    };
    const handleApply = useCallback((uid: string) => handleApplyRef.current(uid), []);
    // An armed X line's amount: the player's pick, clamped to the engine's
    // range, starting at the minimum.
    const xFor = (uid: string): number | null => {
        const range = vm.hand.find((c) => c.uid === uid)?.play?.xRange;
        if (!range || range.max < range.min) return null;
        return Math.max(range.min, Math.min(range.max, xByUid[uid] ?? range.min));
    };
    const handleXRef = useRef<(uid: string, delta: number) => void>(() => undefined);
    handleXRef.current = (uid: string, delta: number) => {
        const cur = xFor(uid);
        if (cur === null) return;
        setXByUid((prev) => ({ ...prev, [uid]: cur + delta }));
    };
    const handleX = useCallback((uid: string, delta: number) => handleXRef.current(uid, delta), []);
    // Stable staged-frame registrar (drop-target measurement).
    const registerStaged = useCallback((uid: string, node: View | null) => {
        if (node) stagedRefs.current.set(uid, node); else stagedRefs.current.delete(uid);
    }, []);

    // A staged card is a committed intent — END PHASE must never silently drop it.
    // Auto-APPLY every still-staged card first (each exactly as its own APPLY button
    // would: honoring a dropped die, else FREE), THEN resolve the phase. The
    // applies and the resolve all compose through the panel's functional setState, so
    // cards land before the enemy acts.
    // One exception: a staged card holding a die on a PAID line whose random
    // discard cannot be paid holds the turn (it shakes, the phone buzzes, the
    // reason shows) until the player unstages it or takes the die off.
    const handleEndPhaseRef = useRef<() => void>(() => undefined);
    handleEndPhaseRef.current = () => {
        if (resolving) return; // a phase is already resolving; ignore the tap
        const held = unpayableDiscardStaged(stagedUids, vm.hand, (uid) => assignedDieFor(uid) !== null);
        if (held) {
            juiceHaptics.notify(Haptics.NotificationFeedbackType.Error);
            setDropReject((prev) => ({ uid: held.uid, reason: PROGRAM_COPY.endHeld(held.name, held.discard, held.held), n: prev.n + 1 }));
            return;
        }
        for (const uid of stagedUids) handleApplyRef.current(uid);
        onEndPhase();
    };
    // A refused APPLY on an unpayable PAID discard: shake the card, name why.
    const handleRefuseDiscard = useCallback((uid: string) => {
        const card = vm.hand.find((c) => c.uid === uid);
        const sf = card?.play?.paidDiscard;
        if (!card || !sf) return;
        setDropReject((prev) => ({ uid, reason: PROGRAM_COPY.discardShort(card.name, sf.discard, sf.held), n: prev.n + 1 }));
    }, [vm.hand]);
    // Stable, so the memoized medallion sits out the drag re-renders.
    const handleEndPhase = useCallback(() => handleEndPhaseRef.current(), []);

    // The footer dock is at least one row plus its padding and the
    // home-indicator inset, and it GROWS rather than clips. The floating SCRAP
    // bin keys off the MEASURED height so it always sits above the dock.
    const [railMeasuredH, setRailMeasuredH] = useState(0);
    const railH = Math.max(dockMinHeight(bottomInset), railMeasuredH);
    const handleDockLayout = useCallback((e: LayoutChangeEvent) => setRailMeasuredH(e.nativeEvent.layout.height), []);

    return (
        <View style={styles.root} testID="combat-board">
            {/* layers 0–2: battlefield scene, scrims, top HUD, player medallion */}
            <CombatCombatantPane
                enemy={vm.enemy}
                player={vm.player}
                onChip={onChip}
                fx={fx}
                topInset={topInset}
                metaLine={vm.metaLine}
                onHudLayout={handleHudLayout}
                region={region}
                onPayToll={onPayToll}
            />

            {/* interactive column */}
            <View style={styles.content} pointerEvents="box-none">
                {/* clearance under the floating top HUD — the measured height
                    once it lands, so a tall HUD (telegraphs, alt-win meters)
                    never overlaps the play region below it */}
                <View style={{ height: hudBottom }} pointerEvents="none" />

                {/* play region — an invisible drop target over the battlefield. The
                    dashed affordance appears ONLY while a card drag is live; staged
                    cards float as a centered row anchored to the region's bottom. */}
                <View style={{ flex: 1 }} pointerEvents="box-none">
                    {/* plain View (no layout transition): a reanimated layout container
                        wrapping animated staged children was measurable drag overhead */}
                    <View
                        ref={(node) => { playAreaRef.current = node; }}
                        style={[styles.playRegion, cardDragLive && { borderColor: `${AXM.sulfur}99`, backgroundColor: 'rgba(212,192,38,0.05)' }]}
                        testID="combat-play-area"
                        pointerEvents="box-none"
                    >
                        {cardDragLive && (
                            <Animated.Text entering={PLAY_HINT_ENTERING} style={styles.playHint}>
                                release to stage
                            </Animated.Text>
                        )}
                        <View style={styles.stagedRow} pointerEvents="box-none">
                            {stagedCards.map((card) => {
                                const adie = assignedDieFor(card.uid);
                                // THE COLOR LAW + staging law during the drag: a
                                // card the die in flight cannot LAND on (off-color
                                // or already armed) dims + reads disabled; only
                                // eligible sockets invite the drop.
                                const dropEligible = !draggingDie || !dropIneligibleFor(card);
                                return (
                                    <StagedCard
                                        key={card.uid}
                                        card={card}
                                        assignedDie={adie}
                                        onApply={handleApply}
                                        gesture={stagedGesture(card)}
                                        register={registerStaged}
                                        compact={stagedCards.length > 2}
                                        popKey={dropPop.uid === card.uid ? dropPop.n : 0}
                                        rejectKey={dropReject.uid === card.uid ? dropReject.n : 0}
                                        socketPulse={dieDragLive && dropEligible}
                                        dropIneligible={dieDragLive && !dropEligible}
                                        freeProminent={deadTray}
                                        x={adie ? xFor(card.uid) : null}
                                        onX={handleX}
                                        onRefuse={flagShortfall}
                                        onRefuseDiscard={handleRefuseDiscard}
                                    />
                                );
                            })}
                        </View>
                        {/* LOUD rejection reason — the a11y label made visible. */}
                        {dropReject.reason ? (
                            <Animated.Text entering={REJECT_LINE_ENTERING} style={styles.rejectLine} numberOfLines={2} testID="combat-drop-reject">
                                ✕ {dropReject.reason}
                            </Animated.Text>
                        ) : null}
                        {stagedCards.length > 0 && !stagedCards.some((c) => assignedDieFor(c.uid)) && !cardDragLive && !dropReject.reason ? (
                            <Text style={styles.stageHint} numberOfLines={1} testID="combat-stage-hint">
                                {/* This line is for the card already lifted out of the fan. */}
                                {deadTray ? DEAD_TRAY_COPY.stageHint : 'drag a die onto your card · APPLY to commit'}
                            </Text>
                        ) : null}
                    </View>
                </View>

                {/* momentum — the chain chip. */}
                <MomentumChainChip vm={vm.momentumV2} onPress={onMomentumInfo} />

                {/* Globals in play — each with its turns left; tap reads the card. */}
                {vm.globals.length > 0 ? (
                    <View style={styles.globalsRow} pointerEvents="box-none" testID="combat-globals">
                        <Pressable
                            onPress={() => openGloss(['global'])}
                            testID="combat-globals-label"
                            accessibilityRole="button"
                            accessibilityLabel={PROGRAM_COPY.inPlay}
                            accessibilityHint="Tap to read what a Global is"
                            hitSlop={6}
                        >
                            <Text style={styles.globalsLabel} allowFontScaling={false}>{PROGRAM_COPY.inPlay}</Text>
                        </Pressable>
                        {vm.globals.map((g) => (
                            <Pressable
                                key={g.uid}
                                onPress={() => { if (g.card) onInspect(g.card); }}
                                style={[styles.globalChip, { borderColor: g.stanceColor }]}
                                accessibilityRole="button"
                                accessibilityLabel={g.a11y}
                                testID={`combat-global-${g.uid}`}
                            >
                                <Text style={styles.globalChipText} numberOfLines={1} allowFontScaling={false}>
                                    {g.name} <Text style={styles.globalChipTurns}>{g.turnsLabel}</Text>
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                ) : null}

                {/* player status strip — IN FLOW (not floated over the fan, where the
                    hand's gesture area swallowed the taps) so every tile stays tappable.
                    RIGHT-aligned: the left edge belongs to the signature-rune
                    column, which would hide these tiles. */}
                {(vm.player.effects.length > 0 || vm.player.guard > 0) && (
                    <View style={styles.statusStrip} pointerEvents="box-none">
                        {vm.player.guard > 0 ? <Text style={styles.guardChip} testID="combat-guard">🛡 {vm.player.guard}</Text> : null}
                        <EffectChips effects={vm.player.effects} onChip={onChip} align="flex-end" />
                    </View>
                )}

                {/* DEAD TRAY (no-softlock telegraph): nothing in the tray can
                    power any card in hand — say so where the dice live, and
                    point at the outs (FREE plays; END rolls fresh). */}
                {deadTray && stagedCards.length === 0 ? (
                    <Text style={styles.deadTrayLine} numberOfLines={2} testID="combat-dead-tray">
                        {DEAD_TRAY_COPY.line}
                    </Text>
                ) : null}
                {/* The tray outranks the rune column in z-order. `sigTop` keeps the column clear of the
                    tray whenever there is room, but it is derived from THREE
                    measured values (`hudMeasuredH`, `trayTop`, `sigH`) held in
                    state: for the frame between a re-layout and the re-render
                    that follows it, the column is still at its previous anchor
                    and can sit over the tray. In that frame `elementFromPoint`
                    at a die's centre returns a rune button, so the die cannot
                    be dragged and a tap aimed at it casts a signature and
                    spends Conviction instead. Ranking the tray's zIndex (31)
                    above the column's (30) is only real if they are SIBLINGS —
                    react-native-web gives every plain View `position: relative;
                    z-index: 0` by default, so a tray nested in another
                    stacking context would lose to the column regardless of
                    its own 31. The column is rendered as this layer's own
                    sibling below so the 31-vs-30 comparison is a real one: a die wins the hit test no matter what the
                    measurements are doing; the clearance clamp still does the
                    visual work. */}
                <View
                    onLayout={(e) => setTrayTop(e.nativeEvent.layout.y)}
                    pointerEvents="box-none"
                    style={styles.trayLayer}
                    testID="combat-tray-layer"
                >
                    <DiceRow vm={vm} dieGesture={dieGesture} draggingDieId={draggingDieId} assignedDieIds={assignedDieIds} onGloss={openGloss} />
                </View>

                {/* signature rune column — left edge. A sibling of the tray
                    layer above (both direct children of `content`) so their
                    explicit zIndex values actually compete in one stacking
                    context — see the comment on the tray layer. */}
                <SignatureColumn
                    conviction={vm.conviction} signatures={vm.signatures} onCast={onSignature} onInfo={onSignatureInfo}
                    onConviction={openConvictionGloss}
                    top={sigTop} onMeasureHeight={setSigH}
                />
                <CombatGear gear={vm.gear} fired={gearFired} top={sigTop} />

                {/* the hand dock — the fan across the full board width, with room
                    above the cards for the FREE corner pill. No tap hint: the
                    fan's one-line names show their start on every covered
                    card, and a tap still reads the card whole. */}
                <View style={styles.dock}>
                    {/* sulfur shelf glow behind the fan */}
                    <Svg width="100%" height={90} viewBox="0 0 100 30" preserveAspectRatio="none" style={styles.fanGlow} pointerEvents="none">
                        <Defs>
                            <RadialGradient id="axmFanGlow" cx="50%" cy="100%" r="80%">
                                <Stop offset="0%" stopColor={AXM.sulfur} stopOpacity={0.16} />
                                <Stop offset="100%" stopColor={AXM.sulfur} stopOpacity={0} />
                            </RadialGradient>
                        </Defs>
                        <Circle cx={50} cy={30} r={55} fill="url(#axmFanGlow)" />
                    </Svg>
                    <View style={styles.fan} testID="combat-hand" pointerEvents="box-none">
                        {fan.map((card, i) => (
                            <FanCard
                                key={card.uid}
                                card={card}
                                gesture={handCardGesture(card)}
                                marginLeft={i === 0 ? 0 : -overlap}
                                tilt={i - mid}
                                zIndex={i}
                                liftedUid={liftedUid}
                            />
                        ))}
                    </View>
                </View>

                {/* footer dock — avatar · VITAE column · END. Dice are the
                    turn's hand: you play what you rolled. */}
                <CombatFooterDock
                    vm={vm}
                    avatar={(
                        <PlayerMedallion
                            player={vm.player}
                            enemyIntentDamage={vm.enemy.intent.damage}
                            onPress={onPlayerInspect}
                            fx={fx}
                            sacrificeCallout={vitaeCallout}
                        />
                    )}
                    bottomInset={bottomInset}
                    onEndPhase={handleEndPhase}
                    endConsequence={endConsequence}
                    resolving={resolving}
                    onGloss={openGloss}
                    onLayout={handleDockLayout}
                />
            </View>

            {/* SCRAP — only present while a card is being dragged (no permanent
                footprint). Kept mounted/hidden rather than unmounted so the drop
                measurement still resolves against its ref after the drag ends. */}
            <View
                ref={trashRef}
                pointerEvents={draggingCardUid ? 'auto' : 'none'}
                style={[styles.trashBin, { bottom: railH + 108 }, draggingCardUid ? { borderColor: AXM.blood, backgroundColor: AXM.bloodSubtle, opacity: 1 } : { opacity: 0 }]}
                testID="combat-trash"
                accessible
                accessibilityLabel="Scrap bin. Drag a card here to discard it."
            >
                <TrashGlyph size={20} color={draggingCardUid ? AXM.blood : AXM.bone} />
                <Text style={[styles.trashLabel, draggingCardUid ? { color: AXM.blood } : null]}>SCRAP</Text>
            </View>
        </View>
    );
});

// ── A small fanned hand card ─────────────────────────────────────────────────

// Deterministic per-card art variation (the temp art pool is smaller than the
// card pool, so paintings are shared): mirror for ~half the cards, keyed off id.
function artMirrored(cardId: string): boolean {
    let h = 0;
    for (let i = 0; i < cardId.length; i++) h = (h * 31 + cardId.charCodeAt(i)) | 0;
    return (h & 1) === 1;
}

/**
 * Compact the FREE value to what sits INSIDE the glyph — its intensity (the
 * effect owns the duration): "i1 d1" → "+1", "3 rounds" → "3r", "2" → "+2",
 * "×4 · 3t" → "×4", "+24% · 1t" → "+24%" (a percent keeps its unit).
 *
 * Input: the face's raw FREE value (or its hero line), or null.
 * Output: a WHOLE value, never a fragment — '' when nothing whole fits.
 *
 * The ×N intensity has its own branch, and the last resort keeps a whole
 * short token or prints nothing — never a mid-word slice (the glyph still
 * carries the read; the inspect overlay carries the full truth).
 */
export function compactFree(v: string | null): string {
    if (!v) return '';
    const s = v.trim();
    const im = s.match(/i(\d+)/i);
    if (im) return `+${im[1]}`;
    const rm = s.match(/^(\d+)\s*rounds?$/i);
    if (rm) return `${rm[1]}r`;
    // The presenter's applyEffect rail: '×4 · 3t', '×1 (enemy)', '×4 · 3t +'.
    const xm = s.match(/×\s*(\d+)/);
    if (xm) return `×${xm[1]}`;
    const nm = s.match(/^\+?(\d+)(%?)/);
    if (nm) return `+${nm[1]}${nm[2]}`;
    const head = s.split(/\s+/)[0];
    return head.length <= 3 ? head : '';
}

// Darken a #rrggbb by a factor (0..1) — the stance cube's shaded faces.
function darkenHex(hex: string, f: number): string {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const r = Math.round(((n >> 16) & 255) * f);
    const g = Math.round(((n >> 8) & 255) * f);
    const b = Math.round((n & 255) * f);
    return `rgb(${r},${g},${b})`;
}

// The stance cube — a small isometric die that flags "this line costs a die",
// tinted the card's stance colour.
function StanceCube({ color, size }: { color: string; size: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M12 3 L21 8 L12 13 L3 8Z" fill={color} />
            <Path d="M3 8 L12 13 L12 21 L3 16Z" fill={darkenHex(color, 0.68)} />
            <Path d="M21 8 L12 13 L12 21 L21 16Z" fill={darkenHex(color, 0.42)} />
        </Svg>
    );
}

// The PAID value beside the face's keyword — the presenter's honest number
// (`heroText`), or its qualitative word (`heroSub`) for the kinds that have no
// number. A leading repeat of the keyword is stripped so the two slots never
// print the same word twice ('GUARD' + 'Guard 12' → 'GUARD' + '12').
function paidValueFor(f: CombatCardVM['face'], override?: string): string {
    const raw = (override ?? f.heroText ?? '').trim() || (f.heroSub ?? '').trim();
    if (!raw || !f.keyword) return raw;
    const kw = f.keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return raw.replace(new RegExp(`^${kw}\\s+`, 'i'), '').trim() || raw;
}

/**
 * The shared card FACE — ONE FACE, EVERYWHERE. Cards read as pages of the
 * codex, in line with the Woodcut Codex direction:
 *   · the FREE CORNER PILL — the FREE line's glyph in the card's colour (the
 *     stance colour; the armed accent when set) with its value in white, on a
 *     pill straddling the card's top-left corner. A card with no FREE line has
 *     no pill. It is drawn as a sibling of the frame, so the frame's
 *     `overflow: hidden` cannot clip it;
 *   · ① NAME BAND, top, HORIZONTAL, blackletter on solid ink, ONE line. A
 *     fanned card's name runs on under its right-hand neighbour; a tap reads
 *     it whole. The band takes top padding only when the pill sits over it.
 *     The large face adds the rarity WORD at the band's tail;
 *   · ② ART PLATE — seamless: no mat, no frame, no rules above or below it,
 *     so name, art and PAID line read as one surface;
 *   · ③ PAID LINE, bottom. The SMALL face prints the card's whole PAID line
 *     (the card voice) at 10pt over at most three rows, the stance die cube
 *     riding the ledger's corner. The LARGE face keeps one row: the die cube,
 *     then `[family glyph] KEYWORD value`, with a Global's duration under it;
 *   · a Global has no FREE line: the word GLOBAL sits where the pill does.
 *
 * Rarity is not drawn on the face. The large face prints the WORD, and every
 * face says it to a screen reader through a 5pt spacer at the band's head
 * (which also keeps {@link NAME_BAND_LEFT_CHROME} true).
 *
 * Stance colours the frame, the pill and the die cube; the stat family (or
 * category) colours the keyword. Instanced small in the hand and LARGE in the
 * inspect modal so the two can never drift.
 *
 * The face carries no prose beyond the PAID line itself. The type strip and
 * the projected action text live in the inspect overlay. The face is the
 * glance read (name · free pill · PAID line); the overlay is the explanation.
 */
/** Below this face width the face is NARROW: the reward offer (100) and the
 *  compact staged card (92) sit under it, the hand card (120) above. A narrow
 *  face draws a smaller die cube. Exported for the face test. */
export const NARROW_FACE_W = 112;


/**
 * The free corner pill: the FREE line's glyph in the card's colour and its
 * value in white, straddling the face's top-left corner. Rendered by
 * `CombatCardFace` as a sibling of the frame, never inside it.
 */
function FreeCornerPill({ shape, glyph, value, ink, large }: {
    shape: ReturnType<typeof glyphShapeFor>;
    glyph: string;
    value: string;
    ink: string;
    large: boolean;
}) {
    const styles = useStyles();
    const size = large ? FREE_PILL_GLYPH_LARGE : FREE_PILL_GLYPH;
    return (
        <View
            pointerEvents="none"
            testID="combat-card-face-free-corner"
            style={[
                styles.freePill,
                large && styles.freePillLarge,
                value ? (large ? styles.freePillValuedLarge : styles.freePillValued) : null,
                { borderColor: ink },
            ]}
        >
            {shape ? (
                <Svg width={size} height={size} viewBox="0 0 24 24" testID="combat-card-face-free-glyph">
                    <Path d={shape.d} fill={ink} fillRule={shape.evenodd ? 'evenodd' : 'nonzero'} />
                </Svg>
            ) : (
                <Text
                    style={[styles.freePillGlyph, { fontSize: size * 0.8, lineHeight: size, color: ink }]}
                    allowFontScaling={false}
                    testID="combat-card-face-free-glyph"
                >
                    {glyph}
                </Text>
            )}
            {value ? (
                <Text
                    style={[styles.freePillValue, large && styles.freePillValueLarge]}
                    allowFontScaling={false}
                    testID="combat-card-face-free-value"
                >
                    {value}
                </Text>
            ) : null}
        </View>
    );
}

/**
 * The GLOBAL plate: a Global has no FREE line, so the word GLOBAL sits where
 * the FREE pill does, in the card's colour. It says nothing about how long the
 * Global lasts; the large face does.
 */
function GlobalPlate({ ink, large }: { ink: string; large: boolean }) {
    const styles = useStyles();
    return (
        <View
            pointerEvents="none"
            testID="combat-card-face-global-plate"
            accessibilityLabel="Global"
            style={[styles.freePill, large && styles.freePillLarge, styles.globalPlate, large && styles.globalPlateLarge, { borderColor: ink }]}
        >
            <Text
                style={[styles.globalPlateText, large && styles.globalPlateTextLarge, { color: ink }]}
                allowFontScaling={false}
                testID="combat-card-face-global-text"
            >
                GLOBAL
            </Text>
        </View>
    );
}

/** The small face's ledger height: three rows of the PAID line and its padding.
 *  Fixed, so every card's art is the same size however long its line. */
const SMALL_LEDGER_H = 42;

/** The free pill's glyph size, small and large face. */
const FREE_PILL_GLYPH = 15;
const FREE_PILL_GLYPH_LARGE = 20;
/** Extra top padding the name band takes when the pill sits over it. */
const FREE_PILL_BAND_PAD = 12;
const FREE_PILL_BAND_PAD_LARGE = 16;
/** The keyword glyph beside the word on the large face. */
const LARGE_GLYPH = 20;

export const CombatCardFace = React.memo(function CombatCardFace({
    card, width, height, large = false, accent = null, heroOverride, children,
}: {
    card: CombatCardVM;
    width: number;
    height: number;
    large?: boolean;
    /** Override the keyword/value/border colour (the armed staged-card read tint). */
    accent?: string | null;
    /** Override the hero value text (e.g. the live-recomputed Guard number). */
    heroOverride?: string;
    children?: React.ReactNode;
}) {
    const AXM = usePalette();
    const styles = useStyles();
    const cardText = useSetting('cardText');
    const f = card.face;
    // STANCE colours the frame, the free pill and the die cube; the stat
    // family (or CATEGORY) colours the keyword. Inert cards grey both honestly.
    const band = f.stanceColor;
    // A keyword wears its STAT FAMILY's dice colour and glyph
    // (body ⚡, mind ★, heart ♥) on the live hand; elsewhere, its category.
    const baseKw = f.inert ? AXM.ash : (f.familyColor ?? f.categoryColor);
    const kwColor = accent ?? baseKw;
    // The number the player's stat raised is tinted in the family colour; a
    // lowered one reads muted. The face always shows the FINAL number.
    const tintFor = (dir: 'up' | 'down' | null | undefined) => f.inert || !dir ? null
        : dir === 'up' ? (f.familyColor ?? AXM.sulfur) : AXM.ash;
    const scaledTint = tintFor(f.statScaled);
    const paidValue = paidValueFor(f, heroOverride);
    const freeInner = compactFree(f.freeValue ?? (f.freeHeroText || null));
    const hasFree = !!f.freeGlyph;
    // Effect-shaped silhouette for the FREE glyph;
    // keywords without a shape keep the text rune.
    const freeShape = glyphShapeFor(f.freeGlyphKey);
    // The card's own colour: the pill's ring and glyph match the frame.
    const cardInk = f.inert ? AXM.ash : (accent ?? band);
    const narrow = !large && width < NARROW_FACE_W;
    const keywordText = f.keyword ? `${f.familyGlyph ? `${f.familyGlyph} ` : ''}${f.keyword.toUpperCase()}` : '';
    // The small face prints the whole PAID line, wrapped to three rows at 10pt
    // (`paidLineFit` shrinks a line too long for that); the large face keeps its
    // own keyword-and-value ledger and states a Global's duration under it.
    const paidFit = large ? null : paidLineFit({ width, line: f.paidLine, mode: cardText });
    // The open card shows a keyword's glyph beside its word in both modes, so a glyph is learnt once.
    const keywordGlyph = glyphKeywordFor(f.keyword);
    const bandH = large ? 36 : 26;
    const ledgerH = large ? 60 : SMALL_LEDGER_H;
    // A Global wears a GLOBAL plate where the FREE pill sits.
    const hasPill = hasFree || f.isGlobal;
    // The drop shadow is STANCE-coloured. It is
    // applied inline on `faceOuter` rather than in the static style, because
    // the colour is per-card data; `accent` (the armed staged-card read tint)
    // wins where set, so the shadow always matches the frame above it.

    // The rarity band, derived ONCE by `card-rarity.engine` from the card's
    // own rank. No face draws it; the large face prints the word and every
    // face says it to a screen reader.
    const rarBand = rarityFor(card);
    const rarColor = RARITY_COLOR[rarBand];
    const rarLabel = RARITY_LABEL[rarBand];
    return (
        <View style={[styles.faceOuter, { width, height, shadowColor: accent ?? band }]}>
            <View style={[styles.faceCard, { borderColor: accent ?? band }]}>
                {/* ① NAME BAND — horizontal blackletter on solid ink, one line.
                    A fanned card's name runs on under its right-hand neighbour;
                    the tap reads it whole. When the free pill sits over the
                    band's corner, the band takes top padding so the pill never
                    covers the name. */}
                <View
                    style={[
                        styles.plateBand,
                        { minHeight: bandH },
                        hasPill ? { paddingTop: large ? FREE_PILL_BAND_PAD_LARGE : FREE_PILL_BAND_PAD } : null,
                    ]}
                    pointerEvents="none"
                    testID="combat-card-face-band"
                >
                    {/* The spacer carries the rarity WORD for a screen reader, so
                        a face that is NOT wrapped in a labelled pressable (the
                        staged card, the drag ghost) still announces it. Where
                        the face IS inside one — the hand card and the reward
                        tile — that parent label wins, and both of those name the
                        rarity themselves. */}
                    <View
                        style={styles.plateRaritySpacer}
                        accessible
                        accessibilityRole="text"
                        accessibilityLabel={rarLabel}
                        testID="combat-card-face-rarity-a11y"
                    />
                    <Text
                        style={[styles.plateName, large && styles.plateNameLarge]}
                        numberOfLines={1}
                        allowFontScaling={false}
                        testID="combat-card-face-name"
                    >
                        {card.name.toUpperCase()}
                    </Text>
                    {/* The NAMED LABEL leg — `large` only. The inspect overlay
                        and the reward preview have the band width for a word;
                        the 120pt hand card does not, and spending its name
                        column on "UNCOMMON" would clip the name. */}
                    {large ? (
                        <Text
                            style={[styles.plateRarityLabel, { color: rarColor }]}
                            numberOfLines={1}
                            allowFontScaling={false}
                            testID="combat-card-face-rarity"
                        >
                            {rarLabel.toUpperCase()}
                        </Text>
                    ) : null}
                </View>
                {/* ② ART PLATE — seamless: no mat, no frame, no rules; no wash,
                    no scrim. Inert cards grey the plate. */}
                <View style={styles.plateArtWrap} pointerEvents="none" testID="combat-card-face-art">
                    <View style={styles.plateArtFrame} testID="combat-card-face-art-frame">
                        <Image
                            source={getCardArt(card.cardId)}
                            style={[StyleSheet.absoluteFill, artMirrored(card.cardId) && { transform: [{ scaleX: -1 }] }]}
                            contentFit="cover"
                            transition={0}
                        />
                        {f.inert ? <View style={styles.plateInertWash} /> : null}
                        {f.typeTag && !f.isGlobal ? (
                            <View style={styles.typeTag} testID="combat-card-face-type-tag">
                                <Text style={[styles.typeTagText, large && styles.typeTagTextLarge]} numberOfLines={1} allowFontScaling={false}>{f.typeTag}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
                {/* ③ PAID LINE. The SMALL face prints the whole line, wrapped to
                    three rows at 10pt on solid ink, with the stance die cube
                    on the ledger's corner (the die this line wants). The LARGE
                    face keeps its one row: the die cube, then `[family glyph]
                    KEYWORD value`, and a Global states how long it lasts. */}
                {large ? (
                    <View
                        style={[styles.plateLedger, { minHeight: ledgerH }]}
                        pointerEvents="none"
                        testID="combat-card-face-ledger"
                    >
                        <StanceCube color={band} size={20} />
                        <View style={styles.paidColumn}>
                            <Text
                                style={styles.paidLine}
                                numberOfLines={1}
                                allowFontScaling={false}
                                testID="combat-card-face-paid-line"
                            >
                                {keywordGlyph ? (
                                    <View style={styles.paidGlyphLarge}>
                                        <KeywordGlyph keyword={keywordGlyph} size={LARGE_GLYPH} color={accent ?? undefined} />
                                    </View>
                                ) : null}
                                {keywordText ? (
                                    <Text
                                        style={[styles.paidKeyword, styles.paidKeywordLarge, { color: kwColor }]}
                                        testID="combat-card-face-keyword"
                                    >
                                        {keywordText}{paidValue ? ' ' : ''}
                                    </Text>
                                ) : null}
                                {paidValue ? (
                                    <Text
                                        style={[styles.paidValue, styles.paidValueLarge, scaledTint ? { color: scaledTint } : null]}
                                        testID="combat-card-face-value"
                                    >
                                        {paidValue}
                                    </Text>
                                ) : null}
                            </Text>
                            {f.isGlobal ? (
                                <Text style={styles.durationLine} allowFontScaling={false} testID="combat-card-face-duration">
                                    {globalDurationLine()}
                                </Text>
                            ) : null}
                        </View>
                    </View>
                ) : (
                    <View
                        style={[styles.plateLedger, styles.plateLedgerSmall, { height: ledgerH }]}
                        pointerEvents="none"
                        testID="combat-card-face-ledger"
                    >
                        <View style={[styles.ledgerCube, { right: narrow ? 3 : 4 }]} testID="combat-card-face-cube">
                            <StanceCube color={band} size={narrow ? 12 : 14} />
                        </View>
                        <Text
                            style={[styles.paidLineSmall, { fontSize: paidFit!.size, lineHeight: Math.round(paidFit!.size * PAID_LINE_LEADING) }]}
                            numberOfLines={PAID_LINE_ROWS}
                            allowFontScaling={false}
                            accessibilityLabel={f.paidLine}
                            testID="combat-card-face-paid-line"
                        >
                            {paidLineRuns(f.paidLine, cardText).map((run, i) => run.glyph ? (
                                <View key={i} style={{ marginHorizontal: GLYPH_GAP }} testID="combat-card-face-glyph">
                                    <KeywordGlyph keyword={run.glyph} size={Math.round(GLYPH_EM * paidFit!.size)} color={accent ?? undefined} />
                                </View>
                            ) : (
                                <Text
                                    key={i}
                                    style={[
                                        run.caps ? styles.paidRunCaps : styles.paidRunSerif,
                                        { fontSize: paidFit!.size, lineHeight: Math.round(paidFit!.size * PAID_LINE_LEADING), color: accent ?? AXM.parchment },
                                    ]}
                                >
                                    {run.text}
                                </Text>
                            ))}
                        </Text>
                    </View>
                )}
                {children}
            </View>
            {/* The free corner pill — a sibling of the frame, so the frame's
                `overflow: hidden` cannot clip the half that straddles it. A
                Global wears the GLOBAL plate in its place. */}
            {f.isGlobal ? (
                <GlobalPlate ink={cardInk} large={large} />
            ) : hasFree ? (
                <FreeCornerPill shape={freeShape} glyph={f.freeGlyph} value={freeInner} ink={cardInk} large={large} />
            ) : null}
        </View>
    );
});

// The fanned hand card — a small instance of the shared face, art-forward at the
// reference's ~1:1.5 proportion. The fan-overlap math (band fit) keys off these
// same constants — keep them in sync. Exported for the drag ghost.
export const HAND_CARD_W = 120;
export const HAND_CARD_H = 176;
/** Opacity of the fanned card whose drag is in flight (its ghost is the
 *  readable copy; the slot it left reads as a faded placeholder). */
export const LIFTED_CARD_OPACITY = 0.3;
/** z-order of the lifted card, above every fanned neighbour. */
const LIFTED_CARD_Z = 30;

/**
 * One fanned hand card with its drag/tap gesture. Memoized on primitive
 * props, and the in-flight dim is NOT a prop: it is derived on the UI thread
 * from the board's `liftedUid` shared value, which the pan worklet writes the
 * moment the drag activates. So a pickup or drop re-renders NO fanned card:
 * a re-rendered GestureDetector pushes every one of its handlers' configs
 * back to the native gesture module, and on web the `layout` transition
 * snapshots the node with a forced `getBoundingClientRect` on every update —
 * both on the commit the drag ghost waits on. (Drag-perf hypothesis 1/4.)
 */
export const FanCard = React.memo(function FanCard({
    card, gesture, marginLeft, tilt, zIndex, liftedUid,
}: {
    card: CombatCardVM;
    /** Cached per uid by the board — identity-stable for the card's life. */
    gesture: ReturnType<typeof Gesture.Exclusive>;
    marginLeft: number;
    /** Signed distance from the fan's middle, in cards. */
    tilt: number;
    zIndex: number;
    /** Uid of the hand card in flight (null = none). Identity-stable; the
     *  card dims and rises when it equals its own uid. */
    liftedUid: SharedValue<string | null>;
}) {
    const uid = card.uid;
    // Raise above the neighbours while in flight — on the outer node, the one
    // the fan's stacking compares.
    const liftZStyle = useAnimatedStyle(() => ({ zIndex: liftedUid.value === uid ? LIFTED_CARD_Z : zIndex }));
    // The dim rides an inner node: FadeIn drives `opacity` on the outer
    // wrapper, and an `opacity` style on that same node is what Reanimated
    // warns "may be overwritten by a layout animation".
    const liftDimStyle = useAnimatedStyle(() => ({ opacity: liftedUid.value === uid ? LIFTED_CARD_OPACITY : 1 }));
    return (
        <GestureDetector gesture={gesture}>
            <Animated.View
                entering={FAN_CARD_ENTERING} layout={FAN_CARD_LAYOUT_HERE}
                style={[{
                    marginLeft,
                    zIndex,
                    transform: [{ translateY: 2 + Math.abs(tilt) * 3 }, { rotate: `${tilt * 3}deg` }],
                }, liftZStyle]}
                testID={`combat-hand-${card.uid}`}
                accessible accessibilityRole="button"
                // The fanned face has no room to PRINT the
                // rarity word (see the face doc block above
                // `CombatCardFace`), so the label is where a
                // screen-reader player gets it. This pressable is
                // `accessible`, which collapses the face's own
                // track label, so the word has to be said here.
                accessibilityLabel={`${card.name}, ${RARITY_LABEL[rarityFor(card)]}, ${card.stance} card. ${card.face.verbLine}.`}
                accessibilityHint="Drag up to stage, or tap to read"
            >
                <Animated.View style={liftDimStyle}>
                    <HandCard card={card} />
                </Animated.View>
            </Animated.View>
        </GestureDetector>
    );
});

function HandCard({ card }: { card: CombatCardVM }) {
    const styles = useStyles();
    // A program card neither of whose lines can be played now reads dimmed
    // and says so; the overlay (tap) gives the reasons.
    const stuck = !!card.play?.freeBlock && !!card.play?.paidBlock;
    return (
        <View style={stuck ? styles.handCardStuck : null}>
            <CombatCardFace card={card} width={HAND_CARD_W} height={HAND_CARD_H}>
                {stuck ? (
                    <View style={styles.stuckBadge} pointerEvents="none" testID="combat-card-stuck">
                        <Text style={styles.stuckBadgeText} allowFontScaling={false}>{PROGRAM_COPY.cantPlay}</Text>
                    </View>
                ) : null}
            </CombatCardFace>
        </View>
    );
}

/**
 * The board's stylesheet, exported so a test can gate the numbers that
 * {@link NAME_BAND_LEFT_CHROME} sums against the sheet the board actually
 * renders with. Every call site inside this file still reads `useStyles`.
 */
export const useCombatBoardStyles = makeStyles((AXM) => ({
    // The fight fits the phone. The board is the viewport: any
    // floating chrome that bleeds past its edge (the END disc's backing glow,
    // an over-wide consequence line) is clipped here instead of widening the
    // page into a sideways scroll with unpainted ground beyond the board.
    root: { flex: 1, backgroundColor: AXM.bg, overflow: 'hidden' },
    content: { flex: 1 },

    // ── play region (invisible drop target; dashed only while dragging) ──
    playRegion: {
        flex: 1, marginHorizontal: 10, marginBottom: 2, borderWidth: 1.5, borderStyle: 'dashed',
        borderColor: 'transparent', borderRadius: 10, justifyContent: 'flex-end',
    },
    playHint: {
        position: 'absolute', top: 8, alignSelf: 'center', fontFamily: FONTS.sans, fontSize: 11,
        letterSpacing: 1.4, color: AXM.sulfur, textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 3,
    },
    stagedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', alignItems: 'flex-end' },
    stageHint: {
        alignSelf: 'center', marginTop: 4, fontFamily: FONTS.serifItalic, fontStyle: 'italic', fontSize: 12,
        color: AXM.bone, textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 3,
    },
    // Loud-rejection reason line — the refusal,
    // said out loud where the drop just failed.
    rejectLine: {
        alignSelf: 'center', marginTop: 4, paddingHorizontal: 10, fontFamily: FONTS.sans, fontSize: 11,
        letterSpacing: 0.6, color: AXM.blood, textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.95)', textShadowRadius: 3,
    },
    // Dead-tray telegraph — sits directly above the dice it describes.
    deadTrayLine: {
        alignSelf: 'center', marginBottom: 2, paddingHorizontal: 12, fontFamily: FONTS.sans, fontSize: 10,
        letterSpacing: 0.8, color: AXM.sulfur, textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.95)', textShadowRadius: 3,
    },
    stagedCol: { alignItems: 'center' },
    dieSocket: { position: 'absolute', top: -10, right: -10, zIndex: 4 },
    dieSocketEmpty: {
        width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderStyle: 'dashed', borderColor: AXM.bone,
        backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
    },
    dieSocketGlyph: { fontFamily: FONTS.sans, fontSize: 13, color: AXM.bone },
    applyRibbon: {
        marginTop: -2, borderWidth: 1.5, borderTopWidth: 0, borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
        paddingVertical: 5, alignItems: 'center',
    },
    applyText: { fontFamily: FONTS.sans, fontSize: 12, letterSpacing: 1.5 },

    // ── signature rune column ──
    sigColumn: { position: 'absolute', left: 6, top: SIG_COLUMN_TOP_FALLBACK, alignItems: 'center', gap: SIG_COLUMN_GAP, zIndex: 30 },
    // One rung above `sigColumn`'s 30, so a die is never swallowed by a rune
    // (see the comment at the tray's call site). Still below the SCRAP bin at
    // 40, the topmost board chrome while a card drag is live.
    trayLayer: { zIndex: 31 },
    convictionChip: {
        borderWidth: 1, borderColor: AXM.sulfur, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 7, paddingVertical: 3,
    },
    convictionText: { fontFamily: FONTS.sans, fontSize: 15, lineHeight: 18, letterSpacing: 0.5, textAlign: 'center' },
    // The CONVICTION caption — small enough to stay chrome, large enough to
    // read: 9px, the floor the HUD clock line was raised past, and it scales
    // with the system text size, so the chip widens rather than shrinks it.
    convictionCaption: { fontFamily: FONTS.sans, fontSize: 9, lineHeight: 11, letterSpacing: 0.4, color: AXM.bone, textAlign: 'center', marginTop: 1 },
    sigRune: {
        width: SIG_RUNE_SIZE, height: SIG_RUNE_SIZE, borderRadius: SIG_RUNE_SIZE / 2, borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center', justifyContent: 'center',
    },
    sigRuneIcon: { fontSize: 18, lineHeight: 22 },
    sigCostBadge: {
        position: 'absolute', right: -4, bottom: -3, backgroundColor: 'rgba(0,0,0,0.92)', borderRadius: 7,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 3, paddingVertical: 0,
    },
    sigCostText: { fontFamily: FONTS.mono, fontSize: 9, lineHeight: 12 },
    // The refused mark sits opposite the cost badge, inside the rune's box, so
    // the column's measured height does not move.
    sigRefusedMark: {
        position: 'absolute', left: -4, top: -3, backgroundColor: 'rgba(0,0,0,0.92)', borderRadius: 7,
        borderWidth: 1, paddingHorizontal: 3, paddingVertical: 0,
    },
    sigRefusedText: { fontFamily: FONTS.mono, fontSize: 9, lineHeight: 12 },

    // ── dice row ──
    // gap 14 + wrap: four gems + the spare chip must fit a 375pt viewport
    // without clipping a die off-screen.
    diceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center', alignItems: 'flex-start', minHeight: 74, paddingBottom: 2 },
    dieAssigned: { opacity: 0.4 },
    // Drawn X/dud die — a small greyed pip, not a full slot.
    dieXPip: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: HUE.deadGrey, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', opacity: 0.6, alignSelf: 'center' },
    dieXGlyph: { fontFamily: FONTS.sans, fontSize: 12, color: HUE.stoneGrey },
    dieConv: { fontFamily: FONTS.sans, fontSize: 9, color: AXM.bone, textAlign: 'center', marginTop: 2, letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 3 },

    // ── the hand dock ── (fits the 176pt hand card above the fan's 20pt bottom
    // padding, and keeps the FREE corner pill's overhang above the card tops
    // inside the dock, which clips)
    dock: { height: HAND_CARD_H + HAND_FAN_PAD_BOTTOM + HAND_PILL_OVERHANG, overflow: 'hidden' },

    // ── momentum chip row (shared by the chain chip's nodes + SURGED tag) ──
    wheelRow: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3, paddingHorizontal: 10, marginBottom: 2 },
    wheelGlyph: { fontSize: 12, lineHeight: 15, textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } },
    wheelCharged: { fontFamily: FONTS.sans, fontSize: 11, letterSpacing: 1.6, marginLeft: 7, textShadowRadius: 7, textShadowOffset: { width: 0, height: 0 } },
    // ── momentum chain chip ──
    chainNode: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    chainNext: { fontFamily: FONTS.sans, fontSize: 13, marginLeft: 4 },
    // Bare "○ no momentum" text vanishes against the arena floor art. Give the
    // empty state the same
    // contrast-guaranteeing container the filled chain nodes get: dark alpha
    // fill + ash border. `overflow: 'hidden'` keeps the radius on Android
    // (the guardChip treatment).
    chainEmpty: {
        fontFamily: FONTS.sans, fontSize: 11, letterSpacing: 0.5,
        backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: AXM.ash,
        borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden',
    },
    chainBroke: { fontFamily: FONTS.sans, fontSize: 11, letterSpacing: 1.4, textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } },
    // The tap mark on the momentum chip. Quiet chrome; the chip's own colours
    // stay the loud part. It floats on the arena floor art beside the
    // readout's plate, not on it, so it carries the same contrast-guaranteeing
    // backing as the empty readout (bare, it reads ~1.5:1 against the bright
    // floor). Fixed width: `chipInfoGutter` mirrors it.
    chipInfoMark: {
        fontFamily: FONTS.sans, fontSize: 10, lineHeight: 14, color: AXM.bone, textAlign: 'center',
        marginLeft: CHIP_INFO_MARK_GAP, width: CHIP_INFO_MARK_W,
        backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: AXM.ash,
        borderRadius: 5, paddingVertical: 2, overflow: 'hidden',
    },
    // The mark's mirror on the leading edge of the chip row.
    chipInfoGutter: { width: CHIP_INFO_MARK_W + CHIP_INFO_MARK_GAP },
    fanGlow: { position: 'absolute', bottom: 0, left: 0 },
    // The fan is centred in the full board band (see `handFanLayout`): no
    // corner chrome sits beside it.
    fan: {
        ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
        paddingHorizontal: HAND_FAN_BOARD_EDGE, paddingBottom: HAND_FAN_PAD_BOTTOM,
    },
    // The hand card whose drag ghost is in flight — dimmed in place.
    handCardStuck: { opacity: 0.6 },
    stuckBadge: {
        position: 'absolute', left: 6, right: 6, top: '42%', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)', borderWidth: 1, borderColor: AXM.blood, borderRadius: 3, paddingVertical: 2,
    },
    stuckBadgeText: { fontFamily: FONTS.sans, fontSize: 9, letterSpacing: 1, color: AXM.blood },
    typeTag: {
        position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.72)', paddingVertical: 1,
    },
    typeTagText: { fontFamily: FONTS.sans, fontSize: 8, letterSpacing: 0.8, color: AXM.sulfur },
    typeTagTextLarge: { fontSize: 12 },
    xRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2,
        paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 4,
    },
    xStep: { fontFamily: FONTS.sans, fontSize: 16, lineHeight: 18, color: AXM.sulfur, paddingHorizontal: 4 },
    xValue: { fontFamily: FONTS.mono, fontSize: 10, color: AXM.parchment },
    globalsRow: {
        flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end',
        gap: 6, paddingHorizontal: 12, paddingBottom: 4,
    },
    globalsLabel: { fontFamily: FONTS.sans, fontSize: 9, letterSpacing: 1.2, color: AXM.bone },
    globalChip: {
        borderWidth: 1, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2,
        maxWidth: 170,
    },
    globalChipText: { fontFamily: FONTS.sans, fontSize: 10, letterSpacing: 0.4, color: AXM.parchment },
    globalChipTurns: { color: AXM.sulfur },

    // ── SCRAP medallion (drag-time only) ──
    trashBin: {
        position: 'absolute', left: 10, zIndex: 40, width: 60, height: 60, borderRadius: 30,
        borderWidth: 2, borderStyle: 'solid', borderColor: AXM.ash, backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center', justifyContent: 'center',
    },
    trashLabel: { fontFamily: FONTS.sans, fontSize: 9, letterSpacing: 1, color: AXM.bone, marginTop: 1 },

    // ── player status strip (in-flow, above the dice; RIGHT-aligned so the
    //    left signature-rune column never covers it) ──
    // Wraps: a long row of chips would otherwise run past the viewport, where
    // the board clips at its edge.
    statusStrip: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 12, paddingBottom: 6 },
    guardChip: {
        fontFamily: FONTS.sans, fontSize: 11, color: HUE.guardBlue, letterSpacing: 0.5,
        backgroundColor: 'rgba(0,0,0,0.7)', borderWidth: 1, borderColor: HUE.guardBlueEdge, borderRadius: 4,
        paddingHorizontal: 5, paddingVertical: 2, overflow: 'hidden',
    },

    // ── Shared card FACE — ONE FACE, EVERYWHERE ──────────────────────────────
    // A page of the codex: name band on ink, seamless art, one PAID line, and
    // the free pill on the corner. Stance colours the frame and the pill;
    // family or category colours the keyword. AXM tokens throughout — no
    // scrim, no washes.
    // A card carries exactly ONE border, the stance colour on `faceCard`. The
    // drop shadow is a depth cue in the card's own stance colour, supplied
    // inline by `CombatCardFace` (`shadowColor` is per-card data, so it cannot
    // live in this static style).
    faceOuter: {
        borderRadius: 6, backgroundColor: AXM.deepBg,
        shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6,
    },
    faceCard: { flex: 1, borderWidth: 1.5, borderRadius: 4, backgroundColor: AXM.deepBg, overflow: 'hidden' },
    // ① The name band — horizontal blackletter, one line, no rule under it.
    plateBand: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 5,
        backgroundColor: AXM.deepBg,
    },
    // The rarity spacer: draws nothing, says the rarity to a screen reader.
    // Its width is summed into NAME_BAND_LEFT_CHROME off the shipped sheet by
    // `CombatBoard.handfan.test.tsx`.
    plateRaritySpacer: { width: 5, alignSelf: 'stretch' },
    // The free corner pill — straddles the face's top-left corner. Positioned
    // on `faceOuter` (which does not clip), never inside `faceCard` (which does).
    freePill: {
        position: 'absolute', top: -15, left: -6, zIndex: 5,
        height: 26, minWidth: 26, borderRadius: 13, borderWidth: 1.5,
        backgroundColor: HUE.medallionBg,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
    },
    freePillLarge: { top: -18, left: -8, height: 34, minWidth: 34, borderRadius: 17, gap: 4 },
    freePillValued: { paddingHorizontal: 6 },
    freePillValuedLarge: { paddingHorizontal: 9 },
    freePillGlyph: { textAlign: 'center' },
    freePillValue: { fontFamily: FONTS.mono, fontSize: 11, lineHeight: 13, fontWeight: '700', color: HUE.white },
    freePillValueLarge: { fontSize: 15, lineHeight: 18 },
    // The named rarity tag — `large` faces only. Sits at the band's tail, after the
    // name's `flex: 1`, so it can never squeeze the name on a small face
    // (it is not rendered there at all).
    plateRarityLabel: {
        fontFamily: FONTS.sans, fontSize: 10, letterSpacing: 1.6,
        marginLeft: 6, flexShrink: 0,
    },
    // The name keeps ONE line on every face; its explicit lineHeight makes the
    // band's height a known quantity.
    plateName: { flex: 1, fontFamily: FONTS.gothic, fontSize: 13, lineHeight: 15, letterSpacing: 0.4, color: AXM.parchment, paddingVertical: 2 },
    plateNameLarge: { fontSize: 20, lineHeight: 24, letterSpacing: 0.8 },
    // ② The art plate — seamless: no mat, no frame.
    plateArtWrap: { flex: 1 },
    plateArtFrame: { flex: 1, overflow: 'hidden' },
    plateInertWash: { ...StyleSheet.absoluteFillObject, backgroundColor: AXM.backdrop },
    // ③ The PAID line — die cube then one line of text, solid ground, no rule.
    plateLedger: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 5,
        backgroundColor: AXM.deepBg,
    },
    paidLine: { flex: 1 },
    paidColumn: { flex: 1, justifyContent: 'center' },
    // A Global's duration, on the large face only.
    durationLine: { fontFamily: FONTS.serif, fontSize: 12, lineHeight: 15, color: AXM.bone, marginTop: 2 },
    // The small face's ledger: the whole PAID line over up to three rows, at
    // `paidLineFit`'s size; the die cube rides its top-right corner, half over
    // the art, so the text keeps the full width.
    plateLedgerSmall: { paddingHorizontal: 5, justifyContent: 'center' },
    ledgerCube: { position: 'absolute', top: -8, zIndex: 3 },
    paidLineSmall: { alignSelf: 'stretch' },
    paidGlyphLarge: { marginRight: 5 },
    paidRunCaps: { fontFamily: FONTS.sans, letterSpacing: PAID_CAPS_SPACING },
    paidRunSerif: { fontFamily: FONTS.serif },
    // The GLOBAL plate sits in the FREE pill's place and shape, text only.
    globalPlate: { paddingHorizontal: 7 },
    globalPlateLarge: { paddingHorizontal: 11 },
    globalPlateText: { fontFamily: FONTS.sans, fontSize: 12, lineHeight: 14, letterSpacing: 1 },
    globalPlateTextLarge: { fontSize: 17, lineHeight: 20, letterSpacing: 1.4 },
    // The keyword is the loudest word on the face — it is the whole read.
    paidKeyword: { fontFamily: FONTS.sans, fontSize: 12, lineHeight: 15, letterSpacing: 0.8 },
    paidKeywordLarge: { fontSize: 17, lineHeight: 20, letterSpacing: 1.2 },
    paidValue: { fontFamily: FONTS.mono, fontSize: 12, lineHeight: 15, color: AXM.parchment },
    paidValueLarge: { fontSize: 15, lineHeight: 20 },
}));

/** In-file alias read by every `const styles = useStyles()` call site. */
const useStyles = useCombatBoardStyles;

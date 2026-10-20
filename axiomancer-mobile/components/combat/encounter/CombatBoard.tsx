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
 *   signature rune column      → left edge (conviction chip + circular runes)
 *   dice row                   → free-floating gem dice above the hand
 *   hand fan                   → edge-to-edge arc, bottoms cropped off-screen
 *   corner medallions          → player portrait (tap = pilgrim modal) · END PHASE
 *   bottom rail                → ♥ HP · phase ledger · deck/discard counts
 *
 * The drag ghost renders at screen level in `CombatEncounterPanel`.
 */

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { Image } from '@/lib/platform/image';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Haptics } from '@/lib/platform/haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    FadeIn, FadeInDown, LinearTransition, runOnJS,
    useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
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
import { armedValue, dieCanPowerCardVM, STANCE_COLORS, PROGRAM_COPY } from '@/state/presenters/combat-encounter.engine';
// The ONE mobile source for the rarity band. The face never
// re-bands a rank and never re-types a rarity hue; see `card-rarity.engine.ts`.
import { rarityFor, RARITY_LABEL, RARITY_PIPS, RARITY_COLOR } from '@/state/presenters/card-rarity.engine';
import { TrashGlyph, LedgerMark } from '@/components/hazard/glyphs';
import { glyphShapeFor } from '@/components/combat/glyphShapes';
import { CombatCombatantPane, EffectChips, PlayerMedallion, COMBAT_HUD_HEIGHT, PLAYER_DOCK_FOOTPRINT_W, type CombatFx } from './CombatCombatantPane';
import { SACRIFICE_CALLOUT_MS } from './VitaeSacrificeCallout';
import { CombatDie, combatDieA11yLabel } from './CombatDie';
import { RollingDie } from './RollingDie';
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
export const FAN_CARD_ENTERING = FadeIn.duration(180);
export const FAN_CARD_LAYOUT = LinearTransition.duration(160);

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
const STAGED_CARD_ENTERING = FadeInDown.duration(180);
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
        node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
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

const SignatureColumn = React.memo(function SignatureColumn({ conviction, signatures, onCast, onInfo, top, onMeasureHeight }: {
    conviction: number;
    signatures: CombatSignatureVM[];
    onCast: (id: string) => void;
    onInfo?: (s: CombatSignatureVM) => void;
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
            <View
                style={styles.convictionChip}
                testID="combat-conviction"
                accessible
                accessibilityRole="text"
                accessibilityLabel={`${conviction} conviction`}
            >
                <Text style={[styles.convictionText, { color: AXM.sulfur }]} allowFontScaling={false}>◆ {conviction}</Text>
                {/* Name the economy: every rune below is priced in ◆ and the
                  * enemy telegraph offers '+1◆', so the chip prints the word
                  * CONVICTION rather than leaving it to the a11y label. */}
                <Text style={styles.convictionCaption} allowFontScaling={false}>CONVICTION</Text>
            </View>
            {signatures.map((s) => (
                <Pressable
                    key={s.id}
                    // NOT disabled while unaffordable — a tap then opens the info popup
                    // instead of casting, and a long-press explains any rune.
                    onPress={() => {
                        if (s.affordable) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined); onCast(s.id); }
                        else onInfo?.(s);
                    }}
                    onLongPress={() => onInfo?.(s)}
                    delayLongPress={350}
                    testID={`combat-signature-${s.id}`}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !s.affordable }}
                    accessibilityLabel={`${s.name}, costs ${s.cost} conviction. ${s.description}${s.affordable ? '' : ` — ${s.reason ?? 'not enough conviction'}`}`}
                    accessibilityHint="Long press for details"
                    style={[styles.sigRune, { borderColor: s.affordable ? AXM.sulfur : AXM.ash, opacity: s.affordable ? 1 : 0.55 }]}
                >
                    <Text style={[styles.sigRuneIcon, { color: s.affordable ? AXM.sulfur : AXM.bone }]}>{s.icon}</Text>
                    <View style={styles.sigCostBadge}>
                        <Text style={[styles.sigCostText, { color: s.affordable ? AXM.sulfur : AXM.ash }]} allowFontScaling={false}>◆{s.cost}</Text>
                    </View>
                </Pressable>
            ))}
        </View>
    );
});

// ── Dice row (free-floating gems above the hand) ─────────────────────────────

const TRAY_DIE_SIZE = 47;

// The rune column's resting anchor, and the gap it keeps above the dice tray
// when a long signature list would otherwise push it onto the dice.
const SIG_COLUMN_TOP_RATIO = 0.34;
const SIG_COLUMN_TOP = `${SIG_COLUMN_TOP_RATIO * 100}%` as const;
const SIG_TRAY_CLEARANCE = 10;

// One line of the bottom rail (VITAE · ledger · piles) before the safe-area
// inset. Exported for the rail test — the readout must sit inside this.
export const RAIL_LINE_H = 26;

// The rail's widths, for deciding whether the phase ledger fits its row. The
// side paddings are the two medallion footprints; the fixed cells are the
// widest VITAE readout ("♥ 999 / 999") and the two piles, which never shrink.
export const RAIL_PAD_LEFT = 104;
export const RAIL_PAD_RIGHT = 92;
const RAIL_GAP = 6;
const RAIL_FIXED_CELLS_W = 150;
export const RAIL_LEDGER_MARK = 14;
const RAIL_LEDGER_GAP = 3;

/** True when the phase ledger cannot sit on one row between the VITAE readout
 *  and the piles. It then takes its own centred line at the top of the rail,
 *  so a narrow phone still reads the ledger as a row, never a column. */
export function railLedgerStacks(screenW: number, marks: number): boolean {
    if (marks < 1) return false;
    const ledgerW = marks * RAIL_LEDGER_MARK + (marks - 1) * RAIL_LEDGER_GAP;
    const room = screenW - RAIL_PAD_LEFT - RAIL_PAD_RIGHT - RAIL_FIXED_CELLS_W - RAIL_GAP * 2;
    return ledgerW > room;
}

// ── The hand fan's chrome-free band ──────────────────────────────────────────
// The two bottom corners are chrome, not board: the player medallion sits at
// left 10 and is PLAYER_DOCK_FOOTPRINT_W wide, the END stack at right 10 with
// an 80pt disc. The fan prefers the band BETWEEN them — but only a hand that
// actually seats there takes it (see `handFanLayout`); the board's own edge
// inset is the fallback, because five 120pt cards do not fit 183pt of phone.
export const END_CORNER_FOOTPRINT_W = 90;
export const HAND_FAN_LEFT = PLAYER_DOCK_FOOTPRINT_W;
export const HAND_FAN_RIGHT = END_CORNER_FOOTPRINT_W;
// Never tighter than a readable sliver, however large the hand.
export const HAND_FAN_MIN_STEP = 28;
// The board's own edge inset — the widest band the fan may honestly use, and
// the reference layout the corner medallions float above at a higher zIndex.
export const HAND_FAN_BOARD_EDGE = 12;
// The widest a step may grow: a whole card plus this gap. A band with room
// lays the hand out side by side, so no card hides its right-hand (paid) column
// under a neighbour; a phone never has that room and keeps its overlap.
export const HAND_FAN_GAP = 8;

/**
 * Lay the hand fan out in the widest band it can honestly use.
 *
 * Inputs: `screenW` (viewport width) and `n` (number of fanned cards).
 * Outputs: `band` — the width the fan lays out in; `step` — the visible width
 * of each non-last card; `overlap` — the negative margin that produces it.
 *
 * Pure: the board calls it once per render. The chrome-free band between the
 * corner medallions is preferred, and a hand that seats there above the sliver
 * floor takes it — such a fan clears both corners entirely. A hand that does
 * NOT seat there takes the full board band instead: forcing it into the narrow
 * band would shave every card to the 28pt floor (names cut to two letters,
 * art and cost chips hidden, each a 28pt drag target) AND still overflow the
 * band, landing the last card half under the END disc. A readable fan the corner chrome floats over
 * beats an unreadable one crushed beside it.
 */
/**
 * The name band's own left chrome, in points — everything between a card face's
 * left edge and the first pixel of its NAME text.
 *
 * Derived, never guessed, from the styles it sums (all in `useStyles` below):
 *   1.5  `faceCard.borderWidth`
 * + 6    `plateBand.paddingHorizontal` (the left half)
 * + 5    `plateRarityPip.width` (the wax rarity pip)
 * + 5    `plateBand.gap` (pip → text)
 * = 17.5
 *
 * The rarity pip is a three-slot TRACK that stacks vertically, so its width
 * is still exactly one `plateRarityPip.width`. A horizontal row would make
 * this 31.5 and cost every fanned card ~14pt of name.
 *
 * Exported so the fan and its tests read ONE number, and gated for real:
 * `CombatBoard.handfan.test.tsx` renders {@link useCombatBoardStyles} and sums
 * `faceCard.borderWidth + plateBand.paddingHorizontal + plateRarityPip.width +
 * plateBand.gap` off the SHIPPED sheet, so moving any one of those four styles
 * turns this constant red instead of quietly re-clipping every name.
 */
export const NAME_BAND_LEFT_CHROME = 17.5;

/**
 * How much of a FANNED card's name column the player can actually see.
 *
 * In the fan, card `i`
 * is covered by card `i+1`, which is opaque (`faceCard.backgroundColor`) and
 * paints on top (`zIndex: i` ascending), so only `step` points of each covered
 * card survive. The name band's own chrome eats the first
 * {@link NAME_BAND_LEFT_CHROME} of that.
 *
 * Why this and not a wider overlap: the fan must satisfy
 * `HAND_CARD_W + (n-1) * step <= screenW`, which at 375pt with 5 cards caps
 * `step` at 63.75 against today's 57.75 — widening the overlap buys ~6pt, about
 * one character, and then the outermost cards run off the phone. The geometry
 * lever is exhausted; the name BOX is not. Sizing the box to the peek makes the
 * name wrap inside the sliver the player can see (the band already grows and
 * `numberOfLines={2}` already allows the second line — see the name-band
 * comment in `CombatCardFace`), instead of laying the text out at the full
 * 95pt column where its tail renders underneath the neighbouring card.
 *
 * @param step - the visible width of a non-last fanned card, from
 *   {@link handFanLayout}.
 * @returns the width the name text may honestly use, floored at 1 so a
 *   degenerate step can never produce a negative or zero-width layout box.
 */
export function nameColumnPeek(step: number): number {
    return Math.max(1, step - NAME_BAND_LEFT_CHROME);
}

export function handFanLayout(screenW: number, n: number): { band: number; step: number; overlap: number } {
    const chromeBand = Math.max(HAND_CARD_W, screenW - HAND_FAN_LEFT - HAND_FAN_RIGHT);
    const seatsBesideChrome = n <= 1 || (chromeBand - HAND_CARD_W) / (n - 1) >= HAND_FAN_MIN_STEP;
    const band = seatsBesideChrome
        ? chromeBand
        : Math.max(chromeBand, screenW - HAND_FAN_BOARD_EDGE * 2);
    const step = n > 1
        ? Math.min(HAND_CARD_W + HAND_FAN_GAP, Math.max(HAND_FAN_MIN_STEP, (band - HAND_CARD_W) / (n - 1)))
        : HAND_CARD_W;
    return { band, step, overlap: HAND_CARD_W - step };
}

// Memoized: a card drag's pickup and drop re-render the board, and the tray's
// GestureDetectors must not re-push their configs to the native module then.
const DiceRow = React.memo(function DiceRow({
    vm, dieGesture, draggingDieId, assignedDieIds,
}: {
    vm: CombatViewModel;
    dieGesture: (die: CombatDieVM) => ReturnType<typeof Gesture.Exclusive>;
    draggingDieId: string | null;
    assignedDieIds: Set<string>;
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
                // while the die's own drag is live — that unmounted the
                // GestureDetector mid-gesture, which on web killed the pan without
                // onEnd/onFinalize: the drop never resolved and the ghost stuck.
                const draggable = die.draggable;
                const isAssigned = assignedDieIds.has(die.id);
                // An X die (the `reroll_spent` bag can still land one) is
                // dead — a static struck pip, never draggable.
                if (die.isX) {
                    return (
                        <View key={die.id} style={styles.dieXPip} accessible accessibilityLabel="X die — blocked, powers nothing">
                            <Text style={styles.dieXGlyph}>✕</Text>
                        </View>
                    );
                }
                const dieDimmed = draggingDieId === die.id;
                // The BOON face's real payload (gear may raise it above the
                // stock 2) — spoken in the die's a11y label.
                const specialConviction = vm.dieGear?.slots.find((s) => s.color === die.color)?.specialConviction;
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
                                specialConviction={specialConviction}
                            />
                        ) : (
                            <CombatDie die={die} size={TRAY_DIE_SIZE} dimmed={dieDimmed} assigned={isAssigned} specialConviction={specialConviction} />
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
                return draggable ? (
                    <GestureDetector key={die.id} gesture={dieGesture(die)}>
                        <Animated.View>
                            {node}
                        </Animated.View>
                    </GestureDetector>
                ) : (
                    <View key={die.id}>{node}</View>
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
    dropIneligible = false, rejectKey = 0, freeProminent = false, x = null, onX, onRefuse,
}: {
    card: CombatCardVM;
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

// ── END PHASE medallion ──────────────────────────────────────────────────────

const EndPhaseMedallion = React.memo(function EndPhaseMedallion({ onPress, consequence = null, disabled = false }: {
    onPress: () => void;
    /** No-softlock telegraph: the honest one-line
     *  consequence of ending now (verified engine behavior, never invented) —
     *  rendered under the medallion and folded into the a11y label. */
    consequence?: string | null;
    /** Dimmed + press-inert while a phase is resolving (double-tap guard). */
    disabled?: boolean;
}) {
    const AXM = usePalette();
    const styles = useStyles();
    const pulse = useSharedValue(0);
    React.useEffect(() => {
        pulse.value = withRepeat(withSequence(withTiming(1, { duration: 1100 }), withTiming(0, { duration: 1100 })), -1);
    }, [pulse]);
    const glow = useAnimatedStyle(() => ({ opacity: 0.35 + pulse.value * 0.45 }));
    return (
        <View style={styles.endWrap} pointerEvents="box-none">
            {/* pulsing radial backing glow */}
            <Animated.View style={[StyleSheet.absoluteFill, glow]} pointerEvents="none">
                <Svg width={112} height={112} viewBox="0 0 100 100" style={{ position: 'absolute', top: -16, left: -16 }}>
                    <Defs>
                        <RadialGradient id="axmEndGlow" cx="50%" cy="50%" r="50%">
                            <Stop offset="0%" stopColor={AXM.sulfur} stopOpacity={0.5} />
                            <Stop offset="70%" stopColor={AXM.sulfur} stopOpacity={0.12} />
                            <Stop offset="100%" stopColor={AXM.sulfur} stopOpacity={0} />
                        </RadialGradient>
                    </Defs>
                    <Circle cx={50} cy={50} r={50} fill="url(#axmEndGlow)" />
                </Svg>
            </Animated.View>
            <Pressable
                onPress={disabled ? undefined : onPress}
                disabled={disabled}
                testID="combat-end-phase"
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                accessibilityLabel={`End phase — the enemy acts, then the next phase begins.${consequence ? ` ${consequence}.` : ''}`}
                style={[styles.endBtn, { borderColor: AXM.sulfur }, disabled && styles.endBtnDisabled]}
            >
                <View style={[styles.endBtnInnerRim]} pointerEvents="none" />
                <Text style={[styles.endGlyph, { color: AXM.sulfur }]} allowFontScaling={false}>⧗</Text>
                <Text style={[styles.endLabel, { color: AXM.sulfur }]} allowFontScaling={false}>END</Text>
            </Pressable>
            {consequence ? (
                <View style={styles.endConsequenceWrap} pointerEvents="none" testID="combat-end-consequence-wrap">
                    <Text style={styles.endConsequence} testID="combat-end-consequence" numberOfLines={2}>
                        {consequence}
                    </Text>
                </View>
            ) : null}
        </View>
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
    /** Long-press (or tap while unaffordable) on a signature rune → info popup. */
    onSignatureInfo?: (s: CombatSignatureVM) => void;
    /** Tap the player medallion → pilgrim stats/effects modal. */
    onPlayerInspect?: () => void;
    /** Tap the momentum chip → how-momentum-works popup. */
    onMomentumInfo?: () => void;
    /** Latest resolved engine events (drives enemy/player resolution feedback). */
    fx?: CombatFx;
    /** Reports the enemy HUD's measured bottom edge (screen-top-relative) on
     *  every layout pass, so panel-level siblings anchored under the same HUD
     *  (the LOG toggle) can track its real height instead
     *  of the static `COMBAT_HUD_HEIGHT` estimate. */
    onHudLayout?: (height: number) => void;
    /** The live map region (`vm.region` from the exploration screen), keying
     *  the arena backdrop plate. Omitted by the dev-only sandbox
     *  route, which falls back to the plate every unmapped region gets. */
    region?: string;
}

export const CombatBoard = React.memo(function CombatBoard({
    vm, drag, stagedUids, onApply, onStage, onUnstage, onDiscard, onSignature, onEndPhase, resolving = false, onInspect, onChip, onSignatureInfo, onPlayerInspect, onMomentumInfo, fx,
    onHudLayout, region,
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
    // numbers (the card VM's shortfall); any other refusal passes null.
    const [vitaeCallout, setVitaeCallout] = useState<{ cost: number; vitae: number; n: number } | null>(null);
    const calloutN = useRef(0);
    const flagShortfall = useCallback((sf: { cost: number; vitae: number } | null | undefined) => {
        if (!sf) return;
        calloutN.current += 1;
        setVitaeCallout({ cost: sf.cost, vitae: sf.vitae, n: calloutN.current });
    }, []);
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
            g = Gesture.Exclusive(pan, tap);
            gestureCacheRef.current.set(key, g);
        }
        return g;
    }, [gx, gy, beginDieJS, endJS, tapDieJS]);

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
    const { step, overlap } = handFanLayout(screenW, n);
    // When the fan overlaps, every fanned card EXCEPT the last is covered by
    // its right-hand neighbour, so its name must lay out inside the surviving
    // sliver. The last card, and every card of a fan with room to sit side by
    // side, is uncovered and keeps the full band (null).
    const handNamePeek = overlap > 0 ? nameColumnPeek(step) : null;
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
    // `sigColumn` is absolutely positioned and grows DOWNWARD with the
    // signature count; with a full loadout it can reach into the dice row,
    // where a rune button would swallow a die's drag and a tap aimed at the
    // die would cast a signature instead. Anchor the column off the MEASURED tray
    // top so its last rune always clears the tray, however many signatures the
    // loadout grants and however many rows the tray wraps to. Falls back to the
    // stylesheet's proportional `top` until the first layout pass lands.
    const [contentH, setContentH] = useState(0);
    const [trayTop, setTrayTop] = useState(0);
    const [sigH, setSigH] = useState(0);
    const sigTop = contentH > 0 && trayTop > 0 && sigH > 0
        ? Math.max(0, Math.min(contentH * SIG_COLUMN_TOP_RATIO, trayTop - sigH - SIG_TRAY_CLEARANCE))
        : undefined;

    // NO-SOFTLOCK telegraph — the DEAD TRAY: at
    // least one die is still playable but NONE of them can power ANY card in
    // hand (no matching color, no wild). The outs get lit instead of leaving
    // the player staring: FREE ribbons read prominent, and END carries its
    // honest consequence line.
    const playableDice = vm.dice.filter((d) => d.draggable && !d.isX && !d.spent);
    const deadTray = vm.diceRolled && playableDice.length > 0 && vm.hand.length > 0
        && playableDice.every((d) => vm.hand.every((c) => !dieCanPowerCardVM(d, c.stance)));
    // The END consequence on a dead tray. Engine truth (`endTurn`): ONE
    // unspent mana/special die banks to the Reserve when a slot is free; the
    // rest expire and the fresh tray rolls next phase. The line does not name
    // the bank.
    const endConsequence = deadTray
        ? 'unusable dice are discarded · fresh roll next phase'
        : null;

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
    const handleEndPhaseRef = useRef<() => void>(() => undefined);
    handleEndPhaseRef.current = () => {
        if (resolving) return; // a phase is already resolving; ignore the tap
        for (const uid of stagedUids) handleApplyRef.current(uid);
        onEndPhase();
    };
    // Stable, so the memoized medallion sits out the drag re-renders.
    const handleEndPhase = useCallback(() => handleEndPhaseRef.current(), []);

    const metaLine = `${vm.phaseBadge} · ${vm.roundLabel} · ${vm.turnLabel}`
        .replace('ROUND ', 'R').replace('TURN ', 'T');
    // The rail is at least one 26pt line plus the home-indicator inset, and it
    // GROWS if its row wraps (a long phase ledger on a narrow phone) — it never
    // clips; a fixed height would push a wrapped VITAE line off the bottom of
    // the screen. The floating chrome (SCRAP,
    // END) keys off the MEASURED height so it always sits above the rail.
    const [railMeasuredH, setRailMeasuredH] = useState(0);
    const railMinH = RAIL_LINE_H + bottomInset;
    const railH = Math.max(railMinH, railMeasuredH);
    const ledgerStacks = railLedgerStacks(screenW, vm.ledger.length);
    const ledger = useMemo(() => (
        <View style={[styles.railLedger, ledgerStacks && styles.railLedgerStacked]} testID="combat-ledger">
            {vm.ledger.map((m, i) => <LedgerMark key={i} kind={m === 'clear' ? 'O' : m === 'overwhelmed' ? 'X' : 'pending'} size={RAIL_LEDGER_MARK} />)}
        </View>
    ), [vm.ledger, ledgerStacks, styles]);

    return (
        <View style={styles.root} testID="combat-board">
            {/* layers 0–2: battlefield scene, scrims, top HUD, player medallion */}
            <CombatCombatantPane
                enemy={vm.enemy}
                player={vm.player}
                onChip={onChip}
                fx={fx}
                topInset={topInset}
                metaLine={metaLine}
                onHudLayout={handleHudLayout}
                region={region}
            />

            {/* interactive column */}
            <View
                style={styles.content}
                pointerEvents="box-none"
                onLayout={(e) => setContentH(e.nativeEvent.layout.height)}
            >
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
                                {/* This line is for the card already lifted out of the fan.
                                    The tap-to-read hatch lives on the fan (`styles.fanHint`
                                    below), where the player chooses which card to lift. */}
                                {deadTray ? 'no die matches your hand — APPLY · FREE still works' : 'drag a die onto your card · APPLY to commit'}
                            </Text>
                        ) : null}
                    </View>
                </View>

                {/* momentum — the chain chip. */}
                <MomentumChainChip vm={vm.momentumV2} onPress={onMomentumInfo} />

                {/* Globals in play — each with its turns left; tap reads the card. */}
                {vm.globals.length > 0 ? (
                    <View style={styles.globalsRow} pointerEvents="box-none" testID="combat-globals">
                        <Text style={styles.globalsLabel} allowFontScaling={false}>{PROGRAM_COPY.inPlay}</Text>
                        {vm.globals.map((g) => (
                            <Pressable
                                key={g.cardId}
                                onPress={() => { if (g.card) onInspect(g.card); }}
                                style={[styles.globalChip, { borderColor: g.stanceColor }]}
                                accessibilityRole="button"
                                accessibilityLabel={g.a11y}
                                testID={`combat-global-${g.cardId}`}
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
                        no die matches your hand — FREE plays still work · END rolls fresh dice
                    </Text>
                ) : null}
                {/* The tray outranks the rune column in z-order. `sigTop` keeps the column clear of the
                    tray whenever there is room, but it is derived from THREE
                    measured values (`contentH`, `trayTop`, `sigH`) held in
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
                >
                    <DiceRow vm={vm} dieGesture={dieGesture} draggingDieId={draggingDieId} assignedDieIds={assignedDieIds} />
                </View>

                {/* signature rune column — left edge. A sibling of the tray
                    layer above (both direct children of `content`) so their
                    explicit zIndex values actually compete in one stacking
                    context — see the comment on the tray layer. */}
                <SignatureColumn
                    conviction={vm.conviction} signatures={vm.signatures} onCast={onSignature} onInfo={onSignatureInfo}
                    top={sigTop} onMeasureHeight={setSigH}
                />

                {/* the hand dock — edge-to-edge fan, bottoms cropped off-screen */}
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
                    {/* Every fanned card but the last is
                        covered, so its name is capped to `handNamePeek` and reads
                        short. The escape hatch belongs HERE — on the fan, while the
                        clipped names are what the player is looking at — not in the
                        staged line, which only appears once a card has already been
                        chosen. It shows whenever the fan holds more than one card: a
                        `namePeek` cap applies below only when the fan overlaps (a
                        phone), but a wide board's player still has to learn that a
                        tap reads the card. */}
                    {fan.length > 1 && !cardDragLive ? (
                        <Text style={styles.fanHint} numberOfLines={1} testID="combat-tap-hint">
                            tap a card to read it
                        </Text>
                    ) : null}
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
                                namePeek={i === fan.length - 1 ? null : handNamePeek}
                            />
                        ))}
                    </View>
                </View>

                {/* bottom rail — ♥ HP · phase ledger · deck/discard */}
                <View
                    style={[styles.rail, ledgerStacks && styles.railStacked, { minHeight: railMinH, paddingBottom: bottomInset }]}
                    testID="combat-rail"
                    onLayout={(e) => setRailMeasuredH(e.nativeEvent.layout.height)}
                >
                    {ledgerStacks ? ledger : null}
                    {/* Print the maximum, as the enemy's bar does, so the player
                      * can tell how much of their VITAE is left. */}
                    <Text
                        style={styles.railHp}
                        numberOfLines={1}
                        allowFontScaling={false}
                        testID="combat-rail-vitae"
                        accessibilityLabel={`VITAE ${vm.player.hp} of ${vm.player.maxHp}`}
                    >
                        ♥ {vm.player.hp}<Text style={styles.railHpMax}> / {vm.player.maxHp}</Text>
                    </Text>
                    {ledgerStacks ? null : ledger}
                    <View
                        style={styles.railPiles}
                        accessible
                        accessibilityRole="text"
                        accessibilityLabel={`Deck ${vm.deckCount} cards, discard ${vm.discardCount}`}
                    >
                        <View style={styles.pileGlyph}><Text style={styles.pileGlyphText} allowFontScaling={false}>▮</Text></View>
                        <Text style={styles.pileCount} allowFontScaling={false}>{vm.deckCount}</Text>
                        <View style={[styles.pileGlyph, { transform: [{ rotate: '8deg' }] }]}><Text style={styles.pileGlyphText} allowFontScaling={false}>▯</Text></View>
                        <Text style={styles.pileCount} allowFontScaling={false}>{vm.discardCount}</Text>
                    </View>
                </View>
            </View>

            {/* player medallion — bottom-left, ABOVE the hand (reference corner chrome) */}
            <PlayerMedallion
                player={vm.player}
                enemyIntentDamage={vm.enemy.intent.damage}
                onPress={onPlayerInspect}
                fx={fx}
                bottomInset={bottomInset}
                sacrificeCallout={vitaeCallout}
            />

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

            {/* corner medallion — END PHASE. Dice are the turn's hand: you
                play what you rolled. */}
            <View style={[styles.cornerStack, { bottom: railH + 6 }]} pointerEvents="box-none">
                <EndPhaseMedallion onPress={handleEndPhase} consequence={endConsequence} disabled={resolving} />
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
 * The shared card FACE — THE PRINTED PLATE. Cards read as pages of the codex,
 * in line with the Woodcut Codex direction:
 *   · ① NAME BAND, top, HORIZONTAL, blackletter on solid ink — the fan shows
 *     each card's left edge, so the name reads without turning your head;
 *     rarity is a wax pip TRACK at the band's head, plus a named tag on the
 *     large face.
 *
 *     Rarity is a three-legged signal — NAMED LABEL + PIP ROW + FRAME COLOUR,
 *     never colour alone: a lone hue is illegible in greyscale, to a
 *     colourblind player, and to anyone who has not learned that purple means
 *     rare.
 *
 *     The trade the face takes: the pip track is a fixed THREE-SLOT column (filled = the band's pip count, hollow = the
 *     rest), stacked VERTICALLY rather than laid out in a row. A horizontal
 *     three-pip row would widen {@link NAME_BAND_LEFT_CHROME} by ~14pt, and in
 *     the hand fan that chrome is subtracted from the ~57pt sliver of each
 *     covered card — about a third of every fanned card's name. Vertical
 *     keeps the band's left chrome at its shipped width, so the count is legible
 *     and no name loses a character. The NAMED tag rides the `large` face only
 *     (inspect overlay, reward preview) for the same reason: at 120pt the word
 *     "UNCOMMON" and the card's own name cannot both have the band;
 *   · ② ART PLATE — a framed print with a hairline rule and dark margins, not
 *     a full-bleed background. No stance wash, no scrim: the plate is clean
 *     and the text never fights the art for contrast;
 *   · ③ LEDGER, bottom, solid ink ground — FREE cell (glyph + intensity,
 *     category colour) | hairline rule | PAID cell (stance die cube +
 *     KEYWORD + value). In the fan the visible sliver is name-start + FREE
 *     effect: the two fastest reads.
 * Stance colours the frame + die cube; category colours the glyph + keyword.
 * Instanced small in the hand and LARGE in the inspect modal so the two can
 * never drift.
 *
 * The face carries NO prose. The
 * authored PAID sentence, the type strip, and the printed die lines live in
 * the inspect overlay. The face is the glance read (name · free glyph ·
 * keyword · value); the overlay is the explanation.
 */
/** Below this face width the ledger stacks (see `narrow` in `CombatCardFace`).
 *  The hand card (120) sits above it; the reward offer (100) and the compact
 *  staged card (92) below. Exported for the face test. */
export const NARROW_FACE_W = 112;

/** Bebas Neue capital advance per px of font size, letter spacing excluded, with a little slack. */
const SANS_CAP_EM = 0.42;
/** JetBrains Mono advance per px of font size, with a little slack. */
const MONO_EM = 0.62;
const PAID_KEYWORD_SIZE = 12;
const PAID_KEYWORD_SPACING = 0.8;
const PAID_VALUE_SIZE = 11;
const FREE_VALUE_SIZE = 12;
/** Below these the side-by-side PAID column is too thin to read, so the ledger stacks. */
const PAID_KEYWORD_MIN = 10;
const PAID_VALUE_MIN = 9;
/** Floors on a stacked face, so a freak-long word still prints at a legible size. */
const PAID_KEYWORD_FLOOR = 8;
const PAID_VALUE_FLOOR = 8;

/**
 * How a small face lays out its PAID column. The keyword's longest word and the
 * whole value must each fit on one line: a word that cannot fit breaks mid-word
 * ("VU…"), and a value that wraps breaks inside the number ("+6" over "0%").
 * The side-by-side row leaves the PAID text whatever the FREE cell does not
 * take, so a long keyword beside a percent FREE value (A Plain Word's
 * VULNERABLE) stacks the ledger and takes the full width. Sizes are computed,
 * not `adjustsFontSizeToFit`, which react-native-web ignores.
 */
export function paidLedgerFit({ width, keyword, value, freeInner, hasFree }: {
    width: number;
    keyword: string;
    value: string;
    freeInner: string;
    hasFree: boolean;
}): { stacked: boolean; keywordSize: number; valueSize: number } {
    const narrow = width < NARROW_FACE_W;
    const glyph = narrow ? 18 : 24;
    const cube = narrow ? 12 : 14;
    // Card border 1.5 each side, ledger padding 6 each side; cube + its 5pt gap.
    const inner = width - 3 - 12 - cube - 5;
    const freeW = glyph + 3 + freeInner.length * FREE_VALUE_SIZE * MONO_EM;
    const sideRoom = hasFree ? inner - freeW - 13 : inner;
    const longest = Math.max(0, ...keyword.split(/\s+/).map((w) => [...w].length));
    const valueLen = [...value].length;
    const fit = (room: number) => ({
        keywordSize: longest === 0 ? PAID_KEYWORD_SIZE
            : Math.min(PAID_KEYWORD_SIZE, Math.floor((room / longest - PAID_KEYWORD_SPACING) / SANS_CAP_EM)),
        valueSize: valueLen === 0 ? PAID_VALUE_SIZE
            : Math.min(PAID_VALUE_SIZE, Math.floor(room / (valueLen * MONO_EM))),
    });
    const side = fit(sideRoom);
    if (!narrow && side.keywordSize >= PAID_KEYWORD_MIN && side.valueSize >= PAID_VALUE_MIN) {
        return { stacked: false, ...side };
    }
    const stack = fit(inner);
    return {
        stacked: true,
        keywordSize: Math.max(PAID_KEYWORD_FLOOR, stack.keywordSize),
        valueSize: Math.max(PAID_VALUE_FLOOR, stack.valueSize),
    };
}

/**
 * How many slots the rarity track always draws — the top of the band
 * (`RARITY_PIPS.rare`). Exported so a test reads the same number the face does
 * instead of re-typing a 3.
 */
export const RARITY_TRACK_SLOTS = RARITY_PIPS.rare;

/**
 * The PIP ROW leg — the greyscale-safe half of the rarity signal.
 *
 * Always {@link RARITY_TRACK_SLOTS} slots: the first `pips` are filled in the
 * band's hue, the rest are hollow rings. Drawing the empty slots is the point —
 * "two filled of three" is readable on a single card, where a bare pair of pips
 * only means something once you have another card beside it to compare against.
 * Filled-vs-hollow is a SHAPE difference, so it survives greyscale and colour
 * blindness with {@link RARITY_COLOR} switched off entirely; the hue is the
 * decoration on top, never the message.
 *
 * Stacked vertically on purpose — see the face doc block above
 * `CombatCardFace`: a horizontal row would widen {@link NAME_BAND_LEFT_CHROME} and
 * re-break the fanned-name read.
 */
function RarityTrack({ pips, color, large, label }: { pips: number; color: string; large: boolean; label: string }) {
    const styles = useStyles();
    return (
        <View
            style={large ? styles.plateRarityTrackLarge : styles.plateRarityTrack}
            accessible
            accessibilityRole="text"
            accessibilityLabel={label}
            testID="combat-card-face-rarity-pips"
        >
            {Array.from({ length: RARITY_TRACK_SLOTS }, (_, i) => (
                <View
                    key={i}
                    testID={`combat-card-face-rarity-pip-${i}`}
                    style={[
                        styles.plateRarityPip,
                        large && styles.plateRarityPipLarge,
                        i < pips ? { backgroundColor: color } : styles.plateRarityPipEmpty,
                    ]}
                />
            ))}
        </View>
    );
}

export const CombatCardFace = React.memo(function CombatCardFace({
    card, width, height, large = false, accent = null, heroOverride, namePeek = null, children,
}: {
    card: CombatCardVM;
    width: number;
    height: number;
    large?: boolean;
    /**
     * Cap the NAME text's layout width (points) because something opaque
     * covers the rest of this face. Only the hand fan passes it; every other
     * instance (staged 92, reward offer 100, drag ghost, detail overlay) leaves
     * it null and lays the name out across the full band.
     */
    namePeek?: number | null;
    /** Override the keyword/value/border colour (the armed staged-card read tint). */
    accent?: string | null;
    /** Override the hero value text (e.g. the live-recomputed Guard number). */
    heroOverride?: string;
    children?: React.ReactNode;
}) {
    const AXM = usePalette();
    const styles = useStyles();
    const f = card.face;
    // PRINTED PLATE: STANCE colours the frame + the die cube; CATEGORY colours
    // the FREE glyph + the keyword. Inert cards grey both honestly.
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
    const freeTint = tintFor(f.freeStatScaled);
    const paidValue = paidValueFor(f, heroOverride);
    const freeInner = compactFree(f.freeValue ?? (f.freeHeroText || null));
    const hasFree = !!f.freeGlyph;
    // Effect-shaped silhouette for the FREE glyph;
    // keywords without a shape keep the text rune.
    const freeShape = glyphShapeFor(f.freeGlyphKey);
    // A NARROW face (the reward-draft offer at 100pt, a compact staged card at
    // 92pt) cannot seat FREE | PAID side by side: the fixed FREE cell and the
    // stance cube leave the keyword and value ~8pt, which react-native-web
    // ellipsizes to "B..", "D.". `adjustsFontSizeToFit` is a silent no-op on
    // web, so the answer is layout:
    // the ledger STACKS (FREE row over PAID row, full width each) and the
    // text wraps under an explicit lineHeight instead of clipping. A hand
    // card stacks too when its keyword is too long for the column the FREE
    // cell leaves (`paidLedgerFit`).
    const narrow = !large && width < NARROW_FACE_W;
    const fit = large ? null : paidLedgerFit({
        width,
        keyword: f.keyword ? `${f.familyGlyph ? `${f.familyGlyph} ` : ''}${f.keyword.toUpperCase()}` : '',
        value: paidValue,
        freeInner,
        hasFree: !!f.freeGlyph,
    });
    const stacked = fit?.stacked ?? false;
    const bandH = large ? 36 : 26;
    const ledgerH = large ? 60 : 42;
    const glyphSize = large ? 38 : narrow ? 18 : 24;
    // The drop shadow is STANCE-coloured. It is
    // applied inline on `faceOuter` rather than in the static style, because
    // the colour is per-card data; `accent` (the armed staged-card read tint)
    // wins where set, so the shadow always matches the frame above it.

    // The rarity band, derived ONCE by `card-rarity.engine` from the card's
    // own rank; hues come from `RARITY_COLOR`. (`band`, just above, is the
    // STANCE colour — these two are different systems on one face.)
    const rarBand = rarityFor(card);
    const rarColor = RARITY_COLOR[rarBand];
    const rarLabel = RARITY_LABEL[rarBand];
    return (
        <View style={[styles.faceOuter, { width, height, shadowColor: accent ?? band }]}>
            <View style={[styles.faceCard, { borderColor: accent ?? band }]}>
                {/* ① NAME BAND — horizontal blackletter on solid ink; the wax
                    pip TRACK carries rarity. The fan's visible sliver
                    starts here.
                    A long name wraps to a second line (the band grows, the art
                    plate gives) rather than truncating to a stub.

                    That wrap only helps if the text is LAID OUT in
                    the width the player can see. A fanned card is covered by
                    its right-hand neighbour, so `namePeek` caps the text box to
                    the surviving sliver and the name wraps inside it — without
                    the cap the tail is laid out correctly and then painted over,
                    which reads as a truncation ("CHILBLAI") but is occlusion. */}
                <View style={[styles.plateBand, { minHeight: bandH }]} pointerEvents="none" testID="combat-card-face-band">
                    {/* The track carries the WORD for a screen reader, so a face
                        that is NOT wrapped in a labelled pressable (the staged
                        card, the drag ghost) still announces its rarity. Where
                        the face IS inside one — the hand card and the reward
                        tile — that parent label wins, and both of those name the
                        rarity themselves. */}
                    <RarityTrack pips={RARITY_PIPS[rarBand]} color={rarColor} large={large} label={rarLabel} />
                    <Text
                        style={[
                            styles.plateName,
                            large && styles.plateNameLarge,
                            namePeek != null && { maxWidth: namePeek },
                        ]}
                        numberOfLines={2}
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
                {/* ② ART PLATE — a framed print behind a hairline rule; dark
                    margins, no wash, no scrim. Inert cards grey the plate. */}
                <View style={styles.plateArtWrap} pointerEvents="none">
                    <View style={styles.plateArtFrame}>
                        <Image
                            source={getCardArt(card.cardId)}
                            style={[StyleSheet.absoluteFill, artMirrored(card.cardId) && { transform: [{ scaleX: -1 }] }]}
                            contentFit="cover"
                            transition={0}
                        />
                        {f.inert ? <View style={styles.plateInertWash} /> : null}
                        {f.typeTag ? (
                            <View style={styles.typeTag} testID="combat-card-face-type-tag">
                                <Text style={[styles.typeTagText, large && styles.typeTagTextLarge]} numberOfLines={1} allowFontScaling={false}>{f.typeTag}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
                {/* ③ LEDGER — solid ink ground: FREE cell | rule | PAID cell.
                    No prose; the overlay explains. */}
                <View
                    style={[styles.plateLedger, stacked ? styles.plateLedgerStacked : { minHeight: ledgerH }]}
                    pointerEvents="none"
                    testID={stacked ? 'combat-card-face-ledger-stacked' : 'combat-card-face-ledger'}
                >
                    {hasFree ? (
                        <View style={styles.plateFreeCell}>
                            {freeShape ? (
                                <Svg width={glyphSize} height={glyphSize} viewBox="0 0 24 24">
                                    <Path
                                        d={freeShape.d}
                                        fill={f.inert ? AXM.ash : kwColor}
                                        fillRule={freeShape.evenodd ? 'evenodd' : 'nonzero'}
                                    />
                                </Svg>
                            ) : (
                                <Text style={[styles.plateFreeGlyph, { fontSize: glyphSize * 0.85, lineHeight: glyphSize, color: f.inert ? AXM.ash : kwColor }]} allowFontScaling={false}>{f.freeGlyph}</Text>
                            )}
                            {freeInner ? (
                                <Text style={[styles.plateFreeValue, large && styles.plateFreeValueLarge, freeTint ? { color: freeTint } : null]} allowFontScaling={false}>{freeInner}</Text>
                            ) : null}
                        </View>
                    ) : null}
                    {hasFree ? <View style={stacked ? styles.plateRuleAcross : styles.plateRule} /> : null}
                    <View style={styles.platePaidCell}>
                        <StanceCube color={band} size={large ? 20 : narrow ? 12 : 14} />
                        <View style={styles.paidTextWrap}>
                            {f.keyword ? (
                                <Text
                                    style={[styles.paidKeyword, large && styles.paidKeywordLarge, fit && { fontSize: fit.keywordSize, lineHeight: fit.keywordSize + 2 }, { color: kwColor }]}
                                    numberOfLines={large ? 1 : 2}
                                    allowFontScaling={false}
                                    testID="combat-card-face-keyword"
                                >
                                    {f.familyGlyph ? `${f.familyGlyph} ` : ''}{f.keyword.toUpperCase()}
                                </Text>
                            ) : null}
                            {paidValue ? (
                                <Text
                                    style={[styles.paidValue, large && styles.paidValueLarge, fit && { fontSize: fit.valueSize, lineHeight: fit.valueSize + 4 }, scaledTint ? { color: scaledTint } : null]}
                                    numberOfLines={1}
                                    allowFontScaling={false}
                                    testID="combat-card-face-value"
                                >
                                    {paidValue}
                                </Text>
                            ) : null}
                        </View>
                    </View>
                </View>
                {children}
            </View>
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
    card, gesture, marginLeft, tilt, zIndex, liftedUid, namePeek,
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
    namePeek: number | null;
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
                    <HandCard card={card} namePeek={namePeek} />
                </Animated.View>
            </Animated.View>
        </GestureDetector>
    );
});

function HandCard({ card, namePeek = null }: { card: CombatCardVM; namePeek?: number | null }) {
    const styles = useStyles();
    // `namePeek` is null for the topmost (rightmost) fanned card — nothing
    // covers it, so its name uses the full band. See `nameColumnPeek`.
    // A program card neither of whose lines can be played now reads dimmed
    // and says so; the overlay (tap) gives the reasons.
    const stuck = !!card.play?.freeBlock && !!card.play?.paidBlock;
    return (
        <View style={stuck ? styles.handCardStuck : null}>
            <CombatCardFace card={card} width={HAND_CARD_W} height={HAND_CARD_H} namePeek={namePeek}>
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
    sigColumn: { position: 'absolute', left: 6, top: SIG_COLUMN_TOP, alignItems: 'center', gap: 8, zIndex: 30 },
    // One rung above `sigColumn`'s 30, so a die is never swallowed by a rune
    // (see the comment at the tray's call site). Still below the corner
    // medallions at 40, which are deliberately the topmost board chrome.
    trayLayer: { zIndex: 31 },
    convictionChip: {
        borderWidth: 1, borderColor: AXM.sulfur, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 7, paddingVertical: 3,
    },
    convictionText: { fontFamily: FONTS.gothic, fontSize: 15, letterSpacing: 0.5, textAlign: 'center' },
    // The CONVICTION caption — small enough to stay chrome, large enough to read.
    convictionCaption: { fontFamily: FONTS.sans, fontSize: 6, letterSpacing: 0.6, color: AXM.bone, textAlign: 'center', marginTop: 1 },
    sigRune: {
        width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center', justifyContent: 'center',
    },
    sigRuneIcon: { fontSize: 18, lineHeight: 22 },
    sigCostBadge: {
        position: 'absolute', right: -4, bottom: -3, backgroundColor: 'rgba(0,0,0,0.92)', borderRadius: 7,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 3, paddingVertical: 0,
    },
    sigCostText: { fontFamily: FONTS.mono, fontSize: 9, lineHeight: 12 },

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
    // padding, leaving 20pt at the top for the tap-to-read hint)
    dock: { height: 216, overflow: 'hidden' },

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
    // The side paddings are the corner-medallion footprints, not decoration:
    // the fan is centred in what is left between them. A hand too large for
    // that band (see `handFanLayout`) overflows it symmetrically and the
    // corners float over the outermost cards.
    fan: {
        ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
        paddingLeft: HAND_FAN_LEFT, paddingRight: HAND_FAN_RIGHT, paddingBottom: 20,
    },
    // The fan's tap-to-read hatch. Absolutely positioned across the top of the
    // dock so it costs the fan no layout: the 176pt cards sit flush to the
    // dock's 20pt bottom padding, leaving the top 20pt of the 216pt dock free.
    fanHint: {
        position: 'absolute', top: 1, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none',
        fontFamily: FONTS.serifItalic, fontStyle: 'italic', fontSize: 12,
        color: AXM.bone, textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 3,
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

    // ── bottom rail ── The row sits between the player medallion (left 10,
    //    92 wide) and the END medallion (right 10, 80 wide); the side paddings
    //    are those footprints, not spare room. The VITAE readout and the piles
    //    never wrap or shrink. When the ledger cannot fit between them
    //    (`railLedgerStacks`) it takes the first line whole and the rail grows.
    rail: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: RAIL_GAP,
        paddingLeft: RAIL_PAD_LEFT, paddingRight: RAIL_PAD_RIGHT, backgroundColor: 'rgba(7,5,9,0.9)',
        borderTopWidth: 1, borderTopColor: AXM.divider,
    },
    railStacked: { flexWrap: 'wrap', rowGap: 2, paddingTop: 4 },
    railHp: { fontFamily: FONTS.mono, fontSize: 13, lineHeight: 17, color: AXM.parchment, letterSpacing: 0.5, flexShrink: 0 },
    // The maximum rides quieter than the live value.
    railHpMax: { color: AXM.bone, fontSize: 11 },
    railLedger: { flexDirection: 'row', flexShrink: 1, gap: RAIL_LEDGER_GAP, alignItems: 'center', justifyContent: 'center' },
    railLedgerStacked: { width: '100%', flexShrink: 0 },
    railPiles: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 },
    pileGlyph: { width: 13, height: 17, borderRadius: 2, borderWidth: 1, borderColor: AXM.ash, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    pileGlyphText: { fontFamily: FONTS.sans, fontSize: 7, color: AXM.ash, lineHeight: 9 },
    pileCount: { fontFamily: FONTS.mono, fontSize: 11, color: AXM.bone, marginRight: 4 },

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

    // ── corner medallions ──
    cornerStack: { position: 'absolute', right: 10, alignItems: 'center', gap: 8, zIndex: 40 },
    endWrap: { width: 80, height: 80 },
    endBtn: {
        width: 80, height: 80, borderRadius: 40, borderWidth: 3, backgroundColor: HUE.medallionBg,
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    // Dimmed while a phase resolves (double-tap guard); every other
    // disabled control in this board uses the same ~0.4 opacity treatment.
    endBtnDisabled: { opacity: 0.4 },
    endBtnInnerRim: {
        ...StyleSheet.absoluteFillObject, margin: 4, borderRadius: 36, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(212,192,38,0.10)',
    },
    endGlyph: { fontFamily: FONTS.gothic, fontSize: 30, lineHeight: 33 },
    endLabel: { fontFamily: FONTS.sans, fontSize: 9, letterSpacing: 2, marginTop: -1 },
    // The honest one-line END consequence — floats ABOVE the medallion (below
    // would collide with the bottom rail). Anchored to the medallion's RIGHT
    // edge, so the 140pt line runs inward across the board rather than past
    // the screen's right edge, where `root` would clip the words.
    endConsequenceWrap: { position: 'absolute', top: -34, right: 0, width: 140, alignItems: 'center' },
    endConsequence: {
        fontFamily: FONTS.sans, fontSize: 8.5,
        letterSpacing: 0.4, color: AXM.sulfur, textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.95)', textShadowRadius: 3,
    },

    // ── Shared card FACE — THE PRINTED PLATE ─────────────────────────────────
    // A page of the codex: name band on ink, framed art plate behind a
    // hairline rule, solid-ground ledger. Stance colours the frame; category
    // colours glyph + keyword. AXM tokens throughout — no scrim, no washes.
    // A card carries exactly ONE border, the stance colour on `faceCard`. The
    // drop shadow is a depth cue in the card's own stance colour, supplied
    // inline by `CombatCardFace` (`shadowColor` is per-card data, so it cannot
    // live in this static style).
    faceOuter: {
        borderRadius: 6, backgroundColor: AXM.deepBg,
        shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6,
    },
    faceCard: { flex: 1, borderWidth: 1.5, borderRadius: 4, backgroundColor: AXM.deepBg, overflow: 'hidden' },
    // ① The name band — horizontal blackletter; the wax pip TRACK is the rarity
    // (see the face doc block above `CombatCardFace`).
    plateBand: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 5,
        backgroundColor: AXM.deepBg,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: AXM.divider,
    },
    // The track is a COLUMN (RN's default `flexDirection`), so its width is one
    // pip's width and `NAME_BAND_LEFT_CHROME` counts one pip. Laying the
    // three slots out in a row instead would widen the band's left chrome by
    // ~14pt and shave that off every fanned card's visible name.
    plateRarityTrack: { alignItems: 'center', justifyContent: 'center', gap: 2 },
    plateRarityTrackLarge: { alignItems: 'center', justifyContent: 'center', gap: 3 },
    // `plateRarityPip.width` is summed into NAME_BAND_LEFT_CHROME off the
    // shipped sheet by `CombatBoard.handfan.test.tsx` — changing it moves the
    // fan's name box, so change it knowing that.
    plateRarityPip: { width: 5, height: 5, borderRadius: 3 },
    plateRarityPipLarge: { width: 7, height: 7, borderRadius: 4 },
    // An UNEARNED slot: hollow, not merely dimmer. Filled-vs-hollow is a shape
    // difference, which is what keeps "one of three" readable in greyscale and
    // to a colourblind player — "never colour alone".
    plateRarityPipEmpty: { backgroundColor: 'transparent', borderWidth: 1, borderColor: AXM.ash },
    // The named rarity tag — `large` faces only. Sits at the band's tail, after the
    // name's `flex: 1`, so it can never squeeze the name on a small face
    // (it is not rendered there at all).
    plateRarityLabel: {
        fontFamily: FONTS.sans, fontSize: 10, letterSpacing: 1.6,
        marginLeft: 6, flexShrink: 0,
    },
    // Explicit lineHeights: the name / keyword / value may WRAP (never clip)
    // on a small face, so their two-line height is a known quantity.
    plateName: { flex: 1, fontFamily: FONTS.gothic, fontSize: 13, lineHeight: 15, letterSpacing: 0.4, color: AXM.parchment, paddingVertical: 2 },
    plateNameLarge: { fontSize: 20, lineHeight: 24, letterSpacing: 0.8 },
    // ② The framed art plate — dark margins, hairline rule.
    plateArtWrap: { flex: 1, padding: 4, backgroundColor: AXM.panelBg },
    plateArtFrame: {
        flex: 1, borderWidth: StyleSheet.hairlineWidth, borderColor: AXM.ash,
        overflow: 'hidden', backgroundColor: AXM.deepBg,
    },
    plateInertWash: { ...StyleSheet.absoluteFillObject, backgroundColor: AXM.backdrop },
    // ③ The ledger — FREE cell | hairline rule | PAID cell, solid ground.
    plateLedger: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 6,
        backgroundColor: AXM.deepBg,
        borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: AXM.divider,
    },
    // Narrow face: FREE row over PAID row, each the full ledger width.
    plateLedgerStacked: { flexDirection: 'column', alignItems: 'stretch', paddingVertical: 4, gap: 3 },
    plateFreeCell: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    plateFreeGlyph: { textAlign: 'center' },
    plateFreeValue: { fontFamily: FONTS.mono, fontSize: 12, fontWeight: '700', color: AXM.parchment },
    plateFreeValueLarge: { fontSize: 17 },
    plateRule: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 6, backgroundColor: AXM.divider },
    plateRuleAcross: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: AXM.divider },
    platePaidCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
    paidTextWrap: { flex: 1 },
    // The keyword is the loudest word on the face — it is the whole read.
    paidKeyword: { fontFamily: FONTS.sans, fontSize: 12, lineHeight: 14, letterSpacing: 0.8 },
    paidKeywordLarge: { fontSize: 17, lineHeight: 20, letterSpacing: 1.2 },
    paidValue: { fontFamily: FONTS.mono, fontSize: 11, lineHeight: 15, color: AXM.parchment },
    paidValueLarge: { fontSize: 15, lineHeight: 20 },
}));

/** In-file alias read by every `const styles = useStyles()` call site. */
const useStyles = useCombatBoardStyles;

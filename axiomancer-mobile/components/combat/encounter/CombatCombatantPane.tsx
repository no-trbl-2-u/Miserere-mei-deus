/**
 * The battlefield overlay — a reference-style full-bleed composition (see
 * design/combat-screen-polish-2026-07.md):
 *   · layer 0 — the arena backdrop with a LARGE alpha-matted enemy painting
 *     (random per encounter — see assets/images/enemies) filling the upper
 *     band of the screen (the enemy IS the screen);
 *   · layer 1 — scrim gradients keep the HUD legible + shelf the hand;
 *   · layer 2 — floating chrome: enemy name, a full-width HP bar anchored by a
 *     central crest carrying the big HP number, the intent badge, glowing
 *     status tiles, and the player medallion with an HP arc ring in the bottom-left corner.
 *
 * Resolution FEEDBACK (driven off the engine's typed `CombatEvent` stream via
 * `fx`): the enemy scene lunges, the player medallion
 * recoils + flashes, floating "-N" numbers rise, DENIED flourishes, and the
 * board shakes behind a damage-scaled red vignette.
 *
 * The overlay mounts absolute-fill UNDER the board's interactive column; every
 * wrapper is pointerEvents box-none so only the chips/intent stay tappable.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from '@/lib/platform/image';
import { Haptics } from '@/lib/platform/haptics';
import Animated, {
    runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useGameState } from '@/state/GameStoreProvider';
import { PlayerPortraitImage } from '@/components/art/PlayerPortraitImage';
import { getEncounterEnemyArt } from '@/assets/images/enemies';
import { getEnemyFrameSet } from '@/assets/images/enemies/frames';
import {
    ENEMY_ATTACK_IMPACT_MS, EnemyFramePlayer, isEnemyAttackBeat, isEnemyStruckBeat,
    useEnemyClipSelection,
} from '@/components/combat/frames';
import { ARENA_PLATES_SHOWN, BLACK_ARENA_ALT, arenaAltTextFor, arenaBackdropFor } from '@/assets/images/combat';
import { FONTS, HUE } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import type {
    CombatEnemyPaneVM, CombatPlayerPaneVM, CombatEffectChipVM,
} from '@/state/presenters/combat-encounter.engine';
import {
    DOT_TICK_STAGGER_MS, HIT_FLOAT_COLOR, PROGRAM_COPY, dotTickFloat, effectChipA11y, selectCombatLogLines,
} from '@/state/presenters/combat-encounter.engine';
import { type CombatEvent } from '@mechanics';
import { effectGlyph } from '@/components/combat/statusGlyphs';
import { keywordForEffect } from '@/state/combat/keywords';
import { IntentIcon } from './IntentIcon';
import { VitaeSacrificeCallout } from './VitaeSacrificeCallout';
import { useJuiceFlash, useJuiceIdleBreath, useJuiceNumberPop, useJuicePulse, useJuiceShake } from '@/lib/juice';

/** Full-bleed battlefield backdrop — region-keyed, falling back to a neutral
 *  desolation plate for a region with no rule. Sits behind the enemy figure;
 *  the SVG `CreatureScene` draws `hideBackdrop` so its procedural moon/treeline
 *  doesn't overpaint the art. */

/** A bump of resolved engine events the pane animates. `seq` rises on each new
 *  resolution so the effect fires exactly once per APPLY / END PHASE. */
export interface CombatFx { seq: number; events: CombatEvent[]; }

/** One stop of the top-HUD scrim's vertical gradient. */
export interface CombatScrimStop { offset: number; color: string; opacity: number; }

/**
 * The top-HUD scrim's gradient stop table.
 *
 * Purpose: the tail runs all the way to the board's OWN ground colour at full
 * opacity, so the band's last row of pixels already IS the ground behind it:
 * the scrim fades out instead of ending in a visible seam across the arena.
 *
 * Inputs: `deepBg` — the HUD-legibility ink; `groundBg` — the colour the pane
 * sits on below the scene band (the board root's `AXM.bg`).
 * Output: the ordered stop table for the scrim's LinearGradient.
 */
export function combatTopScrimStops(deepBg: string, groundBg: string): readonly CombatScrimStop[] {
    return [
        { offset: 0, color: deepBg, opacity: 0.88 },
        { offset: 0.22, color: deepBg, opacity: 0.42 },
        { offset: 0.5, color: deepBg, opacity: 0.1 },
        { offset: 0.78, color: deepBg, opacity: 0.04 },
        // Past the figure's feet the scene dissolves INTO the board ground —
        // the band's bottom edge and what lies under it are the same paint.
        { offset: 0.9, color: groundBg, opacity: 0.38 },
        { offset: 1, color: groundBg, opacity: 1 },
    ];
}

/** Height of the floating top HUD (under the safe-area inset) — the board's
 *  content column leaves this much clearance before the play region. */
export const COMBAT_HUD_HEIGHT = 148;

/** The HUD's own top padding, under the safe-area inset. Named because the
 *  enemy figure anchors off it: the figure's live `top` is this pad plus the
 *  measured height of the HUD's full-width block. */
export const COMBAT_HUD_PAD_TOP = 8;

/** The player avatar's diameter in the board's footer dock. The rim is drawn
 *  in a 92-unit box scaled to this size. */
export const PLAYER_AVATAR_SIZE = 48;

/** `dy` stacks a float vertically off the layer's origin; `delayMs` holds it
 *  back so a batch of ticks reads one at a time. */
type Float = { id: number; text: string; color: string; dx: number; dy?: number; delayMs?: number };

/** One DoT tick per row: ticks in one beat stack this far apart. */
const TICK_ROW_PX = 28;
/** The first tick row's distance from the hit, so a tick never lands on it. */
const TICK_ROW_GAP_PX = 30;

// ── Enemy HP bar + crest ─────────────────────────────────────────────────────

/** Full-width HP bar anchored by a central shield crest carrying the big HP
 *  number (reference: emblem-anchored enemy bar). Keeps the animated ghost
 *  trail + progressbar semantics of the old HpBar. */
function EnemyHpBar({ pct, value, max }: { pct: number; value: number; max: number }) {
    const AXM = usePalette();
    const styles = useStyles();
    const w = useSharedValue(pct);
    const ghost = useSharedValue(pct);
    useEffect(() => {
        const clamped = Math.max(0, Math.min(1, pct));
        ghost.value = withDelay(140, withTiming(clamped, { duration: 340 }));
        w.value = withTiming(clamped, { duration: 230 });
    }, [pct, w, ghost]);
    const fillStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, w.value)) * 100}%` }));
    const ghostStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, ghost.value)) * 100}%` }));
    return (
        <View
            style={styles.hpBlock}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Enemy VITAE ${value} of ${max}`}
            accessibilityValue={{ min: 0, max, now: value }}
        >
            <View style={styles.hpTrack}>
                <Animated.View style={[styles.hpGhost, ghostStyle]} />
                <Animated.View style={[styles.hpFill, { backgroundColor: AXM.blood }, fillStyle]}>
                    <View style={styles.hpSheen} />
                </Animated.View>
            </View>
            {/* central crest — the ONE big enemy HP number lives here */}
            <View style={styles.crest} pointerEvents="none">
                <Svg width={62} height={70} viewBox="0 0 62 70">
                    <Path
                        d="M5 3 H57 V38 Q57 48 31 66 Q5 48 5 38 Z"
                        fill={AXM.panelBg}
                        stroke={AXM.sulfur}
                        strokeWidth={1.6}
                    />
                    <Path
                        d="M9 7 H53 V37 Q53 45 31 61 Q9 45 9 37 Z"
                        fill="none"
                        stroke="rgba(255,255,255,0.18)"
                        strokeWidth={1}
                    />
                </Svg>
                <View style={styles.crestInner}>
                    <Text style={styles.crestHp} allowFontScaling={false}>{value}</Text>
                    <Text style={styles.crestMax} allowFontScaling={false}>/{max}</Text>
                </View>
            </View>
        </View>
    );
}

/** A slim meter under the VITAE bar: a tally with a fill bar toward
 *  `target` (the DoT kill-path foresight). `target` 0 renders the tally with
 *  no fill bar. */
function HudMeter({ glyph, label, value, target, color, testID }: {
    glyph: string; label: string; value: number; target: number; color: string; testID: string;
}) {
    const styles = useStyles();
    const pct = target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
    return (
        <View
            style={styles.altMeter}
            testID={testID}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`${label} ${value}${target > 0 ? ` of ${target}` : ''}`}
            accessibilityValue={{ min: 0, max: target || Math.max(1, value), now: value }}
        >
            <Text style={styles.altMeterLabel} allowFontScaling={false} numberOfLines={1}>
                {glyph} {label} {value}{target > 0 ? `/${target}` : ''}
            </Text>
            {target > 0 ? (
                <View style={styles.altMeterTrack}>
                    <View style={[styles.altMeterFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
                </View>
            ) : null}
        </View>
    );
}

/** A single floating "-N" / "DENIED" / keyword that rises and fades, then
 *  self-removes. `dx` jitters it horizontally so simultaneous floats (−N + DoT
 *  tick + BLOCKED) don't pile onto one pixel. */
function FloatNum({ text, color, dx, dy = 0, delayMs = 0, onDone }: {
    text: string; color: string; dx: number; dy?: number; delayMs?: number; onDone: () => void;
}) {
    const styles = useStyles();
    // lib/juice number-pop primitive — the rise+fade math lives in the
    // module; this call site only supplies the horizontal jitter (a
    // static per-instance offset, so it rides the OUTER plain View — a style
    // array can't merge two `transform` arrays, so the animated translateY
    // stays on its own nested Animated.View).
    const popStyle = useJuiceNumberPop(onDone, delayMs);
    return (
        <View style={[styles.floatNum, { transform: [{ translateX: dx }, { translateY: dy }] }]} pointerEvents="none">
            <Animated.View style={popStyle}>
                <Text style={[styles.floatNumText, { color }]}>{text}</Text>
            </Animated.View>
        </View>
    );
}

// ── Status-effect tiles ──────────────────────────────────────────────────────

/** Glowing square status tiles with a count badge (reference: icon+number,
 *  no ×/turn text — duration lives in the tooltip + a11y label). */
export function EffectChips({ effects, onChip, align = 'flex-start', testID }: {
    effects: CombatEffectChipVM[];
    onChip?: (e: CombatEffectChipVM) => void;
    align?: 'flex-start' | 'flex-end' | 'center';
    testID?: string;
}) {
    const styles = useStyles();
    if (effects.length === 0) return null;
    return (
        <View style={[styles.chipRow, { justifyContent: align }]} pointerEvents="box-none" testID={testID}>
            {effects.map((e) => (
                <View key={e.effectId} style={e.caption ? styles.chipWithCaption : null} pointerEvents="box-none">
                <Pressable
                    onPress={() => onChip?.(e)}
                    style={[styles.chip, { borderColor: e.glyph.color }]}
                    testID={`combat-effect-${e.effectId}`}
                    accessibilityRole="button"
                    accessibilityLabel={effectChipA11y(e)}
                >
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: e.glyph.color, opacity: 0.16 }]} />
                    <Text style={[styles.chipGlyph, { color: e.glyph.color, textShadowColor: e.glyph.color }]}>{e.glyph.glyph}</Text>
                    {/* The badge NUMBER is stacks (intensity); the remaining
                        DURATION rides a distinct top-left tag so "🩸 3" is not
                        an ambiguous bare number. Hidden for no-calendar effects
                        (duration ≤ 0). Full breakdown lives in the chip inspect. */}
                    {e.duration > 0 ? (
                        <View style={styles.chipDur}>
                            <Text style={styles.chipDurText} allowFontScaling={false}>{e.duration}t</Text>
                        </View>
                    ) : null}
                    <View style={styles.chipBadge}>
                        <Text style={styles.chipBadgeText} allowFontScaling={false}>{`${e.intensity}${e.unit ?? ''}`}</Text>
                    </View>
                </Pressable>
                {e.caption ? (
                    <Text
                        style={[styles.chipCaption, { color: e.glyph.color }]}
                        testID="combat-self-burn"
                        numberOfLines={1}
                        allowFontScaling={false}
                    >
                        {e.caption}
                    </Text>
                ) : null}
                </View>
            ))}
        </View>
    );
}

// ── Player avatar (footer dock) ──────────────────────────────────────────────

/**
 * The player's small round portrait in the board's footer dock, under a sulfur
 * rim. The dock's VITAE bar carries the number; the avatar carries the
 * player-side resolution FX — recoil, hit-flash, hitstop squash, contact
 * slash, floats, haptic — off the same `fx` stream the pane reads for the
 * enemy side. Mounted by the BOARD inside its interactive column (the pane
 * itself is a transform stacking context BELOW it, so anything drawn there
 * would hide under the hand).
 */
export const PlayerMedallion = React.memo(function PlayerMedallion({
    player, enemyIntentDamage, onPress, fx, sacrificeCallout = null,
}: {
    player: CombatPlayerPaneVM;
    enemyIntentDamage: number;
    /** Tap the avatar → inspect the pilgrim (stats, effects, combat log). */
    onPress?: () => void;
    fx?: CombatFx;
    /** A refused line's unpaid SACRIFICE: the avatar flags it while set
     *  (`n` restarts the callout on a repeat refusal). */
    sacrificeCallout?: { cost: number; vitae: number; n: number } | null;
}) {
    const AXM = usePalette();
    const styles = useStyles();
    const dying = useGameState((st) => st.dying === true);
    const [floats, setFloats] = useState<Float[]>([]);
    const idRef = useRef(0);
    const lastSeq = useRef(0);
    const shift = useSharedValue(0);
    const flash = useSharedValue(0);
    const squash = useSharedValue(1);
    const contact = useSharedValue(0);
    const impact = useSharedValue(0);
    // Status-proc pulse (a status landing should FEEL like the main event):
    // a distinct emphasis from the damage hit-reaction
    // bundle above, so a status-only turn (no damage) is never a bare float.
    const [statusPulseKey, setStatusPulseKey] = useState(0);
    const statusPulseStyle = useJuicePulse(statusPulseKey, 1);
    const reduceMotion = useRef(false);
    useEffect(() => {
        let alive = true;
        AccessibilityInfo.isReduceMotionEnabled().then((on) => { if (alive) reduceMotion.current = on; }).catch(() => undefined);
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => { reduceMotion.current = on; });
        return () => { alive = false; sub?.remove?.(); };
    }, []);
    const push = useCallback((text: string, color: string, dx = 0, dy = 0, delayMs = 0) => {
        const id = (idRef.current += 1);
        setFloats((p) => [...p, { id, text, color, dx, dy, delayMs }]);
    }, []);
    const drop = useCallback((id: number) => setFloats((p) => p.filter((f) => f.id !== id)), []);
    const landHit = useCallback((dmg: number, blocked: number, fired: boolean) => {
        if (dmg > 0) push(`-${dmg}`, HIT_FLOAT_COLOR, 0);
        if (fired && blocked > 0) push(`BLOCKED ${blocked}`, HUE.guardSteel, 40);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
    }, [push]);

    useEffect(() => {
        if (!fx || fx.seq === 0 || fx.seq === lastSeq.current) return;
        lastSeq.current = fx.seq;
        let dmg = 0;
        let threatFired = false;
        const ticks: { effectId: string; label: string; amount: number }[] = [];
        const statuses: { text: string; color: string }[] = [];
        // SACRIFICE costs and heals float on the medallion too, so a card's
        // VITAE change reads where the bar is.
        let paid = 0;
        let healed = 0;
        for (const e of fx.events) {
            if (e.kind === 'vitae-sacrificed') paid += e.amount;
            else if (e.kind === 'player-healed') healed += e.amount;
            else if (e.kind === 'damage-dealt' && e.target === 'self') dmg += e.amount;
            else if (e.kind === 'dot-tick' && e.target === 'self') ticks.push(e);
            else if (e.kind === 'threat-fired') threatFired = true;
            else if (e.kind === 'effect-landed' && e.target === 'self') {
                const kw = (keywordForEffect(e.effectId) ?? e.effectKind ?? 'effect').toUpperCase();
                const color = e.effect ? effectGlyph(e.effect as Parameters<typeof effectGlyph>[0]).color : HUE.tickPurple;
                statuses.push({ text: kw, color });
            }
        }
        // The impact beat every side of a resolution lands on. One constant,
        // so the recoil, the board shake, the flash and the enemy's swing
        // cannot be retuned apart from each other by halves.
        const IMPACT = ENEMY_ATTACK_IMPACT_MS;
        if (dmg > 0) {
            const norm = Math.min(1, dmg / Math.max(1, player.maxHp));
            const blocked = enemyIntentDamage - dmg;
            if (!reduceMotion.current) {
                const recoil = 4 + norm * 8;
                const fl = 0.35 + norm * 0.4;
                const sq = 0.94 - norm * 0.08;
                shift.value = withDelay(IMPACT, withSequence(withTiming(-recoil, { duration: 70 }), withTiming(recoil * 0.6, { duration: 70 }), withTiming(0, { duration: 90 })));
                flash.value = withDelay(IMPACT, withSequence(withTiming(fl, { duration: 90 }), withTiming(0, { duration: 260 })));
                squash.value = withDelay(IMPACT, withSequence(withTiming(sq, { duration: 50 }), withTiming(1, { duration: 130 })));
                contact.value = withDelay(IMPACT, withSequence(withTiming(1, { duration: 40 }), withTiming(0, { duration: 200 })));
            }
            impact.value = 0;
            impact.value = withDelay(IMPACT, withTiming(1, { duration: 1 }, (fin) => { if (fin) runOnJS(landHit)(dmg, blocked, threatFired); }));
        }
        // Each tick is its own labelled float in its element's colour, stacked
        // upward off the medallion (the hand is above, the screen edge left)
        // and staggered so none reads as one smeared number.
        ticks.forEach((t, k) => {
            const f = dotTickFloat(t);
            push(f.text, f.color, 40, -(TICK_ROW_GAP_PX + k * TICK_ROW_PX), k * DOT_TICK_STAGGER_MS);
        });
        if (paid > 0) push(`-${paid}`, HUE.damageRed, -36);
        if (healed > 0) push(`+${healed}`, HUE.boonGreen, 36);
        const hadFloat = dmg > 0 || ticks.length > 0;
        statuses.forEach((s, k) => { if (!hadFloat) push(s.text, s.color, (k % 2 === 0 ? 1 : -1) * 30); });
        if (statuses.length > 0) setStatusPulseKey((k) => k + 1);
    }, [fx, player.maxHp, enemyIntentDamage, shift, flash, squash, contact, impact, landHit, push]);

    const anim = useAnimatedStyle(() => ({ transform: [{ translateX: shift.value }, { scale: squash.value }] }));
    const flashAnim = useAnimatedStyle(() => ({ opacity: flash.value }));
    const contactStyle = useAnimatedStyle(() => ({ opacity: contact.value }));

    return (
        <View style={styles.playerDock} pointerEvents="box-none">
            {/* status-proc pulse nests OUTSIDE the hit-reaction `anim` transform —
                a style array can't merge two `transform` arrays, so each juice
                primitive gets its own Animated.View and they compose via nesting. */}
            <Animated.View style={statusPulseStyle}>
            <Animated.View style={anim}>
                <Pressable
                    onPress={onPress}
                    style={styles.medallion}
                    testID="combat-player-medallion"
                    accessibilityRole="button"
                    accessibilityLabel={sacrificeCallout
                        ? PROGRAM_COPY.floorA11y(sacrificeCallout.vitae, player.maxHp, sacrificeCallout.cost)
                        : `${player.name}${dying ? ', dying' : ''}, VITAE ${player.hp} of ${player.maxHp}. Inspect your pilgrim — stats, status effects and cards.`}
                    // Slop only toward the screen edge and the bottom, never up
                    // into the hand above the dock.
                    hitSlop={{ left: 6, bottom: 6 }}
                >
                    <View style={styles.medallionClip}>
                        <PlayerPortraitImage width={44} height={52} fit="cover" skullWhenDying />
                        <Animated.View style={[styles.medallionFlash, flashAnim]} pointerEvents="none" />
                    </View>
                    <Svg width={PLAYER_AVATAR_SIZE} height={PLAYER_AVATAR_SIZE} viewBox="0 0 92 92" style={StyleSheet.absoluteFill} pointerEvents="none">
                        <Circle cx={46} cy={46} r={44.5} stroke={AXM.sulfur} strokeWidth={3.6} fill="none" opacity={0.9} />
                    </Svg>
                    {sacrificeCallout ? (
                        <VitaeSacrificeCallout
                            key={sacrificeCallout.n}
                            cost={sacrificeCallout.cost}
                            vitae={sacrificeCallout.vitae}
                            max={player.maxHp}
                            size={PLAYER_AVATAR_SIZE}
                        />
                    ) : null}
                    {/* one-frame contact slash at the moment of impact */}
                    <Animated.View style={[styles.contactSlash, contactStyle]} pointerEvents="none">
                        <Text style={styles.contactSlashText}>✦</Text>
                    </Animated.View>
                </Pressable>
            </Animated.View>
            </Animated.View>
            <View style={styles.playerFloatLayer} pointerEvents="none">
                {floats.map((f) => (
                    <FloatNum key={f.id} text={f.text} color={f.color} dx={f.dx} dy={f.dy} delayMs={f.delayMs} onDone={() => drop(f.id)} />
                ))}
            </View>
        </View>
    );
});

// ── The overlay ──────────────────────────────────────────────────────────────

export const CombatCombatantPane = React.memo(function CombatCombatantPane({
    enemy, player, onChip, fx, topInset = 0, metaLine, onHudLayout, region,
}: {
    enemy: CombatEnemyPaneVM;
    player: CombatPlayerPaneVM;
    onChip?: (e: CombatEffectChipVM) => void;
    fx?: CombatFx;
    /** Safe-area insets, passed by the board (the overlay is absolute-fill). */
    topInset?: number;
    /** Micro phase/round/turn meta rendered beside the enemy name (a11y keeps the words). */
    metaLine?: string;
    /** The live map region (`vm.region`, e.g. "the Drowned Parish"), keying the
     *  arena backdrop plate. Omitted by the dev-only sandbox route, which gets
     *  the fallback plate — same as every region with no rule of its own. */
    region?: string;
    /** Reports the HUD's real rendered height (top of screen to its bottom
     *  edge, `topInset` already included via the HUD's own padding) on every
     *  layout pass. The alt-win meters make this
     *  height variable; siblings anchored off the static `COMBAT_HUD_HEIGHT`
     *  estimate (the LOG toggle) should prefer this
     *  measured value once it lands. */
    onHudLayout?: (height: number) => void;
}) {
    const AXM = usePalette();
    const styles = useStyles();

    const [enemyFloats, setEnemyFloats] = useState<Float[]>([]);
    // Measured height of the HUD's full-width block (name row + VITAE bar +
    // alt-win meters). The enemy figure's wrap anchors under it; 0 until the
    // first layout pass, when `enemyFigureWrap`'s static top is the fallback.
    const [hudBlockH, setHudBlockH] = useState(0);
    const idRef = useRef(0);
    const lastSeq = useRef(0);

    // Enemy feedback shared values (anticipation + lunge). The player-side beats
    // (recoil/flash/squash/slash/haptic) live in `PlayerMedallion`.
    const enemyShift = useSharedValue(0);
    const enemyScale = useSharedValue(1);
    // The enemy's own beat counts, for the frame engine. They rise in the SAME
    // walk of `fx.events` the lunge reads, so the swing and the lunge can never
    // disagree about whether the enemy acted. They drive nothing above: the
    // frame clip is state of its own and the shared values are untouched.
    // Two counters, not one: a resolution can be both the enemy's swing and the
    // player's blow landing, and the frame engine needs to see both to decide.
    const [attackBeat, setAttackBeat] = useState(0);
    const [struckBeat, setStruckBeat] = useState(0);
    // Board-level feedback: a damage-scaled screen shake + a red vignette
    // flash — lib/juice primitives, synced to the IMPACT beat
    // below via each hook's own `delayMs` so they still land with the enemy
    // lunge apex instead of firing on the trigger frame.
    const [damageTick, setDamageTick] = useState({ key: 0, norm: 0 });
    const shakeStyle = useJuiceShake(damageTick.key, damageTick.norm > 0.66 ? 'high' : damageTick.norm > 0.33 ? 'medium' : 'low', ENEMY_ATTACK_IMPACT_MS);
    const flashStyle = useJuiceFlash(damageTick.key, damageTick.norm, ENEMY_ATTACK_IMPACT_MS);
    // Reduce-motion gate (recommended) — suppresses the shake + lunge
    // (the HP tween + floats still fire so the hit is never silent).
    const reduceMotion = useRef(false);
    useEffect(() => {
        let alive = true;
        AccessibilityInfo.isReduceMotionEnabled().then((on) => { if (alive) reduceMotion.current = on; }).catch(() => undefined);
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => { reduceMotion.current = on; });
        return () => { alive = false; sub?.remove?.(); };
    }, []);

    const pushEnemy = useCallback((text: string, color: string, dx = 0, dy = 0, delayMs = 0) => {
        const id = (idRef.current += 1);
        setEnemyFloats((p) => [...p, { id, text, color, dx, dy, delayMs }]);
    }, []);
    const dropEnemy = useCallback((id: number) => setEnemyFloats((p) => p.filter((f) => f.id !== id)), []);

    useEffect(() => {
        if (!fx || fx.seq === 0 || fx.seq === lastSeq.current) return;
        lastSeq.current = fx.seq;
        let playerDmg = 0;
        let enemyDmg = 0;
        let spikeDmg = 0;
        let denied = false;
        let threatFired = false;
        const ticks: { side: 'enemy' | 'player'; effectId: string; label: string; amount: number }[] = [];
        // (d) status applications the engine already emits — zero-damage
        // control/buff/debuff intents that must never be silent.
        const statusFloats: { side: 'enemy' | 'player'; text: string; color: string }[] = [];
        for (const e of fx.events) {
            if (e.kind === 'damage-dealt') {
                if (e.target === 'self') playerDmg += e.amount; else enemyDmg += e.amount;
            } else if (e.kind === 'spike-struck') {
                // THORNS and REFLECT float their own number (the log line's
                // float); they still make the foe flinch.
                spikeDmg += e.amount;
            } else if (e.kind === 'dot-tick') {
                ticks.push({ side: e.target === 'self' ? 'player' : 'enemy', effectId: e.effectId, label: e.label, amount: e.amount });
            } else if (e.kind === 'phase-resolved' && e.mark === 'clear') {
                denied = true;
            } else if (e.kind === 'threat-fired') {
                threatFired = true;
            } else if (e.kind === 'effect-landed') {
                const side = e.target === 'self' ? 'player' : 'enemy';
                const kw = (keywordForEffect(e.effectId) ?? e.effectKind ?? 'effect').toUpperCase();
                const color = e.effect ? effectGlyph(e.effect as Parameters<typeof effectGlyph>[0]).color : (side === 'player' ? HUE.tickPurple : HUE.goldAccent);
                statusFloats.push({ side, text: kw, color });
            }
        }
        // THE ENEMY'S BEATS (phases AN1b, AN1c). Off the walk just finished —
        // a fired threat or damage the player took for the swing, damage the
        // enemy took for the flinch — so the frame engine and the lunge read
        // one stream once. The counters are all that happens here: when and
        // whether a clip plays is `useEnemyClipSelection`'s call, and an enemy
        // with no frame set spends this on nothing.
        if (isEnemyAttackBeat({
            playerDamage: playerDmg, threatFired, intentDamage: enemy.intent.damage,
        })) {
            setAttackBeat((n) => n + 1);
        }
        const enemyDotDmg = ticks.reduce((sum, t) => (t.side === 'enemy' ? sum + t.amount : sum), 0);
        if (isEnemyStruckBeat({ enemyDamage: enemyDmg + spikeDmg, enemyDotDamage: enemyDotDmg })) {
            setStruckBeat((n) => n + 1);
        }
        // The ledgers and the enemy's STAGE beat each float the word that moved
        // the numbers. The wording lives ONCE, in the presenter's `selectCombatLogLines`, so
        // this float and the log line can never drift apart.
        selectCombatLogLines(fx.events).forEach((line, k) => {
            if (line.float) pushEnemy(line.float, line.color, (k % 2 === 0 ? 1 : -1) * 24);
        });
        // (a) the player took damage → enemy ANTICIPATION (pull back) → scale-led
        //     lunge; a damage-scaled board shake + red vignette at the impact apex
        //     (100ms — the shared delay baked into the shake/flash hook calls
        //     below). The medallion-side beats (recoil/flash/squash/slash/
        //     float/haptic) fire in `PlayerMedallion` off the same event stream.
        if (playerDmg > 0) {
            // Normalise the hit to its share of max HP so a 4-dmg chip and a 40-dmg
            // crusher do not feel identical — every beat scales off `norm`.
            const norm = Math.min(1, playerDmg / Math.max(1, player.maxHp));
            if (!reduceMotion.current) {
                const lunge = 8 + norm * 10;        // 8–18px enemy lunge apex
                enemyScale.value = withSequence(withTiming(0.97, { duration: 90 }), withTiming(1 + norm * 0.08, { duration: 120 }), withTiming(1, { duration: 200 }));
                enemyShift.value = withSequence(withTiming(-6, { duration: 90 }), withTiming(lunge, { duration: 120 }), withTiming(0, { duration: 220 }));
            }
            // The screen shake + impact flash are lib/juice primitives — they
            // gate their own reduced-motion internally, so this call is
            // unconditional (the hook no-ops when appropriate).
            setDamageTick((prev) => ({ key: prev.key + 1, norm }));
        } else if (denied || (threatFired && enemy.intent.damage > 0)) {
            // (b) the turn resolved with no damage to the player at all → DENIED
            //     flourish over the enemy (teaches "variety / guard denies the turn").
            pushEnemy('DENIED', HUE.goldAccent, 0);
        }
        // (d-symmetric) the player's APPLY landed on the enemy → flinch + float.
        if (enemyDmg > 0) {
            enemyShift.value = withSequence(withTiming(-6, { duration: 70 }), withTiming(0, { duration: 160 }));
            pushEnemy(`-${enemyDmg}`, HIT_FLOAT_COLOR, 0);
        }
        // (c) enemy-side DoT ticks: one labelled float per tick in its element's
        //     colour, stacked in rows under the hit and staggered in time.
        const enemyTicks = ticks.filter((t) => t.side === 'enemy');
        enemyTicks.forEach((t, k) => {
            const f = dotTickFloat(t);
            pushEnemy(f.text, f.color, 0, TICK_ROW_GAP_PX + k * TICK_ROW_PX, k * DOT_TICK_STAGGER_MS);
        });
        // (d) never-silent status: float the applied KEYWORD when the enemy had no
        //     other float (a -N / tick already says "something happened" there).
        const enemyHadFloat = enemyDmg > 0 || enemyTicks.length > 0;
        statusFloats.forEach((s, k) => {
            if (s.side === 'enemy' && !enemyHadFloat) pushEnemy(s.text, s.color, (k % 2 === 0 ? 1 : -1) * 30);
        });
    }, [fx, enemy.intent.damage, player.maxHp, enemyScale, enemyShift, pushEnemy]);

    const enemyAnim = useAnimatedStyle(() => ({ transform: [{ translateX: enemyShift.value }, { scale: enemyScale.value }] }));

    // The between-turns idle: a boss breathes deep and slow, a lesser foe
    // shallow and quick.
    const idleStyle = useJuiceIdleBreath(enemy.isBoss ? 1 : 0.3);

    // Random painting per encounter (artNonce = encounter seed), stable for the
    // fight's duration — see assets/images/enemies.
    const enemyArt = getEncounterEnemyArt(enemy.artKey, enemy.artNonce);

    // Frames, when this enemy has them. The registry ships empty, so today
    // every enemy takes the `null` path and renders the painting above exactly
    // as it always has; AN1e installs the first set. Reduced motion is the
    // pane's OWN ref, handed straight down — the frame engine never asks
    // `AccessibilityInfo` a second time, because two answers to one question
    // drift and one of them is wrong.
    const enemyFrameSet = getEnemyFrameSet(enemy.artKey);
    // One label for the figure, whichever way it is drawn: a screen reader
    // must not be able to tell that an enemy animates.
    const enemyFigureLabel = `${enemy.name} bars the way`;
    const enemyClip = useEnemyClipSelection({
        frameSet: enemyFrameSet,
        attackBeat,
        struckBeat,
        reducedMotion: reduceMotion,
    });

    // Region-keyed arena backdrop — falls back to the neutral
    // desolation plate for a region with no rule of its own. The Northern
    // Forest is the one live region still on that path: it has no plate yet.
    // See `assets/images/combat/index.ts` and the AWAITING_PLATE list in its
    // test, which pins that count in both directions.
    // While `ARENA_PLATES_SHOWN` is off, every fight gets
    // a plain black scene instead (the palette's darkest ink, `deepBg`).
    const arenaBg = arenaBackdropFor(region);
    // Live anchor: 14pt tucked under the HUD's measured full-width block. The
    // static top in the stylesheet is only the pre-layout fallback. The figure
    // and its float layer share it.
    const figureTop = hudBlockH > 0 ? { top: topInset + COMBAT_HUD_PAD_TOP + hudBlockH - 14 } : null;
    const arenaAlt = arenaAltTextFor(region);

    return (
        <Animated.View style={[StyleSheet.absoluteFillObject, shakeStyle]} pointerEvents="box-none" testID="combat-combatant-pane">
            {/* ── layer 0: the battlefield scene, enemy figure LARGE ── */}
            <View style={styles.sceneBand} pointerEvents="none">
                {/* raster arena backdrop — full-bleed behind the foe (or plain black) */}
                {ARENA_PLATES_SHOWN ? (
                    <Image
                        source={arenaBg}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        contentPosition="bottom center"
                        accessibilityLabel={arenaAlt}
                        testID="combat-arena-backdrop"
                    />
                ) : (
                    <View
                        style={[StyleSheet.absoluteFill, { backgroundColor: AXM.deepBg }]}
                        accessibilityLabel={BLACK_ARENA_ALT}
                        testID="combat-arena-backdrop"
                    />
                )}
                <Animated.View style={[StyleSheet.absoluteFillObject, enemyAnim]}>
                    <View
                        style={[
                            styles.enemyFigureWrap,
                            figureTop,
                        ]}
                        testID="combat-enemy-figure-wrap"
                    >
                        {/* FIGURE PLATE. The roster art is
                            alpha-matted by keying BLACK out of a painting, so every dark
                            interior stroke of a creature is partly transparent and the
                            engraved arena backdrop would read straight through its body.
                            A soft dark radial plate
                            sits between the backdrop and the figure: where the art is
                            opaque nothing changes; where its shading was keyed away, the
                            hole shows the plate's ink instead of the engraving. Same
                            layer as the ground shadow (outside the breath wrapper) so the
                            plate is the scene's, not the creature's. */}
                        <Svg style={StyleSheet.absoluteFill} pointerEvents="none" testID="combat-enemy-figure-plate">
                            <Defs>
                                <RadialGradient id="axmEnemyFigurePlate" cx="50%" cy="58%" rx="50%" ry="50%">
                                    <Stop offset="0" stopColor={AXM.bg} stopOpacity={0.92} />
                                    <Stop offset="0.55" stopColor={AXM.bg} stopOpacity={0.7} />
                                    <Stop offset="1" stopColor={AXM.bg} stopOpacity={0} />
                                </RadialGradient>
                            </Defs>
                            <Ellipse cx="50%" cy="58%" rx="42%" ry="46%" fill="url(#axmEnemyFigurePlate)" />
                        </Svg>
                        {/* grounding shadow so the alpha-matted figure sits ON the floor.
                            It stays OUTSIDE the idle wrapper: the shadow is the floor's,
                            not the creature's, so the figure breathes over a planted
                            shadow instead of dragging it up and down. */}
                        <Svg width={240} height={40} style={styles.enemyShadow}>
                            <Defs>
                                <RadialGradient id="axmEnemyGroundShadow" cx="50%" cy="50%" rx="50%" ry="50%">
                                    <Stop offset="0" stopColor={HUE.black} stopOpacity={0.55} />
                                    <Stop offset="1" stopColor={HUE.black} stopOpacity={0} />
                                </RadialGradient>
                            </Defs>
                            <Ellipse cx={120} cy={20} rx={112} ry={17} fill="url(#axmEnemyGroundShadow)" />
                        </Svg>
                        {/* The foe is ALIVE between turns — a slow breath swell + float
                            (lib/juice `useJuiceIdleBreath`, reduced-motion gated). Its own
                            wrapper because RN cannot merge two `transform` arrays from a
                            style list, and the lunge above owns the outer one. */}
                        <Animated.View style={[styles.enemyIdleWrap, idleStyle]} testID="combat-enemy-figure">
                            {enemyFrameSet ? (
                                <EnemyFramePlayer
                                    artKey={enemy.artKey}
                                    frameSet={enemyFrameSet}
                                    clipName={enemyClip.clipName}
                                    startKey={enemyClip.startKey}
                                    reducedMotion={reduceMotion}
                                    style={[styles.enemyFigureImg, enemy.isBoss && styles.enemyFigureImgBoss]}
                                    accessibilityLabel={enemyFigureLabel}
                                    testID="combat-enemy-frames"
                                />
                            ) : (
                                <Image
                                    source={enemyArt}
                                    style={[styles.enemyFigureImg, enemy.isBoss && styles.enemyFigureImgBoss]}
                                    contentFit="contain"
                                    contentPosition="bottom center"
                                    transition={0}
                                    accessibilityLabel={enemyFigureLabel}
                                />
                            )}
                        </Animated.View>
                    </View>
                </Animated.View>
                {/* top scrim — HUD legibility over the scene */}
                <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                    <Defs>
                        <LinearGradient id="axmCombatTopScrim" x1="0" y1="0" x2="0" y2="1">
                            {/* The tail meets the board ground, so the
                                scene band has no visible bottom edge. */}
                            {combatTopScrimStops(AXM.deepBg, AXM.bg).map((st) => (
                                <Stop key={st.offset} offset={st.offset} stopColor={st.color} stopOpacity={st.opacity} />
                            ))}
                        </LinearGradient>
                    </Defs>
                    <Rect x="0" y="0" width="100%" height="100%" fill="url(#axmCombatTopScrim)" />
                </Svg>
            </View>
            {/* arena-floor glow — a faint blood radial that fills the lower half so the
                void between battlefield and hand reads as ground, not dead pixels */}
            <Svg style={styles.floorGlow} pointerEvents="none">
                <Defs>
                    <RadialGradient id="axmFloorGlow" cx="50%" cy="30%" rx="75%" ry="60%">
                        <Stop offset="0" stopColor={AXM.blood} stopOpacity={0.13} />
                        <Stop offset="0.7" stopColor={AXM.blood} stopOpacity={0.04} />
                        <Stop offset="1" stopColor={AXM.blood} stopOpacity={0} />
                    </RadialGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#axmFloorGlow)" />
            </Svg>
            {/* bottom scrim — shelves the dice + hand over the arena floor */}
            <Svg style={styles.bottomScrim} pointerEvents="none">
                <Defs>
                    <LinearGradient id="axmCombatDockScrim" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={AXM.bg} stopOpacity={0} />
                        <Stop offset="0.45" stopColor={AXM.bg} stopOpacity={0.9} />
                        <Stop offset="1" stopColor={AXM.bg} stopOpacity={1} />
                    </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#axmCombatDockScrim)" />
            </Svg>
            {/* damage-scaled red vignette flash (pointer-transparent; gated by reduce-motion) */}
            <Animated.View pointerEvents="none" style={[styles.vignette, flashStyle]} />

            {/* ── layer 2: top HUD ── */}
            <View
                style={[styles.hud, { paddingTop: topInset + COMBAT_HUD_PAD_TOP }]}
                pointerEvents="box-none"
                onLayout={(e) => onHudLayout?.(e.nativeEvent.layout.height)}
                testID="combat-hud"
            >
                {/* The HUD's FULL-WIDTH block — name row, VITAE bar, alt-win
                    meters. Measured on its own because the enemy figure anchors
                    under it: these are the rows that lie edge to edge across the
                    painting, while `hudUnderBar` below is a narrow top-left chip
                    column (the foe's intent and status) that the top scrim already
                    carries. Anchoring the figure to the WHOLE HUD instead would
                    drag its top down past that column and collapse the foe to a
                    thumbnail. `onHudLayout` above still reports the whole HUD —
                    the board's dock spacer and the LOG toggle
                    must keep clearing the chips too. */}
                <View
                    pointerEvents="box-none"
                    onLayout={(e) => setHudBlockH(e.nativeEvent.layout.height)}
                    testID="combat-hud-block"
                >
                    <View style={styles.hudNameRow} pointerEvents="box-none">
                        <Text style={styles.enemyName} numberOfLines={1}>{enemy.name}</Text>
                        {metaLine ? <Text style={styles.hudMeta}>{metaLine}</Text> : null}
                    </View>
                    <EnemyHpBar pct={enemy.hpPct} value={enemy.hp} max={enemy.maxHp} />
                    {/* The status kill-path foresight. Makes the DoT win path
                        foreseeable instead of invisible accumulation: a plain
                        pending tally once stacks land, a "LETHAL IN N" call once
                        they alone clear remaining HP. The tally prints the REAL
                        pending figure; the fill bar clamps on its own. */}
                    {enemy.pendingDot > 0 ? (
                        <HudMeter
                            glyph="☠"
                            label={enemy.isLethalInFlight
                                ? `LETHAL IN ${enemy.roundsToKill}`
                                : 'DOT PENDING'}
                            value={enemy.pendingDot}
                            target={enemy.hp}
                            color={AXM.blood}
                            testID="combat-lethality-meter"
                        />
                    ) : null}
                </View>
                {/* The foe's intent and status chips read top-left, under its
                    name; the chips wrap left to right. The conviction and
                    signature column starts under this block. */}
                <View style={styles.hudUnderBar} pointerEvents="box-none" testID="combat-hud-under-bar">
                    <View style={styles.hudIntent} pointerEvents="box-none" testID="combat-hud-intent">
                        <IntentIcon intent={enemy.intent} />
                        <EffectChips effects={enemy.effects} onChip={onChip} align="flex-start" testID="combat-enemy-effects" />
                    </View>
                </View>
            </View>
            {/* The enemy's floats rise from the foe's body: a twin of the scene
                band and the figure wrap (same geometry, same live top), drawn
                above the HUD and the scrims, with its origin over the upper
                third of the drawn figure for either figure size. */}
            <View style={styles.floatBand} pointerEvents="none" testID="combat-enemy-float-band">
                <View style={[styles.enemyFigureWrap, figureTop]} pointerEvents="none" testID="combat-enemy-float-anchor">
                    <View style={styles.enemyFloatLayer} pointerEvents="none" testID="combat-enemy-float-layer">
                        {enemyFloats.map((f) => (
                            <FloatNum key={f.id} text={f.text} color={f.color} dx={f.dx} dy={f.dy} delayMs={f.delayMs} onDone={() => dropEnemy(f.id)} />
                        ))}
                    </View>
                </View>
            </View>
        </Animated.View>
    );
});

const useStyles = makeStyles((AXM) => ({
    // Battlefield band — the scene fills the top ~62% and fades into the floor.
    sceneBand: { position: 'absolute', top: 0, left: 0, right: 0, height: '62%', backgroundColor: AXM.bg },
    // Enemy painting — anchored to the band's lower half, clear of the HUD; the
    // grounding shadow hugs its feet. This `top` is the PRE-LAYOUT FALLBACK
    // only: once the HUD's full-width block reports its height the wrap
    // overrides it with the measured anchor (see `combat-hud-block`), so a
    // taller stack of meters pushes the figure down instead of being painted
    // across its head.
    enemyFigureWrap: { position: 'absolute', left: 0, right: 0, top: COMBAT_HUD_HEIGHT - 14, bottom: '9%', alignItems: 'center', justifyContent: 'flex-end' },
    enemyShadow: { position: 'absolute', bottom: -12 },
    // The idle-breath wrapper fills its parent so the figure's percentage
    // sizing still resolves against the scene band; `transformOrigin` bottom
    // pins the swell to the creature's feet (a centre swell lifts it off the
    // floor and unglues it from its shadow).
    enemyIdleWrap: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'flex-end', transformOrigin: 'center bottom' },
    enemyFigureImg: { width: '78%', height: '96%', maxWidth: 380 },
    enemyFigureImgBoss: { width: '92%', maxWidth: 460 },
    floorGlow: { position: 'absolute', left: 0, right: 0, top: '46%', bottom: 0 },
    bottomScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 250 },
    vignette: { ...StyleSheet.absoluteFillObject, backgroundColor: HUE.woundVignette, zIndex: 30 },

    // ── top HUD ──
    hud: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12 },
    // Wraps so a long name and the full clock line both stay whole on a
    // phone; the clock keeps to the right edge on either line.
    hudNameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8 },
    enemyName: {
        flexGrow: 1, flexShrink: 1, fontFamily: FONTS.gothic, fontSize: 18, color: AXM.sulfur, letterSpacing: 0.6,
        textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 },
    },
    hudMeta: { marginLeft: 'auto', fontFamily: FONTS.sans, fontSize: 11, color: AXM.bone, letterSpacing: 0.8 },

    // Emblem-anchored HP bar.
    hpBlock: { marginTop: 4, height: 58, justifyContent: 'flex-start' },
    hpTrack: {
        marginTop: 10, height: 12, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.6)',
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.9)', overflow: 'hidden',
    },
    hpFill: { height: '100%', position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
    hpSheen: { position: 'absolute', left: 0, right: 0, top: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.28)' },
    hpGhost: { height: '100%', position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.22)' },
    crest: { position: 'absolute', top: -14, left: '50%', marginLeft: -31, width: 62, height: 70, alignItems: 'center' },
    crestInner: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingBottom: 10 },
    crestHp: {
        fontFamily: FONTS.gothic, fontSize: 26, lineHeight: 28, color: AXM.parchment,
        textShadowColor: HUE.black, textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 },
    },
    crestMax: { fontFamily: FONTS.mono, fontSize: 9, lineHeight: 10, color: AXM.bone, marginTop: -1 },

    // Slim meters under the VITAE bar (the DoT kill-path foresight).
    altMeter: { marginTop: 4 },
    altMeterLabel: {
        fontFamily: FONTS.sans, fontSize: 10, letterSpacing: 1, color: AXM.bone,
        textShadowColor: HUE.black, textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 },
    },
    // The payoff word rides quieter than the tally it follows.
    altMeterTrack: {
        marginTop: 2, height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.6)',
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.9)', overflow: 'hidden',
    },
    altMeterFill: { height: '100%', position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
    hudUnderBar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-start', marginTop: 2 },
    hudIntent: { alignItems: 'flex-start', gap: 6, flexShrink: 1 },

    // Status tiles.
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    chip: {
        width: 34, height: 34, borderRadius: 5, borderWidth: 2, backgroundColor: AXM.deepBg,
        alignItems: 'center', justifyContent: 'center', overflow: 'visible',
    },
    chipGlyph: { fontSize: 17, lineHeight: 20, textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } },
    chipBadge: {
        position: 'absolute', right: -5, bottom: -5, minWidth: 15, height: 15, borderRadius: 8,
        paddingHorizontal: 2, backgroundColor: 'rgba(0,0,0,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
        alignItems: 'center', justifyContent: 'center',
    },
    // A captioned chip sits beside its caption, the pair one item of the row.
    chipWithCaption: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    chipCaption: { fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 0.4 },
    chipBadgeText: { fontFamily: FONTS.sans, fontSize: 9, lineHeight: 11, color: HUE.white },
    // Remaining-duration tag (top-left), distinct from the stacks badge.
    chipDur: {
        position: 'absolute', left: -4, top: -6, minWidth: 14, height: 13, borderRadius: 7,
        paddingHorizontal: 2, backgroundColor: 'rgba(0,0,0,0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
        alignItems: 'center', justifyContent: 'center',
    },
    chipDurText: { fontFamily: FONTS.mono, fontSize: 8, lineHeight: 10, color: 'rgba(255,255,255,0.82)' },

    // Floats.
    // The float band mirrors `sceneBand`'s geometry (no paint) so the anchor
    // inside it lands exactly on `enemyFigureWrap`.
    floatBand: { position: 'absolute', top: 0, left: 0, right: 0, height: '62%', zIndex: 20 },
    // The figure fills ~96% of the wrap from its feet up (both sizes share the
    // height), so 22% down the wrap is the upper third of the drawn foe.
    enemyFloatLayer: { position: 'absolute', top: '22%', left: 0, right: 0, alignItems: 'center', zIndex: 20 },
    playerFloatLayer: { position: 'absolute', top: -26, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
    floatNum: { position: 'absolute', top: 0, alignItems: 'center' },
    floatNumText: {
        fontFamily: FONTS.gothic, fontSize: 24, letterSpacing: 0.5,
        textShadowColor: HUE.black, textShadowRadius: 5, textShadowOffset: { width: 0, height: 1 },
    },

    // Player avatar (footer dock).
    playerDock: { width: PLAYER_AVATAR_SIZE, height: PLAYER_AVATAR_SIZE },
    medallion: { width: PLAYER_AVATAR_SIZE, height: PLAYER_AVATAR_SIZE, alignItems: 'center', justifyContent: 'center' },
    medallionClip: {
        width: PLAYER_AVATAR_SIZE - 4, height: PLAYER_AVATAR_SIZE - 4, borderRadius: (PLAYER_AVATAR_SIZE - 4) / 2,
        overflow: 'hidden', backgroundColor: AXM.deepBg,
        alignItems: 'center', justifyContent: 'center',
    },
    medallionFlash: { ...StyleSheet.absoluteFillObject, backgroundColor: HUE.damageRed },
    contactSlash: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 6 },
    contactSlashText: { fontFamily: FONTS.gothic, fontSize: 34, color: HUE.white, textShadowColor: HUE.damageRed, textShadowRadius: 6 },
}));

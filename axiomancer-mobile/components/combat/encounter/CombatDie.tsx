/**
 * A stance die, PHYSICAL-CUBE treatment.
 *
 * Renders the same faux-isometric SVG cube as the hazard minigame's `HazardDie` (lit top face, mid front face carrying the
 * face art, shadow right face, a cast shadow beneath), so combat and hazard
 * dice are visibly the same physical object.
 *
 * A faint cross-hatch on the shell (top/right) faces plus an inner hairline
 * (echoing the card plate's own hairline rule) puts the die in the same ink
 * register as the painted enemy portraits and the codex's woodcut language,
 * without touching geometry, colour semantics, or interaction.
 *
 * Renders the four-die tray: every usable
 * face may power a card of its color this round. Unrolled dice (Reserve,
 * GHOST, forged) carry no face and power by colour alone.
 *
 * The face language lives on the FRONT face. The die's COLOUR carries the stance — no printed stance label,
 * no per-stance glyph. Every face is a circle:
 *   · hit (mana)  → a circle holding a small crystal — this face powers a card;
 *   · special     → a circle holding a SPARKLING crystal (the +◆ payload face);
 *   · miss        → a GREYED-OUT empty circle — dead, powers nothing (grey,
 *                   not stance-coloured, so "red missed" reads at a glance);
 *   · cracked     → the greyed circle struck through (an OVERHEAT crack, dead
 *                   this round); an X die reads the same dead way.
 * Colour is never the only a11y channel — the accessibility label still names
 * the stance and face state in words.
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient as SvgLinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { CombatDieVM } from '@/state/presenters/combat-encounter.engine';
import { spentDieTreatment } from '@/lib/juice';
import { HUE } from '@/theme/axm';

/**
 * The die's spoken state. Four dice, each showing a FACE — a special face
 * powers a card of its colour AND grants Conviction (the gear payload, 2 by default); MANA powers one paid
 * line of its colour (the gold WILD die powers any colour); MISS is dead.
 * The label names the colour, the face, and what the die can do right now,
 * with a spent / assigned state — colour is never the only a11y channel.
 *
 * Every draggable state says "drag onto"; every dead or used state says why,
 * so the e2e harness can tell a usable die from a dead one by wording alone.
 * Unrolled dice (Reserve, GHOST, forged) carry no `face` and are named by
 * where they sit instead.
 */
export function combatDieA11yLabel(
    die: CombatDieVM,
    opts: { assigned?: boolean; specialText?: string } = {},
): string {
    const colour = die.stanceLabel;
    const wild = die.color === 'wild';
    const noun = wild ? `${colour} (gold) die` : `${colour} die`;
    if (die.isX) return `${noun}: blocked, powers nothing`;
    if (!die.face) {
        // Unrolled dice — no face, colour alone powers them.
        const state = die.spent ? 'spent, it already powered a card this turn'
            : die.reserve ? 'banked in the Reserve, drag onto a staged card to power it'
                : die.floating ? 'ghost, a second power source, drag onto a staged card to power it'
                    : die.draggable === false ? 'not usable right now'
                        : 'drag onto a staged card to power it';
        return `${noun}: ${state}`;
    }
    if (die.cracked) return `${noun}, CRACKED face: dead this round, powers nothing`;
    if (die.face === 'miss') return `${noun}, MISS face: dead, powers nothing`;
    const face = die.face === 'special' ? 'BOON' : 'MANA';
    const target = wild ? 'a staged card of any colour' : `a staged ${colour} card`;
    const power = die.face === 'special'
        ? `power it${opts.specialText ? `. ${opts.specialText}` : ''}`
        : 'power its paid line';
    if (die.spent) return `${noun}, ${face} face: spent, it already powered a card this turn`;
    if (opts.assigned) return `${noun}, ${face} face: assigned to a staged card, APPLY to ${power}`;
    if (die.draggable === false) return `${noun}, ${face} face: not usable right now`;
    const where = die.reserve ? ', banked in the Reserve' : die.floating ? ', a ghost' : '';
    return `${noun}, ${face} face${where}: drag onto ${target} to ${power}`;
}

/** A 4-point sparkle star path centred on (cx, cy) with radius r. */
function sparklePath(cx: number, cy: number, r: number): string {
    const w = r * 0.28; // waist half-width — pinched for the star glint shape
    return `M ${cx} ${cy - r} Q ${cx + w} ${cy - w} ${cx + r} ${cy} Q ${cx + w} ${cy + w} ${cx} ${cy + r} Q ${cx - w} ${cy + w} ${cx - r} ${cy} Q ${cx - w} ${cy - w} ${cx} ${cy - r} Z`;
}

/** Mix a #rrggbb toward another #rrggbb by t (0..1) — the cube's lit/shade faces. */
function mixHex(hex: string, toward: string, t: number): string {
    const a = /^#?([0-9a-f]{6})/i.exec(hex);
    const b = /^#?([0-9a-f]{6})/i.exec(toward);
    if (!a || !b) return hex;
    const na = parseInt(a[1], 16);
    const nb = parseInt(b[1], 16);
    const ch = (sa: number, sb: number) => Math.round(sa + (sb - sa) * t);
    const r = ch((na >> 16) & 255, (nb >> 16) & 255);
    const g = ch((na >> 8) & 255, (nb >> 8) & 255);
    const bl = ch(na & 255, nb & 255);
    return `rgb(${r},${g},${bl})`;
}

/** A field of parallel diagonal strokes covering the box `(x, y, w, h)` —
 *  the woodcut cross-hatch overlay for the die's shell faces. Callers clip
 *  to the actual face polygon; this just fills the bounding box cheaply. */
function hatchLines(x: number, y: number, w: number, h: number, spacing: number): string[] {
    const lines: string[] = [];
    for (let i = -h; i < w + h; i += spacing) {
        lines.push(`M ${x + i} ${y} L ${x + i - h} ${y + h}`);
    }
    return lines;
}

// The cube geometry in viewBox units: a 100-unit front face behind a 32-unit
// isometric offset (the hazard `HazardDie` proportion, o = 0.32 · size).
const F = 100;   // front-face edge
const OV = 32;   // isometric offset
const VB = F + OV;

/** The rendered footprint of a `CombatDie` at `size` — the cube (front face
 *  `size` + isometric offset) plus cast-shadow room. Anything anchoring on the
 *  die's centre (the drag ghost) must use THIS, not the bare `size`. */
export function combatDieFootprint(size: number): { width: number; height: number } {
    const o = size * 0.32;
    return { width: size + o, height: size + o + size * 0.18 };
}

export const CombatDie = React.memo(function CombatDie({ die, size = 54, dimmed = false, testID, assigned = false, specialText, nested = false }: {
    die: CombatDieVM;
    size?: number;
    dimmed?: boolean;
    /** Board-local state the VM cannot know: this die has been dropped on a
     *  staged card and waits for APPLY. Spoken in the a11y label. */
    assigned?: boolean;
    /** What a special face does this fight (`vm.specialGloss`), spoken in the a11y label. */
    specialText?: string;
    /** Overrides the default `combat-die-<id>`. The drag ghost renders a CLONE
     *  of a tray die and must not answer to the original's testID — two nodes
     *  under one id made the tray unreadable to the e2e harness (it picked the
     *  parked ghost, which holds a PREVIOUS turn's die, and dragged from the
     *  wrong place). Same reason the ghost is hidden from accessibility. */
    testID?: string;
    /** Drawn inside another button (the staged card's socket). The die is
     *  then not its own a11y element: the parent's label speaks for it, and
     *  on web a second role="button" would nest one `<button>` in another. */
    nested?: boolean;
}) {
    const accent = die.colorHex;
    const special = die.face === 'special';
    const cracked = die.cracked === true;
    // A "dead" face powers nothing — the X die OR a miss/cracked face.
    // EVERY dead face greys out: a miss must read
    // as an undraggable dead die at a glance, so it drops its stance colour
    // like a crack/X does — only the rim hue tells a crack from a plain miss.
    const dead = die.isX || die.face === 'miss' || cracked;
    // A used die reads as spent —
    // greyed out, desaturated. A static state change (lib/juice `spentDie`),
    // not an animated primitive.
    const spentTreatment = spentDieTreatment({ spent: die.spent === true, dead });
    const greyed = spentTreatment.greyed;
    const ring = cracked ? HUE.dieCrackedRing : greyed ? HUE.deadGrey : special ? accent : `${accent}aa`;
    const glow = !dead && !dimmed;
    // Cube face colours — lit top, shaded right, dark front (the art surface).
    const liteFace = greyed ? HUE.dieGreyLite : mixHex(accent, HUE.white, 0.35);
    const darkFace = greyed ? HUE.dieGreyDark : mixHex(accent, HUE.black, 0.55);
    const edge = greyed ? HUE.dieGreyEdge : mixHex(accent, HUE.black, 0.7);
    // Component footprint (the hazard proportion): cube + cast-shadow room.
    const o = size * 0.32;
    const W = size + o;
    const H = size + o;
    const glowSize = W * 1.6;
    const gradId = `axmDieGlow-${die.color}`;
    const bodyId = `axmDieBody-${die.color}-${greyed ? 'grey' : 'live'}`;
    const gemId = `axmDieGem-${die.color}`;
    // The a11y state must not lie — see `combatDieA11yLabel` (colour, face,
    // what the die can do, spent / assigned).
    const a11yLabel = combatDieA11yLabel(die, { assigned, specialText });
    return (
        <View
            testID={testID ?? `combat-die-${die.id}`}
            accessible={!nested}
            accessibilityRole={nested ? undefined : 'button'}
            accessibilityLabel={nested ? undefined : a11yLabel}
            style={{ width: W, height: H + size * 0.18, opacity: dimmed ? 0.45 : spentTreatment.opacity }}
        >
            {glow && (
                <Svg
                    width={glowSize}
                    height={glowSize}
                    viewBox="0 0 100 100"
                    style={{ position: 'absolute', top: (H - glowSize) / 2, left: (W - glowSize) / 2 }}
                    pointerEvents="none"
                >
                    <Defs>
                        <RadialGradient id={gradId} cx="50%" cy="50%" r="50%">
                            <Stop offset="0%" stopColor={accent} stopOpacity={special ? 0.44 : 0.3} />
                            <Stop offset="70%" stopColor={accent} stopOpacity={0.08} />
                            <Stop offset="100%" stopColor={accent} stopOpacity={0} />
                        </RadialGradient>
                    </Defs>
                    <Circle cx={50} cy={50} r={50} fill={`url(#${gradId})`} />
                </Svg>
            )}
            {/* cast shadow — the die sits ON something (the hazard treatment) */}
            <View
                style={{
                    position: 'absolute',
                    left: W * 0.12,
                    top: H - size * 0.04,
                    width: size * 0.85,
                    height: size * 0.24,
                    borderRadius: size,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    opacity: dead ? 0.35 : 0.75,
                }}
            />
            <Svg width={W} height={H} viewBox={`0 0 ${VB} ${VB}`}>
                <Defs>
                    {/* Front-face depth: a lit top-left falling to a dark lower edge. */}
                    <SvgLinearGradient id={bodyId} x1="0%" y1="0%" x2="80%" y2="100%">
                        <Stop offset="0%" stopColor={accent} stopOpacity={greyed ? 0.1 : 0.42} />
                        <Stop offset="45%" stopColor={accent} stopOpacity={greyed ? 0.05 : 0.16} />
                        <Stop offset="100%" stopColor={HUE.black} stopOpacity={0.55} />
                    </SvgLinearGradient>
                    {/* The crystal's own facet light — white cap into the stance colour. */}
                    <SvgLinearGradient id={gemId} x1="0%" y1="0%" x2="35%" y2="100%">
                        <Stop offset="0%" stopColor={HUE.white} stopOpacity={0.95} />
                        <Stop offset="55%" stopColor={accent} stopOpacity={0.95} />
                        <Stop offset="100%" stopColor={accent} stopOpacity={0.75} />
                    </SvgLinearGradient>
                    <ClipPath id={`axmDieTopClip-${die.id}`}>
                        <Polygon points={`${OV},0 ${VB},0 ${F},${OV} 0,${OV}`} />
                    </ClipPath>
                    <ClipPath id={`axmDieRightClip-${die.id}`}>
                        <Polygon points={`${F},${OV} ${VB},0 ${VB},${F} ${F},${VB}`} />
                    </ClipPath>
                </Defs>
                {/* top face (lit) */}
                <Polygon
                    points={`${OV},0 ${VB},0 ${F},${OV} 0,${OV}`}
                    fill={liteFace}
                    stroke={edge}
                    strokeWidth={1.5}
                />
                {/* right face (shadow) */}
                <Polygon
                    points={`${F},${OV} ${VB},0 ${VB},${F} ${F},${VB}`}
                    fill={darkFace}
                    stroke={edge}
                    strokeWidth={1.5}
                />
                {/* woodcut cross-hatch — the shell faces only, so the front face's
                    info-bearing crystal glyph stays clean and uncluttered. */}
                <G clipPath={`url(#axmDieTopClip-${die.id})`} opacity={greyed ? 0.08 : 0.16}>
                    {hatchLines(0, -OV, VB, OV, 9).map((d, i) => (
                        <Path key={`th-${i}`} d={d} stroke={edge} strokeWidth={1} />
                    ))}
                </G>
                <G clipPath={`url(#axmDieRightClip-${die.id})`} opacity={greyed ? 0.08 : 0.2}>
                    {hatchLines(F, -OV, OV, VB, 9).map((d, i) => (
                        <Path key={`rh-${i}`} d={d} stroke={edge} strokeWidth={1} />
                    ))}
                </G>
                {/* front face (mid — carries the face art) */}
                <Rect x={0} y={OV} width={F} height={F} fill={HUE.dieUnderside} stroke={edge} strokeWidth={1.5} />
                <Rect x={0} y={OV} width={F} height={F} fill={`url(#${bodyId})`} />
                {/* rim — the special/dead state ring, on the front face */}
                <Rect x={2} y={OV + 2} width={F - 4} height={F - 4} fill="none" stroke={ring} strokeWidth={4} />
                {/* inner hairline — the card plate's own hairline-rule motif,
                    quiet chrome that never competes with the state ring's colour */}
                <Rect x={7} y={OV + 7} width={F - 14} height={F - 14} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={0.75} />
                <G y={OV}>
                    {/* the face circle — greyed + empty on a dead face (miss / X / cracked) */}
                    <Circle
                        cx={50} cy={50} r={26}
                        fill={dead ? 'none' : 'rgba(0,0,0,0.35)'}
                        stroke={greyed ? HUE.dieGreyStroke : 'rgba(255,255,255,0.7)'}
                        strokeWidth={3.5}
                    />
                    {/* hit / special — the small crystal held in the circle */}
                    {!dead && (
                        <>
                            <Polygon points="50,33 62,47 50,67 38,47" fill={`url(#${gemId})`} stroke="rgba(255,255,255,0.85)" strokeWidth={1.6} />
                            {/* facet lines */}
                            <Polygon points="50,33 62,47 50,52 38,47" fill="rgba(255,255,255,0.28)" />
                            <Path d="M 50 33 L 50 67" stroke="rgba(255,255,255,0.4)" strokeWidth={1.2} />
                        </>
                    )}
                    {/* BOON — the crystal sparkles (the +◆ payload face) */}
                    {special && !dead && (
                        <>
                            <Path d={sparklePath(66, 32, 8)} fill={HUE.white} opacity={0.95} />
                            <Path d={sparklePath(33, 36, 5)} fill={HUE.white} opacity={0.8} />
                            <Path d={sparklePath(62, 63, 4.5)} fill={HUE.white} opacity={0.7} />
                        </>
                    )}
                    {/* CRACKED — a distinct struck-out streak across the dead gem */}
                    {cracked && (
                        <Path d="M 10 58 L 36 48 L 52 56 L 90 42" stroke={HUE.dieCrackLine} strokeWidth={3.5} fill="none" strokeLinecap="round" />
                    )}
                </G>
            </Svg>
        </View>
    );
});

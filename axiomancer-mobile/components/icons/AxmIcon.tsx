import React, { useId } from 'react';
import Svg, { ClipPath, Defs, G, Path } from 'react-native-svg';
import { HUE } from '@/theme/axm';
import type { Palette } from '@/theme/palette';
import { usePalette } from '@/theme/runtime';
import {
    AXM_ICON_SPECS,
    type AccentGrow,
    type AccentHue,
    type AccentShape,
    type AxmIconName,
    type IconAccent,
} from './icon-registry';

interface AxmIconProps {
    name: AxmIconName;
    size?: number;
    /** Monochrome icon color; defaults to parchment. */
    color?: string;
    /** Per-placement accessibility label override. */
    label?: string;
    /** Accent layers drawn over the silhouette, in order (see `IconAccent`). */
    accents?: readonly IconAccent[];
}

/**
 * The colour an accent hue paints in the given palette: `blood` follows
 * the theme, the weather hues are fixed (`HUE`). Pure, so tests can pin it.
 */
export function accentHueColor(hue: AccentHue, palette: Pick<Palette, 'blood'>): string {
    switch (hue) {
        case 'blood':
            return palette.blood;
        case 'storm':
            return HUE.goldAccent;
        case 'ember':
            return HUE.statDownAmber;
        case 'frost':
            return HUE.guardBlue;
    }
}

/** A point moved by an accent's grow (identity when there is none). */
function grown([x, y]: readonly [number, number], grow?: AccentGrow): [number, number] {
    if (!grow) return [x, y];
    return [grow.ax + (x - grow.ax) * grow.factor, grow.ay + (y - grow.ay) * grow.factor];
}

/**
 * One clip shape as path data, in the icon's units, enlarged by `grow`.
 * `reverse` winds it the other way: cut out of a clockwise outer rect it
 * then makes a hole under both the nonzero and evenodd fill rules.
 */
export function accentShapePath(shape: AccentShape, grow?: AccentGrow, reverse = false): string {
    const f = grow?.factor ?? 1;
    switch (shape.kind) {
        case 'rect':
        case 'polygon': {
            const pts =
                shape.kind === 'rect'
                    ? ([
                          [shape.x, shape.y],
                          [shape.x + shape.w, shape.y],
                          [shape.x + shape.w, shape.y + shape.h],
                          [shape.x, shape.y + shape.h],
                      ] as const)
                    : shape.points;
            const ordered = (reverse ? [...pts].reverse() : [...pts]).map((p) => grown(p, grow));
            return `M${ordered.map(([x, y]) => `${x} ${y}`).join('L')}Z`;
        }
        case 'circle':
        case 'ellipse': {
            const [cx, cy] = grown([shape.cx, shape.cy], grow);
            const rx = (shape.kind === 'circle' ? shape.r : shape.rx) * f;
            const ry = (shape.kind === 'circle' ? shape.r : shape.ry) * f;
            const sweep = reverse ? 0 : 1;
            return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 ${sweep} ${cx + rx} ${cy}A${rx} ${ry} 0 1 ${sweep} ${cx - rx} ${cy}Z`;
        }
    }
}

/**
 * AxmIcon — the one renderer for the icon canon.
 *
 * Draws a registry silhouette in a single caller color over the AXM
 * token contract; the reserved accent channel (`stroke: 'accent'`)
 * resolves to `AXM.blood`. Optional `accents` repaint clipped parts of the
 * silhouette in a named hue (`accentHueColor`). Prefer this (or the `ActionIcon` /
 * `EffectGlyph` adapters) over ad-hoc inline `<Svg>` icons — see
 * `components/icons/icon-registry.ts`.
 */
export function AxmIcon({ name, size = 28, color, label, accents }: AxmIconProps) {
    const AXM = usePalette();
    // Clip ids must be unique per mounted icon, or two icons on one screen
    // would share (and fight over) the same clip.
    const clipBase = `axmAccent${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
    const spec = AXM_ICON_SPECS[name];
    if (!spec) return null;
    const c = color ?? AXM.parchment;
    const layers = accents ?? [];
    // A grown accent hides the plain silhouette under its grown clip.
    const hides = layers.filter((a) => a.grow);
    const [, , vbW, vbH] = spec.viewBox.split(' ').map(Number);
    const hideId = `${clipBase}-hide`;
    const base = spec.primitives.map((p, i) => (
        <Path
            key={i}
            d={p.d}
            fill={p.fill ? c : 'none'}
            fillOpacity={p.fillOpacity}
            stroke={p.stroke === 'accent' ? AXM.blood : p.stroke === 'color' ? c : undefined}
            strokeWidth={p.strokeWidth}
            strokeLinecap={p.strokeLinecap}
            strokeLinejoin="round"
            opacity={p.opacity}
        />
    ));

    return (
        <Svg
            viewBox={spec.viewBox}
            width={size}
            height={size}
            accessibilityRole="image"
            accessibilityLabel={label ?? spec.label}
        >
            {hides.length > 0 ? <G clipPath={`url(#${hideId})`}>{base}</G> : base}
            {layers.length > 0 && (
                <Defs>
                    {layers.map((a, ai) => (
                        <ClipPath key={ai} id={`${clipBase}-${ai}`}>
                            <Path d={a.clip.map((shape) => accentShapePath(shape, a.grow)).join('')} />
                        </ClipPath>
                    ))}
                    {hides.length > 0 && (
                        <ClipPath id={hideId}>
                            <Path
                                d={`M0 0H${vbW}V${vbH}H0Z${hides
                                    .flatMap((a) => a.clip.map((shape) => accentShapePath(shape, a.grow, true)))
                                    .join('')}`}
                                clipRule="evenodd"
                            />
                        </ClipPath>
                    )}
                </Defs>
            )}
            {layers.map((a, ai) => {
                // The same silhouette in the accent hue, shown only inside
                // the clip: the mark stays one piece, part of it changes colour.
                const hue = accentHueColor(a.hue, AXM);
                const g = a.grow;
                return (
                    <G key={`accent-${ai}`} clipPath={`url(#${clipBase}-${ai})`} testID={`axm-icon-accent-${a.hue}`}>
                        <G
                            transform={
                                g ? `translate(${g.ax} ${g.ay}) scale(${g.factor}) translate(${-g.ax} ${-g.ay})` : undefined
                            }
                        >
                            {spec.primitives.map((p, i) => (
                                <Path
                                    key={i}
                                    d={p.d}
                                    fill={p.fill ? hue : 'none'}
                                    fillOpacity={p.fillOpacity}
                                    stroke={p.stroke === 'color' ? hue : p.stroke === 'accent' ? AXM.blood : undefined}
                                    strokeWidth={p.strokeWidth}
                                    strokeLinecap={p.strokeLinecap}
                                    strokeLinejoin="round"
                                    opacity={p.opacity}
                                />
                            ))}
                        </G>
                    </G>
                );
            })}
        </Svg>
    );
}

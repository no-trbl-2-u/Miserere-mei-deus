/**
 * The experience kit's drawing primitives, for both looks.
 *
 * `KitBackdrop` paints one kit piece behind a view's children. A piece that
 * has to grow past its drawn shape (a panel, a dock, a button) is nine-sliced:
 * its corners keep their size and only its edges and middle stretch. The slices
 * are laid out with flex and percentages rather than `capInsets`, which React
 * Native ignores on Android and web, so every platform draws the same frame.
 *
 * Inputs: `piece` (a key of `KIT`, brass or vellum), `scale` (points per image
 * pixel, to override the piece's default). Output: an absolutely filled,
 * touch-transparent layer. A vellum piece slices on the same percentages as
 * its brass twin, because the two sets were converted on one recipe.
 *
 * RN-WEB TRAP (learned in #1398): an absolutely positioned backdrop hides a
 * static `Svg` sibling unless the `Svg` is wrapped in a `View`. Wiring a place
 * whose content is an `Svg` means wrapping that `Svg`, not reordering it.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';

import { KIT, type KitPiece } from '@/assets/images/experience/kit';
import { Image } from '@/lib/platform/image';
import { HUE } from '@/theme/hue';
import { SectionLabel } from '@/components/SectionLabel';

/**
 * Ink on parchment (T, 2026-11-06): body text in iron-gall brown, accents in
 * oxblood where today's text is gold or amber. Every one measures at least
 * 4.5:1 against the vellum pieces' darkest parchment (see the vellum-ink test).
 */
export const VELLUM_INK = HUE.vellumInk;
export const VELLUM_OXBLOOD = HUE.vellumOxblood;

/** Unstretched share of a piece on each side: top, right, bottom, left. */
type Slice = readonly [number, number, number, number];

const SLICED: Partial<Record<KitPiece, { slice: Slice; scale: number }>> = {
    // The rails carry a centre ornament that reaches to 37% of the height at
    // the top and 30% at the bottom, measured off the art. A slice that stops
    // short of it leaves the ornament in the middle band, which stretches 2.7x
    // vertically to fill the dock and drags a smeared diamond down across the
    // readout. The slices below hold both rails whole, so only the plain panel
    // between them stretches. Horizontally 800px at 0.4875 is 390pt, the
    // dock's own width, so nothing is stretched that way at all.
    'nav-dock-dark': { slice: [0.38, 0.065, 0.3, 0.065], scale: 0.4875 },
    'modal-panel-dark': { slice: [0.2, 0.19, 0.2, 0.19], scale: 0.3 },
    'action-button-idle': { slice: [0.33, 0.1, 0.33, 0.1], scale: 0.36 },
    'action-button-selected': { slice: [0.33, 0.1, 0.33, 0.1], scale: 0.36 },
    'action-button-disabled': { slice: [0.33, 0.1, 0.33, 0.1], scale: 0.36 },
    'segment-button-idle': { slice: [0.3, 0.15, 0.3, 0.15], scale: 0.26 },
    'segment-button-selected': { slice: [0.3, 0.15, 0.3, 0.15], scale: 0.26 },
    'segment-button-pressed': { slice: [0.3, 0.15, 0.3, 0.15], scale: 0.26 },
    'section-header-dark-star': { slice: [0.2, 0.1, 0.2, 0.1], scale: 0.5 },
    'section-header-dark-quatrefoil': { slice: [0.2, 0.1, 0.2, 0.1], scale: 0.5 },
    'combat-badge': { slice: [0.3, 0.2, 0.3, 0.2], scale: 0.3 },
    'nav-count-plate-dark': { slice: [0.3, 0.2, 0.3, 0.2], scale: 0.32 },

    // Self and Satchel pieces. Each ornament sits mid-edge, so the middle
    // band is held to a sliver at the ornament's centre and the corners keep the rest.
    'stat-tile': { slice: [0.16, 0.45, 0.14, 0.45], scale: 0.6 },
    'equipment-slot-dark': { slice: [0.3, 0.46, 0.3, 0.46], scale: 0.35 },
    'equipment-slot-selected': { slice: [0.3, 0.46, 0.3, 0.46], scale: 0.35 },
    'combat-vitae-track': { slice: [0.35, 0.03, 0.35, 0.03], scale: 0.5 },
    'character-portrait-frame': { slice: [0.25, 0.3, 0.2, 0.3], scale: 0.48 },
    'level-badge-dark': { slice: [0.3, 0.3, 0.3, 0.3], scale: 0.4 },

    // Vellum & Ink: each on its brass twin's slices and scale.
    'menu-panel-vellum': { slice: [0.22, 0.17, 0.22, 0.17], scale: 0.42 },
    'modal-panel-vellum': { slice: [0.2, 0.19, 0.2, 0.19], scale: 0.3 },
    'action-button-vellum': { slice: [0.33, 0.1, 0.33, 0.1], scale: 0.36 },
    'quest-row-vellum': { slice: [0.25, 0.14, 0.25, 0.14], scale: 0.42 },
    // Profiled off the 800x74 art by dark-pixel counts: no centre ornament, a
    // heavy rail pair to row 19 above and from row 64 below, and an end
    // flourish whose ink stays within 66px of each edge. The 0.27 / 0.14
    // slices hold both rail pairs whole, the 0.09 columns (72px) hold each
    // flourish whole, and 1 draws the art at its own 74pt in the 76pt dock, so
    // the middle band stretches about 1.05x (the dock was 60pt at scale 0.8).
    'nav-dock-vellum': { slice: [0.27, 0.09, 0.14, 0.09], scale: 1 },
    'section-header-vellum-star': { slice: [0.2, 0.1, 0.2, 0.1], scale: 0.5 },
    'section-header-vellum-leaf': { slice: [0.2, 0.1, 0.2, 0.1], scale: 0.5 },
    'filter-tab-vellum': { slice: [0.3, 0.1, 0.3, 0.1], scale: 0.26 },
    'vellum-chip': { slice: [0.3, 0.2, 0.3, 0.2], scale: 0.3 },
};

/** Points per image pixel a sliced piece draws at by default (1 for a whole piece). */
export function kitScale(piece: KitPiece): number {
    return SLICED[piece]?.scale ?? 1;
}

/**
 * What a sliced piece keeps unstretched on each side, in points: top, right,
 * bottom, left. An element drawn in front of the piece has to pad past this
 * much on a side that carries an ornament, or its content lands on the art.
 * Null for a piece that is drawn whole.
 */
export function unstretchedInset(piece: KitPiece, scale?: number): { top: number; right: number; bottom: number; left: number } | null {
    const sliced = SLICED[piece];
    if (!sliced) return null;
    const { w, h } = KIT[piece];
    const k = scale ?? sliced.scale;
    const [top, right, bottom, left] = sliced.slice;
    return { top: top * h * k, right: right * w * k, bottom: bottom * h * k, left: left * w * k };
}

/** One piece stretched to whatever box `style` gives it. */
export function KitImage({ piece, style }: { piece: KitPiece; style?: StyleProp<ViewStyle> }) {
    return <Image source={KIT[piece].source} style={style as never} contentFit="fill" transition={0} />;
}

/** Where a slice's strip of the image sits inside its cell, along one axis. */
function strip(start: number, end: number, index: 0 | 1 | 2, length: number): { size: DimensionValue; offset: DimensionValue } {
    if (index === 0) return { size: length, offset: 0 };
    if (index === 2) return { size: length, offset: -(length * (1 - end)) };
    const middle = 1 - start - end;
    return { size: `${100 / middle}%`, offset: `${(-start / middle) * 100}%` };
}

const AXES = [0, 1, 2] as const;

export function KitBackdrop({ piece, scale }: { piece: KitPiece; scale?: number }) {
    const sliced = SLICED[piece];
    if (!sliced) return <KitImage piece={piece} style={StyleSheet.absoluteFill} />;
    const { w, h, source } = KIT[piece];
    const k = scale ?? sliced.scale;
    const [top, right, bottom, left] = sliced.slice;
    const heights = [top * h * k, undefined, bottom * h * k];
    const widths = [left * w * k, undefined, right * w * k];
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {AXES.map((row) => (
                <View key={row} style={[styles.row, heights[row] === undefined ? styles.grow : { height: heights[row] }]}>
                    {AXES.map((col) => {
                        const y = strip(top, bottom, row, h * k);
                        const x = strip(left, right, col, w * k);
                        return (
                            <View key={col} style={[styles.cell, widths[col] === undefined ? styles.grow : { width: widths[col] }]}>
                                <Image
                                    source={source}
                                    contentFit="fill"
                                    transition={0}
                                    style={{ position: 'absolute', width: x.size, left: x.offset, height: y.size, top: y.offset }}
                                />
                            </View>
                        );
                    })}
                </View>
            ))}
        </View>
    );
}

/**
 * A section heading on its kit plate. The words stay a `SectionLabel`, so the
 * heading still reads as a header to a screen reader. `look` picks the set;
 * `variant` picks the ornament within it (the vellum set's leaf stands where
 * brass has its quatrefoil).
 */
export function KitHeader({ children, variant = 'star', look = 'brass', right }: {
    children: React.ReactNode;
    variant?: 'star' | 'quatrefoil';
    look?: 'brass' | 'vellum';
    right?: React.ReactNode;
}) {
    const piece: KitPiece = look === 'vellum'
        ? (variant === 'star' ? 'section-header-vellum-star' : 'section-header-vellum-leaf')
        : (variant === 'star' ? 'section-header-dark-star' : 'section-header-dark-quatrefoil');
    return (
        <View style={styles.header}>
            <KitBackdrop piece={piece} />
            <SectionLabel size={11} color={look === 'vellum' ? VELLUM_OXBLOOD : undefined}>{children}</SectionLabel>
            {right ? <View style={styles.headerRight}>{right}</View> : null}
        </View>
    );
}

/** A kit divider at its own proportions, across the width it is given. */
export function KitDivider({ piece, style }: {
    piece:
        | 'divider-ornate-brass'
        | 'divider-plain-brass'
        | 'divider-short-brass'
        | 'divider-ornate-ink'
        | 'divider-plain-ink'
        | 'divider-short-ink';
    style?: StyleProp<ViewStyle>;
}) {
    const { w, h } = KIT[piece];
    return <KitImage piece={piece} style={[styles.divider, { aspectRatio: w / h }, style]} />;
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', overflow: 'hidden' },
    cell: { overflow: 'hidden' },
    grow: { flex: 1 },
    header: { height: 32, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
    headerRight: { position: 'absolute', right: 26, top: 0, bottom: 0, justifyContent: 'center' },
    divider: { width: '86%', alignSelf: 'center', marginVertical: 6 },
});

/**
 * The Brass Gothic kit's drawing primitives.
 *
 * `KitBackdrop` paints one kit piece behind a view's children. A piece that
 * has to grow past its drawn shape (a panel, a dock, a button) is nine-sliced:
 * its corners keep their size and only its edges and middle stretch. The slices
 * are laid out with flex and percentages rather than `capInsets`, which React
 * Native ignores on Android and web, so every platform draws the same frame.
 *
 * Inputs: `piece` (a key of `BRASS`), `scale` (points per image pixel, to override
 * the piece's default). Output: an absolutely filled, touch-transparent layer.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';

import { BRASS, type BrassPiece } from '@/assets/images/experience/brass';
import { Image } from '@/lib/platform/image';
import { SectionLabel } from '@/components/SectionLabel';

/** Unstretched share of a piece on each side: top, right, bottom, left. */
type Slice = readonly [number, number, number, number];

const SLICED: Partial<Record<BrassPiece, { slice: Slice; scale: number }>> = {
    'nav-dock-dark': { slice: [0.12, 0.055, 0.12, 0.055], scale: 0.4875 },
    'combat-rail-dark': { slice: [0.2, 0.07, 0.2, 0.07], scale: 0.4875 },
    'menu-panel-dark': { slice: [0.22, 0.17, 0.22, 0.17], scale: 0.42 },
    'modal-panel-dark': { slice: [0.2, 0.19, 0.2, 0.19], scale: 0.3 },
    'quest-row-dark': { slice: [0.25, 0.14, 0.25, 0.14], scale: 0.42 },
    'item-card-dark': { slice: [0.2, 0.18, 0.1, 0.18], scale: 0.33 },
    'item-card-equipped': { slice: [0.2, 0.18, 0.1, 0.18], scale: 0.33 },
    'action-button-idle': { slice: [0.33, 0.1, 0.33, 0.1], scale: 0.36 },
    'action-button-selected': { slice: [0.33, 0.1, 0.33, 0.1], scale: 0.36 },
    'action-button-disabled': { slice: [0.33, 0.1, 0.33, 0.1], scale: 0.36 },
    'end-turn-idle': { slice: [0.3, 0.1, 0.3, 0.1], scale: 0.3 },
    'end-turn-selected': { slice: [0.3, 0.1, 0.3, 0.1], scale: 0.3 },
    'end-turn-disabled': { slice: [0.3, 0.1, 0.3, 0.1], scale: 0.3 },
    'filter-tab-dark-idle': { slice: [0.3, 0.1, 0.3, 0.1], scale: 0.26 },
    'filter-tab-dark-selected': { slice: [0.3, 0.1, 0.3, 0.1], scale: 0.26 },
    'rivet-tab-dark-idle': { slice: [0.3, 0.1, 0.3, 0.1], scale: 0.3 },
    'rivet-tab-dark-selected': { slice: [0.3, 0.1, 0.3, 0.1], scale: 0.3 },
    'segment-button-idle': { slice: [0.3, 0.15, 0.3, 0.15], scale: 0.26 },
    'segment-button-selected': { slice: [0.3, 0.15, 0.3, 0.15], scale: 0.26 },
    'segment-button-pressed': { slice: [0.3, 0.15, 0.3, 0.15], scale: 0.26 },
    'section-header-dark-star': { slice: [0.2, 0.1, 0.2, 0.1], scale: 0.5 },
    'section-header-dark-quatrefoil': { slice: [0.2, 0.1, 0.2, 0.1], scale: 0.5 },
    'combat-badge': { slice: [0.3, 0.2, 0.3, 0.2], scale: 0.3 },
    'nav-count-plate-dark': { slice: [0.3, 0.2, 0.3, 0.2], scale: 0.32 },
    'nav-count-plate-gold': { slice: [0.3, 0.2, 0.3, 0.2], scale: 0.32 },
};

/** One piece stretched to whatever box `style` gives it. */
export function KitImage({ piece, style }: { piece: BrassPiece; style?: StyleProp<ViewStyle> }) {
    return <Image source={BRASS[piece].source} style={style as never} contentFit="fill" transition={0} />;
}

/** Where a slice's strip of the image sits inside its cell, along one axis. */
function strip(start: number, end: number, index: 0 | 1 | 2, length: number): { size: DimensionValue; offset: DimensionValue } {
    if (index === 0) return { size: length, offset: 0 };
    if (index === 2) return { size: length, offset: -(length * (1 - end)) };
    const middle = 1 - start - end;
    return { size: `${100 / middle}%`, offset: `${(-start / middle) * 100}%` };
}

const AXES = [0, 1, 2] as const;

export function KitBackdrop({ piece, scale }: { piece: BrassPiece; scale?: number }) {
    const sliced = SLICED[piece];
    if (!sliced) return <KitImage piece={piece} style={StyleSheet.absoluteFill} />;
    const { w, h, source } = BRASS[piece];
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

/** A section heading on its brass plate. The words stay a `SectionLabel`. */
export function KitHeader({ children, variant = 'star', right }: {
    children: React.ReactNode;
    variant?: 'star' | 'quatrefoil';
    right?: React.ReactNode;
}) {
    return (
        <View style={styles.header}>
            <KitBackdrop piece={variant === 'star' ? 'section-header-dark-star' : 'section-header-dark-quatrefoil'} />
            <SectionLabel size={11}>{children}</SectionLabel>
            {right ? <View style={styles.headerRight}>{right}</View> : null}
        </View>
    );
}

/** A kit divider at its own proportions, across the width it is given. */
export function KitDivider({ piece, style }: {
    piece: 'divider-ornate-brass' | 'divider-plain-brass' | 'divider-short-brass';
    style?: StyleProp<ViewStyle>;
}) {
    const { w, h } = BRASS[piece];
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

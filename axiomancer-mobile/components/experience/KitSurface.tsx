/**
 * A view or a button that wears a kit piece.
 *
 * `KitSurface` is a `View` with a `KitBackdrop` behind its children;
 * `KitPressable` is the same on a `Pressable`, and swaps to `pressedPiece`
 * while it is held. A caller gives the box its own padding, which has to
 * clear the piece's unstretched corners (the piece's slice share of its
 * drawn size, at its scale), or the words run onto the frame.
 *
 * `wear` is whether the place's look is a kit look (`lookOf(place) !== 'normal'`).
 * With `wear` false the box is today's plain one: a `View`, or for a button a
 * `Pressable` (a `TouchableOpacity` with `plainOpacity`), and no piece is drawn.
 *
 * Inputs: `piece` (a key of `KIT`), `scale` (to override the piece's own),
 * `style`, `wear`, and for a button `pressedPiece` plus any `Pressable` prop.
 * Output: a relatively positioned box, its frame drawn under its children.
 */

import React from 'react';
import { Pressable, TouchableOpacity, View } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

import type { KitPiece } from '@/assets/images/experience/kit';
import { KitBackdrop } from './KitBackdrop';

export function KitSurface({ piece, scale, style, children, testID, wear = true, accessibilityLabel }: {
    piece: KitPiece;
    scale?: number;
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
    testID?: string;
    wear?: boolean;
    accessibilityLabel?: string;
}) {
    if (!wear) return <View style={style} testID={testID} accessibilityLabel={accessibilityLabel}>{children}</View>;
    return (
        <View style={[{ position: 'relative' }, style]} testID={testID} accessibilityLabel={accessibilityLabel}>
            <KitBackdrop piece={piece} scale={scale} />
            {children}
        </View>
    );
}

export function KitPressable({ piece, pressedPiece, scale, style, children, wear = true, plainOpacity = false, ...rest }: Omit<PressableProps, 'style' | 'children'> & {
    piece: KitPiece;
    pressedPiece?: KitPiece;
    scale?: number;
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
    wear?: boolean;
    plainOpacity?: boolean;
}) {
    if (!wear) {
        if (plainOpacity) return <TouchableOpacity {...(rest as object)} style={style}>{children}</TouchableOpacity>;
        return <Pressable {...rest} style={style}>{children}</Pressable>;
    }
    return (
        <Pressable {...rest} style={[{ position: 'relative' }, style]}>
            {({ pressed }) => (
                <>
                    <KitBackdrop piece={pressed && pressedPiece ? pressedPiece : piece} scale={scale} />
                    {children}
                </>
            )}
        </Pressable>
    );
}

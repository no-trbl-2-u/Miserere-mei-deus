/**
 * A view or a button that wears a kit piece.
 *
 * `KitSurface` is a `View` with a `KitBackdrop` behind its children;
 * `KitPressable` is the same on a `Pressable`, and swaps to `pressedPiece`
 * while it is held. A caller gives the box its own padding, which has to
 * clear the piece's unstretched corners (the piece's slice share of its
 * drawn size, at its scale), or the words run onto the frame.
 *
 * Inputs: `piece` (a key of `KIT`), `scale` (to override the piece's own),
 * `style`, and for a button `pressedPiece` plus any `Pressable` prop.
 * Output: a relatively positioned box, its frame drawn under its children.
 */

import React from 'react';
import { Pressable, View } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

import type { KitPiece } from '@/assets/images/experience/kit';
import { KitBackdrop } from './KitBackdrop';

export function KitSurface({ piece, scale, style, children, testID }: {
    piece: KitPiece;
    scale?: number;
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
    testID?: string;
}) {
    return (
        <View style={[{ position: 'relative' }, style]} testID={testID}>
            <KitBackdrop piece={piece} scale={scale} />
            {children}
        </View>
    );
}

export function KitPressable({ piece, pressedPiece, scale, style, children, ...rest }: Omit<PressableProps, 'style' | 'children'> & {
    piece: KitPiece;
    pressedPiece?: KitPiece;
    scale?: number;
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
}) {
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

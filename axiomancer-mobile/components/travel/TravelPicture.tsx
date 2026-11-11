/**
 * TravelPicture - the travel screen's top. Fills the width and a
 * fixed height with the destination's picture, fading into the dark ground at
 * its foot. A whole image is shown covering the box; a plate crop draws the
 * plate at `zoom` times the box's width, centred on the landmark and clamped
 * so no edge of the plate shows. No scene: the dark ground alone, no figure.
 *
 * Inputs: `scene` (from `selectTravelScene`), `height`. Output: a picture box.
 */

import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Image } from '@/lib/platform/image';
import type { TravelSceneVM } from '@/state/presenters/travel.engine';
import { usePalette } from '@/theme/runtime';

/** The picture box's height. */
export const TRAVEL_PICTURE_HEIGHT = 360;

export interface CropPlacement {
    width: number;
    height: number;
    left: number;
    top: number;
}

/**
 * Where a square plate sits in a `boxWidth` x `boxHeight` box so the focus
 * (fractions of the plate) is centred at `zoom` x the box's width, clamped so
 * the plate always covers the box.
 */
export function cropPlacement(
    boxWidth: number, boxHeight: number, focusX: number, focusY: number, zoom: number,
): CropPlacement {
    const size = Math.max(boxWidth * zoom, boxHeight);
    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
    return {
        width: size,
        height: size,
        left: clamp(boxWidth / 2 - focusX * size, boxWidth - size, 0),
        top: clamp(boxHeight / 2 - focusY * size, boxHeight - size, 0),
    };
}

export function TravelPicture({ scene, height = TRAVEL_PICTURE_HEIGHT }: { scene: TravelSceneVM | null; height?: number }) {
    const AXM = usePalette();
    const [width, setWidth] = useState(0);
    const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

    return (
        <View style={[styles.box, { height, backgroundColor: AXM.deepBg }]} onLayout={onLayout} testID="travel-art">
            {scene?.kind === 'image' && (
                <Image source={scene.source} style={StyleSheet.absoluteFillObject} contentFit="cover" testID="travel-image" />
            )}
            {scene?.kind === 'crop' && width > 0 && (
                <Image
                    source={scene.source}
                    style={[styles.crop, cropPlacement(width, height, scene.focusX, scene.focusY, scene.zoom)]}
                    contentFit="fill"
                    testID="travel-crop"
                />
            )}
            {scene && (
                <View style={styles.fade} pointerEvents="none">
                    <Svg width="100%" height="100%" preserveAspectRatio="none">
                        <Defs>
                            <LinearGradient id="travelFade" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor={AXM.bg} stopOpacity={0} />
                                <Stop offset="1" stopColor={AXM.bg} stopOpacity={1} />
                            </LinearGradient>
                        </Defs>
                        <Rect x="0" y="0" width="100%" height="100%" fill="url(#travelFade)" />
                    </Svg>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    box: { width: '100%', overflow: 'hidden', position: 'relative' },
    crop: { position: 'absolute' },
    fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' },
});

/**
 * The frame player: a validated frame set, one clip of it, on screen.
 *
 * Every cell is mounted once and the active one is the only opaque layer, so
 * advancing a frame is an opacity swap rather than an image decode — a swapped
 * `source` would flash the first time each cell is reached, which on an attack
 * beat is the one moment it must not.
 *
 * It refuses to render a set that does not validate. A truncated animation is a
 * failure, not a shrug: a bad set falls back to the resting cell when it has
 * one and to nothing at all when it does not, and says why in dev.
 */
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { Image } from '@/lib/platform/image';
import {
    RESTING_CLIP, validateFrameSet, type EnemyFrameSet,
} from '@/assets/images/enemies/frames';

import { sheetIndexFor } from './framePlayback';
import { useFramePlayback, type ReducedMotionLike } from './useFramePlayback';

export interface EnemyFramePlayerProps {
    /** The `portraitAsset` key this set belongs to — used in failure messages. */
    artKey: string;
    frameSet: EnemyFrameSet;
    /** Which named clip to play. Defaults to the resting loop. */
    clipName?: string;
    playing?: boolean;
    /** The caller's own reduced-motion answer — a boolean or the pane's ref. */
    reducedMotion?: ReducedMotionLike;
    instant?: boolean;
    startKey?: number;
    /**
     * Show this clip-relative frame instead of the driven one. The dev harness
     * uses it to step by hand while paused; live combat never passes it.
     */
    frameOverride?: number | null;
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
    testID?: string;
}

export function EnemyFramePlayer({
    artKey,
    frameSet,
    clipName = RESTING_CLIP,
    playing = true,
    reducedMotion,
    instant,
    startKey = 0,
    frameOverride = null,
    style,
    accessibilityLabel,
    testID = 'enemy-frame-player',
}: EnemyFramePlayerProps) {
    const problems = validateFrameSet(artKey, frameSet);
    const clip = frameSet.manifest.clips?.[clipName];
    const usable = problems.length === 0 && clip !== undefined;

    // A clip must exist before the driver can be asked anything, and hooks are
    // not optional — so an unusable set drives a one-frame stand-in instead.
    const safeClip = usable ? clip : { row: 0, frames: 1, fps: 1, loop: false, rest: 0 };
    const { index, still } = useFramePlayback({
        clip: safeClip, playing, reducedMotion, instant, startKey,
    });

    if (!usable) {
        if (__DEV__) {
            const why = problems.length > 0 ? problems.join('; ') : `${artKey}: no '${clipName}' clip`;
            console.warn(`[frames] refusing to play an invalid frame set — ${why}`);
        }
        return <View style={style} testID={`${testID}-invalid`} />;
    }

    const shown = frameOverride == null
        ? index
        : ((frameOverride % clip.frames) + clip.frames) % clip.frames;
    const active = sheetIndexFor(frameSet.manifest, clip, shown);
    const footed = frameSet.manifest.anchor.kind === 'foot-line';

    return (
        <View
            style={style}
            testID={testID}
            accessible={accessibilityLabel !== undefined}
            accessibilityLabel={accessibilityLabel}
        >
            {frameSet.frames.map((source, i) => (
                <Animated.View
                    key={i}
                    style={[StyleSheet.absoluteFillObject, { opacity: i === active ? 1 : 0 }]}
                    pointerEvents="none"
                    testID={i === active ? `${testID}-cell-${shown}` : undefined}
                >
                    <Image
                        source={source}
                        style={StyleSheet.absoluteFillObject}
                        contentFit="contain"
                        // `foot-line` pins the bottom edge so a standing figure
                        // never lifts off its own feet; `centre` keeps the cell
                        // centred, because for a floater the hover IS the clip.
                        contentPosition={footed ? 'bottom center' : 'center'}
                    />
                </Animated.View>
            ))}
            {/* A zero-size marker so a test can ask "is it holding still?"
                without reaching into the hook. */}
            {still ? <View testID={`${testID}-still`} pointerEvents="none" /> : null}
        </View>
    );
}

export default EnemyFramePlayer;

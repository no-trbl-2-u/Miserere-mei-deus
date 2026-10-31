/**
 * The night passing at a rest (Phase ET1c): the screen runs dusk to night to
 * dawn with the node's dream line, then calls `onDone` so the outcome shows at
 * dawn. A tap skips to the end. The caller decides whether motion happens
 * (`instant`); an instant night is never mounted, the caller goes straight to
 * the dawn.
 */

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
    Easing,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import { REST_NIGHT_SKIP_LABEL, REST_NIGHT_STAGE_WORD } from '@/state/presenters/rest.copy';
import { FONTS } from '@/theme/axm';
import { usePalette } from '@/theme/runtime';

import { NIGHT_TIMING, NIGHT_TOTAL_MS, nightStageAt, type NightStage } from './night';

export interface NightPassingProps {
    /** The node's dream line; absent shows the stage word alone. */
    dream: string | null;
    onDone: () => void;
}

export function NightPassing({ dream, onDone }: NightPassingProps) {
    const AXM = usePalette();
    const [stage, setStage] = useState<NightStage>('dusk');
    const progress = useSharedValue(0);

    useEffect(() => {
        const toNight = setTimeout(() => setStage('night'), NIGHT_TIMING.duskMs);
        const toDawn = setTimeout(() => setStage('dawn'), NIGHT_TIMING.duskMs + NIGHT_TIMING.nightMs);
        const done = setTimeout(onDone, NIGHT_TOTAL_MS);
        progress.value = withTiming(1, { duration: NIGHT_TOTAL_MS, easing: Easing.inOut(Easing.quad) });
        return () => {
            clearTimeout(toNight);
            clearTimeout(toDawn);
            clearTimeout(done);
        };
        // The night plays once per mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const sky = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(progress.value, [0, 0.4, 0.7, 1], [AXM.ash, AXM.bg, AXM.bg, AXM.panelBg]),
    }));

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={REST_NIGHT_SKIP_LABEL}
            onPress={onDone}
            style={styles.fill}
            testID="rest-night"
        >
            <Animated.View style={[styles.sky, sky]}>
                <Text style={[styles.stage, { color: AXM.sulfur }]} testID={`rest-night-${stage}`}>
                    {REST_NIGHT_STAGE_WORD[stage]}
                </Text>
                {dream && stage !== 'dusk' ? (
                    <Text style={[styles.dream, { color: AXM.parchment }]} testID="rest-night-dream">
                        {dream}
                    </Text>
                ) : null}
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    fill: { width: '100%' },
    sky: { minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 16, borderWidth: 2 },
    stage: { fontFamily: FONTS.gothic, fontSize: 22, letterSpacing: 3, marginBottom: 10 },
    dream: { fontFamily: FONTS.serifItalic, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});

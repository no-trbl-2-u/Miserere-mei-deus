/**
 * EmbarkButton — the main menu's NEW GAME button: T's torn parchment scroll
 * lettered "Embark" (plan 121.3), drawn at the menu column's width with its
 * aspect kept. The lettering is part of the art, so the screen-reader label
 * says what the press does.
 *
 * Inputs: `onPress`, `accessibilityLabel`, `accessibilityHint`, `testID`.
 * Output: a pressable image. Pressing dips it (a slight shrink and fade);
 * keyboard focus on web rings it, so a keyboard player can see where they are.
 */

import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { EMBARK_SCROLL, EMBARK_SCROLL_ASPECT } from '@/assets/images/title';
import { Image } from '@/lib/platform/image';
import { makeStyles } from '@/theme/runtime';

export interface EmbarkButtonProps {
    onPress: () => void;
    accessibilityLabel: string;
    accessibilityHint?: string;
    testID?: string;
    /** Render as held, for tests (Pressable's `testOnly_pressed`). */
    testOnlyPressed?: boolean;
}

/** How far a press dips the scroll: scale and opacity while held. */
export const EMBARK_PRESSED = Object.freeze({ scale: 0.97, opacity: 0.85 });

export function EmbarkButton({ onPress, accessibilityLabel, accessibilityHint, testID, testOnlyPressed }: EmbarkButtonProps) {
    const styles = useStyles();
    const [focused, setFocused] = useState(false);
    return (
        <Pressable
            style={({ pressed }) => [styles.root, pressed && styles.pressed]}
            onPress={onPress}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            testID={testID}
            testOnly_pressed={testOnlyPressed}
        >
            <Image
                source={EMBARK_SCROLL}
                style={styles.scroll}
                contentFit="contain"
                accessible={false}
                testID={testID ? `${testID}-scroll` : undefined}
            />
            {focused ? <View pointerEvents="none" style={styles.focusRing} testID={testID ? `${testID}-focus` : undefined} /> : null}
        </Pressable>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: { width: '100%' },
    pressed: { transform: [{ scale: EMBARK_PRESSED.scale }], opacity: EMBARK_PRESSED.opacity },
    scroll: { width: '100%', aspectRatio: EMBARK_SCROLL_ASPECT },
    focusRing: {
        position: 'absolute',
        top: -3,
        left: -3,
        right: -3,
        bottom: -3,
        borderWidth: 2,
        borderColor: AXM.sulfur,
        borderRadius: 4,
    },
}));

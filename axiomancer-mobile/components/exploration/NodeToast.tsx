import React, { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

interface NodeToastProps {
    tip: string;
}

/**
 * Locked / consumed node feedback toast with a fade-in entrance.
 * Fades in (opacity 0 → 1, 200ms). The parent unmounts the toast on
 * timeout; this component handles the mount-time fade-in only.
 */
export function NodeToast({ tip }: NodeToastProps) {
    const styles = useStyles();
    const opacity = useSharedValue(0);
    
    useEffect(() => {
        opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
    }, [opacity]);
    
    const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
        <Animated.View
            pointerEvents="none"
            style={[styles.nodeToast, animStyle]}
            testID="exploration-node-toast"
        >
            <Text style={styles.nodeToastText}>{tip}</Text>
        </Animated.View>
    );
}

const useStyles = makeStyles((AXM) => ({
    // Locked / consumed node feedback toast. Bottom-center, brief
    // auto-dismiss, parchment text over an ash-bordered panel.
    nodeToast: {
        position: 'absolute',
        bottom: 32,
        left: 24,
        right: 24,
        backgroundColor: AXM.panelBg,
        borderWidth: 1,
        borderColor: AXM.bone,
        padding: 10,
        alignItems: 'center',
    },
    nodeToastText: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 12,
        color: AXM.parchment,
    },
}));
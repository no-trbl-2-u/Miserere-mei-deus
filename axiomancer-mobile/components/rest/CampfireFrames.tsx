/**
 * The rest screen's fire: `campfire-05`, 24 frames of 320x320 at 80 ms,
 * looping. The frames are drawn on black, so they sit on the black rest
 * screen with no seam. Reduced motion (the OS switch or the SETTINGS choice)
 * holds frame 00 and runs no timer.
 */

import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { CAMPFIRE_05_FRAME_MS, CAMPFIRE_05_FRAMES } from '@/assets/images/screens';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Image } from '@/lib/platform/image';

/** The fire's side on screen, in points (the frames are 320 square). */
export const CAMPFIRE_SIZE = 240;

export function CampfireFrames() {
    const reduced = useReducedMotion();
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        if (reduced) {
            setFrame(0);
            return undefined;
        }
        const id = setInterval(() => {
            setFrame((f) => (f + 1) % CAMPFIRE_05_FRAMES.length);
        }, CAMPFIRE_05_FRAME_MS);
        return () => clearInterval(id);
    }, [reduced]);

    return (
        <View
            accessible={false}
            style={{ width: CAMPFIRE_SIZE, height: CAMPFIRE_SIZE }}
            testID="rest-campfire"
        >
            <Image
                source={CAMPFIRE_05_FRAMES[frame]}
                style={{ width: CAMPFIRE_SIZE, height: CAMPFIRE_SIZE }}
                contentFit="contain"
                testID={`rest-campfire-frame-${frame}`}
            />
        </View>
    );
}

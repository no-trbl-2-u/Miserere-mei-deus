/**
 * KeeperButton — one hub counter (V-02b): a brass action plate with the
 * counter's keeper standing at its right end, the keeper's head rising above
 * the plate. The label keeps clear of the keeper (`KEEPER_LABEL_INSET`), so a
 * long verb such as BLACKSMITH never runs under the figure at 375 pt.
 *
 * Inputs: `label`, `role` (the keeper whose portrait stands at the end),
 * `onPress`, `testID`, `accessibilityLabel`. Output: the plate and its keeper;
 * the keeper is decoration and never takes the press.
 */

import React from 'react';
import { View } from 'react-native';

import { keeperPortrait, type KeeperRole } from '@/assets/images/keepers';
import { BRASS_BUTTON_HEIGHT, BrassButton } from '@/components/experience/BrassButton';
import { Image } from '@/lib/platform/image';
import { makeStyles } from '@/theme/runtime';

/** The keeper's box at the plate's right end, in points. */
export const KEEPER_W = 92;
export const KEEPER_H = 104;
/** How far in from the plate's right edge the keeper stands. */
export const KEEPER_RIGHT = 6;
/** How far the keeper's head rises above the plate. */
export const KEEPER_RISE = KEEPER_H - BRASS_BUTTON_HEIGHT;
/**
 * Room the label keeps clear at its right end: the keeper's box from the
 * plate's edge, less the plate's own 30 pt end padding, plus an 8 pt gap.
 */
export const KEEPER_LABEL_INSET = KEEPER_RIGHT + KEEPER_W - 30 + 8;

export interface KeeperButtonProps {
    label: string;
    role: KeeperRole;
    onPress: () => void;
    testID: string;
    accessibilityLabel?: string;
}

export function KeeperButton({ label, role, onPress, testID, accessibilityLabel }: KeeperButtonProps) {
    const styles = useStyles();
    return (
        <View style={styles.wrap} testID={`${testID}-row`}>
            <BrassButton
                label={label}
                onPress={onPress}
                labelInsetRight={KEEPER_LABEL_INSET}
                testID={testID}
                accessibilityLabel={accessibilityLabel}
            />
            <View style={styles.keeper} pointerEvents="none" testID={`${testID}-keeper`}>
                <Image
                    source={keeperPortrait(role)}
                    style={styles.keeperImage}
                    contentFit="contain"
                    contentPosition="bottom"
                    transition={0}
                    accessible={false}
                />
            </View>
        </View>
    );
}

const useStyles = makeStyles(() => ({
    // The row reserves the keeper's rise above the plate, so the head never
    // overlaps the plate above it.
    wrap: { paddingTop: KEEPER_RISE, position: 'relative' },
    keeper: {
        position: 'absolute',
        right: KEEPER_RIGHT,
        bottom: 0,
        width: KEEPER_W,
        height: KEEPER_H,
    },
    keeperImage: { width: '100%', height: '100%' },
}));

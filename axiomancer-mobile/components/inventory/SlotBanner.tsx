import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

interface SlotBannerProps {
    bannerEyebrow: string;
    bannerSlotLabel: string;
    bannerClearLabel: string;
    onClear: () => void;
}

export function SlotBanner({ bannerEyebrow, bannerSlotLabel, bannerClearLabel, onClear }: SlotBannerProps) {
    const styles = useStyles();
    return (
        <View style={styles.slotBanner} testID="slot-filter-banner">
            <View>
                <Text style={styles.slotBannerEyebrow}>{bannerEyebrow}</Text>
                <Text style={styles.slotBannerLabel}>
                    ✦ {bannerSlotLabel}
                </Text>
            </View>
            <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Clear slot filter"
                onPress={onClear}
                style={styles.slotBannerClear}
                testID="slot-filter-clear"
            >
                <Text style={styles.slotBannerClearText}>{bannerClearLabel}</Text>
            </TouchableOpacity>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    slotBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 10,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: AXM.deepBg,
        borderWidth: 1,
        borderColor: AXM.bone,
    },
    slotBannerEyebrow: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 8,
        color: AXM.bone,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        textTransform: 'uppercase',
    },
    slotBannerLabel: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 14,
        color: AXM.parchment,
        marginTop: 2,
    },
    slotBannerClear: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: AXM.bone,
    },
    slotBannerClearText: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 9,
        color: AXM.bone,
        textTransform: 'uppercase',
    },
}));
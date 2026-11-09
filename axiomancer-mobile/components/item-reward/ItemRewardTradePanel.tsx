import React from 'react';
import { Text, View } from 'react-native';

import { EquipDeltaPanel } from '@/components/inventory/EquipDeltaPanel';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';
import type { ItemRewardTradeVM } from '@/state/presenters/item-reward.engine';
import type { EquipDelta } from '@mechanics';

/**
 * What wearing this costs, shown before the player commits.
 *
 * The numbers come from `EquipDeltaPanel` — the codebase's one stat-delta
 * view, fed the engine's `computeEquipDelta`, which in `'swap'` mode already
 * carries both sides (gained green, lost red). This component adds the half
 * that panel cannot know: the NAME of the piece coming off, and where it goes.
 * "Never let the player swap blind" is one sentence of copy plus one panel, and
 * neither is re-derived here.
 *
 * Presentational only.
 */
export interface ItemRewardTradePanelProps {
    itemId: string;
    /** `null` when the item is not equippable — the panel renders nothing. */
    delta: EquipDelta | null;
    /** `null` when the item is not equippable. */
    trade: ItemRewardTradeVM | null;
}

export function ItemRewardTradePanel({ itemId, delta, trade }: ItemRewardTradePanelProps) {
    const styles = useStyles();
    if (trade === null) return null;

    return (
        <View style={styles.block} testID={`item-reward-trade-${itemId}`}>
            <Text style={styles.eyebrow}>IF YOU WEAR IT</Text>
            {delta !== null && <EquipDeltaPanel itemId={itemId} delta={delta} />}
            <Text
                style={trade.name === null ? styles.freeNote : styles.tradeNote}
                testID="item-reward-trade-note"
            >
                {trade.note}
            </Text>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    block: {
        borderWidth: 1,
        borderRadius: 10,
        borderColor: AXM.ash,
        backgroundColor: AXM.deepBg,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginTop: 10,
    },
    eyebrow: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 8,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.sulfur,
        marginBottom: 4,
    },
    // The displaced piece is the one thing on this screen the player LOSES, so
    // it reads in the blood register the delta panel already uses for losses.
    tradeNote: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 12,
        lineHeight: 17,
        color: AXM.blood,
        marginTop: 6,
    },
    freeNote: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 12,
        lineHeight: 17,
        color: AXM.bone,
        marginTop: 6,
    },
}));

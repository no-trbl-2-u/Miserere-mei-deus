import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import { ActionIcon } from '@/components/ActionIcon';
import { ACTION_ICON_BY_TYPE, NODE_KIND_LABEL, nodePurseLines, type ExplorationNode, type ExplorationOption } from '@/state/presenters/exploration.engine';
import { SHUT_ROAD_HEAD, shutRoadQuestLine } from '@/state/presenters/quest.copy';

interface NodeConfirmPanelProps {
    /** The node the player has selected, or null when nothing is selected. */
    selected: ExplorationOption | null;
    /**
     * A tapped node behind a blocked road (a quest's gate or lock): the panel
     * names it and the road's reason, with the holding quest, and offers no
     * travel. Wins over `selected` when both are set.
     */
    shut?: ExplorationNode | null;
    onConfirm: () => void;
    onCancel: () => void;
    /** Shown when no node is selected (the drawer's empty-state line). */
    emptyMessage: string;
}

/**
 * Bottom panel for the exploration screen: instead of listing every neighbour,
 * the player taps a node on the map to SELECT it; this panel names the chosen
 * node, briefly explains what it is, and offers a Confirm button to travel
 * there. Confirm commits the move; Cancel clears the selection. At a node
 * that can charge shillings it prints the purse, so the player reads it
 * before the walk rather than inside.
 */
export function NodeConfirmPanel({ selected, shut = null, onConfirm, onCancel, emptyMessage }: NodeConfirmPanelProps) {
    const styles = useStyles();
    const AXM = usePalette();

    if (shut !== null) {
        return (
            <View style={styles.panel} testID="node-confirm-panel">
                <View style={styles.body}>
                    <View style={styles.iconWrap}>
                        <ActionIcon kind={ACTION_ICON_BY_TYPE[shut.type] ?? 'sword'} size={22} color={AXM.bone} />
                    </View>
                    <View style={styles.text}>
                        <Text style={styles.kind}>{SHUT_ROAD_HEAD}</Text>
                        <Text style={styles.name} numberOfLines={1}>{shut.label}</Text>
                        <Text style={styles.blurb} testID="node-confirm-shut-reason">{shut.blockedReason}</Text>
                        {shut.blockedBy != null && (
                            <Text style={styles.purse} testID="node-confirm-shut-quest">{shutRoadQuestLine(shut.blockedBy)}</Text>
                        )}
                    </View>
                </View>
                <View style={styles.actions}>
                    <Pressable
                        onPress={onCancel}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel selection"
                        testID="node-confirm-cancel"
                        style={styles.cancel}
                    >
                        <Text style={styles.cancelText}>BACK</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    if (selected === null) {
        return (
            <View style={styles.panel}>
                <Text style={styles.hint}>{emptyMessage}</Text>
            </View>
        );
    }

    const kindLabel = NODE_KIND_LABEL[selected.type];
    const iconKey = ACTION_ICON_BY_TYPE[selected.type] ?? 'sword';
    const purse = nodePurseLines(selected);

    return (
        <View style={styles.panel} testID="node-confirm-panel">
            <View style={styles.body}>
                <View style={styles.iconWrap}>
                    <ActionIcon kind={iconKey} size={22} color={AXM.parchment} />
                </View>
                <View style={styles.text}>
                    <Text style={styles.kind}>{kindLabel}</Text>
                    <Text style={styles.name} numberOfLines={1}>{selected.label}</Text>
                    {selected.description.length > 0 && (
                        <Text style={styles.blurb} numberOfLines={2}>{selected.description}</Text>
                    )}
                    {purse !== null && (
                        <Text style={styles.purse} testID="node-confirm-purse">
                            {purse.purse}
                            {purse.short !== null && (
                                <Text style={styles.purseShort} testID="node-confirm-purse-short">{purse.short}</Text>
                            )}
                        </Text>
                    )}
                </View>
            </View>
            <View style={styles.actions}>
                <Pressable
                    onPress={onCancel}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel selection"
                    testID="node-confirm-cancel"
                    style={styles.cancel}
                >
                    <Text style={styles.cancelText}>BACK</Text>
                </Pressable>
                <Pressable
                    onPress={onConfirm}
                    accessibilityRole="button"
                    accessibilityLabel={`Travel to ${selected.label}`}
                    testID="node-confirm-go"
                    style={styles.confirm}
                >
                    <Text style={styles.confirmText}>TRAVEL HERE</Text>
                </Pressable>
            </View>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    panel: {
        marginHorizontal: 10,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
    },
    hint: {
        fontFamily: FONTS.serifItalic,
        fontSize: 13,
        color: AXM.bone,
        textAlign: 'center',
        paddingVertical: 8,
    },
    body: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconWrap: {
        width: 34,
        alignItems: 'center',
    },
    text: { flex: 1 },
    kind: {
        fontFamily: FONTS.mono,
        fontSize: 9,
        letterSpacing: 1.5,
        color: AXM.sulfur,
    },
    name: {
        fontFamily: FONTS.gothic,
        fontSize: 16,
        color: AXM.parchment,
        marginTop: 1,
    },
    blurb: {
        fontFamily: FONTS.serifItalic,
        fontSize: 12,
        color: AXM.bone,
        marginTop: 2,
    },
    purse: {
        fontFamily: FONTS.mono,
        fontSize: 10,
        letterSpacing: 1,
        color: AXM.parchment,
        marginTop: 4,
    },
    purseShort: {
        color: AXM.blood,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 10,
    },
    cancel: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: AXM.ash,
    },
    cancelText: {
        fontFamily: FONTS.mono,
        fontSize: 11,
        letterSpacing: 1.5,
        color: AXM.bone,
    },
    confirm: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: AXM.sulfur,
        backgroundColor: AXM.selectFill,
    },
    confirmText: {
        fontFamily: FONTS.mono,
        fontSize: 11,
        letterSpacing: 1.5,
        color: AXM.sulfur,
    },
}));

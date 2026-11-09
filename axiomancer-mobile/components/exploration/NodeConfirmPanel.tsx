import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import { ActionIcon } from '@/components/ActionIcon';
import { ACTION_ICON_BY_TYPE, NODE_KIND_LABEL, nodePurseLines, type ExplorationNode, type ExplorationOption } from '@/state/presenters/exploration.engine';
import { SHUT_ROAD_HEAD, shutRoadQuestLine } from '@/state/presenters/quest.copy';
import { KitBackdrop } from '@/components/experience/KitBackdrop';
import { lookOf } from '@/components/experience/looks';
import { VELLUM_INK, INK_SOFT, VELLUM_OXBLOOD, overlay } from '@/components/exploration/wildsInk';

interface NodeConfirmPanelProps {
    /** The node the player has selected, or null when nothing is selected. */
    selected: ExplorationOption | null;
    /**
     * A tapped node behind a blocked road (a quest's gate or lock): the panel
     * names it and the road's reason, with the holding quest, and offers no
     * travel. Wins over `selected` when both are set.
     */
    shut?: ExplorationNode | null;
    /** Only reached with a node selected, so the empty slot passes neither. */
    onConfirm?: () => void;
    onCancel?: () => void;
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
    const base = useStyles();
    const vellumStyles = useVellumStyles();
    const AXM = usePalette();
    // W-02 the panel and W-03 its two buttons are vellum and ink.
    // A `normal` look keeps today's styles and draws no backdrop.
    const panelVellum = lookOf('W-02') === 'vellum';
    const buttonVellum = lookOf('W-03') === 'vellum';
    const { buttonBox, cancelText, confirmText, ...inked } = vellumStyles;
    const styles = panelVellum ? overlay(base, inked) : base;
    const btn = buttonVellum ? { box: buttonBox, cancelText, confirmText } : null;
    const iconInk = panelVellum ? VELLUM_INK : AXM.parchment;
    const iconInkShut = panelVellum ? VELLUM_OXBLOOD : AXM.bone;

    if (shut !== null) {
        return (
            <View style={styles.panel} testID="node-confirm-panel">
                {panelVellum && <KitBackdrop piece="menu-panel-vellum" />}
                <View style={styles.body}>
                    <View style={styles.iconWrap}>
                        <ActionIcon kind={ACTION_ICON_BY_TYPE[shut.type] ?? 'sword'} size={22} color={iconInkShut} />
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
                        style={[styles.cancel, btn?.box]}
                    >
                        {buttonVellum && <KitBackdrop piece="action-button-vellum" />}
                        <Text style={[styles.cancelText, btn?.cancelText]}>BACK</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    if (selected === null) {
        return (
            <View style={styles.panel}>
                {panelVellum && <KitBackdrop piece="menu-panel-vellum" />}
                <Text style={styles.hint}>{emptyMessage}</Text>
            </View>
        );
    }

    const kindLabel = NODE_KIND_LABEL[selected.type];
    const iconKey = ACTION_ICON_BY_TYPE[selected.type] ?? 'sword';
    const purse = nodePurseLines(selected);

    return (
        <View style={styles.panel} testID="node-confirm-panel">
            {panelVellum && <KitBackdrop piece="menu-panel-vellum" />}
            <View style={styles.body}>
                <View style={styles.iconWrap}>
                    <ActionIcon kind={iconKey} size={22} color={iconInk} />
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
                    style={[styles.cancel, btn?.box]}
                >
                    {buttonVellum && <KitBackdrop piece="action-button-vellum" />}
                    <Text style={[styles.cancelText, btn?.cancelText]}>BACK</Text>
                </Pressable>
                <Pressable
                    onPress={onConfirm}
                    accessibilityRole="button"
                    accessibilityLabel={`Travel to ${selected.label}`}
                    testID="node-confirm-go"
                    style={[styles.confirm, btn?.box]}
                >
                    {buttonVellum && <KitBackdrop piece="action-button-vellum" />}
                    <Text style={[styles.confirmText, btn?.confirmText]}>TRAVEL HERE</Text>
                </Pressable>
            </View>
        </View>
    );
}

/**
 * The vellum looks, laid over today's styles only where a look is worn. The
 * padding is the "inside the ruled frame" budget: the panel's corner
 * flourishes reach about 36pt in and 23pt down at its scale, so the writing
 * starts past them. Ink and oxblood only (wildsInk.ts); no gold, no amber.
 */
const useVellumStyles = makeStyles(() => ({
    panel: {
        marginHorizontal: 8,
        marginBottom: 8,
        paddingHorizontal: 30,
        paddingTop: 20,
        paddingBottom: 20,
        borderWidth: 0,
        backgroundColor: 'transparent',
    },
    hint: { color: INK_SOFT },
    kind: { color: VELLUM_OXBLOOD },
    name: { color: VELLUM_INK },
    blurb: { color: INK_SOFT },
    purse: { color: VELLUM_INK },
    purseShort: { color: VELLUM_OXBLOOD },
    buttonBox: {
        minHeight: 36,
        minWidth: 92,
        paddingHorizontal: 34,
        paddingVertical: 8,
        borderWidth: 0,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelText: { color: VELLUM_INK, letterSpacing: 1 },
    confirmText: { color: VELLUM_OXBLOOD, letterSpacing: 1 },
}));

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
        fontFamily: TYPE_ROLES.narration.fontFamily,
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
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 9,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.sulfur,
    },
    name: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 16,
        color: AXM.parchment,
        marginTop: 1,
    },
    blurb: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 12,
        color: AXM.bone,
        marginTop: 2,
    },
    purse: {
        fontFamily: TYPE_ROLES.count.fontFamily,
        fontSize: 10,
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
        fontFamily: TYPE_ROLES.button.fontFamily,
        fontSize: 11,
        letterSpacing: TYPE_ROLES.button.letterSpacing,
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
        fontFamily: TYPE_ROLES.button.fontFamily,
        fontSize: 11,
        letterSpacing: TYPE_ROLES.button.letterSpacing,
        color: AXM.sulfur,
    },
}));

/**
 * RulesGlossarySheet — the modal behind SETTINGS > RULES GLOSSARY: a
 * scrollable list of the rules a card's short lines lean on, each a term in
 * the palette's accent with its definition under it.
 *
 * Inputs: `visible`, `onClose` (the CLOSE control, the backdrop and the back
 * gesture all call it). Every word comes from `selectRulesGlossary()`, which
 * reads the shared glossary; this file holds no rule text of its own.
 */

import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SETTINGS_COPY, selectRulesGlossary } from '@/state/presenters/settings.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export interface RulesGlossarySheetProps {
    visible: boolean;
    onClose: () => void;
    testID?: string;
}

export function RulesGlossarySheet({ visible, onClose, testID = 'rules-glossary-sheet' }: RulesGlossarySheetProps) {
    const styles = useStyles();
    const entries = selectRulesGlossary();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} testID={testID}>
            <Pressable
                style={styles.backdrop}
                onPress={onClose}
                accessibilityLabel={SETTINGS_COPY.rulesGlossaryClose}
                testID={`${testID}-backdrop`}
            />
            <View style={styles.panelWrap} pointerEvents="box-none">
                <View style={styles.panel}>
                    <Text style={styles.title}>{SETTINGS_COPY.rulesGlossary}</Text>
                    <ScrollView style={styles.list} contentContainerStyle={styles.listContent} testID={`${testID}-list`}>
                        {entries.map((entry) => (
                            <View key={entry.term} style={styles.entry} testID={`${testID}-entry`}>
                                <Text style={styles.term}>{entry.term}</Text>
                                <Text style={styles.def}>{entry.def}</Text>
                            </View>
                        ))}
                    </ScrollView>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={SETTINGS_COPY.rulesGlossaryClose}
                        onPress={onClose}
                        style={styles.closeButton}
                        testID={`${testID}-close`}
                    >
                        <Text style={styles.closeLabel}>{SETTINGS_COPY.rulesGlossaryClose}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const useStyles = makeStyles((AXM) => ({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: AXM.bg, opacity: 0.85 },
    panelWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },
    panel: {
        flexShrink: 1,
        backgroundColor: AXM.panelBg,
        borderWidth: 1,
        borderColor: AXM.ash,
        borderLeftWidth: 3,
        paddingVertical: 16,
        paddingHorizontal: 16,
        gap: 10,
    },
    title: { fontFamily: TYPE_ROLES.title.fontFamily, fontSize: 22, color: AXM.parchment },
    list: { flexGrow: 0 },
    listContent: { gap: 12 },
    entry: { gap: 2 },
    term: { fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 13, letterSpacing: 1.5, color: AXM.sulfur },
    def: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 13, color: AXM.parchment },
    closeButton: { borderWidth: 1, borderColor: AXM.ash, borderStyle: 'dashed', paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', marginTop: 4 },
    closeLabel: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 13, letterSpacing: 1.5, color: AXM.bone },
}));

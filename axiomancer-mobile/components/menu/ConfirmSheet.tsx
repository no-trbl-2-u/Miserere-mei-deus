/**
 * ConfirmSheet — the one modal the menu chrome uses for irreversible
 * choices (overwrite a chronicle, clear a chronicle). Styled after
 * `CorruptSaveModal`: blood-edged panel, lowercase ritual body, two verbs.
 *
 * Inputs: `visible`, `title`, `body`, `confirmLabel`, `cancelLabel`,
 * `onConfirm`, `onCancel`. Copy is passed in — this component prints, it
 * does not author.
 */

import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export interface ConfirmSheetProps {
    visible: boolean;
    title: string;
    body: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    testID?: string;
}

export function ConfirmSheet({
    visible, title, body, confirmLabel, cancelLabel, onConfirm, onCancel, testID = 'confirm-sheet',
}: ConfirmSheetProps) {
    const styles = useStyles();
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} testID={testID}>
            <View style={styles.backdrop} />
            <View style={styles.panelWrap} pointerEvents="box-none">
                <View style={styles.panel}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.body}>{body}</Text>
                    <View style={styles.actions}>
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={confirmLabel}
                            onPress={onConfirm}
                            style={[styles.button, styles.confirmButton]}
                            testID={`${testID}-confirm`}
                        >
                            <Text style={[styles.buttonLabel, styles.confirmLabel]}>{confirmLabel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={cancelLabel}
                            onPress={onCancel}
                            style={[styles.button, styles.cancelButton]}
                            testID={`${testID}-cancel`}
                        >
                            <Text style={[styles.buttonLabel, styles.cancelLabel]}>{cancelLabel}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const useStyles = makeStyles((AXM) => ({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: AXM.bg, opacity: 0.85 },
    panelWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
    panel: {
        backgroundColor: AXM.panelBg,
        borderWidth: 1,
        borderColor: AXM.blood,
        borderLeftWidth: 3,
        paddingVertical: 18,
        paddingHorizontal: 18,
    },
    title: { fontFamily: TYPE_ROLES.title.fontFamily, fontSize: 22, color: AXM.parchment },
    body: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 13, color: AXM.bone, marginTop: 12, lineHeight: 18 },
    actions: { marginTop: 18, gap: 8 },
    button: { borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
    confirmButton: { borderColor: AXM.blood, backgroundColor: AXM.bg },
    cancelButton: { borderColor: AXM.ash, borderStyle: 'dashed', backgroundColor: 'transparent' },
    buttonLabel: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 13, letterSpacing: TYPE_ROLES.button.letterSpacing},
    confirmLabel: { color: AXM.blood },
    cancelLabel: { color: AXM.bone },
}));

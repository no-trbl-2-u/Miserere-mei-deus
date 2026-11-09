/**
 * Save-corrupted prompt modal.
 *
 * Mounts at the root layout when `persistenceAdapter.preload()`
 * rejects (corrupt JSON, mismatched schema version, future-version
 * save, etc.). Pure display — the host (`app/_layout.tsx`) owns
 * the failure state + the confirm/cancel callbacks.
 *
 * Voice register: lowercase ritual. No second-person
 * archaic pronouns. Copy lives on the component (not the
 * presenter) because there's no game-state presenter responsible
 * for boot-time chrome.
 */

import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export const CORRUPT_SAVE_COPY = {
    eyebrow: 'THE PAGE WAS TORN',
    title: 'begin anew?',
    body:
        'the saved chronicle could not be read. resume from a fresh start, or keep this prompt open and reach the keeper for aid.',
    confirmLabel: 'BEGIN ANEW',
    cancelLabel: 'KEEP THE PROMPT',
};

export interface CorruptSaveModalProps {
    visible: boolean;
    /** Clears the corrupt slot + boots fresh. */
    onConfirm: () => void;
    /** Leaves the modal mounted so the user can troubleshoot. */
    onCancel: () => void;
}

export function CorruptSaveModal({ visible, onConfirm, onCancel }: CorruptSaveModalProps) {
    const styles = useStyles();
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            // Android hardware-back press is intentionally a no-op — the
            // user must explicitly choose Confirm or Cancel.
            onRequestClose={() => undefined}
            testID="corrupt-save-modal"
        >
            <View style={styles.backdrop} />
            <View style={styles.panelWrap} pointerEvents="box-none">
                <View style={styles.panel}>
                    <Text style={styles.eyebrow}>{CORRUPT_SAVE_COPY.eyebrow}</Text>
                    <Text style={styles.title}>{CORRUPT_SAVE_COPY.title}</Text>
                    <Text style={styles.body}>{CORRUPT_SAVE_COPY.body}</Text>
                    <View style={styles.actions}>
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={CORRUPT_SAVE_COPY.confirmLabel}
                            onPress={onConfirm}
                            style={[styles.button, styles.confirmButton]}
                            testID="corrupt-save-confirm"
                        >
                            <Text style={[styles.buttonLabel, styles.confirmLabel]}>
                                {CORRUPT_SAVE_COPY.confirmLabel}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={CORRUPT_SAVE_COPY.cancelLabel}
                            onPress={onCancel}
                            style={[styles.button, styles.cancelButton]}
                            testID="corrupt-save-cancel"
                        >
                            <Text style={[styles.buttonLabel, styles.cancelLabel]}>
                                {CORRUPT_SAVE_COPY.cancelLabel}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const useStyles = makeStyles((AXM) => ({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: AXM.bg,
        opacity: 0.85,
    },
    panelWrap: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
    },
    panel: {
        backgroundColor: AXM.panelBg,
        borderWidth: 1,
        borderColor: AXM.blood,
        borderLeftWidth: 3,
        paddingVertical: 18,
        paddingHorizontal: 18,
    },
    eyebrow: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 9,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.blood,
    },
    title: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 22,
        color: AXM.parchment,
        marginTop: 6,
    },
    body: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 13,
        color: AXM.bone,
        marginTop: 12,
        lineHeight: 18,
    },
    actions: {
        marginTop: 18,
        gap: 8,
    },
    button: {
        borderWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    confirmButton: {
        borderColor: AXM.blood,
        backgroundColor: AXM.bg,
    },
    cancelButton: {
        borderColor: AXM.ash,
        borderStyle: 'dashed',
        backgroundColor: 'transparent',
    },
    buttonLabel: {
        fontFamily: TYPE_ROLES.button.fontFamily,
        fontSize: 13,
        letterSpacing: TYPE_ROLES.button.letterSpacing,
    },
    confirmLabel: { color: AXM.blood },
    cancelLabel: { color: AXM.bone },
}));

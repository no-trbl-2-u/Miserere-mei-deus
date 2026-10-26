import React from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity } from 'react-native';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import { TooltipProvider } from '@/components/tooltip/TooltipProvider';
import type { ItemModalViewModel } from '@/state/presenters/inventory.modal.engine';

interface ItemModalProps {
    modalVm: ItemModalViewModel | null;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ItemModal({ modalVm, onConfirm, onCancel }: ItemModalProps) {
    const styles = useStyles();
    const AXM = usePalette();
    return (
        <Modal
            visible={modalVm !== null}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <TooltipProvider>
                <Pressable style={styles.modalBackdrop} onPress={onCancel}>
                    <Pressable style={styles.modalCard} onPress={() => undefined}>
                        {modalVm !== null && (
                            <>
                                <Text style={styles.modalTitle}>{modalVm.name}</Text>
                                <Text style={styles.modalDesc}>&ldquo;{modalVm.description}&rdquo;</Text>
                                {modalVm.previewLines.length > 0 && (
                                    <View style={styles.modalPreviewBlock}>
                                        {modalVm.previewLines.map((line, i) => (
                                            <Text key={i} style={styles.modalPreview}>{line}</Text>
                                        ))}
                                    </View>
                                )}
                                {modalVm.itemModifiers.length > 0 && (
                                    <View style={styles.modalModBlock} testID="item-modifier-list">
                                        <Text style={styles.modalModEyebrow}>MODIFIERS</Text>
                                        {modalVm.itemModifiers.map((m, i) => (
                                            <Text
                                                key={`${m.label}-${i}`}
                                                style={styles.modalModLine}
                                            >
                                                {m.label}
                                            </Text>
                                        ))}
                                    </View>
                                )}
                                {modalVm.statDeltas.length > 0 && (
                                    <View style={styles.modalStatTable}>
                                        {modalVm.statDeltas.map((d) => (
                                            <View key={d.label} style={styles.modalStatRow}>
                                                <Text style={styles.modalStatLabel}>{d.label}</Text>
                                                <Text style={styles.modalStatVal}>
                                                    {d.before} → {d.after}
                                                    {d.delta === 0 ? '' : ` (${d.delta > 0 ? '+' : ''}${d.delta})`}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                                {modalVm.effectDeltas.length > 0 && (
                                    <View style={styles.modalEffectBlock}>
                                        {modalVm.effectDeltas.map((e, i) => (
                                            <Text
                                                key={`${e.direction}-${e.label}-${i}`}
                                                style={[
                                                    styles.modalEffectLine,
                                                    e.direction === 'gained'
                                                        ? styles.modalEffectGain
                                                        : styles.modalEffectLoss,
                                                ]}
                                            >
                                                {e.direction === 'gained' ? '+ ' : '− '}
                                                {e.label}
                                            </Text>
                                        ))}
                                    </View>
                                )}
                                {modalVm.notWornLine !== null && (
                                    <Text style={styles.modalNotWorn} testID="modal-not-worn">
                                        {modalVm.notWornLine}
                                    </Text>
                                )}
                                {modalVm.confirmPrompt !== '' && (
                                    <Text style={styles.modalPrompt}>{modalVm.confirmPrompt}</Text>
                                )}
                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        accessibilityRole="button"
                                        accessibilityLabel="Cancel"
                                        onPress={onCancel}
                                        style={[styles.modalBtn, styles.modalBtnCancel]}
                                    >
                                        <Text style={[styles.modalBtnText, { color: AXM.bone }]}>CANCEL</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        accessibilityRole="button"
                                        accessibilityLabel={modalVm.confirmLabel}
                                        onPress={onConfirm}
                                        style={styles.modalBtn}
                                        testID="modal-confirm"
                                    >
                                        <Text style={styles.modalBtnText}>{modalVm.confirmLabel}</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </Pressable>
                </Pressable>
            </TooltipProvider>
        </Modal>
    );
}

const useStyles = makeStyles((AXM) => ({
    modalBackdrop: {
        flex: 1,
        backgroundColor: AXM.shadow,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
    },
    modalCard: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: AXM.panelBg,
        borderWidth: 1,
        borderColor: AXM.parchment,
        padding: 16,
    },
    modalTitle: {
        fontFamily: FONTS.gothic,
        fontSize: 20,
        color: AXM.parchment,
        letterSpacing: 1,
    },
    modalDesc: {
        fontFamily: FONTS.serifItalic,
        fontSize: 12,
        color: AXM.bone,
        marginTop: 4,
    },
    modalPreviewBlock: {
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: AXM.ash,
        borderStyle: 'dashed',
    },
    modalPreview: {
        fontFamily: FONTS.serif,
        fontSize: 12,
        color: AXM.parchment,
        lineHeight: 16,
    },
    modalStatTable: {
        marginTop: 8,
        padding: 8,
        backgroundColor: AXM.deepBg,
        borderWidth: 1,
        borderColor: AXM.ash,
    },
    modalStatRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 1,
    },
    modalStatLabel: {
        fontFamily: FONTS.sans,
        fontSize: 10,
        letterSpacing: 1,
        color: AXM.bone,
    },
    modalStatVal: {
        fontFamily: FONTS.mono,
        fontSize: 11,
        color: AXM.parchment,
    },
    modalModBlock: {
        marginTop: 8,
        padding: 8,
        backgroundColor: AXM.deepBg,
        borderWidth: 1,
        borderColor: AXM.ash,
    },
    modalModEyebrow: {
        fontFamily: FONTS.mono,
        fontSize: 8,
        letterSpacing: 1.4,
        color: AXM.bone,
        marginBottom: 4,
    },
    modalModLine: {
        fontFamily: FONTS.mono,
        fontSize: 11,
        lineHeight: 15,
        color: AXM.sulfur,
    },
    modalEffectBlock: {
        marginTop: 8,
        padding: 8,
        backgroundColor: AXM.deepBg,
        borderWidth: 1,
        borderColor: AXM.ash,
    },
    modalEffectLine: {
        fontFamily: FONTS.mono,
        fontSize: 11,
        lineHeight: 15,
    },
    modalEffectGain: {
        color: AXM.heal,
    },
    modalEffectLoss: {
        color: AXM.blood,
    },
    modalNotWorn: {
        fontFamily: FONTS.sans,
        fontSize: 12,
        letterSpacing: 0.5,
        color: AXM.rust,
        marginBottom: 6,
    },
    modalPrompt: {
        fontFamily: FONTS.serifItalic,
        fontSize: 13,
        color: AXM.parchment,
        marginTop: 12,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 14,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: AXM.parchment,
        alignItems: 'center',
    },
    modalBtnCancel: {
        borderColor: AXM.bone,
    },
    modalBtnText: {
        fontFamily: FONTS.gothic,
        fontSize: 13,
        letterSpacing: 1.5,
        color: AXM.parchment,
    },
}));
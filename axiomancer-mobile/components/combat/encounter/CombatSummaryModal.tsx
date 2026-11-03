/**
 * Post-combat attribution summary.
 *
 * Every fight (win OR loss) shows which cards dealt the enemy damage, naming
 * the best card. Only damage is attributed, so a GUARD card never has a row.
 * Engine-built (`buildCombatSummary`); this is pure presentation.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { CombatSummary } from '@mechanics';
import { summaryShillingsLabel, summaryShillingsValue } from '@/components/combat/encounter/combat-summary.copy';
import type { SpareSummaryLine } from '@/state/presenters/spare-reward.engine';
import { FONTS, HUE } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

/** "1 play", "12 plays". */
export function playsLabel(n: number): string {
    return `${n} ${n === 1 ? 'play' : 'plays'}`;
}

const OUTCOME_COLOR: Record<string, string> = {
    victory: HUE.boonGreen, mercy: HUE.tickPurple,
    defeat: HUE.defeatRed, retreat: HUE.retreatBone,
};

export function CombatSummaryModal({ summary, shillings = 0, spareLines, onClose }: { summary: CombatSummary; shillings?: number; spareLines?: readonly SpareSummaryLine[]; onClose: () => void }) {
    const styles = useStyles();
    const AXM = usePalette();
    const color = OUTCOME_COLOR[summary.outcome] ?? AXM.parchment;
    return (
        <View style={styles.backdrop} testID="combat-summary">
            <View style={[styles.panel, { borderColor: color }]}>
                <Text style={[styles.headline, { color }]}>{summary.headline}</Text>

                {summary.rows.length > 0 && <Text style={styles.rowsHead}>DAMAGE BY CARD</Text>}
                <View style={styles.rows}>
                    {summary.rows.length === 0 && (
                        <>
                            <Text style={styles.noRows}>No status effects contributed.</Text>
                            <Text style={styles.coach}>POWER a status card with a die each turn — DoT wears the enemy down and control skips its turns. Basic strikes alone will not close it.</Text>
                        </>
                    )}
                    {summary.rows.slice(0, 6).map(row => (
                        <View key={row.cardId} style={styles.row} testID={`combat-summary-row-${row.cardId}`}>
                            <Text style={styles.rowName} numberOfLines={1}>{row.name}</Text>
                            <Text style={styles.rowVal}>
                                {row.dotDamage > 0 ? `${row.dotDamage} dmg` : `${row.damageDealt} dmg`}
                                {row.phases > 0 && <Text style={{ color: AXM.bone }}> · {playsLabel(row.phases)}</Text>}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={styles.totals}>
                    {summary.totalDotDamage > 0 && (
                        <Text style={styles.total} testID="combat-summary-dot-total">Total DoT damage: <Text style={{ color: AXM.parchment }}>{summary.totalDotDamage}</Text></Text>
                    )}
                    <Text style={styles.total}>Direct damage: <Text style={{ color: AXM.parchment }}>{summary.directDamage}</Text></Text>
                    {shillings > 0 && (
                        <Text style={styles.total} testID="combat-summary-shillings">{summaryShillingsLabel} <Text style={{ color: AXM.sulfur }}>{summaryShillingsValue(shillings)}</Text></Text>
                    )}
                    {spareLines?.map(line => (
                        <Text key={line.key} style={styles.total} testID={`combat-summary-spare-${line.key}`}>{line.label} <Text style={{ color: AXM.sulfur }}>{line.value}</Text></Text>
                    ))}
                </View>

                {summary.bestCard.length > 0 && (
                    <Text style={[styles.best, { color }]} testID="combat-summary-best">★ Best card: {summary.bestCard}</Text>
                )}

                <Pressable onPress={onClose} testID="combat-summary-close" accessibilityRole="button" accessibilityLabel="Continue" style={[styles.btn, { borderColor: color }]}>
                    <Text style={[styles.btnText, { color }]}>CONTINUE</Text>
                </Pressable>
            </View>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    backdrop: { ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const), backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 },
    panel: { width: '100%', maxWidth: 420, borderWidth: 2, backgroundColor: AXM.panelBg, padding: 16 },
    headline: { fontFamily: FONTS.gothic, fontSize: 20, letterSpacing: 0.5, textAlign: 'center', marginBottom: 12 },
    rowsHead: { fontFamily: FONTS.sans, fontSize: 11, letterSpacing: 1, color: AXM.bone, marginBottom: 4 },
    rows: { gap: 5, marginBottom: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderBottomWidth: 1, borderBottomColor: AXM.ash, paddingBottom: 3 },
    rowName: { flex: 1, fontFamily: FONTS.serif, fontSize: 14, color: AXM.parchment },
    rowVal: { fontFamily: FONTS.mono, fontSize: 12, color: AXM.sulfur },
    noRows: { fontFamily: FONTS.serifItalic, fontStyle: 'italic', fontSize: 13, color: AXM.bone, textAlign: 'center' },
    coach: { fontFamily: FONTS.sans, fontSize: 11, color: HUE.payoffGold, textAlign: 'center', lineHeight: 15, marginTop: 6, paddingHorizontal: 4, letterSpacing: 0.2 },
    totals: { gap: 2, marginBottom: 8 },
    total: { fontFamily: FONTS.sans, fontSize: 12, color: AXM.bone },
    best: { fontFamily: FONTS.sans, fontSize: 13, letterSpacing: 0.6, textAlign: 'center', marginBottom: 12 },
    btn: { borderWidth: 2, paddingVertical: 9, alignItems: 'center' },
    btnText: { fontFamily: FONTS.gothic, fontSize: 16, letterSpacing: 1 },
}));

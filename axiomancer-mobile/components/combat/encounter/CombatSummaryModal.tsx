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
import { DEFEAT_CONTINUE_LABEL, defeatCauseLine, summaryShillingsLabel, summaryShillingsValue } from '@/components/combat/encounter/combat-summary.copy';
import type { SpareSummaryLine } from '@/state/presenters/spare-reward.engine';
import { HUE, TYPE_ROLES } from '@/theme/axm';
import { BrassButton } from '@/components/experience/BrassButton';
import { KitBackdrop } from '@/components/experience/KitBackdrop';
import { lookOf } from '@/components/experience/looks';
import { SpoilsButton } from '@/components/combat/encounter/SpoilsButton';
import { OUTCOME_INK, SPOILS_INK } from '@/components/combat/encounter/spoils-ink';
import { makeStyles, usePalette } from '@/theme/runtime';

/** "1 play", "12 plays". */
export function playsLabel(n: number): string {
    return `${n} ${n === 1 ? 'play' : 'plays'}`;
}

const OUTCOME_COLOR: Record<string, string> = {
    victory: HUE.boonGreen, mercy: HUE.tickPurple,
    defeat: HUE.defeatRed, retreat: HUE.retreatBone,
};

/** The panel (P-01) and CONTINUE (P-02) read their looks from the table, so
 *  flipping a place to normal restores today's code path. */
const VELLUM_PANEL = lookOf('P-01') === 'vellum';
const VELLUM_CONTINUE = lookOf('P-02') === 'vellum';

export function CombatSummaryModal({ summary, shillings = 0, spareLines, mercyLine, onClose }: { summary: CombatSummary; shillings?: number; spareLines?: readonly SpareSummaryLine[]; mercyLine?: string; onClose: () => void }) {
    const styles = useStyles();
    const AXM = usePalette();
    // A lost fight wears the house look: the dark ground in place of
    // the vellum panel, and CONTINUE on the brass plate. Wins and spares keep
    // today's panel until the victory screen (FE1b) takes them.
    const house = summary.outcome === 'defeat';
    const v = VELLUM_PANEL && !house;
    const color = v ? (OUTCOME_INK[summary.outcome] ?? SPOILS_INK.body) : (OUTCOME_COLOR[summary.outcome] ?? AXM.parchment);
    const btnColor = VELLUM_CONTINUE ? (OUTCOME_INK[summary.outcome] ?? SPOILS_INK.body) : color;
    return (
        <View style={[styles.backdrop, house && styles.houseBackdrop]} testID="combat-summary">
            <View style={house ? styles.housePanel : v ? styles.vPanel : [styles.panel, { borderColor: color }]}>
                {v && <KitBackdrop piece="modal-panel-vellum" />}
                <Text style={[styles.headline, v && styles.vHeadline, { color }]}>{summary.headline}</Text>
                {house && defeatCauseLine(summary.defeatCause) !== '' && (
                    <Text style={styles.cause} testID="combat-summary-cause">{defeatCauseLine(summary.defeatCause)}</Text>
                )}

                {summary.rows.length > 0 && <Text style={[styles.rowsHead, v && styles.vRowsHead]}>DAMAGE BY CARD</Text>}
                <View style={styles.rows}>
                    {summary.rows.length === 0 && (
                        <>
                            <Text style={[styles.noRows, v && styles.vSoft]}>No status effects contributed.</Text>
                            <Text style={[styles.coach, v && styles.vCoach]}>POWER a status card with a die each turn — DoT wears the enemy down and control skips its turns. Basic strikes alone will not close it.</Text>
                        </>
                    )}
                    {summary.rows.slice(0, 6).map(row => (
                        <View key={row.cardId} style={[styles.row, v && styles.vRow]} testID={`combat-summary-row-${row.cardId}`}>
                            <Text style={[styles.rowName, v && styles.vBody]} numberOfLines={1}>{row.name}</Text>
                            <Text style={[styles.rowVal, v && styles.vRowVal]}>
                                {row.dotDamage > 0 ? `${row.dotDamage} dmg` : `${row.damageDealt} dmg`}
                                {row.phases > 0 && <Text style={{ color: v ? SPOILS_INK.soft : AXM.bone }}> · {playsLabel(row.phases)}</Text>}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={styles.totals}>
                    {summary.totalDotDamage > 0 && (
                        <Text style={[styles.total, v && styles.vTotal]} testID="combat-summary-dot-total">Total DoT damage: <Text style={{ color: v ? SPOILS_INK.body : AXM.parchment }}>{summary.totalDotDamage}</Text></Text>
                    )}
                    <Text style={[styles.total, v && styles.vTotal]}>Direct damage: <Text style={{ color: v ? SPOILS_INK.body : AXM.parchment }}>{summary.directDamage}</Text></Text>
                    {shillings > 0 && (
                        <Text style={[styles.total, v && styles.vTotal]} testID="combat-summary-shillings">{summaryShillingsLabel} <Text style={{ color: v ? SPOILS_INK.accent : AXM.sulfur }}>{summaryShillingsValue(shillings)}</Text></Text>
                    )}
                    {spareLines?.map(line => (
                        <Text key={line.key} style={[styles.total, v && styles.vTotal]} testID={`combat-summary-spare-${line.key}`}>{line.label} <Text style={{ color: v ? SPOILS_INK.accent : AXM.sulfur }}>{line.value}</Text></Text>
                    ))}
                </View>

                {mercyLine && (
                    <Text style={[styles.mercyLine, v && styles.vBody]} testID="combat-summary-mercy-line">{mercyLine}</Text>
                )}

                {summary.bestCard.length > 0 && (
                    <Text style={[styles.best, { color }]} testID="combat-summary-best">★ Best card: {summary.bestCard}</Text>
                )}

                {house ? (
                    <BrassButton label={DEFEAT_CONTINUE_LABEL} align="center" onPress={onClose} testID="combat-summary-close" accessibilityLabel="Continue" style={styles.houseBtn} />
                ) : VELLUM_CONTINUE ? (
                    <SpoilsButton onPress={onClose} testID="combat-summary-close" accessibilityRole="button" accessibilityLabel="Continue" style={styles.vBtn}>
                        <Text style={[styles.btnText, { color: btnColor }]}>CONTINUE</Text>
                    </SpoilsButton>
                ) : (
                    <Pressable onPress={onClose} testID="combat-summary-close" accessibilityRole="button" accessibilityLabel="Continue" style={[styles.btn, { borderColor: color }]}>
                        <Text style={[styles.btnText, { color }]}>CONTINUE</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    backdrop: { ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const), backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 },
    panel: { width: '100%', maxWidth: 420, borderWidth: 2, backgroundColor: AXM.panelBg, padding: 16 },
    headline: { fontFamily: TYPE_ROLES.sectionHead.fontFamily, fontSize: 20, textAlign: 'center', marginBottom: 12 },
    rowsHead: { fontFamily: TYPE_ROLES.sectionHead.fontFamily, fontSize: 11, color: AXM.bone, marginBottom: 4 },
    rows: { gap: 5, marginBottom: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderBottomWidth: 1, borderBottomColor: AXM.ash, paddingBottom: 3 },
    rowName: { flex: 1, fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 14, color: AXM.parchment },
    rowVal: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 12, color: AXM.sulfur },
    noRows: { fontFamily: TYPE_ROLES.narration.fontFamily, fontStyle: 'italic', fontSize: 13, color: AXM.bone, textAlign: 'center' },
    coach: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 11, color: HUE.payoffGold, textAlign: 'center', lineHeight: 15, marginTop: 6, paddingHorizontal: 4, letterSpacing: 0.2 },
    totals: { gap: 2, marginBottom: 8 },
    total: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 12, color: AXM.bone },
    mercyLine: { fontFamily: TYPE_ROLES.narration.fontFamily, fontStyle: 'italic', fontSize: 13, color: AXM.parchment, textAlign: 'center', lineHeight: 18, marginBottom: 10 },
    best: { fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 13, letterSpacing: TYPE_ROLES.eyebrow.letterSpacing, textAlign: 'center', marginBottom: 12 },
    btn: { borderWidth: 2, paddingVertical: 9, alignItems: 'center' },
    btnText: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 16, letterSpacing: TYPE_ROLES.button.letterSpacing},

    // The house look: the screen's dark ground, no panel, the brass plate.
    houseBackdrop: { backgroundColor: AXM.deepBg },
    housePanel: { width: '100%', maxWidth: 420, padding: 16 },
    cause: { fontFamily: TYPE_ROLES.narration.fontFamily, fontStyle: 'italic', fontSize: 14, color: AXM.bone, textAlign: 'center', marginTop: -4, marginBottom: 14 },
    houseBtn: { alignSelf: 'stretch', marginTop: 4 },

    // Vellum & Ink. The panel art is 741x437 drawn at 0.3: 42pt of side
    // ornament, 26pt of top and bottom. Body faces are today's size or larger.
    vPanel: { width: '100%', maxWidth: 420, paddingHorizontal: 40, paddingVertical: 34 },
    vHeadline: { fontSize: 22, marginBottom: 12 },
    vRowsHead: { fontSize: 12, color: SPOILS_INK.soft },
    vRow: { borderBottomColor: HUE.vellumShadow },
    vBody: { color: SPOILS_INK.body },
    vSoft: { color: SPOILS_INK.soft, fontSize: 14 },
    vRowVal: { fontSize: 13, color: SPOILS_INK.accent },
    vCoach: { fontSize: 12, lineHeight: 16, color: SPOILS_INK.accent },
    vTotal: { fontSize: 13, color: SPOILS_INK.soft },
    vBtn: { flex: 0, alignSelf: 'stretch', marginTop: 4 },
}));

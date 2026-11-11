/**
 * The quest card: one tall card in the card face's frame (D91): the gold
 * border and rounded corners, the step's name on a band at the top, the
 * giver's figure edge to edge as its art, the ask under it and the pay at its
 * foot. It is not a playable card: no FREE pill, no die line.
 *
 * It carries every moment of a step; the screen picks what to show. The
 * giver's figure dims while the giver turns the player away. While a step is
 * under way (accepted, not yet turned in) a small gold mark rides the name
 * band; no other state wears a head (T, 2026-11-11, on the spec's #2).
 */

import React from 'react';
import { Image, Text, View } from 'react-native';

import { giverFigure } from '@/assets/images/givers';
import { ItemGlyph } from '@/components/inventory/ItemCard';
import type { QuestGiverVM, QuestPayVM, QuestStepVM } from '@/state/presenters/quest.engine';
import { questShillingsLine, questXpLine } from '@/state/presenters/quest.copy';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export interface QuestCardProps {
    step: QuestStepVM;
    pay: QuestPayVM | null;
    giver: QuestGiverVM | null;
    /** True while the giver turns the player away: the figure dims. */
    turnedAway: boolean;
    /** True while the step is accepted and not turned in: the name band wears the gold mark. */
    underway: boolean;
    width: number;
    height: number;
    testID: string;
}

export function QuestCard({ step, pay, giver, turnedAway, underway, width, height, testID }: QuestCardProps) {
    const styles = useStyles();
    return (
        <View style={[styles.outer, { width, height }]} testID={testID}>
            <View style={styles.card}>
                <View style={styles.band}>
                    <Text style={styles.name} numberOfLines={1} testID="quest-card-name">{step.name}</Text>
                    {underway && (
                        <View
                            style={styles.mark}
                            accessible
                            accessibilityLabel="Under way"
                            testID="quest-card-underway"
                        />
                    )}
                </View>
                <View style={styles.art} testID={giver ? (turnedAway ? 'quest-giver-turned-away' : 'quest-giver') : 'quest-card-art'}>
                    {giver && (
                        <Image
                            source={giverFigure(giver.portrait)}
                            style={[styles.figure, turnedAway && styles.figureAway]}
                            accessibilityLabel={giver.name}
                            testID="quest-giver-portrait"
                            resizeMode="cover"
                        />
                    )}
                </View>
                <View style={styles.text}>
                    {step.objectives.map(o => (
                        <View key={o.id} style={styles.objectiveRow} testID={`${testID}-objective-${o.id}`}>
                            <Text style={styles.ask}>{o.description}</Text>
                            {o.progress !== '' && (
                                <Text style={[styles.progress, o.done && styles.progressDone]}>{o.progress}</Text>
                            )}
                        </View>
                    ))}
                </View>
                {pay && (
                    <View style={styles.pay} testID="quest-card-pay">
                        {pay.experience > 0 && <Text style={styles.xp}>{questXpLine(pay.experience)}</Text>}
                        {pay.currency > 0 && <Text style={styles.xp}>{questShillingsLine(pay.currency)}</Text>}
                        {pay.items.map(item => (
                            <View key={item.id} style={styles.item} testID={`quest-card-pay-item-${item.id}`}>
                                <ItemGlyph category={item.category === 'quest-item' ? 'quest' : item.category} sub={item.sub} itemId={item.id} size={22} />
                                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    outer: { alignSelf: 'center' },
    card: { flex: 1, borderWidth: 1.5, borderRadius: 4, borderColor: AXM.sulfur, backgroundColor: AXM.bg, overflow: 'hidden' },
    band: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 10, backgroundColor: AXM.panelBg },
    name: { flexShrink: 1, fontFamily: TYPE_ROLES.cardName.fontFamily, fontSize: 16, color: AXM.parchment, textAlign: 'center' },
    mark: { width: 9, height: 9, borderRadius: 5, marginLeft: 8, backgroundColor: AXM.sulfur },
    art: { flex: 1, backgroundColor: AXM.bg },
    figure: { width: '100%', height: '100%' },
    figureAway: { opacity: 0.35 },
    text: { paddingHorizontal: 10, paddingTop: 8 },
    objectiveRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
    ask: { flex: 1, fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 13, lineHeight: 18, color: AXM.parchment },
    progress: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 13, color: AXM.bone },
    progressDone: { color: AXM.sulfur },
    pay: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8 },
    xp: { fontFamily: TYPE_ROLES.chip.fontFamily, fontSize: 14, color: AXM.sulfur },
    item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    itemName: { fontFamily: TYPE_ROLES.chip.fontFamily, fontSize: 13, color: AXM.parchment, flexShrink: 1 },
}));

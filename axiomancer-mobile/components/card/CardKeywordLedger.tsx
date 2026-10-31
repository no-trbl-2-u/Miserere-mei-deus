/**
 * The ONE keyword ledger every card detail floats above its card.
 *
 * Combat, the rewards preview, the deck screen and the hazard deck all show a
 * card at detail size; each used to carry its own keyword rows. This is the
 * shared component: hairline-separated rows on the dimmed backdrop, OUTSIDE
 * the card's panel or frame and ahead of it in render order, so a player reads
 * what a keyword means before the card that uses it. The list is capped and
 * scrolls, so a many-keyword card never pushes the card or its buttons off a
 * small phone.
 *
 * Inputs: `keywords` - name, definition and an optional `minor` flag (a rider
 * that is minor right now); `typeTagFor(index)` - the right-aligned type tag
 * for a row (default `KEYWORD`); `testID`.
 * Outputs: the ledger, or nothing for an empty list. Renders only; it derives
 * no card text.
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FONTS, HUE } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export interface CardKeywordLedgerEntry {
    name: string;
    def: string;
    /** A rider that does little right now; the row dims and says so. */
    minor?: boolean;
}

export interface CardKeywordLedgerProps {
    keywords: readonly CardKeywordLedgerEntry[];
    /** Type tag for the row at `index`; defaults to `KEYWORD` for every row. */
    typeTagFor?: (index: number) => string;
    testID?: string;
}

/** Tag colours by tag word. An unknown tag falls back to the bone ink. */
export const KEYWORD_TAG_COLORS: Record<string, string> = {
    DOT: HUE.damageRed,
    CONTROL: HUE.tickPurple,
    GUARD: HUE.guardSteel,
    MERCY: HUE.boonGreen,
    EFFECT: HUE.stoneGrey,
    DICE: HUE.markGold,
};

export const DEFAULT_KEYWORD_TAG = 'KEYWORD';

/** Height cap in points: about three rows, then the ledger scrolls. */
export const LEDGER_MAX_HEIGHT = 170;

export function CardKeywordLedger({ keywords, typeTagFor, testID }: CardKeywordLedgerProps) {
    const styles = useStyles();
    if (keywords.length === 0) return null;
    return (
        <View style={styles.ledger} testID={testID ?? 'card-keyword-ledger'}>
            <ScrollView nestedScrollEnabled style={styles.scroll} showsVerticalScrollIndicator={false}>
                {keywords.map((k, i) => {
                    const tag = typeTagFor ? typeTagFor(i) : DEFAULT_KEYWORD_TAG;
                    return (
                        <View key={k.name} style={[styles.row, i > 0 ? styles.rowSep : null]} testID="card-keyword-row">
                            <View style={styles.head}>
                                <Text style={[styles.name, k.minor ? styles.nameMinor : null]}>{k.name}</Text>
                                <Text style={[styles.tag, KEYWORD_TAG_COLORS[tag] ? { color: KEYWORD_TAG_COLORS[tag] } : null]} testID="card-keyword-tag">{tag}</Text>
                            </View>
                            <Text style={styles.def}>{k.def}{k.minor ? ' (minor right now)' : ''}</Text>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    ledger: {
        alignSelf: 'stretch',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        borderRadius: 6,
        backgroundColor: 'rgba(0,0,0,0.65)',
        overflow: 'hidden',
    },
    scroll: { maxHeight: LEDGER_MAX_HEIGHT },
    row: { alignSelf: 'stretch', paddingHorizontal: 10, paddingVertical: 6 },
    rowSep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.14)' },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2, gap: 8 },
    name: { fontFamily: FONTS.sans, fontSize: 12, letterSpacing: 1.2, color: AXM.sulfur, flexShrink: 1 },
    nameMinor: { color: AXM.ash },
    tag: { fontFamily: FONTS.sans, fontSize: 8.5, letterSpacing: 1.2, flexShrink: 0, color: AXM.bone },
    def: { fontFamily: FONTS.serif, fontSize: 11.5, color: AXM.parchment, lineHeight: 16 },
}));

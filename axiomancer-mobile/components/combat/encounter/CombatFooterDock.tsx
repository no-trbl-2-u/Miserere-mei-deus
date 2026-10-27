/**
 * The combat board's footer dock: the bottom row of the board, left to right.
 *
 *   avatar        the player's round portrait (tap opens the pilgrim modal).
 *                 The board passes it in as a slot, so the portrait's own
 *                 resolution FX stay in `PlayerMedallion`.
 *   VITAE column  ♥ value / max with the deck and discard piles at its right,
 *                 a fill bar under it (blood below a quarter), and the phase
 *                 ledger under the bar. Capped at `DOCK_VITAE_MAX_WIDTH`, so
 *                 a wide window keeps the piles beside the VITAE figure.
 *   END          a wide thumb button: hourglass + END, the dead-tray
 *                 consequence line above it, dimmed while a phase resolves.
 *                 Pushed to the right edge however wide the window is.
 *
 * The dock respects the bottom safe-area inset and grows rather than clips.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

import { FONTS, HUE } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import { ledgerA11y } from '@/state/presenters/combat-encounter.engine';
import type { CombatViewModel } from '@/state/presenters/combat-encounter.engine';
import type { BoardGlossLive, BoardTermId } from '@/state/combat/keywords';
import { LedgerMark } from '@/components/hazard/glyphs';

/** The ledger's marks tallied, for the gloss's live line. */
function ledgerCounts(ledger: CombatViewModel['ledger']): { clear: number; overwhelmed: number; pending: number } {
    const n = { clear: 0, overwhelmed: 0, pending: 0 };
    for (const m of ledger) n[m] += 1;
    return n;
}

/** The dock's tallest cell (the END button); the row's height before padding. */
export const DOCK_ROW_H = 56;
/** The dock's top and bottom padding (the bottom one sits above the inset). */
export const DOCK_PAD_V = 8;
/** Side padding and the gap between the dock's three cells. */
export const DOCK_PAD_H = 10;
export const DOCK_GAP = 10;
/** The wide END button: a thumb target, not a corner disc. */
export const END_BTN_W = 116;
export const END_BTN_H = DOCK_ROW_H;
/** The VITAE fill bar's height. */
export const VITAE_BAR_H = 8;
/** Below this share of max VITAE the bar turns blood (presentation only). */
export const VITAE_LOW_RATIO = 0.25;
export const DOCK_LEDGER_MARK = 14;
/**
 * The VITAE column's widest extent. A phone never reaches it (the column gets
 * what the avatar and END leave, about 160pt at 375 wide). On a desktop or
 * tablet window it stops the bar running the window's width and keeps the deck
 * and discard counts beside the VITAE figure; END stays at the right edge.
 */
export const DOCK_VITAE_MAX_WIDTH = 360;
const DOCK_LEDGER_GAP = 3;

/** The dock's minimum height for a given bottom inset. */
export function dockMinHeight(bottomInset: number): number {
    return DOCK_ROW_H + DOCK_PAD_V * 2 + bottomInset;
}

/**
 * The VITAE bar's fill: the share of max VITAE as a whole percent, and
 * whether it reads low (strictly below {@link VITAE_LOW_RATIO}).
 *
 * @example vitaeBarFill(40, 160) // { pct: 25, low: false }
 * @example vitaeBarFill(38, 160) // { pct: 24, low: true }
 */
export function vitaeBarFill(hp: number, maxHp: number): { pct: number; low: boolean } {
    const ratio = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));
    return { pct: Math.round(ratio * 100), low: ratio < VITAE_LOW_RATIO };
}

export const VitaeBar = React.memo(function VitaeBar({ hp, maxHp }: { hp: number; maxHp: number }) {
    const AXM = usePalette();
    const styles = useStyles();
    const { pct, low } = vitaeBarFill(hp, maxHp);
    return (
        <View
            style={styles.barTrack}
            testID="combat-rail-vitae-bar"
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`VITAE ${hp} of ${maxHp}`}
            accessibilityValue={{ min: 0, max: maxHp, now: hp }}
        >
            <View
                style={[styles.barFill, { width: `${pct}%`, backgroundColor: low ? AXM.blood : AXM.heal }]}
                testID="combat-rail-vitae-fill"
            />
        </View>
    );
});

export const EndPhaseButton = React.memo(function EndPhaseButton({ onPress, consequence = null, disabled = false }: {
    onPress: () => void;
    /** No-softlock telegraph: the honest one-line consequence of ending now
     *  (verified engine behaviour, never invented), printed above the button
     *  and folded into its a11y label. */
    consequence?: string | null;
    /** Dimmed and press-inert while a phase is resolving (double-tap guard). */
    disabled?: boolean;
}) {
    const AXM = usePalette();
    const styles = useStyles();
    return (
        <View style={styles.endWrap} pointerEvents="box-none" testID="combat-end-wrap">
            <Pressable
                onPress={disabled ? undefined : onPress}
                disabled={disabled}
                testID="combat-end-phase"
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                accessibilityLabel={`End phase — the enemy acts, then the next phase begins.${consequence ? ` ${consequence}.` : ''}`}
                style={[styles.endBtn, { borderColor: AXM.sulfur }, disabled && styles.endBtnDisabled]}
            >
                <Text style={[styles.endGlyph, { color: AXM.sulfur }]} allowFontScaling={false}>⧗</Text>
                <Text style={[styles.endLabel, { color: AXM.sulfur }]} allowFontScaling={false}>END</Text>
            </Pressable>
            {consequence ? (
                <View style={styles.endConsequenceWrap} pointerEvents="none" testID="combat-end-consequence-wrap">
                    <Text style={styles.endConsequence} testID="combat-end-consequence" numberOfLines={2}>
                        {consequence}
                    </Text>
                </View>
            ) : null}
        </View>
    );
});

export const CombatFooterDock = React.memo(function CombatFooterDock({
    vm, avatar, bottomInset, onEndPhase, endConsequence, resolving, onGloss, onLayout,
}: {
    vm: Pick<CombatViewModel, 'player' | 'ledger' | 'deckCount' | 'discardCount'>;
    /** The player's portrait, rendered by the board (it owns the hit FX). */
    avatar: React.ReactNode;
    bottomInset: number;
    onEndPhase: () => void;
    endConsequence: string | null;
    resolving: boolean;
    /** Tap the piles or the phase ledger: opens that word's gloss. */
    onGloss?: (ids: readonly BoardTermId[], live?: BoardGlossLive) => void;
    onLayout?: (e: LayoutChangeEvent) => void;
}) {
    const styles = useStyles();
    return (
        <View
            style={[styles.dock, { minHeight: dockMinHeight(bottomInset), paddingBottom: bottomInset + DOCK_PAD_V }]}
            testID="combat-rail"
            onLayout={onLayout}
        >
            {avatar}
            <View style={styles.vitaeCol} testID="combat-rail-vitae-col">
                <View style={styles.vitaeRow}>
                    {/* Print the maximum, as the enemy's bar does, so the
                      * player can tell how much of their VITAE is left. The
                      * progressbar below speaks VITAE (with its value), so
                      * the readout is hidden from the reader rather than
                      * announced twice. */}
                    <Text
                        style={styles.vitaeText}
                        numberOfLines={1}
                        allowFontScaling={false}
                        testID="combat-rail-vitae"
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                    >
                        ♥ {vm.player.hp}<Text style={styles.vitaeMax}> / {vm.player.maxHp}</Text>
                    </Text>
                    <Pressable
                        style={styles.piles}
                        testID="combat-piles"
                        onPress={() => onGloss?.(['piles'], { deck: vm.deckCount, discard: vm.discardCount })}
                        accessibilityRole="button"
                        accessibilityLabel={`Deck ${vm.deckCount} cards, discard ${vm.discardCount}`}
                        accessibilityHint="Tap to read what the piles are"
                        hitSlop={6}
                    >
                        <View style={styles.pileGlyph}><Text style={styles.pileGlyphText} allowFontScaling={false}>▮</Text></View>
                        <Text style={styles.pileCount} allowFontScaling={false}>{vm.deckCount}</Text>
                        <View style={[styles.pileGlyph, { transform: [{ rotate: '8deg' }] }]}><Text style={styles.pileGlyphText} allowFontScaling={false}>▯</Text></View>
                        <Text style={styles.pileCount} allowFontScaling={false}>{vm.discardCount}</Text>
                    </Pressable>
                </View>
                <VitaeBar hp={vm.player.hp} maxHp={vm.player.maxHp} />
                <Pressable
                    style={styles.ledger}
                    testID="combat-ledger"
                    onPress={() => onGloss?.(['ledger'], { ledger: ledgerCounts(vm.ledger) })}
                    accessibilityRole="button"
                    accessibilityLabel={ledgerA11y(vm.ledger)}
                    accessibilityHint="Tap to read what the marks mean"
                    hitSlop={4}
                >
                    {vm.ledger.map((m, i) => <LedgerMark key={i} kind={m === 'clear' ? 'O' : m === 'overwhelmed' ? 'X' : 'pending'} size={DOCK_LEDGER_MARK} />)}
                </Pressable>
            </View>
            <EndPhaseButton onPress={onEndPhase} consequence={endConsequence} disabled={resolving} />
        </View>
    );
});

const useStyles = makeStyles((AXM) => ({
    dock: {
        flexDirection: 'row', alignItems: 'center', gap: DOCK_GAP,
        paddingHorizontal: DOCK_PAD_H, paddingTop: DOCK_PAD_V,
        backgroundColor: 'rgba(7,5,9,0.9)', borderTopWidth: 1, borderTopColor: AXM.divider,
    },
    // The VITAE column takes what the avatar and END leave, up to a cap on wide
    // windows; its cells never wrap.
    vitaeCol: { flex: 1, minWidth: 0, maxWidth: DOCK_VITAE_MAX_WIDTH, gap: 4 },
    vitaeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
    vitaeText: { fontFamily: FONTS.mono, fontSize: 14, lineHeight: 18, color: AXM.parchment, letterSpacing: 0.5, flexShrink: 0 },
    // The maximum rides quieter than the live value.
    vitaeMax: { color: AXM.bone, fontSize: 11 },
    barTrack: {
        height: VITAE_BAR_H, borderRadius: VITAE_BAR_H / 2, overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: AXM.divider,
    },
    barFill: { height: '100%' },
    ledger: { flexDirection: 'row', gap: DOCK_LEDGER_GAP, alignItems: 'center' },
    piles: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 },
    pileGlyph: { width: 13, height: 17, borderRadius: 2, borderWidth: 1, borderColor: AXM.ash, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    pileGlyphText: { fontFamily: FONTS.sans, fontSize: 7, color: AXM.ash, lineHeight: 9 },
    pileCount: { fontFamily: FONTS.mono, fontSize: 11, color: AXM.bone, marginRight: 4 },

    // `marginLeft: 'auto'` takes the room the capped VITAE column leaves, so
    // END sits at the dock's right edge on a wide window. A phone's column
    // already fills that room, so nothing moves there.
    endWrap: { width: END_BTN_W, height: END_BTN_H, marginLeft: 'auto' },
    endBtn: {
        width: END_BTN_W, height: END_BTN_H, borderRadius: 10, borderWidth: 2.5, backgroundColor: HUE.medallionBg,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    // Dimmed while a phase resolves (double-tap guard); every other disabled
    // control on the board uses the same ~0.4 opacity treatment.
    endBtnDisabled: { opacity: 0.4 },
    endGlyph: { fontFamily: FONTS.gothic, fontSize: 22, lineHeight: 26 },
    endLabel: { fontFamily: FONTS.sans, fontSize: 15, letterSpacing: 3 },
    // The honest END consequence floats ABOVE the button. Anchored to the
    // button's RIGHT edge, so the 140pt line runs inward across the board
    // rather than past the screen's right edge, where the board clips.
    endConsequenceWrap: { position: 'absolute', top: -34, right: 0, width: 140, alignItems: 'center' },
    endConsequence: {
        fontFamily: FONTS.sans, fontSize: 8.5,
        letterSpacing: 0.4, color: AXM.sulfur, textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.95)', textShadowRadius: 3,
    },
}));

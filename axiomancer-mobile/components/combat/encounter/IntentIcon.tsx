/**
 * The enemy intent telegraph.
 *
 * A compact circular badge (icon in the intent colour over a tinted disc) with
 * the damage stake in an attached dark pill — reference-style icon+number
 * chrome, no text label. The label, description, damage and the next-phase
 * preview all live on the accessibility label so nothing is lost to a11y.
 */

import React from 'react';
import { Text, View } from 'react-native';

import { HUE, TYPE_ROLES } from '@/theme/axm';
import { KitBackdrop } from '@/components/experience/KitBackdrop';
import { lookOf } from '@/components/experience/looks';
import { makeStyles } from '@/theme/runtime';
import type { CombatIntentVM } from '@/state/presenters/combat-encounter.engine';
import {
    INTENT_BLIZZARD_COLOR, intentBlizzardLine, isTelegraphKind, stripThreatPayload,
} from '@/state/presenters/combat-encounter.engine';

/** One a11y sentence for a fork: condition + both outcomes (+ taken). */
function branchA11y(branch: NonNullable<CombatIntentVM['branch']>): string {
    return ` Forked threat — ${branch.condition}: ${branch.thenText} Otherwise: ${branch.elseText}`
        + (branch.taken ? ` It committed to the ${branch.taken === 'then' ? 'conditional' : 'baseline'} path.` : '');
}

export function IntentIcon({ intent, onPress }: { intent: CombatIntentVM; onPress?: () => void }) {
    const styles = useStyles();
    // The badge's look is the place's, never hard-coded here.
    const brass = lookOf('S-03') === 'brass';
    // A `phases` foe's five kinds draw as one large icon with no name, pill or
    // number (phase EN2b). The label names the kind only, so a DANGER the
    // player has not seen is not spoiled for a screen reader either.
    if (isTelegraphKind(intent.type)) {
        return (
            <View
                style={styles.wrap}
                testID="combat-intent"
                accessible
                accessibilityRole="text"
                accessibilityLabel={`Enemy intent: ${intent.label}.`}
                onTouchEnd={onPress}
            >
                <View testID="combat-intent-disc" style={[styles.bigDisc, { borderColor: intent.color, backgroundColor: `${intent.color}2e` }]}>
                    <Text style={[styles.bigIcon, { color: intent.color, textShadowColor: intent.color }]} testID="combat-intent-icon">{intent.icon}</Text>
                </View>
            </View>
        );
    }
    // Wall-math: `intent.damage` is the authored face value only. The pill
    // prints `projectedDamage`, the hit after the engine's threat scale and
    // escalation, and the → badge prints `netDamage`, what lands through the
    // live guard/barrier. State the REAL outcome in a11y, not the raw one.
    const { willDeny, netDamage, projectedDamage, blizzardCut } = intent.wallMath;
    const hit = willDeny ? intent.damage : projectedDamage;
    // BLIZZARD already shrank `hit`; this line says by how much.
    const blizzardLine = !willDeny && (blizzardCut ?? 0) > 0 ? intentBlizzardLine(blizzardCut) : null;
    const wallMathLabel = willDeny
        ? ' This turn will be DENIED — no damage lands.'
        : intent.damage > 0 && netDamage !== hit
            ? ` ${netDamage} will actually land through your current guard.`
            : '';
    // One damage number: the authored payload parenthetical is dropped (as the
    // log drops it) and the pill's number is the one said.
    const description = stripThreatPayload(intent.description ?? '');
    const a11y = `Enemy intent: ${intent.label}.${description ? ` ${description}.` : ''}`
        + (intent.damage > 0 ? ` Deals ${hit} damage.` : '')
        + (blizzardLine ? ` ${blizzardLine[0].toUpperCase()}${blizzardLine.slice(1)}.` : '')
        + (intent.debuffs ? ' Applies a debuff.' : '')
        + wallMathLabel
        + (intent.branch ? branchA11y(intent.branch) : '')
        + (intent.next ? ` Next: ${intent.next.label}.` : '')
        + (intent.next?.branch ? branchA11y(intent.next.branch) : '');
    return (
        <View
            style={styles.wrap}
            testID="combat-intent"
            accessible
            accessibilityRole="text"
            accessibilityLabel={a11y}
            onTouchEnd={onPress}
        >
            <View
                style={[styles.disc, brass ? styles.discBare : { borderColor: intent.color, backgroundColor: `${intent.color}2e` }]}
                testID="combat-intent-ring"
            >
                {/* The ring carries the threat's kind, not decoration: oxblood
                  * for a hit, brass for a guard or a buff — today's colour
                  * split, in the kit's two rings (T, 2026-11-06). */}
                {brass ? <KitBackdrop piece={intent.damage > 0 ? 'combat-intent-oxblood' : 'combat-intent-brass'} /> : null}
                <Text style={[styles.icon, { color: intent.color, textShadowColor: intent.color }]}>{intent.icon}</Text>
            </View>
            {(intent.damage > 0 || intent.debuffs || intent.branch) && (
                <View style={[styles.pill, brass ? styles.pillBare : null]}>
                    {/* 0.12 keeps the plate's end ornaments inside the pill's
                      * own 5pt side padding, so the art fits the box rather
                      * than the box growing to fit the art. */}
                    {brass ? <KitBackdrop piece="combat-badge" scale={0.12} /> : null}
                    {/* A minus, not a heart. This pill is the ENEMY's telegraph:
                      * the number is damage it will deal to the player. ♥ means
                      * only the player's VITAE; a minus means something is
                      * coming off it. */}
                    {intent.damage > 0 && <Text style={[styles.pillText, { color: intent.color }]} allowFontScaling={false}>−{hit}</Text>}
                    {intent.debuffs && <Text style={styles.debuffMark} allowFontScaling={false}>☠</Text>}
                    {/* The fork glyph marks a committed branch phase */}
                    {intent.branch && <Text style={[styles.pillText, { color: intent.color }]} allowFontScaling={false}>⑂</Text>}
                </View>
            )}
            {blizzardLine ? (
                <Text style={[styles.wallMathBlizzard, { color: INTENT_BLIZZARD_COLOR }]} testID="combat-intent-blizzard" allowFontScaling={false}>
                    {blizzardLine}
                </Text>
            ) : null}
            {willDeny ? (
                <Text style={styles.wallMathDenied} testID="combat-intent-wallmath" allowFontScaling={false}>DENIED</Text>
            ) : intent.damage > 0 && netDamage !== hit ? (
                <Text style={styles.wallMathNet} testID="combat-intent-wallmath" allowFontScaling={false}>→{netDamage}</Text>
            ) : null}
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    wrap: { alignItems: 'center' },
    disc: {
        width: 36, height: 36, borderRadius: 18, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center',
    },
    // The ring art replaces the drawn ring and tinted disc. The border's WIDTH
    // stays so the badge measures the same 36 either way; only its colour goes,
    // and each side's own colour goes with it, since a surviving
    // `borderTopColor` would still rule a line across the art.
    discBare: {
        borderColor: 'transparent', backgroundColor: 'transparent',
        borderTopColor: 'transparent', borderRightColor: 'transparent',
        borderBottomColor: 'transparent', borderLeftColor: 'transparent',
    },
    // The telegraph kinds: 56 against the badge's 36, over half again.
    bigDisc: {
        width: 56, height: 56, borderRadius: 28, borderWidth: 3,
        alignItems: 'center', justifyContent: 'center',
    },
    bigIcon: { fontSize: 28, lineHeight: 32, textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } },
    icon: { fontSize: 17, lineHeight: 20, textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } },
    pill: {
        flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: -6,
        backgroundColor: 'rgba(0,0,0,0.88)', borderRadius: 7, paddingHorizontal: 5, paddingVertical: 1,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    // Same bargain as `discBare`: the 1pt border's width is kept (the pill has
    // no explicit size, so dropping it would shrink the box by 2pt each way)
    // and only the ink is cleared.
    pillBare: {
        backgroundColor: 'transparent', borderColor: 'transparent',
        borderTopColor: 'transparent', borderRightColor: 'transparent',
        borderBottomColor: 'transparent', borderLeftColor: 'transparent',
    },
    pillText: { fontFamily: TYPE_ROLES.chip.fontFamily, fontSize: 11, letterSpacing: 0.3 },
    debuffMark: { fontFamily: TYPE_ROLES.chip.fontFamily, fontSize: 10, color: HUE.tickPurple },
    wallMathDenied: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 9, color: HUE.goldAccent, marginTop: 1},
    wallMathBlizzard: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 9, marginTop: 1 },
    wallMathNet: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 9, color: HUE.stoneGrey, marginTop: 1 },
}));

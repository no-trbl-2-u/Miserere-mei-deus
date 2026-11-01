/**
 * The worn gear by the signature column: one small glyph per worn weapon,
 * armor or relic whose effect can fire this fight. Each `equipment-fired`
 * event pulses its piece's glyph (the log line is the presenter's, in
 * `selectCombatLogLines`), so a trigger the player did not tap still shows
 * itself on the board.
 *
 * The chip's a11y label carries the effect and how many times it has fired,
 * which is also what the board test reads.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ItemGlyph } from '@/components/inventory/ItemCard';
import { useJuicePulse } from '@/lib/juice';
import { makeStyles } from '@/theme/runtime';
import type { CombatWornGearVM } from '@/state/presenters/combat-encounter.engine';
import type { CombatFx } from './CombatCombatantPane';

/** Gear chip edge, in points. */
export const GEAR_CHIP_SIZE = 30;

/** How many times each piece has fired this fight, counted off each transition's events. */
export function useGearFired(fx: CombatFx | undefined): Record<string, number> {
    const [counts, setCounts] = useState<Record<string, number>>({});
    const seen = useRef<number | null>(null);
    useEffect(() => {
        if (!fx || seen.current === fx.seq) return;
        seen.current = fx.seq;
        const fired = fx.events.filter((e) => e.kind === 'equipment-fired');
        if (fired.length === 0) return;
        setCounts((prev) => {
            const next = { ...prev };
            for (const e of fired) {
                if (e.kind === 'equipment-fired') next[e.itemId] = (next[e.itemId] ?? 0) + 1;
            }
            return next;
        });
    }, [fx]);
    return counts;
}

function GearChip({ piece, fired }: { piece: CombatWornGearVM; fired: number }) {
    const styles = useStyles();
    const pulse = useJuicePulse(fired, 1);
    return (
        <Animated.View
            style={[styles.chip, fired > 0 ? styles.chipLit : null, pulse]}
            testID={`combat-gear-${piece.itemId}`}
            accessible
            accessibilityRole="image"
            accessibilityLabel={`${piece.name}: ${piece.line}. Fired ${fired} time${fired === 1 ? '' : 's'} this fight.`}
        >
            <ItemGlyph category="equipment" sub={piece.sub} itemId={piece.itemId} size={20} />
        </Animated.View>
    );
}

export const CombatGear = React.memo(function CombatGear({ gear, fired, top }: {
    gear: readonly CombatWornGearVM[];
    fired: Record<string, number>;
    /** The rune column's measured top, so the chips ride beside its first rune. */
    top?: number;
}) {
    const styles = useStyles();
    if (gear.length === 0) return null;
    return (
        <View
            style={[styles.column, top !== undefined ? { top } : null]}
            pointerEvents="none"
            testID="combat-gear"
        >
            {gear.map((g) => <GearChip key={g.itemId} piece={g} fired={fired[g.itemId] ?? 0} />)}
        </View>
    );
});

const useStyles = makeStyles((AXM) => ({
    // Just right of the rune column (left 6, a rune 44 wide).
    column: { position: 'absolute', left: 56, top: '34%', gap: 4, zIndex: 29 },
    chip: {
        width: GEAR_CHIP_SIZE, height: GEAR_CHIP_SIZE, borderRadius: 6, borderWidth: 1,
        borderColor: AXM.ash, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
    },
    chipLit: { borderColor: AXM.sulfur },
}));

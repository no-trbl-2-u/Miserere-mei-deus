import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { usePalette } from '@/theme/runtime';
import { kindInk, type Palette } from '@/theme/palette';
import { ActionIcon } from '@/components/ActionIcon';
import type { NodeMarkKind } from '@/components/NodeMark';
import { ACTION_ICON_BY_TYPE, type NodeType } from '@/state/presenters/exploration.engine';

/**
 * The palette token each node kind's disc wears (`theme/palette.ts`).
 * Quest wears the theme's lamp, the brightest accent on the chart.
 */
export const KIND_TOKEN_COLOR: Record<NodeType, keyof Palette> = {
    quest: 'kindQuest',
    boss: 'kindBoss',
    elite: 'kindElite',
    encounter: 'kindFight',
    hazard: 'kindHazard',
    rest: 'kindRest',
    treasure: 'kindLoot',
    village: 'kindVillage',
    story: 'kindStory',
    door: 'kindTravel',
    start: 'kindStart',
    waypoint: 'kindWaypoint',
    current: 'kindWaypoint',
};

/**
 * The token's radius on `NodeMark`'s 32x32 viewBox, by the node's state.
 *
 * The token sits INSIDE the state mark so the mark's outer part still
 * shows round it: the open lamp's bold ring, the dashed ring of the node
 * underfoot, the solid rim of a walked node, the broken ring of a sealed
 * one. That keeps the four states apart by size and ring with no help
 * from colour, as `NODE_MARK_RADIUS` orders them; each radius here stays
 * inside its state's ring.
 */
export const KIND_TOKEN_RADIUS: Record<NodeMarkKind, number> = {
    available: 10,
    current: 9,
    completed: 9.5,
    locked: 5.5,
};

/** How much larger a quest node's token draws, so quest stays the most prominent. */
export const QUEST_TOKEN_BOOST = 1;

/** The token's radius for a node of `type` in state `state`, on the 32-unit viewBox. */
export function kindTokenRadius(state: NodeMarkKind, type: NodeType): number {
    return KIND_TOKEN_RADIUS[state] + (type === 'quest' ? QUEST_TOKEN_BOOST : 0);
}

interface KindTokenProps {
    type: NodeType;
    state: NodeMarkKind;
    /** The node mark's drawn size in px (the 32-unit viewBox maps onto it). */
    size: number;
    testID?: string;
}

/**
 * KindToken — the node's kind at a glance: an opaque disc in the kind's
 * palette colour with the kind's glyph inside. The disc is opaque, so it
 * covers the roads beneath it; nothing is drawn behind it. A quest token
 * draws larger and with a parchment rim.
 */
export function KindToken({ type, state, size, testID }: KindTokenProps) {
    const AXM = usePalette();
    const disc = AXM[KIND_TOKEN_COLOR[type]] as string;
    const ink = kindInk(AXM, disc);
    const r = kindTokenRadius(state, type);
    const quest = type === 'quest';
    const glyph = Math.round(((r * 2 * 0.64) / 32) * size);
    return (
        <View
            testID={testID}
            pointerEvents="none"
            style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
        >
            <Svg viewBox="0 0 32 32" width={size} height={size} style={{ position: 'absolute' }}>
                <Circle
                    cx={16}
                    cy={16}
                    r={r}
                    fill={disc}
                    stroke={quest ? AXM.parchment : undefined}
                    strokeWidth={quest ? 1.2 : undefined}
                />
            </Svg>
            {/* Positioned too, so on web the glyph paints over the positioned disc. */}
            <View style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                <ActionIcon kind={ACTION_ICON_BY_TYPE[type] ?? 'sword'} size={glyph} color={ink} />
            </View>
        </View>
    );
}

import React, { useRef, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import { NodeMark } from '@/components/NodeMark';
import { ActionIcon } from '@/components/ActionIcon';
import { useTooltip } from '@/hooks/useTooltip';
import { MapCameraContext, MapSheetContext } from './mapSheetContext';
import {
    ACTION_ICON_BY_TYPE,
    NODE_KIND_LABEL,
    type ExplorationNode as ExplorationNodeType,
    type NodeType,
} from '@/state/presenters/exploration.engine';

interface ExplorationNodeProps {
    node: ExplorationNodeType;
    onNodePress: (n: ExplorationNodeType) => void;
    /** True for the node the player has tapped but not yet confirmed. */
    isSelected: boolean;
}

/**
 * ExplorationNode — per-node touch target on the exploration map.
 *
 * Single-tap commits movement (onNodePress); long-press fires the
 * kind:'map-node' tooltip. Same pattern as the card rows: tap is
 * reserved for the action, long-press for the explanation. Each node
 * owns its own measure ref.
 */
// The wrap is centred
// exactly on (n.x, n.y) via a percentage position + a half-node negative
// margin (px), so centring is correct regardless of the canvas size the
// map is spread across (see MapCanvas's per-sheet scale).
export const NODE_SIZE = 44;

/**
 * The smallest a node mark draws on screen, in device px. A phone fits a whole
 * 2400px plate at about 0.15x, which would shrink a 44px mark and its press
 * target to about 6px. The closest two nodes on any Act 1 map sit about 32px
 * apart at that zoom, so a 28px floor keeps neighbours from touching.
 */
export const NODE_MIN_SCREEN = 28;

/**
 * How much a node mark is scaled up inside the canvas so it draws at least
 * `NODE_MIN_SCREEN` px at camera zoom `camera`. At 1 when the zoom alone keeps
 * it that large; the plate and roads keep scaling with the camera.
 */
export function nodeCounterScale(camera: number): number {
    'worklet';
    return Math.max(1, NODE_MIN_SCREEN / (NODE_SIZE * camera));
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function ExplorationNode({ node: n, onNodePress, isSelected }: ExplorationNodeProps) {
    const styles = useStyles();
    const AXM = usePalette();
    const EVENT_COLOR: Record<NodeType, string> = {
        encounter: AXM.blood,
        treasure: AXM.sulfur,
        boss: AXM.blood,
        quest: AXM.sulfur,
        story: AXM.bone,
        rest: AXM.rust,
        waypoint: AXM.bone,
        current: AXM.sulfur,
        hazard: AXM.rust,
        blacksmith: AXM.rust,
        village: AXM.sulfur,
        door: AXM.sulfur,
    };
    const tooltip = useTooltip();
    const sheet = useContext(MapSheetContext);
    const camera = useContext(MapCameraContext);
    const ref = useRef<View | null>(null);
    const color = EVENT_COLOR[n.type] ?? EVENT_COLOR.encounter;

    // Pulse glow for available (tappable) nodes so new players see they're interactive.
    const pulseOpacity = useSharedValue(1);
    useEffect(() => {
        if (n.kind === 'available') {
            pulseOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.45, { duration: 900 }),
                    withTiming(1, { duration: 900 }),
                ),
                -1,
                false,
            );
        } else {
            pulseOpacity.value = 1;
        }
    }, [n.kind, pulseOpacity]);
    const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));
    const counterScale = useAnimatedStyle(() => ({
        transform: [{ scale: camera ? nodeCounterScale(camera.value) : 1 }], // worklet-safe: nodeCounterScale is a worklet
    }));
    const iconKey = ACTION_ICON_BY_TYPE[n.type] ?? 'sword';
    const left = (n.x / sheet.width) * 100;
    const top = (n.y / sheet.height) * 100;
    // Adjacent (reachable) nodes show a kind glyph so the player can see what
    // each one is before choosing it.
    const showKindIcon = n.kind === 'available' || n.kind === 'current';

    return (
        <AnimatedTouchable
            ref={ref}
            accessibilityRole="button"
            accessibilityLabel={`${n.label}, ${
                n.kind === 'locked' ? (n.blockedReason ? `sealed: ${n.blockedReason}` : 'sealed')
                    : n.kind === 'completed' ? 'walked'
                        : n.kind === 'current' ? 'here'
                            : `open, ${NODE_KIND_LABEL[n.type].toLowerCase()}`
            }`}
            accessibilityHint="hold to read node type description"
            // A node behind a blocked road (a questline's lock) also reads its
            // reason, as the tap toast does.
            // Every kind answers a tap — a sealed node says it is sealed, a
            // walked one says it is walked, the node you stand on says so.
            // The label carries the state, so the control is not marked
            // `disabled` (which would have a screen reader skip the mark).
            accessibilityState={{ selected: isSelected }}
            onPress={() => onNodePress(n)}
            onLongPress={() => tooltip.show({ kind: 'map-node', id: n.type, anchorRef: ref })}
            activeOpacity={n.kind === 'available' ? 0.7 : 1}
            testID={`node-${n.id}`}
            style={[
                styles.nodeWrap,
                { left: `${left}%` as unknown as number, top: `${top}%` as unknown as number },
                counterScale,
            ]}
        >
            <Animated.View style={[styles.glyphWrap, isSelected && { borderColor: AXM.sulfur, borderWidth: 2 }, n.kind === 'available' && pulseStyle]}>
                <NodeMark kind={n.kind} size={NODE_SIZE} />
                {showKindIcon && (
                    <View style={styles.kindIcon} pointerEvents="none">
                        <ActionIcon kind={iconKey} size={18} color={color} />
                    </View>
                )}
            </Animated.View>
            {isSelected && (
                <View style={[styles.nodeLabel, { backgroundColor: AXM.nodeBg }]}>
                    <Text style={[styles.nodeLabelText, { color: AXM.parchment }]}>
                        {n.label}
                    </Text>
                </View>
            )}
        </AnimatedTouchable>
    );
}

const useStyles = makeStyles((AXM) => ({
    nodeWrap: {
        position: 'absolute',
        width: NODE_SIZE,
        // Pull back half a node so the glyph sits centred on (n.x, n.y).
        marginLeft: -NODE_SIZE / 2,
        marginTop: -NODE_SIZE / 2,
        alignItems: 'center',
        // Scale about the glyph's centre, which is the node's point, so the
        // selected label hanging below cannot pull the mark off it.
        transformOrigin: `${NODE_SIZE / 2}px ${NODE_SIZE / 2}px`,
        zIndex: 3,
    },
    glyphWrap: {
        width: NODE_SIZE,
        height: NODE_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: NODE_SIZE / 2,
        borderColor: 'transparent',
    },
    kindIcon: {
        ...({ position: 'absolute' } as const),
        alignItems: 'center',
        justifyContent: 'center',
    },
    nodeLabel: {
        marginTop: 2,
        paddingHorizontal: 4,
        paddingVertical: 1,
        backgroundColor: AXM.nodeBg,
    },
    nodeLabelText: {
        fontFamily: FONTS.sans,
        fontSize: 9,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
    },
}));
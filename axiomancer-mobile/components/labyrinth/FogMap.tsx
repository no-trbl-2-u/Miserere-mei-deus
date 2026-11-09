/**
 * Fog-of-war map (secondary view, DESIGN.md section 7) — stingy per T.
 *
 * Visited rooms only; an edge renders only in the direction actually
 * walked (a small arrowhead marks the walked direction); NO display
 * numbers anywhere (numbers are clue material and live in scenes).
 * Layout comes from walk history (`buildFogMap` in the presenter) —
 * never from engine grid coordinates.
 */

import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';

import { LABYRINTH_COPY } from '@/state/presenters/labyrinth.engine';
import type { LabyrinthMapVM } from '@/state/presenters/labyrinth.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

const CELL = 44;
const PAD = 26;

export function FogMap({ map }: { map: LabyrinthMapVM }) {
    const AXM = usePalette();
    const styles = useStyles();

    if (map.rooms.length === 0) {
        return (
            <View style={styles.wrap} testID="labyrinth-fog-map">
                <Text style={styles.empty}>{LABYRINTH_COPY.mapEmpty}</Text>
            </View>
        );
    }

    const width = (map.cols - 1) * CELL + PAD * 2;
    const height = (map.rows - 1) * CELL + PAD * 2;
    const cx = (col: number) => PAD + col * CELL;
    const cy = (row: number) => PAD + row * CELL;

    return (
        <View style={styles.wrap} testID="labyrinth-fog-map">
            <Svg width={width} height={height}>
                {map.edges.map((e, i) => {
                    const x1 = cx(e.fromCol);
                    const y1 = cy(e.fromRow);
                    const x2 = cx(e.toCol);
                    const y2 = cy(e.toRow);
                    // Arrowhead two-thirds along the walked direction.
                    const t = 0.68;
                    const ax = x1 + (x2 - x1) * t;
                    const ay = y1 + (y2 - y1) * t;
                    const angle = Math.atan2(y2 - y1, x2 - x1);
                    const size = 5;
                    const p1 = `${ax},${ay}`;
                    const p2 = `${ax - size * Math.cos(angle - 0.5)},${ay - size * Math.sin(angle - 0.5)}`;
                    const p3 = `${ax - size * Math.cos(angle + 0.5)},${ay - size * Math.sin(angle + 0.5)}`;
                    return (
                        <React.Fragment key={i}>
                            <Line
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke={AXM.bone}
                                strokeWidth={1.2}
                                opacity={0.8}
                            />
                            <Polygon points={`${p1} ${p2} ${p3}`} fill={AXM.bone} />
                        </React.Fragment>
                    );
                })}
                {map.rooms.map((room) => (
                    <Circle
                        key={room.nodeId}
                        cx={cx(room.col)}
                        cy={cy(room.row)}
                        r={room.current ? 9 : 6}
                        fill={room.current ? AXM.sulfur : AXM.panelBg}
                        stroke={room.current ? AXM.sulfur : AXM.parchment}
                        strokeWidth={1.5}
                    />
                ))}
            </Svg>
            <Text style={styles.hint}>{LABYRINTH_COPY.mapHint}</Text>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    wrap: {
        alignItems: 'center',
        padding: 12,
    },
    empty: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 13,
        fontStyle: 'italic',
        color: AXM.bone,
        padding: 20,
    },
    hint: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 11,
        color: AXM.bone,
        marginTop: 6,
    },
}));

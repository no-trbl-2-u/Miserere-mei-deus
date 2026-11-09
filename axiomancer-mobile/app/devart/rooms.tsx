/**
 * Dev-only Aporia room gallery. Renders every authored room's
 * `RoomScene` (wall backdrop + matched door art + POI layer) in a
 * scrolling column so the per-room art pairings can be eyeballed
 * without walking the maze past its gates and encounters. Secret doors
 * are shown revealed; gated doors wear their sealed slab. Gated to dev
 * builds; production renders nothing.
 *
 * Route: /devart/rooms
 */

import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { RoomScene } from '@/components/labyrinth/RoomScene';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { getAporiaAct } from '@mechanics';
import type { LabyrinthActDef } from '@mechanics';

const ACT_IDS = ['act1', 'act2', 'act3'] as const;

function actRooms(act: LabyrinthActDef) {
    const displayOf = new Map(act.rooms.map((r) => [r.nodeId, r.display]));
    return act.rooms.map((room) => ({
        nodeId: room.nodeId,
        name: room.name,
        display: room.display,
        doors: room.doors.map((d) => ({
            to: d.to,
            display: displayOf.get(d.to) ?? '?',
            gated: Boolean(d.gate),
        })),
        pois: (room.pois ?? []).map((p) => ({ id: p.id, label: p.label, inspected: false })),
    }));
}

export default function DevRoomGallery() {
    const styles = useStyles();
    if (!isDevToolsEnabled()) {
        return <View style={styles.root} testID="devart-rooms-disabled" />;
    }
    return (
        <ScrollView style={styles.root} contentContainerStyle={styles.content} testID="devart-rooms-gallery">
            <Text style={styles.heading}>APORIA ROOM GALLERY</Text>
            {ACT_IDS.map((actId) => {
                const act = getAporiaAct(actId);
                return (
                    <View key={actId}>
                        <Text style={styles.actTitle}>{act.title}</Text>
                        {actRooms(act).map((room) => (
                            <View key={room.nodeId} style={styles.cell} testID={`devart-room-${room.nodeId}`}>
                                <Text style={styles.label}>
                                    {room.nodeId} · {room.name} · door {room.display}
                                </Text>
                                <View style={styles.frame}>
                                    <RoomScene
                                        nodeId={room.nodeId}
                                        display={room.display}
                                        doors={room.doors}
                                        pois={room.pois}
                                        sealedLabel="SEALED"
                                        onDoorPress={() => {}}
                                        onPoiPress={() => {}}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                );
            })}
        </ScrollView>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: {
        flex: 1,
        backgroundColor: AXM.bg,
    },
    content: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 16,
    },
    heading: {
        fontFamily: TYPE_ROLES.sectionHead.fontFamily,
        fontSize: 22,
        color: AXM.parchment,
        marginBottom: 8,
    },
    actTitle: {
        fontFamily: TYPE_ROLES.mapName.fontFamily,
        fontSize: 17,
        color: AXM.bone,
        marginVertical: 10,
        textAlign: 'center',
    },
    cell: {
        alignItems: 'center',
        gap: 6,
        marginBottom: 18,
    },
    label: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 12,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.ash,
    },
    frame: {
        width: 360,
        height: 640,
    },
}));

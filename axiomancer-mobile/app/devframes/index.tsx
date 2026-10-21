/**
 * Dev-only enemy FRAME harness — the surface that lets the engine be judged
 * before any shipped enemy changes.
 *
 * It plays a supplied frame set at its manifest fps, names the clip and the
 * cell on screen, and offers the two controls that matter: pause-and-step, so a
 * cell can be looked at rather than glimpsed, and a reduced-motion toggle that
 * drives the component through exactly the path an accessibility preference
 * drives it through in combat.
 *
 * The set it plays is the synthetic fixture beside the component, not an
 * installed enemy: the shipped registry is empty by design, and the only real
 * sheet in the repository lives in a tree app code may not reach into.
 *
 * Route: /devframes
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EnemyFramePlayer } from '@/components/combat/frames';
import { SYNTHETIC_FRAME_KEY, SYNTHETIC_FRAME_SET } from '@/components/combat/frames/syntheticFrameSet';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { FONTS } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

const CLIPS = Object.keys(SYNTHETIC_FRAME_SET.manifest.clips);

export default function DevFrameHarness() {
    const styles = useStyles();
    const [clipName, setClipName] = useState(CLIPS[0]);
    const [playing, setPlaying] = useState(true);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [startKey, setStartKey] = useState(0);
    const [stepped, setStepped] = useState<number | null>(null);

    if (!isDevToolsEnabled()) {
        return <View style={styles.root} testID="devframes-disabled" />;
    }

    const clip = SYNTHETIC_FRAME_SET.manifest.clips[clipName];
    const { anchor, graded } = SYNTHETIC_FRAME_SET.manifest;

    // Stepping pauses and hands the player an explicit cell. The harness owns
    // the number; the player keeps one driver either way, so stepping can never
    // disagree with playback about which cell is on screen.
    const step = (delta: number) => {
        setPlaying(false);
        setStepped((n) => (((n ?? clip.rest) + delta) % clip.frames + clip.frames) % clip.frames);
    };

    return (
        <ScrollView style={styles.root} contentContainerStyle={styles.content} testID="devframes">
            <Text style={styles.heading}>ENEMY FRAME HARNESS</Text>

            <View style={styles.stage}>
                <EnemyFramePlayer
                    artKey={SYNTHETIC_FRAME_KEY}
                    frameSet={SYNTHETIC_FRAME_SET}
                    clipName={clipName}
                    playing={playing}
                    reducedMotion={reducedMotion}
                    startKey={startKey}
                    frameOverride={playing ? null : stepped}
                    style={styles.player}
                    testID="devframes-player"
                />
            </View>

            <Text style={styles.readout} testID="devframes-readout">
                {`clip ${clipName} · ${clip.frames} frames @ ${clip.fps}fps · ${clip.loop ? 'loops' : 'one-shot'} · rest ${clip.rest}${stepped == null ? '' : ` · stepped to ${stepped}`}`}
            </Text>
            <Text style={styles.readout}>
                {`anchor ${anchor.kind} · grid ${SYNTHETIC_FRAME_SET.manifest.columns}x${SYNTHETIC_FRAME_SET.manifest.rows} · ${graded ? 'graded' : 'ungraded'}`}
            </Text>

            <View style={styles.row}>
                {CLIPS.map((name) => (
                    <Control
                        key={name}
                        label={name}
                        on={name === clipName}
                        testID={`devframes-clip-${name}`}
                        onPress={() => { setClipName(name); setStepped(null); setStartKey((k) => k + 1); setPlaying(true); }}
                    />
                ))}
            </View>

            <View style={styles.row}>
                <Control
                    label={playing ? 'pause' : 'play'}
                    on={playing}
                    testID="devframes-play"
                    onPress={() => { setPlaying((p) => !p); setStepped(null); setStartKey((k) => k + 1); }}
                />
                <Control label="step -1" testID="devframes-step-back" onPress={() => step(-1)} />
                <Control label="step +1" testID="devframes-step-forward" onPress={() => step(1)} />
            </View>

            <View style={styles.row}>
                <Control
                    label={`reduced motion ${reducedMotion ? 'ON' : 'off'}`}
                    on={reducedMotion}
                    testID="devframes-reduced-motion"
                    onPress={() => setReducedMotion((r) => !r)}
                />
            </View>

            <Text style={styles.note}>
                Reduced motion holds the clip&apos;s resting cell and starts no animation at all. The
                seeded e2e harness takes the same path through the global instant flag, so a suite
                never waits on a frame.
            </Text>
        </ScrollView>
    );
}

function Control({ label, on, onPress, testID }: {
    label: string; on?: boolean; onPress: () => void; testID: string;
}) {
    const styles = useStyles();
    return (
        <Pressable onPress={onPress} testID={testID} style={[styles.control, on && styles.controlOn]}>
            <Text style={[styles.controlLabel, on && styles.controlLabelOn]}>{label}</Text>
        </Pressable>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: { flex: 1, backgroundColor: AXM.bg },
    content: { padding: 12, paddingBottom: 48 },
    heading: {
        fontFamily: FONTS.gothic,
        fontSize: 18,
        color: AXM.sulfur,
        letterSpacing: 2,
        marginBottom: 12,
        textAlign: 'center',
    },
    stage: {
        height: 220,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.deepBg,
        overflow: 'hidden',
    },
    player: { flex: 1 },
    readout: {
        fontFamily: FONTS.mono,
        fontSize: 11,
        color: AXM.bone,
        letterSpacing: 1,
        marginTop: 8,
    },
    row: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
    control: {
        borderWidth: 1,
        borderColor: AXM.ash,
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginRight: 8,
        marginBottom: 8,
    },
    controlOn: { borderColor: AXM.sulfur },
    controlLabel: { fontFamily: FONTS.mono, fontSize: 11, color: AXM.bone, letterSpacing: 1 },
    controlLabelOn: { color: AXM.sulfur },
    note: {
        fontFamily: FONTS.mono,
        fontSize: 10,
        color: AXM.ash,
        lineHeight: 15,
        marginTop: 12,
    },
}));

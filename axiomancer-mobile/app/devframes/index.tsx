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
 * WHICH SET. The synthetic fixture is first and stays first: it is four
 * coloured bars that differ in hue and shape per clip, so a mis-selected state
 * is obvious at a glance in a way real art never is. Every INSTALLED set is
 * offered beside it, built from the registry rather than listed, so an enemy
 * installed later appears here without this file being touched. The fixture
 * also keeps the harness working when the registry is empty, which it was
 * for three phases and may be again on a branch.
 *
 * Route: /devframes
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ENEMY_FRAME_SETS, type EnemyFrameSet } from '@/assets/images/enemies/frames';
import { EnemyFramePlayer } from '@/components/combat/frames';
import { SYNTHETIC_FRAME_KEY, SYNTHETIC_FRAME_SET } from '@/components/combat/frames/syntheticFrameSet';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { FONTS } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/** The fixture first, then whatever the registry holds, in registry order. */
const SETS: readonly { key: string; set: EnemyFrameSet }[] = [
    { key: SYNTHETIC_FRAME_KEY, set: SYNTHETIC_FRAME_SET },
    ...Object.keys(ENEMY_FRAME_SETS).map((key) => ({ key, set: ENEMY_FRAME_SETS[key] })),
];

export default function DevFrameHarness() {
    const styles = useStyles();
    const [setKey, setSetKey] = useState(SETS[0].key);
    const [clipName, setClipName] = useState('idle');
    const [playing, setPlaying] = useState(true);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [startKey, setStartKey] = useState(0);
    const [stepped, setStepped] = useState<number | null>(null);

    if (!isDevToolsEnabled()) {
        return <View style={styles.root} testID="devframes-disabled" />;
    }

    const frameSet = (SETS.find((s) => s.key === setKey) ?? SETS[0]).set;
    const clips = Object.keys(frameSet.manifest.clips);
    // A set switched to may not name the clip the last one was on, so the
    // resting clip is the fallback rather than a crash.
    const clip = frameSet.manifest.clips[clipName] ?? frameSet.manifest.clips[clips[0]];
    const { anchor, graded } = frameSet.manifest;

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
                    artKey={setKey}
                    frameSet={frameSet}
                    clipName={clipName in frameSet.manifest.clips ? clipName : clips[0]}
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
            <Text style={styles.readout} testID="devframes-set-readout">
                {`set ${setKey} · anchor ${anchor.kind} · grid ${frameSet.manifest.columns}x${frameSet.manifest.rows} · ${graded ? 'graded' : 'ungraded'}`}
            </Text>

            <View style={styles.row}>
                {SETS.map(({ key }) => (
                    <Control
                        key={key}
                        label={key}
                        on={key === setKey}
                        testID={`devframes-set-${key}`}
                        onPress={() => {
                            setSetKey(key);
                            setStepped(null);
                            setStartKey((k) => k + 1);
                            setPlaying(true);
                        }}
                    />
                ))}
            </View>

            <View style={styles.row}>
                {clips.map((name) => (
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
                never waits on a frame. The sets above the stage are the synthetic fixture and every
                set the registry actually holds; an enemy installed later shows up here on its own.
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

/**
 * ShopCarousel — the Shop's one-at-a-time display: the chosen ware large in the
 * middle, its neighbours peeking in at the sides, a position counter under it.
 * A swipe moves between wares, and so does a tap on a peeking one (for web and
 * for accessibility). It owns no ware: the caller draws the large one and the
 * peeking ones, and holds the position.
 *
 * Inputs: `count` and `index` (the position), `onIndex` (a new position),
 * `renderMain(width, height)` and `renderPeek(i, width, height)` (the caller's
 * drawing at each size), `counterText` (the "2 of 5" line), and the testIDs of
 * the stage, the counter and the two peeks. Output: the element tree.
 */

import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/** Card face proportions the shop shares with the reward draft (100 x 147). */
const FACE_RATIO = 147 / 100;
/** The large ware's widest extent, and the narrowest it shrinks to, in points. */
const MAIN_MAX_W = 220;
const MAIN_MIN_W = 140;
/** The large ware's share of the stage width. */
const MAIN_SHARE = 0.54;
/** A peeking ware's width as a share of the large one's. */
const PEEK_SHARE = 0.6;
/** The part of a peeking ware that hides off the stage's edge. */
const PEEK_HIDDEN = 0.35;
/** A swipe shorter than this many points is no swipe. */
const SWIPE_DISTANCE = 40;
/** The stage's width before it is measured: a phone's column. */
const DEFAULT_STAGE_W = 347;

export interface ShopCarouselProps {
    count: number;
    index: number;
    onIndex: (next: number) => void;
    renderMain: (width: number, height: number) => React.ReactNode;
    renderPeek: (i: number, width: number, height: number) => React.ReactNode;
    counterText: string;
    testIDStage: string;
    testIDCounter: string;
    testIDPrev: string;
    testIDNext: string;
}

export function ShopCarousel({
    count, index, onIndex, renderMain, renderPeek, counterText,
    testIDStage, testIDCounter, testIDPrev, testIDNext,
}: ShopCarouselProps) {
    const styles = useStyles();
    const [stageW, setStageW] = useState(DEFAULT_STAGE_W);

    // The pan responder outlives renders, so it reads the position through a ref.
    const live = useRef({ index, count, onIndex });
    live.current = { index, count, onIndex };
    const pan = useMemo(() => PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderRelease: (_e, g) => {
            const { index: at, count: n, onIndex: go } = live.current;
            if (g.dx <= -SWIPE_DISTANCE && at < n - 1) go(at + 1);
            else if (g.dx >= SWIPE_DISTANCE && at > 0) go(at - 1);
        },
    }), []);

    const mainW = Math.round(Math.max(MAIN_MIN_W, Math.min(MAIN_MAX_W, stageW * MAIN_SHARE)));
    const mainH = Math.round(mainW * FACE_RATIO);
    const peekW = Math.round(mainW * PEEK_SHARE);
    const peekH = Math.round(peekW * FACE_RATIO);
    const peekTop = Math.round((mainH - peekH) / 2);
    const onLayout = (e: LayoutChangeEvent) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w > 0 && w !== stageW) setStageW(w);
    };

    return (
        <View>
            <View
                style={[styles.stage, { height: mainH }]}
                onLayout={onLayout}
                testID={testIDStage}
                {...pan.panHandlers}
            >
                {index > 0 && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Previous ware"
                        onPress={() => onIndex(index - 1)}
                        style={[styles.peek, { left: -Math.round(peekW * PEEK_HIDDEN), top: peekTop, width: peekW, height: peekH }]}
                        testID={testIDPrev}
                    >
                        <View pointerEvents="none">{renderPeek(index - 1, peekW, peekH)}</View>
                    </Pressable>
                )}
                {index < count - 1 && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Next ware"
                        onPress={() => onIndex(index + 1)}
                        style={[styles.peek, { right: -Math.round(peekW * PEEK_HIDDEN), top: peekTop, width: peekW, height: peekH }]}
                        testID={testIDNext}
                    >
                        <View pointerEvents="none">{renderPeek(index + 1, peekW, peekH)}</View>
                    </Pressable>
                )}
                <View style={[styles.main, { width: mainW, height: mainH, left: Math.round((stageW - mainW) / 2) }]}>
                    {renderMain(mainW, mainH)}
                </View>
            </View>
            <Text style={styles.counter} testID={testIDCounter}>{counterText}</Text>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    stage: { width: '100%', overflow: 'hidden', marginTop: 8 },
    main: { position: 'absolute', top: 0, alignItems: 'center' },
    peek: { position: 'absolute', opacity: 0.5, overflow: 'hidden' },
    counter: {
        fontFamily: TYPE_ROLES.count.fontFamily,
        fontSize: 13,
        color: AXM.bone,
        textAlign: 'center',
        marginTop: 8,
    },
}));

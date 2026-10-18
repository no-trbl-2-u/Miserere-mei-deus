import React, { useContext, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { TITLE_PLATE } from '@/assets/images/title';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { resolveJuiceMode } from '@/lib/juice/instant';
import { Image } from '@/lib/platform/image';
import {
  MENU_PLATE_OPACITY,
  TITLE_COPY,
  TITLE_TIMING,
  WORDMARK_EM_WIDTH,
  titleLayout,
  titleWordmarkFrames,
} from '@/state/presenters/title.engine';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

interface TitleScreenProps {
  /** The main menu, shown beneath the same wordmark once EMBARK is pressed. */
  menu: React.ReactNode;
  /** Open on the menu with the sequence already played (`/?menu=1`). */
  startAtMenu?: boolean;
}

/**
 * TitleScreen — the launch sequence: the splash's wordmark, lifted into the
 * sky of Doré's shore at dawn, the psalm line and EMBARK, then the main menu
 * under the same wordmark (`state/presenters/title.engine.ts` has the beats
 * and the layout).
 *
 * Inputs: `menu` — the menu element; `startAtMenu` — skip straight to it.
 * Output: the whole launch screen. Its only state is which phase it is in;
 * EMBARK hands off to `menu` in place, so the wordmark and the plate never
 * unmount between the two.
 *
 * Reduced motion and the e2e instant flag land every value at once.
 */
export function TitleScreen({ menu, startAtMenu = false }: TitleScreenProps) {
  const styles = useStyles();
  const AXM = usePalette();
  const { width, height } = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext);
  const layout = titleLayout({ width, height, topInset: insets?.top ?? 0 });
  const instant = resolveJuiceMode({ reducedMotion: useReducedMotion() }) === 'instant';

  const [phase, setPhase] = useState<'title' | 'menu'>(startAtMenu ? 'menu' : 'title');
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const frames = titleWordmarkFrames(layout, measuredWidth);

  const settled = startAtMenu || instant;
  const lift = useSharedValue(settled ? 1 : 0);
  const cta = useSharedValue(settled ? 1 : 0);
  const toMenu = useSharedValue(startAtMenu ? 1 : 0);
  // EMBARK takes no press until its fade-in begins, so a tap on the still
  // empty lower half during the lift cannot open the menu unseen.
  const [ctaLive, setCtaLive] = useState(settled);

  useEffect(() => {
    if (settled) {
      lift.value = 1;
      cta.value = 1;
      return;
    }
    const live = setTimeout(() => setCtaLive(true), TITLE_TIMING.holdMs + TITLE_TIMING.liftMs);
    lift.value = withDelay(
      TITLE_TIMING.holdMs,
      withTiming(1, { duration: TITLE_TIMING.liftMs, easing: Easing.inOut(Easing.cubic) }),
    );
    cta.value = withDelay(
      TITLE_TIMING.holdMs + TITLE_TIMING.liftMs,
      withTiming(1, { duration: TITLE_TIMING.ctaMs }),
    );
    return () => clearTimeout(live);
    // Plays once per mount; the shared values carry it from there.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEmbark = () => {
    setPhase('menu');
    toMenu.value = instant ? 1 : withTiming(1, { duration: TITLE_TIMING.menuMs });
  };

  const splash = frames.splash;
  const wordmarkStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(lift.value, [0, 1], [splash.translateY, 0]) },
      { scale: interpolate(lift.value, [0, 1], [splash.scale, 1]) },
    ],
  }), [splash.translateY, splash.scale]);
  const plateStyle = useAnimatedStyle(() => ({
    opacity: interpolate(lift.value, [0.15, 1], [0, 1], 'clamp')
      * interpolate(toMenu.value, [0, 1], [1, MENU_PLATE_OPACITY]),
  }));
  const ctaStyle = useAnimatedStyle(() => ({ opacity: cta.value * (1 - toMenu.value) }));
  const menuStyle = useAnimatedStyle(() => ({ opacity: toMenu.value }));

  const fontSize = layout.wordmark.width / WORDMARK_EM_WIDTH;
  const lineHeight = Math.round(fontSize * 1.3);
  const onWordmarkLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - measuredWidth) > 0.5) setMeasuredWidth(w);
  };
  const plate = layout.plate;
  const sideFeather = plate.left > 0;

  return (
    <View style={styles.container} testID="title-screen">
      <Animated.View
        style={[styles.plate, { left: plate.left, width: plate.width, height: plate.height }, plateStyle]}
        pointerEvents="none"
        testID="title-plate"
      >
        <Image
          source={TITLE_PLATE}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel={TITLE_COPY.plateLabel}
        />
        {/* The plate dissolves into the ground at its foot, and at its sides
            when a wide window leaves ground beside it, so it has no edge. */}
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id="axmTitleFoot" x1="0" y1="0" x2="0" y2="1">
              <Stop offset={0.55} stopColor={AXM.bg} stopOpacity={0} />
              <Stop offset={0.72} stopColor={AXM.bg} stopOpacity={0.35} />
              <Stop offset={0.84} stopColor={AXM.bg} stopOpacity={0.78} />
              <Stop offset={0.93} stopColor={AXM.bg} stopOpacity={1} />
              <Stop offset={1} stopColor={AXM.bg} stopOpacity={1} />
            </LinearGradient>
            <LinearGradient id="axmTitleSides" x1="0" y1="0" x2="1" y2="0">
              <Stop offset={0} stopColor={AXM.bg} stopOpacity={sideFeather ? 1 : 0} />
              <Stop offset={0.12} stopColor={AXM.bg} stopOpacity={0} />
              <Stop offset={0.88} stopColor={AXM.bg} stopOpacity={0} />
              <Stop offset={1} stopColor={AXM.bg} stopOpacity={sideFeather ? 1 : 0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#axmTitleSides)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#axmTitleFoot)" />
        </Svg>
      </Animated.View>

      {phase === 'menu' ? (
        <Animated.View
          style={[styles.menu, { left: layout.menu.left, width: layout.menu.width }, menuStyle]}
          testID="title-menu"
        >
          {menu}
        </Animated.View>
      ) : null}

      {/* Once the menu is up the faded block stays mounted for its fade
          but is hidden from screen readers, so the menu does not read an
          invisible psalm and a disabled EMBARK. */}
      <Animated.View
        style={[styles.content, ctaStyle]}
        pointerEvents={phase === 'title' ? 'box-none' : 'none'}
        accessibilityElementsHidden={phase !== 'title'}
        importantForAccessibility={phase === 'title' ? 'auto' : 'no-hide-descendants'}
        aria-hidden={phase !== 'title'}
        testID="title-cta"
      >
        <View style={styles.psalm}>
          <Text style={styles.psalmLine}>{TITLE_COPY.psalm}</Text>
          <Text style={styles.psalmSource}>{TITLE_COPY.psalmSource}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.embarkButton, pressed && styles.embarkButtonPressed]}
          onPress={handleEmbark}
          disabled={phase !== 'title' || !ctaLive}
          accessibilityRole="button"
          accessibilityLabel={TITLE_COPY.embarkLabel}
        >
          <Text style={styles.embarkButtonText}>{TITLE_COPY.embark}</Text>
          <Text style={styles.embarkHint}>{TITLE_COPY.embarkHint}</Text>
        </Pressable>

        <Text style={styles.footerText}>{TITLE_COPY.footer}</Text>
      </Animated.View>

      {/* The wordmark, last so it draws over the menu's fade. Its resting
          frame sits in the plate's sky; the lift starts it at the splash's
          frame. */}
      <Animated.View
        style={[styles.wordmarkRow, { top: layout.wordmark.centerY - lineHeight / 2 }, wordmarkStyle]}
        pointerEvents="none"
      >
        <Text
          style={[styles.wordmark, { fontSize, lineHeight }]}
          onLayout={onWordmarkLayout}
          accessibilityRole="header"
          numberOfLines={1}
          testID="title-wordmark"
        >
          {TITLE_COPY.wordmark}
        </Text>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((AXM) => ({
  container: {
    flex: 1,
    backgroundColor: AXM.bg,
    justifyContent: 'flex-end',
  },
  plate: {
    position: 'absolute',
    top: 0,
  },
  // Spans the plate's band, not the window, so a wide window keeps the
  // menu rows within the art.
  menu: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  wordmarkRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: FONTS.gothic,
    color: AXM.parchment,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 48,
    gap: 22,
  },
  psalm: {
    alignItems: 'center',
    gap: 6,
    maxWidth: 340,
  },
  psalmLine: {
    fontFamily: FONTS.serifItalic,
    fontSize: 17,
    color: AXM.parchment,
    textAlign: 'center',
    lineHeight: 25,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  psalmSource: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    letterSpacing: 3,
    color: AXM.bone,
    textTransform: 'uppercase',
  },
  embarkButton: {
    backgroundColor: AXM.sulfur,
    paddingVertical: 16,
    paddingHorizontal: 56,
    borderWidth: 1,
    borderColor: AXM.parchment,
    // Lift the CTA off the dark field with an accent glow.
    shadowColor: AXM.sulfur,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  embarkButtonPressed: {
    backgroundColor: AXM.rust,
    borderColor: AXM.parchment,
  },
  embarkButtonText: {
    fontFamily: FONTS.sans,
    fontSize: 20,
    color: AXM.bg,
    letterSpacing: 4,
    textAlign: 'center',
  },
  embarkHint: {
    fontFamily: FONTS.serifItalic,
    fontSize: 11,
    color: AXM.bg,
    letterSpacing: 0.5,
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 4,
  },
  footerText: {
    fontFamily: FONTS.serifItalic,
    fontSize: 12,
    color: AXM.bone,
    textAlign: 'center',
    lineHeight: 17,
    opacity: 0.85,
    maxWidth: 320,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
}));

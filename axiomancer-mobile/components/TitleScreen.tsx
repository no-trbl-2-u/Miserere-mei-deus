import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { TITLE_PLATE } from '@/assets/images/title';
import { EmbarkButton } from '@/components/EmbarkButton';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { resolveJuiceMode } from '@/lib/juice/instant';
import { Image } from '@/lib/platform/image';
import {
  TITLE_COPY,
  TITLE_TIMING,
  WORDMARK_EM_WIDTH,
  titleLayout,
  titleWordmarkFrames,
} from '@/state/presenters/title.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

interface TitleScreenProps {
  /** The main menu, shown beneath the same wordmark once EMBARK is pressed. */
  menu: React.ReactNode;
  /** Open on the menu with the sequence already played (`/?menu=1`). */
  startAtMenu?: boolean;
}

/**
 * TitleScreen — the launch sequence: the splash's wordmark, lifted into the
 * dark band of Doré's wood under its slit of sky, the psalm line and EMBARK, then the main menu
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

  // The Embark block is unmounted once its fade-out ends, so no layer of it
  // (the scroll's image included) can sit over the menu's buttons and take a
  // touch, on web or native.
  const [ctaMounted, setCtaMounted] = useState(!startAtMenu);

  useEffect(() => {
    if (phase !== 'menu') return;
    if (instant) {
      setCtaMounted(false);
      return;
    }
    const gone = setTimeout(() => setCtaMounted(false), TITLE_TIMING.menuMs);
    return () => clearTimeout(gone);
  }, [phase, instant]);

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
    opacity: interpolate(lift.value, [0.15, 1], [0, 1], 'clamp'),
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
          invisible psalm and a disabled EMBARK; after the fade it is gone. */}
      {ctaMounted ? (
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

        {/* T's parchment "Embark" scroll (plan 121.3) is the call to action. */}
        <EmbarkButton
          onPress={handleEmbark}
          disabled={phase !== 'title' || !ctaLive}
          accessibilityLabel={TITLE_COPY.embarkLabel}
          accessibilityHint={TITLE_COPY.embarkHint}
          style={styles.embark}
          testID="title-embark"
        />

        <Text style={styles.footerText}>{TITLE_COPY.footer}</Text>
      </Animated.View>
      ) : null}

      {/* The wordmark, last so it draws over the menu's fade. Its resting
          frame sits in the plate's dark upper band; the lift starts it at the splash's
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
    fontFamily: TYPE_ROLES.chip.fontFamily,
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
    fontFamily: TYPE_ROLES.narration.fontFamily,
    fontSize: 17,
    color: AXM.parchment,
    textAlign: 'center',
    lineHeight: 25,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  psalmSource: {
    fontFamily: TYPE_ROLES.count.fontFamily,
    fontSize: 9,
    color: AXM.bone,
    textTransform: 'uppercase',
  },
  // The scroll's width; its height follows the art's aspect.
  embark: {
    maxWidth: 320,
  },
  footerText: {
    fontFamily: TYPE_ROLES.narration.fontFamily,
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

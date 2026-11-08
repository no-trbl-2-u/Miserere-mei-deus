import React, { useEffect, useState } from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { fitSizeToRoom } from '@/lib/text-fit';

/** A wide, zero-height, clipped row: the twin keeps its natural width in it
 *  instead of wrapping at the wrapper's. */
const PROBE_BOX = {
  position: 'absolute', left: 0, top: 0, width: 1200, height: 0, overflow: 'hidden', opacity: 0, flexDirection: 'row',
} as const;

/**
 * Counts the web's font loads. A measure taken in the fallback face, before the
 * game's font arrived, reads too narrow and a later swap does not always raise a
 * second layout event; the twin is keyed on this count (and on the room) so it is
 * measured afresh once the font is in. Native loads fonts before it draws: 0.
 */
function useFontEpoch(): number {
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    const fonts = (globalThis as { document?: { fonts?: FontFaceSet } }).document?.fonts;
    if (!fonts) return undefined;
    const bump = () => setEpoch((n) => n + 1);
    fonts.addEventListener('loadingdone', bump);
    void fonts.ready.then(bump);
    return () => fonts.removeEventListener('loadingdone', bump);
  }, []);
  return epoch;
}

/** Points kept free so a renderer's rounding never wraps the last letter. */
export const FIT_AIR = 1;

interface FitTextProps {
  /** What is drawn. */
  text: string;
  /** What the room must hold at the nominal size: the whole text (default) or,
   *  for text that may wrap between words, its longest word. */
  fitText?: string;
  style: StyleProp<TextStyle>;
  nominal: number;
  floor: number;
  letterSpacing?: number;
  /** The room, from the width this component is laid out at. Default: all of it. */
  room?: (width: number) => number;
  numberOfLines?: number;
  /** Extra style for the wrapper (a row child asks to grow and shrink). */
  wrapStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * FitText — text that steps its font down until `fitText` fits the room, and
 * never truncates.
 *
 * A hidden twin at the nominal size gives the text's real width (the platform's
 * own measure, so web and native agree and no font table is guessed at); the
 * wrapper's width gives the room. Before the first layout it draws at nominal.
 *
 * Inputs: the props above. Output: the text, sized to fit.
 */
export function FitText({
  text, fitText, style, nominal, floor, letterSpacing = 0, room, numberOfLines = 1, wrapStyle, testID,
}: FitTextProps) {
  const [natural, setNatural] = useState(0);
  const [width, setWidth] = useState(0);
  const fontEpoch = useFontEpoch();
  const probe = fitText ?? text;
  const size = fitSizeToRoom(
    natural, probe.length, (room ? room(width) : width) - FIT_AIR, nominal, floor, letterSpacing,
  );
  return (
    <View
      style={[{ alignSelf: 'stretch' }, wrapStyle]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      pointerEvents="none"
    >
      <Text style={[style, { fontSize: size }]} numberOfLines={numberOfLines} testID={testID}>
        {text}
      </Text>
      <View key={`${fontEpoch}-${width}`} style={PROBE_BOX} pointerEvents="none">
        <Text
          style={[style, { fontSize: nominal }]}
          onLayout={(e) => setNatural(e.nativeEvent.layout.width)}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          testID={testID ? `${testID}-probe` : undefined}
        >
          {probe}
        </Text>
      </View>
    </View>
  );
}

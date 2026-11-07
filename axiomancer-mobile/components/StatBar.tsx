import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import type { DimensionValue } from 'react-native';
import { FONTS } from '@/theme/axm';
import { KitBackdrop, KitImage } from '@/components/experience/KitBackdrop';
import { makeStyles, usePalette } from '@/theme/runtime';

interface StatBarProps {
  value: number;
  max: number;
  color?: string;
  label?: string;
  height?: number;
  showText?: boolean;
  /**
   * Fraction (0-1) at or below which the bar reads as an ALARM rather than a
   * readout. When set and crossed, the numeric readout takes the
   * bar's own colour at full opacity and the empty track tints toward it, so
   * a nearly-spent bar cannot be mistaken for a bar with nothing in it.
   *
   * Omitted by default, so a consumer that has no danger state — a bar
   * where a full bar is the problem, not an empty one — is unchanged.
   */
  alarmAt?: number;
  /**
   * 'brass' draws the bar on the Brass Gothic VITAE rail and fill (the kit's
   * combat-vitae pieces) instead of the flat track. The rail is 6 points
   * taller than `height`, to hold its frame. Omitted, the bar is today's.
   */
  look?: 'normal' | 'brass';
}

export const StatBar = React.memo(function StatBar({ value, max, color, label, height = 14, showText = true, alarmAt, look = 'normal' }: StatBarProps) {
  const AXM = usePalette();
  const styles = useStyles();
  const barColor = color ?? AXM.blood;
  const pct = Math.max(0, Math.min(1, value / max));
  const percentage = Math.round(pct * 100);
  const brass = look === 'brass';
  // At 1/175 the fill is half a pixel wide, so without the alarm the bar
  // reads as a plain grey rail and a player one hit from death gets no
  // warning at all.
  const alarmed = typeof alarmAt === 'number' && pct <= alarmAt;
  const accessibilityLabel = label ? 
    `${label}: ${value} out of ${max}, ${percentage} percent` : 
    `Progress bar: ${value} out of ${max}, ${percentage} percent`;

  return (
    <View 
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ now: value, min: 0, max: max }}
    >
      {label && (
        <View style={styles.labelRow}>
          <Text 
            style={styles.label}
            accessibilityRole="text"
            importantForAccessibility="no"
          >
            {label}
          </Text>
          {showText && (
            <Text 
              style={[styles.value, alarmed && { color: barColor, opacity: 1, fontWeight: '700' }]}
              accessibilityRole="text"
              importantForAccessibility="no"
              testID={alarmed ? 'statbar-value-alarmed' : 'statbar-value'}
            >
              {value}/{max}
            </Text>
          )}
        </View>
      )}
      {brass ? (
        <View
          style={[styles.brassTrack, { height: height + 6 }]}
          importantForAccessibility="no"
          testID={alarmed ? 'statbar-track-alarmed' : 'statbar-track'}
        >
          <KitBackdrop piece="combat-vitae-track" />
          <View
            style={[styles.brassFill, { width: `${(pct * 100).toFixed(1)}%` as DimensionValue }]}
            importantForAccessibility="no"
          >
            <KitImage piece="combat-vitae-fill" style={StyleSheet.absoluteFill} />
          </View>
        </View>
      ) : (
      <View
        style={[styles.track, { height }, alarmed && { borderColor: barColor }]}
        importantForAccessibility="no"
        testID={alarmed ? 'statbar-track-alarmed' : 'statbar-track'}
      >
        <View
          style={[styles.fill, { width: `${(pct * 100).toFixed(1)}%` as DimensionValue, backgroundColor: barColor }]}
          importantForAccessibility="no"
        />
        <View
          style={styles.topLine}
          importantForAccessibility="no"
        />
      </View>
      )}
    </View>
  );
});

const useStyles = makeStyles((AXM) => ({
  container: { width: '100%' },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  label: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    letterSpacing: 2,
    color: AXM.parchment,
    opacity: 0.85,
  },
  value: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: AXM.parchment,
    opacity: 0.85,
  },
  track: {
    width: '100%',
    backgroundColor: AXM.ash,
    borderWidth: 1,
    borderColor: AXM.parchmentMed,
    overflow: 'hidden',
    position: 'relative',
  },
  brassTrack: { width: '100%', overflow: 'hidden', position: 'relative' },
  brassFill: { position: 'absolute', top: 3, left: 3, bottom: 3, borderRadius: 3, overflow: 'hidden' },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: AXM.parchmentMed,
  },
}));

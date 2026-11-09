import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { TYPE_ROLES } from '@/theme/axm';
import { usePalette } from '@/theme/runtime';

interface SectionLabelProps {
  children: React.ReactNode;
  color?: string;
  size?: number;
  style?: object;
}

export const SectionLabel = React.memo(function SectionLabel({ children, color, size = 11, style }: SectionLabelProps) {
  const AXM = usePalette();
  return (
    <Text
      style={[styles.base, { color: color ?? AXM.parchment, fontSize: size }, style]}
      accessibilityRole="header"
      accessibilityLabel={`Section: ${children}`}
    >
      {children}
    </Text>
  );
});

const styles = StyleSheet.create({
  base: {
    fontFamily: TYPE_ROLES.eyebrow.fontFamily,
    letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
    textTransform: 'uppercase',
  },
});

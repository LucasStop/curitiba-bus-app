import { RIT_CATEGORIES } from '@/constants/rit';
import { Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BusCategory } from '@/types/transit';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface BusBadgeProps {
  codigo: string;
  categoria?: BusCategory;
  corHex?: string;
  size?: 'small' | 'medium' | 'large';
}

export const BusBadge: React.FC<BusBadgeProps> = ({ codigo, categoria = 'expresso', corHex, size = 'medium' }) => {
  const isDark = useColorScheme() === 'dark';
  const categoryConfig = RIT_CATEGORIES[categoria];
  const fallback = isDark ? RIT_CATEGORIES.expresso.corHexDark : RIT_CATEGORIES.expresso.corHex;
  const bg = corHex || (isDark ? categoryConfig?.corHexDark : categoryConfig?.corHex) || fallback;
  const textColor = categoryConfig?.textColor || '#FFFFFF';
  const borderHex = categoryConfig?.borderHex;

  const sizeStyles = {
    small: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 11,
      borderRadius: Radius.sm,
    },
    medium: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      fontSize: 13,
      borderRadius: Radius.sm,
    },
    large: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontSize: 16,
      borderRadius: Radius.md,
    },
  }[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
          borderRadius: sizeStyles.borderRadius,
          ...(borderHex ? { borderWidth: 1, borderColor: borderHex } : {}),
        },
      ]}
      testID={`line-badge-${codigo}`}
      accessible
      accessibilityLabel={`Linha ${codigo}`}>
      <Text style={[styles.text, { fontSize: sizeStyles.fontSize, color: textColor }]}>{codigo}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  text: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

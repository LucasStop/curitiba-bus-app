import { RIT_CATEGORIES } from '@/constants/rit';
import { BusCategory } from '@/types/transit';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface BusBadgeProps {
  codigo: string;
  categoria?: BusCategory;
  corHex?: string;
  size?: 'small' | 'medium' | 'large';
}

export const BusBadge: React.FC<BusBadgeProps> = ({
  codigo,
  categoria = 'expresso',
  corHex,
  size = 'medium',
}) => {
  const bg = corHex || RIT_CATEGORIES[categoria]?.corHex || '#E11D48';

  const sizeStyles = {
    small: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 11,
      borderRadius: 4,
    },
    medium: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      fontSize: 13,
      borderRadius: 6,
    },
    large: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontSize: 16,
      borderRadius: 8,
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
        },
      ]}
      testID={`line-badge-${codigo}`}
      accessible
      accessibilityLabel={`Linha ${codigo}`}>
      <Text style={[styles.text, { fontSize: sizeStyles.fontSize }]}>{codigo}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

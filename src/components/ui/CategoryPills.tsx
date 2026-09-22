import { RIT_CATEGORIES } from '@/constants/rit';
import { Colors } from '@/constants/theme';
import { useTransitStore } from '@/stores/useTransitStore';
import { BusCategory } from '@/types/transit';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const CATEGORIES: { key: 'all' | BusCategory; label: string; dotColor?: string }[] = [
  { key: 'all', label: 'Todas as Linhas' },
  { key: 'expresso', label: 'Expressos', dotColor: RIT_CATEGORIES.expresso.corHex },
  { key: 'ligeirinho', label: 'Ligeirinhos', dotColor: RIT_CATEGORIES.ligeirinho.corHex },
  { key: 'interbairros', label: 'Interbairros', dotColor: RIT_CATEGORIES.interbairros.corHex },
  { key: 'alimentador', label: 'Alimentadores', dotColor: RIT_CATEGORIES.alimentador.corHex },
];

export const CategoryPills: React.FC = () => {
  const activeCategory = useTransitStore((s) => s.activeCategory);
  const setActiveCategory = useTransitStore((s) => s.setActiveCategory);
  const selectedLine = useTransitStore((s) => s.selectedLine);
  const setSelectedLine = useTransitStore((s) => s.setSelectedLine);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}>
        {CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat.key && !selectedLine;

          return (
            <TouchableOpacity
              key={cat.key}
              onPress={() => {
                setSelectedLine(null);
                setActiveCategory(cat.key);
              }}
              style={[
                styles.pill,
                isSelected ? styles.pillSelected : styles.pillUnselected,
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              activeOpacity={0.7}
              testID={`category-pill-${cat.key}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Filtrar por ${cat.label}`}>
              {cat.dotColor && (
                <View style={[styles.dot, { backgroundColor: cat.dotColor }]} />
              )}
              <Text
                style={[
                  styles.label,
                  isSelected ? styles.labelSelected : styles.labelUnselected,
                ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 6,
  },
  container: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pillSelected: {
    backgroundColor: Colors.light.text,
  },
  pillUnselected: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelSelected: {
    color: Colors.light.surface,
  },
  labelUnselected: {
    color: Colors.light.text,
  },
});

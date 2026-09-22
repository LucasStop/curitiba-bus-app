import { BusBadge } from '@/components/ui/BusBadge';
import { RIT_CATEGORIES } from '@/constants/rit';
import { Colors } from '@/constants/theme';
import { CURITIBA_LINES } from '@/data/curitibaDataset';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { useTransitStore } from '@/stores/useTransitStore';
import { BusCategory, BusLine } from '@/types/transit';
import { useRouter } from 'expo-router';
import { Bookmark, Clock, MapPin, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LinesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | BusCategory>('all');

  const setSelectedLine = useTransitStore((s) => s.setSelectedLine);
  const { isFavoriteLine, toggleFavoriteLine } = useFavoritesStore();

  const filteredLines = CURITIBA_LINES.filter((line) => {
    const matchesSearch =
      line.codigo.toLowerCase().includes(search.toLowerCase()) ||
      line.nome.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'all' || line.categoria === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleOpenOnMap = (line: BusLine) => {
    setSelectedLine(line);
    router.push('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Catálogo de Linhas</Text>
        <Text style={styles.subtitle}>Rede Integrada de Transporte de Curitiba (RIT)</Text>

        {/* Busca */}
        <View style={styles.searchBar}>
          <Search size={18} color={Colors.light.textMuted} />
          <TextInput
            placeholder="Buscar por número ou nome da linha..."
            placeholderTextColor={Colors.light.textMuted}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            testID="lines-search-input"
            accessibilityLabel="Buscar por número ou nome da linha"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              testID="lines-search-clear-button"
              accessibilityRole="button"
              accessibilityLabel="Limpar busca">
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Pílulas de filtro */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setSelectedCategory('all')}
            style={[styles.filterPill, selectedCategory === 'all' && styles.filterPillActive]}
            hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}
            testID="lines-filter-pill-all"
            accessibilityRole="button"
            accessibilityState={{ selected: selectedCategory === 'all' }}
            accessibilityLabel={`Filtrar por Todas as linhas, ${CURITIBA_LINES.length} linhas`}>
            <Text style={[styles.filterText, selectedCategory === 'all' && styles.filterTextActive]}>
              Todas ({CURITIBA_LINES.length})
            </Text>
          </TouchableOpacity>

          {(Object.keys(RIT_CATEGORIES) as BusCategory[]).map((cat) => {
            const config = RIT_CATEGORIES[cat];
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}
                testID={`lines-filter-pill-${cat}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Filtrar por ${config.label}`}>
                <View style={[styles.dot, { backgroundColor: config.corHex }]} />
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {config.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Lista de Linhas */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filteredLines.map((line) => {
          const isFav = isFavoriteLine(line.codigo);

          return (
            <View key={line.id} style={styles.card}>
              <View style={styles.cardTop}>
                <BusBadge codigo={line.codigo} corHex={line.corHex} size="large" />

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.lineName} numberOfLines={1}>
                    {line.nome}
                  </Text>
                  <Text style={styles.categoryLabel}>
                    {RIT_CATEGORIES[line.categoria].label} • Tarifa: R$ {line.tarifa.toFixed(2)}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => toggleFavoriteLine(line.codigo)}
                  style={styles.favButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                  testID={`lines-favorite-button-${line.codigo}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isFav }}
                  accessibilityLabel={`${isFav ? 'Remover' : 'Adicionar'} linha ${line.codigo} dos favoritos`}>
                  <Bookmark
                    size={22}
                    color={isFav ? Colors.light.danger : Colors.light.textMuted}
                    fill={isFav ? Colors.light.danger : 'none'}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.terminalsRow}>
                <View style={styles.terminalItem}>
                  <MapPin size={14} color={Colors.light.textMuted} />
                  <Text style={styles.terminalText} numberOfLines={1}>
                    Origem: {line.terminalOrigem}
                  </Text>
                </View>
                <View style={styles.terminalItem}>
                  <MapPin size={14} color={Colors.light.textMuted} />
                  <Text style={styles.terminalText} numberOfLines={1}>
                    Destino: {line.terminalDestino}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <View style={styles.metaBadge}>
                  <Clock size={12} color={Colors.light.textMuted} />
                  <Text style={styles.metaText}>Pico a cada {line.frequenciaMinutosPico} min</Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleOpenOnMap(line)}
                  style={[styles.mapButton, { backgroundColor: line.corHex }]}
                  activeOpacity={0.8}
                  testID={`lines-open-map-button-${line.codigo}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver linha ${line.codigo} no mapa`}>
                  <Text style={styles.mapButtonText}>Ver no Mapa</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginTop: 2,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    padding: 0,
  },
  clearText: {
    color: Colors.light.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },
  filterRow: {
    gap: 8,
    marginTop: 12,
    paddingBottom: 2,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterPillActive: {
    backgroundColor: Colors.light.text,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    // ponytail: textMuted on surfaceMuted is 4.34:1, just under AA 4.5:1 for 12pt text.
    color: Colors.light.text,
  },
  filterTextActive: {
    color: Colors.light.surface,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.text,
  },
  categoryLabel: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  favButton: {
    padding: 6,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.light.surfaceMuted,
    marginVertical: 10,
  },
  terminalsRow: {
    gap: 6,
    marginBottom: 12,
  },
  terminalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  terminalText: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaText: {
    fontSize: 11,
    color: Colors.light.textMuted,
    fontWeight: '600',
  },
  mapButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mapButtonText: {
    color: Colors.light.surface,
    fontWeight: '700',
    fontSize: 12,
  },
});

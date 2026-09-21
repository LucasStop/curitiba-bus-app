import { BusBadge } from '@/components/ui/BusBadge';
import { RIT_CATEGORIES } from '@/constants/rit';
import { CURITIBA_LINES } from '@/data/curitibaDataset';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { useTransitStore } from '@/stores/useTransitStore';
import { BusCategory, BusLine } from '@/types/transit';
import { useRouter } from 'expo-router';
import { Bookmark, Clock, MapPin, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Catálogo de Linhas</Text>
        <Text style={styles.subtitle}>Rede Integrada de Transporte de Curitiba (RIT)</Text>

        {/* Busca */}
        <View style={styles.searchBar}>
          <Search size={18} color="#64748B" />
          <TextInput
            placeholder="Buscar por número ou nome da linha..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Pílulas de filtro */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setSelectedCategory('all')}
            style={[styles.filterPill, selectedCategory === 'all' && styles.filterPillActive]}>
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
                style={[styles.filterPill, isActive && styles.filterPillActive]}>
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
                  activeOpacity={0.7}>
                  <Bookmark
                    size={22}
                    color={isFav ? '#E11D48' : '#94A3B8'}
                    fill={isFav ? '#E11D48' : 'none'}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.terminalsRow}>
                <View style={styles.terminalItem}>
                  <MapPin size={14} color="#64748B" />
                  <Text style={styles.terminalText} numberOfLines={1}>
                    Origem: {line.terminalOrigem}
                  </Text>
                </View>
                <View style={styles.terminalItem}>
                  <MapPin size={14} color="#64748B" />
                  <Text style={styles.terminalText} numberOfLines={1}>
                    Destino: {line.terminalDestino}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <View style={styles.metaBadge}>
                  <Clock size={12} color="#64748B" />
                  <Text style={styles.metaText}>Pico a cada {line.frequenciaMinutosPico} min</Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleOpenOnMap(line)}
                  style={[styles.mapButton, { backgroundColor: line.corHex }]}
                  activeOpacity={0.8}>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  clearText: {
    color: '#94A3B8',
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
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterPillActive: {
    backgroundColor: '#0F172A',
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
    color: '#475569',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
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
    color: '#0F172A',
  },
  categoryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  favButton: {
    padding: 6,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
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
    color: '#475569',
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
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  mapButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mapButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});

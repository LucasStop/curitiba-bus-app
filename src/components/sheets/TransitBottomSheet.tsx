import { BusBadge } from '@/components/ui/BusBadge';
import { CategoryPills } from '@/components/ui/CategoryPills';
import { CURITIBA_LINES, CURITIBA_STOPS } from '@/data/curitibaDataset';
import { transitService } from '@/services/transitProvider';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { useTransitStore } from '@/stores/useTransitStore';
import { BusLine, BusStop } from '@/types/transit';
import { formatMinutes } from '@/utils/geo';
import { ArrowLeftRight, Bookmark, CheckCircle2, ChevronRight, Clock, MapPin, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export const TransitBottomSheet: React.FC = () => {
  const [localSearch, setLocalSearch] = useState('');

  const selectedLine = useTransitStore((s) => s.selectedLine);
  const selectedStop = useTransitStore((s) => s.selectedStop);
  const setSelectedLine = useTransitStore((s) => s.setSelectedLine);
  const setSelectedStop = useTransitStore((s) => s.setSelectedStop);
  const clearSelection = useTransitStore((s) => s.clearSelection);
  const activeDirection = useTransitStore((s) => s.activeDirection);
  const toggleActiveDirection = useTransitStore((s) => s.toggleActiveDirection);

  const { isFavoriteLine, toggleFavoriteLine, isFavoriteStop, toggleFavoriteStop } =
    useFavoritesStore();

  // Filtragem de linhas e paradas pela busca
  const filteredLines = CURITIBA_LINES.filter(
    (l) =>
      l.codigo.toLowerCase().includes(localSearch.toLowerCase()) ||
      l.nome.toLowerCase().includes(localSearch.toLowerCase())
  );

  const filteredStops = CURITIBA_STOPS.filter(
    (s) =>
      s.nome.toLowerCase().includes(localSearch.toLowerCase()) ||
      s.bairro.toLowerCase().includes(localSearch.toLowerCase())
  );

  // 1. Visão de Detalhes da Parada Selecionada
  if (selectedStop) {
    const arrivals = transitService.getArrivalsForStop(selectedStop.id);
    const isFav = isFavoriteStop(selectedStop.id);

    return (
      <View style={styles.sheetContainer}>
        <View style={styles.sheetHeader}>
          <View style={styles.dragHandle} />
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>
                  {selectedStop.tipo === 'terminal' ? 'TERMINAL DE INTEGRAÇÃO' : 'ESTAÇÃO-TUBO'}
                </Text>
              </View>
              <Text style={styles.sheetTitle}>{selectedStop.nome}</Text>
              <Text style={styles.sheetSubtitle}>Bairro {selectedStop.bairro}</Text>
            </View>

            <TouchableOpacity
              onPress={() => toggleFavoriteStop(selectedStop.id)}
              style={styles.iconButton}
              activeOpacity={0.7}>
              <Bookmark size={22} color={isFav ? '#E11D48' : '#94A3B8'} fill={isFav ? '#E11D48' : 'none'} />
            </TouchableOpacity>

            <TouchableOpacity onPress={clearSelection} style={styles.iconButton} activeOpacity={0.7}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Próximas Chegadas em Tempo Real</Text>

        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
          {arrivals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Buscando previsões de veículos próximos...</Text>
            </View>
          ) : (
            arrivals.map((arr, idx) => (
              <TouchableOpacity
                key={`${arr.veiculoPrefixo}-${idx}`}
                onPress={() => {
                  const line = CURITIBA_LINES.find((l) => l.codigo === arr.codLinha);
                  if (line) setSelectedLine(line);
                }}
                style={styles.arrivalCard}>
                <BusBadge codigo={arr.codLinha} corHex={arr.corHex} size="medium" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.arrivalLineName} numberOfLines={1}>
                    {arr.nomeLinha}
                  </Text>
                  <Text style={styles.arrivalMeta}>
                    Veículo {arr.veiculoPrefixo} • {arr.acessivelPCD ? 'Acessível ♿' : ''}
                  </Text>
                </View>
                <View style={styles.etaBadge}>
                  <Clock size={12} color="#16A34A" />
                  <Text style={styles.etaText}>{formatMinutes(arr.minutosAteChegada)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  // 2. Visão de Detalhes da Linha Selecionada
  if (selectedLine) {
    const isFav = isFavoriteLine(selectedLine.codigo);
    const stopIds = activeDirection === 'ida' ? selectedLine.paradasIda : selectedLine.paradasVolta;
    const lineStops = stopIds
      .map((id) => CURITIBA_STOPS.find((s) => s.id === id))
      .filter((s): s is BusStop => !!s);

    return (
      <View style={styles.sheetContainer}>
        <View style={styles.sheetHeader}>
          <View style={styles.dragHandle} />
          <View style={styles.headerRow}>
            <BusBadge codigo={selectedLine.codigo} corHex={selectedLine.corHex} size="large" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {selectedLine.nome}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {activeDirection === 'ida' ? selectedLine.terminalDestino : selectedLine.terminalOrigem}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => toggleFavoriteLine(selectedLine.codigo)}
              style={styles.iconButton}>
              <Bookmark size={22} color={isFav ? '#E11D48' : '#94A3B8'} fill={isFav ? '#E11D48' : 'none'} />
            </TouchableOpacity>

            <TouchableOpacity onPress={clearSelection} style={styles.iconButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Alternador de Sentido */}
          <TouchableOpacity
            onPress={toggleActiveDirection}
            style={styles.directionToggle}
            activeOpacity={0.8}>
            <ArrowLeftRight size={16} color="#0F172A" />
            <Text style={styles.directionToggleText}>
              Sentido: {activeDirection === 'ida' ? 'Ida' : 'Volta'} (Inverter)
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>Itinerário ({lineStops.length} Paradas)</Text>

        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
          {lineStops.map((stop, idx) => (
            <TouchableOpacity
              key={`line-stop-${stop.id}-${idx}`}
              onPress={() => setSelectedStop(stop)}
              style={styles.timelineItem}>
              <View style={styles.timelinePoint}>
                <View
                  style={[
                    styles.timelineDot,
                    { backgroundColor: idx === 0 || idx === lineStops.length - 1 ? selectedLine.corHex : '#94A3B8' },
                  ]}
                />
                {idx < lineStops.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineStopName}>{stop.nome}</Text>
                <Text style={styles.timelineStopBairro}>Bairro {stop.bairro}</Text>
              </View>
              <ChevronRight size={16} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // 3. Visão Padrão: Busca, Categorias e Paradas Próximas
  return (
    <View style={styles.sheetContainer}>
      <View style={styles.sheetHeader}>
        <View style={styles.dragHandle} />

        {/* Barra de Pesquisa Flutuante */}
        <View style={styles.searchBar}>
          <Search size={18} color="#64748B" />
          <TextInput
            placeholder="Buscar linha, terminal ou estação-tubo..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={localSearch}
            onChangeText={setLocalSearch}
          />
          {localSearch.length > 0 && (
            <TouchableOpacity onPress={() => setLocalSearch('')}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Pílulas de Categorias RIT */}
        <CategoryPills />
      </View>

      <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
        {localSearch.length > 0 ? (
          <>
            <Text style={styles.sectionHeader}>Linhas encontradas</Text>
            {filteredLines.map((line) => (
              <TouchableOpacity
                key={line.id}
                onPress={() => setSelectedLine(line)}
                style={styles.lineSearchCard}>
                <BusBadge codigo={line.codigo} corHex={line.corHex} size="medium" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.lineCardTitle}>{line.nome}</Text>
                  <Text style={styles.lineCardMeta}>
                    {line.terminalOrigem} ➔ {line.terminalDestino}
                  </Text>
                </View>
                <ChevronRight size={16} color="#94A3B8" />
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Paradas e Tubos</Text>
            {filteredStops.map((stop) => (
              <TouchableOpacity
                key={stop.id}
                onPress={() => setSelectedStop(stop)}
                style={styles.stopCard}>
                <MapPin size={18} color="#0284C7" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.stopCardName}>{stop.nome}</Text>
                  <Text style={styles.stopCardMeta}>Bairro {stop.bairro}</Text>
                </View>
                <ChevronRight size={16} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.sectionHeader}>Estações-Tubo e Terminais em Destaque</Text>
            {CURITIBA_STOPS.slice(0, 5).map((stop) => (
              <TouchableOpacity
                key={stop.id}
                onPress={() => setSelectedStop(stop)}
                style={styles.stopCard}>
                <MapPin size={18} color={stop.tipo === 'terminal' ? '#F59E0B' : '#0284C7'} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.stopCardName}>{stop.nome}</Text>
                  <Text style={styles.stopCardMeta}>
                    {stop.tipo === 'terminal' ? 'Terminal' : 'Estação-Tubo'} • Linhas:{' '}
                    {stop.linhas.join(', ')}
                  </Text>
                </View>
                <ChevronRight size={16} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0369A1',
  },
  iconButton: {
    padding: 8,
    marginLeft: 6,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
  },
  directionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  directionToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginVertical: 10,
  },
  listScroll: {
    marginBottom: 10,
  },
  arrivalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  arrivalLineName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  arrivalMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  etaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16A34A',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  timelinePoint: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineLine: {
    position: 'absolute',
    top: 10,
    bottom: -16,
    width: 2,
    backgroundColor: '#E2E8F0',
  },
  timelineContent: {
    flex: 1,
    marginLeft: 8,
  },
  timelineStopName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  timelineStopBairro: {
    fontSize: 11,
    color: '#64748B',
  },
  lineSearchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lineCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  lineCardMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stopCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  stopCardMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
  },
});

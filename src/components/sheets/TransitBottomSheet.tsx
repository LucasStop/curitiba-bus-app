import { BusBadge } from '@/components/ui/BusBadge';
import { CategoryPills } from '@/components/ui/CategoryPills';
import { Colors } from '@/constants/theme';
import { CURITIBA_LINES, CURITIBA_STOPS } from '@/data/curitibaDataset';
import { transitService } from '@/services/transitProvider';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { useTransitStore } from '@/stores/useTransitStore';
import { BusStop } from '@/types/transit';
import { formatEtaPhrase, formatMinutes } from '@/utils/geo';
import { ArrowLeftRight, Bookmark, ChevronRight, Clock, MapPin, Search } from 'lucide-react-native';
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
          <View
            style={styles.dragHandle}
            testID="sheet-drag-handle"
            accessibilityRole="adjustable"
            accessibilityLabel="Painel de informações. Arraste para redimensionar."
            accessibilityActions={[
              { name: 'increment', label: 'Expandir' },
              { name: 'decrement', label: 'Recolher' },
            ]}
          />
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
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              testID="sheet-stop-favorite-button"
              accessibilityRole="button"
              accessibilityState={{ selected: isFav }}
              accessibilityLabel={`${isFav ? 'Remover' : 'Adicionar'} ${selectedStop.nome} dos favoritos`}>
              <Bookmark size={22} color={isFav ? Colors.light.danger : Colors.light.textMuted} fill={isFav ? Colors.light.danger : 'none'} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={clearSelection}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              testID="sheet-stop-close-button"
              accessibilityRole="button"
              accessibilityLabel="Fechar detalhes da parada">
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
                style={styles.arrivalCard}
                testID={`sheet-arrival-card-${arr.codLinha}-${idx}`}
                accessibilityRole="button"
                accessibilityLabel={`Linha ${arr.codLinha}, ${arr.nomeLinha}, ${formatEtaPhrase(arr.minutosAteChegada)}${arr.acessivelPCD ? ', acessível' : ''}`}>
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
                  <Clock size={12} color={Colors.light.success} />
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
          <View
            style={styles.dragHandle}
            testID="sheet-drag-handle"
            accessibilityRole="adjustable"
            accessibilityLabel="Painel de informações. Arraste para redimensionar."
            accessibilityActions={[
              { name: 'increment', label: 'Expandir' },
              { name: 'decrement', label: 'Recolher' },
            ]}
          />
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
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID="sheet-line-favorite-button"
              accessibilityRole="button"
              accessibilityState={{ selected: isFav }}
              accessibilityLabel={`${isFav ? 'Remover' : 'Adicionar'} linha ${selectedLine.codigo} dos favoritos`}>
              <Bookmark size={22} color={isFav ? Colors.light.danger : Colors.light.textMuted} fill={isFav ? Colors.light.danger : 'none'} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={clearSelection}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID="sheet-line-close-button"
              accessibilityRole="button"
              accessibilityLabel="Fechar detalhes da linha">
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Alternador de Sentido */}
          <TouchableOpacity
            onPress={toggleActiveDirection}
            style={styles.directionToggle}
            activeOpacity={0.8}
            testID="sheet-direction-toggle-button"
            accessibilityRole="button"
            accessibilityLabel={`Sentido atual: ${activeDirection === 'ida' ? 'ida' : 'volta'}. Toque para inverter`}>
            <ArrowLeftRight size={16} color={Colors.light.text} />
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
              style={styles.timelineItem}
              testID={`sheet-timeline-stop-${stop.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Parada ${stop.nome}, bairro ${stop.bairro}`}>
              <View style={styles.timelinePoint}>
                <View
                  style={[
                    styles.timelineDot,
                    { backgroundColor: idx === 0 || idx === lineStops.length - 1 ? selectedLine.corHex : Colors.light.textMuted },
                  ]}
                />
                {idx < lineStops.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineStopName}>{stop.nome}</Text>
                <Text style={styles.timelineStopBairro}>Bairro {stop.bairro}</Text>
              </View>
              <ChevronRight size={16} color={Colors.light.borderStrong} />
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
        <View
          style={styles.dragHandle}
          testID="sheet-drag-handle"
          accessibilityRole="adjustable"
          accessibilityLabel="Painel de informações. Arraste para redimensionar."
          accessibilityActions={[
            { name: 'increment', label: 'Expandir' },
            { name: 'decrement', label: 'Recolher' },
          ]}
        />

        {/* Barra de Pesquisa Flutuante */}
        <View style={styles.searchBar}>
          <Search size={18} color={Colors.light.textMuted} />
          <TextInput
            placeholder="Buscar linha, terminal ou estação-tubo..."
            placeholderTextColor={Colors.light.textMuted}
            style={styles.searchInput}
            value={localSearch}
            onChangeText={setLocalSearch}
            testID="sheet-search-input"
            accessibilityLabel="Buscar linha, terminal ou estação-tubo"
          />
          {localSearch.length > 0 && (
            <TouchableOpacity
              onPress={() => setLocalSearch('')}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              testID="sheet-search-clear-button"
              accessibilityRole="button"
              accessibilityLabel="Limpar busca">
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
                style={styles.lineSearchCard}
                testID={`sheet-line-result-${line.codigo}`}
                accessibilityRole="button"
                accessibilityLabel={`Linha ${line.codigo}, ${line.nome}, de ${line.terminalOrigem} até ${line.terminalDestino}`}>
                <BusBadge codigo={line.codigo} corHex={line.corHex} size="medium" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.lineCardTitle}>{line.nome}</Text>
                  <Text style={styles.lineCardMeta}>
                    {line.terminalOrigem} ➔ {line.terminalDestino}
                  </Text>
                </View>
                <ChevronRight size={16} color={Colors.light.textMuted} />
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Paradas e Tubos</Text>
            {filteredStops.map((stop) => (
              <TouchableOpacity
                key={stop.id}
                onPress={() => setSelectedStop(stop)}
                style={styles.stopCard}
                testID={`sheet-stop-result-${stop.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Parada ${stop.nome}, bairro ${stop.bairro}`}>
                <MapPin size={18} color={Colors.light.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.stopCardName}>{stop.nome}</Text>
                  <Text style={styles.stopCardMeta}>Bairro {stop.bairro}</Text>
                </View>
                <ChevronRight size={16} color={Colors.light.borderStrong} />
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
                style={styles.stopCard}
                testID={`sheet-stop-featured-${stop.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${stop.tipo === 'terminal' ? 'Terminal' : 'Estação-tubo'} ${stop.nome}, linhas ${stop.linhas.join(', ')}`}>
                <MapPin size={18} color={stop.tipo === 'terminal' ? Colors.light.warning : Colors.light.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.stopCardName}>{stop.nome}</Text>
                  <Text style={styles.stopCardMeta}>
                    {stop.tipo === 'terminal' ? 'Terminal' : 'Estação-Tubo'} • Linhas:{' '}
                    {stop.linhas.join(', ')}
                  </Text>
                </View>
                <ChevronRight size={16} color={Colors.light.borderStrong} />
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
    backgroundColor: Colors.light.surface,
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
    backgroundColor: Colors.light.borderStrong,
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
    color: Colors.light.text,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  iconButton: {
    padding: 8,
    marginLeft: 6,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.textMuted,
  },
  directionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
    backgroundColor: Colors.light.surfaceMuted,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  directionToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    padding: 0,
  },
  clearSearchText: {
    fontSize: 14,
    color: Colors.light.textMuted,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textMuted,
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
    borderBottomColor: Colors.light.surfaceMuted,
  },
  arrivalLineName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  arrivalMeta: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.successMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  etaText: {
    fontSize: 12,
    fontWeight: '800',
    // ponytail: success on successMuted is 3:1, fails AA 4.5:1 for 12pt text.
    color: Colors.light.text,
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
    backgroundColor: Colors.light.border,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 8,
  },
  timelineStopName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  timelineStopBairro: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  lineSearchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.surfaceMuted,
  },
  lineCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  lineCardMeta: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.surfaceMuted,
  },
  stopCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  stopCardMeta: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.light.textMuted,
    fontSize: 13,
  },
});

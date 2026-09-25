import { useTheme } from '@/hooks/use-theme';
import { BusBadge } from '@/components/ui/BusBadge';
import { Radius, Shadows, Typography } from '@/constants/theme';
import { CURITIBA_STOPS, STOPS_BY_ID } from '@/data/curitibaDataset';
import { useUserLocation } from '@/hooks/useUserLocation';
import { planTransitTrip } from '@/services/tripPlanner';
import { TripPlanOption } from '@/types/transit';
import { ArrowUpDown, ChevronRight, Footprints, LocateFixed, Search, Sparkles, X } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Um ponto de rota é uma parada conhecida (BusStop, com id/bairro/linhas) ou um
// ponto de GPS/busca livre, que só precisa de nome + coordenadas.
type RoutePoint = { nome: string; latitude: number; longitude: number };

// Ids reais do GeoCuritiba (tubo Rui Barbosa 108030, tubo Carlos Gomes 108065, terminais).
const stopById = (id: string) => STOPS_BY_ID.get(id) ?? CURITIBA_STOPS[0];
const RUI_BARBOSA = stopById('108030');
const CARLOS_GOMES = stopById('108065');
const TERMINAL_CABRAL = stopById('terminal-cabral');
const TERMINAL_BOQUEIRAO = stopById('terminal-boqueirao');
const TERMINAL_PORTAO = stopById('terminal-portao');

export default function RoutesScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [originStop, setOriginStop] = useState<RoutePoint>(RUI_BARBOSA);
  const [destStop, setDestStop] = useState<RoutePoint>(TERMINAL_CABRAL);
  const [results, setResults] = useState<TripPlanOption[]>(() =>
    planTransitTrip(
      { latitude: RUI_BARBOSA.latitude, longitude: RUI_BARBOSA.longitude },
      { latitude: TERMINAL_CABRAL.latitude, longitude: TERMINAL_CABRAL.longitude },
    ),
  );

  const [pickerFor, setPickerFor] = useState<'origin' | 'destination' | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const { location: myLocation, hasPermission, loading: locationLoading } = useUserLocation();

  const handleSwap = () => {
    const temp = originStop;
    setOriginStop(destStop);
    setDestStop(temp);

    const newResults = planTransitTrip(
      { latitude: destStop.latitude, longitude: destStop.longitude },
      { latitude: temp.latitude, longitude: temp.longitude },
    );
    setResults(newResults);
  };

  const handleSelectRoute = (o: RoutePoint, d: RoutePoint) => {
    setOriginStop(o);
    setDestStop(d);
    const newResults = planTransitTrip(
      { latitude: o.latitude, longitude: o.longitude },
      { latitude: d.latitude, longitude: d.longitude },
    );
    setResults(newResults);
  };

  const openPicker = (target: 'origin' | 'destination') => {
    setPickerQuery('');
    setPickerFor(target);
  };

  const handlePickPoint = (point: RoutePoint) => {
    if (pickerFor === 'origin') {
      handleSelectRoute(point, destStop);
    } else if (pickerFor === 'destination') {
      handleSelectRoute(originStop, point);
    }
    setPickerFor(null);
  };

  const handleUseMyLocation = () => {
    if (hasPermission === false) {
      Alert.alert(
        'Permissão de localização negada',
        'Habilite o acesso à localização nas configurações do app para usar sua posição atual.',
      );
      return;
    }
    handlePickPoint({ nome: 'Minha localização atual', ...myLocation });
  };

  const filteredStops = CURITIBA_STOPS.filter((stop) =>
    stop.nome.toLowerCase().includes(pickerQuery.trim().toLowerCase()),
  ).slice(0, 30);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header com Formulário de Viagem */}
      <View style={styles.header}>
        <Text style={styles.title}>Planejador de Viagens</Text>
        <Text style={styles.subtitle}>Como ir com a Rede Integrada de Curitiba</Text>

        <View style={styles.inputsCard}>
          <View style={styles.dotLineCol}>
            <View style={styles.greenDot} />
            <View style={styles.vertLine} />
            <View style={styles.redDot} />
          </View>

          <View style={styles.fieldsCol}>
            {/* Origem */}
            <TouchableOpacity
              style={styles.inputField}
              onPress={() => openPicker('origin')}
              testID="routes-origin-field"
              accessibilityRole="button"
              accessibilityLabel={`Origem: ${originStop.nome}. Toque para alterar`}>
              <Text style={styles.fieldLabel}>Origem</Text>
              <Text style={styles.fieldText} numberOfLines={1}>
                {originStop.nome}
              </Text>
            </TouchableOpacity>

            <View style={styles.fieldDivider} />

            {/* Destino */}
            <TouchableOpacity
              style={styles.inputField}
              onPress={() => openPicker('destination')}
              testID="routes-destination-field"
              accessibilityRole="button"
              accessibilityLabel={`Destino: ${destStop.nome}. Toque para alterar`}>
              <Text style={styles.fieldLabel}>Destino</Text>
              <Text style={styles.fieldText} numberOfLines={1}>
                {destStop.nome}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botão de Inverter */}
          <TouchableOpacity
            onPress={handleSwap}
            style={styles.swapButton}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            activeOpacity={0.7}
            testID="routes-swap-button"
            accessibilityRole="button"
            accessibilityLabel="Inverter origem e destino">
            <ArrowUpDown size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Atalhos Rápidos */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChips}>
          <TouchableOpacity
            onPress={() => handleSelectRoute(RUI_BARBOSA, TERMINAL_CABRAL)}
            style={styles.chip}
            hitSlop={{ top: 8, bottom: 8 }}
            testID="routes-quick-chip-0"
            accessibilityRole="button"
            accessibilityLabel="Rota rápida de Rui Barbosa até Cabral">
            <Sparkles size={12} color={theme.primary} />
            <Text style={styles.chipText}>Rui Barbosa ➔ Cabral</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSelectRoute(CARLOS_GOMES, TERMINAL_BOQUEIRAO)}
            style={styles.chip}
            hitSlop={{ top: 8, bottom: 8 }}
            testID="routes-quick-chip-1"
            accessibilityRole="button"
            accessibilityLabel="Rota rápida de Carlos Gomes até Boqueirão">
            <Sparkles size={12} color={theme.primary} />
            <Text style={styles.chipText}>Carlos Gomes ➔ Boqueirão</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSelectRoute(TERMINAL_CABRAL, TERMINAL_PORTAO)}
            style={styles.chip}
            hitSlop={{ top: 8, bottom: 8 }}
            testID="routes-quick-chip-2"
            accessibilityRole="button"
            accessibilityLabel="Rota rápida de Cabral até Portão">
            <Sparkles size={12} color={theme.primary} />
            <Text style={styles.chipText}>Cabral ➔ Portão</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Opções de Rotas Calculadas */}
      <ScrollView style={styles.resultsList} contentContainerStyle={styles.resultsContent}>
        <Text style={styles.resultsHeader}>Melhores Itinerários Encontrados</Text>

        {results.length === 0 && (
          <Text
            style={styles.pickerEmptyText}
            testID="routes-empty-results"
            accessibilityLabel="Nenhum itinerário: origem e destino são o mesmo lugar">
            Você já está aqui — escolha um destino diferente.
          </Text>
        )}

        {results.map((opt, idx) => (
          <View key={opt.id} style={styles.optionCard}>
            <View style={styles.optionTop}>
              <View>
                <View style={styles.durationRow}>
                  <Text style={styles.durationMinutes}>{opt.duracaoTotalMinutos} min</Text>
                  {idx === 0 && (
                    <View style={styles.bestBadge}>
                      <Text style={styles.bestBadgeText}>Mais Rápido</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.scheduleText}>
                  {opt.horarioPartida} - {opt.horarioChegada} • Tarifa R$ {opt.custoTarifa.toFixed(2)}
                </Text>
              </View>

              {opt.caminhadaTotalMetros > 0 && (
                <View style={styles.walkMeta}>
                  <Footprints size={14} color={theme.textMuted} />
                  <Text style={styles.walkText}>{opt.caminhadaTotalMetros}m a pé</Text>
                </View>
              )}
            </View>

            <View style={styles.legsDivider} />

            {/* Linha do Tempo da Viagem */}
            <View style={styles.legsContainer}>
              {opt.pernas.map((leg, legIdx) => (
                <View key={legIdx} style={styles.legRow}>
                  {leg.tipo === 'walk' ? (
                    <View style={styles.walkIconContainer}>
                      <Footprints size={16} color={theme.textMuted} />
                    </View>
                  ) : (
                    <BusBadge codigo={leg.linha?.codigo || ''} corHex={leg.linha?.corHex} size="small" />
                  )}

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.legInstruction}>{leg.instrucao}</Text>
                    {leg.linha && (
                      <Text style={styles.legSubtext}>
                        Desembarque em: {leg.linha.desembarqueParada} ({leg.linha.quantidadeParadas}{' '}
                        {leg.linha.quantidadeParadas === 1 ? 'parada' : 'paradas'})
                      </Text>
                    )}
                  </View>

                  <Text style={styles.legDuration}>{leg.duracaoMinutos} min</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Seletor de Origem/Destino: localização atual ou busca por parada */}
      <Modal visible={pickerFor !== null} animationType="slide" transparent onRequestClose={() => setPickerFor(null)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />

            <View style={styles.pickerHeaderRow}>
              <Text style={styles.pickerTitle}>
                {pickerFor === 'origin' ? 'Selecionar origem' : 'Selecionar destino'}
              </Text>
              <TouchableOpacity
                onPress={() => setPickerFor(null)}
                style={styles.pickerCloseButton}
                testID="routes-picker-close-button"
                accessibilityRole="button"
                accessibilityLabel="Fechar seletor">
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleUseMyLocation}
              style={styles.useLocationButton}
              disabled={locationLoading}
              testID="routes-picker-use-location"
              accessibilityRole="button"
              accessibilityLabel="Usar minha localização atual">
              <LocateFixed size={18} color={theme.primary} />
              <Text style={styles.useLocationText}>
                {locationLoading ? 'Obtendo localização...' : 'Usar minha localização'}
              </Text>
            </TouchableOpacity>

            <View style={styles.pickerSearchBar}>
              <Search size={18} color={theme.textMuted} />
              <TextInput
                placeholder="Buscar parada por nome..."
                placeholderTextColor={theme.textSubtle}
                style={styles.pickerSearchInput}
                value={pickerQuery}
                onChangeText={setPickerQuery}
                testID="routes-picker-search-input"
                accessibilityLabel="Buscar parada por nome"
              />
            </View>

            <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
              {filteredStops.map((stop) => (
                <TouchableOpacity
                  key={stop.id}
                  onPress={() => handlePickPoint(stop)}
                  style={styles.pickerStopRow}
                  testID={`routes-picker-stop-${stop.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Parada ${stop.nome}${stop.bairro ? `, bairro ${stop.bairro}` : ''}`}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerStopName}>{stop.nome}</Text>
                    {stop.bairro && <Text style={styles.pickerStopMeta}>Bairro {stop.bairro}</Text>}
                  </View>
                  <ChevronRight size={16} color={theme.borderStrong} />
                </TouchableOpacity>
              ))}
              {filteredStops.length === 0 && <Text style={styles.pickerEmptyText}>Nenhuma parada encontrada</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.surface,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      fontSize: Typography.screenTitle.fontSize,
      lineHeight: Typography.screenTitle.lineHeight,
      fontWeight: '900',
      color: theme.text,
    },
    subtitle: {
      fontSize: Typography.label.fontSize,
      lineHeight: Typography.label.lineHeight,
      color: theme.textMuted,
      marginTop: 2,
      marginBottom: 12,
    },
    inputsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceMuted,
      borderRadius: Radius.lg,
      padding: 12,
    },
    dotLineCol: {
      alignItems: 'center',
      width: 20,
      marginRight: 8,
    },
    greenDot: {
      width: 10,
      height: 10,
      borderRadius: Radius.pill,
      backgroundColor: theme.success,
    },
    vertLine: {
      width: 2,
      height: 32,
      backgroundColor: theme.borderStrong,
      marginVertical: 4,
    },
    redDot: {
      width: 10,
      height: 10,
      borderRadius: Radius.pill,
      backgroundColor: theme.danger,
    },
    fieldsCol: {
      flex: 1,
      gap: 4,
    },
    inputField: {
      paddingVertical: 4,
    },
    fieldLabel: {
      fontSize: Typography.label.fontSize,
      lineHeight: Typography.label.lineHeight,
      fontWeight: '700',
      // ponytail: textMuted on surfaceMuted is 4.34:1, just under AA 4.5:1 for 10pt text.
      color: theme.text,
      textTransform: 'uppercase',
    },
    fieldText: {
      fontSize: Typography.body.fontSize,
      lineHeight: Typography.body.lineHeight,
      fontWeight: '700',
      color: theme.text,
    },
    fieldDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 2,
    },
    swapButton: {
      width: 36,
      height: 36,
      borderRadius: Radius.pill,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
      ...Shadows.card,
    },
    quickChips: {
      gap: 8,
      marginTop: 12,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primaryMuted,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      gap: 6,
    },
    chipText: {
      fontSize: Typography.label.fontSize,
      lineHeight: Typography.label.lineHeight,
      fontWeight: '700',
      color: theme.primary,
    },
    resultsList: {
      flex: 1,
    },
    resultsContent: {
      padding: 16,
      gap: 14,
    },
    resultsHeader: {
      fontSize: Typography.label.fontSize,
      lineHeight: Typography.label.lineHeight,
      fontWeight: '700',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    optionCard: {
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      padding: 16,
      ...Shadows.card,
    },
    optionTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    durationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    durationMinutes: {
      fontSize: Typography.heroEta.fontSize,
      lineHeight: Typography.heroEta.lineHeight,
      fontVariant: ['tabular-nums'],
      fontWeight: '900',
      color: theme.text,
    },
    bestBadge: {
      backgroundColor: theme.successMuted,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: Radius.sm,
    },
    bestBadgeText: {
      fontSize: Typography.label.fontSize,
      fontWeight: '800',
      // ponytail: success on successMuted is 3:1, fails AA 4.5:1 for 10pt text.
      color: theme.text,
    },
    scheduleText: {
      fontSize: Typography.label.fontSize,
      lineHeight: Typography.label.lineHeight,
      color: theme.textMuted,
      marginTop: 2,
    },
    walkMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.surfaceMuted,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: Radius.sm,
    },
    walkText: {
      fontSize: Typography.label.fontSize,
      fontWeight: '600',
      // ponytail: textMuted on surfaceMuted is 4.34:1, just under AA 4.5:1 for 11pt text.
      color: theme.text,
    },
    legsDivider: {
      height: 1,
      backgroundColor: theme.surfaceMuted,
      marginVertical: 14,
    },
    legsContainer: {
      gap: 10,
    },
    legRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    walkIconContainer: {
      width: 32,
      alignItems: 'center',
    },
    legInstruction: {
      fontSize: Typography.body.fontSize,
      lineHeight: Typography.body.lineHeight,
      fontWeight: '600',
      color: theme.text,
    },
    legSubtext: {
      fontSize: Typography.label.fontSize,
      lineHeight: Typography.label.lineHeight,
      color: theme.textMuted,
      marginTop: 2,
    },
    legDuration: {
      fontSize: Typography.label.fontSize,
      lineHeight: Typography.label.lineHeight,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
      color: theme.textMuted,
    },
    pickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    pickerSheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: Radius.lg,
      borderTopRightRadius: Radius.lg,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 24,
      maxHeight: '80%',
    },
    pickerHandle: {
      width: 36,
      height: 4,
      borderRadius: Radius.pill,
      backgroundColor: theme.borderStrong,
      alignSelf: 'center',
      marginBottom: 10,
    },
    pickerHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    pickerTitle: {
      fontSize: Typography.itemTitle.fontSize,
      lineHeight: Typography.itemTitle.lineHeight,
      fontWeight: '800',
      color: theme.text,
    },
    pickerCloseButton: {
      padding: 4,
    },
    useLocationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.primaryMuted,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: Radius.md,
      marginBottom: 12,
    },
    useLocationText: {
      fontSize: Typography.body.fontSize,
      fontWeight: '700',
      color: theme.primary,
    },
    pickerSearchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceMuted,
      borderRadius: Radius.md,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      marginBottom: 8,
    },
    pickerSearchInput: {
      flex: 1,
      fontSize: Typography.body.fontSize,
      color: theme.text,
      padding: 0,
    },
    pickerList: {
      maxHeight: 320,
    },
    pickerStopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.surfaceMuted,
    },
    pickerStopName: {
      fontSize: Typography.body.fontSize,
      fontWeight: '600',
      color: theme.text,
    },
    pickerStopMeta: {
      fontSize: Typography.label.fontSize,
      color: theme.textMuted,
      marginTop: 2,
    },
    pickerEmptyText: {
      textAlign: 'center',
      color: theme.textSubtle,
      fontSize: Typography.body.fontSize,
      paddingVertical: 20,
    },
  });
}

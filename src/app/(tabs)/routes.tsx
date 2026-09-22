import { BusBadge } from '@/components/ui/BusBadge';
import { Colors } from '@/constants/theme';
import { CURITIBA_STOPS } from '@/data/curitibaDataset';
import { planTransitTrip } from '@/services/tripPlanner';
import { TripPlanOption } from '@/types/transit';
import { ArrowUpDown, Footprints, Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RoutesScreen() {
  const [originStop, setOriginStop] = useState(CURITIBA_STOPS[4]); // Praça Rui Barbosa
  const [destStop, setDestStop] = useState(CURITIBA_STOPS[1]); // Terminal Cabral
  const [results, setResults] = useState<TripPlanOption[]>(() =>
    planTransitTrip(
      { latitude: CURITIBA_STOPS[4].latitude, longitude: CURITIBA_STOPS[4].longitude },
      { latitude: CURITIBA_STOPS[1].latitude, longitude: CURITIBA_STOPS[1].longitude }
    )
  );

  const handleSwap = () => {
    const temp = originStop;
    setOriginStop(destStop);
    setDestStop(temp);

    const newResults = planTransitTrip(
      { latitude: destStop.latitude, longitude: destStop.longitude },
      { latitude: temp.latitude, longitude: temp.longitude }
    );
    setResults(newResults);
  };

  const handleSelectRoute = (o: (typeof CURITIBA_STOPS)[0], d: (typeof CURITIBA_STOPS)[0]) => {
    setOriginStop(o);
    setDestStop(d);
    const newResults = planTransitTrip(
      { latitude: o.latitude, longitude: o.longitude },
      { latitude: d.latitude, longitude: d.longitude }
    );
    setResults(newResults);
  };

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
              testID="routes-origin-field"
              accessibilityLabel={`Origem: ${originStop.nome}`}>
              <Text style={styles.fieldLabel}>Origem</Text>
              <Text style={styles.fieldText} numberOfLines={1}>
                {originStop.nome}
              </Text>
            </TouchableOpacity>

            <View style={styles.fieldDivider} />

            {/* Destino */}
            <TouchableOpacity
              style={styles.inputField}
              testID="routes-destination-field"
              accessibilityLabel={`Destino: ${destStop.nome}`}>
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
            activeOpacity={0.7}
            testID="routes-swap-button"
            accessibilityRole="button"
            accessibilityLabel="Inverter origem e destino">
            <ArrowUpDown size={18} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        {/* Atalhos Rápidos */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChips}>
          <TouchableOpacity
            onPress={() => handleSelectRoute(CURITIBA_STOPS[4], CURITIBA_STOPS[1])}
            style={styles.chip}
            testID="routes-quick-chip-0"
            accessibilityRole="button"
            accessibilityLabel="Rota rápida de Rui Barbosa até Cabral">
            <Sparkles size={12} color={Colors.light.primary} />
            <Text style={styles.chipText}>Rui Barbosa ➔ Cabral</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSelectRoute(CURITIBA_STOPS[5], CURITIBA_STOPS[12])}
            style={styles.chip}
            testID="routes-quick-chip-1"
            accessibilityRole="button"
            accessibilityLabel="Rota rápida de Carlos Gomes até Boqueirão">
            <Sparkles size={12} color={Colors.light.primary} />
            <Text style={styles.chipText}>Carlos Gomes ➔ Boqueirão</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSelectRoute(CURITIBA_STOPS[1], CURITIBA_STOPS[8])}
            style={styles.chip}
            testID="routes-quick-chip-2"
            accessibilityRole="button"
            accessibilityLabel="Rota rápida de Cabral até Portão">
            <Sparkles size={12} color={Colors.light.primary} />
            <Text style={styles.chipText}>Cabral ➔ Portão</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Opções de Rotas Calculadas */}
      <ScrollView style={styles.resultsList} contentContainerStyle={styles.resultsContent}>
        <Text style={styles.resultsHeader}>Melhores Itinerários Encontrados</Text>

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

              <View style={styles.walkMeta}>
                <Footprints size={14} color={Colors.light.textMuted} />
                <Text style={styles.walkText}>{opt.caminhadaTotalMetros}m a pé</Text>
              </View>
            </View>

            <View style={styles.legsDivider} />

            {/* Linha do Tempo da Viagem */}
            <View style={styles.legsContainer}>
              {opt.pernas.map((leg, legIdx) => (
                <View key={legIdx} style={styles.legRow}>
                  {leg.tipo === 'walk' ? (
                    <View style={styles.walkIconContainer}>
                      <Footprints size={16} color={Colors.light.textMuted} />
                    </View>
                  ) : (
                    <BusBadge
                      codigo={leg.linha?.codigo || ''}
                      corHex={leg.linha?.corHex}
                      size="small"
                    />
                  )}

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.legInstruction}>{leg.instrucao}</Text>
                    {leg.linha && (
                      <Text style={styles.legSubtext}>
                        Desembarque em: {leg.linha.desembarqueParada} ({leg.linha.quantidadeParadas} paradas)
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
    paddingBottom: 14,
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
  inputsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceMuted,
    borderRadius: 16,
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
    borderRadius: 5,
    backgroundColor: Colors.light.success,
  },
  vertLine: {
    width: 2,
    height: 32,
    backgroundColor: Colors.light.borderStrong,
    marginVertical: 4,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.light.danger,
  },
  fieldsCol: {
    flex: 1,
    gap: 4,
  },
  inputField: {
    paddingVertical: 4,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.light.textSubtle,
    textTransform: 'uppercase',
  },
  fieldText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 2,
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickChips: {
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    padding: 16,
    gap: 14,
  },
  resultsHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
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
    fontSize: 22,
    fontWeight: '900',
    color: Colors.light.text,
  },
  bestBadge: {
    backgroundColor: Colors.light.successMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bestBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.light.success,
  },
  scheduleText: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  walkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  walkText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  legsDivider: {
    height: 1,
    backgroundColor: Colors.light.surfaceMuted,
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
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  legSubtext: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  legDuration: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textMuted,
  },
});

import { Colors, Radius } from '@/constants/theme';
import { BusStop } from '@/types/transit';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StopMarkerProps {
  stop: BusStop;
  isSelected?: boolean;
}

export function getStopMarkerAccessibilityLabel(stop: BusStop, isSelected = false): string {
  const tipo = stop.tipo === 'terminal' ? 'Terminal' : 'Estação-tubo';
  return `${tipo} ${stop.nome}, bairro ${stop.bairro}${
    isSelected ? ', selecionada' : ''
  }`;
}

// Memoizado: stops são estáticos (CURITIBA_STOPS), mas sem isso todo tick de veículo
// (3s) e toda mudança de seleção re-renderizam as ~20+ paradas junto com os ônibus.
export const StopMarker: React.FC<StopMarkerProps> = React.memo(({ stop, isSelected = false }) => {
  const isTerminal = stop.tipo === 'terminal';

  return (
    <View style={[styles.container, isSelected && styles.selectedContainer]}>
      {isTerminal ? (
        <View style={styles.terminalBadge}>
          <Text style={styles.terminalIcon}>🏛️</Text>
        </View>
      ) : (
        <View style={styles.tuboBadge}>
          <View style={styles.tuboCilindro} />
        </View>
      )}
    </View>
  );
});

StopMarker.displayName = 'StopMarker';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  selectedContainer: {
    transform: [{ scale: 1.3 }],
  },
  tuboBadge: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    backgroundColor: Colors.light.primary, // Azul tubo
    borderWidth: 2,
    borderColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  tuboCilindro: {
    width: 10,
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.light.surface,
  },
  terminalBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Colors.light.text,
    borderWidth: 2,
    borderColor: Colors.light.warning, // Dourado terminal
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  terminalIcon: {
    fontSize: 13,
  },
});

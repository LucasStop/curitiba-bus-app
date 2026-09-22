import { BusVehicle } from '@/types/transit';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface BusMarkerProps {
  vehicle: BusVehicle;
  isSelected?: boolean;
}

// Rótulo de acessibilidade do marcador (DESIGN.md: "Linha 203, sentido Terminal Boa Vista, chegando em 4 min").
// BusVehicle não carrega nome do terminal nem ETA para este ponto do mapa, então usa sentido ida/volta.
export function getBusMarkerAccessibilityLabel(vehicle: BusVehicle, isSelected = false): string {
  const sentido = vehicle.sentido === 'ida' ? 'ida' : 'volta';
  return `Ônibus linha ${vehicle.codLinha}, ${vehicle.nomeLinha}, sentido ${sentido}${
    isSelected ? ', selecionado' : ''
  }`;
}

export const BusMarker: React.FC<BusMarkerProps> = ({ vehicle, isSelected = false }) => {
  return (
    <View style={[styles.container, isSelected && styles.selectedContainer]}>
      {/* Indicador direcional com rotação baseada no bearing */}
      <View
        style={[
          styles.headingIndicator,
          { transform: [{ rotate: `${vehicle.bearing}deg` }] },
        ]}>
        <View style={[styles.arrowHead, { borderBottomColor: vehicle.corHex }]} />
      </View>

      {/* Caixa do ônibus com código da linha */}
      <View style={[styles.busBadge, { backgroundColor: vehicle.corHex }]}>
        <Text style={styles.lineCode}>{vehicle.codLinha}</Text>
      </View>

      {/* Prefixo do veículo (opcional para identificação visual rápida) */}
      <View style={styles.prefixBadge}>
        <Text style={styles.prefixText}>{vehicle.prefixo}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  selectedContainer: {
    transform: [{ scale: 1.15 }],
  },
  headingIndicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  arrowHead: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  busBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  lineCode: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  prefixBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  prefixText: {
    color: '#F8FAFC',
    fontSize: 9,
    fontWeight: '700',
  },
});

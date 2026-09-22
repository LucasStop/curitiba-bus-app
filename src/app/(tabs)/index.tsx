import { CuritibaMap } from '@/components/map/CuritibaMap';
import { TransitBottomSheet } from '@/components/sheets/TransitBottomSheet';
import { useLiveVehicles } from '@/hooks/useLiveVehicles';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useTransitStore } from '@/stores/useTransitStore';
import { BusStop, BusVehicle } from '@/types/transit';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MapScreen() {
  const { location } = useUserLocation();
  const { totalActive } = useLiveVehicles();

  const setSelectedStop = useTransitStore((s) => s.setSelectedStop);
  const setSelectedVehicle = useTransitStore((s) => s.setSelectedVehicle);

  const handleSelectVehicle = (vehicle: BusVehicle) => {
    setSelectedVehicle(vehicle);
  };

  const handleSelectStop = (stop: BusStop) => {
    setSelectedStop(stop);
  };

  return (
    <View style={styles.container}>
      {/* Barra de Status Superior */}
      <SafeAreaView style={styles.topSafeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.appTitle}>Curitiba Ônibus RIT</Text>
            <Text style={styles.appSubtitle}>Navegação e rastreamento ao vivo</Text>
          </View>
          <View
            style={styles.liveIndicator}
            testID="map-live-indicator"
            accessible
            accessibilityLabel={`${totalActive} ônibus ao vivo agora`}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveText}>{totalActive} ao vivo</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Mapa Principal Interativo */}
      <View style={styles.mapWrapper}>
        <CuritibaMap
          userLocation={location}
          onSelectVehicle={handleSelectVehicle}
          onSelectStop={handleSelectStop}
        />
      </View>

      {/* Gaveta de Informações Deslizante */}
      <TransitBottomSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topSafeArea: {
    backgroundColor: '#FFFFFF',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  mapWrapper: {
    flex: 1,
  },
});

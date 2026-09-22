import { CURITIBA_COORDINATES } from '@/constants/rit';
import { CURITIBA_STOPS } from '@/data/curitibaDataset';
import { useLiveVehicles } from '@/hooks/useLiveVehicles';
import { useTransitStore } from '@/stores/useTransitStore';
import { BusStop, BusVehicle, LatLng } from '@/types/transit';
import { Compass, Layers, LocateFixed, Navigation2 } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { LIGHT_MAP_STYLE } from '../../constants/mapStyles';
import { BusMarker, getBusMarkerAccessibilityLabel } from './BusMarker';
import { StopMarker, getStopMarkerAccessibilityLabel } from './StopMarker';

interface CuritibaMapProps {
  userLocation: LatLng;
  onSelectVehicle?: (v: BusVehicle) => void;
  onSelectStop?: (s: BusStop) => void;
}

export const CuritibaMap: React.FC<CuritibaMapProps> = ({
  userLocation,
  onSelectVehicle,
  onSelectStop,
}) => {
  const mapRef = useRef<MapView | null>(null);

  const { vehicles } = useLiveVehicles();
  const selectedLine = useTransitStore((s) => s.selectedLine);
  const selectedStop = useTransitStore((s) => s.selectedStop);
  const selectedVehicle = useTransitStore((s) => s.selectedVehicle);
  const activeDirection = useTransitStore((s) => s.activeDirection);
  const toggleActiveDirection = useTransitStore((s) => s.toggleActiveDirection);
  const isMapTrafficVisible = useTransitStore((s) => s.isMapTrafficVisible);
  const toggleMapTraffic = useTransitStore((s) => s.toggleMapTraffic);
  const clearSelection = useTransitStore((s) => s.clearSelection);

  // Centraliza o mapa na localização do usuário
  const centerOnUser = () => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        },
        700
      );
    }
  };

  // Trajeto ativo da linha selecionada
  const activePolyline = selectedLine
    ? activeDirection === 'ida'
      ? selectedLine.trajetoIda
      : selectedLine.trajetoVolta
    : [];

  // Paradas a exibir: todas ou apenas as da linha selecionada
  const displayedStops = selectedLine
    ? CURITIBA_STOPS.filter((stop) =>
        (activeDirection === 'ida' ? selectedLine.paradasIda : selectedLine.paradasVolta).includes(stop.id)
      )
    : CURITIBA_STOPS;

  // Renderização Web simplificada caso execute no navegador
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webFallbackContainer}>
        <View style={styles.webHeader}>
          <Text style={styles.webTitle}>Mapa em Tempo Real - Curitiba RIT</Text>
          <Text style={styles.webSubtitle}>
            {vehicles.length} ônibus em circulação ativa agora
          </Text>
        </View>

        <View style={styles.webMapSimulation}>
          <View style={styles.webCenterPin}>
            <Text style={styles.webCenterText}>📍 Centro de Curitiba</Text>
          </View>

          {/* Ônibus simulados na interface Web */}
          <View style={styles.webVehicleGrid}>
            {vehicles.slice(0, 6).map((v) => (
              <TouchableOpacity
                key={v.id}
                onPress={() => onSelectVehicle?.(v)}
                style={[styles.webVehicleCard, { borderLeftColor: v.corHex }]}
                testID={`bus-marker-${v.codLinha}-${v.id}`}
                accessibilityRole="button"
                accessibilityLabel={getBusMarkerAccessibilityLabel(v)}>
                <View style={styles.webCardRow}>
                  <View style={[styles.webBadge, { backgroundColor: v.corHex }]}>
                    <Text style={styles.webBadgeText}>{v.codLinha}</Text>
                  </View>
                  <Text style={styles.webLineName} numberOfLines={1}>
                    {v.nomeLinha}
                  </Text>
                </View>
                <Text style={styles.webVehicleMeta}>
                  Prefixo: {v.prefixo} • Sentido: {v.sentido.toUpperCase()} • {v.velocidadeKmH} km/h
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={CURITIBA_COORDINATES}
        customMapStyle={LIGHT_MAP_STYLE}
        showsTraffic={isMapTrafficVisible}
        showsCompass={false}
        showsMyLocationButton={false}
        showsUserLocation={true}>
        {/* Rota desenhada com a cor oficial da linha */}
        {activePolyline.length > 0 && selectedLine && (
          <Polyline
            coordinates={activePolyline}
            strokeColor={selectedLine.corHex}
            strokeWidth={5}
            lineDashPattern={selectedLine.categoria === 'alimentador' ? [6, 4] : undefined}
          />
        )}

        {/* Marcadores de Paradas e Estações-Tubo */}
        {displayedStops.map((stop) => (
          <Marker
            key={`stop-${stop.id}`}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
            onPress={() => onSelectStop?.(stop)}
            tracksViewChanges={false}
            testID={`stop-marker-${stop.id}`}
            accessibilityRole="button"
            accessibilityLabel={getStopMarkerAccessibilityLabel(stop, selectedStop?.id === stop.id)}>
            <StopMarker stop={stop} isSelected={selectedStop?.id === stop.id} />
          </Marker>
        ))}

        {/* Marcadores de Ônibus em Tempo Real */}
        {vehicles.map((bus) => (
          <Marker
            key={`bus-${bus.id}`}
            coordinate={{ latitude: bus.latitude, longitude: bus.longitude }}
            onPress={() => onSelectVehicle?.(bus)}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
            testID={`bus-marker-${bus.codLinha}-${bus.id}`}
            accessibilityRole="button"
            accessibilityLabel={getBusMarkerAccessibilityLabel(bus, selectedVehicle?.id === bus.id)}>
            <BusMarker vehicle={bus} isSelected={selectedVehicle?.id === bus.id} />
          </Marker>
        ))}
      </MapView>

      {/* Botões Flutuantes de Controle (Estilo Google Maps & Waze) */}
      <View style={styles.fabContainer}>
        {selectedLine && (
          <TouchableOpacity
            style={[styles.fabButton, styles.directionButton]}
            onPress={toggleActiveDirection}
            activeOpacity={0.8}
            testID="map-toggle-direction-button"
            accessibilityRole="button"
            accessibilityLabel={`Sentido ${activeDirection === 'ida' ? 'ida' : 'volta'}. Toque para inverter o sentido da linha ${selectedLine.codigo}`}>
            <Navigation2 size={18} color="#FFFFFF" />
            <Text style={styles.directionText}>
              {activeDirection === 'ida' ? 'Ida' : 'Volta'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.fabButton}
          onPress={toggleMapTraffic}
          activeOpacity={0.8}
          testID="map-layers-button"
          accessibilityRole="button"
          accessibilityLabel={`${isMapTrafficVisible ? 'Ocultar' : 'Mostrar'} trânsito no mapa`}>
          <Layers size={20} color={isMapTrafficVisible ? '#E11D48' : '#334155'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fabButton}
          onPress={centerOnUser}
          activeOpacity={0.8}
          testID="map-locate-button"
          accessibilityRole="button"
          accessibilityLabel="Centralizar mapa na minha localização">
          <LocateFixed size={20} color="#0284C7" />
        </TouchableOpacity>
      </View>

      {/* Banner flutuante quando uma linha estiver ativa no mapa */}
      {selectedLine && (
        <View style={styles.activeLineBanner}>
          <View style={[styles.lineDot, { backgroundColor: selectedLine.corHex }]} />
          <Text style={styles.bannerTitle} numberOfLines={1} testID="map-active-line-banner-title">
            {selectedLine.codigo} - {selectedLine.nome} ({activeDirection.toUpperCase()})
          </Text>
          <TouchableOpacity
            onPress={clearSelection}
            hitSlop={10}
            testID="map-clear-selection-button"
            accessibilityRole="button"
            accessibilityLabel="Fechar detalhes da linha selecionada">
            <Text style={styles.bannerClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fabContainer: {
    position: 'absolute',
    right: 16,
    top: 70,
    gap: 10,
    alignItems: 'flex-end',
  },
  fabButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  directionButton: {
    width: 'auto',
    flexDirection: 'row',
    paddingHorizontal: 12,
    backgroundColor: '#0F172A',
    gap: 6,
  },
  directionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  activeLineBanner: {
    position: 'absolute',
    top: 64,
    left: 16,
    right: 76,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  lineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bannerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  bannerClose: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  // Estilos Web Fallback
  webFallbackContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  webHeader: {
    marginBottom: 16,
  },
  webTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  webSubtitle: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 4,
  },
  webMapSimulation: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
  },
  webCenterPin: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  webCenterText: {
    fontWeight: '700',
    color: '#0F172A',
    fontSize: 12,
  },
  webVehicleGrid: {
    gap: 10,
  },
  webVehicleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  webCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  webBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  webLineName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  webVehicleMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
});

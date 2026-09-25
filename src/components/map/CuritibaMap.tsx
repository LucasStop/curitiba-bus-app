import { CURITIBA_COORDINATES } from '@/constants/rit';
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from '@/constants/mapStyles';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { CURITIBA_STOPS, STOPS_BY_ID } from '@/data/curitibaDataset';
import { useLiveVehicles } from '@/hooks/useLiveVehicles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useTransitStore } from '@/stores/useTransitStore';
import { BusStop, BusVehicle, LatLng } from '@/types/transit';
import { Layers, LocateFixed, Navigation2, X } from 'lucide-react-native';
import React, { useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker, Polyline, Region } from 'react-native-maps';
import { BusMarker, getBusMarkerAccessibilityLabel } from './BusMarker';
import { StopMarker, getStopMarkerAccessibilityLabel } from './StopMarker';

// No iOS (New Architecture) o Marker ignora accessibilityLabel: o VoiceOver lê o `title` da anotação.
// Com `title`, o toque abriria o balão nativo por cima do painel; um Callout vazio o suprime.
const NoCallout = () => (
  <Callout tooltip>
    <View />
  </Callout>
);

const TUBE_ZOOM_DELTA = 0.08;
const STOP_ZOOM_DELTA = 0.02;
// ponytail: teto fixo, clustering se o zoom próximo em área densa ficar vazio demais
const MAX_STOP_MARKERS = 150;

interface CuritibaMapProps {
  userLocation: LatLng;
  onSelectVehicle?: (v: BusVehicle) => void;
  onSelectStop?: (s: BusStop) => void;
}

export const CuritibaMap: React.FC<CuritibaMapProps> = ({ userLocation, onSelectVehicle, onSelectStop }) => {
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

  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          borderRadius: Radius.pill,
          backgroundColor: theme.surface,
          alignItems: 'center',
          justifyContent: 'center',
          ...Shadows.card,
        },
        directionButton: {
          width: 'auto',
          flexDirection: 'row',
          paddingHorizontal: 12,
          backgroundColor: theme.text,
          gap: 6,
        },
        directionText: {
          color: theme.surface,
          fontWeight: '700',
          fontSize: 12,
        },
        activeLineBanner: {
          position: 'absolute',
          top: 64,
          left: 16,
          right: 76,
          // Fundo fixo (não segue tema): precisa de contraste garantido sobre o mapa,
          // que tem cores imprevisíveis independente do modo claro/escuro do app.
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderRadius: Radius.md,
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          ...Shadows.sheet,
        },
        lineDot: {
          width: 10,
          height: 10,
          borderRadius: Radius.pill,
        },
        bannerTitle: {
          flex: 1,
          // Sempre claro: acompanha o fundo fixo do banner acima, não o tema do app.
          color: Colors.light.surface,
          fontSize: 13,
          fontWeight: '700',
        },
        bannerClose: {
          paddingHorizontal: 4,
        },
        // Estilos Web Fallback
        webFallbackContainer: {
          flex: 1,
          backgroundColor: theme.background,
          padding: 20,
        },
        webHeader: {
          marginBottom: 16,
        },
        webTitle: {
          fontSize: 20,
          fontWeight: '800',
          color: theme.text,
        },
        webSubtitle: {
          fontSize: 14,
          color: theme.text,
          fontWeight: '600',
          marginTop: 4,
        },
        webMapSimulation: {
          flex: 1,
          backgroundColor: theme.border,
          borderRadius: Radius.lg,
          padding: 16,
          justifyContent: 'space-between',
        },
        webCenterPin: {
          alignSelf: 'center',
          backgroundColor: theme.surface,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: Radius.pill,
          ...Shadows.card,
        },
        webCenterText: {
          fontWeight: '700',
          color: theme.text,
          fontSize: 12,
        },
        webVehicleGrid: {
          gap: 10,
        },
        webVehicleCard: {
          backgroundColor: theme.surface,
          borderRadius: Radius.md,
          padding: 12,
          borderLeftWidth: 5,
          ...Shadows.card,
        },
        webCardRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        webBadge: {
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: Radius.sm,
        },
        webBadgeText: {
          color: theme.surface,
          fontSize: 11,
          fontWeight: '800',
        },
        webLineName: {
          fontSize: 13,
          fontWeight: '700',
          color: theme.text,
        },
        webVehicleMeta: {
          fontSize: 11,
          color: theme.textMuted,
          marginTop: 4,
        },
      }),
    [theme],
  );

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
        700,
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
  // useMemo: sem isso o filter roda de novo a cada tick de veículo (3s), mesmo
  // quando selectedLine/activeDirection não mudaram.
  const [region, setRegion] = useState<Region>(CURITIBA_COORDINATES);
  const displayedStops = useMemo(() => {
    if (selectedLine) {
      const ids = activeDirection === 'ida' ? selectedLine.paradasIda : selectedLine.paradasVolta;
      return ids.map((id) => STOPS_BY_ID.get(id)).filter((s): s is BusStop => !!s);
    }
    // ~7 mil paradas: por zoom, terminais sempre, tubos no zoom médio, pontos comuns só de perto.
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    const visible = CURITIBA_STOPS.filter(
      (s) =>
        (s.tipo === 'terminal' ||
          (s.tipo === 'tubo' && latitudeDelta < TUBE_ZOOM_DELTA) ||
          latitudeDelta < STOP_ZOOM_DELTA) &&
        Math.abs(s.latitude - latitude) < latitudeDelta / 2 &&
        Math.abs(s.longitude - longitude) < longitudeDelta / 2,
    ).slice(0, MAX_STOP_MARKERS);
    if (selectedStop && !visible.includes(selectedStop)) visible.push(selectedStop);
    return visible;
  }, [selectedLine, activeDirection, region, selectedStop]);

  // Renderização Web simplificada caso execute no navegador
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webFallbackContainer}>
        <View style={styles.webHeader}>
          <Text style={styles.webTitle}>Mapa em Tempo Real - Curitiba RIT</Text>
          <Text style={styles.webSubtitle}>{vehicles.length} ônibus em circulação ativa agora</Text>
        </View>

        <View style={styles.webMapSimulation}>
          <View style={styles.webCenterPin}>
            <Text style={styles.webCenterText}>Centro de Curitiba</Text>
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
        customMapStyle={isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
        // customMapStyle só tem efeito com Google Maps (Android). No iOS (Apple Maps, sem
        // PROVIDER_GOOGLE) o equivalente nativo é mutedStandard + showsPointsOfInterests={false}.
        mapType={Platform.select({ ios: 'mutedStandard', default: 'standard' })}
        showsPointsOfInterests={false}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        showsTraffic={isMapTrafficVisible}
        showsCompass={false}
        showsMyLocationButton={false}
        showsUserLocation={true}
        onRegionChangeComplete={setRegion}>
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
            accessibilityLabel={getStopMarkerAccessibilityLabel(stop, selectedStop?.id === stop.id)}
            title={getStopMarkerAccessibilityLabel(stop, selectedStop?.id === stop.id)}>
            <StopMarker stop={stop} isSelected={selectedStop?.id === stop.id} />
            <NoCallout />
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
            accessibilityLabel={getBusMarkerAccessibilityLabel(bus, selectedVehicle?.id === bus.id)}
            title={getBusMarkerAccessibilityLabel(bus, selectedVehicle?.id === bus.id)}>
            <BusMarker vehicle={bus} isSelected={selectedVehicle?.id === bus.id} />
            <NoCallout />
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
            <Navigation2 size={18} color={theme.surface} />
            <Text style={styles.directionText}>{activeDirection === 'ida' ? 'Ida' : 'Volta'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.fabButton}
          onPress={toggleMapTraffic}
          activeOpacity={0.8}
          testID="map-layers-button"
          accessibilityRole="button"
          accessibilityLabel={`${isMapTrafficVisible ? 'Ocultar' : 'Mostrar'} trânsito no mapa`}>
          <Layers size={20} color={isMapTrafficVisible ? theme.primary : theme.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fabButton}
          onPress={centerOnUser}
          activeOpacity={0.8}
          testID="map-locate-button"
          accessibilityRole="button"
          accessibilityLabel="Centralizar mapa na minha localização">
          <LocateFixed size={20} color={theme.primary} />
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
            style={styles.bannerClose}
            onPress={clearSelection}
            hitSlop={10}
            testID="map-clear-selection-button"
            accessibilityRole="button"
            accessibilityLabel="Fechar detalhes da linha selecionada">
            <X size={16} color={Colors.light.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

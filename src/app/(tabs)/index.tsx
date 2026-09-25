import { CuritibaMap } from '@/components/map/CuritibaMap';
import { TransitBottomSheet } from '@/components/sheets/TransitBottomSheet';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLiveVehicles } from '@/hooks/useLiveVehicles';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useTransitStore } from '@/stores/useTransitStore';
import { BusStop, BusVehicle } from '@/types/transit';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MapScreen() {
  const { location } = useUserLocation();
  const { connectionMessage } = useLiveVehicles();
  const theme = useTheme();

  const setSelectedStop = useTransitStore((s) => s.setSelectedStop);
  const setSelectedVehicle = useTransitStore((s) => s.setSelectedVehicle);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.background,
        },
        // Mapa ocupa a tela inteira, inclusive atrás do status bar (DESIGN.md: fim da faixa de título).
        mapWrapper: StyleSheet.absoluteFill,
        topSafeArea: {
          zIndex: 10,
        },
        connectionBanner: {
          backgroundColor: theme.warningMuted,
          paddingHorizontal: Spacing.three,
          paddingVertical: Spacing.two,
        },
        connectionBannerText: {
          fontSize: Typography.label.fontSize,
          lineHeight: Typography.label.lineHeight,
          fontWeight: '600',
          color: theme.text,
        },

        // Sai do fluxo flex: fica ancorado no rodapé independente da altura do mapa/topo.
        sheetPositioner: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
        },
      }),
    [theme],
  );

  const handleSelectVehicle = (vehicle: BusVehicle) => {
    setSelectedVehicle(vehicle);
  };

  const handleSelectStop = (stop: BusStop) => {
    setSelectedStop(stop);
  };

  return (
    <View style={styles.container}>
      {/* Mapa Principal Interativo, full-bleed */}
      <View style={styles.mapWrapper}>
        <CuritibaMap userLocation={location} onSelectVehicle={handleSelectVehicle} onSelectStop={handleSelectStop} />
      </View>

      {/* Camada transparente no topo: erro ancorado + pílulas flutuantes de busca/status */}
      <SafeAreaView style={styles.topSafeArea} edges={['top', 'left', 'right']}>
        {connectionMessage && (
          <View
            style={styles.connectionBanner}
            testID="map-connection-banner"
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={connectionMessage}>
            <Text style={styles.connectionBannerText}>{connectionMessage}</Text>
          </View>
        )}
      </SafeAreaView>

      {/* Gaveta de Informações Deslizante */}
      <View style={styles.sheetPositioner}>
        <TransitBottomSheet />
      </View>
    </View>
  );
}

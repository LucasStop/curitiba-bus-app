import { CURITIBA_COORDINATES } from '@/constants/rit';
import { LatLng } from '@/types/transit';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export function useUserLocation() {
  const [location, setLocation] = useState<LatLng>({
    latitude: CURITIBA_COORDINATES.latitude,
    longitude: CURITIBA_COORDINATES.longitude,
  });
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  async function requestAndGetLocation() {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      setHasPermission(true);
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    } catch {
      // Falha silenciosa usando coordenadas padrão de Curitiba
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    requestAndGetLocation();
  }, []);

  return {
    location,
    hasPermission,
    loading,
    refreshLocation: requestAndGetLocation,
  };
}

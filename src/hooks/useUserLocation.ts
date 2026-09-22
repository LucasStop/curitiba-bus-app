import { CURITIBA_COORDINATES } from '@/constants/rit';
import { LatLng } from '@/types/transit';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

type LocationResult = { hasPermission: boolean; location?: LatLng };

// Fetcher puro: não toca estado. O caller decide quando/como aplicar o
// resultado (effect com guarda de unmount, ou refresh manual).
async function fetchLocation(): Promise<LocationResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return { hasPermission: false };
  }

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    hasPermission: true,
    location: {
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    },
  };
}

export function useUserLocation() {
  const [location, setLocation] = useState<LatLng>({
    latitude: CURITIBA_COORDINATES.latitude,
    longitude: CURITIBA_COORDINATES.longitude,
  });
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  function applyResult(result: LocationResult) {
    setHasPermission(result.hasPermission);
    if (result.location) {
      setLocation(result.location);
    }
  }

  function refreshLocation() {
    setLoading(true);
    fetchLocation()
      .then(applyResult)
      .catch(() => setHasPermission(false))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let ignore = false;

    fetchLocation()
      .then((result) => {
        if (!ignore) applyResult(result);
      })
      .catch(() => {
        if (!ignore) setHasPermission(false);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return {
    location,
    hasPermission,
    loading,
    refreshLocation,
  };
}

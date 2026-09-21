import { LatLng } from '@/types/transit';

/**
 * Calcula a distância em metros entre duas coordenadas usando a fórmula de Haversine
 */
export function getDistanceInMeters(coord1: LatLng, coord2: LatLng): number {
  const R = 6371e3; // Raio da Terra em metros
  const phi1 = (coord1.latitude * Math.PI) / 180;
  const phi2 = (coord2.latitude * Math.PI) / 180;
  const deltaPhi = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLambda = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calcula o ângulo de deslocamento (bearing) em graus (0 a 360) entre duas coordenadas
 */
export function getBearing(start: LatLng, end: LatLng): number {
  const startLat = (start.latitude * Math.PI) / 180;
  const startLng = (start.longitude * Math.PI) / 180;
  const endLat = (end.latitude * Math.PI) / 180;
  const endLng = (end.longitude * Math.PI) / 180;

  const dLng = endLng - startLng;
  const y = Math.sin(dLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  let brng = Math.atan2(y, x);
  brng = (brng * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Interpola linearmente entre duas coordenadas com fator t (0 a 1)
 */
export function interpolateLatLng(start: LatLng, end: LatLng, t: number): LatLng {
  return {
    latitude: start.latitude + (end.latitude - start.latitude) * t,
    longitude: start.longitude + (end.longitude - start.longitude) * t,
  };
}

/**
 * Formata distância para exibição amigável (ex: "450 m" ou "1.8 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Formata estimativa de tempo em minutos (ex: "Agora", "4 min", "25 min")
 */
export function formatMinutes(minutes: number): string {
  if (minutes <= 1) {
    return 'Chegando';
  }
  return `${Math.round(minutes)} min`;
}

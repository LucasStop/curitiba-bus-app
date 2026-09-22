import { BusLine, BusStop, BusVehicle, LatLng } from '@/types/transit';

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
 * Calcula a distância percorrida (em metros) em um intervalo de tempo, dada a
 * velocidade do veículo. distance = speed * deltaTime.
 */
export function calculateStepDistanceMeters(speedKmH: number, deltaTimeMs: number): number {
  const speedMetersPerSecond = (speedKmH * 1000) / 3600;
  return speedMetersPerSecond * (deltaTimeMs / 1000);
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
 * Projeta um ponto sobre um trajeto (polilinha) e retorna sua posição ao longo dele:
 * índice do segmento + fração dentro do segmento (0 = início do trajeto).
 * Usa lat/lng como plano cartesiano (aproximação suficiente para trechos urbanos curtos,
 * mesma simplificação já usada em interpolateLatLng). Serve para comparar se um ponto
 * está antes ou depois de outro no mesmo trajeto/sentido.
 */
export function getProgressAlongPath(path: LatLng[], point: LatLng): number {
  if (path.length < 2) return 0;

  let bestSegment = 0;
  let bestT = 0;
  let bestDist = Infinity;

  for (let i = 0; i < path.length - 1; i++) {
    const start = path[i];
    const end = path[i + 1];
    const dx = end.longitude - start.longitude;
    const dy = end.latitude - start.latitude;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1,
      ((point.longitude - start.longitude) * dx + (point.latitude - start.latitude) * dy) / lengthSq,
    ));

    const dist = getDistanceInMeters(point, interpolateLatLng(start, end, t));
    if (dist < bestDist) {
      bestDist = dist;
      bestSegment = i;
      bestT = t;
    }
  }

  return bestSegment + bestT;
}

/**
 * Um ônibus só entra na lista de chegadas de uma parada se ela pertencer ao seu
 * sentido atual (ida/volta) e ainda estiver à frente dele no trajeto — senão o
 * ônibus já passou (ou vai na direção oposta) e não vai mais chegar ali.
 */
export function isBusApproachingStop(line: BusLine, bus: BusVehicle, stop: BusStop): boolean {
  const paradas = bus.sentido === 'ida' ? line.paradasIda : line.paradasVolta;
  if (!paradas.includes(stop.id)) return false;

  const trajeto = bus.sentido === 'ida' ? line.trajetoIda : line.trajetoVolta;
  const busCoord: LatLng = { latitude: bus.latitude, longitude: bus.longitude };
  const stopCoord: LatLng = { latitude: stop.latitude, longitude: stop.longitude };

  return getProgressAlongPath(trajeto, busCoord) <= getProgressAlongPath(trajeto, stopCoord);
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

import { BusLine, BusSituation, BusVehicle, LatLng } from '@/types/transit';
import { getBearing, getDistanceInMeters, projectOntoPath } from '@/utils/geo';

// Linha da tabela bus_positions (só as colunas que o app lê).
export interface BusPositionRow {
  prefix: string;
  line_code: string;
  lat: number;
  lon: number;
  prev_lat: number | null;
  prev_lon: number | null;
  refreshed_at: string;
  prev_refreshed_at: string | null;
  status: string | null;
  route_state: string | null;
  accessible: boolean;
}

const MIN_MOVE_METERS = 30;
const MAX_SPEED_KMH = 90;
// Os dois traçados avançando a distâncias parecidas = mesma rua nos dois sentidos: ambíguo.
const SAME_STREET_METERS = 10;

const SITUATIONS: Record<string, BusSituation> = {
  on_time: 'no_horario',
  late: 'atrasado',
  early: 'adiantado',
  nonconforming: 'nao_conformidade',
};

/**
 * Sentido no vocabulário do app (ida = traçado principal da linha no dataset), inferido pelo
 * deslocamento: candidato é o sentido em cujo traçado o ônibus avançou; com os dois avançando
 * (trecho comum), vale o traçado mais próximo. O `SENT` da URBS não serve: o "IDA" dela não é o
 * nosso. Linha sem volta (circular) é sempre ida. Sem posição anterior, parado ou ambíguo: null.
 */
export function resolveDirection(line: BusLine, prev: LatLng | null, curr: LatLng): 'ida' | 'volta' | null {
  if (!line.paradasVolta.length) return 'ida';
  if (!prev || getDistanceInMeters(prev, curr) < MIN_MOVE_METERS) return null;
  const advancing = (['ida', 'volta'] as const).flatMap((sentido) => {
    const path = sentido === 'ida' ? line.trajetoIda : line.trajetoVolta;
    const after = projectOntoPath(path, curr);
    return after.progress > projectOntoPath(path, prev).progress ? [{ sentido, distance: after.distanceMeters }] : [];
  });
  if (advancing.length < 2) return advancing[0]?.sentido ?? null;
  const [a, b] = advancing;
  if (Math.abs(a.distance - b.distance) < SAME_STREET_METERS) return null;
  return a.distance < b.distance ? a.sentido : b.sentido;
}

export function mapRowToVehicle(row: BusPositionRow, line: BusLine): BusVehicle {
  const curr: LatLng = { latitude: row.lat, longitude: row.lon };
  const prev: LatLng | null =
    row.prev_lat !== null && row.prev_lon !== null ? { latitude: row.prev_lat, longitude: row.prev_lon } : null;

  let velocidadeKmH = 0;
  if (prev && row.prev_refreshed_at) {
    const seconds = (Date.parse(row.refreshed_at) - Date.parse(row.prev_refreshed_at)) / 1000;
    if (seconds > 0) {
      velocidadeKmH = Math.min(MAX_SPEED_KMH, Math.round((getDistanceInMeters(prev, curr) / seconds) * 3.6));
    }
  }

  return {
    id: row.prefix,
    prefixo: row.prefix,
    codLinha: line.codigo,
    nomeLinha: line.nome,
    categoria: line.categoria,
    corHex: line.corHex,
    latitude: row.lat,
    longitude: row.lon,
    bearing: prev ? getBearing(prev, curr) : 0,
    velocidadeKmH,
    sentido: resolveDirection(line, prev, curr),
    situacao: row.status ? SITUATIONS[row.status] : undefined,
    foraDaRota: row.route_state === 'off_route',
    arCondicionado: false,
    acessivelPCD: row.accessible,
    ultimaAtualizacaoTs: Date.parse(row.refreshed_at),
  };
}

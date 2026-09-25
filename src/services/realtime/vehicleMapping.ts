import { BusLine, BusSituation, BusVehicle, LatLng } from '@/types/transit';
import { getBearing, getDistanceInMeters, getProgressAlongPath } from '@/utils/geo';

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

const SITUATIONS: Record<string, BusSituation> = {
  on_time: 'no_horario',
  late: 'atrasado',
  early: 'adiantado',
  nonconforming: 'nao_conformidade',
};

/**
 * Sentido no vocabulário do app (ida/volta = ordem dos sentidos do GeoCuritiba), inferido pelo
 * deslocamento ao longo do trajeto de ida. O `SENT` da URBS não serve: o "IDA" dela não é o nosso.
 * Linha sem volta (circular) é sempre ida. Sem posição anterior ou parado: null.
 */
export function resolveDirection(line: BusLine, prev: LatLng | null, curr: LatLng): 'ida' | 'volta' | null {
  if (!line.paradasVolta.length) return 'ida';
  if (!prev || getDistanceInMeters(prev, curr) < MIN_MOVE_METERS) return null;
  const before = getProgressAlongPath(line.trajetoIda, prev);
  const after = getProgressAlongPath(line.trajetoIda, curr);
  if (after === before) return null;
  return after > before ? 'ida' : 'volta';
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

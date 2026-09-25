import { LINES_BY_CODE } from '@/data/curitibaDataset';
import { ArrivalEstimate, BusStop, BusVehicle, LatLng } from '@/types/transit';
import { getDistanceInMeters, isBusApproachingStop } from '@/utils/geo';

// Distância máxima (m) para um ônibus aparecer nas previsões de chegada de uma parada
export const MAX_ETA_DISTANCE_METERS = 8000;

/**
 * Converte distância (m) até a parada em estimativa de minutos até a chegada.
 * Velocidade média urbana com paradas em canaletas/trânsito ~22 km/h = ~360 m/min.
 */
export function calculateEtaMinutes(distanceMeters: number): number {
  return Math.max(1, Math.round(distanceMeters / 360));
}

/**
 * Estimativa de chegada (ETA) dos ônibus em uma parada, pela distância em linha reta.
 * `isRealtime` força o rótulo; sem ele vale `line.temTempoReal` (simulação).
 */
export function computeArrivals(
  stop: BusStop,
  vehicles: BusVehicle[],
  { generatedTs, isRealtime }: { generatedTs: number; isRealtime?: boolean },
): ArrivalEstimate[] {
  const stopCoord: LatLng = { latitude: stop.latitude, longitude: stop.longitude };
  const estimates: ArrivalEstimate[] = [];

  stop.linhas.forEach((codLinha) => {
    const line = LINES_BY_CODE.get(codLinha);
    if (!line) return;

    vehicles
      .filter((b) => b.codLinha === codLinha)
      .forEach((bus) => {
        if (!isBusApproachingStop(line, bus, stop)) return;

        const dist = getDistanceInMeters({ latitude: bus.latitude, longitude: bus.longitude }, stopCoord);
        if (dist > MAX_ETA_DISTANCE_METERS) return;

        const minutos = calculateEtaMinutes(dist);
        estimates.push({
          codLinha: line.codigo,
          nomeLinha: line.nome,
          categoria: line.categoria,
          corHex: line.corHex,
          minutosAteChegada: minutos,
          distanciaMetros: dist,
          veiculoPrefixo: bus.prefixo,
          acessivelPCD: bus.acessivelPCD,
          lotacao: bus.lotacao,
          isRealtime: isRealtime ?? line.temTempoReal,
          situacao: bus.situacao,
          geradoEmTs: generatedTs,
          previstoParaTs: generatedTs + minutos * 60000,
        });
      });
  });

  return estimates.sort((a, b) => a.minutosAteChegada - b.minutosAteChegada);
}

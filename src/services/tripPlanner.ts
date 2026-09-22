import { CURITIBA_LINES, CURITIBA_STOPS } from '@/data/curitibaDataset';
import { BusLine, BusStop, LatLng, TripLeg, TripPlanOption } from '@/types/transit';
import { getDistanceInMeters } from '@/utils/geo';

// Abaixo disso é ruído de GPS, não caminhada real (ex: origem já é a própria parada).
const MIN_WALK_DISTANCE_METERS = 5;

// 80 metros por minuto de caminhada
function walkMinutes(distanceMeters: number): number {
  if (distanceMeters < MIN_WALK_DISTANCE_METERS) return 0;
  return Math.max(1, Math.round(distanceMeters / 80));
}

// Baldeação acontece dentro do mesmo terminal (plataforma integrada RIT):
// caminhada curta, sem sair do terminal.
const TRANSFER_MINUTES = 3;

export interface ItinerarioTrecho {
  sentido: 'ida' | 'volta';
  quantidadeParadas: number;
}

// Trecho embarque→desembarque dentro do itinerário real da linha (P7/P8).
// Retorna null quando o embarque vem depois do desembarque nos dois
// sentidos — nesse caso a linha não serve para o par de paradas.
// Caso degenerado (mesma parada): trecho zero, sentido ida.
export function itinerarioEntre(
  line: BusLine,
  embarqueId: string,
  desembarqueId: string
): ItinerarioTrecho | null {
  if (embarqueId === desembarqueId) {
    return { sentido: 'ida', quantidadeParadas: 0 };
  }
  const sentidos: ('ida' | 'volta')[] = ['ida', 'volta'];
  for (const sentido of sentidos) {
    const paradas = sentido === 'ida' ? line.paradasIda : line.paradasVolta;
    const embarqueIdx = paradas.indexOf(embarqueId);
    const desembarqueIdx = paradas.indexOf(desembarqueId);
    if (embarqueIdx >= 0 && desembarqueIdx > embarqueIdx) {
      return { sentido, quantidadeParadas: desembarqueIdx - embarqueIdx };
    }
  }
  return null;
}

// Retorna null quando a distância é desprezível, para omitir a perna de caminhada.
function buildWalkLeg(distanceMeters: number, instrucao: string): TripLeg | null {
  if (distanceMeters < MIN_WALK_DISTANCE_METERS) return null;
  return {
    tipo: 'walk',
    duracaoMinutos: walkMinutes(distanceMeters),
    distanciaMetros: distanceMeters,
    instrucao,
  };
}

export function planTransitTrip(origin: LatLng, destination: LatLng): TripPlanOption[] {
  // P9: origem igual ao destino = sem rota (você já está lá).
  if (getDistanceInMeters(origin, destination) < MIN_WALK_DISTANCE_METERS) {
    return [];
  }

  const options: TripPlanOption[] = [];

  // Encontra as 3 paradas mais próximas da origem
  const originStops = getClosestStops(origin, 3);
  // Encontra as 3 paradas mais próximas do destino
  const destStops = getClosestStops(destination, 3);

  // 1. Procurar conexões DIRETA (sem baldeação)
  originStops.forEach((oStop) => {
    destStops.forEach((dStop) => {
      // Linhas em comum entre as duas paradas
      const commonLines = oStop.linhas.filter((cod) => dStop.linhas.includes(cod));

      commonLines.forEach((codLinha) => {
        const line = CURITIBA_LINES.find((l) => l.codigo === codLinha);
        if (!line) return;

        // P8: a linha só serve se o embarque vier antes do desembarque
        // no itinerário real (ida ou volta). P7: a contagem de paradas
        // vem desse trecho, nunca de número fixo.
        const trecho = itinerarioEntre(line, oStop.id, dStop.id);
        if (!trecho) return;

        const walkToStopMeters = getDistanceInMeters(origin, {
          latitude: oStop.latitude,
          longitude: oStop.longitude,
        });
        const walkFromStopMeters = getDistanceInMeters(destination, {
          latitude: dStop.latitude,
          longitude: dStop.longitude,
        });

        const walkToMin = walkMinutes(walkToStopMeters);
        const walkFromMin = walkMinutes(walkFromStopMeters);

        const busDistMeters = getDistanceInMeters(
          { latitude: oStop.latitude, longitude: oStop.longitude },
          { latitude: dStop.latitude, longitude: dStop.longitude }
        );
        // ~350 metros por minuto de ônibus
        const busMin = Math.max(3, Math.round(busDistMeters / 350));

        const totalMinutes = walkToMin + busMin + walkFromMin;

        const legs: TripLeg[] = [
          buildWalkLeg(walkToStopMeters, `Caminhe até ${oStop.nome}`),
          {
            tipo: 'bus',
            duracaoMinutos: busMin,
            instrucao: `Embarque na linha ${line.codigo} - ${line.nome} (sentido ${trecho.sentido})`,
            linha: {
              codigo: line.codigo,
              nome: line.nome,
              corHex: line.corHex,
              categoria: line.categoria,
              embarqueParada: oStop.nome,
              desembarqueParada: dStop.nome,
              quantidadeParadas: trecho.quantidadeParadas,
              sentido: trecho.sentido,
            },
          },
          buildWalkLeg(walkFromStopMeters, `Caminhe até o seu destino final`),
        ].filter((leg): leg is TripLeg => leg !== null);

        const now = new Date();
        const departure = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const arrivalDate = new Date(now.getTime() + totalMinutes * 60000);
        const arrival = arrivalDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        options.push({
          id: `direct-${line.codigo}-${oStop.id}-${dStop.id}`,
          duracaoTotalMinutos: totalMinutes,
          caminhadaTotalMetros: Math.round(walkToStopMeters + walkFromStopMeters),
          custoTarifa: 6.0,
          horarioPartida: departure,
          horarioChegada: arrival,
          pernas: legs,
        });
      });
    });
  });

  // 2. Se poucas rotas diretas, buscar baldeação real: só existe se as duas
  // linhas candidatas de fato passam por um terminal em comum no mock data.
  // Nada de terminal fixo "chutado" — isso é o bug original (rota fabricada).
  if (options.length < 2) {
    transferSearch: for (const oStop of originStops) {
      for (const line1Code of oStop.linhas) {
        const line1 = CURITIBA_LINES.find((l) => l.codigo === line1Code);
        if (!line1) continue;

        for (const dStop of destStops) {
          for (const line2Code of dStop.linhas) {
            if (line2Code === line1Code) continue;
            const line2 = CURITIBA_LINES.find((l) => l.codigo === line2Code);
            if (!line2) continue;

            const transferStop = findCommonTerminal(line1, line2);
            if (!transferStop || transferStop.id === oStop.id || transferStop.id === dStop.id) {
              continue;
            }

            // P8: os dois trechos precisam respeitar o sentido dos
            // itinerários (embarque antes do desembarque). P7: as
            // contagens vêm desses trechos.
            const trecho1 = itinerarioEntre(line1, oStop.id, transferStop.id);
            const trecho2 = itinerarioEntre(line2, transferStop.id, dStop.id);
            if (!trecho1 || !trecho2) {
              continue;
            }

            options.push(
              buildTransferOption(
                origin,
                destination,
                oStop,
                dStop,
                line1,
                line2,
                transferStop,
                trecho1,
                trecho2
              )
            );
            break transferSearch;
          }
        }
      }
    }
  }

  return options.sort((a, b) => a.duracaoTotalMinutos - b.duracaoTotalMinutos);
}

// Ponto de baldeação só é considerado real se for um terminal (marcador
// explícito no dataset, ver `tipo` em BusStop) atendido pelas duas linhas.
export function findCommonTerminal(line1: BusLine, line2: BusLine): BusStop | undefined {
  const line1Stops = new Set([...line1.paradasIda, ...line1.paradasVolta]);
  const line2StopIds = [...line2.paradasIda, ...line2.paradasVolta];

  const commonStopId = line2StopIds.find((id) => line1Stops.has(id));
  if (!commonStopId) return undefined;

  const stop = CURITIBA_STOPS.find((s) => s.id === commonStopId);
  return stop?.tipo === 'terminal' ? stop : undefined;
}

function buildTransferOption(
  origin: LatLng,
  destination: LatLng,
  oStop: BusStop,
  dStop: BusStop,
  line1: BusLine,
  line2: BusLine,
  transferStop: BusStop,
  trecho1: ItinerarioTrecho,
  trecho2: ItinerarioTrecho
): TripPlanOption {
  const walkToStopMeters = getDistanceInMeters(origin, {
    latitude: oStop.latitude,
    longitude: oStop.longitude,
  });
  const walkFromStopMeters = getDistanceInMeters(destination, {
    latitude: dStop.latitude,
    longitude: dStop.longitude,
  });
  const walkToMin = walkMinutes(walkToStopMeters);
  const walkFromMin = walkMinutes(walkFromStopMeters);

  const firstLegMeters = getDistanceInMeters(
    { latitude: oStop.latitude, longitude: oStop.longitude },
    { latitude: transferStop.latitude, longitude: transferStop.longitude }
  );
  const secondLegMeters = getDistanceInMeters(
    { latitude: transferStop.latitude, longitude: transferStop.longitude },
    { latitude: dStop.latitude, longitude: dStop.longitude }
  );
  const firstBusMin = Math.max(3, Math.round(firstLegMeters / 350));
  const secondBusMin = Math.max(3, Math.round(secondLegMeters / 350));
  const integracaoMin = TRANSFER_MINUTES;

  const totalMinutes = walkToMin + firstBusMin + integracaoMin + secondBusMin + walkFromMin;

  const now = new Date();
  const departure = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const arrivalDate = new Date(now.getTime() + totalMinutes * 60000);
  const arrival = arrivalDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const legs = [
    buildWalkLeg(walkToStopMeters, `Caminhe até ${oStop.nome}`),
    {
      tipo: 'bus' as const,
      duracaoMinutos: firstBusMin,
      instrucao: `Embarque na linha ${line1.codigo} até ${transferStop.nome} (sentido ${trecho1.sentido})`,
      linha: {
        codigo: line1.codigo,
        nome: line1.nome,
        corHex: line1.corHex,
        categoria: line1.categoria,
        embarqueParada: oStop.nome,
        desembarqueParada: transferStop.nome,
        quantidadeParadas: trecho1.quantidadeParadas,
        sentido: trecho1.sentido,
      },
    },
    {
      tipo: 'walk' as const,
      duracaoMinutos: integracaoMin,
      instrucao: `Faça integração gratuita no ${transferStop.nome} (mesma plataforma)`,
    },
    {
      tipo: 'bus' as const,
      duracaoMinutos: secondBusMin,
      instrucao: `Embarque na linha ${line2.codigo} até ${dStop.nome} (sentido ${trecho2.sentido})`,
      linha: {
        codigo: line2.codigo,
        nome: line2.nome,
        corHex: line2.corHex,
        categoria: line2.categoria,
        embarqueParada: transferStop.nome,
        desembarqueParada: dStop.nome,
        quantidadeParadas: trecho2.quantidadeParadas,
        sentido: trecho2.sentido,
      },
    },
    buildWalkLeg(walkFromStopMeters, `Caminhe até seu destino final`),
  ].filter((leg): leg is TripLeg => leg !== null);

  return {
    id: `transfer-${line1.codigo}-${transferStop.id}-${line2.codigo}-${oStop.id}-${dStop.id}`,
    duracaoTotalMinutos: totalMinutes,
    caminhadaTotalMetros: Math.round(walkToStopMeters + walkFromStopMeters),
    custoTarifa: 6.0, // Integração gratuita em terminal Curitiba RIT!
    horarioPartida: departure,
    horarioChegada: arrival,
    pernas: legs,
  };
}

function getClosestStops(coord: LatLng, limit: number): BusStop[] {
  return [...CURITIBA_STOPS]
    .map((stop) => ({
      stop,
      distance: getDistanceInMeters(coord, { latitude: stop.latitude, longitude: stop.longitude }),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((item) => item.stop);
}

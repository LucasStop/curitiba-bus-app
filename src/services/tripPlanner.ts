import { CURITIBA_LINES, CURITIBA_STOPS } from '@/data/curitibaDataset';
import { BusLine, BusStop, LatLng, TripLeg, TripPlanOption } from '@/types/transit';
import { getDistanceInMeters } from '@/utils/geo';

export function planTransitTrip(origin: LatLng, destination: LatLng): TripPlanOption[] {
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

        const walkToStopMeters = getDistanceInMeters(origin, {
          latitude: oStop.latitude,
          longitude: oStop.longitude,
        });
        const walkFromStopMeters = getDistanceInMeters(destination, {
          latitude: dStop.latitude,
          longitude: dStop.longitude,
        });

        // 80 metros por minuto de caminhada
        const walkToMin = Math.max(1, Math.round(walkToStopMeters / 80));
        const walkFromMin = Math.max(1, Math.round(walkFromStopMeters / 80));

        const busDistMeters = getDistanceInMeters(
          { latitude: oStop.latitude, longitude: oStop.longitude },
          { latitude: dStop.latitude, longitude: dStop.longitude }
        );
        // ~350 metros por minuto de ônibus
        const busMin = Math.max(3, Math.round(busDistMeters / 350));

        const totalMinutes = walkToMin + busMin + walkFromMin;

        const legs: TripLeg[] = [
          {
            tipo: 'walk',
            duracaoMinutos: walkToMin,
            distanciaMetros: walkToStopMeters,
            instrucao: `Caminhe até ${oStop.nome}`,
          },
          {
            tipo: 'bus',
            duracaoMinutos: busMin,
            instrucao: `Embarque na linha ${line.codigo} - ${line.nome}`,
            linha: {
              codigo: line.codigo,
              nome: line.nome,
              corHex: line.corHex,
              categoria: line.categoria,
              embarqueParada: oStop.nome,
              desembarqueParada: dStop.nome,
              quantidadeParadas: 4,
            },
          },
          {
            tipo: 'walk',
            duracaoMinutos: walkFromMin,
            distanciaMetros: walkFromStopMeters,
            instrucao: `Caminhe até o seu destino final`,
          },
        ];

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

            options.push(
              buildTransferOption(origin, destination, oStop, dStop, line1, line2, transferStop)
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
  transferStop: BusStop
): TripPlanOption {
  const walkToStopMeters = getDistanceInMeters(origin, {
    latitude: oStop.latitude,
    longitude: oStop.longitude,
  });
  const walkFromStopMeters = getDistanceInMeters(destination, {
    latitude: dStop.latitude,
    longitude: dStop.longitude,
  });
  const walkToMin = Math.max(1, Math.round(walkToStopMeters / 80));
  const walkFromMin = Math.max(1, Math.round(walkFromStopMeters / 80));

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
  const integracaoMin = 3;

  const totalMinutes = walkToMin + firstBusMin + integracaoMin + secondBusMin + walkFromMin;

  const now = new Date();
  const departure = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const arrivalDate = new Date(now.getTime() + totalMinutes * 60000);
  const arrival = arrivalDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const legs: TripLeg[] = [
    {
      tipo: 'walk',
      duracaoMinutos: walkToMin,
      distanciaMetros: walkToStopMeters,
      instrucao: `Caminhe até ${oStop.nome}`,
    },
    {
      tipo: 'bus',
      duracaoMinutos: firstBusMin,
      instrucao: `Embarque na linha ${line1.codigo} até ${transferStop.nome}`,
      linha: {
        codigo: line1.codigo,
        nome: line1.nome,
        corHex: line1.corHex,
        categoria: line1.categoria,
        embarqueParada: oStop.nome,
        desembarqueParada: transferStop.nome,
        quantidadeParadas: 3,
      },
    },
    {
      tipo: 'walk',
      duracaoMinutos: integracaoMin,
      instrucao: `Faça integração gratuita no ${transferStop.nome} (mesma plataforma)`,
    },
    {
      tipo: 'bus',
      duracaoMinutos: secondBusMin,
      instrucao: `Embarque na linha ${line2.codigo} até ${dStop.nome}`,
      linha: {
        codigo: line2.codigo,
        nome: line2.nome,
        corHex: line2.corHex,
        categoria: line2.categoria,
        embarqueParada: transferStop.nome,
        desembarqueParada: dStop.nome,
        quantidadeParadas: 3,
      },
    },
    {
      tipo: 'walk',
      duracaoMinutos: walkFromMin,
      distanciaMetros: walkFromStopMeters,
      instrucao: `Caminhe até seu destino final`,
    },
  ];

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

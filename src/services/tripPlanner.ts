import { CURITIBA_LINES, CURITIBA_STOPS } from '@/data/curitibaDataset';
import { BusStop, LatLng, TripLeg, TripPlanOption } from '@/types/transit';
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

  // 2. Se poucas rotas diretas, simular integração via Terminal Cabral ou Rui Barbosa
  if (options.length < 2 && originStops.length > 0 && destStops.length > 0) {
    const oStop = originStops[0];
    const dStop = destStops[0];
    const firstLineCode = oStop.linhas[0] || '203';
    const secondLineCode = dStop.linhas[0] || '020';

    const line1 = CURITIBA_LINES.find((l) => l.codigo === firstLineCode) || CURITIBA_LINES[0];
    const line2 = CURITIBA_LINES.find((l) => l.codigo === secondLineCode) || CURITIBA_LINES[3];

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

    const totalMinutes = walkToMin + 14 + 4 + 12 + walkFromMin;

    const now = new Date();
    const departure = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const arrivalDate = new Date(now.getTime() + totalMinutes * 60000);
    const arrival = arrivalDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    options.push({
      id: `transfer-terminal-${oStop.id}-${dStop.id}`,
      duracaoTotalMinutos: totalMinutes,
      caminhadaTotalMetros: Math.round(walkToStopMeters + walkFromStopMeters),
      custoTarifa: 6.0, // Integração gratuita em terminal Curitiba RIT!
      horarioPartida: departure,
      horarioChegada: arrival,
      pernas: [
        {
          tipo: 'walk',
          duracaoMinutos: walkToMin,
          distanciaMetros: walkToStopMeters,
          instrucao: `Caminhe até ${oStop.nome}`,
        },
        {
          tipo: 'bus',
          duracaoMinutos: 14,
          instrucao: `Embarque na linha ${line1.codigo} até Terminal Cabral`,
          linha: {
            codigo: line1.codigo,
            nome: line1.nome,
            corHex: line1.corHex,
            categoria: line1.categoria,
            embarqueParada: oStop.nome,
            desembarqueParada: 'Terminal Cabral',
            quantidadeParadas: 5,
          },
        },
        {
          tipo: 'walk',
          duracaoMinutos: 4,
          instrucao: `Faça integração gratuita no Terminal Cabral (mesma plataforma)`,
        },
        {
          tipo: 'bus',
          duracaoMinutos: 12,
          instrucao: `Embarque na linha ${line2.codigo} até ${dStop.nome}`,
          linha: {
            codigo: line2.codigo,
            nome: line2.nome,
            corHex: line2.corHex,
            categoria: line2.categoria,
            embarqueParada: 'Terminal Cabral',
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
      ],
    });
  }

  return options.sort((a, b) => a.duracaoTotalMinutos - b.duracaoTotalMinutos);
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

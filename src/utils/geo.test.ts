import { calculateStepDistanceMeters, isBusApproachingStop } from './geo';
import { BusLine, BusStop, BusVehicle } from '@/types/transit';

// C4 — Bug: ônibus que já passou da parada no seu sentido ainda entrava na lista de chegadas.
describe('isBusApproachingStop', () => {
  const line: BusLine = {
    id: 'line-test',
    codigo: '999',
    nome: 'TESTE',
    categoria: 'interbairros',
    corHex: '#000000',
    terminalOrigem: 'A',
    terminalDestino: 'B',
    tarifa: 6.0,
    horarioFuncionamento: '05:00 - 00:00',
    frequenciaMinutosPico: 5,
    trajetoIda: [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
      { latitude: 0, longitude: 2 },
    ],
    trajetoVolta: [
      { latitude: 0, longitude: 2 },
      { latitude: 0, longitude: 1 },
      { latitude: 0, longitude: 0 },
    ],
    paradasIda: ['stop-a', 'stop-b'],
    paradasVolta: ['stop-b', 'stop-a'],
  };

  const stop: BusStop = {
    id: 'stop-b',
    nome: 'Parada B',
    tipo: 'comum',
    latitude: 0,
    longitude: 1,
    bairro: 'Teste',
    linhas: ['999'],
  };

  function busAt(longitude: number, sentido: 'ida' | 'volta'): BusVehicle {
    return {
      id: 'bus-1',
      prefixo: 'BA001',
      codLinha: '999',
      nomeLinha: 'TESTE',
      categoria: 'interbairros',
      corHex: '#000000',
      latitude: 0,
      longitude,
      bearing: 0,
      velocidadeKmH: 30,
      sentido,
      arCondicionado: true,
      acessivelPCD: true,
      ultimaAtualizacao: '',
    };
  }

  it('exclui o ônibus que já passou da parada no seu sentido atual', () => {
    // Indo (ida), a rota vai de longitude 0 -> 2. O ônibus está em 2 (depois da parada, que é em 1).
    const bus = busAt(2, 'ida');
    expect(isBusApproachingStop(line, bus, stop)).toBe(false);
  });

  it('inclui o ônibus que ainda não chegou na parada no seu sentido atual', () => {
    const bus = busAt(0, 'ida');
    expect(isBusApproachingStop(line, bus, stop)).toBe(true);
  });

  it('exclui o ônibus indo no sentido oposto ao esperado para a parada', () => {
    // No sentido volta a rota também passa por stop-b, então isso testa o caso de
    // sentido presente na parada mas trajeto reverso: volta já passou de stop-b (longitude 1)
    // se o ônibus estiver em longitude 0 (mais perto do fim do trajeto volta).
    const bus = busAt(0, 'volta');
    expect(isBusApproachingStop(line, bus, stop)).toBe(false);
  });
});

// C1
describe('calculateStepDistanceMeters', () => {
  it('calcula distance = speed * deltaTime (36 km/h = 10 m/s por 3s = 30m)', () => {
    expect(calculateStepDistanceMeters(36, 3000)).toBeCloseTo(30);
  });

  it('é proporcional à velocidade: dobrar velocidade dobra a distância no mesmo intervalo', () => {
    const slow = calculateStepDistanceMeters(20, 3000);
    const fast = calculateStepDistanceMeters(40, 3000);
    expect(fast).toBeCloseTo(slow * 2);
  });

  it('é proporcional ao tempo decorrido: dobrar o intervalo do tick dobra a distância', () => {
    const shortTick = calculateStepDistanceMeters(30, 1000);
    const longTick = calculateStepDistanceMeters(30, 2000);
    expect(longTick).toBeCloseTo(shortTick * 2);
  });
});

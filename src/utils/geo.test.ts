import {
  calculateStepDistanceMeters,
  formatDistance,
  formatEtaPhrase,
  formatMinutes,
  getBearing,
  getDistanceInMeters,
  interpolateLatLng,
  isBusApproachingStop,
} from './geo';
import { BusLine, BusStop, BusVehicle } from '@/types/transit';

const CENTRO = { latitude: -25.43, longitude: -49.269 };
const SANTA_CANDIDA = { latitude: -25.378, longitude: -49.229 };

describe('getDistanceInMeters', () => {
  it('mesma coordenada tem distância zero', () => {
    expect(getDistanceInMeters(CENTRO, CENTRO)).toBe(0);
  });

  it('origem e destino iguais (objetos diferentes, mesmos valores) também dá zero', () => {
    const a = { latitude: -25.4, longitude: -49.2 };
    const b = { latitude: -25.4, longitude: -49.2 };
    expect(getDistanceInMeters(a, b)).toBe(0);
  });

  it('calcula distância real entre dois pontos conhecidos de Curitiba', () => {
    // Centro -> Santa Cândida: ~7km em linha reta
    const dist = getDistanceInMeters(CENTRO, SANTA_CANDIDA);
    expect(dist).toBeGreaterThan(6000);
    expect(dist).toBeLessThan(8000);
  });

  it('é simétrica (A->B == B->A)', () => {
    expect(getDistanceInMeters(CENTRO, SANTA_CANDIDA)).toBeCloseTo(
      getDistanceInMeters(SANTA_CANDIDA, CENTRO),
    );
  });
});

describe('getBearing', () => {
  it('mesma coordenada de início e fim retorna 0', () => {
    expect(getBearing(CENTRO, CENTRO)).toBe(0);
  });

  it('deslocamento puro para o norte fica perto de 0°/360°', () => {
    const north = { latitude: CENTRO.latitude + 0.01, longitude: CENTRO.longitude };
    const bearing = getBearing(CENTRO, north);
    expect(bearing).toBeCloseTo(0, 0);
  });

  it('sempre retorna valor entre 0 e 360', () => {
    const bearing = getBearing(CENTRO, SANTA_CANDIDA);
    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeLessThan(360);
  });
});

describe('interpolateLatLng', () => {
  it('t=0 retorna o ponto de partida', () => {
    expect(interpolateLatLng(CENTRO, SANTA_CANDIDA, 0)).toEqual(CENTRO);
  });

  it('t=1 retorna o ponto de chegada', () => {
    expect(interpolateLatLng(CENTRO, SANTA_CANDIDA, 1)).toEqual(SANTA_CANDIDA);
  });

  it('t=0.5 fica no meio do caminho', () => {
    const mid = interpolateLatLng(CENTRO, SANTA_CANDIDA, 0.5);
    expect(mid.latitude).toBeCloseTo((CENTRO.latitude + SANTA_CANDIDA.latitude) / 2);
    expect(mid.longitude).toBeCloseTo((CENTRO.longitude + SANTA_CANDIDA.longitude) / 2);
  });

  it('origem e destino iguais retorna o mesmo ponto para qualquer t', () => {
    expect(interpolateLatLng(CENTRO, CENTRO, 0.5)).toEqual(CENTRO);
  });
});

describe('formatDistance', () => {
  it('zero metros', () => {
    expect(formatDistance(0)).toBe('0 m');
  });

  it('menos de 1km fica em metros', () => {
    expect(formatDistance(450)).toBe('450 m');
  });

  it('exatamente 1000m vira km (limite)', () => {
    expect(formatDistance(1000)).toBe('1.0 km');
  });

  it('1km e fração', () => {
    expect(formatDistance(1800)).toBe('1.8 km');
  });
});

describe('formatMinutes', () => {
  it('já chegou (0 min)', () => {
    expect(formatMinutes(0)).toBe('Chegando');
  });

  it('limite de 1 minuto ainda mostra "Chegando"', () => {
    expect(formatMinutes(1)).toBe('Chegando');
  });

  it('logo acima do limite mostra minutos', () => {
    expect(formatMinutes(1.5)).toBe('2 min');
  });

  it('futuro distante mostra minutos arredondados', () => {
    expect(formatMinutes(45)).toBe('45 min');
  });
});

describe('formatEtaPhrase', () => {
  it('chegada iminente (<=1 min) gera frase completa, sem "em" solto na frente', () => {
    expect(formatEtaPhrase(1)).toBe('chegando agora');
    expect(formatEtaPhrase(0)).toBe('chegando agora');
  });

  it('minutos normais gera "em N min"', () => {
    expect(formatEtaPhrase(4)).toBe('em 4 min');
    expect(formatEtaPhrase(4.6)).toBe('em 5 min');
  });
});

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

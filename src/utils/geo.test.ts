import {
  calculateStepDistanceMeters,
  formatDistance,
  formatMinutes,
  getBearing,
  getDistanceInMeters,
  interpolateLatLng,
} from './geo';

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

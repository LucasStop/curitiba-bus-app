import { calculateStepDistanceMeters, formatEtaPhrase } from './geo';

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

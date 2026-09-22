import { formatEtaPhrase } from './geo';

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

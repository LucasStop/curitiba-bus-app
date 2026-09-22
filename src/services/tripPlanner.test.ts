import { planTransitTrip } from './tripPlanner';

// Terminal Santa Cândida e Terminal Cabral compartilham as linhas 203/020/216,
// então uma rota direta entre eles sempre existe (ver curitibaDataset.ts).
const TERMINAL_SANTA_CANDIDA = { latitude: -25.378, longitude: -49.229 };
const TERMINAL_CABRAL = { latitude: -25.4055, longitude: -49.252 };

describe('planTransitTrip', () => {
  it('omite a perna de caminhada quando a origem já é a própria parada', () => {
    const options = planTransitTrip(TERMINAL_SANTA_CANDIDA, TERMINAL_CABRAL);
    const direct = options.find((o) => o.id.startsWith('direct-'));

    expect(direct).toBeDefined();
    // Sem caminhada real em nenhuma ponta: nenhuma perna "walk" deve ser gerada.
    expect(direct!.pernas.some((leg) => leg.tipo === 'walk')).toBe(false);
    expect(direct!.pernas[0].tipo).toBe('bus');
  });

  it('mantém a perna de caminhada quando a distância até a parada é real', () => {
    const farFromStop = { latitude: -25.39, longitude: -49.24 };
    const options = planTransitTrip(farFromStop, TERMINAL_CABRAL);
    const direct = options.find((o) => o.id.startsWith('direct-'));

    expect(direct).toBeDefined();
    const walkLegs = direct!.pernas.filter((leg) => leg.tipo === 'walk');
    expect(walkLegs.length).toBeGreaterThan(0);
    expect(walkLegs[0].duracaoMinutos).toBeGreaterThanOrEqual(1);
  });

  it('origem igual ao destino (distância zero) não quebra e retorna opção com caminhada zero', () => {
    const options = planTransitTrip(TERMINAL_SANTA_CANDIDA, TERMINAL_SANTA_CANDIDA);
    expect(options.length).toBeGreaterThan(0);
    expect(options.some((o) => o.caminhadaTotalMetros === 0)).toBe(true);
  });

  it('encontra rota direta entre dois terminais que compartilham linha', () => {
    const options = planTransitTrip(TERMINAL_SANTA_CANDIDA, TERMINAL_CABRAL);
    const directOption = options.find((o) => o.id.startsWith('direct-'));
    expect(directOption).toBeDefined();
    expect(directOption?.pernas.some((p) => p.tipo === 'bus')).toBe(true);
  });

  it('resultado sempre vem ordenado do mais rápido para o mais lento', () => {
    const options = planTransitTrip(TERMINAL_SANTA_CANDIDA, TERMINAL_CABRAL);
    const durations = options.map((o) => o.duracaoTotalMinutos);
    expect(durations).toEqual([...durations].sort((a, b) => a - b));
  });

  it('coordenadas longe de qualquer parada cadastrada não quebram e ainda retornam opção', () => {
    const options = planTransitTrip(
      { latitude: -25.55, longitude: -49.15 },
      { latitude: -25.3, longitude: -49.35 },
    );
    expect(options.length).toBeGreaterThan(0);
    options.forEach((o) => expect(o.duracaoTotalMinutos).toBeGreaterThan(0));
  });

  it('toda opção tem custo de tarifa e horários preenchidos', () => {
    const options = planTransitTrip(TERMINAL_SANTA_CANDIDA, TERMINAL_CABRAL);
    options.forEach((o) => {
      expect(o.custoTarifa).toBeGreaterThan(0);
      expect(o.horarioPartida).toMatch(/^\d{2}:\d{2}$/);
      expect(o.horarioChegada).toMatch(/^\d{2}:\d{2}$/);
    });
  });
});

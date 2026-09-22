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
});

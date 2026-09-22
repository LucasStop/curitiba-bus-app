import { CURITIBA_LINES, CURITIBA_STOPS } from '@/data/curitibaDataset';
import { findCommonTerminal, planTransitTrip } from './tripPlanner';

const line = (codigo: string) => CURITIBA_LINES.find((l) => l.codigo === codigo)!;
const stop = (id: string) => CURITIBA_STOPS.find((s) => s.id === id)!;

// Bug: baldeação fabricada no planner mostra rota inexistente.
// O antigo código sempre chutava "Terminal Cabral" como ponto de baldeação,
// mesmo quando nenhuma das duas linhas realmente passava por lá.
describe('findCommonTerminal', () => {
  it('não aponta baldeação quando as linhas não compartilham nenhum terminal real', () => {
    // Linha 500 (Carlos Gomes/Boqueirão) nunca passa pelo Terminal Cabral,
    // nem a 303 (Campina do Siqueira/Centenário) — o antigo hardcode fabricava
    // essa baldeação de qualquer forma.
    expect(findCommonTerminal(line('500'), line('303'))).toBeUndefined();
  });

  it('aponta o terminal real quando as duas linhas de fato se cruzam nele', () => {
    // 500 e 020 se cruzam de verdade no Terminal Hauer.
    expect(findCommonTerminal(line('500'), line('020'))?.id).toBe('terminal-hauer');
    // 203 e 020 se cruzam de verdade no Terminal Cabral (aqui o hardcode antigo
    // até acertava, mas por sorte).
    expect(findCommonTerminal(line('203'), line('020'))?.id).toBe('terminal-cabral');
  });
});

describe('planTransitTrip — baldeação', () => {
  it('não fabrica baldeação via Terminal Cabral para linhas que não passam por lá', () => {
    const origin = stop('tubo-carlos-gomes'); // só linha 500
    const destination = stop('terminal-campina-siqueira'); // linhas 303 e 020

    const options = planTransitTrip(
      { latitude: origin.latitude, longitude: origin.longitude },
      { latitude: destination.latitude, longitude: destination.longitude }
    );

    // Nenhuma perna pode citar "Terminal Cabral": nem a 500 nem a 303 passam
    // por lá. Se a baldeação existir, tem que ser pelo terminal real (Hauer).
    const mentionsCabral = options.some((option) =>
      option.pernas.some(
        (leg) =>
          leg.instrucao.includes('Terminal Cabral') ||
          leg.linha?.embarqueParada === 'Terminal Cabral' ||
          leg.linha?.desembarqueParada === 'Terminal Cabral'
      )
    );
    expect(mentionsCabral).toBe(false);

    const transferOption = options.find((o) => o.id.startsWith('transfer-'));
    if (transferOption) {
      const busLegs = transferOption.pernas.filter((leg) => leg.tipo === 'bus');
      // A baldeação, se existir, tem que passar por um terminal real das duas linhas.
      expect(busLegs[0]?.linha?.desembarqueParada).toBe(busLegs[1]?.linha?.embarqueParada);
      expect(busLegs[0]?.linha?.desembarqueParada).toBe('Terminal Hauer');
    }
  });
});

// Terminal Santa Cândida e Terminal Cabral compartilham as linhas 203/020/216,
// então uma rota direta entre eles sempre existe (ver curitibaDataset.ts).
const TERMINAL_SANTA_CANDIDA = { latitude: -25.378, longitude: -49.229 };
const TERMINAL_CABRAL = { latitude: -25.4055, longitude: -49.252 };

describe('planTransitTrip — caminhada zero e cálculo de pernas', () => {
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

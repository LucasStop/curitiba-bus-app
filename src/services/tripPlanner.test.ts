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

describe('planTransitTrip — P7/P8 itinerário e sentido', () => {
  it('P7: quantidade de paradas da direta vem do itinerário (203 Santa Cândida→Cabral = 1)', () => {
    const options = planTransitTrip(TERMINAL_SANTA_CANDIDA, TERMINAL_CABRAL);
    const option = options.find(
      (o) => o.id === 'direct-203-terminal-santa-candida-terminal-cabral'
    );

    expect(option).toBeDefined();
    const busLeg = option!.pernas.find((leg) => leg.tipo === 'bus');
    expect(busLeg?.linha?.quantidadeParadas).toBe(1);
    expect(busLeg?.linha?.sentido).toBe('ida');
  });

  it('P8: respeita o sentido — 500 Boqueirão→Hauer só vale na volta, com 2 paradas', () => {
    const boqueirao = stop('terminal-boqueirao');
    const hauer = stop('terminal-hauer');

    const options = planTransitTrip(
      { latitude: boqueirao.latitude, longitude: boqueirao.longitude },
      { latitude: hauer.latitude, longitude: hauer.longitude }
    );
    const option = options.find(
      (o) => o.id === 'direct-500-terminal-boqueirao-terminal-hauer'
    );

    // Na ida a 500 vai Carlos Gomes→Boqueirão (embarque depois do
    // desembarque); só a volta serve. O código antigo retornava 4 fixo.
    expect(option).toBeDefined();
    const busLeg = option!.pernas.find((leg) => leg.tipo === 'bus');
    expect(busLeg?.linha?.quantidadeParadas).toBe(2);
    expect(busLeg?.linha?.sentido).toBe('volta');
  });

  it('P7: pernas da baldeação usam contagem do itinerário (500 Carmo→Hauer = 1, 020 Hauer→Portão = 1)', () => {
    // Carmo só tem a 500; Portão tem 203/020/216. Direta 020 Hauer→Portão
    // existe (1 parada), então a busca de baldeação roda e acha
    // 500 Carmo→Hauer (volta, 1 parada) + 020 Hauer→Portão (ida, 1 parada).
    const origin = stop('terminal-carmo');
    const destination = stop('terminal-portao');

    const options = planTransitTrip(
      { latitude: origin.latitude, longitude: origin.longitude },
      { latitude: destination.latitude, longitude: destination.longitude }
    );
    const transferOption = options.find((o) => o.id.startsWith('transfer-'));

    expect(transferOption).toBeDefined();
    const busLegs = transferOption!.pernas.filter((leg) => leg.tipo === 'bus');
    expect(busLegs).toHaveLength(2);
    expect(busLegs[0]?.linha?.quantidadeParadas).toBe(1);
    expect(busLegs[0]?.linha?.sentido).toBe('volta');
    expect(busLegs[1]?.linha?.quantidadeParadas).toBe(1);
    expect(busLegs[1]?.linha?.sentido).toBe('ida');
  });
});

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

  it('P9: origem igual ao destino retorna sem rota (você já está lá)', () => {
    expect(planTransitTrip(TERMINAL_SANTA_CANDIDA, TERMINAL_SANTA_CANDIDA)).toEqual([]);
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

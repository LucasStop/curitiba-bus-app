import { AppState, type AppStateStatus } from 'react-native';
import type { NetworkError as NetworkErrorType } from '@/lib/resilience';
import type { transitService as TransitServiceInstance } from './transitProvider';

type AppStateHandler = (status: AppStateStatus) => void;

type TestableTransitService = typeof TransitServiceInstance & {
  simulateFailures(count: number, makeError?: () => Error): void;
};

function loadService(): typeof import('./transitProvider') {
  let mod!: typeof import('./transitProvider');
  jest.isolateModules(() => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    mod = require('./transitProvider');
    /* eslint-enable @typescript-eslint/no-require-imports */
  });
  return mod;
}

describe('transitProvider - ciclo de vida do timer de simulação', () => {
  let appStateHandler: AppStateHandler | null = null;
  const removeAppState = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    appStateHandler = null;
    removeAppState.mockClear();
    (AppState as { currentState: AppStateStatus }).currentState = 'active';
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      appStateHandler = handler as AppStateHandler;
      return { remove: removeAppState } as never;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('não inicia o timer só por importar o módulo, sem ninguém inscrito', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    loadService();

    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it('inicia ao inscrever (mapa monta) e limpa o timer ao desinscrever (mapa desmonta)', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { transitService } = loadService();
    const unsubscribe = transitService.subscribeVehicles(() => {});

    expect(setTimeoutSpy).toHaveBeenCalled();

    unsubscribe();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('pausa a simulação quando o app vai para background e retoma ao voltar', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const { transitService } = loadService();
    transitService.subscribeVehicles(() => {});

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

    appStateHandler!('background');
    expect(clearTimeoutSpy).toHaveBeenCalled();

    appStateHandler!('active');
    expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
  });
});

describe('transitService — resiliência contra o provedor mock (RNF-02)', () => {
  let transitService: TestableTransitService;
  let NetworkError: typeof NetworkErrorType;

  beforeEach(() => {
    (AppState as { currentState: AppStateStatus }).currentState = 'active';
    jest.useFakeTimers();
    jest.resetModules();
    /* eslint-disable @typescript-eslint/no-require-imports */
    transitService = require('./transitProvider').transitService;
    NetworkError = require('@/lib/resilience').NetworkError;
    /* eslint-enable @typescript-eslint/no-require-imports */
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('numa falha, mantém o último dado bom visível e marca offline (não erro genérico)', () => {
    // Inscreve para o timer de simulação começar
    transitService.subscribeVehicles(() => {});
    const lastGoodVehicles = transitService.getVehicles();

    transitService.simulateFailures(1, () => new NetworkError());
    jest.advanceTimersByTime(3000);

    expect(transitService.getVehicles()).toEqual(lastGoodVehicles);
    expect(transitService.getConnectionStatus()).toMatchObject({ state: 'offline', consecutiveFailures: 1 });
  });

  it('recua o próximo intento (backoff) em vez de martelar a fonte no intervalo normal', () => {
    transitService.subscribeVehicles(() => {});
    transitService.simulateFailures(1, () => new NetworkError());
    jest.advanceTimersByTime(3000); // 1ª tentativa: falha; próxima só em base*2 = 6s

    jest.advanceTimersByTime(3000); // completaria o intervalo normal (3s) — backoff ainda não completou
    expect(transitService.getConnectionStatus().consecutiveFailures).toBe(1);

    jest.advanceTimersByTime(3000); // completa os 6s de backoff — sem mais falhas armadas, recupera
    expect(transitService.getConnectionStatus()).toMatchObject({ state: 'online', consecutiveFailures: 0 });
  });

  it('erro que não é de rede vira status "error", distinto de "offline"', () => {
    transitService.subscribeVehicles(() => {});
    transitService.simulateFailures(1, () => new Error('dado corrompido'));
    jest.advanceTimersByTime(3000);

    expect(transitService.getConnectionStatus().state).toBe('error');
  });
});

describe('calculateEtaMinutes', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { calculateEtaMinutes, MAX_ETA_DISTANCE_METERS } = require('./transitProvider');

  it('distância zero (ônibus já chegou) dá o mínimo de 1 minuto', () => {
    expect(calculateEtaMinutes(0)).toBe(1);
  });

  it('distância pequena arredonda para 1 minuto', () => {
    expect(calculateEtaMinutes(100)).toBe(1);
  });

  it('bem no limite de previsão (MAX_ETA_DISTANCE_METERS) ainda calcula minutos', () => {
    expect(calculateEtaMinutes(MAX_ETA_DISTANCE_METERS)).toBe(
      Math.round(MAX_ETA_DISTANCE_METERS / 360),
    );
  });

  it('distância muito além do limite continua crescendo linearmente', () => {
    expect(calculateEtaMinutes(36000)).toBe(100);
  });
});

describe('transitService.getArrivalsForStop', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { transitService, MAX_ETA_DISTANCE_METERS } = require('./transitProvider');

  it('parada inexistente (input vazio/inválido) retorna lista vazia', () => {
    expect(transitService.getArrivalsForStop('parada-que-nao-existe')).toEqual([]);
  });

  it('retorna estimativas ordenadas da mais próxima para a mais distante', () => {
    const estimates = transitService.getArrivalsForStop('terminal-santa-candida');
    const minutos = estimates.map((e: { minutosAteChegada: number }) => e.minutosAteChegada);
    expect(minutos).toEqual([...minutos].sort((a: number, b: number) => a - b));
  });

  it('nunca inclui ônibus além do raio máximo de previsão', () => {
    const estimates = transitService.getArrivalsForStop('terminal-santa-candida');
    estimates.forEach((e: { distanciaMetros: number }) => {
      expect(e.distanciaMetros).toBeLessThanOrEqual(MAX_ETA_DISTANCE_METERS);
    });
  });
});

afterAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { transitService } = require('./transitProvider');
  if (typeof (transitService as { stopSimulation?: () => void }).stopSimulation === 'function') {
    (transitService as { stopSimulation: () => void }).stopSimulation();
  }
});

import type { NetworkError as NetworkErrorType } from '@/lib/resilience';
import type { transitService as TransitServiceInstance } from './transitProvider';

// `simulateFailures` é um hook só de QA no MockTransitProvider, de propósito fora do
// contrato público `TransitProvider` (uma implementação real não teria isso) — por isso
// precisa desse tipo extra aqui em vez de vir junto do tipo exportado do módulo.
type TestableTransitService = typeof TransitServiceInstance & {
  simulateFailures(count: number, makeError?: () => Error): void;
};

// O singleton agenda a primeira tentativa (setTimeout) já na construção, no import do módulo.
// Pra controlar isso com fake timers e isolar cada teste, ativa os fake timers e recarrega o
// módulo antes de cada `it` — sem isso, o timer real da instância anterior vazaria pro próximo
// teste e o avanço de tempo ficaria imprevisível. `NetworkError` também precisa vir do mesmo
// `require` fresco: com `resetModules`, um `import` estático no topo do arquivo pega uma cópia
// diferente da classe e o `instanceof` dentro do serviço nunca bate.
describe('transitService — resiliência contra o provedor mock (RNF-02)', () => {
  let transitService: TestableTransitService;
  let NetworkError: typeof NetworkErrorType;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
    // require() de propósito: precisa rodar depois do resetModules acima, e import()
    // dinâmico não roda neste setup do Jest (CJS, sem --experimental-vm-modules).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    transitService = require('./transitProvider').transitService;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    NetworkError = require('@/lib/resilience').NetworkError;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('numa falha, mantém o último dado bom visível e marca offline (não erro genérico)', () => {
    const lastGoodVehicles = transitService.getVehicles();

    transitService.simulateFailures(1, () => new NetworkError());
    jest.advanceTimersByTime(3000);

    expect(transitService.getVehicles()).toEqual(lastGoodVehicles);
    expect(transitService.getConnectionStatus()).toMatchObject({ state: 'offline', consecutiveFailures: 1 });
  });

  it('recua o próximo intento (backoff) em vez de martelar a fonte no intervalo normal', () => {
    transitService.simulateFailures(1, () => new NetworkError());
    jest.advanceTimersByTime(3000); // 1ª tentativa: falha; próxima só em base*2 = 6s

    jest.advanceTimersByTime(3000); // completaria o intervalo normal (3s) — backoff ainda não completou
    expect(transitService.getConnectionStatus().consecutiveFailures).toBe(1);

    jest.advanceTimersByTime(3000); // completa os 6s de backoff — sem mais falhas armadas, recupera
    expect(transitService.getConnectionStatus()).toMatchObject({ state: 'online', consecutiveFailures: 0 });
  });

  it('erro que não é de rede vira status "error", distinto de "offline"', () => {
    transitService.simulateFailures(1, () => new Error('dado corrompido'));
    jest.advanceTimersByTime(3000);

    expect(transitService.getConnectionStatus().state).toBe('error');
  });
});

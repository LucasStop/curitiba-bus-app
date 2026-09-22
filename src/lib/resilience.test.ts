import {
  ConnectionStatus,
  NetworkError,
  computeBackoffDelay,
  formatConnectionMessage,
  nextConnectionStatus,
} from './resilience';

describe('computeBackoffDelay', () => {
  it('sem falhas, usa o intervalo base', () => {
    expect(computeBackoffDelay(3000, 60000, 0)).toBe(3000);
  });

  it('dobra o intervalo a cada falha consecutiva', () => {
    expect(computeBackoffDelay(3000, 60000, 1)).toBe(6000);
    expect(computeBackoffDelay(3000, 60000, 2)).toBe(12000);
    expect(computeBackoffDelay(3000, 60000, 3)).toBe(24000);
  });

  it('não passa do teto, mesmo com muitas falhas seguidas (nunca martela a fonte)', () => {
    expect(computeBackoffDelay(3000, 60000, 10)).toBe(60000);
  });
});

describe('nextConnectionStatus', () => {
  const base: ConnectionStatus = { state: 'offline', lastUpdatedAt: 1000, consecutiveFailures: 2 };

  it('sucesso volta pra online, zera falhas e atualiza o horário do dado', () => {
    expect(nextConnectionStatus(base, { ok: true }, 5000)).toEqual({
      state: 'online',
      lastUpdatedAt: 5000,
      consecutiveFailures: 0,
    });
  });

  it('falha de rede vira "offline" e mantém o horário do último dado bom (não perde o dado)', () => {
    expect(nextConnectionStatus(base, { ok: false, error: new NetworkError() }, 5000)).toEqual({
      state: 'offline',
      lastUpdatedAt: 1000,
      consecutiveFailures: 3,
    });
  });

  it('falha que não é de rede vira "error", distinto de "offline"', () => {
    expect(nextConnectionStatus(base, { ok: false, error: new Error('dado corrompido') }, 5000)).toEqual({
      state: 'error',
      lastUpdatedAt: 1000,
      consecutiveFailures: 3,
    });
  });
});

describe('formatConnectionMessage', () => {
  it('online não mostra mensagem nenhuma', () => {
    expect(formatConnectionMessage({ state: 'online', lastUpdatedAt: 1000, consecutiveFailures: 0 })).toBeNull();
  });

  it('offline com dado anterior diz "sem conexão" e a hora do último dado (não só o que falhou)', () => {
    const lastUpdatedAt = new Date('2026-09-22T14:32:00').getTime();
    const expectedTime = new Date(lastUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    expect(
      formatConnectionMessage({ state: 'offline', lastUpdatedAt, consecutiveFailures: 1 }),
    ).toBe(`Sem conexão. Mostrando os últimos dados de ${expectedTime}.`);
  });

  it('offline sem nenhum dado anterior ainda avisa, sem hora', () => {
    expect(formatConnectionMessage({ state: 'offline', lastUpdatedAt: null, consecutiveFailures: 1 })).toBe(
      'Sem conexão. Buscando dados assim que possível.',
    );
  });

  it('erro genérico usa mensagem diferente da de "sem conexão"', () => {
    const lastUpdatedAt = new Date('2026-09-22T14:32:00').getTime();
    const expectedTime = new Date(lastUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    expect(formatConnectionMessage({ state: 'error', lastUpdatedAt, consecutiveFailures: 1 })).toBe(
      `Não foi possível atualizar. Mostrando os últimos dados de ${expectedTime}.`,
    );
  });
});

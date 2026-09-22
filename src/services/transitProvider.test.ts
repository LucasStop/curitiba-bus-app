import { AppState, type AppStateStatus } from 'react-native';

type AppStateHandler = (status: AppStateStatus) => void;

// isolateModules dá um registro de módulos novo, para recriar o singleton do zero a cada teste.
function loadService(): typeof import('./transitProvider') {
  let mod!: typeof import('./transitProvider');
  jest.isolateModules(() => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    mod = require('./transitProvider');
    /* eslint-enable @typescript-eslint/no-require-imports */
  });
  return mod;
}

// Bug: o timer de simulação rodava desde o import do módulo, nunca era limpo
// (vazamento a cada remount) e continuava rodando com o app em background.
describe('transitProvider - ciclo de vida do timer de simulação', () => {
  let appStateHandler: AppStateHandler | null = null;
  const removeAppState = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    appStateHandler = null;
    removeAppState.mockClear();
    // jest-expo automocka AppState inteiro; currentState vira jest.fn() em vez de string.
    // Fixamos 'active' pra refletir o app em primeiro plano, que é o cenário real no device.
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
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    loadService();

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('inicia ao inscrever (mapa monta) e limpa o interval ao desinscrever (mapa desmonta)', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const { transitService } = loadService();
    const unsubscribe = transitService.subscribeVehicles(() => {});

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    unsubscribe();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it('pausa a simulação quando o app vai para background e retoma ao voltar', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { transitService } = loadService();
    transitService.subscribeVehicles(() => {});

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    appStateHandler!('background');
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

    appStateHandler!('active');
    expect(setIntervalSpy).toHaveBeenCalledTimes(2);
  });
});

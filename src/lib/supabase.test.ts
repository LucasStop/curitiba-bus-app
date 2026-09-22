// Sem rede: createClient é mockado. Valores abaixo são fictícios, só para o teste.
const mockCreateClient = jest.fn((..._args: unknown[]) => ({ fake: 'client' }));
jest.mock('@supabase/supabase-js', () => ({ createClient: mockCreateClient }));

const ORIGINAL_ENV = process.env;

// isolateModules dá um registro de módulos novo, para reler process.env e refazer o singleton.
async function loadModules() {
  let supabase!: typeof import('./supabase');
  let storeModule!: typeof import('./largeSecureStore');
  jest.isolateModules(() => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    supabase = require('./supabase');
    storeModule = require('./largeSecureStore');
    /* eslint-enable @typescript-eslint/no-require-imports */
  });
  return { supabase, storeModule };
}

beforeEach(() => {
  mockCreateClient.mockClear();
  process.env = { ...ORIGINAL_ENV };
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('supabase (sem variáveis de ambiente)', () => {
  it('importar o módulo não quebra nem cria cliente (modo visitante segue funcionando)', async () => {
    const { supabase } = await loadModules();
    expect(supabase.isSupabaseConfigured()).toBe(false);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('só falha, com mensagem clara, quando alguém tenta usar o cliente', async () => {
    const { supabase } = await loadModules();
    expect(() => supabase.getSupabase()).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
    expect(() => supabase.getSupabase()).toThrow(/EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });

  it('só uma das variáveis também conta como não configurado', async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://exemplo.invalid';
    expect((await loadModules()).supabase.isSupabaseConfigured()).toBe(false);
  });
});

describe('supabase (configurado)', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://exemplo.invalid';
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'chave-publicavel-de-teste';
  });

  it('cria o cliente uma única vez, com a sessão persistida em LargeSecureStore', async () => {
    const { supabase, storeModule } = await loadModules();
    expect(supabase.isSupabaseConfigured()).toBe(true);
    const a = supabase.getSupabase();
    const b = supabase.getSupabase();
    expect(a).toBe(b);
    expect(mockCreateClient).toHaveBeenCalledTimes(1);

    const [url, key, options] = mockCreateClient.mock.calls[0] as [string, string, any];
    expect(url).toBe('https://exemplo.invalid');
    expect(key).toBe('chave-publicavel-de-teste');
    expect(options.auth).toMatchObject({
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    });
    expect(options.auth.storage).toBeInstanceOf(storeModule.LargeSecureStore);
  });
});

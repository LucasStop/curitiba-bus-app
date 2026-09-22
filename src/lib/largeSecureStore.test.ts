import { LargeSecureStore } from './largeSecureStore';

// C5. Armazenamentos em memória injetados: nenhum Keychain nem AsyncStorage reais.
function fakeStores() {
  const plain = new Map<string, string>();
  const secret = new Map<string, string>();
  let counter = 0;
  const store = new LargeSecureStore(
    {
      getItem: async (k) => plain.get(k) ?? null,
      setItem: async (k, v) => void plain.set(k, v),
      removeItem: async (k) => void plain.delete(k),
    },
    {
      getItemAsync: async (k) => secret.get(k) ?? null,
      setItemAsync: async (k, v) => void secret.set(k, v),
      deleteItemAsync: async (k) => void secret.delete(k),
    },
    // Determinístico mas diferente a cada chamada (o teste de aleatoriedade real é o do expo-crypto).
    async (n) => Uint8Array.from({ length: n }, (_, i) => (i * 7 + ++counter * 31) % 256),
  );
  return { store, plain, secret };
}

const session = JSON.stringify({
  access_token: 'a'.repeat(1500),
  refresh_token: 'segredo-do-refresh',
  user: { email: 'pessoa@exemplo.com', nome: 'Curitiba ônibus ✓' },
  padding: 'x'.repeat(2000),
});

describe('LargeSecureStore', () => {
  it('a sessão de teste passa de 2048 bytes (o limite do SecureStore)', () => {
    expect(new TextEncoder().encode(session).length).toBeGreaterThan(2048);
  });

  it('valor maior que 2048 bytes volta idêntico', async () => {
    const { store } = fakeStores();
    await store.setItem('sb-session', session);
    expect(await store.getItem('sb-session')).toBe(session);
  });

  it('o texto guardado no AsyncStorage NÃO é o original e não vaza trechos dele', async () => {
    const { store, plain } = fakeStores();
    await store.setItem('sb-session', session);
    const stored = plain.get('sb-session')!;
    expect(stored).not.toBe(session);
    expect(stored).not.toContain('segredo-do-refresh');
    expect(stored).not.toContain('pessoa@exemplo.com');
  });

  it('a chave AES-256 (64 hex) fica só no armazenamento seguro, cabendo em 2048 bytes', async () => {
    const { store, secret, plain } = fakeStores();
    await store.setItem('sb-session', session);
    const key = secret.get('sb-session')!;
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(plain.get('sb-session')).not.toContain(key);
  });

  it('gera uma chave nova a cada gravação', async () => {
    const { store, secret } = fakeStores();
    await store.setItem('sb-session', session);
    const first = secret.get('sb-session');
    await store.setItem('sb-session', session);
    expect(secret.get('sb-session')).not.toBe(first);
    expect(await store.getItem('sb-session')).toBe(session);
  });

  it('remover apaga o valor e a chave', async () => {
    const { store, plain, secret } = fakeStores();
    await store.setItem('sb-session', session);
    await store.removeItem('sb-session');
    expect(plain.has('sb-session')).toBe(false);
    expect(secret.has('sb-session')).toBe(false);
    expect(await store.getItem('sb-session')).toBeNull();
  });

  it('getItem de chave inexistente devolve null', async () => {
    const { store } = fakeStores();
    expect(await store.getItem('nada')).toBeNull();
  });

  it('sem a chave no armazenamento seguro (ex.: backup restaurado em outro aparelho) devolve null, não lixo', async () => {
    const { store, secret } = fakeStores();
    await store.setItem('sb-session', session);
    secret.clear();
    expect(await store.getItem('sb-session')).toBeNull();
  });
});

import type { SupabaseClient } from '@supabase/supabase-js';

import { useFavoritesStore } from '@/stores/useFavoritesStore';

import { pullAndMergeFavorites, startFavoritesSync, stopFavoritesSync } from './favoritesSync';

// Sem rede: o cliente Supabase inteiro é falso, com o encadeamento mínimo que o módulo usa.
function fakeSupabase(opts: {
  selectResult?: { data: unknown; error: unknown };
  insertResult?: { data: unknown; error: unknown };
  deleteResult?: { data: unknown; error: unknown };
} = {}) {
  const select = jest.fn().mockResolvedValue(opts.selectResult ?? { data: [], error: null });
  const insert = jest.fn().mockResolvedValue(opts.insertResult ?? { data: null, error: null });
  const eq2 = jest.fn().mockResolvedValue(opts.deleteResult ?? { data: null, error: null });
  const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
  const del = jest.fn().mockReturnValue({ eq: eq1 });
  const from = jest.fn().mockReturnValue({ select, insert, delete: del });
  return { client: { from } as unknown as SupabaseClient, from, select, insert, del, eq1, eq2 };
}

beforeEach(() => {
  stopFavoritesSync();
  useFavoritesStore.setState({ favoriteLines: [], favoriteStops: [] });
});

describe('pullAndMergeFavorites (RF-20, C4 aplicado à nuvem)', () => {
  it('une local e nuvem e sobe pra nuvem só o que faltava lá', async () => {
    const { client, from, insert } = fakeSupabase({
      selectResult: { data: [{ kind: 'stop', ref: 'terminal-cabral' }], error: null },
    });

    const merged = await pullAndMergeFavorites(client, 'u1', { favoriteLines: ['203'], favoriteStops: [] });

    expect(merged.favoriteLines).toEqual(['203']);
    expect(merged.favoriteStops).toEqual(['terminal-cabral']);
    expect(from).toHaveBeenCalledWith('favorites');
    expect(insert).toHaveBeenCalledWith([{ kind: 'line', ref: '203', user_id: 'u1' }]);
  });

  it('nada faltando na nuvem não chama insert', async () => {
    const { client, insert } = fakeSupabase({
      selectResult: { data: [{ kind: 'line', ref: '203' }], error: null },
    });

    await pullAndMergeFavorites(client, 'u1', { favoriteLines: ['203'], favoriteStops: [] });

    expect(insert).not.toHaveBeenCalled();
  });

  it('erro do select cai pro cache local, sem travar (S17)', async () => {
    const { client, insert } = fakeSupabase({ selectResult: { data: null, error: { message: 'boom' } } });
    const local = { favoriteLines: ['203'], favoriteStops: [] };

    expect(await pullAndMergeFavorites(client, 'u1', local)).toEqual(local);
    expect(insert).not.toHaveBeenCalled();
  });

  it('exceção de rede cai pro cache local, sem travar (S17)', async () => {
    const client = { from: () => { throw new TypeError('Network request failed'); } } as unknown as SupabaseClient;
    const local = { favoriteLines: ['203'], favoriteStops: ['a'] };

    expect(await pullAndMergeFavorites(client, 'u1', local)).toEqual(local);
  });
});

describe('startFavoritesSync / stopFavoritesSync', () => {
  it('favoritar uma linha enquanto logado grava na nuvem', async () => {
    const { client, from, insert } = fakeSupabase();
    startFavoritesSync(client, 'u1');

    useFavoritesStore.getState().toggleFavoriteLine('203');
    await Promise.resolve();
    await Promise.resolve();

    expect(from).toHaveBeenCalledWith('favorites');
    expect(insert).toHaveBeenCalledWith({ user_id: 'u1', kind: 'line', ref: '203' });
  });

  it('desfavoritar uma parada enquanto logado apaga na nuvem', async () => {
    useFavoritesStore.setState({ favoriteLines: [], favoriteStops: ['tubo-central'] });
    const { client, del, eq1, eq2 } = fakeSupabase();
    startFavoritesSync(client, 'u1');

    useFavoritesStore.getState().toggleFavoriteStop('tubo-central');
    await Promise.resolve();
    await Promise.resolve();

    expect(del).toHaveBeenCalled();
    expect(eq1).toHaveBeenCalledWith('kind', 'stop');
    expect(eq2).toHaveBeenCalledWith('ref', 'tubo-central');
  });

  it('falha de rede no toggle não trava a UI: o estado local já mudou (S17)', async () => {
    const client = { from: () => { throw new TypeError('Network request failed'); } } as unknown as SupabaseClient;
    startFavoritesSync(client, 'u1');

    expect(() => useFavoritesStore.getState().toggleFavoriteLine('500')).not.toThrow();
    expect(useFavoritesStore.getState().favoriteLines).toContain('500');
  });

  it('stopFavoritesSync para de espelhar toggles', async () => {
    const { client, insert } = fakeSupabase();
    startFavoritesSync(client, 'u1');
    stopFavoritesSync();

    useFavoritesStore.getState().toggleFavoriteLine('203');
    await Promise.resolve();
    await Promise.resolve();

    expect(insert).not.toHaveBeenCalled();
  });

  it('iniciar de novo troca o usuário sincronizado, sem duplicar assinatura', async () => {
    const first = fakeSupabase();
    startFavoritesSync(first.client, 'u1');
    const second = fakeSupabase();
    startFavoritesSync(second.client, 'u2');

    useFavoritesStore.getState().toggleFavoriteLine('203');
    await Promise.resolve();
    await Promise.resolve();

    expect(first.insert).not.toHaveBeenCalled();
    expect(second.insert).toHaveBeenCalledWith({ user_id: 'u2', kind: 'line', ref: '203' });
  });
});

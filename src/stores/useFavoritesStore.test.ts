import { migrateFavorites, useFavoritesStore } from './useFavoritesStore';

// Bug: a instalação fresca vinha com favoritos falsos pré-preenchidos ('203', '500',
// 'tubo-central', 'terminal-cabral'), então a UI de favoritos nunca mostrava o estado
// vazio real. Um usuário novo tem que começar sem nenhum favorito.
describe('useFavoritesStore initial state', () => {
  it('starts with zero favorite lines and stops on a fresh install', () => {
    const state = useFavoritesStore.getState();
    expect(state.favoriteLines).toEqual([]);
    expect(state.favoriteStops).toEqual([]);
  });
});

describe('migrateFavorites (v0 -> v1, dataset real)', () => {
  it('keeps ids that still exist and drops the mock-only ones', () => {
    const migrated = migrateFavorites({
      favoriteLines: ['203', 'nao-existe'],
      favoriteStops: ['terminal-cabral', 'tubo-central'],
    });
    expect(migrated.favoriteLines).toEqual(['203']);
    expect(migrated.favoriteStops).toEqual(['terminal-cabral']);
  });
});

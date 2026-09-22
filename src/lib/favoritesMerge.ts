// Mesmos nomes de campo do useFavoritesStore, para o sync poder aplicar o resultado direto.
export interface Favorites {
  favoriteLines: string[];
  favoriteStops: string[];
}

const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];

// Primeiro login: união dos favoritos do aparelho com os da nuvem, sem duplicar e sem perder nenhum lado.
// Locais primeiro (ordem que o usuário já vê), depois o que só existia na nuvem.
export function mergeFavorites(local: Favorites, remote: Favorites): Favorites {
  return {
    favoriteLines: union(local.favoriteLines, remote.favoriteLines),
    favoriteStops: union(local.favoriteStops, remote.favoriteStops),
  };
}

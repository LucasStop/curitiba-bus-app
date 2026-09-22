import type { SupabaseClient } from '@supabase/supabase-js';

import { useFavoritesStore } from '@/stores/useFavoritesStore';

import { mergeFavorites, type Favorites } from './favoritesMerge';

// Sync de favoritos com a nuvem (RF-20, SSD 10.3). A tabela `favorites` guarda linhas
// (kind, ref) por usuário; RLS filtra sempre pelo dono, então as consultas aqui nunca
// precisam repetir o filtro de user_id, só o `user_id` que vai no insert.
type Kind = 'line' | 'stop';
interface FavoriteRow {
  kind: Kind;
  ref: string;
}

const TABLE = 'favorites';

const rowsToFavorites = (rows: FavoriteRow[]): Favorites => ({
  favoriteLines: rows.filter((r) => r.kind === 'line').map((r) => r.ref),
  favoriteStops: rows.filter((r) => r.kind === 'stop').map((r) => r.ref),
});

const favoritesToRows = (favorites: Favorites): FavoriteRow[] => [
  ...favorites.favoriteLines.map((ref) => ({ kind: 'line' as const, ref })),
  ...favorites.favoriteStops.map((ref) => ({ kind: 'stop' as const, ref })),
];

const hasRow = (rows: FavoriteRow[], row: FavoriteRow) => rows.some((r) => r.kind === row.kind && r.ref === row.ref);

// Primeiro login: une nuvem e local (C4) sem duplicar, sobe pra nuvem só o que faltava lá.
// Sem rede (ou erro), cai pro cache local sem travar a UI (RNF, S17).
export async function pullAndMergeFavorites(
  supabase: SupabaseClient,
  userId: string,
  local: Favorites,
): Promise<Favorites> {
  try {
    const { data, error } = await supabase.from(TABLE).select('kind, ref');
    if (error || !data) return local;

    const remoteRows = data as FavoriteRow[];
    const merged = mergeFavorites(local, rowsToFavorites(remoteRows));

    const missing = favoritesToRows(merged).filter((row) => !hasRow(remoteRows, row));
    if (missing.length > 0) {
      await supabase.from(TABLE).insert(missing.map((row) => ({ ...row, user_id: userId })));
    }
    return merged;
  } catch {
    return local;
  }
}

// Espelha um toggle local na nuvem. Falha de rede não desfaz o toggle local nem trava a UI (S17).
async function syncOneToggle(supabase: SupabaseClient, userId: string, kind: Kind, ref: string, isNowFavorite: boolean) {
  try {
    if (isNowFavorite) {
      await supabase.from(TABLE).insert({ user_id: userId, kind, ref });
    } else {
      await supabase.from(TABLE).delete().eq('kind', kind).eq('ref', ref);
    }
  } catch {
    // RNF/S17: sem rede, fica só no cache local; sincroniza no próximo toggle ou login.
  }
}

let unsubscribe: (() => void) | null = null;

// Enquanto logado, cada toggle local (favoritar/desfavoritar) espelha na nuvem. Um usuário
// sincronizado por vez: iniciar de novo (outro login) troca o alvo sem duplicar assinatura.
export function startFavoritesSync(supabase: SupabaseClient, userId: string): void {
  stopFavoritesSync();
  let prev = useFavoritesStore.getState();
  unsubscribe = useFavoritesStore.subscribe((state) => {
    const added = (before: string[], after: string[]) => after.filter((ref) => !before.includes(ref));
    const removed = (before: string[], after: string[]) => before.filter((ref) => !after.includes(ref));

    for (const ref of added(prev.favoriteLines, state.favoriteLines)) void syncOneToggle(supabase, userId, 'line', ref, true);
    for (const ref of removed(prev.favoriteLines, state.favoriteLines)) void syncOneToggle(supabase, userId, 'line', ref, false);
    for (const ref of added(prev.favoriteStops, state.favoriteStops)) void syncOneToggle(supabase, userId, 'stop', ref, true);
    for (const ref of removed(prev.favoriteStops, state.favoriteStops)) void syncOneToggle(supabase, userId, 'stop', ref, false);

    prev = state;
  });
}

// Sair mantém os favoritos locais como estão (SSD 10.3): isto só para de mandar pra nuvem.
export function stopFavoritesSync(): void {
  unsubscribe?.();
  unsubscribe = null;
}

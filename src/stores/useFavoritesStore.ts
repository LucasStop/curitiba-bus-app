import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { LINES_BY_CODE, STOPS_BY_ID } from '@/data/curitibaDataset';

interface FavoritesState {
  favoriteLines: string[]; // Códigos das linhas, ex: ["203", "500"]
  favoriteStops: string[]; // IDs das paradas, ex: ["108030", "terminal-cabral"]

  toggleFavoriteLine: (codLinha: string) => void;
  isFavoriteLine: (codLinha: string) => boolean;
  toggleFavoriteStop: (stopId: string) => void;
  isFavoriteStop: (stopId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteLines: [],
      favoriteStops: [],

      toggleFavoriteLine: (codLinha: string) => {
        const current = get().favoriteLines;
        if (current.includes(codLinha)) {
          set({ favoriteLines: current.filter((c) => c !== codLinha) });
        } else {
          set({ favoriteLines: [...current, codLinha] });
        }
      },

      isFavoriteLine: (codLinha: string) => {
        return get().favoriteLines.includes(codLinha);
      },

      toggleFavoriteStop: (stopId: string) => {
        const current = get().favoriteStops;
        if (current.includes(stopId)) {
          set({ favoriteStops: current.filter((s) => s !== stopId) });
        } else {
          set({ favoriteStops: [...current, stopId] });
        }
      },

      isFavoriteStop: (stopId: string) => {
        return get().favoriteStops.includes(stopId);
      },
    }),
    {
      name: 'curitiba-bus-favorites',
      storage: createJSONStorage(() => AsyncStorage),
      // v1: dataset real do GeoCuritiba. Ids de parada do mock (tubo-*) deixam de existir.
      version: 1,
      migrate: (persisted) => migrateFavorites(persisted as Partial<FavoritesState>),
    },
  ),
);

export function migrateFavorites(state: Partial<FavoritesState>) {
  return {
    ...state,
    favoriteLines: (state.favoriteLines ?? []).filter((c) => LINES_BY_CODE.has(c)),
    favoriteStops: (state.favoriteStops ?? []).filter((id) => STOPS_BY_ID.has(id)),
  } as FavoritesState;
}

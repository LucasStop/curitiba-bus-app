import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface FavoritesState {
  favoriteLines: string[]; // Códigos das linhas, ex: ["203", "500"]
  favoriteStops: string[]; // IDs das paradas, ex: ["tubo-central"]

  toggleFavoriteLine: (codLinha: string) => void;
  isFavoriteLine: (codLinha: string) => boolean;
  toggleFavoriteStop: (stopId: string) => void;
  isFavoriteStop: (stopId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteLines: ['203', '500'],
      favoriteStops: ['tubo-central', 'terminal-cabral'],

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
    }
  )
);

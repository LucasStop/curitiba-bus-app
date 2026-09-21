import { BusCategory, BusLine, BusStop, BusVehicle } from '@/types/transit';
import { create } from 'zustand';

interface TransitState {
  selectedLine: BusLine | null;
  selectedStop: BusStop | null;
  selectedVehicle: BusVehicle | null;
  activeCategory: 'all' | BusCategory;
  activeDirection: 'ida' | 'volta';
  searchQuery: string;
  isMapTrafficVisible: boolean;

  setSelectedLine: (line: BusLine | null) => void;
  setSelectedStop: (stop: BusStop | null) => void;
  setSelectedVehicle: (vehicle: BusVehicle | null) => void;
  setActiveCategory: (category: 'all' | BusCategory) => void;
  setActiveDirection: (direction: 'ida' | 'volta') => void;
  toggleActiveDirection: () => void;
  setSearchQuery: (query: string) => void;
  toggleMapTraffic: () => void;
  clearSelection: () => void;
}

export const useTransitStore = create<TransitState>((set) => ({
  selectedLine: null,
  selectedStop: null,
  selectedVehicle: null,
  activeCategory: 'all',
  activeDirection: 'ida',
  searchQuery: '',
  isMapTrafficVisible: false,

  setSelectedLine: (line) => set({ selectedLine: line, selectedStop: null }),
  setSelectedStop: (stop) => set({ selectedStop: stop }),
  setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  setActiveDirection: (direction) => set({ activeDirection: direction }),
  toggleActiveDirection: () =>
    set((state) => ({
      activeDirection: state.activeDirection === 'ida' ? 'volta' : 'ida',
    })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleMapTraffic: () =>
    set((state) => ({ isMapTrafficVisible: !state.isMapTrafficVisible })),
  clearSelection: () =>
    set({ selectedLine: null, selectedStop: null, selectedVehicle: null }),
}));

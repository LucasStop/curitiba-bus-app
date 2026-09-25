import { SheetSnapIndex } from '@/constants/sheet';
import { BusCategory, BusLine, BusStop, BusVehicle } from '@/types/transit';
import { create } from 'zustand';

interface TransitState {
  selectedLine: BusLine | null;
  selectedStop: BusStop | null;
  selectedVehicle: BusVehicle | null;
  activeCategory: 'all' | BusCategory;
  activeDirection: 'ida' | 'volta';
  isMapTrafficVisible: boolean;
  sheetSnapIndex: SheetSnapIndex;

  setSelectedLine: (line: BusLine | null) => void;
  setSelectedStop: (stop: BusStop | null) => void;
  setSelectedVehicle: (vehicle: BusVehicle | null) => void;
  setActiveCategory: (category: 'all' | BusCategory) => void;
  setActiveDirection: (direction: 'ida' | 'volta') => void;
  toggleActiveDirection: () => void;
  toggleMapTraffic: () => void;
  setSheetSnapIndex: (index: SheetSnapIndex) => void;
  cycleSheetSnap: () => void;
  clearSelection: () => void;
}

export const useTransitStore = create<TransitState>((set) => ({
  selectedLine: null,
  selectedStop: null,
  selectedVehicle: null,
  activeCategory: 'all',
  activeDirection: 'ida',
  isMapTrafficVisible: false,
  sheetSnapIndex: 1,

  setSelectedLine: (line) => set({ selectedLine: line, selectedStop: null }),
  setSelectedStop: (stop) => set({ selectedStop: stop }),
  setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  setActiveDirection: (direction) => set({ activeDirection: direction }),
  toggleActiveDirection: () =>
    set((state) => ({
      activeDirection: state.activeDirection === 'ida' ? 'volta' : 'ida',
    })),
  toggleMapTraffic: () => set((state) => ({ isMapTrafficVisible: !state.isMapTrafficVisible })),
  setSheetSnapIndex: (index) => set({ sheetSnapIndex: index }),
  cycleSheetSnap: () =>
    set((state) => ({
      sheetSnapIndex: ((state.sheetSnapIndex + 1) % 3) as SheetSnapIndex,
    })),
  clearSelection: () => set({ selectedLine: null, selectedStop: null, selectedVehicle: null }),
}));

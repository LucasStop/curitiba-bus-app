import { transitService } from '@/services/transitProvider';
import { useTransitStore } from '@/stores/useTransitStore';
import { BusVehicle } from '@/types/transit';
import { useEffect, useState } from 'react';

export function useLiveVehicles() {
  const [vehicles, setVehicles] = useState<BusVehicle[]>(() => transitService.getVehicles());
  const selectedLine = useTransitStore((s) => s.selectedLine);
  const activeCategory = useTransitStore((s) => s.activeCategory);

  useEffect(() => {
    // Escuta atualizações periódicas da simulação/API
    const unsubscribe = transitService.subscribeVehicles((updatedList) => {
      setVehicles(updatedList);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filtra de acordo com a seleção de linha ou categoria ativa
  const filteredVehicles = vehicles.filter((v) => {
    if (selectedLine) {
      return v.codLinha === selectedLine.codigo;
    }
    if (activeCategory !== 'all') {
      return v.categoria === activeCategory;
    }
    return true;
  });

  return {
    vehicles: filteredVehicles,
    totalActive: vehicles.length,
  };
}

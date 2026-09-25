import { ConnectionStatus, formatConnectionMessage } from '@/lib/resilience';
import { transitService } from '@/services/transitProvider';
import { useTransitStore } from '@/stores/useTransitStore';
import { BusVehicle } from '@/types/transit';
import { useEffect, useMemo, useState } from 'react';

export function useLiveVehicles() {
  const [vehicles, setVehicles] = useState<BusVehicle[]>(() => transitService.getVehicles());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() =>
    transitService.getConnectionStatus(),
  );
  const selectedLine = useTransitStore((s) => s.selectedLine);
  const activeCategory = useTransitStore((s) => s.activeCategory);

  useEffect(() => {
    // Escuta atualizações periódicas da simulação/API
    const unsubscribeVehicles = transitService.subscribeVehicles((updatedList) => {
      setVehicles(updatedList);
    });
    const unsubscribeStatus = transitService.subscribeConnectionStatus(setConnectionStatus);

    return () => {
      unsubscribeVehicles();
      unsubscribeStatus();
    };
  }, []);

  // Filtra de acordo com a seleção de linha ou categoria ativa.
  // useMemo: consumidores deste hook (ex: CuritibaMap) re-renderizam por outros
  // motivos (seleção, banner, FABs) sem que `vehicles`/filtros tenham mudado.
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (selectedLine) {
        return v.codLinha === selectedLine.codigo;
      }
      if (activeCategory !== 'all') {
        return v.categoria === activeCategory;
      }
      return true;
    });
  }, [vehicles, selectedLine, activeCategory]);

  return {
    vehicles: filteredVehicles,
    totalActive: vehicles.length,
    isOffline: connectionStatus.state !== 'online',
    connectionMessage: formatConnectionMessage(connectionStatus),
  };
}

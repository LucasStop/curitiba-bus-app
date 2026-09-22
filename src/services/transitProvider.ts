import { CURITIBA_LINES, CURITIBA_STOPS } from '@/data/curitibaDataset';
import { ArrivalEstimate, BusLine, BusStop, BusVehicle, LatLng } from '@/types/transit';
import { calculateStepDistanceMeters, getBearing, getDistanceInMeters, interpolateLatLng } from '@/utils/geo';

const TICK_INTERVAL_MS = 3000;

interface VehicleSimState {
  vehicle: BusVehicle;
  lineId: string;
  segmentIndex: number;
  segmentProgress: number; // 0 to 1
  direction: 'ida' | 'volta';
}

/**
 * Contrato que qualquer fonte de dados de transporte deve implementar.
 * Hoje só existe o mock (simulação em memória); quando a integração com a
 * URBS estiver disponível, uma segunda implementação entra aqui e a troca
 * acontece só em `createTransitProvider`, sem mexer em quem consome `transitService`.
 */
export interface TransitProvider {
  getVehicles(): BusVehicle[];
  getLines(): BusLine[];
  getLineByCode(codigo: string): BusLine | undefined;
  getStops(): BusStop[];
  getStopById(id: string): BusStop | undefined;
  getArrivalsForStop(stopId: string): ArrivalEstimate[];
  subscribeVehicles(cb: (vehicles: BusVehicle[]) => void): () => void;
}

class MockTransitProvider implements TransitProvider {
  private vehicles: VehicleSimState[] = [];
  private listeners: ((vehicles: BusVehicle[]) => void)[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initSimulatedVehicles();
    this.startSimulation();
  }

  private initSimulatedVehicles() {
    let idCounter = 1;

    CURITIBA_LINES.forEach((line) => {
      // Cria 2 a 3 veículos por linha em diferentes pontos do trajeto
      const numBuses = line.codigo === '203' || line.codigo === '500' ? 3 : 2;

      for (let i = 0; i < numBuses; i++) {
        const isIda = i % 2 === 0;
        const trajeto = isIda ? line.trajetoIda : line.trajetoVolta;
        const segmentIdx = Math.floor((trajeto.length - 1) * (i / numBuses));
        const startPt = trajeto[segmentIdx];
        const nextPt = trajeto[Math.min(segmentIdx + 1, trajeto.length - 1)];

        const prefixoLetter = line.categoria === 'expresso' ? 'BL' : line.categoria === 'ligeirinho' ? 'GL' : 'BA';
        const prefixo = `${prefixoLetter}${100 + idCounter}`;

        const vehicle: BusVehicle = {
          id: `bus-${idCounter}`,
          prefixo,
          codLinha: line.codigo,
          nomeLinha: line.nome,
          categoria: line.categoria,
          corHex: line.corHex,
          latitude: startPt.latitude,
          longitude: startPt.longitude,
          bearing: getBearing(startPt, nextPt),
          velocidadeKmH: Math.floor(25 + Math.random() * 20),
          sentido: isIda ? 'ida' : 'volta',
          arCondicionado: true,
          acessivelPCD: true,
          lotacao: i === 0 ? 'media' : i === 1 ? 'alta' : 'baixa',
          ultimaAtualizacao: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };

        this.vehicles.push({
          vehicle,
          lineId: line.id,
          segmentIndex: segmentIdx,
          segmentProgress: 0.1 * i,
          direction: isIda ? 'ida' : 'volta',
        });

        idCounter++;
      }
    });
  }

  private startSimulation() {
    if (this.timer) return;

    this.timer = setInterval(() => {
      this.tickSimulation();
    }, TICK_INTERVAL_MS);
  }

  private tickSimulation() {
    this.vehicles = this.vehicles.map((item) => {
      const line = CURITIBA_LINES.find((l) => l.id === item.lineId);
      if (!line) return item;

      const trajeto = item.direction === 'ida' ? line.trajetoIda : line.trajetoVolta;

      // Passo proporcional à velocidade do veículo e ao intervalo do tick
      // (distance = speed * deltaTime), não um incremento fixo de progresso.
      const segStart = trajeto[item.segmentIndex];
      const segEnd = trajeto[Math.min(item.segmentIndex + 1, trajeto.length - 1)];
      const segmentDistanceMeters = getDistanceInMeters(segStart, segEnd);
      const stepDistanceMeters = calculateStepDistanceMeters(item.vehicle.velocidadeKmH, TICK_INTERVAL_MS);
      const progressStep = segmentDistanceMeters > 0 ? stepDistanceMeters / segmentDistanceMeters : 1;

      let newProgress = item.segmentProgress + progressStep;
      let newSegment = item.segmentIndex;
      let newDirection = item.direction;

      if (newProgress >= 1) {
        newProgress = 0;
        newSegment++;
        if (newSegment >= trajeto.length - 1) {
          newSegment = 0;
          newDirection = item.direction === 'ida' ? 'volta' : 'ida';
        }
      }

      const activeTrajeto = newDirection === 'ida' ? line.trajetoIda : line.trajetoVolta;
      const startPt = activeTrajeto[newSegment];
      const endPt = activeTrajeto[Math.min(newSegment + 1, activeTrajeto.length - 1)];

      const currentPos = interpolateLatLng(startPt, endPt, newProgress);
      const bearing = getBearing(startPt, endPt);

      const updatedVehicle: BusVehicle = {
        ...item.vehicle,
        latitude: currentPos.latitude,
        longitude: currentPos.longitude,
        bearing: bearing || item.vehicle.bearing,
        sentido: newDirection,
        ultimaAtualizacao: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      return {
        ...item,
        vehicle: updatedVehicle,
        segmentIndex: newSegment,
        segmentProgress: newProgress,
        direction: newDirection,
      };
    });

    const activeList = this.getVehicles();
    this.listeners.forEach((cb) => cb(activeList));
  }

  public getVehicles(): BusVehicle[] {
    return this.vehicles.map((v) => v.vehicle);
  }

  public getLines(): BusLine[] {
    return CURITIBA_LINES;
  }

  public getLineByCode(codigo: string): BusLine | undefined {
    return CURITIBA_LINES.find((l) => l.codigo === codigo);
  }

  public getStops(): BusStop[] {
    return CURITIBA_STOPS;
  }

  public getStopById(id: string): BusStop | undefined {
    return CURITIBA_STOPS.find((s) => s.id === id);
  }

  /**
   * Calcula estimativa de chegada (ETA) dos ônibus em uma determinada parada
   */
  public getArrivalsForStop(stopId: string): ArrivalEstimate[] {
    const stop = this.getStopById(stopId);
    if (!stop) return [];

    const stopCoord: LatLng = { latitude: stop.latitude, longitude: stop.longitude };
    const estimates: ArrivalEstimate[] = [];

    stop.linhas.forEach((codLinha) => {
      const line = this.getLineByCode(codLinha);
      if (!line) return;

      // Encontra os ônibus ativos dessa linha
      const busesOnLine = this.vehicles
        .map((v) => v.vehicle)
        .filter((b) => b.codLinha === codLinha);

      busesOnLine.forEach((bus) => {
        const busCoord: LatLng = { latitude: bus.latitude, longitude: bus.longitude };
        const dist = getDistanceInMeters(busCoord, stopCoord);

        // Se o ônibus estiver dentro de 8km
        if (dist <= 8000) {
          // Velocidade média urbana com paradas em canaletas/trânsito ~22 km/h = ~366 m/min
          const minutos = Math.max(1, Math.round(dist / 360));

          estimates.push({
            codLinha: line.codigo,
            nomeLinha: line.nome,
            categoria: line.categoria,
            corHex: line.corHex,
            minutosAteChegada: minutos,
            distanciaMetros: dist,
            veiculoPrefixo: bus.prefixo,
            acessivelPCD: bus.acessivelPCD,
            lotacao: bus.lotacao,
          });
        }
      });
    });

    return estimates.sort((a, b) => a.minutosAteChegada - b.minutosAteChegada);
  }

  public subscribeVehicles(cb: (vehicles: BusVehicle[]) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }
}

// ponytail: só o mock existe hoje; quando a URBS_CONFIG ganhar credenciais reais,
// troca o retorno abaixo por `new UrbsTransitProvider(URBS_CONFIG)` sem tocar nos consumidores.
function createTransitProvider(): TransitProvider {
  return new MockTransitProvider();
}

export const transitService: TransitProvider = createTransitProvider();

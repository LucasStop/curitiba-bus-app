import { CURITIBA_LINES, CURITIBA_STOPS, LINES_BY_CODE, STOPS_BY_ID } from '@/data/curitibaDataset';
import {
  ConnectionStatus,
  INITIAL_CONNECTION_STATUS,
  NetworkError,
  computeBackoffDelay,
  nextConnectionStatus,
} from '@/lib/resilience';
import { ArrivalEstimate, BusCategory, BusLine, BusStop, BusVehicle, LatLng } from '@/types/transit';
import {
  calculateStepDistanceMeters,
  getBearing,
  getDistanceInMeters,
  interpolateLatLng,
  isBusApproachingStop,
} from '@/utils/geo';
import { AppState, AppStateStatus } from 'react-native';

const SIMULATED_CATEGORIES: BusCategory[] = ['expresso', 'ligeirao', 'ligeirinho', 'interbairros', 'troncal'];

const TICK_INTERVAL_MS = 3000;

interface VehicleSimState {
  vehicle: BusVehicle;
  lineId: string;
  segmentIndex: number;
  segmentProgress: number; // 0 to 1
  direction: 'ida' | 'volta';
}

// Teto do backoff: mesmo numa falha em loop, nunca espera mais que isso pra tentar de novo.
const MAX_BACKOFF_MS = 60000;

// Distância máxima (m) para um ônibus aparecer nas previsões de chegada de uma parada
export const MAX_ETA_DISTANCE_METERS = 8000;

/**
 * Converte distância (m) até a parada em estimativa de minutos até a chegada.
 * Velocidade média urbana com paradas em canaletas/trânsito ~22 km/h = ~360 m/min.
 */
export function calculateEtaMinutes(distanceMeters: number): number {
  return Math.max(1, Math.round(distanceMeters / 360));
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
  getConnectionStatus(): ConnectionStatus;
  subscribeConnectionStatus(cb: (status: ConnectionStatus) => void): () => void;
}

class MockTransitProvider implements TransitProvider {
  private vehicles: VehicleSimState[] = [];
  private listeners: ((vehicles: BusVehicle[]) => void)[] = [];
  private statusListeners: ((status: ConnectionStatus) => void)[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private connectionStatus: ConnectionStatus = INITIAL_CONNECTION_STATUS;
  private appState: AppStateStatus = AppState.currentState;
  // Único carimbo de tempo por tick: usado tanto em ultimaAtualizacaoTs (veículos) quanto em
  // geradoEmTs (chegadas), pra nunca derivar a cada leitura — sempre o momento do último tick bom.
  private lastTickTs: number = Date.now();
  // Só pra QA/teste: número de próximos ticks que devem falhar de propósito. O provedor mock
  // nunca falha sozinho, então é assim que se exercita e testa o caminho de erro/backoff.
  private pendingFailures = 0;
  private pendingFailureFactory: (() => Error) | null = null;

  constructor() {
    this.initSimulatedVehicles();
    // A simulação só roda enquanto alguém está de fato ouvindo (mapa montado) e o app
    // está em primeiro plano — evita side effect no import do módulo e vazamento de timer.
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextState: AppStateStatus) => {
    this.appState = nextState;
    if (nextState === 'active') {
      this.startSimulation();
    } else {
      this.stopSimulation();
    }
  };

  private initSimulatedVehicles() {
    let idCounter = 1;

    // ponytail: só o eixo estrutural, 1 veículo por sentido (~130 no total). Simular as 314 linhas
    // pesa no tick e no mapa; some quando a posição real da URBS substituir a simulação.
    CURITIBA_LINES.filter((line) => SIMULATED_CATEGORIES.includes(line.categoria)).forEach((line) => {
      const numBuses = line.paradasVolta.length ? 2 : 1;

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
          ultimaAtualizacaoTs: this.lastTickTs,
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

  private isAppActive(): boolean {
    return typeof this.appState === 'string' ? this.appState === 'active' : true;
  }

  private startSimulation() {
    if (this.timer) return;
    if (this.listeners.length === 0) return;
    if (!this.isAppActive()) return;
    this.scheduleTick(TICK_INTERVAL_MS);
  }

  private scheduleTick(delay: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.listeners.length === 0 || !this.isAppActive()) return;
    this.timer = setTimeout(() => this.runTick(), delay);
  }

  /**
   * Roda uma atualização e trata falha: mantém o último dado bom (não mexe em `this.vehicles`),
   * marca o status de conexão e agenda a próxima tentativa com backoff em vez do intervalo
   * normal — é a guarda de rate-limit do cliente pra nunca martelar a fonte numa falha em loop.
   */
  private runTick() {
    try {
      if (this.pendingFailures > 0) {
        this.pendingFailures--;
        throw (this.pendingFailureFactory ?? (() => new NetworkError()))();
      }

      const now = Date.now();
      this.lastTickTs = now;
      this.tickSimulation(now);
      this.connectionStatus = nextConnectionStatus(this.connectionStatus, { ok: true }, now);
      this.scheduleTick(TICK_INTERVAL_MS);
    } catch (error) {
      this.connectionStatus = nextConnectionStatus(this.connectionStatus, { ok: false, error }, Date.now());
      const delay = computeBackoffDelay(TICK_INTERVAL_MS, MAX_BACKOFF_MS, this.connectionStatus.consecutiveFailures);
      this.scheduleTick(delay);
    }

    this.notify();
  }

  private notify() {
    const activeList = this.getVehicles();
    this.listeners.forEach((cb) => cb(activeList));
    this.statusListeners.forEach((cb) => cb(this.connectionStatus));
  }

  public stopSimulation() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private tickSimulation(now: number) {
    this.vehicles = this.vehicles.map((item) => {
      const line = LINES_BY_CODE.get(item.vehicle.codLinha);
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
        ultimaAtualizacaoTs: now,
      };

      return {
        ...item,
        vehicle: updatedVehicle,
        segmentIndex: newSegment,
        segmentProgress: newProgress,
        direction: newDirection,
      };
    });
  }

  public getVehicles(): BusVehicle[] {
    return this.vehicles.map((v) => v.vehicle);
  }

  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public subscribeConnectionStatus(cb: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.push(cb);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== cb);
    };
  }

  /**
   * Só pra QA/teste: força as próximas `count` atualizações a falhar (por padrão, com
   * `NetworkError`, o erro de "sem conexão"). O provedor mock nunca falha sozinho, então é
   * assim que se exercita o caminho de erro/backoff — a chamada real da URBS lançará
   * `NetworkError` de verdade no lugar disso.
   */
  public simulateFailures(count: number, makeError?: () => Error): void {
    this.pendingFailures = count;
    this.pendingFailureFactory = makeError ?? null;
    if (!this.timer) {
      this.timer = setTimeout(() => this.runTick(), TICK_INTERVAL_MS);
    }
  }

  public getLines(): BusLine[] {
    return CURITIBA_LINES;
  }

  public getLineByCode(codigo: string): BusLine | undefined {
    return LINES_BY_CODE.get(codigo);
  }

  public getStops(): BusStop[] {
    return CURITIBA_STOPS;
  }

  public getStopById(id: string): BusStop | undefined {
    return STOPS_BY_ID.get(id);
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
        if (!isBusApproachingStop(line, bus, stop)) return;

        const busCoord: LatLng = { latitude: bus.latitude, longitude: bus.longitude };
        const dist = getDistanceInMeters(busCoord, stopCoord);

        // Se o ônibus estiver dentro de 8km
        if (dist <= MAX_ETA_DISTANCE_METERS) {
          const minutos = calculateEtaMinutes(dist);

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
            isRealtime: line.temTempoReal,
            geradoEmTs: this.lastTickTs,
            previstoParaTs: this.lastTickTs + minutos * 60000,
          });
        }
      });
    });

    return estimates.sort((a, b) => a.minutosAteChegada - b.minutosAteChegada);
  }

  public subscribeVehicles(cb: (vehicles: BusVehicle[]) => void): () => void {
    this.listeners.push(cb);
    this.startSimulation();
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
      if (this.listeners.length === 0) {
        this.stopSimulation();
      }
    };
  }
}

// ponytail: só o mock existe hoje; quando a URBS_CONFIG ganhar credenciais reais,
// troca o retorno abaixo por `new UrbsTransitProvider(URBS_CONFIG)` sem tocar nos consumidores.
function createTransitProvider(): TransitProvider {
  return new MockTransitProvider();
}

export const transitService: TransitProvider = createTransitProvider();

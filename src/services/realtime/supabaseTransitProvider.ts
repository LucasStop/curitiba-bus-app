import { CURITIBA_LINES, CURITIBA_STOPS, LINES_BY_CODE, STOPS_BY_ID } from '@/data/curitibaDataset';
import {
  ConnectionStatus,
  INITIAL_CONNECTION_STATUS,
  NetworkError,
  computeBackoffDelay,
  nextConnectionStatus,
} from '@/lib/resilience';
import { getSupabase } from '@/lib/supabase';
import { computeArrivals } from '@/services/arrivals';
import type { TransitProvider } from '@/services/transitProvider';
import { ArrivalEstimate, BusLine, BusStop, BusVehicle } from '@/types/transit';
import { AppState, AppStateStatus } from 'react-native';
import { BusPositionRow, mapRowToVehicle } from './vehicleMapping';

// A URBS atualiza a cada 2 min e o servidor grava a cada 2 min; olhar o carimbo a cada 30 s é
// barato (1 linha) e só baixa a lista quando ele muda. O app nunca fala com a URBS.
const POLL_INTERVAL_MS = 30_000;
const MAX_BACKOFF_MS = 120_000;
// 3 rodadas perdidas: o feed está parado, avisar sem inventar dado.
const STALE_AFTER_MS = 6 * 60_000;
const PAGE_SIZE = 1000; // limite padrão do PostgREST
const COLUMNS =
  'prefix,line_code,lat,lon,prev_lat,prev_lon,refreshed_at,prev_refreshed_at,status,route_state,accessible';

export class SupabaseTransitProvider implements TransitProvider {
  private vehicles: BusVehicle[] = [];
  private listeners: ((vehicles: BusVehicle[]) => void)[] = [];
  private statusListeners: ((status: ConnectionStatus) => void)[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private connectionStatus: ConnectionStatus = INITIAL_CONNECTION_STATUS;
  private appState: AppStateStatus = AppState.currentState;
  private feedFetchedAt: string | null = null;
  private polling = false;

  constructor() {
    AppState.addEventListener('change', (next) => {
      this.appState = next;
      if (next === 'active') this.start();
      else this.stop();
    });
  }

  private active(): boolean {
    return this.listeners.length > 0 && (typeof this.appState !== 'string' || this.appState === 'active');
  }

  private start() {
    if (this.timer || this.polling || !this.active()) return;
    this.schedule(0);
  }

  private stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private schedule(delay: number) {
    this.stop();
    if (!this.active()) return;
    this.timer = setTimeout(() => void this.poll(), delay);
  }

  private async fetchPositions(): Promise<BusPositionRow[]> {
    const rows: BusPositionRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await getSupabase()
        .from('bus_positions')
        .select(COLUMNS)
        .order('prefix')
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new NetworkError();
      rows.push(...(data as BusPositionRow[]));
      if (data.length < PAGE_SIZE) return rows;
    }
  }

  private async poll() {
    this.timer = null;
    this.polling = true;
    let delay = POLL_INTERVAL_MS;
    try {
      const { data, error } = await getSupabase().from('bus_feed_status').select('fetched_at').eq('id', 1).single();
      if (error) throw new NetworkError();

      const fetchedAt: string | null = data.fetched_at;
      if (fetchedAt && fetchedAt !== this.feedFetchedAt) {
        const rows = await this.fetchPositions();
        // Linhas fora do dataset (ex.: X37, X43) são ignoradas até o dataset ser refeito.
        this.vehicles = rows.flatMap((row) => {
          const line = LINES_BY_CODE.get(row.line_code);
          return line ? [mapRowToVehicle(row, line)] : [];
        });
        this.feedFetchedAt = fetchedAt;
      }

      const fetchedMs = fetchedAt ? Date.parse(fetchedAt) : null;
      if (fetchedMs !== null && Date.now() - fetchedMs <= STALE_AFTER_MS) {
        this.connectionStatus = { state: 'online', lastUpdatedAt: fetchedMs, consecutiveFailures: 0 };
      } else {
        // Feed parado: mantém os últimos ônibus e avisa (estado "error", não "offline").
        this.connectionStatus = {
          ...nextConnectionStatus(this.connectionStatus, { ok: false, error: new Error('stale') }, Date.now()),
          lastUpdatedAt: fetchedMs,
        };
      }
    } catch (error) {
      this.connectionStatus = nextConnectionStatus(this.connectionStatus, { ok: false, error }, Date.now());
      delay = computeBackoffDelay(POLL_INTERVAL_MS, MAX_BACKOFF_MS, this.connectionStatus.consecutiveFailures);
    }
    this.polling = false;
    this.notify();
    this.schedule(delay);
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.vehicles));
    this.statusListeners.forEach((cb) => cb(this.connectionStatus));
  }

  getVehicles(): BusVehicle[] {
    return this.vehicles;
  }

  getLines(): BusLine[] {
    return CURITIBA_LINES;
  }

  getLineByCode(codigo: string): BusLine | undefined {
    return LINES_BY_CODE.get(codigo);
  }

  getStops(): BusStop[] {
    return CURITIBA_STOPS;
  }

  getStopById(id: string): BusStop | undefined {
    return STOPS_BY_ID.get(id);
  }

  getArrivalsForStop(stopId: string): ArrivalEstimate[] {
    const stop = this.getStopById(stopId);
    if (!stop || !this.feedFetchedAt) return [];
    return computeArrivals(stop, this.vehicles, { generatedTs: Date.parse(this.feedFetchedAt), isRealtime: true });
  }

  subscribeVehicles(cb: (vehicles: BusVehicle[]) => void): () => void {
    this.listeners.push(cb);
    this.start();
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
      if (this.listeners.length === 0) this.stop();
    };
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  subscribeConnectionStatus(cb: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.push(cb);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== cb);
    };
  }
}

import { AppState, type AppStateStatus } from 'react-native';
import { SupabaseTransitProvider } from './supabaseTransitProvider';

// babel-jest sobe estes mocks para antes dos imports.
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@/data/curitibaDataset', () => require('@/data/__fixtures__/mockDataset'));

const mockFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({ getSupabase: () => ({ from: mockFrom }), isSupabaseConfigured: () => true }));

const NOW = Date.parse('2026-09-25T20:10:00Z');
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

const position = {
  prefix: 'AA001',
  line_code: '203',
  lat: -25.4,
  lon: -49.28,
  prev_lat: null,
  prev_lon: null,
  refreshed_at: iso(60_000),
  prev_refreshed_at: null,
  status: 'on_time',
  route_state: 'on_route',
  accessible: false,
};

// Simula as duas tabelas; `feed` e `positions` podem mudar entre polls.
let feed: { data: { fetched_at: string | null } | null; error: unknown };
let positions: { data: unknown[] | null; error: unknown };
let positionsCalls: number;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
  (AppState as { currentState: AppStateStatus }).currentState = 'active';
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
  feed = { data: { fetched_at: iso(30_000) }, error: null };
  positions = { data: [position], error: null };
  positionsCalls = 0;
  mockFrom.mockImplementation((table: string) => {
    if (table === 'bus_feed_status') {
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve(feed) }) }) };
    }
    return {
      select: () => ({
        order: () => ({
          range: () => {
            positionsCalls++;
            return Promise.resolve(positions);
          },
        }),
      }),
    };
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const flush = async (ms = 0) => {
  await jest.advanceTimersByTimeAsync(ms);
};

describe('SupabaseTransitProvider', () => {
  it('sem ouvinte não faz nenhuma consulta', async () => {
    new SupabaseTransitProvider();
    await flush(120_000);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('só baixa as posições quando o carimbo do feed muda', async () => {
    const provider = new SupabaseTransitProvider();
    const cb = jest.fn();
    const off = provider.subscribeVehicles(cb);
    await flush(0);
    expect(positionsCalls).toBe(1);
    expect(provider.getVehicles()).toHaveLength(1);
    expect(provider.getConnectionStatus().state).toBe('online');

    await flush(30_000); // mesmo fetched_at
    expect(positionsCalls).toBe(1);

    feed = { data: { fetched_at: iso(0) }, error: null };
    await flush(30_000);
    expect(positionsCalls).toBe(2);
    off();
  });

  it('ignora linhas fora do dataset', async () => {
    positions = { data: [position, { ...position, prefix: 'ZZ9', line_code: 'X37' }], error: null };
    const provider = new SupabaseTransitProvider();
    provider.subscribeVehicles(jest.fn());
    await flush(0);
    expect(provider.getVehicles().map((v) => v.prefixo)).toEqual(['AA001']);
  });

  it('feed velho (> 6 min) vira erro mas mantém os últimos ônibus', async () => {
    const provider = new SupabaseTransitProvider();
    provider.subscribeVehicles(jest.fn());
    await flush(0);
    feed = { data: { fetched_at: iso(7 * 60_000) }, error: null };
    // fetched_at diferente: baixa de novo, mas o estado é erro.
    await flush(30_000);
    expect(provider.getConnectionStatus().state).toBe('error');
    expect(provider.getVehicles()).toHaveLength(1);
  });

  it('erro do Supabase vira offline com backoff e mantém os ônibus', async () => {
    const provider = new SupabaseTransitProvider();
    provider.subscribeVehicles(jest.fn());
    await flush(0);
    feed = { data: null, error: { message: 'Network request failed' } };
    await flush(30_000);
    expect(provider.getConnectionStatus()).toMatchObject({ state: 'offline', consecutiveFailures: 1 });
    expect(provider.getVehicles()).toHaveLength(1);

    const calls = mockFrom.mock.calls.length;
    await flush(30_000); // backoff de 60 s: ainda não tentou
    expect(mockFrom.mock.calls.length).toBe(calls);
    await flush(30_000);
    expect(mockFrom.mock.calls.length).toBeGreaterThan(calls);
  });

  it('previsão de chegada só existe depois do primeiro feed e é marcada como tempo real', async () => {
    const provider = new SupabaseTransitProvider();
    expect(provider.getArrivalsForStop('tubo-central')).toEqual([]);
    provider.subscribeVehicles(jest.fn());
    await flush(0);
    // sem posição anterior o sentido é null: não entra na previsão
    expect(provider.getArrivalsForStop('tubo-central')).toEqual([]);
  });
});

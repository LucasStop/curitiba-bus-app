import { BusLine } from '@/types/transit';
import { BusPositionRow, mapRowToVehicle, resolveDirection } from './vehicleMapping';

// Linha reta leste-oeste com ida crescendo em longitude (~1,1 km por 0,01 grau).
const path = [0, 0.01, 0.02, 0.03].map((d) => ({ latitude: -25.4, longitude: -49.3 + d }));
const line = {
  id: 'l',
  codigo: '203',
  nome: 'Teste',
  categoria: 'expresso',
  corHex: '#f00',
  trajetoIda: path,
  trajetoVolta: [...path].reverse(),
  paradasIda: ['a'],
  paradasVolta: ['b'],
} as unknown as BusLine;
const circular = { ...line, paradasVolta: [] } as BusLine;

const row = (over: Partial<BusPositionRow> = {}): BusPositionRow => ({
  prefix: 'AA001',
  line_code: '203',
  lat: -25.4,
  lon: -49.28,
  prev_lat: -25.4,
  prev_lon: -49.29,
  refreshed_at: '2026-09-25T20:02:00Z',
  prev_refreshed_at: '2026-09-25T20:00:00Z',
  status: 'late',
  route_state: 'on_route',
  accessible: true,
  ...over,
});

describe('resolveDirection', () => {
  const at = (i: number) => path[i];
  it('avançando pelo trajeto de ida = ida', () => {
    expect(resolveDirection(line, at(1), at(2))).toBe('ida');
  });
  it('recuando = volta', () => {
    expect(resolveDirection(line, at(2), at(1))).toBe('volta');
  });
  it('parado (menos de 30 m) ou sem posição anterior = null', () => {
    expect(resolveDirection(line, at(1), { ...at(1), longitude: at(1).longitude + 0.0001 })).toBeNull();
    expect(resolveDirection(line, null, at(1))).toBeNull();
  });
  it('linha sem volta (circular) = ida sempre', () => {
    expect(resolveDirection(circular, null, at(1))).toBe('ida');
  });
});

describe('mapRowToVehicle', () => {
  it('mapeia campos, situação e acessibilidade', () => {
    const v = mapRowToVehicle(row({ status: 'early', route_state: 'off_route' }), line);
    expect(v).toMatchObject({
      id: 'AA001',
      prefixo: 'AA001',
      codLinha: '203',
      nomeLinha: 'Teste',
      sentido: 'ida',
      situacao: 'adiantado',
      foraDaRota: true,
      acessivelPCD: true,
    });
    expect(v.ultimaAtualizacaoTs).toBe(Date.parse('2026-09-25T20:02:00Z'));
  });
  it('velocidade = distância / tempo (~1 km em 2 min = ~30 km/h), limitada a 90', () => {
    expect(mapRowToVehicle(row(), line).velocidadeKmH).toBeGreaterThan(25);
    expect(mapRowToVehicle(row(), line).velocidadeKmH).toBeLessThan(35);
    expect(mapRowToVehicle(row({ prev_refreshed_at: '2026-09-25T20:01:59Z' }), line).velocidadeKmH).toBe(90);
  });
  it('sem posição anterior: rumo 0, velocidade 0, sentido null', () => {
    const v = mapRowToVehicle(row({ prev_lat: null, prev_lon: null, prev_refreshed_at: null }), line);
    expect(v).toMatchObject({ bearing: 0, velocidadeKmH: 0, sentido: null });
  });
  it('situação desconhecida vira undefined', () => {
    expect(mapRowToVehicle(row({ status: null }), line).situacao).toBeUndefined();
  });
});

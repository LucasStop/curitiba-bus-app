import { RIT_CATEGORIES, URBS_CONFIG } from '@/constants/rit';
import { BusCategory, BusLine, BusStop, LatLng, TransitAlert } from '@/types/transit';

import raw from './geocuritiba.json';

// Rede estática real (paradas, linhas, traçados) gerada por `yarn data:geocuritiba` a partir do
// GeoCuritiba (IPPUC/URBS). Posição de veículo vem do SupabaseTransitProvider (dado real); horários
// seguem ausentes — importação do GTFS da URBS pendente (Fase 3, em andamento).

interface RawLine {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  terminalOrigem: string;
  terminalDestino: string;
  trajeto: number[][];
  paradasIda: string[];
  paradasVolta: string[];
}

// temTempoReal só importa pra simulação (MockTransitProvider): com Supabase configurado, toda
// chegada é marcada como tempo real (ver isRealtime em computeArrivals), independente da categoria.
const REALTIME_CATEGORIES: BusCategory[] = ['expresso', 'ligeirao'];

const toLatLng = ([latitude, longitude]: number[]): LatLng => ({ latitude, longitude });

export const CURITIBA_STOPS: BusStop[] = raw.stops as BusStop[];

export const CURITIBA_LINES: BusLine[] = (raw.lines as RawLine[]).map((l) => {
  const categoria = l.categoria as BusCategory;
  const trajetoIda = l.trajeto.map(toLatLng);
  return {
    id: l.id,
    codigo: l.codigo,
    nome: l.nome,
    categoria,
    corHex: RIT_CATEGORIES[categoria].corHex,
    terminalOrigem: l.terminalOrigem,
    terminalDestino: l.terminalDestino,
    tarifa: URBS_CONFIG.tarifaPadrao,
    temTempoReal: REALTIME_CATEGORIES.includes(categoria),
    trajetoIda,
    trajetoVolta: [...trajetoIda].reverse(),
    paradasIda: l.paradasIda,
    paradasVolta: l.paradasVolta,
  };
});

export const STOPS_BY_ID = new Map(CURITIBA_STOPS.map((s) => [s.id, s]));
export const LINES_BY_CODE = new Map(CURITIBA_LINES.map((l) => [l.codigo, l]));

// Mural vazio até integrar os avisos oficiais (getMensagemPainelLinhas da URBS). Avisos
// inventados aqui apareciam como se fossem da URBS.
export const TRANSIT_ALERTS: TransitAlert[] = [];

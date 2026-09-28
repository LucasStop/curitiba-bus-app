import { RIT_CATEGORIES, URBS_CONFIG } from '@/constants/rit';
import { BusCategory, BusLine, BusStop, LatLng, TransitAlert } from '@/types/transit';

import raw from './network.json';

// Rede estática real gerada por `yarn data:gtfs`: GTFS público da URBS (paradas, traçados dos dois
// sentidos e horários de dia útil) com o GeoCuritiba (IPPUC/URBS) para nomes de parada e para as
// linhas que o GTFS não cobre. Posição de veículo vem do SupabaseTransitProvider.

interface RawLine {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  terminalOrigem: string;
  terminalDestino: string;
  trajetoIda: number[][];
  // Só nas linhas do GTFS; nas do GeoCuritiba a volta é a ida invertida.
  trajetoVolta?: number[][];
  paradasIda: string[];
  paradasVolta: string[];
  horarioFuncionamento?: string;
  frequenciaMinutosPico?: number;
}

// temTempoReal só importa pra simulação (MockTransitProvider): com Supabase configurado, toda
// chegada é marcada como tempo real (ver isRealtime em computeArrivals), independente da categoria.
const REALTIME_CATEGORIES: BusCategory[] = ['expresso', 'ligeirao'];

const toLatLng = ([latitude, longitude]: number[]): LatLng => ({ latitude, longitude });

export const CURITIBA_STOPS: BusStop[] = raw.stops as BusStop[];

export const CURITIBA_LINES: BusLine[] = (raw.lines as RawLine[]).map((l) => {
  const categoria = l.categoria as BusCategory;
  const trajetoIda = l.trajetoIda.map(toLatLng);
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
    trajetoVolta: l.trajetoVolta?.map(toLatLng) ?? [...trajetoIda].reverse(),
    paradasIda: l.paradasIda,
    paradasVolta: l.paradasVolta,
    horarioFuncionamento: l.horarioFuncionamento,
    frequenciaMinutosPico: l.frequenciaMinutosPico,
  };
});

export const STOPS_BY_ID = new Map(CURITIBA_STOPS.map((s) => [s.id, s]));
export const LINES_BY_CODE = new Map(CURITIBA_LINES.map((l) => [l.codigo, l]));

// Mural vazio até integrar os avisos oficiais (getMensagemPainelLinhas da URBS). Avisos
// inventados aqui apareciam como se fossem da URBS.
export const TRANSIT_ALERTS: TransitAlert[] = [];

import { RIT_CATEGORIES, URBS_CONFIG } from '@/constants/rit';
import { BusCategory, BusLine, BusStop, LatLng, TransitAlert } from '@/types/transit';

import raw from './geocuritiba.json';

// Rede estática real (paradas, linhas, traçados) gerada por `yarn data:geocuritiba` a partir do
// GeoCuritiba (IPPUC/URBS). Posição de veículo e horários seguem simulados até o acesso à URBS.

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

// AVL embarcado chega primeiro no eixo estrutural (canaleta): Expresso e Ligeirão.
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

export const TRANSIT_ALERTS: TransitAlert[] = [
  {
    id: 'alert-1',
    titulo: 'Obras na Avenida Marechal Floriano Peixoto',
    descricao: 'Desvio temporário para as linhas 500 Ligeirão Boqueirão entre as estações Hauer e Carmo devido a recapeamento asfáltico.',
    data: 'Hoje, 08:30',
    tipo: 'obra',
    linhasAfetadas: ['500'],
  },
  {
    id: 'alert-2',
    titulo: 'Linha 203 com frequência reforçada no pico',
    descricao: 'A URBS adicionou 4 veículos articulados extras no eixo Santa Cândida / Capão Raso entre 17h30 e 19h30.',
    data: 'Hoje, 11:00',
    tipo: 'informativo',
    linhasAfetadas: ['203'],
  },
  {
    id: 'alert-3',
    titulo: 'Novo tubo implantado na Linha Verde',
    descricao: 'Estação-tubo inaugurada atendendo à linha Interbairros II com acessibilidade plena e catracas biométricas.',
    data: 'Ontem',
    tipo: 'informativo',
    linhasAfetadas: ['020'],
  },
];

export type BusCategory =
  | 'expresso'
  | 'ligeirao'
  | 'ligeirinho'
  | 'interbairros'
  | 'alimentador'
  | 'troncal'
  | 'convencional'
  | 'madrugueiro'
  | 'turismo'
  | 'operacional';

export type BusSituation = 'no_horario' | 'atrasado' | 'adiantado' | 'nao_conformidade';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface BusVehicle {
  id: string;
  prefixo: string; // Ex: "BA001" (Articulado/Biarticulado), "HA123" (Híbrido)
  codLinha: string; // Ex: "203", "500", "020"
  nomeLinha: string;
  categoria: BusCategory;
  corHex: string;
  latitude: number;
  longitude: number;
  bearing: number; // Ângulo de rotação (0-360)
  velocidadeKmH: number;
  // null = não deu para inferir (ônibus parado ou sem posição anterior): fora das previsões de chegada.
  sentido: 'ida' | 'volta' | null;
  situacao?: BusSituation;
  foraDaRota?: boolean;
  proximaParadaId?: string;
  lotacao?: 'baixa' | 'media' | 'alta';
  arCondicionado: boolean;
  acessivelPCD: boolean;
  ultimaAtualizacaoTs: number;
}

export interface BusStop {
  id: string;
  nome: string;
  tipo: 'tubo' | 'comum' | 'terminal';
  latitude: number;
  longitude: number;
  bairro?: string; // GeoCuritiba não informa para ~8% das paradas
  linhas: string[]; // Lista de códigos das linhas que passam nesta parada (ex: ["203", "204"])
}

export interface BusLine {
  id: string;
  codigo: string;
  nome: string;
  categoria: BusCategory;
  corHex: string;
  terminalOrigem: string;
  terminalDestino: string;
  tarifa: number;
  // Sem fonte pública até o acesso à URBS: ausente em vez de inventado.
  horarioFuncionamento?: string;
  frequenciaMinutosPico?: number;
  temTempoReal: boolean;
  trajetoIda: LatLng[];
  trajetoVolta: LatLng[];
  paradasIda: string[]; // IDs das paradas
  paradasVolta: string[];
}

export interface ArrivalEstimate {
  codLinha: string;
  nomeLinha: string;
  categoria: BusCategory;
  corHex: string;
  minutosAteChegada: number;
  distanciaMetros: number;
  veiculoPrefixo: string;
  acessivelPCD: boolean;
  lotacao?: 'baixa' | 'media' | 'alta';
  isRealtime: boolean;
  situacao?: BusSituation;
  geradoEmTs: number;
  previstoParaTs: number;
}

export interface TransitAlert {
  id: string;
  titulo: string;
  descricao: string;
  data: string;
  tipo: 'desvio' | 'obra' | 'informativo' | 'greve';
  linhasAfetadas: string[];
}

export interface TripLeg {
  tipo: 'walk' | 'bus';
  duracaoMinutos: number;
  instrucao: string;
  distanciaMetros?: number;
  linha?: {
    codigo: string;
    nome: string;
    corHex: string;
    categoria: BusCategory;
    embarqueParada: string;
    desembarqueParada: string;
    quantidadeParadas: number;
    // Sentido do trajeto usado nesta perna (ida = paradasIda, volta = paradasVolta).
    sentido?: 'ida' | 'volta';
  };
}

export interface TripPlanOption {
  id: string;
  duracaoTotalMinutos: number;
  caminhadaTotalMetros: number;
  custoTarifa: number;
  horarioPartida: string;
  horarioChegada: string;
  pernas: TripLeg[];
}

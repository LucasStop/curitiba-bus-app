export type BusCategory = 'expresso' | 'ligeirinho' | 'interbairros' | 'alimentador' | 'troncal';

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
  sentido: 'ida' | 'volta';
  proximaParadaId?: string;
  lotacao?: 'baixa' | 'media' | 'alta';
  arCondicionado: boolean;
  acessivelPCD: boolean;
  ultimaAtualizacao: string;
}

export interface BusStop {
  id: string;
  nome: string;
  tipo: 'tubo' | 'comum' | 'terminal';
  latitude: number;
  longitude: number;
  bairro: string;
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
  horarioFuncionamento: string;
  frequenciaMinutosPico: number;
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

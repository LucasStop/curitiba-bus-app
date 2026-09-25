import { BusLine, BusStop, TransitAlert } from '@/types/transit';

export const CURITIBA_STOPS: BusStop[] = [
  {
    id: 'terminal-santa-candida',
    nome: 'Terminal Santa Cândida',
    tipo: 'terminal',
    latitude: -25.378,
    longitude: -49.229,
    bairro: 'Santa Cândida',
    linhas: ['203', '020', '216'],
  },
  {
    id: 'terminal-cabral',
    nome: 'Terminal Cabral',
    tipo: 'terminal',
    latitude: -25.4055,
    longitude: -49.252,
    bairro: 'Cabral',
    linhas: ['203', '020', '216'],
  },
  {
    id: 'tubo-passeio-publico',
    nome: 'Estação Passeio Público',
    tipo: 'tubo',
    latitude: -25.4248,
    longitude: -49.268,
    bairro: 'Centro',
    linhas: ['203', '303'],
  },
  {
    id: 'tubo-central',
    nome: 'Estação Central / Praça Tiradentes',
    tipo: 'tubo',
    latitude: -25.43,
    longitude: -49.269,
    bairro: 'Centro',
    linhas: ['203', '303'],
  },
  {
    id: 'tubo-praca-rui-barbosa',
    nome: 'Praça Rui Barbosa',
    tipo: 'tubo',
    latitude: -25.4355,
    longitude: -49.2745,
    bairro: 'Centro',
    linhas: ['203', '303', '216'],
  },
  {
    id: 'tubo-carlos-gomes',
    nome: 'Praça Carlos Gomes',
    tipo: 'tubo',
    latitude: -25.433,
    longitude: -49.2708,
    bairro: 'Centro',
    linhas: ['500'],
  },
  {
    id: 'tubo-eufrasio-correia',
    nome: 'Estação Eufrásio Correia',
    tipo: 'tubo',
    latitude: -25.437,
    longitude: -49.268,
    bairro: 'Rebouças',
    linhas: ['500', '203'],
  },
  {
    id: 'tubo-bento-viana',
    nome: 'Estação Bento Viana',
    tipo: 'tubo',
    latitude: -25.445,
    longitude: -49.284,
    bairro: 'Batel',
    linhas: ['203'],
  },
  {
    id: 'terminal-portao',
    nome: 'Terminal Portão',
    tipo: 'terminal',
    latitude: -25.474,
    longitude: -49.294,
    bairro: 'Portão',
    linhas: ['203', '020', '216'],
  },
  {
    id: 'terminal-capao-raso',
    nome: 'Terminal Capão Raso',
    tipo: 'terminal',
    latitude: -25.498,
    longitude: -49.293,
    bairro: 'Capão Raso',
    linhas: ['203', '020'],
  },
  {
    id: 'terminal-hauer',
    nome: 'Terminal Hauer',
    tipo: 'terminal',
    latitude: -25.471,
    longitude: -49.252,
    bairro: 'Hauer',
    linhas: ['500', '020'],
  },
  {
    id: 'terminal-carmo',
    nome: 'Terminal Carmo',
    tipo: 'terminal',
    latitude: -25.488,
    longitude: -49.245,
    bairro: 'Boqueirão',
    linhas: ['500'],
  },
  {
    id: 'terminal-boqueirao',
    nome: 'Terminal Boqueirão',
    tipo: 'terminal',
    latitude: -25.502,
    longitude: -49.239,
    bairro: 'Boqueirão',
    linhas: ['500', '020'],
  },
  {
    id: 'terminal-campina-siqueira',
    nome: 'Terminal Campina do Siqueira',
    tipo: 'terminal',
    latitude: -25.438,
    longitude: -49.308,
    bairro: 'Campina do Siqueira',
    linhas: ['303', '020'],
  },
];

export const CURITIBA_LINES: BusLine[] = [
  {
    id: 'line-203',
    codigo: '203',
    nome: 'SANTA CÂNDIDA / CAPÃO RASO',
    categoria: 'expresso',
    corHex: '#B91C1C',
    terminalOrigem: 'Terminal Santa Cândida',
    terminalDestino: 'Terminal Capão Raso',
    tarifa: 6.0,
    horarioFuncionamento: '05:00 - 00:30',
    frequenciaMinutosPico: 3,
    // AVL embarcado chega primeiro no eixo estrutural (canaleta): Expresso e Ligeirão. Ligeirinho,
    // interbairros e alimentador rodam em pista comum e ficam sem previsão em tempo real por ora.
    temTempoReal: true,
    trajetoIda: [
      { latitude: -25.378, longitude: -49.229 }, // Santa Cândida
      { latitude: -25.39, longitude: -49.24 },
      { latitude: -25.4055, longitude: -49.252 }, // Cabral
      { latitude: -25.416, longitude: -49.261 },
      { latitude: -25.4248, longitude: -49.268 }, // Passeio Público
      { latitude: -25.43, longitude: -49.269 }, // Central
      { latitude: -25.4355, longitude: -49.2745 }, // Rui Barbosa
      { latitude: -25.445, longitude: -49.284 }, // Bento Viana
      { latitude: -25.46, longitude: -49.29 },
      { latitude: -25.474, longitude: -49.294 }, // Portão
      { latitude: -25.486, longitude: -49.2935 },
      { latitude: -25.498, longitude: -49.293 }, // Capão Raso
    ],
    trajetoVolta: [
      { latitude: -25.498, longitude: -49.293 },
      { latitude: -25.486, longitude: -49.2935 },
      { latitude: -25.474, longitude: -49.294 },
      { latitude: -25.46, longitude: -49.29 },
      { latitude: -25.445, longitude: -49.284 },
      { latitude: -25.4355, longitude: -49.2745 },
      { latitude: -25.43, longitude: -49.269 },
      { latitude: -25.4248, longitude: -49.268 },
      { latitude: -25.416, longitude: -49.261 },
      { latitude: -25.4055, longitude: -49.252 },
      { latitude: -25.39, longitude: -49.24 },
      { latitude: -25.378, longitude: -49.229 },
    ],
    paradasIda: [
      'terminal-santa-candida',
      'terminal-cabral',
      'tubo-passeio-publico',
      'tubo-central',
      'tubo-praca-rui-barbosa',
      'tubo-bento-viana',
      'terminal-portao',
      'terminal-capao-raso',
    ],
    paradasVolta: [
      'terminal-capao-raso',
      'terminal-portao',
      'tubo-bento-viana',
      'tubo-praca-rui-barbosa',
      'tubo-central',
      'tubo-passeio-publico',
      'terminal-cabral',
      'terminal-santa-candida',
    ],
  },
  {
    id: 'line-500',
    codigo: '500',
    nome: 'LIGEIRÃO BOQUEIRÃO',
    categoria: 'expresso',
    corHex: '#B91C1C',
    terminalOrigem: 'Praça Carlos Gomes',
    terminalDestino: 'Terminal Boqueirão',
    tarifa: 6.0,
    horarioFuncionamento: '05:30 - 23:50',
    frequenciaMinutosPico: 4,
    temTempoReal: true,
    trajetoIda: [
      { latitude: -25.433, longitude: -49.2708 }, // Carlos Gomes
      { latitude: -25.437, longitude: -49.268 }, // Eufrásio Correia
      { latitude: -25.449, longitude: -49.26 },
      { latitude: -25.46, longitude: -49.255 },
      { latitude: -25.471, longitude: -49.252 }, // Terminal Hauer
      { latitude: -25.488, longitude: -49.245 }, // Terminal Carmo
      { latitude: -25.502, longitude: -49.239 }, // Terminal Boqueirão
    ],
    trajetoVolta: [
      { latitude: -25.502, longitude: -49.239 },
      { latitude: -25.488, longitude: -49.245 },
      { latitude: -25.471, longitude: -49.252 },
      { latitude: -25.46, longitude: -49.255 },
      { latitude: -25.449, longitude: -49.26 },
      { latitude: -25.437, longitude: -49.268 },
      { latitude: -25.433, longitude: -49.2708 },
    ],
    paradasIda: [
      'tubo-carlos-gomes',
      'tubo-eufrasio-correia',
      'terminal-hauer',
      'terminal-carmo',
      'terminal-boqueirao',
    ],
    paradasVolta: [
      'terminal-boqueirao',
      'terminal-carmo',
      'terminal-hauer',
      'tubo-eufrasio-correia',
      'tubo-carlos-gomes',
    ],
  },
  {
    id: 'line-303',
    codigo: '303',
    nome: 'CENTENÁRIO / CAMPO COMPRIDO',
    categoria: 'ligeirinho',
    corHex: '#475569',
    terminalOrigem: 'Terminal Campo Comprido',
    terminalDestino: 'Terminal Centenário',
    tarifa: 6.0,
    horarioFuncionamento: '05:15 - 23:45',
    frequenciaMinutosPico: 5,
    temTempoReal: false,
    trajetoIda: [
      { latitude: -25.438, longitude: -49.308 }, // Campina do Siqueira
      { latitude: -25.436, longitude: -49.29 },
      { latitude: -25.4355, longitude: -49.2745 }, // Rui Barbosa
      { latitude: -25.43, longitude: -49.269 }, // Central
      { latitude: -25.4248, longitude: -49.268 }, // Passeio
    ],
    trajetoVolta: [
      { latitude: -25.4248, longitude: -49.268 },
      { latitude: -25.43, longitude: -49.269 },
      { latitude: -25.4355, longitude: -49.2745 },
      { latitude: -25.436, longitude: -49.29 },
      { latitude: -25.438, longitude: -49.308 },
    ],
    paradasIda: ['terminal-campina-siqueira', 'tubo-praca-rui-barbosa', 'tubo-central', 'tubo-passeio-publico'],
    paradasVolta: ['tubo-passeio-publico', 'tubo-central', 'tubo-praca-rui-barbosa', 'terminal-campina-siqueira'],
  },
  {
    id: 'line-020',
    codigo: '020',
    nome: 'INTERBAIRROS II (HORÁRIO)',
    categoria: 'interbairros',
    corHex: '#15803D',
    terminalOrigem: 'Terminal Cabral',
    terminalDestino: 'Terminal Cabral (Circular)',
    tarifa: 6.0,
    horarioFuncionamento: '05:00 - 00:00',
    frequenciaMinutosPico: 6,
    temTempoReal: false,
    trajetoIda: [
      { latitude: -25.4055, longitude: -49.252 }, // Cabral
      { latitude: -25.43, longitude: -49.23 }, // Tarumã
      { latitude: -25.471, longitude: -49.252 }, // Hauer
      { latitude: -25.474, longitude: -49.294 }, // Portão
      { latitude: -25.438, longitude: -49.308 }, // Campina do Siqueira
      { latitude: -25.412, longitude: -49.28 }, // Mercês
      { latitude: -25.4055, longitude: -49.252 }, // Cabral
    ],
    trajetoVolta: [
      { latitude: -25.4055, longitude: -49.252 },
      { latitude: -25.412, longitude: -49.28 },
      { latitude: -25.438, longitude: -49.308 },
      { latitude: -25.474, longitude: -49.294 },
      { latitude: -25.471, longitude: -49.252 },
      { latitude: -25.43, longitude: -49.23 },
      { latitude: -25.4055, longitude: -49.252 },
    ],
    paradasIda: [
      'terminal-cabral',
      'terminal-hauer',
      'terminal-portao',
      'terminal-campina-siqueira',
      'terminal-cabral',
    ],
    paradasVolta: [
      'terminal-cabral',
      'terminal-campina-siqueira',
      'terminal-portao',
      'terminal-hauer',
      'terminal-cabral',
    ],
  },
  {
    id: 'line-216',
    codigo: '216',
    nome: 'CABRAL / PORTÃO',
    categoria: 'alimentador',
    corHex: '#C2410C',
    terminalOrigem: 'Terminal Cabral',
    terminalDestino: 'Terminal Portão',
    tarifa: 6.0,
    horarioFuncionamento: '05:40 - 23:30',
    frequenciaMinutosPico: 8,
    temTempoReal: false,
    trajetoIda: [
      { latitude: -25.4055, longitude: -49.252 },
      { latitude: -25.42, longitude: -49.26 },
      { latitude: -25.4355, longitude: -49.2745 },
      { latitude: -25.455, longitude: -49.285 },
      { latitude: -25.474, longitude: -49.294 },
    ],
    trajetoVolta: [
      { latitude: -25.474, longitude: -49.294 },
      { latitude: -25.455, longitude: -49.285 },
      { latitude: -25.4355, longitude: -49.2745 },
      { latitude: -25.42, longitude: -49.26 },
      { latitude: -25.4055, longitude: -49.252 },
    ],
    paradasIda: ['terminal-cabral', 'tubo-praca-rui-barbosa', 'terminal-portao'],
    paradasVolta: ['terminal-portao', 'tubo-praca-rui-barbosa', 'terminal-cabral'],
  },
];

export const TRANSIT_ALERTS: TransitAlert[] = [
  {
    id: 'alert-1',
    titulo: 'Obras na Avenida Marechal Floriano Peixoto',
    descricao:
      'Desvio temporário para as linhas 500 Ligeirão Boqueirão entre as estações Hauer e Carmo devido a recapeamento asfáltico.',
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
    descricao:
      'Estação-tubo inaugurada atendendo à linha Interbairros II com acessibilidade plena e catracas biométricas.',
    data: 'Ontem',
    tipo: 'informativo',
    linhasAfetadas: ['020'],
  },
];

export const STOPS_BY_ID = new Map(CURITIBA_STOPS.map((s) => [s.id, s]));
export const LINES_BY_CODE = new Map(CURITIBA_LINES.map((l) => [l.codigo, l]));

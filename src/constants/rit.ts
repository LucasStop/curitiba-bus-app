import { BusCategory } from '@/types/transit';

export const CURITIBA_COORDINATES = {
  latitude: -25.4284,
  longitude: -49.2733,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

export const RIT_CATEGORIES: Record<
  BusCategory,
  {
    label: string;
    description: string;
    corHex: string;
    corHexDark: string;
    textColor: string;
    borderHex?: string;
  }
> = {
  expresso: {
    label: 'Expresso',
    description: 'Biarticulado em canaleta exclusiva',
    corHex: '#B91C1C', // Vermelho vibrante escurecido (WCAG AA 6.47:1)
    corHexDark: '#F87171',
    textColor: '#FFFFFF',
  },
  ligeirao: {
    label: 'Ligeirão',
    description: 'BRT de parada reduzida no eixo estrutural',
    corHex: '#1D4ED8', // Azul Ligeirão (WCAG AA 6.70:1)
    corHexDark: '#60A5FA',
    textColor: '#FFFFFF',
  },
  ligeirinho: {
    label: 'Ligeirinho',
    description: 'Linha direta entre tubos',
    corHex: '#475569', // Prata / Cinza RIT (WCAG AA 7.58:1)
    corHexDark: '#94A3B8',
    textColor: '#FFFFFF',
  },
  interbairros: {
    label: 'Interbairros',
    description: 'Conecta bairros sem ir ao centro',
    corHex: '#15803D', // Verde RIT (WCAG AA 5.02:1)
    corHexDark: '#4ADE80',
    textColor: '#FFFFFF',
  },
  alimentador: {
    label: 'Alimentador',
    description: 'Bairros até os terminais',
    corHex: '#C2410C', // Laranja RIT (WCAG AA 5.18:1)
    corHexDark: '#FB923C',
    textColor: '#FFFFFF',
  },
  troncal: {
    label: 'Troncal',
    description: 'Radiais do centro aos bairros e convencionais',
    corHex: '#FACC15', // Amarelo RIT
    corHexDark: '#FACC15',
    textColor: '#1C1917', // Stone 900 (WCAG AA 11.42:1 no claro, 12.23:1 no escuro)
    borderHex: '#A16207', // Contorno 1px para contraste contra fundo claro (1.46:1 sem contorno)
  },
  convencional: {
    label: 'Convencional',
    description: 'Linhas radiais do centro aos bairros',
    corHex: '#FACC15',
    corHexDark: '#FACC15',
    textColor: '#1C1917',
    borderHex: '#A16207',
  },
  madrugueiro: {
    label: 'Madrugueiro',
    description: 'Atende a madrugada',
    corHex: '#312E81', // Índigo (WCAG AA 11.42:1)
    corHexDark: '#A5B4FC',
    textColor: '#FFFFFF',
  },
  turismo: {
    label: 'Linha Turismo',
    description: 'Circuito pelos pontos turísticos',
    corHex: '#0F766E', // Verde-azulado (WCAG AA 5.47:1)
    corHexDark: '#2DD4BF',
    textColor: '#FFFFFF',
  },
  operacional: {
    label: 'Serviço operacional',
    description: 'Transporte dos operadores do sistema',
    corHex: '#57534E', // Stone 600 (WCAG AA 7.6:1)
    corHexDark: '#A8A29E',
    textColor: '#FFFFFF',
  },
};

export const URBS_CONFIG = {
  tarifaPadrao: 6.0,
  intervaloAtualizacaoMs: 5000,
};

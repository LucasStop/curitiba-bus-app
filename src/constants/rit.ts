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
    label: 'Convencional / Troncal',
    description: 'Radiais do centro aos bairros e convencionais',
    corHex: '#FACC15', // Amarelo RIT
    corHexDark: '#FACC15',
    textColor: '#1C1917', // Stone 900 (WCAG AA 11.42:1 no claro, 12.23:1 no escuro)
    borderHex: '#A16207', // Contorno 1px para contraste contra fundo claro (1.46:1 sem contorno)
  },
};

export const URBS_CONFIG = {
  tarifaPadrao: 6.0,
  intervaloAtualizacaoMs: 5000,
};

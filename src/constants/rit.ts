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
    corFundo: string;
    badgeTextColor: string;
  }
> = {
  expresso: {
    label: 'Expresso',
    description: 'Biarticulado em canaleta exclusiva',
    corHex: '#E11D48', // Vermelho vibrante
    corFundo: '#FFE4E6',
    badgeTextColor: '#FFFFFF',
  },
  ligeirinho: {
    label: 'Ligeirinho',
    description: 'Linha direta entre tubos',
    corHex: '#475569', // Prata / Cinza RIT
    corFundo: '#F1F5F9',
    badgeTextColor: '#FFFFFF',
  },
  interbairros: {
    label: 'Interbairros',
    description: 'Conecta bairros sem ir ao centro',
    corHex: '#16A34A', // Verde
    corFundo: '#DCFCE7',
    badgeTextColor: '#FFFFFF',
  },
  alimentador: {
    label: 'Alimentador',
    description: 'Bairros até os terminais',
    corHex: '#EA580C', // Laranja
    corFundo: '#FFEDD5',
    badgeTextColor: '#FFFFFF',
  },
  troncal: {
    label: 'Troncal / Conv.',
    description: 'Radiais do centro aos bairros',
    corHex: '#CA8A04', // Amarelo escuro
    corFundo: '#FEF9C3',
    badgeTextColor: '#FFFFFF',
  },
};

export const URBS_CONFIG = {
  tarifaPadrao: 6.0,
  intervaloAtualizacaoMs: 5000,
};

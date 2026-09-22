/**
 * Design tokens da identidade visual do app (ver DESIGN.md § Cores). Categorias RIT (cor por
 * linha) ficam em `src/constants/rit.ts` — não são tokens de UI, são branding por categoria.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A',
    textMuted: '#64748B',
    textSubtle: '#94A3B8',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
    surface: '#FFFFFF',
    surfaceMuted: '#F1F5F9',
    background: '#F8FAFC',
    primary: '#0369A1',
    primaryMuted: '#E0F2FE',
    onPrimary: '#FFFFFF',
    warning: '#F59E0B',
    warningMuted: '#FEF3C7',
    danger: '#DC2626',
    success: '#16A34A',
    successMuted: '#DCFCE7',
  },
  dark: {
    text: '#F1F5F9',
    textMuted: '#94A3B8',
    textSubtle: '#64748B',
    border: '#334155',
    borderStrong: '#475569',
    surface: '#111827',
    surfaceMuted: '#1E293B',
    background: '#0B1220',
    primary: '#7DD3FC',
    primaryMuted: '#0C4A6E',
    onPrimary: '#0B1220',
    warning: '#F59E0B',
    warningMuted: '#78350F',
    danger: '#F87171',
    success: '#4ADE80',
    successMuted: '#14532D',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { Colors, Radius, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

// Estilo comum das 4 telas de conta (sign-in, sign-up, forgot/reset password). Tokens de
// DESIGN.md § Cores (src/constants/theme.ts), resolvidos por scheme (claro/escuro) via
// useColorScheme (DESIGN.md "Modo claro e escuro obrigatórios em toda tela nova").
// successBox e successText utilizam os tokens semânticos `successMuted` e `success`.
export function useAuthScreenStyles() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.background,
        },
        content: {
          padding: 20,
          paddingBottom: 40,
        },
        title: {
          fontSize: Typography.screenTitle.fontSize,
          lineHeight: Typography.screenTitle.lineHeight,
          fontWeight: '900',
          color: theme.text,
          marginBottom: 4,
        },
        subtitle: {
          fontSize: Typography.label.fontSize,
          lineHeight: Typography.label.lineHeight,
          color: theme.textMuted,
          marginBottom: 24,
        },
        formError: {
          fontSize: 13,
          color: theme.danger,
          marginBottom: 12,
        },
        successBox: {
          backgroundColor: isDark ? Colors.dark.successMuted : Colors.light.successMuted,
          borderRadius: Radius.md,
          padding: 14,
          marginBottom: 16,
        },
        successText: {
          fontSize: Typography.body.fontSize,
          color: isDark ? Colors.dark.success : Colors.light.success,
          lineHeight: Typography.body.lineHeight,
        },
        primaryButton: {
          backgroundColor: theme.primary,
          borderRadius: Radius.md,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 4,
        },
        buttonDisabled: {
          opacity: 0.6,
        },
        primaryButtonText: {
          color: theme.onPrimary,
          fontSize: 15,
          fontWeight: '700',
        },
        linkText: {
          fontSize: 13,
          color: theme.primary,
          fontWeight: '600',
          marginTop: 18,
          textAlign: 'center',
        },
        guestButton: {
          marginTop: 28,
          paddingVertical: 10,
          alignItems: 'center',
        },
        guestButtonText: {
          fontSize: 13,
          color: theme.textMuted,
          fontWeight: '600',
        },
      }),
    [theme, isDark],
  );
}

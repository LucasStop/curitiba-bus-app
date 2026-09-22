import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

// Estilo comum das 4 telas de conta (sign-in, sign-up, forgot/reset password). Tokens de
// DESIGN.md § Cores (src/constants/theme.ts), resolvidos por scheme (claro/escuro) via
// useColorScheme (DESIGN.md "Modo claro e escuro obrigatórios em toda tela nova").
// successBox/successText não usam o token `success` porque o par claro (`success`/`successMuted`)
// tem só 3:1 de contraste, abaixo do AA (4,5:1) pra texto de corpo — ver DESIGN.md § Cores.
// O par claro fica em verde escuro fixo; o par escuro reaproveita o token porque nele o contraste
// (~5,2:1) já passa.
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
          fontSize: 22,
          fontWeight: '900',
          color: theme.text,
          marginBottom: 4,
        },
        subtitle: {
          fontSize: 13,
          color: theme.textMuted,
          marginBottom: 24,
        },
        formError: {
          fontSize: 13,
          color: theme.danger,
          marginBottom: 12,
        },
        successBox: {
          backgroundColor: isDark ? Colors.dark.successMuted : '#ECFDF5',
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
        },
        successText: {
          fontSize: 13,
          color: isDark ? Colors.dark.success : '#065F46',
          lineHeight: 18,
        },
        primaryButton: {
          backgroundColor: theme.primary,
          borderRadius: 12,
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

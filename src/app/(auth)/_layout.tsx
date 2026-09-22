import { Stack } from 'expo-router';
import React from 'react';

import { useTheme } from '@/hooks/use-theme';

// Telas de conta ficam fora das abas (DESIGN.md "Telas de conta"). Header simples com voltar;
// cada tela também tem "Continuar como visitante" para nunca travar o app atrás de login.
export default function AuthLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerTintColor: theme.text,
        headerStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
      }}
    />
  );
}

import { Stack } from 'expo-router';
import React from 'react';

import { Colors } from '@/constants/theme';

// Telas de conta ficam fora das abas (DESIGN.md "Telas de conta"). Header simples com voltar;
// cada tela também tem "Continuar como visitante" para nunca travar o app atrás de login.
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerTintColor: Colors.light.text,
        headerStyle: { backgroundColor: Colors.light.background },
        headerShadowVisible: false,
      }}
    />
  );
}

import { Stack } from 'expo-router';
import React from 'react';

// Telas de conta ficam fora das abas (DESIGN.md "Telas de conta"). Header simples com voltar;
// cada tela também tem "Continuar como visitante" para nunca travar o app atrás de login.
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerTintColor: '#0F172A',
        headerStyle: { backgroundColor: '#F8FAFC' },
        headerShadowVisible: false,
      }}
    />
  );
}

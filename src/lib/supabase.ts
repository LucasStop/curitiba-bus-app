import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { LargeSecureStore } from './largeSecureStore';

// Só a URL e a chave PUBLISHABLE (pública por desenho, protegida por RLS). Nunca service_role no app.
// As referências a process.env precisam ser literais: o Expo troca cada uma pelo valor no build.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && publishableKey);
}

let client: SupabaseClient | undefined;

// Cliente criado sob demanda: sem as variáveis o app abre normalmente como visitante e só falha,
// com mensagem clara, quando alguém tenta usar conta.
export function getSupabase(): SupabaseClient {
  if (!url || !publishableKey) {
    throw new Error(
      'Supabase não configurado: defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (.env.local ou EAS secrets).',
    );
  }
  client ??= createClient(url, publishableKey, {
    auth: {
      storage: new LargeSecureStore(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

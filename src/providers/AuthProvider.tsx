import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { mapAuthError, type AuthErrorContext } from '@/lib/authErrors';
import { pullAndMergeFavorites, startFavoritesSync, stopFavoritesSync } from '@/lib/favoritesSync';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { useFavoritesStore } from '@/stores/useFavoritesStore';

// Contas são opcionais (SSD D6): nada aqui bloqueia rota. Sem sessão (ou sem Supabase configurado)
// o app é o mesmo de sempre, como visitante. Nada é logado: token, e-mail e senha não saem daqui (C7).

export interface AuthResult {
  /** Mensagem pt-BR pronta para mostrar na tela, ou null em caso de sucesso. */
  error: string | null;
}

export interface SignUpResult extends AuthResult {
  /** true quando o cadastro criou a conta mas ainda falta confirmar o e-mail (sem sessão ativa). */
  needsEmailConfirmation?: boolean;
}

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** true só até ler a sessão salva no aparelho. */
  loading: boolean;
  /** false quando as variáveis EXPO_PUBLIC_SUPABASE_* faltam: contas indisponíveis, modo visitante. */
  configured: boolean;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  deleteAccount: () => Promise<AuthResult>;
}

const UNAVAILABLE = 'Contas indisponíveis no momento.';

// Rotas do app que o link do e-mail abre (esquema curitibabusapp; precisa estar na allowlist do Supabase).
const redirect = (path: string) => Linking.createURL(path);

const AuthContext = createContext<AuthContextValue | null>(null);

// Erros do Supabase chegam como objeto `error` ou, na rede, como exceção: os dois viram mensagem.
async function run<T extends AuthResult>(context: AuthErrorContext, action: () => Promise<T>): Promise<T | AuthResult> {
  if (!isSupabaseConfigured()) return { error: UNAVAILABLE };
  try {
    return await action();
  } catch (e) {
    return { error: mapAuthError(e, context) };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const { auth } = getSupabase();
    let active = true;

    auth
      .getSession()
      .then(({ data }) => active && setSession(data.session))
      .catch(() => {}) // sem sessão legível = visitante
      .finally(() => active && setLoading(false));

    const { data } = auth.onAuthStateChange((_event, next) => setSession(next));

    // No RN o refresh automático só deve rodar em primeiro plano (doc do Supabase).
    const handleAppState = (state: string) => (state === 'active' ? auth.startAutoRefresh() : auth.stopAutoRefresh());
    if (AppState.currentState === 'active') auth.startAutoRefresh();
    const appStateSub = AppState.addEventListener('change', handleAppState);

    return () => {
      active = false;
      data.subscription.unsubscribe();
      appStateSub.remove();
      auth.stopAutoRefresh();
    };
  }, []);

  // RF-20/SSD 10.3: ao logar (ou restaurar sessão), une favoritos locais e da nuvem (C4) e depois
  // espelha cada toggle local na nuvem. Sair só para o espelhamento; os favoritos locais ficam.
  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) {
      stopFavoritesSync();
      return;
    }
    let active = true;
    const supabase = getSupabase();
    pullAndMergeFavorites(supabase, userId, useFavoritesStore.getState()).then((merged) => {
      if (!active) return;
      useFavoritesStore.setState(merged);
      startFavoritesSync(supabase, userId);
    });
    return () => {
      active = false;
      stopFavoritesSync();
    };
  }, [userId]);

  const signUp = useCallback<AuthContextValue['signUp']>(
    (email, password) =>
      run('signUp', async () => {
        const { data, error } = await getSupabase().auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirect('sign-in') },
        });
        if (error) return { error: mapAuthError(error, 'signUp') };
        return { error: null, needsEmailConfirmation: !data.session };
      }),
    [],
  );

  const signIn = useCallback<AuthContextValue['signIn']>(
    (email, password) =>
      run('signIn', async () => {
        const { error } = await getSupabase().auth.signInWithPassword({ email, password });
        return { error: error ? mapAuthError(error, 'signIn') : null };
      }),
    [],
  );

  // Sair volta a visitante; os favoritos locais ficam (quem cuida disso é o store, que não é limpo aqui).
  const signOut = useCallback<AuthContextValue['signOut']>(async () => {
    if (!isSupabaseConfigured()) return { error: null };
    return run('other', async () => {
      const { error } = await getSupabase().auth.signOut();
      return { error: error ? mapAuthError(error, 'other') : null };
    });
  }, []);

  const resetPassword = useCallback<AuthContextValue['resetPassword']>(
    (email) =>
      run('reset', async () => {
        const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
          redirectTo: redirect('reset-password'),
        });
        return { error: error ? mapAuthError(error, 'reset') : null };
      }),
    [],
  );

  // Usada na tela de nova senha (deep link de recuperação já deu uma sessão temporária).
  const updatePassword = useCallback<AuthContextValue['updatePassword']>(
    (password) =>
      run('other', async () => {
        const { error } = await getSupabase().auth.updateUser({ password });
        return { error: error ? mapAuthError(error, 'other') : null };
      }),
    [],
  );

  // A Edge Function apaga só o usuário do próprio JWT (T7). Só limpa a sessão local se ela confirmou;
  // escopo local porque o token já não vale no servidor.
  const deleteAccount = useCallback<AuthContextValue['deleteAccount']>(
    () =>
      run('other', async () => {
        const supabase = getSupabase();
        const { error } = await supabase.functions.invoke('delete-account');
        if (error) return { error: mapAuthError(error, 'other') };
        await supabase.auth.signOut({ scope: 'local' });
        return { error: null };
      }),
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      configured,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
      deleteAccount,
    }),
    [session, loading, configured, signUp, signIn, signOut, resetPassword, updatePassword, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return ctx;
}

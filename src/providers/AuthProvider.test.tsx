import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { AuthProvider, useAuth, type AuthContextValue } from './AuthProvider';

// Sem rede: o cliente Supabase inteiro é falso.
const mockAuth = {
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(),
  signUp: jest.fn(),
  signInWithPassword: jest.fn(),
  signOut: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  startAutoRefresh: jest.fn(),
  stopAutoRefresh: jest.fn(),
};
const mockInvoke = jest.fn();
let mockConfigured = true;

jest.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => mockConfigured,
  getSupabase: () => ({ auth: mockAuth, functions: { invoke: mockInvoke } }),
}));
jest.mock('expo-linking', () => ({ createURL: (p: string) => `curitibabusapp://${p}` }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const fakeSession = { access_token: 't', user: { id: 'u1', email: 'a@b.co' } };
let authListener: (event: string, session: unknown) => void;
const unsubscribe = jest.fn();
let appStateHandler: (state: string) => void;
const removeAppState = jest.fn();

const holder: { current: AuthContextValue | null } = { current: null };
const ctx = () => holder.current!;
function Probe() {
  const value = useAuth();
  useEffect(() => {
    holder.current = value;
  });
  return null;
}

async function mount(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });
  return renderer;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockConfigured = true;
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockAuth.onAuthStateChange.mockImplementation((cb) => {
    authListener = cb;
    return { data: { subscription: { unsubscribe } } };
  });
  mockAuth.signOut.mockResolvedValue({ error: null });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    appStateHandler = handler as (state: string) => void;
    return { remove: removeAppState } as never;
  });
});

describe('AuthProvider: sessão', () => {
  it('começa como visitante e sem loading depois de ler a sessão salva', async () => {
    await mount();
    expect(ctx().loading).toBe(false);
    expect(ctx().session).toBeNull();
    expect(ctx().user).toBeNull();
    expect(ctx().configured).toBe(true);
  });

  it('restaura a sessão salva ao abrir o app', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: fakeSession }, error: null });
    await mount();
    expect(ctx().session).toBe(fakeSession);
    expect(ctx().user).toBe(fakeSession.user);
  });

  it('acompanha onAuthStateChange (login e logout) e desassina ao desmontar', async () => {
    const renderer = await mount();
    await act(async () => authListener('SIGNED_IN', fakeSession));
    expect(ctx().user).toBe(fakeSession.user);
    await act(async () => authListener('SIGNED_OUT', null));
    expect(ctx().user).toBeNull();
    await act(async () => renderer.unmount());
    expect(unsubscribe).toHaveBeenCalled();
    expect(removeAppState).toHaveBeenCalled();
  });

  it('AppState: primeiro plano liga o refresh automático, segundo plano desliga', async () => {
    await mount();
    act(() => appStateHandler('active'));
    expect(mockAuth.startAutoRefresh).toHaveBeenCalled();
    act(() => appStateHandler('background'));
    expect(mockAuth.stopAutoRefresh).toHaveBeenCalled();
  });
});

describe('AuthProvider: sem Supabase configurado (visitante)', () => {
  beforeEach(() => {
    mockConfigured = false;
  });

  it('segue como visitante, sem tocar no cliente', async () => {
    await mount();
    expect(ctx().configured).toBe(false);
    expect(ctx().loading).toBe(false);
    expect(ctx().session).toBeNull();
    expect(mockAuth.getSession).not.toHaveBeenCalled();
    expect(mockAuth.onAuthStateChange).not.toHaveBeenCalled();
  });

  it('as ações devolvem mensagem clara em vez de lançar', async () => {
    await mount();
    const res = await ctx().signIn('a@b.co', '12345678');
    expect(res.error).toBe('Contas indisponíveis no momento.');
    expect((await ctx().deleteAccount()).error).toBe('Contas indisponíveis no momento.');
    expect((await ctx().signOut()).error).toBeNull();
  });
});

describe('AuthProvider: ações', () => {
  it('signIn chama signInWithPassword e devolve mensagem genérica em falha', async () => {
    await mount();
    mockAuth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    expect(await ctx().signIn('a@b.co', 'senha1234')).toEqual({ error: null });
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.co', password: 'senha1234' });

    mockAuth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' },
    });
    expect(await ctx().signIn('a@b.co', 'errada123')).toEqual({ error: 'E-mail ou senha incorretos.' });
  });

  it('signUp envia o redirect do esquema curitibabusapp e informa se falta confirmar o e-mail', async () => {
    await mount();
    mockAuth.signUp.mockResolvedValue({ data: { session: null, user: { id: 'u' } }, error: null });
    expect(await ctx().signUp('a@b.co', 'senha1234')).toEqual({ error: null, needsEmailConfirmation: true });
    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'a@b.co',
      password: 'senha1234',
      options: { emailRedirectTo: 'curitibabusapp://sign-in' },
    });

    mockAuth.signUp.mockResolvedValue({ data: { session: fakeSession, user: fakeSession.user }, error: null });
    expect(await ctx().signUp('a@b.co', 'senha1234')).toEqual({ error: null, needsEmailConfirmation: false });
  });

  it('signUp mapeia e-mail já cadastrado', async () => {
    await mount();
    mockAuth.signUp.mockResolvedValue({
      data: {},
      error: { status: 422, code: 'user_already_exists', message: 'User already registered' },
    });
    const res = await ctx().signUp('a@b.co', 'senha1234');
    expect(res.error).toBe('Este e-mail já tem cadastro. Entre ou recupere a senha.');
  });

  it('resetPassword usa o redirect do app e nunca revela se o e-mail existe', async () => {
    await mount();
    mockAuth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    expect(await ctx().resetPassword('a@b.co')).toEqual({ error: null });
    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.co', {
      redirectTo: 'curitibabusapp://reset-password',
    });

    mockAuth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { status: 400, code: 'user_not_found', message: 'User not found' },
    });
    expect((await ctx().resetPassword('x@y.co')).error).toBe(
      'Não foi possível enviar o link agora. Tente de novo em instantes.',
    );
  });

  it('erro de rede lançado como exceção vira mensagem, não crash', async () => {
    await mount();
    mockAuth.signInWithPassword.mockRejectedValue(new TypeError('Network request failed'));
    expect((await ctx().signIn('a@b.co', 'senha1234')).error).toBe('Sem conexão. Verifique a internet e tente de novo.');
  });

  it('signOut encerra a sessão', async () => {
    await mount();
    expect(await ctx().signOut()).toEqual({ error: null });
    expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
  });

  it('deleteAccount chama a Edge Function e SÓ DEPOIS limpa a sessão local (escopo local)', async () => {
    await mount();
    const order: string[] = [];
    mockInvoke.mockImplementation(async () => {
      order.push('invoke');
      return { data: {}, error: null };
    });
    mockAuth.signOut.mockImplementation(async () => {
      order.push('signOut');
      return { error: null };
    });
    expect(await ctx().deleteAccount()).toEqual({ error: null });
    expect(mockInvoke).toHaveBeenCalledWith('delete-account');
    expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(order).toEqual(['invoke', 'signOut']);
  });

  it('deleteAccount que falha NÃO desloga (o usuário ainda tem conta) e devolve erro', async () => {
    await mount();
    mockInvoke.mockResolvedValue({ data: null, error: { name: 'FunctionsHttpError', message: 'boom' } });
    const res = await ctx().deleteAccount();
    expect(res.error).toBe('Algo deu errado. Tente novamente.');
    expect(mockAuth.signOut).not.toHaveBeenCalled();
  });
});
